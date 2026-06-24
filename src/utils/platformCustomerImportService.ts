import { normalizePartnerDocuments } from '@/utils/partnerLicenseDocuments'
import type { CustomerDocument } from '@/utils/customerStore'
import {
  getCompanyTypeLabel,
  loadPlatformCustomerList,
  type PlatformCustomer
} from '@/utils/platformCustomerStore'

export type PlatformCustomerCatalogSearchForm = {
  keyword: string
  companyType: string
}

export function mapPlatformCompanyTypeToCustomerType(companyType: string): string {
  if (companyType === 'hospital') return 'hospital'
  if (companyType === 'manufacturer' || companyType === 'distributor') return 'deviceCompany'
  return 'other'
}

export function loadImportablePlatformCustomers(): PlatformCustomer[] {
  return loadPlatformCustomerList().filter(
    item => item.platformStatus === 'platformAudited' && item.status !== 'disabled'
  )
}

export function filterPlatformCustomersForImport(
  list: PlatformCustomer[],
  search: PlatformCustomerCatalogSearchForm
): PlatformCustomer[] {
  const keyword = search.keyword.trim().toLowerCase()
  return list.filter(item => {
    if (search.companyType && item.companyType !== search.companyType) return false
    if (!keyword) return true
    const haystack = [
      item.companyCode,
      item.companyName,
      item.companyShortName,
      item.pinyin,
      item.contact,
      item.phone,
      item.province,
      item.city
    ]
      .map(value => String(value || '').toLowerCase())
      .join(' ')
    return haystack.includes(keyword)
  })
}

export function applyPlatformCustomerToCustomerForm(
  form: Record<string, unknown>,
  customer: PlatformCustomer,
  setDocuments: (docs: CustomerDocument[]) => void
) {
  const customerType = mapPlatformCompanyTypeToCustomerType(customer.companyType)

  if (customer.companyCode) {
    form.id = customer.companyCode
  }
  form.platformCustomerId = customer.id
  form.name = customer.companyName
  form.shortName = customer.companyShortName || customer.companyName.slice(0, 6)
  form.pinyin = customer.pinyin || ''
  form.type = customerType
  form.taxRate = Number(customer.taxRate) || 0
  form.creditCode = customer.license || customer.taxId || ''
  form.taxNo = customer.taxId || customer.license || ''
  form.bankName = customer.bank || ''
  form.bankBranchNo = customer.bankBranchNo || ''
  form.bankAccount = customer.bankAccount || ''
  form.country = customer.country || '中国'
  form.province = customer.province || ''
  form.city = customer.city || ''
  form.district = customer.district || ''
  form.address = customer.address || ''
  form.postalCode = customer.postalCode || ''
  form.platformUser = customer.platformUser || '否'
  form.settlementPeriod = Number(customer.settlementPeriod) || 0
  form.contact = customer.contact || ''
  form.mobile = customer.mobile || ''
  form.email = customer.email || ''
  form.phone = customer.phone || customer.mobile || ''
  form.enterpriseLeader = customer.enterpriseLeader || customer.legalPerson || ''
  form.idCard = customer.idCard || ''
  form.leaderPhone = customer.leaderPhone || ''
  form.website = customer.website || ''
  form.companyIntro = customer.companyIntro || ''
  form.legalPerson = customer.legalPerson || customer.enterpriseLeader || ''
  form.registerCapital = customer.registerCapital || ''
  form.businessScope = customer.businessScope || ''
  form.establishDate = customer.establishDate || ''
  form.recordStatus = customer.recordStatus || '否'
  form.recordDate = customer.recordDate || ''
  form.license = customer.license || ''
  form.licenseExpire = customer.licenseExpire || ''
  form.remark = customer.remark || ''
  form.remark2 = customer.remark2 || ''
  form.remark3 = customer.remark3 || ''
  form.remark4 = customer.remark4 || ''
  form.remark5 = customer.remark5 || ''

  setDocuments(
    normalizePartnerDocuments(customer.documents || [], customerType).map(doc => ({ ...doc }))
  )
}

export function getPlatformCustomerImportLabel(customer: PlatformCustomer): string {
  const typeLabel = getCompanyTypeLabel(customer.companyType)
  return `${customer.companyName}${typeLabel ? `（${typeLabel}）` : ''}${customer.companyCode ? ` · ${customer.companyCode}` : ''}`
}
