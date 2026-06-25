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
import { sanitizeLicenseDocumentsForLocalStorage } from '@/utils/partnerLicenseUpload'
import { loadPlatformCustomerList } from '@/utils/platformCustomerStore'
import { resolvePartnerPlatformCodeByName } from '@/utils/orderListPartnerCodes'
import { isPlatformPartnerCode } from '@/utils/partnerPlatformCode'
import { TENANT_PLATFORM_CUSTOMER_SEED } from '@/constants/platformTenantCustomerSeed'
import { getAuthUser } from '@/utils/authSession'

const COMPANY_FIELD_LAYOUT_KEY = 'companyFieldLayout'

const tenantProfileStorageKey = (companyId: number) => `tenantCompanyProfile_${companyId}`

/** 超大缓存会在 JSON.parse 阶段卡死浏览器，先剥离内嵌图片再解析 */
const stripEmbeddedLicenseImages = (raw: string): string => {
  if (raw.length < 512 * 1024) return raw
  return raw
    .replace(/"imageOriginalUrl"\s*:\s*"data:image\/[^"]*"/gi, '"imageOriginalUrl":""')
    .replace(/"imageUrl"\s*:\s*"data:image\/[^"]*"/gi, '"imageUrl":""')
    .replace(/"imageSizeBytes"\s*:\s*\d+/g, '"imageSizeBytes":0')
}

/** 紧急修复：清除当前企业膨胀的证照缓存（控制台或技术支持可调用） */
export const repairTenantProfileStorage = (companyId: number | null = getCurrentCompany()): boolean => {
  if (!companyId) return false
  const key = tenantProfileStorageKey(companyId)
  const raw = localStorage.getItem(key)
  if (!raw) return false
  if (raw.length > 4 * 1024 * 1024) {
    localStorage.removeItem(key)
    return true
  }
  try {
    const cleaned = stripEmbeddedLicenseImages(raw)
    const parsed = JSON.parse(cleaned) as Company
    const merged = {
      ...createEmptyCompanyForm(),
      ...parsed,
      id: companyId,
      documents: parsed.documents?.length
        ? sanitizeLicenseDocumentsForLocalStorage(parsed.documents)
        : parsed.documents,
      customFields: parsed.customFields || {}
    }
    localStorage.setItem(key, JSON.stringify(merged))
    return true
  } catch {
    localStorage.removeItem(key)
    return true
  }
}

export const repairAllTenantProfileCaches = (): number => {
  let repaired = 0
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i)
    if (!key?.startsWith('tenantCompanyProfile_')) continue
    const companyId = Number(key.slice('tenantCompanyProfile_'.length))
    if (!Number.isFinite(companyId)) continue
    if (repairTenantProfileStorage(companyId)) repaired += 1
  }
  return repaired
}

const COMPANY_FIELD_PROP_MAP: Record<string, keyof Company> = {
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
  const user = getAuthUser<Record<string, unknown>>() || {}
  const companyId = Number(user.companyId) || getCurrentCompany()
  return {
    companyId: companyId && companyId > 0 ? companyId : null,
    companyName: String(user.companyName || ''),
    companyCode: String(user.companyCode || ''),
    realName: String(user.realName || user.username || '')
  }
}

/** 当前租户在平台客户库中的医享平台编号（YY） */
export const resolveTenantPlatformPartnerCode = (
  profile?: Pick<Company, 'name' | 'code'> | null
): string => {
  const ctx = getLoggedInUserContext()
  const name = String(profile?.name || ctx.companyName || '').trim()
  const tenantCode = String(profile?.code || ctx.companyCode || '').trim()
  const platformList = loadPlatformCustomerList()

  const seed = TENANT_PLATFORM_CUSTOMER_SEED.find(
    item => item.companyCode === tenantCode || item.companyName === name
  )
  if (seed) {
    const matched = platformList.find(item => item.id === seed.id)
    const code = String(matched?.companyCode || '').trim()
    if (isPlatformPartnerCode(code)) return code
  }

  const byName = platformList.find(item => item.companyName === name)
  const byNameCode = String(byName?.companyCode || '').trim()
  if (isPlatformPartnerCode(byNameCode)) return byNameCode

  const fallback = resolvePartnerPlatformCodeByName(name)
  return isPlatformPartnerCode(fallback) ? fallback : ''
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
  const key = tenantProfileStorageKey(companyId)
  const stored = localStorage.getItem(key)
  if (!stored) return null
  try {
    let raw = stored
    if (stored.length > 512 * 1024) {
      raw = stripEmbeddedLicenseImages(stored)
    }
    if (raw.length > 2 * 1024 * 1024) {
      console.warn('[company] tenant profile still oversized after strip, resetting cache')
      localStorage.removeItem(key)
      return null
    }
    const parsed = JSON.parse(raw) as Company
    const documents = parsed.documents?.length
      ? sanitizeLicenseDocumentsForLocalStorage(parsed.documents)
      : parsed.documents
    const merged = {
      ...createEmptyCompanyForm(),
      ...parsed,
      id: companyId,
      documents,
      customFields: parsed.customFields || {}
    }
    if (documents !== parsed.documents) {
      try {
        localStorage.setItem(tenantProfileStorageKey(companyId), JSON.stringify(merged))
      } catch {
        /* ignore rewrite failure */
      }
    }
    return merged
  } catch {
    return null
  }
}

const writeLocalTenantProfile = (profile: Company): void => {
  try {
    localStorage.setItem(tenantProfileStorageKey(profile.id), JSON.stringify(profile))
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error('本地存储空间不足，请清除部分证照图片或删除浏览器缓存后重试')
    }
    throw error
  }
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
  if (!companyId) {
    throw new Error('未登录或无法识别当前企业')
  }
  repairTenantProfileStorage(companyId)

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
  if (!companyId) {
    throw new Error('未登录或无法识别当前企业')
  }
  const sanitizedDocuments = profile.documents?.length
    ? sanitizeLicenseDocumentsForLocalStorage(profile.documents)
    : profile.documents
  const payload = {
    ...profile,
    id: companyId,
    status: profile.status || '启用',
    documents: sanitizedDocuments
  }
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
