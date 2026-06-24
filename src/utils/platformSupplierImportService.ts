import { normalizePartnerDocuments } from '@/utils/partnerLicenseDocuments'
import type { SupplierDocument } from '@/utils/supplierStore'
import type { PlatformCustomer } from '@/utils/platformCustomerStore'

export {
  filterPlatformCustomersForImport,
  loadImportablePlatformCustomers,
  type PlatformCustomerCatalogSearchForm
} from '@/utils/platformCustomerImportService'

/** 平台客户类型 → 供应商资料类型 */
export function mapPlatformCompanyTypeToSupplierType(companyType: string): string {
  if (companyType === 'manufacturer' || companyType === 'distributor' || companyType === 'hospital') {
    return companyType
  }
  if (companyType === 'clinic') return 'hospital'
  if (companyType === 'pharmacy' || companyType === 'deviceCompany') return 'distributor'
  return 'distributor'
}

export function applyPlatformCustomerToSupplierForm(
  form: Record<string, unknown>,
  customer: PlatformCustomer,
  setDocuments: (docs: SupplierDocument[]) => void
) {
  const companyType = mapPlatformCompanyTypeToSupplierType(String(customer.companyType || ''))

  form.platformCustomerId = customer.id
  if (customer.companyCode) {
    form.id = customer.companyCode
  }
  form.name = customer.companyName
  form.shortName = customer.companyShortName || customer.companyName.slice(0, 6)
  form.pinyin = customer.pinyin || ''
  form.type = companyType
  form.creditCode = customer.license || customer.taxId || ''
  form.taxNo = customer.taxId || customer.license || ''
  form.bankName = customer.bank || ''
  form.bankAccount = customer.bankAccount || ''
  form.province = customer.province || ''
  form.city = customer.city || ''
  form.district = customer.district || ''
  form.address = customer.address || ''
  form.platformUser = customer.platformUser || '否'
  form.settlementPeriod = Number(customer.settlementPeriod) || 0
  form.contact = customer.contact || ''
  form.email = customer.email || ''
  form.phone = customer.phone || customer.mobile || ''
  form.fax = ''
  form.website = customer.website || ''
  form.companyIntro = customer.companyIntro || ''
  form.legalPerson = customer.legalPerson || customer.enterpriseLeader || ''
  form.establishDate = customer.establishDate || ''
  form.businessScope = customer.businessScope || ''
  form.recordStatus = customer.recordStatus || '否'
  form.recordDate = customer.recordDate || ''
  form.remark = customer.remark || ''
  form.remark2 = customer.remark2 || ''
  form.remark3 = customer.remark3 || ''
  form.remark4 = customer.remark4 || ''
  form.remark5 = customer.remark5 || ''
  form.license = customer.license || ''

  setDocuments(
    normalizePartnerDocuments(customer.documents || [], companyType).map(doc => ({ ...doc }))
  )
}
