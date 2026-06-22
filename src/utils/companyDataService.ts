import { getCompanyInfo, setCompanyInfo } from '@/utils/companyConfig'
import { companies, getCurrentCompany, type Company } from '@/utils/dataStore'
import {
  COMPANY_PLATFORM_FIELD_DEFS,
  getActiveCompanyPlatformFields,
  loadPlatformFieldCatalog,
  type PlatformFieldDef
} from '@/utils/platformFieldStore'
import { companyApi } from '@/utils/api'
import { applyPublicDisplayDefaults } from '@/utils/companyPublicDisplayService'

const COMPANY_FIELD_LAYOUT_KEY = 'companyFieldLayout'

const tenantProfileStorageKey = (companyId: number) => `tenantCompanyProfile_${companyId}`

/** 平台字段编码 → 公司资料属性 */
export const COMPANY_FIELD_PROP_MAP: Record<string, keyof Company> = {
  companyCode: 'code',
  companyName: 'name',
  creditCode: 'taxNo',
  companyAddress: 'address',
  companyPhone: 'phone',
  fax: 'fax',
  email: 'email',
  website: 'website',
  businessLicense: 'businessLicense',
  gspCertificate: 'gspCertificate',
  medicalDeviceLicense: 'medicalDeviceLicense',
  bankName: 'bankName',
  bankAccount: 'bankAccount',
  companyType: 'companyType',
  legalPerson: 'legalPerson',
  status: 'status'
}

export const companyTypeOptions = [
  { label: '生产企业', value: 'manufacturer' },
  { label: '经营公司', value: 'distributor' },
  { label: '医院', value: 'hospital' },
  { label: '科研机构', value: 'research' }
]

export const platformCompanyTypeOption = { label: '平台运营', value: 'platform' }

export const createEmptyCompanyForm = (): Omit<Company, 'id'> => ({
  code: '',
  name: '',
  companyType: '',
  address: '',
  phone: '',
  taxNo: '',
  status: '启用',
  fax: '',
  email: '',
  website: '',
  businessLicense: '',
  gspCertificate: '',
  medicalDeviceLicense: '',
  bankName: '',
  bankAccount: '',
  legalPerson: '',
  companyIntro: '',
  allowPublicDisplay: true,
  qualificationPublicMap: {},
  platformUser: '否',
  settlementPeriod: 0,
  recordStatus: '否',
  recordDate: '',
  remark2: '',
  remark3: '',
  remark4: '',
  remark5: '',
  customFields: {}
})

export const getLoggedInUserContext = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return {
      companyId: Number(user.companyId) || getCurrentCompany(),
      companyName: String(user.companyName || ''),
      companyCode: String(user.companyCode || ''),
      realName: String(user.realName || user.username || '')
    }
  } catch {
    return {
      companyId: getCurrentCompany(),
      companyName: '',
      companyCode: '',
      realName: ''
    }
  }
}

export const getCompanyFormKey = (fieldCode: string): string =>
  COMPANY_FIELD_PROP_MAP[fieldCode] || fieldCode

export const readCompanyFieldValue = (company: Company, fieldCode: string): string => {
  const prop = COMPANY_FIELD_PROP_MAP[fieldCode]
  if (prop) return String(company[prop] ?? '')
  return company.customFields?.[fieldCode] ?? ''
}

export const companyToFlatForm = (company: Company): Record<string, unknown> => ({
  ...company,
  ...(company.customFields || {}),
  qualificationPublicMap: company.qualificationPublicMap || {}
})

export const buildCompanyFromFlatForm = (
  form: Record<string, unknown>,
  fieldDefs: PlatformFieldDef[],
  companyId: number
): Company => {
  const result = createEmptyCompanyForm()
  const customFields: Record<string, string> = {}

  fieldDefs.forEach(field => {
    const key = getCompanyFormKey(field.fieldCode)
    const raw = form[key]
    const value = raw === undefined || raw === null ? '' : String(raw)
    const prop = COMPANY_FIELD_PROP_MAP[field.fieldCode]
    if (prop) {
      ;(result as Record<string, unknown>)[prop] = value
    } else {
      customFields[field.fieldCode] = value
    }
  })

  return {
    ...result,
    id: companyId,
    companyIntro: String(form.companyIntro ?? result.companyIntro ?? ''),
    allowPublicDisplay: form.allowPublicDisplay !== undefined ? Boolean(form.allowPublicDisplay) : true,
    qualificationPublicMap: (form.qualificationPublicMap as Record<string, boolean>) || {},
    customFields
  }
}

export const formatCompanyFieldDisplay = (company: Company, field: PlatformFieldDef): string => {
  const value = readCompanyFieldValue(company, field.fieldCode)
  if (!value) return '-'
  if (field.fieldCode === 'companyType') {
    return [...companyTypeOptions, platformCompanyTypeOption].find(item => item.value === value)?.label || value
  }
  return value
}

const readLocalTenantProfile = (companyId: number): Company | null => {
  const stored = localStorage.getItem(tenantProfileStorageKey(companyId))
  if (!stored) return null
  try {
    const parsed = JSON.parse(stored) as Company
    return { ...createEmptyCompanyForm(), ...parsed, id: companyId, customFields: parsed.customFields || {} }
  } catch {
    return null
  }
}

const writeLocalTenantProfile = (profile: Company): void => {
  localStorage.setItem(tenantProfileStorageKey(profile.id), JSON.stringify(profile))
  const idx = companies.value.findIndex(item => item.id === profile.id)
  if (idx >= 0) companies.value[idx] = profile
  else companies.value.push(profile)
}

const buildInitialTenantProfile = (companyId: number): Company => {
  const ctx = getLoggedInUserContext()
  const cached = readLocalTenantProfile(companyId)
  if (cached) return cached

  return {
    ...createEmptyCompanyForm(),
    id: companyId,
    code: ctx.companyCode || `C${companyId}`,
    name: ctx.companyName || '',
    status: '启用',
    customFields: {}
  }
}

export const mirrorTenantProfileToSystemConfig = (profile: Company): void => {
  setCompanyInfo({
    name: profile.name,
    address: profile.address,
    phone: profile.phone,
    fax: profile.fax || '',
    email: profile.email || '',
    website: profile.website || '',
    businessLicense: profile.businessLicense || '',
    gspCertificate: profile.gspCertificate || '',
    medicalDeviceLicense: profile.medicalDeviceLicense || '',
    bankName: profile.bankName || '',
    bankAccount: profile.bankAccount || '',
    taxNo: profile.taxNo || profile.businessLicense || getCompanyInfo().taxNo
  })
}

/** 加载当前租户（登录企业）的公司资料 */
export const loadTenantCompanyProfile = async (): Promise<Company> => {
  const companyId = getCurrentCompany()

  try {
    const apiProfile = await companyApi.getById(companyId)
    const merged = {
      ...buildInitialTenantProfile(companyId),
      ...apiProfile,
      id: companyId,
      customFields: apiProfile.customFields || readLocalTenantProfile(companyId)?.customFields || {}
    }
    writeLocalTenantProfile(merged)
    return applyPublicDisplayDefaults(merged)
  } catch {
    // fallback to tenant local cache
  }

  const local = readLocalTenantProfile(companyId)
  if (local) {
    return applyPublicDisplayDefaults(local)
  }

  return applyPublicDisplayDefaults(buildInitialTenantProfile(companyId))
}

/** 保存当前租户公司资料 */
export const saveTenantCompanyProfile = async (profile: Company): Promise<void> => {
  const companyId = getCurrentCompany()
  const payload = { ...profile, id: companyId, status: profile.status || '启用' }
  writeLocalTenantProfile(payload)
  mirrorTenantProfileToSystemConfig(payload)

  try {
    await companyApi.update(companyId, payload)
  } catch {
    // 本地已保存，后端不可用时仍可使用
  }
}

const readFieldLayoutCodes = (): string[] => {
  const stored = localStorage.getItem(COMPANY_FIELD_LAYOUT_KEY)
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const orderCompanyFields = (fields: PlatformFieldDef[], savedOrder: string[]): PlatformFieldDef[] => {
  if (!savedOrder.length) return fields
  const ordered = savedOrder
    .map(code => fields.find(item => item.fieldCode === code))
    .filter(Boolean) as PlatformFieldDef[]
  const missing = fields.filter(item => !savedOrder.includes(item.fieldCode))
  return [...ordered, ...missing]
}

export const getCompanyFormFieldDefs = (
  fallbackCatalog: PlatformFieldDef[] = COMPANY_PLATFORM_FIELD_DEFS
): PlatformFieldDef[] => {
  const catalog = loadPlatformFieldCatalog(fallbackCatalog)
  const fields = getActiveCompanyPlatformFields(catalog)
  return orderCompanyFields(fields, readFieldLayoutCodes())
}

/** 租户编辑页使用的字段（排除仅系统维护项） */
export const getTenantEditableFieldDefs = (
  fallbackCatalog: PlatformFieldDef[] = COMPANY_PLATFORM_FIELD_DEFS
): PlatformFieldDef[] =>
  getCompanyFormFieldDefs(fallbackCatalog).filter(field => !['status'].includes(field.fieldCode))

export type SyncCompanyFieldFormatResult = {
  fieldCount: number
  added: number
}

/** 从平台资料字段目录同步公司资料页面字段格式（不含业务数据） */
export const syncCompanyFieldFormatFromPlatform = (
  fallbackCatalog: PlatformFieldDef[] = COMPANY_PLATFORM_FIELD_DEFS
): SyncCompanyFieldFormatResult => {
  const catalog = loadPlatformFieldCatalog(fallbackCatalog)
  const fields = getActiveCompanyPlatformFields(catalog)
  const prev = readFieldLayoutCodes()
  const nextCodes = fields.map(item => item.fieldCode)
  localStorage.setItem(COMPANY_FIELD_LAYOUT_KEY, JSON.stringify(nextCodes))
  return {
    fieldCount: fields.length,
    added: nextCodes.filter(code => !prev.includes(code)).length
  }
}

export const validateCompanyByFieldDefs = (
  form: Record<string, unknown>,
  fieldDefs: PlatformFieldDef[]
): string | null => {
  for (const field of fieldDefs) {
    if (!field.isRequired) continue
    const key = getCompanyFormKey(field.fieldCode)
    const value = String(form[key] ?? '').trim()
    if (!value) return `请填写${field.fieldName}`
  }
  return null
}

export const isFullWidthField = (field: PlatformFieldDef): boolean =>
  field.fieldType === 'textarea' ||
  ['companyAddress', 'companyName'].includes(field.fieldCode)

export const isTenantReadOnlyField = (fieldCode: string): boolean =>
  fieldCode === 'companyCode' || fieldCode === 'status'

export const getCompanyTypeOptions = (includePlatform = false) =>
  includePlatform ? [...companyTypeOptions, platformCompanyTypeOption] : companyTypeOptions
