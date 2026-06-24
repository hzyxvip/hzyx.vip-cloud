/** 系统预置默认仓库编码（客户上线后可于仓库资料中自行修改名称等信息） */
export const SYSTEM_DEFAULT_WAREHOUSE_CODE = 'ck01'

/** 系统预置默认仓库名称 */
export const SYSTEM_DEFAULT_WAREHOUSE_NAME = '公司库'

/** 历史演示仓库编码，加载时迁移为 ck01 */
export const LEGACY_DEFAULT_WAREHOUSE_CODES = ['WH001'] as const

export function isSystemDefaultWarehouseCode(code: string | undefined | null): boolean {
  return String(code || '').trim().toLowerCase() === SYSTEM_DEFAULT_WAREHOUSE_CODE
}

export function buildSystemDefaultWarehouseRecord(companyId: number) {
  return {
    companyId,
    code: SYSTEM_DEFAULT_WAREHOUSE_CODE,
    name: SYSTEM_DEFAULT_WAREHOUSE_NAME,
    address: '',
    manager: '',
    phone: '',
    status: '启用' as const,
    allowNegativeStock: false,
    isDefault: true
  }
}
