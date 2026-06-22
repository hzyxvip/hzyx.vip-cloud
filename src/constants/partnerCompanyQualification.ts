import type { LicenseSection } from '@/constants/partnerLicenseSections'

/** 资质性质：决定企业证照页展示哪些分类 */
export type PartnerQualificationProfile =
  | 'all'
  | 'manufacturer'
  | 'distributor'
  | 'hospital'
  | 'research'
  | 'other'

export const PARTNER_QUALIFICATION_PROFILE_LABELS: Record<PartnerQualificationProfile, string> = {
  all: '全部资质',
  manufacturer: '生产企业资质',
  distributor: '经营公司资质',
  hospital: '医院资质',
  research: '科研机构资质',
  other: '工商公示资质'
}

/** 平台企业：三方信息（界面显示全称） */
export const PLATFORM_TRIPARTITE_PROFILE_LABELS: Record<PartnerQualificationProfile, string> = {
  all: '全部',
  manufacturer: '生产企业',
  distributor: '经营公司',
  hospital: '医疗机构',
  research: '科研机构',
  other: '工商公示'
}

export const PLATFORM_TRIPARTITE_ITEMS = [
  { key: 'all' as PartnerQualificationProfile, label: '全部' },
  { key: 'manufacturer' as PartnerQualificationProfile, label: '生产企业' },
  { key: 'distributor' as PartnerQualificationProfile, label: '经营公司' },
  { key: 'hospital' as PartnerQualificationProfile, label: '医疗机构' }
]

export const PLATFORM_TRIPARTITE_SECTION_TITLES: Partial<Record<string, string>> = {
  '1': '工商公示证照',
  '2.1': '生产企业资质',
  '2.2': '经营流通资质',
  '2.3': '医疗机构资质'
}

/** 各性质可见的分段编号 */
export const PARTNER_QUALIFICATION_SECTION_MAP: Record<PartnerQualificationProfile, string[]> = {
  all: ['1', '2.1', '2.2', '2.3'],
  manufacturer: ['1', '2.1'],
  distributor: ['1', '2.2'],
  hospital: ['1', '2.3'],
  research: ['1'],
  other: ['1']
}

/** 分段 1 中按性质细分的证照 key；其余分段默认全显示 */
export const PARTNER_QUALIFICATION_COMMON_ITEM_MAP: Record<PartnerQualificationProfile, string[]> = {
  all: [
    'business_license',
    'bank_account_license',
    'staff_health_cert',
    'cleanroom_water_report',
    'equipment_calibration_cert',
    'iso13485_cert',
    'iso9001_cert'
  ],
  manufacturer: [
    'business_license',
    'bank_account_license',
    'staff_health_cert',
    'cleanroom_water_report',
    'equipment_calibration_cert',
    'iso13485_cert',
    'iso9001_cert'
  ],
  distributor: [
    'business_license',
    'bank_account_license',
    'staff_health_cert',
    'equipment_calibration_cert',
    'iso9001_cert'
  ],
  hospital: ['business_license', 'bank_account_license', 'staff_health_cert'],
  research: ['business_license', 'bank_account_license'],
  other: ['business_license', 'bank_account_license']
}

const COMPANY_TYPE_TO_PROFILE: Record<string, PartnerQualificationProfile> = {
  platform: 'other',
  all: 'all',
  manufacturer: 'manufacturer',
  distributor: 'distributor',
  hospital: 'hospital',
  clinic: 'hospital',
  pharmacy: 'distributor',
  deviceCompany: 'distributor',
  research: 'research',
  other: 'other'
}

export function resolvePartnerQualificationProfile(companyType?: string): PartnerQualificationProfile {
  if (!companyType) return 'other'
  return COMPANY_TYPE_TO_PROFILE[companyType] || 'other'
}

export function getPartnerQualificationProfileLabel(
  profile: PartnerQualificationProfile,
  variant: 'default' | 'platform' = 'default'
): string {
  if (variant === 'platform') {
    return PLATFORM_TRIPARTITE_PROFILE_LABELS[profile]
  }
  return PARTNER_QUALIFICATION_PROFILE_LABELS[profile]
}

export function getPlatformTripartiteSectionTitle(sectionCode: string, fallback: string): string {
  return PLATFORM_TRIPARTITE_SECTION_TITLES[sectionCode] || fallback
}

export function isLicenseSectionAllowedForProfile(
  sectionCode: string,
  profile: PartnerQualificationProfile
): boolean {
  return PARTNER_QUALIFICATION_SECTION_MAP[profile].includes(sectionCode)
}

export function isLicenseItemAllowedForProfile(
  itemKey: string,
  sectionCode: string,
  profile: PartnerQualificationProfile
): boolean {
  if (!isLicenseSectionAllowedForProfile(sectionCode, profile)) return false
  if (sectionCode === '1') {
    return PARTNER_QUALIFICATION_COMMON_ITEM_MAP[profile].includes(itemKey)
  }
  return true
}

export function filterLicenseSectionsByProfile(
  sections: LicenseSection[],
  profile: PartnerQualificationProfile
): LicenseSection[] {
  return sections
    .filter(section => isLicenseSectionAllowedForProfile(section.code, profile))
    .map(section => ({
      ...section,
      items: section.items.filter(item =>
        isLicenseItemAllowedForProfile(item.key, section.code, profile)
      )
    }))
    .filter(section => section.items.length > 0)
}

export function filterDocumentsByProfile<T extends { docKey?: string; sectionCode?: string }>(
  documents: T[],
  profile: PartnerQualificationProfile
): T[] {
  return documents.filter(doc => {
    if (!doc.docKey || !doc.sectionCode) return false
    return isLicenseItemAllowedForProfile(doc.templateKey || doc.docKey, doc.sectionCode, profile)
  })
}
