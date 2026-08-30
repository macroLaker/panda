import { useState } from 'react'
import { db } from '../../db/db'
import type { Thought } from '../../db/db'
import { nowISO } from '../../utils/date'
import { alertWriteError } from '../../utils/errors'

interface ThoughtFormProps {
  initial?: Thought
  onDone: () => void
  onDelete?: () => void
}

/** 感悟录入/编辑 */
export default function ThoughtForm({ initial, onDone, onDelete }: ThoughtFormProps) {
  const [content, setContent] = useState(initial?.content ?? '')
  const [tagsText, setTagsText] = useState(initial?.tags?.join(' ') ?? '')
  const [error, setError] = useState('')

  const save = async () => {
    if (!content.trim()) {
      setError('内容不能为空')
      return
    }
    const tags = tagsText
      .split(/[,，\s#]+/)
      .map((t) => t.trim())
      .filter(Boolean)
    try {
      if (initial?.id != null) {
        await db.thoughts.update(initial.id, { content: content.trim(), tags })
      } else {
        await db.thoughts.add({ content: content.trim(), tags, createdAt: nowISO() })
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
        <span>此刻的想法</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          placeholder="把脑海里那句话留下来"
          autoFocus
        />
      </label>
      <label className="form-field">
        <span>标签（可选，空格或逗号分隔）</span>
        <input
          type="text"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="例如：读书 生活"
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn-primary" onClick={save}>
        保存
      </button>
      {onDelete && (
        <button type="button" className="btn-danger-ghost" onClick={onDelete}>
          删除这条感悟
        </button>
      )}
    </div>
  )
}
