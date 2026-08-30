import type { Category } from '../db/db'
import { fmtEventRange, fmtMoney, fmtTime } from '../utils/date'
import { excerpt, KIND_META } from '../utils/timeline'
import type { TimelineItem } from '../utils/timeline'
import PhotoImg from './PhotoImg'

interface TimelineCardProps {
  item: TimelineItem
  categories: Category[]
  onClick: () => void
}

const PRIORITY_LABEL = { high: '高', medium: '中', low: '低' } as const

/** 时间线卡片：五类记录各有样式 */
export default function TimelineCard({ item, categories, onClick }: TimelineCardProps) {
  const meta = KIND_META[item.kind]

  let body: JSX.Element
  switch (item.kind) {
    case 'event':
      body = (
        <>
          <p className="card-time">{fmtEventRange(item.data.startTime, item.data.endTime)}</p>
          <p className="card-text">{excerpt(item.data.description)}</p>
        </>
      )
      break
    case 'diary':
      body = (
        <>
          <p className="card-text card-text-diary">{excerpt(item.data.content, 120)}</p>
          {item.data.photos.length > 0 && (
            <div className="card-photos">
              {item.data.photos.slice(0, 3).map((blob, i) => (
                <PhotoImg key={i} blob={blob} className="card-photo" />
              ))}
              {item.data.photos.length > 3 && <span className="card-photo-more">+{item.data.photos.length - 3}</span>}
            </div>
          )}
        </>
      )
      break
    case 'thought':
      body = (
        <>
          <p className="card-text">{excerpt(item.data.content, 120)}</p>
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
        <div className="card-tx-row">
          <span className="card-text">
            {cat?.icon ?? '📦'} {cat?.name ?? '未分类'}
            {item.data.note && <small className="card-note"> · {item.data.note}</small>}
          </span>
          <b className={isExpense ? 'amount-expense' : 'amount-income'}>
            {isExpense ? '-' : '+'}¥{fmtMoney(item.data.amount)}
          </b>
        </div>
      )
      break
    }
    case 'todo':
      body = (
        <>
          <p className="card-text card-text-done">{excerpt(item.data.content)}</p>
          <p className="card-time">
            <span className={`prio-dot prio-${item.data.priority}`} />
            {PRIORITY_LABEL[item.data.priority]}优先级 · {item.data.doneAt ? fmtTime(item.data.doneAt) : ''} 完成
          </p>
        </>
      )
      break
  }

  return (
    <button type="button" className={`tl-card ${meta.className}`} onClick={onClick}>
      <span className="tl-card-icon" aria-hidden>
        {meta.icon}
      </span>
      <span className="tl-card-body">
        <span className="tl-card-kind">{meta.label}</span>
        {body}
      </span>
    </button>
  )
}
