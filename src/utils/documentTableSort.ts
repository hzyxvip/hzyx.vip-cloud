/** 进 / 订 / 出货等单据列表与表体共用的列排序工具 */

export type DocumentColumnSortOrder = '' | 'ascending' | 'descending'

export type DocumentSortValue = string | number

/** 表体数值列（数量、单价、金额等） */
export const DOCUMENT_ITEM_NUMERIC_COLUMN_KEYS = new Set([
  'quantity',
  'unitPrice',
  'price',
  'amount',
  'auxQuantity',
  'lastPrice',
  'taxIncludedUnitPrice',
  'taxIncludedAmount',
  'taxAmount',
  'retailPrice',
  'retailTotal',
  'discountRate',
  'taxRate',
  'unitPriceIncludesTax',
  'discount',
  'netAmount'
])

/** 表体日期列 */
export const DOCUMENT_ITEM_DATE_COLUMN_KEYS = new Set([
  'productionDate',
  'expiryDate',
  'date',
  'mfgDate',
  'expireDate'
])

/** 列表金额类列（含货币符号） */
export const parseDocumentMoneySortValue = (value: unknown): number => {
  const n = parseFloat(String(value ?? '').replace(/[¥,\s]/g, ''))
  return Number.isNaN(n) ? 0 : n
}

export function cycleColumnSortOrder(current: DocumentColumnSortOrder): DocumentColumnSortOrder {
  if (current === '') return 'ascending'
  if (current === 'ascending') return 'descending'
  return ''
}

export function getDocumentSortIcon(order: DocumentColumnSortOrder): string {
  return order === 'ascending' ? '↑' : order === 'descending' ? '↓' : '↕'
}

export function sortRowsByColumn<T extends Record<string, unknown>>(
  rows: T[],
  colKey: string,
  order: DocumentColumnSortOrder,
  resolveValue: (row: T, colKey: string) => DocumentSortValue
): T[] {
  if (!order) return [...rows]

  return [...rows].sort((a, b) => {
    const aVal = resolveValue(a, colKey)
    const bVal = resolveValue(b, colKey)
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      const diff = aVal - bVal
      return order === 'ascending' ? diff : -diff
    }
    const cmp = String(aVal).localeCompare(String(bVal), 'zh-CN', { numeric: true })
    return order === 'ascending' ? cmp : -cmp
  })
}

/** 单据表体：按列 key / prop 解析排序值 */
export function resolveDocumentItemSortValue(
  row: Record<string, unknown>,
  colKey: string,
  prop?: string
): DocumentSortValue {
  const field = prop || (colKey === 'remark' ? 'itemRemark' : colKey)
  const raw = row[field]

  if (DOCUMENT_ITEM_NUMERIC_COLUMN_KEYS.has(colKey) || DOCUMENT_ITEM_NUMERIC_COLUMN_KEYS.has(field)) {
    return Number(raw) || 0
  }
  if (DOCUMENT_ITEM_DATE_COLUMN_KEYS.has(colKey) || DOCUMENT_ITEM_DATE_COLUMN_KEYS.has(field)) {
    return String(raw || '')
  }
  return String(raw ?? '')
}

/** 单据类型标识（进 / 订 / 出货） */
export type ErpDocumentTableKind =
  | 'purchase_order'
  | 'sales_order'
  | 'purchase_inbound'
  | 'sales_outbound'

export const ERP_DOCUMENT_TABLE_KIND_LABELS: Record<ErpDocumentTableKind, string> = {
  purchase_order: '采购订单',
  sales_order: '销售订单',
  purchase_inbound: '采购入库',
  sales_outbound: '销售出库'
}
