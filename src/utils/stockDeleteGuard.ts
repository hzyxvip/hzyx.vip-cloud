import type { Location, Warehouse } from '@/utils/dataStore'

const TRANSACTION_STORAGE_KEYS = [
  'purchaseInboundList',
  'purchase-orders',
  'purchaseReturnRecordList',
  'salesOutboundRecords',
  'sales-orders',
  'salesReturnRecords',
  'warehouseInList',
  'warehouseOutList',
  'warehouseTransferList',
  'warehouseInventoryList',
  'transferOutList'
]

const WAREHOUSE_FIELDS = [
  'warehouse',
  'warehouseName',
  'warehouseCode',
  'fromWarehouse',
  'toWarehouse'
] as const

const LOCATION_FIELDS = ['locationCode', 'locationName', 'location'] as const

export const WAREHOUSE_DELETE_RISK_HINT =
  '该仓库已启用且存在交易数据。系统设计期间允许删除，但可能影响历史单据，请确认后再操作。'
export const LOCATION_DELETE_RISK_HINT =
  '该库位已启用且存在交易数据。系统设计期间允许删除，但可能影响历史单据，请确认后再操作。'

function readJsonList(key: string): Record<string, unknown>[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(item => item && typeof item === 'object') as Record<string, unknown>[]
  } catch {
    return []
  }
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function recordValues(record: Record<string, unknown>, fields: readonly string[]): string[] {
  return fields.map(field => normalizeText(record[field])).filter(Boolean)
}

function matchesWarehouse(record: Record<string, unknown>, warehouse: Warehouse): boolean {
  const keys = new Set([warehouse.name, warehouse.code].map(normalizeText).filter(Boolean))
  if (!keys.size) return false
  return recordValues(record, WAREHOUSE_FIELDS).some(value => keys.has(value))
}

function matchesLocation(record: Record<string, unknown>, location: Location): boolean {
  const keys = new Set([location.code, location.name].map(normalizeText).filter(Boolean))
  if (!keys.size) return false
  return recordValues(record, LOCATION_FIELDS).some(value => keys.has(value))
}

function scanLineItems(
  items: unknown,
  matcher: (record: Record<string, unknown>) => boolean
): boolean {
  if (!Array.isArray(items)) return false
  return items.some(item => {
    if (!item || typeof item !== 'object') return false
    return matcher(item as Record<string, unknown>)
  })
}

function scanTransactionRecords(matcher: (record: Record<string, unknown>) => boolean): boolean {
  for (const key of TRANSACTION_STORAGE_KEYS) {
    for (const record of readJsonList(key)) {
      if (matcher(record)) return true
      if (scanLineItems(record.items, matcher)) return true
    }
  }
  return false
}

export function warehouseHasTransactionData(warehouse: Warehouse): boolean {
  return scanTransactionRecords(record => matchesWarehouse(record, warehouse))
}

export function locationHasTransactionData(location: Location): boolean {
  return scanTransactionRecords(record => matchesLocation(record, location))
}

export function warehouseDeleteNeedsRiskConfirm(warehouse: Warehouse): boolean {
  return warehouse.status === '启用' && warehouseHasTransactionData(warehouse)
}

export function locationDeleteNeedsRiskConfirm(location: Location): boolean {
  return location.status === '启用' && locationHasTransactionData(location)
}

export function buildWarehouseDeleteConfirm(warehouse: Warehouse): { title: string; message: string } {
  if (warehouseDeleteNeedsRiskConfirm(warehouse)) {
    return {
      title: '删除确认',
      message: `${WAREHOUSE_DELETE_RISK_HINT}\n\n确定删除仓库「${warehouse.name}」吗？`
    }
  }
  return {
    title: '提示',
    message: `确定删除仓库「${warehouse.name}」吗？`
  }
}

export function buildLocationDeleteConfirm(location: Location): { title: string; message: string } {
  if (locationDeleteNeedsRiskConfirm(location)) {
    return {
      title: '删除确认',
      message: `${LOCATION_DELETE_RISK_HINT}\n\n确定删除库位「${location.name}」吗？`
    }
  }
  return {
    title: '提示',
    message: `确定删除库位「${location.name}」吗？`
  }
}

export function buildBatchWarehouseDeleteConfirm(
  ids: number[],
  warehouseList: Warehouse[]
): { title: string; message: string; ids: number[] } {
  const selected = ids
    .map(id => warehouseList.find(item => item.id === id))
    .filter((item): item is Warehouse => Boolean(item))
  const riskyNames = selected.filter(warehouseDeleteNeedsRiskConfirm).map(item => item.name)

  if (riskyNames.length) {
    return {
      title: '删除确认',
      message: `${WAREHOUSE_DELETE_RISK_HINT}\n\n以下仓库存在交易数据：${riskyNames.join('、')}\n\n确定删除选中的 ${selected.length} 个仓库吗？`,
      ids: selected.map(item => item.id)
    }
  }

  return {
    title: '提示',
    message: `确定删除选中的 ${selected.length} 个仓库吗？`,
    ids: selected.map(item => item.id)
  }
}

export function buildBatchLocationDeleteConfirm(
  ids: number[],
  locationList: Location[]
): { title: string; message: string; ids: number[] } {
  const selected = ids
    .map(id => locationList.find(item => item.id === id))
    .filter((item): item is Location => Boolean(item))
  const riskyNames = selected.filter(locationDeleteNeedsRiskConfirm).map(item => item.name)

  if (riskyNames.length) {
    return {
      title: '删除确认',
      message: `${LOCATION_DELETE_RISK_HINT}\n\n以下库位存在交易数据：${riskyNames.join('、')}\n\n确定删除选中的 ${selected.length} 个库位吗？`,
      ids: selected.map(item => item.id)
    }
  }

  return {
    title: '提示',
    message: `确定删除选中的 ${selected.length} 个库位吗？`,
    ids: selected.map(item => item.id)
  }
}
