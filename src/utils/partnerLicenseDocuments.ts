import { getEffectiveLicenseSections, buildPartnerLicenseTemplateMap, isCustomLicenseKey } from '@/utils/partnerLicenseSettings'
import type { LicenseTemplate } from '@/constants/partnerLicenseSections'
import { migrateLegacyLicenseSectionCode, PARTNER_LICENSE_SECTIONS } from '@/constants/partnerLicenseSections'
import {
  filterLicenseSectionsByProfile,
  type PartnerQualificationProfile,
  resolvePartnerQualificationProfile
} from '@/constants/partnerCompanyQualification'
import {
  getDaysUntilExpire,
  getPartnerLicenseWarningMonths,
  getWarningDeadlineDate
} from '@/utils/partnerLicenseWarning'
import type { PartnerDocument } from '@/types/partnerProfile'

export type LicenseImageOrientation = 'horizontal' | 'vertical'

/** 允许重复添加的产品证照（按产品/品种各一份） */
export const REPEATABLE_PRODUCT_LICENSE_KEYS = new Set([
  'md_class1_product_filing',
  'md_class2_registration_cert',
  'md_class3_registration_cert',
  'disinfection_safety_report_class1',
  'disinfection_safety_report_class2'
])

export function isProductLicenseDuplicateKey(docKey?: string): boolean {
  return !!docKey && docKey.startsWith('product_')
}

export function resolvePartnerDocTemplateKey(doc: PartnerDocument): string {
  if (doc.templateKey) return doc.templateKey
  if (doc.docKey && isProductLicenseDuplicateKey(doc.docKey)) {
    const body = doc.docKey.slice('product_'.length)
    const match = body.match(/^(.+)_\d+_[a-z0-9]+$/)
    return match?.[1] || body
  }
  return doc.docKey || ''
}

export function isRepeatableProductLicense(templateKey?: string): boolean {
  return !!templateKey && REPEATABLE_PRODUCT_LICENSE_KEYS.has(templateKey)
}

export function getLicenseVisibilityKey(doc: PartnerDocument): string {
  return doc.templateKey || doc.docKey || ''
}

export function hasLicenseTemplateInstance(
  documents: PartnerDocument[],
  templateKey: string
): boolean {
  return documents.some(doc => resolvePartnerDocTemplateKey(doc) === templateKey)
}

export function canAddLicenseInstance(
  documents: PartnerDocument[],
  templateKey: string
): boolean {
  if (isRepeatableProductLicense(templateKey)) return true
  return !hasLicenseTemplateInstance(documents, templateKey)
}

export function getDocumentsForTemplateItem(
  documents: PartnerDocument[],
  templateKey: string
): PartnerDocument[] {
  return documents
    .filter(doc => resolvePartnerDocTemplateKey(doc) === templateKey)
    .sort((a, b) => {
      if (a.docKey === templateKey) return -1
      if (b.docKey === templateKey) return 1
      return String(a.docKey).localeCompare(String(b.docKey))
    })
}

export function buildLicenseSectionDocumentRows(
  section: { code: string; items: { key: string }[] },
  documents: PartnerDocument[]
): PartnerDocument[] {
  const rows: PartnerDocument[] = []
  const used = new Set<string>()

  section.items.forEach(item => {
    getDocumentsForTemplateItem(documents, item.key).forEach(doc => {
      const key = doc.docKey || String(doc.id)
      if (used.has(key)) return
      used.add(key)
      rows.push(doc)
    })
  })

  documents
    .filter(doc => (doc.sectionCode || '1') === section.code)
    .forEach(doc => {
      const key = doc.docKey || String(doc.id)
      if (used.has(key)) return
      const templateKey = resolvePartnerDocTemplateKey(doc)
      if (section.items.some(item => item.key === templateKey)) return
      used.add(key)
      rows.push(doc)
    })

  return rows
}

export function createProductLicenseDuplicate(
  source: PartnerDocument,
  sectionTitle?: string
): PartnerDocument {
  const templateKey = resolvePartnerDocTemplateKey(source)
  const template = templateKey ? buildPartnerLicenseTemplateMap().get(templateKey) : undefined
  const docKey = `product_${templateKey}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  return {
    id: nextDocId(),
    docKey,
    templateKey,
    docName: template?.docName || source.docName,
    docNameSub: template?.docNameSub || source.docNameSub,
    docNo: '',
    issueDate: '',
    expireDate: '',
    status: '有效',
    validityNote: template?.validityNote || source.validityNote,
    longTerm: template?.longTerm === true || source.longTerm === true,
    sectionCode: source.sectionCode,
    sectionTitle: sectionTitle || source.sectionTitle,
    docNoLabel: template?.docNoLabel || source.docNoLabel || '证照编号',
    imageUrl: '',
    imageOrientation: getDefaultLicenseImageOrientation(templateKey, source.docName)
  }
}

/** 默认横放证照（营业执照、开户许可证等宽幅证件） */
const DEFAULT_HORIZONTAL_LICENSE_KEYS = new Set(['business_license', 'bank_account_license'])

export function getDefaultLicenseImageOrientation(
  docKey?: string,
  docName?: string
): LicenseImageOrientation {
  if (docKey && DEFAULT_HORIZONTAL_LICENSE_KEYS.has(docKey)) return 'horizontal'
  const name = docName?.trim() || ''
  if (name === '营业执照' || name === '银行开户许可证' || name === '开户许可证') return 'horizontal'
  return 'vertical'
}

export function resolveLicenseImageOrientation(doc: PartnerDocument): LicenseImageOrientation {
  if (doc.imageOrientation === 'horizontal' || doc.imageOrientation === 'vertical') {
    return doc.imageOrientation
  }
  return getDefaultLicenseImageOrientation(doc.templateKey || doc.docKey, doc.docName)
}

let docIdSeed = Date.now()

function nextDocId(): number {
  docIdSeed += 1
  return docIdSeed
}

export function getPartnerDocFullName(doc: { docName: string; docNameSub?: string }): string {
  return doc.docNameSub ? `${doc.docName}${doc.docNameSub}` : doc.docName
}

export function createPartnerDocumentFromTemplate(
  item: LicenseTemplate,
  sectionCode: string,
  sectionTitle: string
): PartnerDocument {
  return {
    id: nextDocId(),
    docKey: item.key,
    docName: item.docName,
    docNameSub: item.docNameSub,
    docNo: '',
    issueDate: '',
    expireDate: '',
    status: '有效',
    validityNote: item.validityNote,
    longTerm: item.longTerm === true,
    sectionCode,
    sectionTitle,
    docNoLabel: item.docNoLabel,
    imageUrl: '',
    imageOrientation: getDefaultLicenseImageOrientation(item.key, item.docName)
  }
}

export function createDefaultPartnerDocuments(profile: PartnerQualificationProfile = 'other'): PartnerDocument[] {
  return filterLicenseSectionsByProfile(getEffectiveLicenseSections(), profile).flatMap(section =>
    section.items.map(item => createPartnerDocumentFromTemplate(item, section.code, section.title))
  )
}

const LEGACY_DOC_KEY_ALIASES: Record<string, string> = {
  md_registration_cert: 'md_class2_registration_cert',
  disinfection_safety_report: 'disinfection_safety_report_class1'
}

const LEGACY_DOC_NAME_TO_KEY: Record<string, string> = {
  营业执照: 'business_license',
  银行开户许可证: 'bank_account_license',
  医疗器械生产许可证: 'md_production_license',
  第一类医疗器械生产备案凭证: 'md_class1_production_filing',
  医疗器械注册证: 'md_class2_registration_cert',
  第二类医疗器械注册证: 'md_class2_registration_cert',
  第三类医疗器械注册证: 'md_class3_registration_cert',
  第一类医疗器械产品备案凭证: 'md_class1_product_filing',
  第二类医疗器械经营备案凭证: 'md_class2_business_filing',
  医疗器械经营备案凭证: 'md_class2_business_filing',
  '消毒产品生产企业卫生许可证（卫消证字）': 'disinfection_health_license',
  消毒产品生产企业卫生许可证: 'disinfection_health_license',
  消毒产品卫生安全评价报告: 'disinfection_safety_report_class1',
  '消毒产品卫生安全评价报告（消字号产品备案）': 'disinfection_safety_report_class1',
  '消毒产品卫生安全评价报告（一类消毒产品）': 'disinfection_safety_report_class1',
  '消毒产品卫生安全评价报告（二类消毒产品）': 'disinfection_safety_report_class2',
  医疗器械经营许可证: 'md_business_license',
  '法人/质量负责人/检验人员健康证': 'staff_health_cert',
  '厂房洁净度/水质检测报告': 'cleanroom_water_report',
  设备计量校准证书: 'equipment_calibration_cert',
  'ISO13485 医疗器械体系认证': 'iso13485_cert',
  'ISO9001 质量管理体系认证': 'iso9001_cert',
  医疗机构执业许可证: 'medical_institution_practice_license',
  事业单位法人证书: 'institution_legal_person_cert',
  采购授权书: 'purchase_authorization',
  收货授权书: 'receiving_authorization'
}

function normalizeDocKey(key: string): string {
  return LEGACY_DOC_KEY_ALIASES[key] || key
}

function resolveDocKey(doc: PartnerDocument): string | undefined {
  if (doc.docKey) return normalizeDocKey(doc.docKey)
  const name = String(doc.docName || '').trim()
  if (!name) return undefined
  if (LEGACY_DOC_NAME_TO_KEY[name]) return normalizeDocKey(LEGACY_DOC_NAME_TO_KEY[name])
  const fuzzy = Object.entries(LEGACY_DOC_NAME_TO_KEY).find(([label]) => name.includes(label))
  return fuzzy ? normalizeDocKey(fuzzy[1]) : undefined
}

function migratePartnerDocumentSection(doc: PartnerDocument): PartnerDocument {
  const docKey = resolveDocKey(doc)
  const sectionCode = migrateLegacyLicenseSectionCode(doc.sectionCode, docKey)
  if (sectionCode === doc.sectionCode) return doc
  const section = PARTNER_LICENSE_SECTIONS.find(item => item.code === sectionCode)
  return {
    ...doc,
    sectionCode,
    sectionTitle: section?.title || doc.sectionTitle
  }
}

/** 将历史证照数据对齐到分段模板，并按企业性质保留对应资质 */
export function normalizePartnerDocuments(
  stored?: PartnerDocument[],
  companyType?: string
): PartnerDocument[] {
  const profile = resolvePartnerQualificationProfile(companyType)
  const defaults = createDefaultPartnerDocuments(profile)
  if (!stored?.length) return defaults

  const storedByKey = new Map<string, PartnerDocument>()
  stored.forEach(doc => {
    if (isProductLicenseDuplicateKey(doc.docKey)) return
    const key = resolveDocKey(doc)
    if (key && !storedByKey.has(key)) {
      storedByKey.set(key, doc)
    }
  })

  const merged = defaults.map(item => {
    const matched = storedByKey.get(item.docKey!)
    if (!matched) return item
    return {
      ...item,
      ...matched,
      id: matched.id || item.id,
      docKey: item.docKey,
      docName: item.docName,
      docNameSub: item.docNameSub,
      validityNote: item.validityNote,
      longTerm: item.longTerm,
      sectionCode: item.sectionCode,
      sectionTitle: item.sectionTitle,
      docNoLabel: item.docNoLabel || matched.docNoLabel,
      templateKey: matched.templateKey
    }
  })

  const mergedKeys = new Set(merged.map(doc => doc.docKey))
  const productInstances = stored
    .filter(doc => isProductLicenseDuplicateKey(doc.docKey) && !mergedKeys.has(doc.docKey))
    .map(doc => ({
      ...doc,
      templateKey: doc.templateKey || resolvePartnerDocTemplateKey(doc)
    }))

  return merged.concat(productInstances).concat(
    stored
      .map(doc => {
        const key = resolveDocKey(doc)
        return key ? { ...doc, docKey: key } : null
      })
      .filter((doc): doc is PartnerDocument => {
        if (!doc?.docKey) return false
        return isCustomLicenseKey(doc.docKey) && !defaults.some(item => item.docKey === doc.docKey)
      })
  ).map(migratePartnerDocumentSection)
}

export function getDocumentsBySection(
  documents: PartnerDocument[],
  sectionCode: string
): PartnerDocument[] {
  const section = getEffectiveLicenseSections().find(item => item.code === sectionCode)
  if (!section) return []
  const keys = section.items.map(item => item.key)
  return documents.filter(doc => {
    const templateKey = resolvePartnerDocTemplateKey(doc)
    const docSectionCode = migrateLegacyLicenseSectionCode(doc.sectionCode, templateKey)
    return keys.includes(templateKey) && docSectionCode === sectionCode
  })
}

export function isLongTermDocument(doc: PartnerDocument): boolean {
  if (doc.longTerm) return true
  const templateKey = resolvePartnerDocTemplateKey(doc)
  const template = templateKey ? buildPartnerLicenseTemplateMap().get(templateKey) : undefined
  return template?.longTerm === true
}

export function evaluatePartnerDocumentStatus(
  doc: PartnerDocument,
  warningMonths = getPartnerLicenseWarningMonths()
): PartnerDocument['status'] {
  if (isLongTermDocument(doc)) return doc.status || '有效'
  if (!doc.expireDate) return doc.status || '有效'

  const daysLeft = getDaysUntilExpire(doc.expireDate)
  if (daysLeft === null) return doc.status || '有效'
  if (daysLeft < 0) return '已过期'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expire = new Date(doc.expireDate)
  expire.setHours(0, 0, 0, 0)
  const warningDeadline = getWarningDeadlineDate(warningMonths, today)
  if (expire.getTime() <= warningDeadline.getTime()) return '即将到期'
  return '有效'
}

export function syncPartnerDocumentStatus(
  documents: PartnerDocument[],
  warningMonths = getPartnerLicenseWarningMonths()
): PartnerDocument[] {
  return documents.map(doc => {
    if (isLongTermDocument(doc)) {
      return { ...doc, expireDate: '', status: doc.status || '有效' }
    }
    const status = evaluatePartnerDocumentStatus(doc, warningMonths)
    return { ...doc, status }
  })
}

export function findExpiredPartnerDocuments(
  documents: PartnerDocument[],
  warningMonths = getPartnerLicenseWarningMonths()
): PartnerDocument[] {
  return syncPartnerDocumentStatus(documents, warningMonths).filter(
    doc => !isLongTermDocument(doc) && doc.status === '已过期'
  )
}

export function findWarningPartnerDocuments(
  documents: PartnerDocument[],
  warningMonths = getPartnerLicenseWarningMonths()
): PartnerDocument[] {
  return syncPartnerDocumentStatus(documents, warningMonths).filter(
    doc => !isLongTermDocument(doc) && doc.status === '即将到期'
  )
}

export function getPartnerDocumentDaysLeft(doc: PartnerDocument): number | null {
  if (isLongTermDocument(doc) || !doc.expireDate) return null
  return getDaysUntilExpire(doc.expireDate)
}
