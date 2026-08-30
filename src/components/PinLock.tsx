import { useEffect, useState } from 'react'
import PinPad from './PinPad'
import { getSetting } from '../db/db'
import { hashPin, PIN_HASH_KEY, PIN_SALT_KEY } from '../utils/pin'

interface PinLockProps {
  onUnlock: () => void
}

/** 冷启动 PIN 锁屏 */
export default function PinLock({ onUnlock }: PinLockProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [message, setMessage] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    if (pin.length !== 4) return
    let cancelled = false
    ;(async () => {
      const [hash, salt] = await Promise.all([getSetting(PIN_HASH_KEY), getSetting(PIN_SALT_KEY)])
      const input = await hashPin(pin, salt ?? '')
      if (cancelled) return
      if (hash && input === hash) {
        onUnlock()
      } else {
        setError(true)
        setMessage('PIN 错误，请重试')
        setTimeout(() => {
          setPin('')
          setError(false)
        }, 450)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pin, onUnlock])

  return (
    <div className="pin-lock">
      <div className="pin-lock-panda" aria-hidden>
        🐼
      </div>
      <h1 className="pin-lock-title">输入 PIN 解锁 Panda</h1>
      <p className={`pin-lock-msg ${message ? 'is-visible' : ''}`}>{message || '　'}</p>
      <PinPad
        filled={pin.length}
        error={error}
        onKey={(d) => {
          setMessage('')
          setPin((p) => (p.length < 4 ? p + d : p))
        }}
        onDelete={() => setPin((p) => p.slice(0, -1))}
      />
      <button type="button" className="pin-lock-forgot" onClick={() => setShowHelp((v) => !v)}>
        忘记 PIN？
      </button>
      {showHelp && (
        <p className="pin-lock-help">
          所有数据都保存在你的手机本地，PIN 仅是一把界面锁，不加密数据。若忘记 PIN，可在系统设置中清除本应用（浏览器）的网站数据后重新进入，但这会同时删除所有记录——所以请养成定期在「设置 → 数据备份」导出
          JSON 的习惯。
        </p>
      )}
    </div>
  )
}
