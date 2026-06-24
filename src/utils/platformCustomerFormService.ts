import type { PlatformFieldDef } from '@/utils/platformFieldStore'
import {
  createEmptyCompanyForm,
  getCompanyTypeOptions,
  getTenantEditableFieldDefs,
  isFullWidthField,
  syncCompanyFieldFormatFromPlatform
} from '@/utils/companyDataService'
import {
  getCompanyCategory,
  type PlatformCustomer
} from '@/utils/platformCustomerStore'
import { isPlatformPartnerCode } from '@/utils/partnerPlatformCode'

/** 平台公司资料字段 → 平台客户表单属性（与公司资料设定对齐） */
export const PLATFORM_CUSTOMER_FIELD_PROP_MAP: Record<string, string> = {
  companyCode: 'companyCode',
  companyName: 'companyName',
  creditCode: 'taxId',
  companyAddress: 'address',
  companyPhone: 'phone',
  fax: 'fax',
  email: 'email',
  website: 'website',
  businessLicense: 'license',
  gspCertificate: 'gspCertificate',
  medicalDeviceLicense: 'medicalDeviceLicense',
  bankName: 'bank',
  bankAccount: 'bankAccount',
  companyType: 'companyType',
  legalPerson: 'legalPerson',
  status: 'companyStatus'
}

export function getPlatformCustomerFormKey(fieldCode: string): string {
  return PLATFORM_CUSTOMER_FIELD_PROP_MAP[fieldCode] || fieldCode
}

export function companyStatusToPlatformCustomerStatus(status: unknown): PlatformCustomer['status'] {
  return status === '停用' ? 'disabled' : 'normal'
}

export function platformCustomerStatusToCompanyStatus(status: unknown): string {
  return status === 'disabled' ? '停用' : '启用'
}

/** 与公司资料设定 createEmptyCompanyForm 对齐的空模板 */
export function createEmptyPlatformCustomerForm(): Record<string, unknown> {
  const empty = createEmptyCompanyForm()
  return {
    companyCode: '',
    companyName: empty.name,
    companyShortName: '',
    companyType: empty.companyType,
    companyCategory: '',
    pinyin: '',
    taxRate: 0,
    taxId: empty.taxNo,
    address: empty.address,
    phone: empty.phone,
    fax: empty.fax,
    email: empty.email,
    website: empty.website,
    license: empty.businessLicense,
    gspCertificate: empty.gspCertificate,
    medicalDeviceLicense: empty.medicalDeviceLicense,
    bank: empty.bankName,
    bankAccount: empty.bankAccount,
    legalPerson: empty.legalPerson,
    companyStatus: empty.status,
    companyIntro: empty.companyIntro,
    platformUser: empty.platformUser,
    settlementPeriod: empty.settlementPeriod,
    recordStatus: empty.recordStatus,
    recordDate: empty.recordDate,
    remark: '',
    remark2: empty.remark2,
    remark3: empty.remark3,
    remark4: empty.remark4,
    remark5: empty.remark5,
    contact: '',
    mobile: '',
    country: '中国',
    province: '',
    city: '',
    district: '',
    postalCode: '',
    businessScope: '',
    registerCapital: '',
    establishDate: '',
    licenseExpire: '',
    bankBranchNo: '',
    enterpriseLeader: '',
    idCard: '',
    leaderPhone: '',
    platformStatus: 'platformNotAudited',
    customFields: {} as Record<string, string>
  }
}

export function platformCustomerToForm(customer: PlatformCustomer): Record<string, unknown> {
  const base = createEmptyPlatformCustomerForm()
  return {
    ...base,
    companyCode: customer.companyCode,
    companyName: customer.companyName,
    companyShortName: customer.companyShortName || '',
    companyType: customer.companyType,
    companyCategory: customer.companyCategory || '',
    pinyin: customer.pinyin || '',
    taxRate: customer.taxRate ?? 0,
    taxId: customer.taxId || '',
    address: customer.address || '',
    phone: customer.phone || '',
    mobile: customer.mobile || '',
    fax: String(customer.fax || ''),
    email: customer.email || '',
    website: customer.website || '',
    license: customer.license || '',
    gspCertificate: String(customer.gspCertificate || ''),
    medicalDeviceLicense: String(customer.medicalDeviceLicense || ''),
    bank: customer.bank || '',
    bankAccount: customer.bankAccount || '',
    legalPerson: customer.legalPerson || customer.enterpriseLeader || '',
    companyStatus: platformCustomerStatusToCompanyStatus(customer.status),
    companyIntro: customer.companyIntro || '',
    platformUser: customer.platformUser || '否',
    settlementPeriod: customer.settlementPeriod ?? 0,
    recordStatus: customer.recordStatus || '否',
    recordDate: customer.recordDate || '',
    remark: customer.remark || '',
    remark2: customer.remark2 || '',
    remark3: customer.remark3 || '',
    remark4: customer.remark4 || '',
    remark5: customer.remark5 || '',
    contact: customer.contact || '',
    country: customer.country || '中国',
    province: customer.province || '',
    city: customer.city || '',
    district: customer.district || '',
    postalCode: customer.postalCode || '',
    businessScope: customer.businessScope || '',
    registerCapital: customer.registerCapital || '',
    establishDate: customer.establishDate || '',
    licenseExpire: customer.licenseExpire || '',
    bankBranchNo: customer.bankBranchNo || '',
    enterpriseLeader: customer.enterpriseLeader || customer.legalPerson || '',
    idCard: customer.idCard || '',
    leaderPhone: customer.leaderPhone || '',
    platformStatus: customer.platformStatus
  }
}

export function readPlatformCustomerFieldValue(
  form: Record<string, unknown>,
  fieldCode: string
): string {
  const key = getPlatformCustomerFormKey(fieldCode)
  const customFields = form.customFields as Record<string, string> | undefined
  return String(form[key] ?? customFields?.[fieldCode] ?? '')
}

export function validatePlatformCustomerByFieldDefs(
  form: Record<string, unknown>,
  fieldDefs: PlatformFieldDef[]
): string | null {
  for (const field of fieldDefs) {
    if (!field.isRequired) continue
    const value = readPlatformCustomerFieldValue(form, field.fieldCode).trim()
    if (!value) return `请填写${field.fieldName}`
  }
  return null
}

export function isPlatformCustomerReadOnlyField(fieldCode: string): boolean {
  return fieldCode === 'companyCode'
}

export function getPlatformCustomerFieldSelectOptions(field: PlatformFieldDef, includePlatformType = true) {
  if (field.fieldCode === 'companyType') return getCompanyTypeOptions(includePlatformType)
  if (field.fieldCode === 'status') {
    return [
      { label: '启用', value: '启用' },
      { label: '停用', value: '停用' }
    ]
  }
  return []
}

export function resolveCompanyCategory(form: Record<string, unknown>): string {
  const companyType = String(form.companyType || '')
  return String(form.companyCategory || getCompanyCategory(companyType))
}

export function buildPlatformCustomerFromForm(
  form: Record<string, unknown>,
  documents: PlatformCustomer['documents'],
  existing?: PlatformCustomer,
  meta?: { operator?: string; today?: string }
): PlatformCustomer {
  const today = meta?.today || new Date().toISOString().slice(0, 10)
  const operator = meta?.operator || '平台管理员'

  return {
    id: existing?.id ?? Date.now(),
    platformStatus: (form.platformStatus as PlatformCustomer['platformStatus']) || 'platformNotAudited',
    companyCode:
      existing?.companyCode && isPlatformPartnerCode(existing.companyCode)
        ? existing.companyCode
        : String(form.companyCode || '').trim(),
    companyName: String(form.companyName || '').trim(),
    companyShortName: String(form.companyShortName || '').trim(),
    companyType: String(form.companyType || ''),
    companyCategory: resolveCompanyCategory(form),
    pinyin: String(form.pinyin || '').trim(),
    taxRate: Number(form.taxRate) || 0,
    contact: String(form.contact || form.legalPerson || '').trim(),
    phone: String(form.phone || '').trim(),
    mobile: String(form.mobile || '').trim(),
    email: String(form.email || '').trim(),
    country: String(form.country || '中国').trim(),
    province: String(form.province || '').trim(),
    city: String(form.city || '').trim(),
    district: String(form.district || '').trim(),
    address: String(form.address || '').trim(),
    postalCode: String(form.postalCode || '').trim(),
    companyIntro: String(form.companyIntro || '').trim(),
    businessScope: String(form.businessScope || '').trim(),
    legalPerson: String(form.legalPerson || form.enterpriseLeader || '').trim(),
    registerCapital: String(form.registerCapital || '').trim(),
    establishDate: String(form.establishDate || ''),
    license: String(form.license || '').trim(),
    licenseExpire: String(form.licenseExpire || ''),
    taxId: String(form.taxId || '').trim(),
    bank: String(form.bank || '').trim(),
    bankBranchNo: String(form.bankBranchNo || '').trim(),
    bankAccount: String(form.bankAccount || '').trim(),
    settlementPeriod: Number(form.settlementPeriod) || 0,
    enterpriseLeader: String(form.enterpriseLeader || form.legalPerson || '').trim(),
    idCard: String(form.idCard || '').trim(),
    leaderPhone: String(form.leaderPhone || '').trim(),
    website: String(form.website || '').trim(),
    documents: documents.map(doc => ({ ...doc })),
    platformUser: String(form.platformUser || '否').trim() || '否',
    createDate: existing?.createDate || today,
    creator: existing?.creator || operator,
    editor: operator,
    editDate: today,
    remark: String(form.remark || '').trim(),
    remark2: String(form.remark2 || '').trim(),
    remark3: String(form.remark3 || '').trim(),
    remark4: String(form.remark4 || '').trim(),
    remark5: String(form.remark5 || '').trim(),
    status: companyStatusToPlatformCustomerStatus(form.companyStatus),
    recordStatus: String(form.recordStatus || '否'),
    recordDate:
      String(form.recordStatus || '') === '是'
        ? String(form.recordDate || today)
        : ''
  }
}

export {
  getTenantEditableFieldDefs,
  isFullWidthField,
  syncCompanyFieldFormatFromPlatform
}
