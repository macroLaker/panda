import { db, setSetting } from '../db/db'
import type { Category, Diary, PandaEvent, Setting, Thought, Todo, Transaction } from '../db/db'
import { nowISO, todayStr } from './date'

/** settings 表里记录最近一次全量 JSON 备份完成时间的 key */
export const LAST_BACKUP_KEY = 'lastBackupAt'

/** 备份文件里的日记：照片转成 dataURL 字符串 */
type DiaryExport = Omit<Diary, 'photos'> & { photos: string[] }

/**
 * ⚠️ 备份格式演进约定：任何对 BackupFile 结构的不兼容改动，
 * 必须递增 formatVersion，并在 importBackup 中为旧版本写迁移分支（见 CONTRIBUTING.md）。
 */
const SUPPORTED_FORMAT_VERSIONS = [1]

interface BackupFile {
  app: string
  formatVersion: number
  exportedAt: string
  data: {
    events: PandaEvent[]
    diaries: DiaryExport[]
    thoughts: Thought[]
    transactions: Transaction[]
    categories: Category[]
    todos: Todo[]
    settings: Setting[]
  }
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function dataURLToBlob(dataURL: string): Blob {
  const [head, body] = dataURL.split(',')
  const mime = /data:(.*?);base64/.exec(head)?.[1] ?? 'image/jpeg'
  const bin = atob(body)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * 导出文件（分层降级，兼容 iOS「添加到主屏幕」standalone 模式）：
 * 1. Web Share API（files）：iOS PWA 最可靠路径，系统分享面板可「存储到文件」；
 *    必须在用户点击手势的同步/近同步调用链中触发，用户取消（AbortError）不算失败
 * 2. a[download] + objectURL：常规浏览器下载
 * 3. 都不可用时给出中文提示
 * @returns 是否实际完成导出（share 成功 / 触发下载 = true；用户取消分享或环境不支持 = false）
 */
export async function exportFile(blob: Blob, filename: string): Promise<boolean> {
  if (typeof navigator.canShare === 'function' && typeof navigator.share === 'function') {
    const file = new File([blob], filename, { type: blob.type })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
        return true
      } catch (err) {
        // 用户取消分享不算失败，静默忽略，但也不算完成
        if (err instanceof DOMException && err.name === 'AbortError') return false
        // 其他异常继续走下载降级
      }
    }
  }
  if ('download' in HTMLAnchorElement.prototype) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 3000)
    return true
  }
  window.alert('当前环境不支持导出文件，请在 Safari 浏览器标签页中打开本应用后再导出。')
  return false
}

/**
 * 导出全量 JSON 备份（照片以 base64 内嵌）；实际完成时更新 lastBackupAt
 * @returns 是否实际完成导出
 */
export async function exportBackup(): Promise<boolean> {
  const [events, diaries, thoughts, transactions, categories, todos, settings] = await Promise.all([
    db.events.toArray(),
    db.diaries.toArray(),
    db.thoughts.toArray(),
    db.transactions.toArray(),
    db.categories.toArray(),
    db.todos.toArray(),
    db.settings.toArray(),
  ])
  const diariesOut: DiaryExport[] = await Promise.all(
    diaries.map(async (d) => ({
      ...d,
      photos: await Promise.all((d.photos ?? []).map(blobToDataURL)),
    })),
  )
  const backup: BackupFile = {
    app: 'panda',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    data: { events, diaries: diariesOut, thoughts, transactions, categories, todos, settings },
  }
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
  const done = await exportFile(blob, `panda-backup-${todayStr()}.json`)
  if (done) await setSetting(LAST_BACKUP_KEY, nowISO())
  return done
}

/** 导入 JSON 备份，覆盖当前全部数据 */
export async function importBackup(file: File): Promise<void> {
  const text = await file.text()
  let parsed: BackupFile
  try {
    parsed = JSON.parse(text) as BackupFile
  } catch {
    throw new Error('文件不是有效的 JSON')
  }
  if (parsed.app !== 'panda' || !parsed.data) {
    throw new Error('不是有效的 Panda 备份文件')
  }
  if (!SUPPORTED_FORMAT_VERSIONS.includes(parsed.formatVersion)) {
    throw new Error(`备份文件版本不受支持（formatVersion: ${parsed.formatVersion}），请先将应用更新到最新版本后再导入`)
  }
  const d = parsed.data
  const diaries: Diary[] = (d.diaries ?? []).map((item) => ({
    ...item,
    photos: (item.photos ?? []).map(dataURLToBlob),
  }))
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
      await db.diaries.bulkAdd(diaries)
      await db.thoughts.bulkAdd(d.thoughts ?? [])
      await db.transactions.bulkAdd(d.transactions ?? [])
      await db.categories.bulkAdd(d.categories ?? [])
      await db.todos.bulkAdd(d.todos ?? [])
      await db.settings.bulkAdd(d.settings ?? [])
    },
  )
}

/** 导出记账 CSV（UTF-8 BOM，Excel 直接打开中文不乱码） */
export async function exportTransactionsCSV(): Promise<void> {
  const [txs, cats] = await Promise.all([db.transactions.toArray(), db.categories.toArray()])
  const catName = (id: number) => cats.find((c) => c.id === id)?.name ?? '未分类'
  const esc = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
  txs.sort((a, b) => (a.date < b.date ? 1 : -1))
  const lines = txs.map((t) =>
    [t.date, t.type === 'expense' ? '支出' : '收入', esc(catName(t.categoryId)), t.amount.toFixed(2), esc(t.note ?? '')].join(','),
  )
  const csv = `\uFEFF日期,类型,分类,金额,备注\n${lines.join('\n')}`
  await exportFile(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `panda-记账-${todayStr()}.csv`)
}
