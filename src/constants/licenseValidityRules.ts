export type LicenseValidityModule =
  | '医疗器械（药监局）'
  | '消字号消毒产品（卫健委）'
  | '工商公示证照'

export type LicenseValidityType = 'fixed_years' | 'long_term' | 'annual' | 'none'

export interface LicenseValidityRule {
  id: string
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
  '医疗器械（药监局）',
  '消字号消毒产品（卫健委）',
  '工商公示证照'
]

export const LICENSE_VALIDITY_CATEGORY_MAP: Record<LicenseValidityModule, string[]> = {
  '医疗器械（药监局）': ['产品上市资质（单款产品）', '生产企业资质（工厂主体）', '经营流通资质（销售/经销）'],
  '消字号消毒产品（卫健委）': ['企业生产资质', '单款产品上市备案文件'],
  '工商公示证照': ['工商与资质认证', '年度复检类']
}

/** 医疗相关证件有效期完整分类表（默认数据） */
export const DEFAULT_LICENSE_VALIDITY_RULES: LicenseValidityRule[] = [
  {
    id: '01',
    module: '医疗器械（药监局）',
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
    module: '医疗器械（药监局）',
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
    module: '医疗器械（药监局）',
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
    module: '医疗器械（药监局）',
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
    module: '医疗器械（药监局）',
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
    module: '医疗器械（药监局）',
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
    module: '医疗器械（药监局）',
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
    module: '医疗器械（药监局）',
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
    module: '消字号消毒产品（卫健委）',
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
    module: '消字号消毒产品（卫健委）',
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
    module: '消字号消毒产品（卫健委）',
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
    module: '工商公示证照',
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
    module: '工商公示证照',
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
    module: '工商公示证照',
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
    module: '工商公示证照',
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
    module: '工商公示证照',
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
    id: '17',
    module: '工商公示证照',
    category: '工商与资质认证',
    docKey: 'iso13485_cert',
    docName: 'ISO13485 医疗器械体系认证',
    scope: '医疗器械质量管理体系',
    validityType: 'fixed_years',
    validityYears: 3,
    validityLabel: '3 年',
    renewalRequirement: '每年监督审核，3 年到期换证审核',
    longTerm: false,
    status: '正常',
    sortOrder: 17
  },
  {
    id: '18',
    module: '工商公示证照',
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
  }
]

export function formatLicenseValidityRuleName(rule: Pick<LicenseValidityRule, 'docName' | 'docNameSub'>): string {
  return rule.docNameSub ? `${rule.docName}${rule.docNameSub}` : rule.docName
}

export function buildValidityNoteFromRule(rule: LicenseValidityRule): string {
  if (rule.longTerm) return ''
  if (rule.validityType === 'annual') return '有效期 1 年'
  if (rule.validityType === 'fixed_years' && rule.validityYears) {
    return `有效期 ${rule.validityYears} 年`
  }
  return rule.validityLabel === '——' ? '' : rule.validityLabel
}
