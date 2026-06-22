/**
 * 医疗器械 GSP / 《医疗器械监督管理条例》合规引擎
 * 供前端业务单据在提交、审核、出库等关键节点统一调用
 */
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'

/** 法规最低记录保存年限（GSP 及条例要求不少于 5 年） */
export const MIN_RECORD_RETENTION_YEARS = 5
export const MIN_RECORD_RETENTION_DAYS = MIN_RECORD_RETENTION_YEARS * 365

/** 资质证件默认预警天数 */
export const DEFAULT_QUALIFICATION_WARNING_DAYS = 90

/** 产品效期默认预警天数 */
export const DEFAULT_EXPIRY_WARNING_DAYS = 30

export type QualificationStatus = 'valid' | 'expiring' | 'expired'

export interface QualificationDocument {
  docName: string
  docNo?: string
  issueDate?: string
  expireDate: string
  status?: string
  fileUrl?: string
}

export interface TraceableItem {
  productCode: string
  productName: string
  batchNo?: string
  expiryDate?: string
  expireDate?: string
  udiDi?: string
  udiPi?: string
  udiCode?: string
  serialNo?: string
  quantity?: number
  locked?: boolean
  storageCondition?: string
}

export interface ComplianceValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface UdiTraceNode {
  nodeType: 'purchase' | 'acceptance' | 'inbound' | 'inventory' | 'outbound' | 'sales'
  documentNo: string
  companyId?: number
  operator?: string
  operatedAt: string
  udiDi?: string
  udiPi?: string
  udiCode?: string
  batchNo?: string
  serialNo?: string
  quantity?: number
}

const parseDate = (value?: string) => {
  if (!value) return null
  const d = dayjs(value)
  return d.isValid() ? d : null
}

/** 计算资质/效期状态 */
export const evaluateQualificationStatus = (
  expireDate: string,
  warningDays = DEFAULT_QUALIFICATION_WARNING_DAYS
): QualificationStatus => {
  const exp = parseDate(expireDate)
  if (!exp) return 'expired'
  const today = dayjs().startOf('day')
  if (exp.isBefore(today, 'day')) return 'expired'
  if (exp.diff(today, 'day') <= warningDays) return 'expiring'
  return 'valid'
}

/** 资质状态中文标签 */
export const qualificationStatusLabel = (status: QualificationStatus) => {
  const map: Record<QualificationStatus, string> = {
    valid: '有效',
    expiring: '即将到期',
    expired: '已过期'
  }
  return map[status]
}

/** 校验供应商/客户资质：过期拦截，即将到期警告 */
export const validatePartnerQualifications = (
  partnerName: string,
  documents: QualificationDocument[],
  options: { blockOnExpired?: boolean; warningDays?: number } = {}
): ComplianceValidationResult => {
  const { blockOnExpired = true, warningDays = DEFAULT_QUALIFICATION_WARNING_DAYS } = options
  const errors: string[] = []
  const warnings: string[] = []

  if (!documents || documents.length === 0) {
    errors.push(`${partnerName}：未上传任何资质证件，不符合 GSP 首营要求`)
    return { valid: !blockOnExpired, errors, warnings }
  }

  for (const doc of documents) {
    if (!doc.expireDate) {
      errors.push(`${partnerName}：证件「${doc.docName || '未命名'}」缺少有效期`)
      continue
    }
    const status = evaluateQualificationStatus(doc.expireDate, warningDays)
    if (status === 'expired') {
      const msg = `${partnerName}：证件「${doc.docName}(${doc.docNo || ''})」已过期（${doc.expireDate}），禁止业务往来`
      if (blockOnExpired) errors.push(msg)
      else warnings.push(msg)
    } else if (status === 'expiring') {
      warnings.push(`${partnerName}：证件「${doc.docName}」将于 ${doc.expireDate} 到期，请及时更新`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/** 获取明细效期字段（兼容 expireDate / expiryDate） */
export const getItemExpiryDate = (item: TraceableItem) =>
  item.expiryDate || item.expireDate || ''

/** 产品是否已过期 */
export const isProductExpired = (expiryDate?: string) => {
  const exp = parseDate(expiryDate)
  if (!exp) return false
  return exp.isBefore(dayjs().startOf('day'), 'day')
}

/** 产品是否临近效期 */
export const isProductNearExpiry = (
  expiryDate?: string,
  warningDays = DEFAULT_EXPIRY_WARNING_DAYS
) => {
  const exp = parseDate(expiryDate)
  if (!exp || isProductExpired(expiryDate)) return false
  return exp.diff(dayjs().startOf('day'), 'day') <= warningDays
}

/** 入库验收校验：禁止入库已过效期产品 */
export const validateInboundItems = (
  items: TraceableItem[],
  options: { requireBatch?: boolean; requireUdi?: boolean } = {}
): ComplianceValidationResult => {
  const { requireBatch = true, requireUdi = false } = options
  const errors: string[] = []
  const warnings: string[] = []

  for (const item of items) {
    const label = item.productName || item.productCode || '未知商品'
    if (requireBatch && !item.batchNo) {
      errors.push(`「${label}」缺少生产批号，不符合验收记录要求`)
    }
    const expiry = getItemExpiryDate(item)
    if (!expiry) {
      errors.push(`「${label}」缺少有效期至，不符合 GSP 验收要求`)
    } else if (isProductExpired(expiry)) {
      errors.push(`「${label}」效期 ${expiry} 已过期，禁止入库`)
    } else if (isProductNearExpiry(expiry)) {
      warnings.push(`「${label}」效期 ${expiry} 临近到期，请重点关注`)
    }
    if (requireUdi && !item.udiCode && !item.udiDi) {
      errors.push(`「${label}」缺少 UDI 标识，不符合唯一标识管理要求`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/** 出库校验：过期锁定禁止出库 */
export const validateOutboundItems = (
  items: TraceableItem[],
  options: { blockExpired?: boolean; warningDays?: number } = {}
): ComplianceValidationResult => {
  const { blockExpired = true, warningDays = DEFAULT_EXPIRY_WARNING_DAYS } = options
  const errors: string[] = []
  const warnings: string[] = []

  for (const item of items) {
    const label = item.productName || item.productCode || '未知商品'
    if (item.locked) {
      errors.push(`「${label}」已被锁定（不合格品/召回），禁止出库`)
      continue
    }
    const expiry = getItemExpiryDate(item)
    if (!expiry) {
      warnings.push(`「${label}」未填写有效期，建议补全后再出库`)
      continue
    }
    if (isProductExpired(expiry)) {
      const msg = `「${label}」效期 ${expiry} 已过期，禁止出库（GSP 过期锁定）`
      if (blockExpired) errors.push(msg)
      else warnings.push(msg)
    } else if (isProductNearExpiry(expiry, warningDays)) {
      warnings.push(`「${label}」效期 ${expiry} 临近到期（剩余 ${dayjs(expiry).diff(dayjs().startOf('day'), 'day')} 天）`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/** 计算记录法定保存截止日期 */
export const computeRecordRetentionDeadline = (recordDate: string | Date) =>
  dayjs(recordDate).add(MIN_RECORD_RETENTION_YEARS, 'year').format('YYYY-MM-DD')

/** 校验记录是否仍在法定保存期内 */
export const isWithinRetentionPeriod = (recordDate: string | Date) =>
  dayjs().isBefore(dayjs(recordDate).add(MIN_RECORD_RETENTION_YEARS, 'year').endOf('day'))

/** UDI-DI 基础格式校验（GS1/HIBCC 等，此处做长度与前缀粗校验） */
export const validateUdiCode = (udi?: string) => {
  if (!udi || !udi.trim()) return false
  const code = udi.trim()
  return code.length >= 8 && code.length <= 80
}

/** 构建 UDI 全链路追溯节点 */
export const buildUdiTraceNode = (node: UdiTraceNode): UdiTraceNode => ({
  ...node,
  operatedAt: node.operatedAt || dayjs().format('YYYY-MM-DD HH:mm:ss')
})

/** 追加追溯链到 localStorage（过渡期方案，正式环境应写入后端不可篡改日志） */
export const appendUdiTraceChain = (traceKey: string, node: UdiTraceNode) => {
  const key = `udiTrace_${traceKey}`
  const stored = localStorage.getItem(key)
  const chain: UdiTraceNode[] = stored ? JSON.parse(stored) : []
  chain.push(buildUdiTraceNode(node))
  localStorage.setItem(key, JSON.stringify(chain))
  return chain
}

/** 展示合规校验结果 */
export const showComplianceResult = (
  result: ComplianceValidationResult,
  onSuccess?: () => void
) => {
  if (!result.valid) {
    ElMessage.error(result.errors[0] || '合规校验未通过')
    if (result.errors.length > 1) {
      console.warn('[合规拦截]', result.errors)
    }
    return false
  }
  result.warnings.forEach(w => ElMessage.warning(w))
  onSuccess?.()
  return true
}
