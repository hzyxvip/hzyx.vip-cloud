/** 仓库 / 库位（两库）批量修改字段配置 */

export type StockBatchModifyColumn = {
  key: string
  label: string
  prop: string
}

export type StockBatchModifyOption = {
  label: string
  value: string
}

export const WAREHOUSE_BATCH_MODIFY_COLUMNS: StockBatchModifyColumn[] = [
  { key: 'name', label: '仓库名称', prop: 'name' },
  { key: 'manager', label: '主管', prop: 'manager' },
  { key: 'phone', label: '电话', prop: 'phone' },
  { key: 'address', label: '地址', prop: 'address' },
  { key: 'allowNegativeStock', label: '允许负库存', prop: 'allowNegativeStock' },
  { key: 'isDefault', label: '默认仓库', prop: 'isDefault' },
  { key: 'status', label: '状态', prop: 'status' }
]

export const LOCATION_BATCH_MODIFY_COLUMNS: StockBatchModifyColumn[] = [
  { key: 'name', label: '库位名称', prop: 'name' },
  { key: 'warehouse', label: '对应仓库', prop: 'warehouse' },
  { key: 'area', label: '区域', prop: 'area' },
  { key: 'status', label: '状态', prop: 'status' }
]

export const STOCK_STATUS_OPTIONS: StockBatchModifyOption[] = [
  { label: '启用', value: '启用' },
  { label: '停用', value: '停用' }
]

export const STOCK_YES_NO_OPTIONS: StockBatchModifyOption[] = [
  { label: '是', value: '是' },
  { label: '否', value: '否' }
]

export function getWarehouseBatchModifySelectOptions(key: string): StockBatchModifyOption[] | null {
  if (key === 'status') return STOCK_STATUS_OPTIONS
  if (key === 'allowNegativeStock' || key === 'isDefault') return STOCK_YES_NO_OPTIONS
  return null
}

export function getLocationBatchModifySelectOptions(
  key: string,
  warehouseNames: string[] = []
): StockBatchModifyOption[] | null {
  if (key === 'status') return STOCK_STATUS_OPTIONS
  if (key === 'warehouse') {
    return warehouseNames.map(name => ({ label: name, value: name }))
  }
  return null
}

export function parseStockBatchModifyValue(key: string, raw: string): unknown {
  if (key === 'allowNegativeStock' || key === 'isDefault') {
    return raw === '是'
  }
  return raw
}

export function formatStockBatchModifyValue(key: string, value: unknown): string {
  if (key === 'allowNegativeStock' || key === 'isDefault') {
    return value ? '是' : '否'
  }
  return String(value ?? '')
}
