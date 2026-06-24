/** 系统预置默认仓库编码（客户上线后可于仓库资料中自行修改） */
export const SYSTEM_DEFAULT_WAREHOUSE_CODE = 'ck01'

/** 系统预置默认仓库名称 */
export const SYSTEM_DEFAULT_WAREHOUSE_NAME = '公司库'

/** 历史演示仓库编码，种子/查询时迁移为 ck01 */
export const LEGACY_DEFAULT_WAREHOUSE_CODES = ['WH001'] as const

export function buildSystemDefaultWarehouse(companyId: number) {
  return {
    companyId,
    code: SYSTEM_DEFAULT_WAREHOUSE_CODE,
    name: SYSTEM_DEFAULT_WAREHOUSE_NAME,
    type: 'normal',
    pricingMethod: 'average',
    address: '',
    manager: '',
    phone: '',
    status: '启用',
    allowNegativeStock: false,
    isDefault: true,
    manageBatch: true,
    manageSerialNo: false,
    manageExpiry: true,
    barcodeEnabled: true
  }
}
