import { getAuthCompanyId, getAuthUser } from '@/utils/authSession'
import { getCurrentCompany } from '@/utils/dataStore'

export type TenantIdentity = {
  companyId: number
  companyName: string
  companyCode: string
}

/** 当前登录租户（采购方/销售方本体，不应出现在自己的供应商或客户资料中） */
export function getCurrentTenantIdentity(): TenantIdentity {
  const user = getAuthUser<{
    companyId?: number | string
    companyName?: string
    companyCode?: string
  }>()

  const fromUser = Number(user?.companyId)
  const companyId = getAuthCompanyId() ?? getCurrentCompany() ?? (fromUser || 0)
  const companyName = String(
    user?.companyName || localStorage.getItem('currentCompanyName') || ''
  ).trim()
  const companyCode = String(user?.companyCode || '').trim()

  return { companyId, companyName, companyCode }
}

export function isOwnCompanyPartnerRecord(record: {
  name?: unknown
  code?: unknown
  id?: unknown
  creditCode?: unknown
  taxNo?: unknown
}): boolean {
  const tenant = getCurrentTenantIdentity()
  const name = String(record.name || '').trim()
  const code = String(record.code || record.id || '').trim()
  const creditCode = String(record.creditCode || record.taxNo || '').trim()

  if (tenant.companyName && name && name === tenant.companyName) return true
  if (tenant.companyCode && code && code === tenant.companyCode) return true

  const tenantTaxNo = String(localStorage.getItem('currentCompanyTaxNo') || '').trim()
  if (tenantTaxNo && creditCode && creditCode === tenantTaxNo) return true

  return false
}
