import { useMemo, useState } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from 'date-fns'
import type { Category } from '../db/db'
import { todayStr } from '../utils/date'
import { KIND_ORDER } from '../utils/timeline'
import type { Kind, TimelineItem } from '../utils/timeline'
import TimelineCard from './TimelineCard'
import { fmtDayHeader } from '../utils/date'

interface CalendarViewProps {
  items: TimelineItem[]
  categories: Category[]
  onOpen: (item: TimelineItem) => void
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

/** 月历模式：有记录的日期显示分类彩点，点选某天查看当天时间日志 */
export default function CalendarView({ items, categories, onOpen }: CalendarViewProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(todayStr)

  // 每天出现过哪些类型（用于画点）
  const dayKinds = useMemo(() => {
    const map = new Map<string, Set<Kind>>()
    for (const item of items) {
      let set = map.get(item.day)
      if (!set) {
        set = new Set()
        map.set(item.day, set)
      }
      set.add(item.kind)
    }
    return map
  }, [items])

  // 选中日的记录，按时间正序构成「当天时间日志」
  const dayItems = useMemo(
    () => items.filter((i) => i.day === selected).sort((a, b) => (a.sortKey < b.sortKey ? -1 : 1)),
    [items, selected],
  )

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  // 周一为一周之始的空位偏移
  const leading = (getDay(startOfMonth(month)) + 6) % 7
  const today = todayStr()

  return (
    <div className="calendar">
      <div className="cal-nav">
        <button type="button" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="上个月">
          ‹
        </button>
        <h3>{format(month, 'yyyy年M月')}</h3>
        <button type="button" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="下个月">
          ›
        </button>
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map((w) => (
          <span key={w} className="cal-weekday">
            {w}
          </span>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd')
          const kinds = dayKinds.get(key)
          return (
            <button
              key={key}
              type="button"
              className={`cal-cell ${key === selected ? 'is-selected' : ''} ${key === today ? 'is-today' : ''}`}
              onClick={() => setSelected(key)}
            >
              <span className="cal-num">{d.getDate()}</span>
              <span className="cal-dots">
                {KIND_ORDER.filter((k) => kinds?.has(k)).map((k) => (
                  <i key={k} className={`cal-dot dot-${k}`} />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <h3 className="cal-day-title">{fmtDayHeader(selected)}</h3>
      {dayItems.length === 0 ? (
        <p className="empty-hint">这一天还没有记录</p>
      ) : (
        <div className="tl-group">
          {dayItems.map((item) => (
            <TimelineCard key={item.key} item={item} categories={categories} onClick={() => onOpen(item)} />
          ))}
        </div>
      )}
    </div>
  )
}
