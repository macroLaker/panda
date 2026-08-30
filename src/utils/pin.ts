/** 生成 16 字节随机盐（hex） */
export function genSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** SHA-256(salt:pin)，hex 输出 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export const PIN_HASH_KEY = 'pinHash'
export const PIN_SALT_KEY = 'pinSalt'
export const SESSION_UNLOCK_KEY = 'panda-unlocked'
