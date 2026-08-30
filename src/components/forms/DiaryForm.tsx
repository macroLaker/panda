import { useRef, useState } from 'react'
import { db } from '../../db/db'
import type { Diary } from '../../db/db'
import { nowISO, todayStr } from '../../utils/date'
import { alertWriteError } from '../../utils/errors'
import { compressImage } from '../../utils/image'
import PhotoImg from '../PhotoImg'

interface DiaryFormProps {
  initial?: Diary
  onDone: () => void
  onDelete?: () => void
}

/** 日记录入/编辑，照片以 Blob 存 IndexedDB */
export default function DiaryForm({ initial, onDone, onDelete }: DiaryFormProps) {
  const [date, setDate] = useState(initial?.date ?? todayStr())
  const [content, setContent] = useState(initial?.content ?? '')
  const [photos, setPhotos] = useState<Blob[]>(initial?.photos ?? [])
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const addPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (fileRef.current) fileRef.current.value = ''
    // 入库前压缩，防止 IndexedDB 膨胀；压缩失败时回退原文件
    const compressed = await Promise.all(Array.from(files).map(compressImage))
    setPhotos((prev) => [...prev, ...compressed])
  }

  const save = async () => {
    if (!content.trim()) {
      setError('日记内容不能为空')
      return
    }
    const now = nowISO()
    try {
      if (initial?.id != null) {
        await db.diaries.update(initial.id, { date, content, photos, updatedAt: now })
      } else {
        await db.diaries.add({ date, content, photos, createdAt: now, updatedAt: now })
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
        <span>日期</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="form-field">
        <span>今天的故事</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={9}
          placeholder="慢慢写，没有人催你……"
          autoFocus
        />
      </label>
      <div className="form-field">
        <span>照片（可选）</span>
        <div className="photo-grid">
          {photos.map((blob, i) => (
            <div key={i} className="photo-thumb">
              <PhotoImg blob={blob} />
              <button
                type="button"
                className="photo-remove"
                aria-label="移除照片"
                onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="photo-add" onClick={() => fileRef.current?.click()}>
            ＋
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => void addPhotos(e.target.files)}
        />
      </div>
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn-primary" onClick={save}>
        保存
      </button>
      {onDelete && (
        <button type="button" className="btn-danger-ghost" onClick={onDelete}>
          删除这篇日记
        </button>
      )}
    </div>
  )
}
