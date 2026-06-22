export interface PlatformFieldDef {
  id: string
  module: string
  fieldName: string
  fieldCode: string
  fieldType: string
  length: string
  isRequired: boolean
  isUnique: boolean
  defaultValue: string
  remark: string
  status: string
}

const CATALOG_STORAGE_KEY = 'platformFieldCatalog'

/** 平台「公司资料」模块扩展字段（与 companyConfig / 公司资料设定对齐） */
export const COMPANY_PLATFORM_FIELD_DEFS: PlatformFieldDef[] = [
  { id: '104', module: 'company', fieldName: '公司名称', fieldCode: 'companyName', fieldType: 'string', length: '200', isRequired: true, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '105', module: 'company', fieldName: '统一社会信用代码', fieldCode: 'creditCode', fieldType: 'string', length: '18', isRequired: false, isUnique: true, defaultValue: '', remark: '', status: '正常' },
  { id: '106', module: 'company', fieldName: '公司编码', fieldCode: 'companyCode', fieldType: 'string', length: '50', isRequired: true, isUnique: true, defaultValue: '', remark: '', status: '正常' },
  { id: '107', module: 'company', fieldName: '公司地址', fieldCode: 'companyAddress', fieldType: 'string', length: '500', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '108', module: 'company', fieldName: '联系电话', fieldCode: 'companyPhone', fieldType: 'string', length: '50', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '109', module: 'company', fieldName: '传真', fieldCode: 'fax', fieldType: 'string', length: '50', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '110', module: 'company', fieldName: '邮箱', fieldCode: 'email', fieldType: 'string', length: '100', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '111', module: 'company', fieldName: '网址', fieldCode: 'website', fieldType: 'string', length: '200', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '112', module: 'company', fieldName: '营业执照号', fieldCode: 'businessLicense', fieldType: 'string', length: '50', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '113', module: 'company', fieldName: 'GSP证书编号', fieldCode: 'gspCertificate', fieldType: 'string', length: '50', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '114', module: 'company', fieldName: '医疗器械许可证', fieldCode: 'medicalDeviceLicense', fieldType: 'string', length: '50', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '115', module: 'company', fieldName: '开户行', fieldCode: 'bankName', fieldType: 'string', length: '200', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '116', module: 'company', fieldName: '银行账号', fieldCode: 'bankAccount', fieldType: 'string', length: '50', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '117', module: 'company', fieldName: '公司类型', fieldCode: 'companyType', fieldType: 'select', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '生产企业/经营公司等', status: '正常' },
  { id: '118', module: 'company', fieldName: '法人代表', fieldCode: 'legalPerson', fieldType: 'string', length: '50', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '119', module: 'company', fieldName: '状态', fieldCode: 'status', fieldType: 'select', length: '', isRequired: false, isUnique: false, defaultValue: '启用', remark: '', status: '正常' }
]

export const mergeCompanyPlatformFields = (catalog: PlatformFieldDef[]): PlatformFieldDef[] => {
  const next = [...catalog]
  let changed = false
  COMPANY_PLATFORM_FIELD_DEFS.forEach(def => {
    const idx = next.findIndex(item => item.module === 'company' && item.fieldCode === def.fieldCode)
    if (idx >= 0) {
      next[idx] = { ...next[idx], ...def, id: next[idx].id || def.id }
    } else {
      next.push({ ...def })
      changed = true
    }
  })
  if (changed) next.sort((a, b) => a.id.localeCompare(b.id))
  return next
}

export const loadPlatformFieldCatalog = (fallback: PlatformFieldDef[]): PlatformFieldDef[] => {
  const stored = localStorage.getItem(CATALOG_STORAGE_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as PlatformFieldDef[]
      if (Array.isArray(parsed) && parsed.length) {
        return mergeCompanyPlatformFields(parsed)
      }
    } catch {
      // ignore malformed cache
    }
  }
  return mergeCompanyPlatformFields(fallback)
}

export const savePlatformFieldCatalog = (catalog: PlatformFieldDef[]): void => {
  localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalog))
}

export const getPlatformFieldsByModule = (
  catalog: PlatformFieldDef[],
  module: string
): PlatformFieldDef[] =>
  catalog.filter(item => item.module === module && item.status !== '停用')

export const getActiveCompanyPlatformFields = (catalog: PlatformFieldDef[]): PlatformFieldDef[] =>
  getPlatformFieldsByModule(catalog, 'company')
