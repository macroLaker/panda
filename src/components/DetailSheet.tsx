import Sheet from './Sheet'
import PhotoImg from './PhotoImg'
import type { Category } from '../db/db'
import { fmtEventRange, fmtFullDay, fmtMoney, fmtTime } from '../utils/date'
import { deleteTimelineItem, KIND_META } from '../utils/timeline'
import type { TimelineItem } from '../utils/timeline'

interface DetailSheetProps {
  item: TimelineItem
  categories: Category[]
  onClose: () => void
  onEdit: () => void
}

const DELETE_CONFIRM: Record<TimelineItem['kind'], string> = {
  event: '确定删除这条事件吗？',
  diary: '确定删除这篇日记吗？照片会一并删除。',
  thought: '确定删除这条感悟吗？',
  transaction: '确定删除这笔账目吗？',
  todo: '这会把待办本身从待办列表一并删除，确定吗？',
}

const PRIORITY_LABEL = { high: '高', medium: '中', low: '低' } as const

/** 时间线条目详情：查看全文 + 编辑/删除入口 */
export default function DetailSheet({ item, categories, onClose, onEdit }: DetailSheetProps) {
  const meta = KIND_META[item.kind]

  const handleDelete = async () => {
    if (!window.confirm(DELETE_CONFIRM[item.kind])) return
    await deleteTimelineItem(item)
    onClose()
  }

  let body: JSX.Element
  switch (item.kind) {
    case 'event':
      body = (
        <>
          <p className="detail-meta">
            {fmtFullDay(item.day)} · {fmtEventRange(item.data.startTime, item.data.endTime)}
          </p>
          <p className="detail-text">{item.data.description}</p>
        </>
      )
      break
    case 'diary':
      body = (
        <>
          <p className="detail-meta">{fmtFullDay(item.data.date)}</p>
          <p className="detail-text detail-text-diary">{item.data.content}</p>
          {item.data.photos.length > 0 && (
            <div className="detail-photos">
              {item.data.photos.map((blob, i) => (
                <PhotoImg key={i} blob={blob} className="detail-photo" />
              ))}
            </div>
          )}
        </>
      )
      break
    case 'thought':
      body = (
        <>
          <p className="detail-meta">
            {fmtFullDay(item.day)} · {fmtTime(item.data.createdAt)}
          </p>
          <p className="detail-text">{item.data.content}</p>
          {item.data.tags.length > 0 && (
            <p className="card-tags">
              {item.data.tags.map((t) => (
                <span key={t} className="tag">
                  #{t}
                </span>
              ))}
            </p>
          )}
        </>
      )
      break
    case 'transaction': {
      const cat = categories.find((c) => c.id === item.data.categoryId)
      const isExpense = item.data.type === 'expense'
      body = (
        <>
          <p className="detail-meta">{fmtFullDay(item.data.date)}</p>
          <p className={`detail-amount ${isExpense ? 'amount-expense' : 'amount-income'}`}>
            {isExpense ? '-' : '+'}¥{fmtMoney(item.data.amount)}
          </p>
          <p className="detail-text">
            {cat?.icon ?? '📦'} {cat?.name ?? '未分类'}
            {item.data.note ? ` · ${item.data.note}` : ''}
          </p>
        </>
      )
      break
    }
    case 'todo':
      body = (
        <>
          <p className="detail-meta">
            {PRIORITY_LABEL[item.data.priority]}优先级 · {item.data.doneAt ? `${fmtFullDay(item.day)} ${fmtTime(item.data.doneAt)} 完成` : '未完成'}
          </p>
          <p className="detail-text">{item.data.content}</p>
        </>
      )
      break
  }

  return (
    <Sheet title={`${meta.icon} ${meta.label}详情`} onClose={onClose}>
      <div className="detail">
        {body}
        <div className="detail-actions">
          <button type="button" className="btn-primary" onClick={onEdit}>
            编辑
          </button>
          <button type="button" className="btn-danger-ghost" onClick={handleDelete}>
            删除
          </button>
        </div>
      </div>
    </Sheet>
  )
}
