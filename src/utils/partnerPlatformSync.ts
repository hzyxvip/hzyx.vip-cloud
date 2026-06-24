import type { SupplierMaster } from '@/utils/supplierStore'
import { getCurrentUserName } from '@/utils/customerStore'
import { normalizePartnerDocuments } from '@/utils/partnerLicenseDocuments'
import {
  formatToday,
  getCompanyCategory,
  loadPlatformCustomerList,
  savePlatformCustomerList,
  type PlatformCustomer,
  type PlatformCustomerDocument
} from '@/utils/platformCustomerStore'
import { isPlatformPartnerCode } from '@/utils/partnerPlatformCode'

export function mapSupplierTypeToPlatformCompanyType(type: string): string {
  if (type === 'manufacturer' || type === 'distributor' || type === 'hospital') {
    return type
  }
  if (type === 'other') return 'distributor'
  return type || 'distributor'
}

function findPlatformCustomerIndex(
  list: PlatformCustomer[],
  supplier: Pick<SupplierMaster, 'id' | 'code' | 'name'> & { platformCustomerId?: unknown }
): number {
  const platformCustomerId = Number(supplier.platformCustomerId)
  if (Number.isFinite(platformCustomerId) && platformCustomerId > 0) {
    const byId = list.findIndex(item => item.id === platformCustomerId)
    if (byId >= 0) return byId
  }

  const code = String(supplier.code || supplier.id).trim()
  const name = supplier.name.trim()
  if (code) {
    const byCode = list.findIndex(item => item.companyCode === code)
    if (byCode >= 0) return byCode
  }
  if (name) {
    return list.findIndex(item => item.companyName.trim() === name)
  }
  return -1
}

/** 与平台「公司资料 / 客户资料增加」buildRecord 字段对齐的完整映射 */
export function buildPlatformCustomerFromSupplier(
  supplier: SupplierMaster,
  existing?: PlatformCustomer,
  options?: { operator?: string; today?: string }
): PlatformCustomer {
  const today = options?.today ?? formatToday()
  const operator = options?.operator ?? getCurrentUserName()
  const companyType = mapSupplierTypeToPlatformCompanyType(supplier.type)
  const companyCode =
    existing?.companyCode && isPlatformPartnerCode(existing.companyCode)
      ? existing.companyCode
      : String(supplier.code || supplier.id).trim()
  const documents = normalizePartnerDocuments(supplier.documents || [], companyType).map(
    (doc): PlatformCustomerDocument => ({ ...doc })
  )

  return {
    id: existing?.id ?? Date.now(),
    platformStatus: existing?.platformStatus ?? 'platformNotAudited',
    companyCode,
    companyName: supplier.name.trim(),
    companyShortName: String(supplier.shortName || supplier.name.slice(0, 6)).trim(),
    companyType,
    companyCategory: getCompanyCategory(companyType),
    pinyin: String(supplier.pinyin || '').trim(),
    taxRate: Number(supplier.taxRate) || 0,
    contact: String(supplier.contact || '').trim(),
    phone: String(supplier.phone || supplier.mobile || '').trim(),
    mobile: String(supplier.mobile || '').trim(),
    email: String(supplier.email || '').trim(),
    country: String(supplier.country || '中国').trim(),
    province: String(supplier.province || '').trim(),
    city: String(supplier.city || '').trim(),
    district: String(supplier.district || '').trim(),
    address: String(supplier.address || '').trim(),
    postalCode: String(supplier.postalCode || '').trim(),
    companyIntro: String(supplier.companyIntro || '').trim(),
    businessScope: String(supplier.businessScope || '').trim(),
    legalPerson: String(supplier.legalPerson || supplier.enterpriseLeader || '').trim(),
    registerCapital: String(supplier.registerCapital || '').trim(),
    establishDate: String(supplier.establishDate || ''),
    license: String(supplier.license || supplier.creditCode || '').trim(),
    licenseExpire: String(supplier.licenseExpire || ''),
    taxId: String(supplier.taxNo || supplier.creditCode || '').trim(),
    bank: String(supplier.bankName || '').trim(),
    bankBranchNo: String(supplier.bankBranchNo || '').trim(),
    bankAccount: String(supplier.bankAccount || '').trim(),
    settlementPeriod: Number(supplier.settlementPeriod) || 0,
    enterpriseLeader: String(supplier.enterpriseLeader || supplier.legalPerson || '').trim(),
    idCard: String(supplier.idCard || '').trim(),
    leaderPhone: String(supplier.leaderPhone || '').trim(),
    website: String(supplier.website || '').trim(),
    documents,
    platformUser: String(supplier.platformUser || '否').trim() || '否',
    createDate: existing?.createDate || supplier.createTime || today,
    creator: existing?.creator || supplier.creator || operator,
    editor: operator,
    editDate: today,
    remark: String(supplier.remark || '').trim(),
    remark2: String(supplier.remark2 || '').trim(),
    remark3: String(supplier.remark3 || '').trim(),
    remark4: String(supplier.remark4 || '').trim(),
    remark5: String(supplier.remark5 || '').trim(),
    status: supplier.status === 'disabled' ? 'disabled' : 'normal',
    recordStatus: String(supplier.recordStatus || '否'),
    recordDate: supplier.recordStatus === '是' ? String(supplier.recordDate || today) : ''
  }
}

/** 租户供应商保存后同步至平台客户资料（按编号/名称匹配更新，不存在则新增） */
export function syncSupplierToPlatformCustomer(supplier: SupplierMaster): PlatformCustomer {
  const list = loadPlatformCustomerList()
  const index = findPlatformCustomerIndex(list, supplier)
  const existing = index >= 0 ? list[index] : undefined
  const record = buildPlatformCustomerFromSupplier(supplier, existing)

  if (index >= 0) {
    list[index] = record
  } else {
    list.unshift(record)
  }
  savePlatformCustomerList(list)
  return record
}
