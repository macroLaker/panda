import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, removeSetting, setSetting } from '../db/db'
import { exportBackup, exportTransactionsCSV, importBackup } from '../utils/backup'
import { getLatestSnapshot, restoreSnapshot } from '../utils/snapshot'
import { genSalt, hashPin, PIN_HASH_KEY, PIN_SALT_KEY, SESSION_UNLOCK_KEY } from '../utils/pin'
import Sheet from '../components/Sheet'
import PinPad from '../components/PinPad'

type PinMode = 'setup' | 'change' | 'disable'
type PinStep = 'verify' | 'new' | 'confirm'

interface PinFlowProps {
  mode: PinMode
  onClose: () => void
}

/** PIN 设置/修改/关闭流程 */
function PinFlowSheet({ mode, onClose }: PinFlowProps) {
  const [step, setStep] = useState<PinStep>(mode === 'setup' ? 'new' : 'verify')
  const [pin, setPin] = useState('')
  const [firstPin, setFirstPin] = useState('')
  const [error, setError] = useState(false)
  const [message, setMessage] = useState('')

  const titles: Record<PinMode, string> = { setup: '设置 PIN', change: '修改 PIN', disable: '关闭 PIN' }
  const stepHints: Record<PinStep, string> = {
    verify: '请输入当前 PIN',
    new: '请输入新的 4 位 PIN',
    confirm: '请再次输入确认',
  }

  const fail = (msg: string) => {
    setError(true)
    setMessage(msg)
    setTimeout(() => {
      setPin('')
      setError(false)
    }, 450)
  }

  const handleComplete = async (value: string) => {
    if (step === 'verify') {
      const [hash, salt] = await Promise.all([
        db.settings.get(PIN_HASH_KEY).then((r) => r?.value),
        db.settings.get(PIN_SALT_KEY).then((r) => r?.value),
      ])
      const input = await hashPin(value, salt ?? '')
      if (!hash || input !== hash) {
        fail('PIN 错误，请重试')
        return
      }
      if (mode === 'disable') {
        await removeSetting(PIN_HASH_KEY)
        await removeSetting(PIN_SALT_KEY)
        sessionStorage.removeItem(SESSION_UNLOCK_KEY)
        window.alert('PIN 已关闭')
        onClose()
        return
      }
      setPin('')
      setMessage('')
      setStep('new')
      return
    }
    if (step === 'new') {
      setFirstPin(value)
      setPin('')
      setMessage('')
      setStep('confirm')
      return
    }
    // confirm
    if (value !== firstPin) {
      setStep('new')
      setFirstPin('')
      fail('两次输入不一致，请重新设置')
      return
    }
    const salt = genSalt()
    const hash = await hashPin(value, salt)
    await setSetting(PIN_SALT_KEY, salt)
    await setSetting(PIN_HASH_KEY, hash)
    sessionStorage.setItem(SESSION_UNLOCK_KEY, '1')
    window.alert(mode === 'change' ? 'PIN 修改成功' : 'PIN 已开启，下次冷启动需要输入')
    onClose()
  }

  return (
    <Sheet title={titles[mode]} onClose={onClose}>
      <div className="pin-flow">
        <p className="pin-flow-hint">{stepHints[step]}</p>
        <p className={`pin-lock-msg ${message ? 'is-visible' : ''}`}>{message || '　'}</p>
        <PinPad
          filled={pin.length}
          error={error}
          onKey={(d) => {
            if (pin.length >= 4) return
            const next = pin + d
            setPin(next)
            setMessage('')
            if (next.length === 4) void handleComplete(next)
          }}
          onDelete={() => setPin((p) => p.slice(0, -1))}
        />
      </div>
    </Sheet>
  )
}

/** 设置 Tab：PIN 锁、数据备份、CSV 导出、关于 */
export default function SettingsPage() {
  const [pinFlow, setPinFlow] = useState<PinMode | null>(null)
  const [busy, setBusy] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  const pinEnabled = useLiveQuery(async () => !!(await db.settings.get(PIN_HASH_KEY)), []) ?? false
  const latestSnapshot = useLiveQuery(getLatestSnapshot, [])

  const handleExport = async () => {
    setBusy('export')
    try {
      const done = await exportBackup()
      // 用户取消分享等未实际完成时轻提示，不静默
      if (!done) window.alert('本次未完成备份，如需备份请重新导出。')
    } catch (err) {
      window.alert(`导出失败：${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setBusy('')
    }
  }

  const handleImportFile = async (file: File | null) => {
    if (importRef.current) importRef.current.value = ''
    if (!file) return
    if (!window.confirm('导入将【覆盖】当前设备上的全部数据（含 PIN 设置），确定继续吗？')) return
    if (!window.confirm('再次确认：当前数据将被删除且无法找回，是否用备份文件覆盖？')) return
    setBusy('import')
    try {
      await importBackup(file)
      window.alert('导入成功，应用将重新加载')
      sessionStorage.removeItem(SESSION_UNLOCK_KEY)
      window.location.reload()
    } catch (err) {
      window.alert(
        `导入失败：${err instanceof Error ? err.message : '未知错误'}\n若设备存储空间已满也会导致导入失败，请清理空间后重试。`,
      )
    } finally {
      setBusy('')
    }
  }

  const handleRestoreSnapshot = async () => {
    if (!latestSnapshot) return
    const timeLabel = latestSnapshot.createdAt.slice(0, 16).replace('T', ' ')
    if (!window.confirm(`从内部快照恢复：当前数据将被 ${timeLabel} 的快照完全替换，确定继续吗？`)) return
    if (!window.confirm(`再次确认：${timeLabel} 之后的改动将全部丢失且无法找回，是否恢复？`)) return
    setBusy('restore')
    try {
      await restoreSnapshot(latestSnapshot)
      window.alert('恢复成功，应用将重新加载')
      sessionStorage.removeItem(SESSION_UNLOCK_KEY)
      window.location.reload()
    } catch (err) {
      window.alert(`恢复失败：${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="page page-settings">
      <header className="page-head">
        <h1 className="page-title">设置</h1>
      </header>

      <section className="settings-group">
        <h3 className="settings-group-title">安全</h3>
        {pinEnabled ? (
          <>
            <button type="button" className="settings-row" onClick={() => setPinFlow('change')}>
              <span>🔑 修改 PIN</span>
              <i>›</i>
            </button>
            <button type="button" className="settings-row" onClick={() => setPinFlow('disable')}>
              <span>🔓 关闭 PIN</span>
              <i>›</i>
            </button>
          </>
        ) : (
          <button type="button" className="settings-row" onClick={() => setPinFlow('setup')}>
            <span>🔒 开启 PIN 锁（4 位数字）</span>
            <i>›</i>
          </button>
        )}
        <p className="settings-note">
          忘记 PIN 怎么办：所有数据都保存在本机，PIN 仅是一把界面锁，不加密数据。若忘记 PIN，只能通过清除本应用（浏览器）的网站数据来重置，这会同时删除全部记录——请务必定期导出备份。
        </p>
      </section>

      <section className="settings-group">
        <h3 className="settings-group-title">数据</h3>
        <button type="button" className="settings-row" disabled={busy !== ''} onClick={handleExport}>
          <span>📤 导出全量备份（JSON，含照片）</span>
          <i>{busy === 'export' ? '…' : '›'}</i>
        </button>
        <button
          type="button"
          className="settings-row"
          disabled={busy !== ''}
          onClick={() => importRef.current?.click()}
        >
          <span>📥 导入备份恢复（覆盖当前数据）</span>
          <i>{busy === 'import' ? '…' : '›'}</i>
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)}
        />
        <button type="button" className="settings-row" disabled={busy !== ''} onClick={exportTransactionsCSV}>
          <span>🧾 导出记账 CSV（Excel 可直接打开）</span>
          <i>›</i>
        </button>
        <p className="settings-note">
          📱 iOS 上导出会弹出系统分享面板，选择「存储到文件」即可保存到本机。
        </p>
      </section>

      <section className="settings-group">
        <h3 className="settings-group-title">内部快照</h3>
        <div className="settings-row is-static">
          <span>最近快照</span>
          <small>{latestSnapshot ? latestSnapshot.createdAt.slice(0, 16).replace('T', ' ') : '暂无'}</small>
        </div>
        <button
          type="button"
          className="settings-row"
          disabled={busy !== '' || !latestSnapshot}
          onClick={handleRestoreSnapshot}
        >
          <span>⏪ 从快照恢复（覆盖当前数据）</span>
          <i>{busy === 'restore' ? '…' : '›'}</i>
        </button>
        <p className="settings-note">
          快照每天首次打开时自动生成一份，存于本机浏览器数据内，可用于回滚误删；但它不能替代导出备份——清除 Safari（浏览器）网站数据时快照会一同丢失。若此处长时间显示「暂无」或时间一直不更新，可能是设备存储空间不足，建议先导出 JSON 备份再清理部分照片。
        </p>
      </section>

      <section className="settings-group">
        <h3 className="settings-group-title">关于</h3>
        <div className="settings-row is-static">
          <span>版本</span>
          <small>v{__APP_VERSION__}</small>
        </div>
        <p className="settings-note">
          🐼 Panda 是一个完全离线的个人生活记录应用：时间线、日记、感悟、记账、待办。所有数据只存在这台设备的浏览器
          IndexedDB 中，不上传任何服务器。
        </p>
        <p className="settings-note settings-note-accent">
          📌 备份提醒：本机存储可能因清理浏览器数据、换机而丢失，建议每月导出一次 JSON 备份并妥善保存。
        </p>
      </section>

      {pinFlow && <PinFlowSheet mode={pinFlow} onClose={() => setPinFlow(null)} />}
    </div>
  )
}
