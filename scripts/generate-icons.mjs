/**
 * 零依赖生成 Panda PWA 图标（几何熊猫 + 竹绿渐变背景）。
 * 产出：public/pwa-512.png、public/pwa-192.png、public/apple-touch-icon.png(180)
 * 用法：node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

// ---------- 最小 PNG 编码器 ----------
const CRC_TABLE = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c
}

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ---------- 几何熊猫绘制（单位坐标，2x2 超采样抗锯齿） ----------
const INK = [32, 34, 30]
const PAPER = [253, 252, 246]

function inCircle(u, v, cx, cy, r) {
  const dx = u - cx
  const dy = v - cy
  return dx * dx + dy * dy <= r * r
}

function samplePixel(u, v) {
  // 竹绿纵向渐变背景
  const t = v
  let c = [
    Math.round(0x3f + (0x2a - 0x3f) * t),
    Math.round(0x95 + (0x68 - 0x95) * t),
    Math.round(0x64 + (0x45 - 0x64) * t),
  ]
  // 耳朵（先画，脸盖在上面）
  if (inCircle(u, v, 0.26, 0.3, 0.125) || inCircle(u, v, 0.74, 0.3, 0.125)) c = INK
  // 脸
  if (inCircle(u, v, 0.5, 0.55, 0.335)) c = PAPER
  // 眼斑
  if (inCircle(u, v, 0.385, 0.505, 0.088) || inCircle(u, v, 0.615, 0.505, 0.088)) c = INK
  // 眼珠高光
  if (inCircle(u, v, 0.402, 0.488, 0.023) || inCircle(u, v, 0.632, 0.488, 0.023)) c = PAPER
  // 鼻子
  if (inCircle(u, v, 0.5, 0.648, 0.042)) c = INK
  return c
}

function renderIcon(size) {
  const px = Buffer.alloc(size * size * 4)
  const S = 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const u = (x + (sx + 0.5) / S) / size
          const v = (y + (sy + 0.5) / S) / size
          const c = samplePixel(u, v)
          r += c[0]
          g += c[1]
          b += c[2]
        }
      }
      const i = (y * size + x) * 4
      px[i] = Math.round(r / (S * S))
      px[i + 1] = Math.round(g / (S * S))
      px[i + 2] = Math.round(b / (S * S))
      px[i + 3] = 255
    }
  }
  return encodePNG(size, px)
}

mkdirSync(OUT_DIR, { recursive: true })
const targets = [
  ['pwa-512.png', 512],
  ['pwa-192.png', 192],
  ['apple-touch-icon.png', 180],
]
for (const [name, size] of targets) {
  writeFileSync(join(OUT_DIR, name), renderIcon(size))
  console.log(`✔ public/${name} (${size}x${size})`)
}
