import { db } from '../db/db'
import type { Snapshot } from '../db/db'
import { nowISO, todayStr } from './date'

/** 最近一份内部快照 */
export function getLatestSnapshot(): Promise<Snapshot | undefined> {
  return db.snapshots.orderBy('createdAt').last()
}

/**
 * 每天首次打开 app 时后台生成一份全量内部快照（照片直接存 Blob，不转 base64）。
 * 仅保留最近 1 份：在同一事务中先写入新快照、再删除旧快照，保证原子性。
 * 生成失败（如存储满）静默不打扰用户，仅 console.warn 留痕。
 */
export async function maybeCreateDailySnapshot(): Promise<void> {
  try {
    const latest = await getLatestSnapshot()
    if (latest && latest.createdAt.slice(0, 10) === todayStr()) return
    const [events, diaries, thoughts, transactions, categories, todos, settings] = await Promise.all([
      db.events.toArray(),
      db.diaries.toArray(),
      db.thoughts.toArray(),
      db.transactions.toArray(),
      db.categories.toArray(),
      db.todos.toArray(),
      db.settings.toArray(),
    ])
    const snapshot: Omit<Snapshot, 'id'> = {
      createdAt: nowISO(),
      data: { events, diaries, thoughts, transactions, categories, todos, settings },
    }
    await db.transaction('rw', db.snapshots, async () => {
      const oldIds = await db.snapshots.toCollection().primaryKeys()
      await db.snapshots.add(snapshot as Snapshot)
      await db.snapshots.bulkDelete(oldIds)
    })
  } catch (err) {
    console.warn('[panda] 内部快照生成失败（不影响使用）:', err)
  }
}

/** 从快照覆盖式恢复：清空各表后写回，复用备份导入的事务模式 */
export async function restoreSnapshot(snapshot: Snapshot): Promise<void> {
  const d = snapshot.data
  await db.transaction(
    'rw',
    [db.events, db.diaries, db.thoughts, db.transactions, db.categories, db.todos, db.settings],
    async () => {
      await Promise.all([
        db.events.clear(),
        db.diaries.clear(),
        db.thoughts.clear(),
        db.transactions.clear(),
        db.categories.clear(),
        db.todos.clear(),
        db.settings.clear(),
      ])
      await db.events.bulkAdd(d.events ?? [])
      await db.diaries.bulkAdd(d.diaries ?? [])
      await db.thoughts.bulkAdd(d.thoughts ?? [])
      await db.transactions.bulkAdd(d.transactions ?? [])
      await db.categories.bulkAdd(d.categories ?? [])
      await db.todos.bulkAdd(d.todos ?? [])
      await db.settings.bulkAdd(d.settings ?? [])
    },
  )
}
