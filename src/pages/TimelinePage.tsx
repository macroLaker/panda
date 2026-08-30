import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { buildTimelineItems, deleteTimelineItem, KIND_META, KIND_ORDER } from '../utils/timeline'
import type { Kind, TimelineItem } from '../utils/timeline'
import { fmtDayHeader } from '../utils/date'
import TimelineCard from '../components/TimelineCard'
import CalendarView from '../components/CalendarView'
import DetailSheet from '../components/DetailSheet'
import Sheet from '../components/Sheet'
import EventForm from '../components/forms/EventForm'
import DiaryForm from '../components/forms/DiaryForm'
import ThoughtForm from '../components/forms/ThoughtForm'
import TransactionForm from '../components/forms/TransactionForm'
import TodoForm from '../components/forms/TodoForm'

type Filter = 'all' | Kind
type Mode = 'list' | 'calendar'

const PAGE_DAYS = 15

const EDIT_TITLES: Record<Kind, string> = {
  event: '编辑事件',
  diary: '编辑日记',
  thought: '编辑感悟',
  transaction: '编辑账目',
  todo: '编辑待办',
}

/** 时间线：所有记录按天分组倒序，支持日历模式与类型筛选 */
export default function TimelinePage() {
  const [mode, setMode] = useState<Mode>('list')
  const [filter, setFilter] = useState<Filter>('all')
  const [dayCount, setDayCount] = useState(PAGE_DAYS)
  const [detail, setDetail] = useState<TimelineItem | null>(null)
  const [editing, setEditing] = useState<TimelineItem | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? []

  const allItems = useLiveQuery(async () => {
    const [events, diaries, thoughts, transactions, todos] = await Promise.all([
      db.events.toArray(),
      db.diaries.toArray(),
      db.thoughts.toArray(),
      db.transactions.toArray(),
      db.todos.toArray(),
    ])
    return buildTimelineItems(events, diaries, thoughts, transactions, todos)
  }, [])

  const items = useMemo(
    () => (allItems ?? []).filter((i) => filter === 'all' || i.kind === filter),
    [allItems, filter],
  )

  // 按天分组（items 已倒序）
  const groups = useMemo(() => {
    const result: { day: string; list: TimelineItem[] }[] = []
    for (const item of items) {
      const last = result[result.length - 1]
      if (last && last.day === item.day) {
        last.list.push(item)
      } else {
        result.push({ day: item.day, list: [item] })
      }
    }
    return result
  }, [items])

  const visibleGroups = groups.slice(0, dayCount)
  const hasMore = groups.length > dayCount

  // 无限向下滚动：哨兵进入视口就多放 15 天
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setDayCount((c) => c + PAGE_DAYS)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, mode])

  // 切筛选/模式时回到最近的日子
  useEffect(() => {
    setDayCount(PAGE_DAYS)
  }, [filter, mode])

  const closeDetail = () => setDetail(null)
  const closeEditing = () => setEditing(null)
  const startEdit = () => {
    if (!detail) return
    setEditing(detail)
    setDetail(null)
  }
  const handleEditDelete = async () => {
    if (!editing) return
    if (!window.confirm('确定删除这条记录吗？')) return
    await deleteTimelineItem(editing)
    setEditing(null)
  }

  const loading = allItems === undefined

  return (
    <div className="page page-timeline">
      <header className="page-head">
        <h1 className="page-title">时间线</h1>
        <button
          type="button"
          className="head-action"
          onClick={() => setMode((m) => (m === 'list' ? 'calendar' : 'list'))}
        >
          {mode === 'list' ? '📅 日历' : '📋 列表'}
        </button>
      </header>

      <div className="filter-row">
        <button
          type="button"
          className={`chip ${filter === 'all' ? 'is-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          全部
        </button>
        {KIND_ORDER.map((k) => (
          <button
            key={k}
            type="button"
            className={`chip chip-${k} ${filter === k ? 'is-active' : ''}`}
            onClick={() => setFilter(k)}
          >
            {KIND_META[k].icon} {KIND_META[k].label}
          </button>
        ))}
      </div>

      {mode === 'calendar' ? (
        <CalendarView items={items} categories={categories} onOpen={setDetail} />
      ) : loading ? null : items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-panda">🐼</span>
          <p>{filter === 'all' ? '还没有任何记录，点下方 ＋ 开始记录生活' : '这个类型还没有记录'}</p>
        </div>
      ) : (
        <>
          {visibleGroups.map((group) => (
            <section key={group.day} className="tl-day">
              <h2 className="tl-day-head">{fmtDayHeader(group.day)}</h2>
              <div className="tl-group">
                {group.list.map((item) => (
                  <TimelineCard key={item.key} item={item} categories={categories} onClick={() => setDetail(item)} />
                ))}
              </div>
            </section>
          ))}
          {hasMore && <div ref={sentinelRef} className="tl-sentinel" aria-hidden />}
        </>
      )}

      {detail && <DetailSheet item={detail} categories={categories} onClose={closeDetail} onEdit={startEdit} />}

      {editing && (
        <Sheet title={EDIT_TITLES[editing.kind]} onClose={closeEditing}>
          {editing.kind === 'event' && (
            <EventForm initial={editing.data} onDone={closeEditing} onDelete={handleEditDelete} />
          )}
          {editing.kind === 'diary' && (
            <DiaryForm initial={editing.data} onDone={closeEditing} onDelete={handleEditDelete} />
          )}
          {editing.kind === 'thought' && (
            <ThoughtForm initial={editing.data} onDone={closeEditing} onDelete={handleEditDelete} />
          )}
          {editing.kind === 'transaction' && (
            <TransactionForm initial={editing.data} onDone={closeEditing} onDelete={handleEditDelete} />
          )}
          {editing.kind === 'todo' && (
            <TodoForm initial={editing.data} onDone={closeEditing} onDelete={handleEditDelete} />
          )}
        </Sheet>
      )}
    </div>
  )
}
