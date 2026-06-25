import { loadActiveCustomerList } from '@/utils/customerStore'
import { DEMO_COMPANY_NAME } from '@/constants/loginAccounts'
import { isPlatformPartnerCode } from '@/utils/partnerPlatformCode'
import { loadPlatformCustomerList } from '@/utils/platformCustomerStore'
import { loadSupplierList } from '@/utils/supplierStore'

/** 演示协同：常见医享平台编号 → 公司名称（主数据未同步时的兜底） */
const DEMO_COLLAB_PARTNER_CODE_NAMES: Record<string, string> = {
  YY00002: DEMO_COMPANY_NAME
}

export function resolvePartnerNameByPlatformCode(code: unknown): string {
  const normalized = String(code || '').trim()
  if (!isPlatformPartnerCode(normalized)) return ''

  const customer = loadActiveCustomerList().find(item => {
    const itemCode = String(item.code || item.id || '').trim()
    return itemCode === normalized
  })
  if (customer?.name) return String(customer.name)

  const platform = loadPlatformCustomerList().find(item => item.companyCode === normalized)
  if (platform?.companyName) return String(platform.companyName)

  const supplier = loadSupplierList().find(item => {
    const itemCode = String(item.code || item.id || '').trim()
    return itemCode === normalized
  })
  if (supplier?.name) return String(supplier.name)

  return DEMO_COLLAB_PARTNER_CODE_NAMES[normalized] || ''
}

export function resolvePartnerPlatformCodeByName(name: unknown): string {
  const normalized = String(name || '').trim()
  if (!normalized) return ''

  const customer = loadActiveCustomerList().find(item => item.name === normalized)
  const customerCode = String(customer?.code || customer?.id || '').trim()
  if (isPlatformPartnerCode(customerCode)) return customerCode

  const supplier = loadSupplierList().find(item => item.name === normalized)
  const supplierCode = String(supplier?.code || supplier?.id || '').trim()
  if (isPlatformPartnerCode(supplierCode)) return supplierCode

  const platform = loadPlatformCustomerList().find(item => item.companyName === normalized)
  const platformCode = String(platform?.companyCode || '').trim()
  if (isPlatformPartnerCode(platformCode)) return platformCode

  for (const [code, companyName] of Object.entries(DEMO_COLLAB_PARTNER_CODE_NAMES)) {
    if (companyName === normalized) return code
  }

  return ''
}

export function resolveSupplierPlatformCode(order: Record<string, unknown>): string {
  const saved = String(order.supplierPlatformCode || '').trim()
  if (saved) return saved

  const supplierCode = String(order.supplierCode || '').trim()
  if (isPlatformPartnerCode(supplierCode)) return supplierCode

  const supplierName = String(order.supplier || '').trim()
  if (!supplierName) return ''

  return resolvePartnerPlatformCodeByName(supplierName)
}

export function resolveCustomerPlatformCode(order: Record<string, unknown>): string {
  const saved = String(order.customerPlatformCode || '').trim()
  if (saved) return saved

  const customerCode = String(order.customerCode || '').trim()
  if (isPlatformPartnerCode(customerCode)) return customerCode

  const customerName = String(order.customer || '').trim()
  if (!customerName) return ''

  return resolvePartnerPlatformCodeByName(customerName)
}
