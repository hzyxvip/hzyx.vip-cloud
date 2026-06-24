export function formatDateYmd(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayYmd(baseDate = new Date()): string {
  return formatDateYmd(baseDate)
}

export function calculateExpiresAt(enabledAt: string, validityYears: number): string {
  const base = new Date(enabledAt)
  if (Number.isNaN(base.getTime()) || !Number.isFinite(validityYears) || validityYears <= 0) {
    return ''
  }
  const next = new Date(base)
  next.setFullYear(next.getFullYear() + Math.floor(validityYears))
  return formatDateYmd(next)
}

export function isAccountExpired(expiresAt?: string, baseDate = new Date()): boolean {
  if (!expiresAt) return false
  const expire = new Date(expiresAt)
  if (Number.isNaN(expire.getTime())) return false
  const today = new Date(baseDate)
  today.setHours(0, 0, 0, 0)
  expire.setHours(0, 0, 0, 0)
  return expire.getTime() < today.getTime()
}

export function getDaysUntilExpire(expiresAt?: string, baseDate = new Date()): number | null {
  if (!expiresAt) return null
  const expire = new Date(expiresAt)
  if (Number.isNaN(expire.getTime())) return null
  const today = new Date(baseDate)
  today.setHours(0, 0, 0, 0)
  expire.setHours(0, 0, 0, 0)
  return Math.ceil((expire.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/** 到期日在当月且未过期 */
export function isExpiringThisMonth(expiresAt?: string, baseDate = new Date()): boolean {
  const days = getDaysUntilExpire(expiresAt, baseDate)
  if (days === null || days < 0) return false
  const expire = new Date(String(expiresAt).slice(0, 10))
  const base = new Date(baseDate)
  return expire.getFullYear() === base.getFullYear() && expire.getMonth() === base.getMonth()
}

/** 到期日在当月或次月且未过期 */
export function isExpiringWithinTwoMonths(expiresAt?: string, baseDate = new Date()): boolean {
  const days = getDaysUntilExpire(expiresAt, baseDate)
  if (days === null || days < 0) return false
  const base = new Date(baseDate)
  base.setHours(0, 0, 0, 0)
  const expire = new Date(String(expiresAt).slice(0, 10))
  expire.setHours(0, 0, 0, 0)
  const windowEnd = new Date(base.getFullYear(), base.getMonth() + 2, 0)
  return expire.getTime() <= windowEnd.getTime()
}

/** 到期日在当月、次月或第三个月且未过期 */
export function isExpiringWithinThreeMonths(expiresAt?: string, baseDate = new Date()): boolean {
  const days = getDaysUntilExpire(expiresAt, baseDate)
  if (days === null || days < 0) return false
  const base = new Date(baseDate)
  base.setHours(0, 0, 0, 0)
  const expire = new Date(String(expiresAt).slice(0, 10))
  expire.setHours(0, 0, 0, 0)
  const windowEnd = new Date(base.getFullYear(), base.getMonth() + 3, 0)
  return expire.getTime() <= windowEnd.getTime()
}

export type AccountExpiryFilter = '' | 'thisMonth' | 'twoMonths' | 'threeMonths'

export function matchAccountExpiryFilter(
  filter: AccountExpiryFilter,
  expiresAt?: string,
  baseDate = new Date()
): boolean {
  if (!filter) return true
  if (filter === 'thisMonth') return isExpiringThisMonth(expiresAt, baseDate)
  if (filter === 'twoMonths') return isExpiringWithinTwoMonths(expiresAt, baseDate)
  if (filter === 'threeMonths') return isExpiringWithinThreeMonths(expiresAt, baseDate)
  return true
}
