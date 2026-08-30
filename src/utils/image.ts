const MAX_EDGE = 1600
const JPEG_QUALITY = 0.8

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片解码失败'))
    }
    img.src = url
  })
}

/**
 * 照片入库前压缩，防止 IndexedDB 膨胀：
 * 长边超过 1600px 时等比缩到 1600px，统一输出 JPEG（质量 0.8）；
 * 压缩失败（非图片、解码异常）或压缩后反而更大时，回退存原文件。
 */
export async function compressImage(file: Blob): Promise<Blob> {
  try {
    const img = await loadImage(file)
    const w = img.naturalWidth
    const h = img.naturalHeight
    if (!w || !h) return file
    const scale = Math.min(1, MAX_EDGE / Math.max(w, h))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const compressed = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!compressed || compressed.size >= file.size) return file
    return compressed
  } catch {
    return file
  }
}
