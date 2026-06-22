import {
  buildValidityNoteFromRule
} from '@/constants/licenseValidityRules'
import { getLicenseValidityRuleByDocKey } from '@/utils/licenseValidityRuleStore'

export interface LicenseTemplate {
  key: string
  docName: string
  docNameSub?: string
  validityNote: string
  longTerm?: boolean
  docNoLabel?: string
  layout?: 'card' | 'table'
}

export interface LicenseSection {
  code: string
  title: string
  items: LicenseTemplate[]
}

export function formatLicenseSectionCode(code: string): string {
  return code.endsWith('、') ? code : `${code}、`
}

/** 医疗机构资质分段编号 */
export const HOSPITAL_LICENSE_SECTION_CODE = '2.3'

const HOSPITAL_LICENSE_DOC_KEYS = new Set([
  'medical_institution_practice_license',
  'institution_legal_person_cert',
  'purchase_authorization',
  'receiving_authorization'
])

/** 历史分段迁移：旧 4→2.3（医疗机构）；旧 2.3 消字号生产资质→2.1 */
export function migrateLegacyLicenseSectionCode(sectionCode?: string, docKey?: string): string {
  if (sectionCode === '4') return HOSPITAL_LICENSE_SECTION_CODE
  if (sectionCode === HOSPITAL_LICENSE_SECTION_CODE) {
    if (docKey && HOSPITAL_LICENSE_DOC_KEYS.has(docKey)) return HOSPITAL_LICENSE_SECTION_CODE
    if (docKey && !HOSPITAL_LICENSE_DOC_KEYS.has(docKey)) return '2.1'
    return HOSPITAL_LICENSE_SECTION_CODE
  }
  return sectionCode || '1'
}

export const LICENSE_SECTION_CODE_WIDTH = '40px'

function buildTemplate(
  key: string,
  fallback: LicenseTemplate
): LicenseTemplate {
  const rule = getLicenseValidityRuleByDocKey(key)
  if (!rule) return fallback
  return {
    ...fallback,
    docName: rule.docName,
    docNameSub: rule.docNameSub,
    validityNote: buildValidityNoteFromRule(rule),
    longTerm: rule.longTerm
  }
}

/** 企业证照分段模板（与证件有效期分类表联动） */
export const PARTNER_LICENSE_SECTIONS: LicenseSection[] = [
  {
    code: '1',
    title: '工商公示证照',
    items: [
      buildTemplate('business_license', {
        key: 'business_license',
        docName: '营业执照',
        validityNote: '',
        docNoLabel: '社会统一信用代码证',
        longTerm: true,
        layout: 'card'
      }),
      buildTemplate('bank_account_license', {
        key: 'bank_account_license',
        docName: '银行开户许可证',
        validityNote: '',
        docNoLabel: '银行编号',
        longTerm: true,
        layout: 'card'
      }),
      buildTemplate('staff_health_cert', {
        key: 'staff_health_cert',
        docName: '法人/质量负责人/检验人员健康证',
        validityNote: '有效期 1 年',
        docNoLabel: '健康证编号'
      }),
      buildTemplate('cleanroom_water_report', {
        key: 'cleanroom_water_report',
        docName: '厂房洁净度/水质检测报告',
        validityNote: '有效期 1 年',
        docNoLabel: '报告编号'
      }),
      buildTemplate('equipment_calibration_cert', {
        key: 'equipment_calibration_cert',
        docName: '设备计量校准证书',
        validityNote: '有效期 1 年',
        docNoLabel: '证书编号'
      }),
      buildTemplate('iso13485_cert', {
        key: 'iso13485_cert',
        docName: 'ISO13485 医疗器械体系认证',
        validityNote: '有效期 3 年',
        docNoLabel: '证书编号'
      }),
      buildTemplate('iso9001_cert', {
        key: 'iso9001_cert',
        docName: 'ISO9001 质量管理体系认证',
        validityNote: '有效期 3 年',
        docNoLabel: '证书编号'
      })
    ]
  },
  {
    code: '2.1',
    title: '生产企业资质',
    items: [
      buildTemplate('md_class1_production_filing', {
        key: 'md_class1_production_filing',
        docName: '第一类医疗器械生产备案凭证',
        validityNote: '',
        longTerm: true,
        docNoLabel: '备案编号'
      }),
      buildTemplate('md_production_license', {
        key: 'md_production_license',
        docName: '医疗器械生产许可证',
        validityNote: '有效期 5 年',
        docNoLabel: '证照编号'
      }),
      buildTemplate('disinfection_health_license', {
        key: 'disinfection_health_license',
        docName: '消毒产品生产企业卫生许可证',
        docNameSub: '（卫消证字）',
        validityNote: '有效期 4 年',
        docNoLabel: '许可证编号'
      })
    ]
  },
  {
    code: '2.2',
    title: '医疗器械经营流通资质',
    items: [
      buildTemplate('md_class2_business_filing', {
        key: 'md_class2_business_filing',
        docName: '第二类医疗器械经营备案凭证',
        validityNote: '',
        longTerm: true,
        docNoLabel: '备案编号'
      }),
      buildTemplate('md_business_license', {
        key: 'md_business_license',
        docName: '医疗器械经营许可证',
        validityNote: '有效期 5 年',
        docNoLabel: '许可证编号'
      })
    ]
  },
  {
    code: '3.1',
    title: '医疗器械产品上市资质',
    items: [
      buildTemplate('md_class1_product_filing', {
        key: 'md_class1_product_filing',
        docName: '第一类医疗器械产品备案凭证',
        validityNote: '',
        longTerm: true,
        docNoLabel: '备案编号'
      }),
      buildTemplate('md_class2_registration_cert', {
        key: 'md_class2_registration_cert',
        docName: '第二类医疗器械注册证',
        validityNote: '有效期 5 年',
        docNoLabel: '注册证编号'
      }),
      buildTemplate('md_class3_registration_cert', {
        key: 'md_class3_registration_cert',
        docName: '第三类医疗器械注册证',
        validityNote: '有效期 5 年',
        docNoLabel: '注册证编号'
      })
    ]
  },
  {
    code: '3.2',
    title: '消字号产品备案资质',
    items: [
      buildTemplate('disinfection_safety_report_class1', {
        key: 'disinfection_safety_report_class1',
        docName: '消毒产品卫生安全评价报告',
        docNameSub: '（一类消毒产品）',
        validityNote: '有效期 4 年',
        docNoLabel: '报告编号'
      }),
      buildTemplate('disinfection_safety_report_class2', {
        key: 'disinfection_safety_report_class2',
        docName: '消毒产品卫生安全评价报告',
        docNameSub: '（二类消毒产品）',
        validityNote: '',
        longTerm: true,
        docNoLabel: '报告编号'
      })
    ]
  },
  {
    code: HOSPITAL_LICENSE_SECTION_CODE,
    title: '医疗机构资质',
    items: [
      buildTemplate('medical_institution_practice_license', {
        key: 'medical_institution_practice_license',
        docName: '医疗机构执业许可证',
        validityNote: '',
        docNoLabel: '登记号'
      }),
      buildTemplate('institution_legal_person_cert', {
        key: 'institution_legal_person_cert',
        docName: '事业单位法人证书',
        validityNote: '',
        longTerm: true,
        docNoLabel: '证书编号'
      }),
      buildTemplate('purchase_authorization', {
        key: 'purchase_authorization',
        docName: '采购授权书',
        validityNote: '建议每年更新',
        docNoLabel: '授权编号'
      }),
      buildTemplate('receiving_authorization', {
        key: 'receiving_authorization',
        docName: '收货授权书',
        validityNote: '建议每年更新',
        docNoLabel: '授权编号'
      })
    ]
  }
]

export const PARTNER_LICENSE_TEMPLATE_MAP = new Map(
  PARTNER_LICENSE_SECTIONS.flatMap(section =>
    section.items.map(item => [item.key, { ...item, sectionCode: section.code, sectionTitle: section.title }])
  )
)
