import { format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export const DAY_FMT = 'yyyy-MM-dd'

/** 今天，yyyy-MM-dd */
export function todayStr(): string {
  return format(new Date(), DAY_FMT)
}

/** 本周起始日（周一），yyyy-MM-dd */
export function weekStartStr(d: Date = new Date()): string {
  return format(startOfWeek(d, { weekStartsOn: 1 }), DAY_FMT)
}

/** 本月起始日，yyyy-MM-dd */
export function monthStartStr(d: Date = new Date()): string {
  return format(startOfMonth(d), DAY_FMT)
}

/** 当前本地时间，yyyy-MM-ddTHH:mm:ss（用字符串排序即为时间序） */
export function nowISO(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")
}

/** 当前本地时间到分钟，适配 datetime-local 输入框 */
export function nowLocalMinute(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm")
}

/** 日期头：8月30日 星期日 */
export function fmtDayHeader(day: string): string {
  return format(parseISO(day), 'M月d日 EEEE', { locale: zhCN })
}

/** 完整日期：2026年8月30日 星期日 */
export function fmtFullDay(day: string): string {
  return format(parseISO(day), 'yyyy年M月d日 EEEE', { locale: zhCN })
}

/** 从本地 ISO 字符串取 HH:mm */
export function fmtTime(iso: string): string {
  return iso.slice(11, 16)
}

/** 事件起止时间展示，跨天时带上日期 */
export function fmtEventRange(start: string, end: string): string {
  if (start.slice(0, 10) === end.slice(0, 10)) {
    return `${fmtTime(start)} – ${fmtTime(end)}`
  }
  return `${fmtTime(start)} – ${format(parseISO(end), 'M/d HH:mm')}`
}

/** 金额展示，保留两位 */
export function fmtMoney(n: number): string {
  return n.toFixed(2)
}
