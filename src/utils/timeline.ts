import { db } from '../db/db'
import type { Diary, PandaEvent, Thought, Todo, Transaction } from '../db/db'

export type Kind = 'event' | 'diary' | 'thought' | 'transaction' | 'todo'

export type TimelineItem =
  | { kind: 'event'; key: string; day: string; sortKey: string; data: PandaEvent }
  | { kind: 'diary'; key: string; day: string; sortKey: string; data: Diary }
  | { kind: 'thought'; key: string; day: string; sortKey: string; data: Thought }
  | { kind: 'transaction'; key: string; day: string; sortKey: string; data: Transaction }
  | { kind: 'todo'; key: string; day: string; sortKey: string; data: Todo }

export const KIND_META: Record<Kind, { label: string; icon: string; className: string }> = {
  event: { label: '事件', icon: '⏱', className: 'k-event' },
  diary: { label: '日记', icon: '📔', className: 'k-diary' },
  thought: { label: '感悟', icon: '💡', className: 'k-thought' },
  transaction: { label: '记账', icon: '💰', className: 'k-tx' },
  todo: { label: '待办', icon: '✅', className: 'k-todo' },
}

export const KIND_ORDER: Kind[] = ['event', 'diary', 'thought', 'transaction', 'todo']

/**
 * 把五类记录汇聚成统一的时间线条目并按时间倒序。
 * 归属日：事件→开始日；日记→日记日期；感悟→创建日；账目→账目日期；待办→完成日（仅已完成）。
 */
export function buildTimelineItems(
  events: PandaEvent[],
  diaries: Diary[],
  thoughts: Thought[],
  transactions: Transaction[],
  todos: Todo[],
): TimelineItem[] {
  const items: TimelineItem[] = []
  for (const e of events) {
    items.push({ kind: 'event', key: `event-${e.id}`, day: e.startTime.slice(0, 10), sortKey: e.startTime, data: e })
  }
  for (const d of diaries) {
    // 日记按天记录，固定排在当天最上方
    items.push({ kind: 'diary', key: `diary-${d.id}`, day: d.date, sortKey: `${d.date}T23:59:59`, data: d })
  }
  for (const t of thoughts) {
    items.push({ kind: 'thought', key: `thought-${t.id}`, day: t.createdAt.slice(0, 10), sortKey: t.createdAt, data: t })
  }
  for (const x of transactions) {
    // 记录日与账目日相同用创建时刻排序，补记的账目放到当天中间
    const sortKey = x.createdAt.slice(0, 10) === x.date ? x.createdAt : `${x.date}T12:00:00`
    items.push({ kind: 'transaction', key: `tx-${x.id}`, day: x.date, sortKey, data: x })
  }
  for (const t of todos) {
    if (t.done && t.doneAt) {
      items.push({ kind: 'todo', key: `todo-${t.id}`, day: t.doneAt.slice(0, 10), sortKey: t.doneAt, data: t })
    }
  }
  items.sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0))
  return items
}

/** 从时间线（含数据库）删除一条记录 */
export async function deleteTimelineItem(item: TimelineItem): Promise<void> {
  const id = item.data.id
  if (id == null) return
  switch (item.kind) {
    case 'event':
      await db.events.delete(id)
      break
    case 'diary':
      await db.diaries.delete(id)
      break
    case 'thought':
      await db.thoughts.delete(id)
      break
    case 'transaction':
      await db.transactions.delete(id)
      break
    case 'todo':
      await db.todos.delete(id)
      break
  }
}

export function excerpt(text: string, max = 90): string {
  const oneLine = text.replace(/\s+/g, ' ').trim()
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine
}
