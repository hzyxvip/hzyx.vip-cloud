export type DocumentNumberKey =
  | 'purchase_order'
  | 'sales_order'
  | 'purchase_inbound'
  | 'sales_outbound'
  | 'purchase_return'
  | 'sales_return'
  | 'warehouse_other_in'
  | 'warehouse_other_out'
  | 'warehouse_transfer'
  | 'warehouse_inventory'

export type DocumentNumberDatePattern = 'yyyyMMdd' | 'yyyy-MM-dd' | 'none'

export type DocumentNumberRule = {
  key: DocumentNumberKey
  name: string
  prefix: string
  datePattern: DocumentNumberDatePattern
  separator: string
  serialDigits: number
}

export const DOCUMENT_NUMBER_RULES: DocumentNumberRule[] = [
  { key: 'purchase_order', name: '采购订单', prefix: 'CGDD', datePattern: 'yyyyMMdd', separator: '-', serialDigits: 3 },
  { key: 'sales_order', name: '销售订单', prefix: 'SO', datePattern: 'yyyyMMdd', separator: '', serialDigits: 3 },
  { key: 'purchase_inbound', name: '采购入库', prefix: 'PIN', datePattern: 'none', separator: '', serialDigits: 0 },
  { key: 'sales_outbound', name: '销售出库', prefix: 'OUT', datePattern: 'none', separator: '-', serialDigits: 0 },
  { key: 'purchase_return', name: '采购退货', prefix: 'PR', datePattern: 'none', separator: '', serialDigits: 0 },
  { key: 'sales_return', name: '销售退货', prefix: 'SR', datePattern: 'none', separator: '-', serialDigits: 0 },
  { key: 'warehouse_other_in', name: '其他入库', prefix: 'IN', datePattern: 'none', separator: '', serialDigits: 0 },
  { key: 'warehouse_other_out', name: '其他出库', prefix: 'OUT', datePattern: 'none', separator: '', serialDigits: 0 },
  { key: 'warehouse_transfer', name: '调拨单', prefix: 'TR', datePattern: 'none', separator: '', serialDigits: 0 },
  { key: 'warehouse_inventory', name: '盘点单', prefix: 'CK', datePattern: 'none', separator: '', serialDigits: 0 }
]

const STORAGE_KEY = 'system-document-number-settings'

const pad = (value: number, length: number) => String(value).padStart(length, '0')

const formatDatePart = (date: Date, pattern: DocumentNumberDatePattern): string => {
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1, 2)
  const d = pad(date.getDate(), 2)
  if (pattern === 'yyyyMMdd') return `${y}${m}${d}`
  if (pattern === 'yyyy-MM-dd') return `${y}-${m}-${d}`
  return ''
}

export function loadDocumentNumberRules(): DocumentNumberRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DOCUMENT_NUMBER_RULES.map(rule => ({ ...rule }))
    const parsed = JSON.parse(raw) as Partial<Record<DocumentNumberKey, Partial<DocumentNumberRule>>>
    return DOCUMENT_NUMBER_RULES.map(rule => ({
      ...rule,
      ...(parsed[rule.key] || {})
    }))
  } catch {
    return DOCUMENT_NUMBER_RULES.map(rule => ({ ...rule }))
  }
}

export function saveDocumentNumberRules(rules: DocumentNumberRule[]) {
  const payload = rules.reduce<Partial<Record<DocumentNumberKey, DocumentNumberRule>>>((acc, rule) => {
    acc[rule.key] = rule
    return acc
  }, {})
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function getDocumentNumberRule(key: DocumentNumberKey): DocumentNumberRule {
  return loadDocumentNumberRules().find(rule => rule.key === key) || DOCUMENT_NUMBER_RULES.find(r => r.key === key)!
}

export function previewDocumentNumber(rule: DocumentNumberRule, date = new Date()): string {
  const parts: string[] = [rule.prefix]
  const datePart = formatDatePart(date, rule.datePattern)
  if (datePart) parts.push(datePart)
  if (rule.serialDigits > 0) {
    parts.push(pad(1, rule.serialDigits))
  } else {
    parts.push(String(date.getTime()).slice(-8))
  }
  return parts.filter(Boolean).join(rule.separator)
}

export function generateDocumentNo(key: DocumentNumberKey, date = new Date()): string {
  const rule = getDocumentNumberRule(key)
  const parts: string[] = [rule.prefix]
  const datePart = formatDatePart(date, rule.datePattern)
  if (datePart) parts.push(datePart)

  if (rule.serialDigits > 0) {
    const random = Math.floor(Math.random() * 10 ** rule.serialDigits)
    parts.push(pad(random, rule.serialDigits))
  } else {
    parts.push(String(date.getTime()))
  }

  return parts.filter(Boolean).join(rule.separator)
}
