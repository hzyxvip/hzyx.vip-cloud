import {
  filterLicenseSectionsByProfile,
  resolvePartnerQualificationProfile
} from '@/constants/partnerCompanyQualification'
import {
  type LicenseSection,
  PARTNER_LICENSE_SECTIONS
} from '@/constants/partnerLicenseSections'
import { getEffectiveLicenseSections } from '@/utils/partnerLicenseSettings'
import { normalizePartnerDocuments } from '@/utils/partnerLicenseDocuments'
import type { PartnerDocument } from '@/types/partnerProfile'
import type { LicenseVisibilityConfig } from '@/utils/partnerLicenseVisibility'

/** 租户企业证照规则说明（页面提示） */
export const TENANT_LICENSE_RULE_TIP =
  '添加后需经平台审核；审核通过后不可删除，如需修改须由平台反审核后方可操作。'

/** 租户新增证照确认文案 */
export const TENANT_LICENSE_ADD_CONFIRM =
  '添加后需提交平台审核。审核通过后该证照不可删除；如需修改，须联系平台反审核后方可操作。确定添加吗？'

/** 租户删除本企业新增证照确认文案 */
export const TENANT_LICENSE_DELETE_CONFIRM =
  '确定删除该证照吗？删除后不可恢复。审核通过后的证照不可删除，如需修改须联系平台反审核。'

/** 租户引用平台证照说明 */
export const TENANT_LICENSE_REFERENCE_TIP =
  '优先从平台已有证照项目中选择引用；引用后可在证照列表中上传填写，无需重复新建。'

export type TenantLicenseReferenceStatus = 'unreferenced' | 'hidden' | 'visible'

export interface TenantLicenseReferenceOption {
  key: string
  sectionCode: string
  sectionTitle: string
  docName: string
  docNameSub?: string
  status: TenantLicenseReferenceStatus
  selectable: boolean
}

export function getTenantLicenseReferenceStatusLabel(status: TenantLicenseReferenceStatus): string {
  if (status === 'visible') return '已展示'
  if (status === 'hidden') return '已隐匿'
  return '未引用'
}

/** 企业可引用的平台证照项目（按当前身份筛选） */
export function buildTenantLicenseReferenceOptions(
  companyType?: string,
  documents?: PartnerDocument[],
  visibility?: LicenseVisibilityConfig,
  sectionCode?: string
): TenantLicenseReferenceOption[] {
  const sections = buildTenantLicenseSettingsSections(companyType, documents)
  const scopedSections = sectionCode ? sections.filter(section => section.code === sectionCode) : sections
  const options: TenantLicenseReferenceOption[] = []

  scopedSections.forEach(section => {
    section.items.forEach(item => {
      if (isTenantLicenseKey(item.key)) return

      const doc = documents?.find(row => row.docKey === item.key)
      const sectionVisible = visibility?.sections[section.code] !== false
      const itemVisible = visibility?.items[item.key] !== false
      const visible = sectionVisible && itemVisible

      let status: TenantLicenseReferenceStatus = 'unreferenced'
      if (doc && visible) status = 'visible'
      else if (doc) status = 'hidden'

      options.push({
        key: item.key,
        sectionCode: section.code,
        sectionTitle: section.title,
        docName: item.docName,
        docNameSub: item.docNameSub,
        status,
        selectable: status !== 'visible'
      })
    })
  })

  return options
}

export function isTenantLicenseKey(key?: string): boolean {
  return !!key && key.startsWith('tenant_')
}

export function isTenantLicenseDeletable(docKey?: string): boolean {
  return isTenantLicenseKey(docKey)
}

/** 租户证照展示设置：仅包含当前企业身份可见分类，并合并本企业自定义证照 */
export function buildTenantLicenseSettingsSections(
  companyType?: string,
  documents?: PartnerDocument[]
): LicenseSection[] {
  const profile = resolvePartnerQualificationProfile(companyType)
  const filtered = filterLicenseSectionsByProfile(getEffectiveLicenseSections(), profile)
  if (!documents?.length) return filtered

  return filtered
    .map(section => {
      const templateKeys = new Set(section.items.map(item => item.key))
      const extraItems = documents
        .filter(doc => (doc.sectionCode || '1') === section.code && isTenantLicenseKey(doc.docKey))
        .filter(doc => !templateKeys.has(String(doc.docKey || '')))
        .map(doc => ({
          key: String(doc.docKey),
          docName: doc.docName,
          docNameSub: doc.docNameSub,
          validityNote: doc.validityNote || '',
          docNoLabel: doc.docNoLabel
        }))

      if (!extraItems.length) return section
      return { ...section, items: [...section.items, ...extraItems] }
    })
    .filter(section => section.items.length > 0)
}

export function applyTenantLicenseVisibilityScope(
  config: { sections: Record<string, boolean>; items: Record<string, boolean> },
  companyType?: string,
  documents?: PartnerDocument[],
  visible?: boolean
) {
  const sections = buildTenantLicenseSettingsSections(companyType, documents)
  const nextSections = { ...config.sections }
  const nextItems = { ...config.items }

  sections.forEach(section => {
    nextSections[section.code] = visible !== false
    section.items.forEach(item => {
      nextItems[item.key] = visible !== false
    })
  })

  return { sections: nextSections, items: nextItems }
}

/** 租户证照展示：仅保留当前企业身份范围内的显隐配置 */
export function createTenantLicenseVisibility(
  companyType?: string,
  documents?: PartnerDocument[],
  saved?: Partial<LicenseVisibilityConfig> | null
): LicenseVisibilityConfig {
  const sections = buildTenantLicenseSettingsSections(companyType, documents)
  const base: LicenseVisibilityConfig = { sections: {}, items: {} }

  sections.forEach(section => {
    base.sections[section.code] = saved?.sections?.[section.code] ?? true
    section.items.forEach(item => {
      base.items[item.key] = saved?.items?.[item.key] ?? true
    })
  })

  return base
}

export function createTenantLicenseDocument(input: {
  docName: string
  docNameSub?: string
  sectionCode: string
  docNoLabel?: string
  longTerm?: boolean
  validityNote?: string
}): PartnerDocument {
  const section = PARTNER_LICENSE_SECTIONS.find(item => item.code === input.sectionCode)
  const docName = input.docName.trim()
  if (!docName) {
    throw new Error('证照名称不能为空')
  }
  if (!section) {
    throw new Error('请选择所属分类')
  }

  return {
    id: Date.now(),
    docKey: `tenant_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    docName,
    docNameSub: input.docNameSub?.trim() || '',
    docNo: '',
    issueDate: '',
    expireDate: '',
    status: '有效',
    validityNote: input.longTerm ? '' : (input.validityNote?.trim() || ''),
    longTerm: input.longTerm === true,
    sectionCode: input.sectionCode,
    sectionTitle: section.title,
    docNoLabel: input.docNoLabel?.trim() || '证照编号',
    imageUrl: '',
    imageOrientation: 'vertical'
  }
}

/** 租户证照：默认套用平台模板布局，再合并本企业已填数据与自定义证照 */
export function normalizeTenantCompanyDocuments(
  stored?: PartnerDocument[],
  companyType?: string
): PartnerDocument[] {
  const merged = normalizePartnerDocuments(stored, companyType)
  const customDocs = (stored || []).filter(
    doc => isTenantLicenseKey(doc.docKey) && !merged.some(item => item.docKey === doc.docKey)
  )
  return [...merged, ...customDocs]
}

export function sortDocumentsInSection(
  documents: PartnerDocument[],
  sectionCode: string,
  order?: string[]
): PartnerDocument[] {
  const sectionDocs = documents.filter(doc => (doc.sectionCode || '1') === sectionCode)
  if (!order?.length) return sectionDocs

  const map = new Map(sectionDocs.map(doc => [String(doc.docKey || ''), doc]))
  const sorted: PartnerDocument[] = []
  order.forEach(key => {
    const doc = map.get(key)
    if (doc) {
      sorted.push(doc)
      map.delete(key)
    }
  })
  map.forEach(doc => sorted.push(doc))
  return sorted
}

export function reorderTenantSectionDocuments(
  documents: PartnerDocument[],
  sectionCode: string,
  orderedKeys: string[]
): PartnerDocument[] {
  const others = documents.filter(doc => (doc.sectionCode || '1') !== sectionCode)
  const reordered = sortDocumentsInSection(
    documents.filter(doc => (doc.sectionCode || '1') === sectionCode),
    sectionCode,
    orderedKeys
  )
  return [...others, ...reordered]
}

export function buildTenantLicenseSectionOrder(
  documents: PartnerDocument[]
): Record<string, string[]> {
  const order: Record<string, string[]> = {}
  documents.forEach(doc => {
    const code = doc.sectionCode || '1'
    const key = String(doc.docKey || '')
    if (!key) return
    if (!order[code]) order[code] = []
    order[code].push(key)
  })
  return order
}
