import { useState } from 'react'
import { db } from '../../db/db'
import type { Todo, TodoPriority, TodoScope } from '../../db/db'
import { monthStartStr, nowISO, todayStr, weekStartStr } from '../../utils/date'
import { alertWriteError } from '../../utils/errors'
import Segmented from '../Segmented'

interface TodoFormProps {
  initial?: Todo
  onDone: () => void
  onDelete?: () => void
}

function scopeDateFor(scope: TodoScope): string {
  if (scope === 'day') return todayStr()
  if (scope === 'week') return weekStartStr()
  return monthStartStr()
}

/** 待办录入/编辑 */
export default function TodoForm({ initial, onDone, onDelete }: TodoFormProps) {
  const [content, setContent] = useState(initial?.content ?? '')
  const [scope, setScope] = useState<TodoScope>(initial?.scope ?? 'day')
  const [priority, setPriority] = useState<TodoPriority>(initial?.priority ?? 'medium')
  const [error, setError] = useState('')

  const save = async () => {
    if (!content.trim()) {
      setError('待办内容不能为空')
      return
    }
    try {
      if (initial?.id != null) {
        // 粒度变了归入当前周期，否则保留原周期
        const scopeDate = scope === initial.scope ? initial.scopeDate : scopeDateFor(scope)
        await db.todos.update(initial.id, { content: content.trim(), scope, priority, scopeDate })
      } else {
        await db.todos.add({
          content: content.trim(),
          scope,
          priority,
          scopeDate: scopeDateFor(scope),
          done: false,
          createdAt: nowISO(),
        })
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
        <span>要做什么</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="例如：给爸妈打个电话"
          autoFocus
        />
      </label>
      <div className="form-field">
        <span>粒度</span>
        <Segmented<TodoScope>
          options={[
            { value: 'day', label: '今天' },
            { value: 'week', label: '本周' },
            { value: 'month', label: '本月' },
          ]}
          value={scope}
          onChange={setScope}
        />
      </div>
      <div className="form-field">
        <span>优先级</span>
        <Segmented<TodoPriority>
          options={[
            { value: 'high', label: '高' },
            { value: 'medium', label: '中' },
            { value: 'low', label: '低' },
          ]}
          value={priority}
          onChange={setPriority}
          className={`prio-seg prio-${priority}`}
        />
      </div>
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn-primary" onClick={save}>
        保存
      </button>
      {onDelete && (
        <button type="button" className="btn-danger-ghost" onClick={onDelete}>
          删除这条待办
        </button>
      )}
    </div>
  )
}
