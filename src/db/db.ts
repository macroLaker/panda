import Dexie, { type Table } from 'dexie'

/** 时间事件：一段有起止时间的经历 */
export interface PandaEvent {
  id?: number
  startTime: string // yyyy-MM-ddTHH:mm 本地时间
  endTime: string
  description: string
  createdAt: string
}

/** 日记：一天一篇长文，可附照片 */
export interface Diary {
  id?: number
  date: string // yyyy-MM-dd
  content: string
  photos: Blob[]
  createdAt: string
  updatedAt: string
}

/** 感悟：随手一记 */
export interface Thought {
  id?: number
  content: string
  tags: string[]
  createdAt: string
}

export type MoneyType = 'expense' | 'income'

/** 记账流水 */
export interface Transaction {
  id?: number
  type: MoneyType
  amount: number
  categoryId: number
  note: string
  date: string // yyyy-MM-dd
  createdAt: string
}

/** 记账分类 */
export interface Category {
  id?: number
  name: string
  type: MoneyType
  icon: string // emoji
  sortOrder: number
}

export type TodoScope = 'day' | 'week' | 'month'
export type TodoPriority = 'high' | 'medium' | 'low'

/** 待办 */
export interface Todo {
  id?: number
  content: string
  scope: TodoScope
  priority: TodoPriority
  scopeDate: string // 归属周期的起始日 yyyy-MM-dd
  done: boolean
  doneAt?: string
  createdAt: string
}

/** 键值设置（PIN hash/salt、lastBackupAt 等） */
export interface Setting {
  key: string
  value: string
}

/** 内部快照：每天首次打开时自动生成的全量数据副本，照片直接存 Blob，仅保留最近 1 份 */
export interface Snapshot {
  id?: number
  createdAt: string // 本地时间 yyyy-MM-ddTHH:mm:ss
  data: {
    events: PandaEvent[]
    diaries: Diary[]
    thoughts: Thought[]
    transactions: Transaction[]
    categories: Category[]
    todos: Todo[]
    settings: Setting[]
  }
}

const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: '餐饮', type: 'expense', icon: '🍜', sortOrder: 0 },
  { name: '交通', type: 'expense', icon: '🚌', sortOrder: 1 },
  { name: '购物', type: 'expense', icon: '🛍️', sortOrder: 2 },
  { name: '居住', type: 'expense', icon: '🏠', sortOrder: 3 },
  { name: '娱乐', type: 'expense', icon: '🎮', sortOrder: 4 },
  { name: '医疗', type: 'expense', icon: '💊', sortOrder: 5 },
  { name: '学习', type: 'expense', icon: '📚', sortOrder: 6 },
  { name: '人情', type: 'expense', icon: '🎁', sortOrder: 7 },
  { name: '其他', type: 'expense', icon: '📦', sortOrder: 8 },
  { name: '工资', type: 'income', icon: '💰', sortOrder: 0 },
  { name: '奖金', type: 'income', icon: '🧧', sortOrder: 1 },
  { name: '理财', type: 'income', icon: '📈', sortOrder: 2 },
  { name: '其他', type: 'income', icon: '💼', sortOrder: 3 },
]

class PandaDB extends Dexie {
  events!: Table<PandaEvent, number>
  diaries!: Table<Diary, number>
  thoughts!: Table<Thought, number>
  transactions!: Table<Transaction, number>
  categories!: Table<Category, number>
  todos!: Table<Todo, number>
  settings!: Table<Setting, string>
  snapshots!: Table<Snapshot, number>

  constructor() {
    super('panda-db')
    // ⚠️ 表结构变更约定：禁止直接修改已发布的 version(1) stores 字符串，
    // 必须新增 this.version(n).stores({...}).upgrade(...) 做迁移（见 CONTRIBUTING.md）
    this.version(1).stores({
      events: '++id, startTime, createdAt',
      diaries: '++id, date, createdAt',
      thoughts: '++id, createdAt',
      transactions: '++id, date, type, categoryId, createdAt',
      categories: '++id, type, sortOrder',
      todos: '++id, scope, scopeDate, createdAt',
      settings: 'key',
    })
    // 首次创建数据库时预置常用分类
    this.on('populate', (tx) => {
      tx.table('categories').bulkAdd(DEFAULT_CATEGORIES)
    })
    // v2：新增内部快照表（仅列出新增/变化的表，无旧数据需迁移）
    this.version(2).stores({
      snapshots: '++id, createdAt',
    })
  }
}

export const db = new PandaDB()

export async function getSetting(key: string): Promise<string | undefined> {
  const row = await db.settings.get(key)
  return row?.value
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value })
}

export async function removeSetting(key: string): Promise<void> {
  await db.settings.delete(key)
}
