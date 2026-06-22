import type { PlatformFieldDef } from '@/utils/platformFieldStore'
import {
  createEmptyCompanyForm,
  getCompanyTypeOptions,
  getTenantEditableFieldDefs,
  isFullWidthField,
  syncCompanyFieldFormatFromPlatform
} from '@/utils/companyDataService'
import type { SupplierMaster } from '@/utils/supplierStore'
import { mapSupplierTypeToPlatformCompanyType } from '@/utils/partnerPlatformSync'

/** 平台公司资料字段 → 供应商表单属性（与公司资料设定 COMPANY_FIELD_PROP_MAP 对齐） */
export const SUPPLIER_FIELD_PROP_MAP: Record<string, string> = {
  companyCode: 'id',
  companyName: 'name',
  creditCode: 'creditCode',
  companyAddress: 'address',
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
  status: 'companyStatus'
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
    type: empty.companyType,
    creditCode: empty.taxNo,
    address: empty.address,
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
    id: supplier.id,
    name: supplier.name,
    type: mapSupplierTypeToPlatformCompanyType(supplier.type),
    creditCode: supplier.creditCode || supplier.taxNo || '',
    address: supplier.address || '',
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
  return fieldCode === 'companyCode'
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
