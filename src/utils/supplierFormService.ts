import type { PlatformFieldDef } from '@/utils/platformFieldStore'
import {
  createEmptyCompanyForm,
  getCompanyTypeOptions,
  getTenantEditableFieldDefs,
  isFullWidthField,
  syncCompanyFieldFormatFromPlatform
} from '@/utils/companyDataService'
import { loadPlatformCustomerList } from '@/utils/platformCustomerStore'
import type { SupplierMaster } from '@/utils/supplierStore'
import { mapSupplierTypeToPlatformCompanyType } from '@/utils/partnerPlatformSync'

/** 供应商资料区块字段顺序（仅展示以下项） */
export const SUPPLIER_PROFILE_FIELD_CODES = [
  'companyCode',
  'companyName',
  'shortName',
  'pinyin',
  'creditCode',
  'companyType',
  'onlineCustomer',
  'taxNo',
  'bankName',
  'bankAccount',
  'province',
  'city',
  'district',
  'address',
  'contact',
  'companyPhone',
  'email',
  'fax',
  'website',
  'legalPerson',
  'establishDate',
  'businessScope',
  'remark'
] as const

const createSupplierSyntheticField = (
  fieldCode: string,
  fieldName: string,
  fieldType = 'string',
  extra: Partial<PlatformFieldDef> = {}
): PlatformFieldDef => ({
  id: `sup-${fieldCode}`,
  module: 'company',
  fieldName,
  fieldCode,
  fieldType,
  length: extra.length ?? '',
  isRequired: false,
  isUnique: false,
  defaultValue: '',
  remark: '',
  status: '正常',
  ...extra
})

const SUPPLIER_SYNTHETIC_FIELD_DEFS: Record<string, PlatformFieldDef> = {
  shortName: createSupplierSyntheticField('shortName', '公司简称', 'string', { length: '100' }),
  pinyin: createSupplierSyntheticField('pinyin', '拼音缩写', 'string', { length: '50' }),
  taxNo: createSupplierSyntheticField('taxNo', '纳税人识别号', 'string', { length: '50' }),
  province: createSupplierSyntheticField('province', '省', 'string', { length: '50' }),
  city: createSupplierSyntheticField('city', '市', 'string', { length: '50' }),
  district: createSupplierSyntheticField('district', '区', 'string', { length: '50' }),
  address: createSupplierSyntheticField('address', '详细地址', 'string', { length: '500' }),
  contact: createSupplierSyntheticField('contact', '联系人', 'string', { length: '50' }),
  onlineCustomer: createSupplierSyntheticField('onlineCustomer', '线上客户', 'string', {
    remark: '系统自带'
  }),
  establishDate: createSupplierSyntheticField('establishDate', '成立日期', 'date'),
  businessScope: createSupplierSyntheticField('businessScope', '经营范围', 'textarea', { length: '2000' }),
  remark: createSupplierSyntheticField('remark', '备注', 'textarea', { length: '500' })
}

const SUPPLIER_FIELD_NAME_OVERRIDES: Partial<Record<string, string>> = {
  companyType: '客户类型',
  companyPhone: '电话',
  fax: '固定电话',
  website: '企业网址',
  legalPerson: '法人'
}

/** 平台公司资料字段 → 供应商表单属性（与公司资料设定 COMPANY_FIELD_PROP_MAP 对齐） */
export const SUPPLIER_FIELD_PROP_MAP: Record<string, string> = {
  companyCode: 'id',
  companyName: 'name',
  shortName: 'shortName',
  pinyin: 'pinyin',
  creditCode: 'creditCode',
  taxNo: 'taxNo',
  companyAddress: 'address',
  address: 'address',
  companyPhone: 'phone',
  fax: 'fax',
  email: 'email',
  website: 'website',
  businessLicense: 'license',
  gspCertificate: 'gspCertificate',
  medicalDeviceLicense: 'medicalDeviceLicense',
  bankName: 'bankName',
  bankAccount: 'bankAccount',
  companyType: 'type',
  legalPerson: 'legalPerson',
  province: 'province',
  city: 'city',
  district: 'district',
  establishDate: 'establishDate',
  businessScope: 'businessScope',
  remark: 'remark',
  status: 'companyStatus',
  contact: 'contact'
}

export function getSupplierFormKey(fieldCode: string): string {
  return SUPPLIER_FIELD_PROP_MAP[fieldCode] || fieldCode
}

export function companyStatusToSupplierStatus(status: unknown): 'normal' | 'disabled' {
  return status === '停用' ? 'disabled' : 'normal'
}

export function supplierStatusToCompanyStatus(status: unknown): string {
  return status === 'disabled' ? '停用' : '启用'
}

/** 与公司资料设定 createEmptyCompanyForm 对齐的空模板 */
export function createEmptySupplierForm(): Record<string, unknown> {
  const empty = createEmptyCompanyForm()
  return {
    id: '',
    name: empty.name,
    shortName: '',
    pinyin: '',
    type: empty.companyType,
    creditCode: empty.taxNo,
    taxNo: '',
    address: empty.address,
    province: '',
    city: '',
    district: '',
    phone: empty.phone,
    fax: empty.fax,
    email: empty.email,
    website: empty.website,
    license: empty.businessLicense,
    gspCertificate: empty.gspCertificate,
    medicalDeviceLicense: empty.medicalDeviceLicense,
    bankName: empty.bankName,
    bankAccount: empty.bankAccount,
    legalPerson: empty.legalPerson,
    establishDate: '',
    businessScope: '',
    remark: '',
    companyStatus: empty.status,
    companyIntro: empty.companyIntro,
    platformUser: empty.platformUser,
    settlementPeriod: empty.settlementPeriod,
    recordStatus: empty.recordStatus,
    recordDate: empty.recordDate,
    remark2: empty.remark2,
    remark3: empty.remark3,
    remark4: empty.remark4,
    remark5: empty.remark5,
    contact: '',
    auditStatus: 'notAudited',
    auditTime: '',
    auditor: '',
    customFields: {} as Record<string, string>
  }
}

export function supplierMasterToForm(supplier: SupplierMaster): Record<string, unknown> {
  const base = createEmptySupplierForm()
  return {
    ...base,
    id: supplier.code || supplier.id,
    platformCustomerId: supplier.platformCustomerId,
    name: supplier.name,
    shortName: supplier.shortName || '',
    pinyin: supplier.pinyin || '',
    type: mapSupplierTypeToPlatformCompanyType(supplier.type),
    creditCode: supplier.creditCode || '',
    taxNo: supplier.taxNo || supplier.creditCode || '',
    address: supplier.address || '',
    province: supplier.province || '',
    city: supplier.city || '',
    district: supplier.district || '',
    phone: supplier.phone || supplier.mobile || '',
    fax: String(supplier.fax || ''),
    email: supplier.email || '',
    website: supplier.website || '',
    license: supplier.license || supplier.creditCode || '',
    gspCertificate: String(supplier.gspCertificate || ''),
    medicalDeviceLicense: String(supplier.medicalDeviceLicense || ''),
    bankName: supplier.bankName || '',
    bankAccount: supplier.bankAccount || '',
    legalPerson: supplier.legalPerson || supplier.enterpriseLeader || '',
    establishDate: supplier.establishDate || '',
    businessScope: supplier.businessScope || '',
    remark: supplier.remark || '',
    companyStatus: supplierStatusToCompanyStatus(supplier.status),
    companyIntro: supplier.companyIntro || '',
    platformUser: supplier.platformUser || '否',
    settlementPeriod: supplier.settlementPeriod ?? 0,
    recordStatus: supplier.recordStatus || '否',
    recordDate: supplier.recordDate || '',
    remark2: supplier.remark2 || '',
    remark3: supplier.remark3 || '',
    remark4: supplier.remark4 || '',
    remark5: supplier.remark5 || '',
    contact: supplier.contact || '',
    auditStatus: supplier.auditStatus || 'notAudited',
    auditTime: supplier.auditTime || '',
    auditor: supplier.auditor || ''
  }
}

export function readSupplierFieldValue(form: Record<string, unknown>, fieldCode: string): string {
  const key = getSupplierFormKey(fieldCode)
  return String(form[key] ?? form.customFields?.[fieldCode as keyof typeof form.customFields] ?? '')
}

export function validateSupplierByFieldDefs(
  form: Record<string, unknown>,
  fieldDefs: PlatformFieldDef[]
): string | null {
  for (const field of fieldDefs) {
    if (!field.isRequired) continue
    const value = readSupplierFieldValue(form, field.fieldCode).trim()
    if (!value) return `请填写${field.fieldName}`
  }
  return null
}

export function isSupplierReadOnlyField(fieldCode: string): boolean {
  return fieldCode === 'onlineCustomer' || fieldCode === 'companyCode'
}

/** 无输入框、纯文本展示（公司编码单独处理为可编辑纯文本） */
export function isSupplierPlainDisplayField(fieldCode: string): boolean {
  return fieldCode === 'onlineCustomer'
}

export function isSupplierRegionField(fieldCode: string): boolean {
  return fieldCode === 'province' || fieldCode === 'city' || fieldCode === 'district'
}

/** 供应商资料：仅 textarea 占整行，其余三列排布 */
export function isSupplierProfileFullWidthField(field: PlatformFieldDef): boolean {
  return field.fieldType === 'textarea'
}

export function isSupplierOnlineCustomer(form: Record<string, unknown>): boolean {
  const platformUser = String(form.platformUser ?? '否').trim()
  if (platformUser && platformUser !== '否') return true
  if (String(form.recordStatus ?? '否').trim() === '是') return true
  const code = String(form.id ?? '').trim()
  if (!code) return false
  return loadPlatformCustomerList().some(item => item.companyCode === code)
}

export function getSupplierProfileFieldDefs(): PlatformFieldDef[] {
  const catalog = getTenantEditableFieldDefs()
  const byCode = new Map(catalog.map(field => [field.fieldCode, field]))

  return SUPPLIER_PROFILE_FIELD_CODES.map(code => {
    const synthetic = SUPPLIER_SYNTHETIC_FIELD_DEFS[code]
    if (synthetic) return synthetic
    const field = byCode.get(code)
    if (!field) return undefined
    const overrideName = SUPPLIER_FIELD_NAME_OVERRIDES[code]
    return overrideName ? { ...field, fieldName: overrideName } : field
  }).filter((field): field is PlatformFieldDef => Boolean(field))
}

export function getSupplierFieldSelectOptions(field: PlatformFieldDef) {
  if (field.fieldCode === 'companyType') return getCompanyTypeOptions(false)
  if (field.fieldCode === 'status') {
    return [
      { label: '启用', value: '启用' },
      { label: '停用', value: '停用' }
    ]
  }
  return []
}

export {
  getTenantEditableFieldDefs,
  isFullWidthField,
  syncCompanyFieldFormatFromPlatform
}
