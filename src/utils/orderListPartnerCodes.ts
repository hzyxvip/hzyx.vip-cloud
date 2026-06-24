import { loadActiveCustomerList } from '@/utils/customerStore'
import { isPlatformPartnerCode } from '@/utils/partnerPlatformCode'
import { loadSupplierList } from '@/utils/supplierStore'

export function resolveSupplierPlatformCode(order: Record<string, unknown>): string {
  const saved = String(order.supplierPlatformCode || '').trim()
  if (saved) return saved

  const supplierCode = String(order.supplierCode || '').trim()
  if (isPlatformPartnerCode(supplierCode)) return supplierCode

  const supplierName = String(order.supplier || '').trim()
  if (!supplierName) return ''

  const supplier = loadSupplierList().find(item => item.name === supplierName)
  if (!supplier) return ''

  const code = String(supplier.code || '').trim()
  return isPlatformPartnerCode(code) ? code : ''
}

export function resolveCustomerPlatformCode(order: Record<string, unknown>): string {
  const saved = String(order.customerPlatformCode || '').trim()
  if (saved) return saved

  const customerCode = String(order.customerCode || '').trim()
  if (isPlatformPartnerCode(customerCode)) return customerCode

  const customerName = String(order.customer || '').trim()
  if (!customerName) return ''

  const customer = loadActiveCustomerList().find(item => item.name === customerName)
  if (!customer) return ''

  const code = String(customer.code || '').trim()
  return isPlatformPartnerCode(code) ? code : ''
}
