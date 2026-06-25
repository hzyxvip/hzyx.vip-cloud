/** 资金单据 localStorage 存储（与采购/销售订单模式一致） */

import { applyPurchaseOrderSettlementToStorage, applySalesOrderSettlementToStorage } from '@/utils/fundOrderAllocation'

export type FundDocType =
  | 'receipt'
  | 'payment'
  | 'preReceipt'
  | 'prePayment'
  | 'otherIncome'
  | 'otherExpense'

export type FundAuditStatus = 'notAudited' | 'audited'
export type FundVerifyStatus = 'notVerified' | 'partiallyVerified' | 'verified'
export type FundSettlementType = 'cash' | 'bank' | 'check' | 'draft' | 'thirdParty'

export interface FundDocument {
  id: string
  type: FundDocType
  typeName: string
  /** 客户或供应商名称 */
  partner: string
  partnerCode?: string
  account: string
  date: string
  amount: number
  amountDisplay: string
  verifiedAmount: number
  verifiedAmountDisplay: string
  unverifiedAmount: number
  unverifiedAmountDisplay: string
  auditStatus: FundAuditStatus
  verifyStatus: FundVerifyStatus
  settlementType: FundSettlementType
  creator: string
  auditor?: string
  remark?: string
  sourceOrderNo?: string
  createTime?: string
}

const STORAGE_KEY = 'fund-documents'

const TYPE_LABELS: Record<FundDocType, string> = {
  receipt: '收款',
  payment: '付款',
  preReceipt: '预收款',
  prePayment: '预付款',
  otherIncome: '其他收入',
  otherExpense: '其他支出'
}

export const fundTypeLabels = { ...TYPE_LABELS }

export const fundAuditStatusLabels: Record<FundAuditStatus, string> = {
  notAudited: '未审核',
  audited: '已审核'
}

export const fundVerifyStatusLabels: Record<FundVerifyStatus, string> = {
  notVerified: '未核销',
  partiallyVerified: '部分核销',
  verified: '已核销'
}

export const fundSettlementTypeLabels: Record<FundSettlementType, string> = {
  cash: '现金',
  bank: '银行转账',
  check: '支票',
  draft: '汇票',
  thirdParty: '第三方支付'
}

export function formatFundAmount(value: number): string {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function parseFundAmount(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const text = String(raw ?? '').replace(/[¥,\s]/g, '')
  const n = parseFloat(text)
  return Number.isFinite(n) ? n : 0
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function readRaw(): FundDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRaw(list: FundDocument[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

const PREFIX: Record<FundDocType, string> = {
  receipt: 'RC',
  payment: 'PD',
  preReceipt: 'PR',
  prePayment: 'PP',
  otherIncome: 'OI',
  otherExpense: 'OE'
}

export function generateFundDocNo(type: FundDocType): string {
  const date = todayStr().replace(/-/g, '')
  const prefix = PREFIX[type]
  const sameDay = readRaw().filter(d => d.id.startsWith(`${prefix}${date}`))
  const seq = String(sameDay.length + 1).padStart(3, '0')
  return `${prefix}${date}${seq}`
}

function normalizeDoc(raw: Record<string, unknown>): FundDocument {
  const type = String(raw.type || 'receipt') as FundDocType
  const amount = parseFundAmount(raw.amount ?? raw.amountDisplay)
  const verifiedAmount = parseFundAmount(raw.verifiedAmount ?? raw.verifiedAmountDisplay)
  const unverifiedAmount =
    raw.unverifiedAmount != null || raw.unverifiedAmountDisplay != null
      ? parseFundAmount(raw.unverifiedAmount ?? raw.unverifiedAmountDisplay)
      : Math.max(0, amount - verifiedAmount)

  return {
    id: String(raw.id || generateFundDocNo(type)),
    type,
    typeName: String(raw.typeName || TYPE_LABELS[type] || type),
    partner: String(raw.partner || raw.customer || raw.supplier || ''),
    partnerCode: raw.partnerCode ? String(raw.partnerCode) : undefined,
    account: String(raw.account || ''),
    date: String(raw.date || todayStr()).slice(0, 10),
    amount,
    amountDisplay: String(raw.amountDisplay || formatFundAmount(amount)),
    verifiedAmount,
    verifiedAmountDisplay: String(raw.verifiedAmountDisplay || formatFundAmount(verifiedAmount)),
    unverifiedAmount,
    unverifiedAmountDisplay: String(raw.unverifiedAmountDisplay || formatFundAmount(unverifiedAmount)),
    auditStatus: (raw.auditStatus as FundAuditStatus) || 'notAudited',
    verifyStatus: (raw.verifyStatus as FundVerifyStatus) || 'notVerified',
    settlementType: (raw.settlementType as FundSettlementType) || 'bank',
    creator: String(raw.creator || '系统操作员'),
    auditor: raw.auditor ? String(raw.auditor) : undefined,
    remark: raw.remark ? String(raw.remark) : undefined,
    sourceOrderNo: raw.sourceOrderNo ? String(raw.sourceOrderNo) : undefined,
    createTime: raw.createTime ? String(raw.createTime) : new Date().toLocaleString('zh-CN')
  }
}

/** 兼容 FundList 旧 mock 字段 customer */
export function toFundListRow(doc: FundDocument) {
  return {
    ...doc,
    customer: doc.partner
  }
}

export function listFundDocuments(type?: FundDocType): FundDocument[] {
  const list = readRaw().map(d => normalizeDoc(d as unknown as Record<string, unknown>))
  return type ? list.filter(d => d.type === type) : list
}

export function getFundDocument(id: string): FundDocument | undefined {
  return listFundDocuments().find(d => d.id === id)
}

export function saveFundDocument(input: Partial<FundDocument> & { type: FundDocType }): FundDocument {
  const list = readRaw()
  const type = input.type
  const amount = parseFundAmount(input.amount ?? input.amountDisplay)
  const verifiedAmount = parseFundAmount(input.verifiedAmount ?? 0)
  const unverifiedAmount = Math.max(0, amount - verifiedAmount)

  let verifyStatus: FundVerifyStatus = 'notVerified'
  if (verifiedAmount <= 0) verifyStatus = 'notVerified'
  else if (verifiedAmount >= amount) verifyStatus = 'verified'
  else verifyStatus = 'partiallyVerified'

  const doc = normalizeDoc({
    ...input,
    id: input.id || generateFundDocNo(type),
    type,
    typeName: TYPE_LABELS[type],
    amount,
    amountDisplay: formatFundAmount(amount),
    verifiedAmount,
    verifiedAmountDisplay: formatFundAmount(verifiedAmount),
    unverifiedAmount,
    unverifiedAmountDisplay: formatFundAmount(unverifiedAmount),
    verifyStatus: input.verifyStatus || verifyStatus,
    createTime: input.createTime || new Date().toLocaleString('zh-CN')
  })

  const idx = list.findIndex(d => d.id === doc.id)
  if (idx >= 0) list[idx] = doc
  else list.unshift(doc)
  writeRaw(list)
  return doc
}

export function deleteFundDocument(id: string): boolean {
  const list = readRaw()
  const target = list.find(d => d.id === id)
  if (!target || target.auditStatus === 'audited') return false
  writeRaw(list.filter(d => d.id !== id))
  return true
}

export function auditFundDocument(id: string, auditor = '当前用户'): FundDocument | null {
  const list = readRaw()
  const idx = list.findIndex(d => d.id === id)
  if (idx < 0) return null
  list[idx] = {
    ...normalizeDoc(list[idx] as unknown as Record<string, unknown>),
    auditStatus: 'audited',
    auditor
  }
  writeRaw(list)
  const doc = list[idx]
  syncOrderPaymentStatusFromFund(doc)
  return doc
}

/** 核销资金单据（需已审核） */
export function verifyFundDocument(id: string, verifyAmount: number): FundDocument | null {
  const list = readRaw()
  const idx = list.findIndex(d => d.id === id)
  if (idx < 0) return null
  const doc = normalizeDoc(list[idx] as unknown as Record<string, unknown>)
  if (doc.auditStatus !== 'audited') return null

  const amount = Math.max(0, verifyAmount)
  const newVerified = Math.min(doc.amount, doc.verifiedAmount + amount)
  const unverifiedAmount = Math.max(0, doc.amount - newVerified)
  let verifyStatus: FundVerifyStatus = 'notVerified'
  if (newVerified <= 0) verifyStatus = 'notVerified'
  else if (newVerified >= doc.amount) verifyStatus = 'verified'
  else verifyStatus = 'partiallyVerified'

  list[idx] = {
    ...doc,
    verifiedAmount: newVerified,
    verifiedAmountDisplay: formatFundAmount(newVerified),
    unverifiedAmount,
    unverifiedAmountDisplay: formatFundAmount(unverifiedAmount),
    verifyStatus
  }
  writeRaw(list)
  syncOrderPaymentStatusFromFund(list[idx])
  return list[idx]
}

/** 审核/核销后按订单号精确回写销售/采购订单收付款状态 */
export function syncOrderPaymentStatusFromFund(doc: FundDocument): void {
  if (doc.type === 'receipt' || doc.type === 'preReceipt') {
    applySalesOrderSettlementToStorage(doc.partner)
    return
  }
  if (doc.type === 'payment' || doc.type === 'prePayment') {
    applyPurchaseOrderSettlementToStorage(doc.partner)
  }
}

export function syncSalesOrderReceiveStatus(partner?: string): void {
  applySalesOrderSettlementToStorage(partner)
}

export function syncPurchaseOrderPaymentStatus(partner?: string): void {
  applyPurchaseOrderSettlementToStorage(partner)
}

/** 首次使用时迁移 FundList 内置 demo（仅当存储为空） */
export function ensureFundSeedData(): void {
  if (readRaw().length > 0) return
  const seeds: Partial<FundDocument>[] = [
    {
      id: 'RC202606001',
      type: 'receipt',
      partner: '北京协和医院',
      account: '工行北京分行',
      date: '2026-06-15',
      amount: 28800,
      verifiedAmount: 20000,
      auditStatus: 'audited',
      settlementType: 'bank',
      creator: '张三',
      auditor: '李四',
      remark: '医疗器械采购款'
    },
    {
      id: 'PD202606001',
      type: 'payment',
      partner: '深圳医疗器械有限公司',
      account: '招行深圳分行',
      date: '2026-06-13',
      amount: 35000,
      verifiedAmount: 35000,
      auditStatus: 'audited',
      settlementType: 'bank',
      creator: '王五',
      auditor: '赵六',
      remark: '采购货款'
    }
  ]
  seeds.forEach(s => saveFundDocument(s as FundDocument & { type: FundDocType }))
}
