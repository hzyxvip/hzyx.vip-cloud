export type LicenseValidityModule = '生产企业' | '经营公司' | '医疗机构'

export type LicenseValidityFilter = 'all' | LicenseValidityModule

export type LicenseValidityType = 'fixed_years' | 'long_term' | 'annual' | 'none'

export interface LicenseValidityRule {
  id: string
  /** 企业类型（每行仅一种） */
  module: LicenseValidityModule
  category: string
  docKey?: string
  docName: string
  docNameSub?: string
  scope: string
  validityType: LicenseValidityType
  validityYears?: number
  validityLabel: string
  renewalRequirement: string
  longTerm: boolean
  remark?: string
  status: '正常' | '停用'
  sortOrder: number
}

export const LICENSE_VALIDITY_MODULE_OPTIONS: LicenseValidityModule[] = [
  '生产企业',
  '经营公司',
  '医疗机构'
]

export const LICENSE_VALIDITY_FILTER_OPTIONS: { label: string; value: LicenseValidityFilter }[] = [
  { label: '全选', value: 'all' },
  { label: '生产企业', value: '生产企业' },
  { label: '经营公司', value: '经营公司' },
  { label: '医疗机构', value: '医疗机构' }
]

export const LICENSE_VALIDITY_CATEGORY_MAP: Record<LicenseValidityModule, string[]> = {
  生产企业: [
    '产品上市资质（单款产品）',
    '生产企业资质（工厂主体）',
    '企业生产资质',
    '单款产品上市备案文件',
    '工商与资质认证',
    '年度复检类'
  ],
  经营公司: ['经营流通资质（销售/经销）', '工商与资质认证', '年度复检类'],
  医疗机构: ['医疗机构资质', '工商与资质认证', '年度复检类']
}

/** 医疗相关证件有效期完整分类表（默认数据） */
export const DEFAULT_LICENSE_VALIDITY_RULES: LicenseValidityRule[] = [
  {
    id: '01',
    module: '生产企业',
    category: '产品上市资质（单款产品）',
    docKey: 'md_class1_product_filing',
    docName: '第一类医疗器械产品备案凭证',
    scope: '一类器械（冷敷贴、医用检查手套等）',
    validityType: 'long_term',
    validityLabel: '长期有效',
    renewalRequirement: '仅信息变更需 10 个工作日内变更备案；产品配方/结构重大改动重新备案',
    longTerm: true,
    status: '正常',
    sortOrder: 1
  },
  {
    id: '02',
    module: '生产企业',
    category: '产品上市资质（单款产品）',
    docKey: 'md_class2_registration_cert',
    docName: '第二类医疗器械注册证',
    scope: '二类器械（血压计、医用口罩、血糖仪）',
    validityType: 'fixed_years',
    validityYears: 5,
    validityLabel: '5 年',
    renewalRequirement: '到期前 6 个月申请延续注册',
    longTerm: false,
    status: '正常',
    sortOrder: 2
  },
  {
    id: '03',
    module: '生产企业',
    category: '产品上市资质（单款产品）',
    docKey: 'md_class3_registration_cert',
    docName: '第三类医疗器械注册证',
    scope: '三类器械（植入器械、无菌耗材、IVD 试剂）',
    validityType: 'fixed_years',
    validityYears: 5,
    validityLabel: '5 年',
    renewalRequirement: '到期前 6 个月申请延续注册',
    longTerm: false,
    status: '正常',
    sortOrder: 3
  },
  {
    id: '04',
    module: '生产企业',
    category: '生产企业资质（工厂主体）',
    docKey: 'md_class1_production_filing',
    docName: '第一类医疗器械生产备案凭证',
    scope: '仅生产一类器械工厂',
    validityType: 'long_term',
    validityLabel: '长期有效',
    renewalRequirement: '生产地址、范围、质量负责人变更及时备案',
    longTerm: true,
    status: '正常',
    sortOrder: 4
  },
  {
    id: '05',
    module: '生产企业',
    category: '生产企业资质（工厂主体）',
    docKey: 'md_production_license',
    docName: '医疗器械生产许可证',
    scope: '生产二类/三类医疗器械',
    validityType: 'fixed_years',
    validityYears: 5,
    validityLabel: '5 年',
    renewalRequirement: '到期前 30–90 工作日申请延续换证',
    longTerm: false,
    status: '正常',
    sortOrder: 5
  },
  {
    id: '06',
    module: '经营公司',
    category: '经营流通资质（销售/经销）',
    docKey: 'md_class2_business_filing',
    docName: '第二类医疗器械经营备案凭证',
    scope: '仅经营二类器械',
    validityType: 'long_term',
    validityLabel: '长期有效',
    renewalRequirement: '经营地址、库房、质量负责人变更及时变更备案',
    longTerm: true,
    status: '正常',
    sortOrder: 6
  },
  {
    id: '07',
    module: '经营公司',
    category: '经营流通资质（销售/经销）',
    docKey: 'md_business_license',
    docName: '医疗器械经营许可证',
    scope: '经营三类医疗器械（含二类+三类）',
    validityType: 'fixed_years',
    validityYears: 5,
    validityLabel: '5 年',
    renewalRequirement: '到期前 30–90 工作日申请延续换证',
    longTerm: false,
    status: '正常',
    sortOrder: 7
  },
  {
    id: '08',
    module: '经营公司',
    category: '经营流通资质（销售/经销）',
    docName: '仅经营一类器械',
    scope: '无专门资质，营业执照经营范围包含即可',
    validityType: 'none',
    validityLabel: '——',
    renewalRequirement: '——',
    longTerm: false,
    remark: '无专门证照，纳入营业执照经营范围管理',
    status: '正常',
    sortOrder: 8
  },
  {
    id: '09',
    module: '生产企业',
    category: '企业生产资质',
    docKey: 'disinfection_health_license',
    docName: '消毒产品生产企业卫生许可证',
    docNameSub: '（卫消证字）',
    scope: '消毒剂、消毒器械、抗菌抑菌卫生用品生产工厂',
    validityType: 'fixed_years',
    validityYears: 4,
    validityLabel: '4 年',
    renewalRequirement: '到期前 6 个月向省级卫健委申请换发新证',
    longTerm: false,
    status: '正常',
    sortOrder: 9
  },
  {
    id: '10',
    module: '生产企业',
    category: '单款产品上市备案文件',
    docKey: 'disinfection_safety_report_class1',
    docName: '消毒产品卫生安全评价报告',
    docNameSub: '（一类消毒产品）',
    scope: '高风险：含氯消毒剂、灭菌器械等',
    validityType: 'fixed_years',
    validityYears: 4,
    validityLabel: '4 年',
    renewalRequirement: '到期需重新全项检测、重做评价并备案',
    longTerm: false,
    status: '正常',
    sortOrder: 10
  },
  {
    id: '11',
    module: '生产企业',
    category: '单款产品上市备案文件',
    docKey: 'disinfection_safety_report_class2',
    docName: '消毒产品卫生安全评价报告',
    docNameSub: '（二类消毒产品）',
    scope: '低风险：抑菌凝胶、酒精棉片、普通抗菌湿巾',
    validityType: 'long_term',
    validityLabel: '长期有效',
    renewalRequirement: '配方、工艺、结构发生改变才需更新报告重新备案',
    longTerm: true,
    status: '正常',
    sortOrder: 11
  },
  {
    id: '12',
    module: '生产企业',
    category: '工商与资质认证',
    docKey: 'business_license',
    docName: '营业执照',
    scope: '所有医疗/消毒企业',
    validityType: 'long_term',
    validityLabel: '长期（有限公司）',
    renewalRequirement: '每年 6.30 前完成工商年报；经营范围变更及时更新',
    longTerm: true,
    status: '正常',
    sortOrder: 12
  },
  {
    id: '13',
    module: '生产企业',
    category: '工商与资质认证',
    docKey: 'bank_account_license',
    docName: '银行开户许可证',
    scope: '企业银行账户',
    validityType: 'long_term',
    validityLabel: '长期有效',
    renewalRequirement: '账户变更及时更新',
    longTerm: true,
    status: '正常',
    sortOrder: 13
  },
  {
    id: '14',
    module: '生产企业',
    category: '年度复检类',
    docKey: 'staff_health_cert',
    docName: '法人/质量负责人/检验人员健康证',
    scope: '接触生产、检验岗位人员',
    validityType: 'annual',
    validityYears: 1,
    validityLabel: '1 年',
    renewalRequirement: '每年复检换证',
    longTerm: false,
    status: '正常',
    sortOrder: 14
  },
  {
    id: '15',
    module: '生产企业',
    category: '年度复检类',
    docKey: 'cleanroom_water_report',
    docName: '厂房洁净度/水质检测报告',
    scope: '无菌车间、消毒车间',
    validityType: 'annual',
    validityYears: 1,
    validityLabel: '1 年',
    renewalRequirement: '每年第三方 CMA 检测，留存备查',
    longTerm: false,
    status: '正常',
    sortOrder: 15
  },
  {
    id: '16',
    module: '生产企业',
    category: '年度复检类',
    docKey: 'equipment_calibration_cert',
    docName: '设备计量校准证书',
    scope: '天平、温湿度计、培养箱等强制计量设备',
    validityType: 'annual',
    validityYears: 1,
    validityLabel: '1 年',
    renewalRequirement: '每年校准',
    longTerm: false,
    status: '正常',
    sortOrder: 16
  },
  {
    id: '18',
    module: '经营公司',
    category: '工商与资质认证',
    docKey: 'iso9001_cert',
    docName: 'ISO9001 质量管理体系认证',
    scope: '通用质量管理体系',
    validityType: 'fixed_years',
    validityYears: 3,
    validityLabel: '3 年',
    renewalRequirement: '每年监督审核，3 年换证',
    longTerm: false,
    status: '正常',
    sortOrder: 18
  },
  {
    id: '19',
    module: '医疗机构',
    category: '医疗机构资质',
    docKey: 'medical_institution_practice_license',
    docName: '医疗机构执业许可证',
    scope: '医院、诊所等医疗机构',
    validityType: 'long_term',
    validityLabel: '长期有效',
    renewalRequirement: '机构信息变更及时办理变更登记',
    longTerm: true,
    status: '正常',
    sortOrder: 19
  },
  {
    id: '20',
    module: '医疗机构',
    category: '医疗机构资质',
    docKey: 'institution_legal_person_cert',
    docName: '事业单位法人证书',
    scope: '公立医疗机构',
    validityType: 'long_term',
    validityLabel: '长期有效',
    renewalRequirement: '信息变更及时更新',
    longTerm: true,
    status: '正常',
    sortOrder: 20
  },
  {
    id: '21',
    module: '医疗机构',
    category: '医疗机构资质',
    docKey: 'purchase_authorization',
    docName: '采购授权书',
    scope: '医疗机构采购授权',
    validityType: 'annual',
    validityYears: 1,
    validityLabel: '1 年',
    renewalRequirement: '建议每年更新',
    longTerm: false,
    status: '正常',
    sortOrder: 21
  },
  {
    id: '22',
    module: '医疗机构',
    category: '医疗机构资质',
    docKey: 'receiving_authorization',
    docName: '收货授权书',
    scope: '医疗机构收货授权',
    validityType: 'annual',
    validityYears: 1,
    validityLabel: '1 年',
    renewalRequirement: '建议每年更新',
    longTerm: false,
    status: '正常',
    sortOrder: 22
  },
  {
    id: '23',
    module: '经营公司',
    category: '工商与资质认证',
    docKey: 'business_license',
    docName: '营业执照',
    scope: '所有医疗/消毒企业',
    validityType: 'long_term',
    validityLabel: '长期（有限公司）',
    renewalRequirement: '每年 6.30 前完成工商年报；经营范围变更及时更新',
    longTerm: true,
    status: '正常',
    sortOrder: 23
  },
  {
    id: '24',
    module: '医疗机构',
    category: '工商与资质认证',
    docKey: 'business_license',
    docName: '营业执照',
    scope: '所有医疗/消毒企业',
    validityType: 'long_term',
    validityLabel: '长期（有限公司）',
    renewalRequirement: '每年 6.30 前完成工商年报；经营范围变更及时更新',
    longTerm: true,
    status: '正常',
    sortOrder: 24
  },
  {
    id: '25',
    module: '经营公司',
    category: '工商与资质认证',
    docKey: 'bank_account_license',
    docName: '银行开户许可证',
    scope: '企业银行账户',
    validityType: 'long_term',
    validityLabel: '长期有效',
    renewalRequirement: '账户变更及时更新',
    longTerm: true,
    status: '正常',
    sortOrder: 25
  },
  {
    id: '26',
    module: '医疗机构',
    category: '工商与资质认证',
    docKey: 'bank_account_license',
    docName: '银行开户许可证',
    scope: '企业银行账户',
    validityType: 'long_term',
    validityLabel: '长期有效',
    renewalRequirement: '账户变更及时更新',
    longTerm: true,
    status: '正常',
    sortOrder: 26
  },
  {
    id: '27',
    module: '经营公司',
    category: '年度复检类',
    docKey: 'staff_health_cert',
    docName: '法人/质量负责人/检验人员健康证',
    scope: '接触生产、检验岗位人员',
    validityType: 'annual',
    validityYears: 1,
    validityLabel: '1 年',
    renewalRequirement: '每年复检换证',
    longTerm: false,
    status: '正常',
    sortOrder: 27
  },
  {
    id: '28',
    module: '医疗机构',
    category: '年度复检类',
    docKey: 'staff_health_cert',
    docName: '法人/质量负责人/检验人员健康证',
    scope: '接触生产、检验岗位人员',
    validityType: 'annual',
    validityYears: 1,
    validityLabel: '1 年',
    renewalRequirement: '每年复检换证',
    longTerm: false,
    status: '正常',
    sortOrder: 28
  },
  {
    id: '29',
    module: '经营公司',
    category: '年度复检类',
    docKey: 'equipment_calibration_cert',
    docName: '设备计量校准证书',
    scope: '天平、温湿度计、培养箱等强制计量设备',
    validityType: 'annual',
    validityYears: 1,
    validityLabel: '1 年',
    renewalRequirement: '每年校准',
    longTerm: false,
    status: '正常',
    sortOrder: 29
  },
  {
    id: '30',
    module: '生产企业',
    category: '工商与资质认证',
    docKey: 'iso9001_cert',
    docName: 'ISO9001 质量管理体系认证',
    scope: '通用质量管理体系',
    validityType: 'fixed_years',
    validityYears: 3,
    validityLabel: '3 年',
    renewalRequirement: '每年监督审核，3 年换证',
    longTerm: false,
    status: '正常',
    sortOrder: 30
  }
]

const DISTRIBUTOR_DOC_KEYS = new Set(['md_class2_business_filing', 'md_business_license'])
const HOSPITAL_DOC_KEYS = new Set([
  'medical_institution_practice_license',
  'institution_legal_person_cert',
  'purchase_authorization',
  'receiving_authorization'
])
const PRODUCTION_DOC_KEYS = new Set([
  'md_class1_product_filing',
  'md_class2_registration_cert',
  'md_class3_registration_cert',
  'md_class1_production_filing',
  'md_production_license',
  'disinfection_health_license',
  'disinfection_safety_report_class1',
  'disinfection_safety_report_class2',
  'iso13485_cert'
])

function normalizeRuleBaseId(id: string): string {
  const match = id.match(/^(\d+)/)
  return match ? match[1].padStart(2, '0') : id
}

function resolveExclusiveModule(rule: LicenseValidityRule): LicenseValidityModule | undefined {
  const docKey = rule.docKey || ''
  if (DISTRIBUTOR_DOC_KEYS.has(docKey) || rule.category.includes('经营流通')) {
    return '经营公司'
  }
  if (HOSPITAL_DOC_KEYS.has(docKey) || rule.category.includes('医疗机构')) {
    return '医疗机构'
  }
  if (PRODUCTION_DOC_KEYS.has(docKey) || rule.category.includes('生产')) {
    return '生产企业'
  }
  if (rule.docName === '仅经营一类器械') {
    return '经营公司'
  }
  return undefined
}

function resolveRuleEnterpriseModule(rule: LicenseValidityRule): LicenseValidityModule {
  const normalized = normalizeLicenseValidityRule(rule)
  return resolveExclusiveModule(normalized) || normalized.module
}

function compactLicenseValidityRuleIds(rules: LicenseValidityRule[]): LicenseValidityRule[] {
  const usedIds = new Set<string>()

  return rules.map(rule => {
    const match = rule.id.match(/^(\d+)-(.+)$/)
    if (!match) {
      usedIds.add(rule.id)
      return rule
    }

    const paddedBase = normalizeRuleBaseId(match[1])
    const canUseBaseId = match[2] === rule.module && !usedIds.has(paddedBase)
    const nextId = canUseBaseId ? paddedBase : rule.id
    usedIds.add(nextId)
    return nextId === rule.id ? rule : { ...rule, id: nextId }
  })
}

function inferModuleFromLegacyRule(rule: LicenseValidityRule): LicenseValidityModule {
  const rawModule = String(rule.module)
  if (LICENSE_VALIDITY_MODULE_OPTIONS.includes(rawModule as LicenseValidityModule)) {
    return rawModule as LicenseValidityModule
  }

  if (rule.category.includes('经营流通') || DISTRIBUTOR_DOC_KEYS.has(rule.docKey || '')) {
    return '经营公司'
  }
  if (HOSPITAL_DOC_KEYS.has(rule.docKey || '') || rule.category.includes('医疗机构')) {
    return '医疗机构'
  }
  if (rawModule === '消字号消毒产品（卫健委）' || rawModule === '医疗器械（药监局）') {
    return '生产企业'
  }
  return '生产企业'
}

export function ruleMatchesLicenseFilter(
  rule: LicenseValidityRule,
  filter: LicenseValidityFilter
): boolean {
  if (filter === 'all') return true
  return rule.module === filter
}

export function compareLicenseValidityRulesByDocName(
  a: LicenseValidityRule,
  b: LicenseValidityRule
): number {
  const nameCompare = a.docName.localeCompare(b.docName, 'zh-CN')
  if (nameCompare !== 0) return nameCompare

  const subCompare = (a.docNameSub || '').localeCompare(b.docNameSub || '', 'zh-CN')
  if (subCompare !== 0) return subCompare

  return a.module.localeCompare(b.module, 'zh-CN')
}

/** 按证件名称默认顺序重排 sortOrder，不修改证件内容 */
export function applyDefaultLicenseValiditySort(rules: LicenseValidityRule[]): LicenseValidityRule[] {
  return [...rules]
    .sort(compareLicenseValidityRulesByDocName)
    .map((rule, index) => ({
      ...rule,
      sortOrder: index + 1
    }))
}

function ruleDedupeKey(rule: LicenseValidityRule): string {
  return [
    rule.module,
    rule.docKey || '',
    rule.docName,
    rule.docNameSub || ''
  ].join('::')
}

function dedupeRulesByEnterpriseType(rules: LicenseValidityRule[]): LicenseValidityRule[] {
  const map = new Map<string, LicenseValidityRule>()
  rules.forEach(rule => {
    const key = ruleDedupeKey(rule)
    const existing = map.get(key)
    if (!existing || rule.sortOrder < existing.sortOrder) {
      map.set(key, rule)
    }
  })
  return Array.from(map.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)
  )
}

/** 规范化证件规则：每行仅保留单一企业类型 */
export function normalizeLicenseValidityRules(rules: LicenseValidityRule[]): LicenseValidityRule[] {
  const normalized = rules.map(rule => {
    const item = normalizeLicenseValidityRule(rule)
    return {
      ...item,
      module: resolveRuleEnterpriseModule(rule),
      id: normalizeRuleBaseId(item.id)
    }
  })

  return compactLicenseValidityRuleIds(dedupeRulesByEnterpriseType(normalized))
}

export function normalizeLicenseValidityRule(rule: LicenseValidityRule): LicenseValidityRule {
  const module = inferModuleFromLegacyRule(rule)
  return {
    ...rule,
    module
  }
}

export function formatLicenseValidityRuleName(rule: Pick<LicenseValidityRule, 'docName' | 'docNameSub'>): string {
  return rule.docNameSub ? `${rule.docName}${rule.docNameSub}` : rule.docName
}

export function buildValidityNoteFromRule(rule: LicenseValidityRule): string {
  if (rule.longTerm) return ''
  if (rule.validityType === 'annual') return buildValidityNoteFromYears(1)
  if (rule.validityType === 'fixed_years' && rule.validityYears) {
    return buildValidityNoteFromYears(rule.validityYears)
  }
  if (rule.validityLabel === '——') return ''
  const years = parseValidityYearsFromNote(rule.validityLabel)
  if (years) return buildValidityNoteFromYears(years)
  return rule.validityLabel
}

export function parseValidityYearsFromNote(note: string): string {
  if (!note?.trim()) return ''
  const match = note.trim().match(/^有效期\s*(.*?)\s*年$/)
  if (match) return match[1].trim()
  const legacy = note.match(/(\d+(?:\.\d+)?)\s*年/)
  if (legacy) return legacy[1]
  return ''
}

export function buildValidityNoteFromYears(years: number | string): string {
  const value = String(years).trim()
  return value ? `有效期 ${value} 年` : '有效期  年'
}
