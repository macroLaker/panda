import { useState } from 'react'
import { db } from '../../db/db'
import type { PandaEvent } from '../../db/db'
import { nowISO, nowLocalMinute } from '../../utils/date'
import { alertWriteError } from '../../utils/errors'

interface EventFormProps {
  initial?: PandaEvent
  onDone: () => void
  onDelete?: () => void
}

/** 时间事件录入/编辑 */
export default function EventForm({ initial, onDone, onDelete }: EventFormProps) {
  const [description, setDescription] = useState(initial?.description ?? '')
  const [startTime, setStartTime] = useState(initial?.startTime ?? nowLocalMinute())
  const [endTime, setEndTime] = useState(initial?.endTime ?? nowLocalMinute())
  const [error, setError] = useState('')

  const save = async () => {
    if (!description.trim()) {
      setError('请填写事件描述')
      return
    }
    if (endTime < startTime) {
      setError('结束时间不能早于开始时间')
      return
    }
    try {
      if (initial?.id != null) {
        await db.events.update(initial.id, { description: description.trim(), startTime, endTime })
      } else {
        await db.events.add({ description: description.trim(), startTime, endTime, createdAt: nowISO() })
      }
    } catch (err) {
      alertWriteError(err)
      return
    }
    onDone()
  }

  return (
    <div className="form">
      <label className="form-field">
        <span>做了什么</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="例如：和朋友爬白云山"
          autoFocus
        />
      </label>
      <label className="form-field">
        <span>开始时间</span>
        <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
      </label>
      <label className="form-field">
        <span>结束时间</span>
        <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn-primary" onClick={save}>
        保存
      </button>
      {onDelete && (
        <button type="button" className="btn-danger-ghost" onClick={onDelete}>
          删除这条事件
        </button>
      )}
    </div>
  )
}
