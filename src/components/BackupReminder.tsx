import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { db } from '../db/db'
import { exportBackup, LAST_BACKUP_KEY } from '../utils/backup'

const DISMISS_KEY = 'panda-backup-reminder-dismissed'
/** 备份提醒周期：距上次备份满 7 天 */
const REMIND_DAYS = 7

interface ReminderInfo {
  show: boolean
  days: number | null // null = 从未备份
}

/** 时间线顶部的备份提醒条：超 7 天未备份或从未备份（且已有记录）时出现 */
export default function BackupReminder() {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1')
  const [busy, setBusy] = useState(false)

  const info = useLiveQuery<ReminderInfo>(async () => {
    const last = (await db.settings.get(LAST_BACKUP_KEY))?.value
    if (last) {
      const days = differenceInCalendarDays(new Date(), parseISO(last))
      return { show: days >= REMIND_DAYS, days }
    }
    // 从未备份：库中已有任意记录才提醒
    const counts = await Promise.all([
      db.events.count(),
      db.diaries.count(),
      db.thoughts.count(),
      db.transactions.count(),
      db.todos.count(),
    ])
    return { show: counts.some((c) => c > 0), days: null }
  }, [])

  if (dismissed || !info?.show) return null

  const handleBackup = async () => {
    setBusy(true)
    try {
      // 实际完成后 lastBackupAt 更新，useLiveQuery 自动刷新 → 提示条消失
      const done = await exportBackup()
      // 用户取消分享等未实际完成时轻提示，提示条继续保留
      if (!done) window.alert('本次未完成备份，如需备份请重新点「一键备份」。')
    } catch (err) {
      window.alert(`导出失败：${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setBusy(false)
    }
  }

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="backup-banner" role="status">
      <span className="backup-banner-text">
        📤 {info.days != null ? `距上次备份已 ${info.days} 天` : '你还没有备份过'}，建议立即备份
      </span>
      <span className="backup-banner-actions">
        <button type="button" className="btn-mini btn-mini-primary" disabled={busy} onClick={handleBackup}>
          {busy ? '导出中…' : '一键备份'}
        </button>
        <button type="button" className="btn-mini" onClick={dismiss}>
          稍后
        </button>
      </span>
    </div>
  )
}
