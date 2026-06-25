import {
  formatFundAmount,
  listFundDocuments,
  type FundDocument
} from '@/utils/fundStore'
import {
  buildPurchaseOrderAllocations,
  buildSalesOrderAllocations
} from '@/utils/fundOrderAllocation'
import { loadCustomerList } from '@/utils/customerStore'
import { loadSupplierList } from '@/utils/supplierStore'

export type ReceivableRow = {
  id: string
  partner: string
  orderNo: string
  orderDate: string
  totalAmount: number
  receivedAmount: number
  balance: number
  totalDisplay: string
  receivedDisplay: string
  balanceDisplay: string
  paymentStatus: string
}

export type PayableRow = {
  id: string
  partner: string
  orderNo: string
  orderDate: string
  totalAmount: number
  paidAmount: number
  balance: number
  totalDisplay: string
  paidDisplay: string
  balanceDisplay: string
  paymentStatus: string
}

/** 应收：来自销售订单 + 已审核收款单（按订单号精确分摊） */
export function buildReceivableDetailRows(): ReceivableRow[] {
  return buildSalesOrderAllocations()
    .map(alloc => {
      const paymentStatus =
        alloc.balance <= 0
          ? 'received'
          : alloc.settledAmount > 0
            ? 'partiallyReceived'
            : 'notReceived'

      return {
        id: alloc.orderNo,
        partner: alloc.partner,
        orderNo: alloc.orderNo,
        orderDate: alloc.orderDate,
        totalAmount: alloc.totalAmount,
        receivedAmount: alloc.settledAmount,
        balance: alloc.balance,
        totalDisplay: formatFundAmount(alloc.totalAmount),
        receivedDisplay: formatFundAmount(alloc.settledAmount),
        balanceDisplay: formatFundAmount(alloc.balance),
        paymentStatus
      }
    })
    .sort((a, b) => b.balance - a.balance)
}

/** 应付：来自采购订单 + 已审核付款单（按订单号精确分摊） */
export function buildPayableDetailRows(): PayableRow[] {
  return buildPurchaseOrderAllocations()
    .map(alloc => {
      const paymentStatus =
        alloc.balance <= 0 ? 'paid' : alloc.settledAmount > 0 ? 'partiallyPaid' : 'notPaid'

      return {
        id: alloc.orderNo,
        partner: alloc.partner,
        orderNo: alloc.orderNo,
        orderDate: alloc.orderDate,
        totalAmount: alloc.totalAmount,
        paidAmount: alloc.settledAmount,
        balance: alloc.balance,
        totalDisplay: formatFundAmount(alloc.totalAmount),
        paidDisplay: formatFundAmount(alloc.settledAmount),
        balanceDisplay: formatFundAmount(alloc.balance),
        paymentStatus
      }
    })
    .sort((a, b) => b.balance - a.balance)
}

export type FundStatSummary = {
  totalAmount: number
  totalBalance: number
  partnerCount: number
  docCount: number
}

export function summarizeReceivables(rows = buildReceivableDetailRows()): FundStatSummary {
  return {
    totalAmount: rows.reduce((s, r) => s + r.totalAmount, 0),
    totalBalance: rows.reduce((s, r) => s + r.balance, 0),
    partnerCount: new Set(rows.map(r => r.partner)).size,
    docCount: rows.length
  }
}

export function summarizePayables(rows = buildPayableDetailRows()): FundStatSummary {
  return {
    totalAmount: rows.reduce((s, r) => s + r.totalAmount, 0),
    totalBalance: rows.reduce((s, r) => s + r.balance, 0),
    partnerCount: new Set(rows.map(r => r.partner)).size,
    docCount: rows.length
  }
}

/** 按伙伴汇总收款/付款（往来报表） */
export function buildPartnerFundSummary(): Array<{
  partner: string
  receiptTotal: number
  paymentTotal: number
  net: number
}> {
  const map = new Map<string, { receipt: number; payment: number }>()

  const add = (partner: string, field: 'receipt' | 'payment', amount: number) => {
    if (!partner) return
    const cur = map.get(partner) || { receipt: 0, payment: 0 }
    cur[field] += amount
    map.set(partner, cur)
  }

  listFundDocuments().forEach((doc: FundDocument) => {
    if (doc.auditStatus !== 'audited') return
    if (doc.type === 'receipt' || doc.type === 'preReceipt' || doc.type === 'otherIncome') {
      add(doc.partner, 'receipt', doc.amount)
    } else {
      add(doc.partner, 'payment', doc.amount)
    }
  })

  return Array.from(map.entries())
    .map(([partner, v]) => ({
      partner,
      receiptTotal: v.receipt,
      paymentTotal: v.payment,
      net: v.receipt - v.payment
    }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
}

export type AgeBucketRow = {
  partner: string
  total: number
  age0_30: number
  age31_60: number
  age61_90: number
  age90Plus: number
  totalDisplay: string
  age0_30Display: string
  age31_60Display: string
  age61_90Display: string
  age90PlusDisplay: string
}

function daysSince(dateStr: string): number {
  const d = new Date(String(dateStr).slice(0, 10))
  if (Number.isNaN(d.getTime())) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((today.getTime() - d.getTime()) / 86400000))
}

function ageBucket(days: number): keyof Pick<AgeBucketRow, 'age0_30' | 'age31_60' | 'age61_90' | 'age90Plus'> {
  if (days <= 30) return 'age0_30'
  if (days <= 60) return 'age31_60'
  if (days <= 90) return 'age61_90'
  return 'age90Plus'
}

function buildAgeRowsFromBalances(
  items: Array<{ partner: string; orderDate: string; balance: number }>
): AgeBucketRow[] {
  const map = new Map<string, AgeBucketRow>()

  items.forEach(item => {
    if (item.balance <= 0 || !item.partner) return
    const bucket = ageBucket(daysSince(item.orderDate))
    const cur =
      map.get(item.partner) ||
      ({
        partner: item.partner,
        total: 0,
        age0_30: 0,
        age31_60: 0,
        age61_90: 0,
        age90Plus: 0,
        totalDisplay: '',
        age0_30Display: '',
        age31_60Display: '',
        age61_90Display: '',
        age90PlusDisplay: ''
      } satisfies AgeBucketRow)

    cur[bucket] += item.balance
    cur.total += item.balance
    map.set(item.partner, cur)
  })

  return Array.from(map.values())
    .map(row => ({
      ...row,
      totalDisplay: formatFundAmount(row.total),
      age0_30Display: formatFundAmount(row.age0_30),
      age31_60Display: formatFundAmount(row.age31_60),
      age61_90Display: formatFundAmount(row.age61_90),
      age90PlusDisplay: formatFundAmount(row.age90Plus)
    }))
    .sort((a, b) => b.total - a.total)
}

/** 应收账龄：按订单日期与未收余额分档 */
export function buildReceivableAgeRows(): AgeBucketRow[] {
  return buildAgeRowsFromBalances(
    buildReceivableDetailRows().map(row => ({
      partner: row.partner,
      orderDate: row.orderDate,
      balance: row.balance
    }))
  )
}

/** 应付账龄：按订单日期与未付余额分档 */
export function buildPayableAgeRows(): AgeBucketRow[] {
  return buildAgeRowsFromBalances(
    buildPayableDetailRows().map(row => ({
      partner: row.partner,
      orderDate: row.orderDate,
      balance: row.balance
    }))
  )
}

export type FundForecastRow = {
  partner: string
  orderNo: string
  amount: number
  amountDisplay: string
  dueDate: string
  daysRemaining: number
  statusLabel: string
  level: 'normal' | 'warning' | 'danger'
}

const DEFAULT_SETTLEMENT_DAYS = 30

function addDays(dateStr: string, days: number): string {
  const base = new Date(String(dateStr).slice(0, 10))
  if (Number.isNaN(base.getTime())) return ''
  base.setDate(base.getDate() + Math.max(0, days))
  return base.toISOString().slice(0, 10)
}

function daysUntil(dateStr: string): number {
  const target = new Date(String(dateStr).slice(0, 10))
  if (Number.isNaN(target.getTime())) return 9999
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.floor((target.getTime() - today.getTime()) / 86400000)
}

function resolveForecastLevel(daysRemaining: number): FundForecastRow['level'] {
  if (daysRemaining < 0 || daysRemaining <= 7) return 'danger'
  if (daysRemaining <= 30) return 'warning'
  return 'normal'
}

function resolveForecastLabel(daysRemaining: number): string {
  if (daysRemaining < 0) return `逾期 ${Math.abs(daysRemaining)} 天`
  if (daysRemaining === 0) return '今日到期'
  return `剩余 ${daysRemaining} 天`
}

function buildCustomerSettlementMap(): Map<string, number> {
  return new Map(
    loadCustomerList().map(item => [item.name, Number(item.settlementPeriod) || DEFAULT_SETTLEMENT_DAYS])
  )
}

function buildSupplierSettlementMap(): Map<string, number> {
  return new Map(
    loadSupplierList().map(item => [item.name, Number(item.settlementPeriod) || DEFAULT_SETTLEMENT_DAYS])
  )
}

/** 应收预警：未收余额 + 账期推算到期日 */
export function buildReceivableForecastRows(): FundForecastRow[] {
  const periodMap = buildCustomerSettlementMap()
  return buildReceivableDetailRows()
    .filter(row => row.balance > 0)
    .map(row => {
      const period = periodMap.get(row.partner) ?? DEFAULT_SETTLEMENT_DAYS
      const dueDate = addDays(row.orderDate, period)
      const daysRemaining = daysUntil(dueDate)
      return {
        partner: row.partner,
        orderNo: row.orderNo,
        amount: row.balance,
        amountDisplay: formatFundAmount(row.balance),
        dueDate,
        daysRemaining,
        statusLabel: resolveForecastLabel(daysRemaining),
        level: resolveForecastLevel(daysRemaining)
      }
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
}

/** 应付预警：未付余额 + 账期推算到期日 */
export function buildPayableForecastRows(): FundForecastRow[] {
  const periodMap = buildSupplierSettlementMap()
  return buildPayableDetailRows()
    .filter(row => row.balance > 0)
    .map(row => {
      const period = periodMap.get(row.partner) ?? DEFAULT_SETTLEMENT_DAYS
      const dueDate = addDays(row.orderDate, period)
      const daysRemaining = daysUntil(dueDate)
      return {
        partner: row.partner,
        orderNo: row.orderNo,
        amount: row.balance,
        amountDisplay: formatFundAmount(row.balance),
        dueDate,
        daysRemaining,
        statusLabel: resolveForecastLabel(daysRemaining),
        level: resolveForecastLevel(daysRemaining)
      }
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
}
