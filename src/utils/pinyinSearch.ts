import { pinyin } from 'pinyin-pro'

const LATIN_QUERY = /^[a-z0-9]+$/
const initialsCache = new Map<string, string>()
const fullPinyinCache = new Map<string, string>()

export function getPinyinInitials(text: string): string {
  if (!text) return ''
  const cached = initialsCache.get(text)
  if (cached !== undefined) return cached
  const value = pinyin(text, { pattern: 'first', toneType: 'none', type: 'string' })
    .replace(/\s/g, '')
    .toLowerCase()
  initialsCache.set(text, value)
  return value
}

export function getPinyinFull(text: string): string {
  if (!text) return ''
  const cached = fullPinyinCache.get(text)
  if (cached !== undefined) return cached
  const value = pinyin(text, { toneType: 'none', type: 'string' })
    .replace(/\s/g, '')
    .toLowerCase()
  fullPinyinCache.set(text, value)
  return value
}

/**
 * 商品列表查询专用：原文/拼音匹配，查询关键词不区分大小写。
 * 不修改存储数据，仅在筛选时做比对。
 */
export function fieldContainsKeyword(value: unknown, keyword: string): boolean {
  const query = keyword.trim().toLowerCase()
  if (!query) return true

  const raw = String(value ?? '')
  if (!raw) return false

  if (raw.toLowerCase().includes(query)) return true

  if (!LATIN_QUERY.test(query)) return false

  const initials = getPinyinInitials(raw)
  if (initials.includes(query)) return true

  const full = getPinyinFull(raw)
  return full.includes(query)
}
