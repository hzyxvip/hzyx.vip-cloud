export type DocumentFunctionCategory = 'order' | 'inbound' | 'outbound' | 'document'

export type DocumentFunctionKey =
  | 'purchase_order'
  | 'sales_order'
  | 'purchase_inbound'
  | 'warehouse_other_in'
  | 'warehouse_transfer_in'
  | 'warehouse_inventory_in'
  | 'sales_outbound'
  | 'warehouse_other_out'
  | 'warehouse_transfer_out'
  | 'warehouse_inventory_out'
  | 'purchase_return'
  | 'sales_return'
  | 'warehouse_inventory'

export type DocumentFunctionItem = {
  key: DocumentFunctionKey
  category: DocumentFunctionCategory
  name: string
  permissionCode: string
}

export const DOCUMENT_FUNCTION_CATEGORY_LABELS: Record<DocumentFunctionCategory, string> = {
  order: '订',
  inbound: '进',
  outbound: '出',
  document: '单据'
}

export const DOCUMENT_FUNCTION_ITEMS: DocumentFunctionItem[] = [
  { key: 'purchase_order', category: 'order', name: '采购订单', permissionCode: 'purchase_confirm' },
  { key: 'sales_order', category: 'order', name: '销售订单', permissionCode: 'sales_confirm' },
  { key: 'purchase_inbound', category: 'inbound', name: '采购入库', permissionCode: 'purchase_inbound_confirm' },
  { key: 'warehouse_other_in', category: 'inbound', name: '其他入库', permissionCode: 'warehouse_in_confirm' },
  { key: 'warehouse_transfer_in', category: 'inbound', name: '调拨入库', permissionCode: 'warehouse_in_confirm' },
  { key: 'warehouse_inventory_in', category: 'inbound', name: '盘盈入库', permissionCode: 'warehouse_in_confirm' },
  { key: 'sales_outbound', category: 'outbound', name: '销售出库', permissionCode: 'sales_outbound_confirm' },
  { key: 'warehouse_other_out', category: 'outbound', name: '其他出库', permissionCode: 'warehouse_out_confirm' },
  { key: 'warehouse_transfer_out', category: 'outbound', name: '调拨出库', permissionCode: 'warehouse_out_confirm' },
  { key: 'warehouse_inventory_out', category: 'outbound', name: '盘亏出库', permissionCode: 'warehouse_out_confirm' },
  { key: 'purchase_return', category: 'document', name: '采购退货', permissionCode: 'document_confirm' },
  { key: 'sales_return', category: 'document', name: '销售退货', permissionCode: 'document_confirm' },
  { key: 'warehouse_inventory', category: 'document', name: '盘点单', permissionCode: 'document_confirm' }
]

const STORAGE_KEY = 'system-document-function-settings'

const DEFAULT_CONFIRM_ENABLED: Record<DocumentFunctionKey, boolean> =
  DOCUMENT_FUNCTION_ITEMS.reduce((acc, item) => {
    acc[item.key] = true
    return acc
  }, {} as Record<DocumentFunctionKey, boolean>)

export function loadDocumentConfirmSettings(): Record<DocumentFunctionKey, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_CONFIRM_ENABLED }
    const parsed = JSON.parse(raw) as Partial<Record<DocumentFunctionKey, boolean>>
    return DOCUMENT_FUNCTION_ITEMS.reduce((acc, item) => {
      acc[item.key] = parsed[item.key] ?? DEFAULT_CONFIRM_ENABLED[item.key]
      return acc
    }, {} as Record<DocumentFunctionKey, boolean>)
  } catch {
    return { ...DEFAULT_CONFIRM_ENABLED }
  }
}

export function saveDocumentConfirmSettings(settings: Record<DocumentFunctionKey, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function isDocumentConfirmEnabled(key: DocumentFunctionKey): boolean {
  return loadDocumentConfirmSettings()[key] ?? true
}

export function getDocumentFunctionItem(key: DocumentFunctionKey): DocumentFunctionItem | undefined {
  return DOCUMENT_FUNCTION_ITEMS.find(item => item.key === key)
}

export const CONFIRM_STATUS_UNCONFIRMED = '未确认'
export const CONFIRM_STATUS_CONFIRMED = '已确认'

export function normalizeConfirmStatus(value: unknown): typeof CONFIRM_STATUS_UNCONFIRMED | typeof CONFIRM_STATUS_CONFIRMED {
  return value === CONFIRM_STATUS_CONFIRMED ? CONFIRM_STATUS_CONFIRMED : CONFIRM_STATUS_UNCONFIRMED
}
