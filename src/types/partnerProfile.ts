export interface PartnerDocument {
  id: number
  docKey?: string
  /** 产品证照副本关联的模板 key（如注册证、产品备案） */
  templateKey?: string
  docName: string
  docNameSub?: string
  docNo: string
  issueDate: string
  expireDate: string
  status: string
  validityNote?: string
  longTerm?: boolean
  sectionCode?: string
  sectionTitle?: string
  docNoLabel?: string
  /** 列表展示用缩略图 */
  imageUrl?: string
  /** 原图（预览/下载按需加载） */
  imageOriginalUrl?: string
  /** 原图字节数，用于企业容量统计 */
  imageSizeBytes?: number
  /** 证照图片展示方向：横放 / 竖放 */
  imageOrientation?: 'horizontal' | 'vertical'
}

/** 平台客户 / 资料客户 / 供应商 共用扩展字段 */
export interface PartnerProfileExtension {
  shortName?: string
  pinyin?: string
  taxRate?: number | string
  bankBranchNo?: string
  country?: string
  district?: string
  postalCode?: string
  mobile?: string
  platformUser?: string
  settlementPeriod?: number | string
  enterpriseLeader?: string
  idCard?: string
  leaderPhone?: string
  website?: string
  companyIntro?: string
  license?: string
  licenseExpire?: string
  recordStatus?: string
  recordDate?: string
  remark2?: string
  remark3?: string
  remark4?: string
  remark5?: string
}
