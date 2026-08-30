/** 统一的写入失败提示：IndexedDB 写入可能因存储空间不足（QuotaExceededError）等原因失败 */
export function alertWriteError(err: unknown): void {
  const detail = err instanceof Error ? err.message : String(err)
  window.alert(`保存失败：${detail}\n设备存储空间可能已满，请清理空间后重试，并及时导出备份。`)
}
