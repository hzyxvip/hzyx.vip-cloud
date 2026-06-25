import {
  listFundDocuments,
  parseFundAmount,
  type FundDocType,
  type FundDocument
} from '@/utils/fundStore'

export type OrderFundAllocation = {
  orderNo: string
  partner: string
  orderDate: string
  totalAmount: number
  settledAmount: number
  balance: number
}

function readJsonOrders(key: string): Record<string, unknown>[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function resolveOrderNo(order: Record<string, unknown>): string {
  return String(order.orderNo || order.id || '').trim()
}

function matchOrderNo(order: Record<string, unknown>, ref: string): boolean {
  const refNo = String(ref || '').trim()
  if (!refNo) return false
  return resolveOrderNo(order) === refNo || String(order.id || '').trim() === refNo
}

type PrepayFundType = 'prePayment' | 'preReceipt'

function findPrepayFundDocsForOrder(
  docs: FundDocument[],
  order: Record<string, unknown>,
  fundType: PrepayFundType,
  partnerKey: 'supplier' | 'customer'
): FundDocument[] {
  const partner = String(order[partnerKey] || '')
  return docs.filter(doc => {
    if (doc.type !== fundType) return false
    const ref = String(doc.sourceOrderNo || '').trim()
    if (!ref || !matchOrderNo(order, ref)) return false
    return doc.partner === partner
  })
}

/** 按关联预收/预付款单审核与核销状态推导订单预收/预付单据状态 */
export function derivePrepaymentStatusFromFundDocs(docs: FundDocument[]): string {
  if (docs.length === 0) return ''
  if (docs.some(doc => doc.auditStatus !== 'audited')) return 'prepaidNotAudited'
  if (docs.every(doc => doc.verifyStatus === 'verified')) return 'prepaidAudited'
  return 'prepaidPartiallyAudited'
}

/** 将已审核资金单分摊到订单：优先 sourceOrderNo，其余按订单日期 FIFO */
export function allocateFundToOrders(
  orders: Record<string, unknown>[],
  docs: FundDocument[],
  partnerKey: 'customer' | 'supplier',
  fundTypes: FundDocType[]
): Map<string, number> {
  const audited = orders.filter(o => String(o.auditStatus || '') === 'audited')
  const settledByOrder = new Map<string, number>()
  audited.forEach(o => settledByOrder.set(resolveOrderNo(o), 0))

  const eligibleDocs = docs.filter(
    d => d.auditStatus === 'audited' && fundTypes.includes(d.type)
  )

  // 1. 精确挂账：sourceOrderNo
  for (const doc of eligibleDocs) {
    const ref = String(doc.sourceOrderNo || '').trim()
    if (!ref) continue
    const order = audited.find(o => matchOrderNo(o, ref))
    if (!order) continue
    if (String(order[partnerKey] || '') !== doc.partner) continue
    const orderNo = resolveOrderNo(order)
    const total = parseFundAmount(order.amount)
    const cur = settledByOrder.get(orderNo) || 0
    settledByOrder.set(orderNo, Math.min(total, cur + doc.amount))
  }

  // 2. 未指定订单号的金额，按伙伴 FIFO 分摊
  const poolByPartner = new Map<string, number>()
  for (const doc of eligibleDocs) {
    if (String(doc.sourceOrderNo || '').trim()) continue
    poolByPartner.set(doc.partner, (poolByPartner.get(doc.partner) || 0) + doc.amount)
  }

  for (const [partner, pool] of poolByPartner) {
    let remaining = pool
    const partnerOrders = audited
      .filter(o => String(o[partnerKey] || '') === partner)
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))

    for (const order of partnerOrders) {
      if (remaining <= 0) break
      const orderNo = resolveOrderNo(order)
      const total = parseFundAmount(order.amount)
      const cur = settledByOrder.get(orderNo) || 0
      const need = Math.max(0, total - cur)
      const add = Math.min(need, remaining)
      settledByOrder.set(orderNo, cur + add)
      remaining -= add
    }
  }

  return settledByOrder
}

export function buildSalesOrderSettlements(): Map<string, number> {
  return allocateFundToOrders(
    readJsonOrders('sales-orders'),
    listFundDocuments(),
    'customer',
    ['receipt', 'preReceipt']
  )
}

export function buildPurchaseOrderSettlements(): Map<string, number> {
  return allocateFundToOrders(
    readJsonOrders('purchase-orders'),
    listFundDocuments(),
    'supplier',
    ['payment', 'prePayment']
  )
}

export function buildSalesOrderAllocations(): OrderFundAllocation[] {
  const orders = readJsonOrders('sales-orders').filter(o => String(o.auditStatus || '') === 'audited')
  const settled = buildSalesOrderSettlements()
  return orders
    .map(order => {
      const orderNo = resolveOrderNo(order)
      const totalAmount = parseFundAmount(order.amount)
      const settledAmount = settled.get(orderNo) || 0
      return {
        orderNo,
        partner: String(order.customer || ''),
        orderDate: String(order.date || '').slice(0, 10),
        totalAmount,
        settledAmount,
        balance: Math.max(0, totalAmount - settledAmount)
      }
    })
    .filter(row => row.totalAmount > 0)
}

export function buildPurchaseOrderAllocations(): OrderFundAllocation[] {
  const orders = readJsonOrders('purchase-orders').filter(o => String(o.auditStatus || '') === 'audited')
  const settled = buildPurchaseOrderSettlements()
  return orders
    .map(order => {
      const orderNo = resolveOrderNo(order)
      const totalAmount = parseFundAmount(order.amount)
      const settledAmount = settled.get(orderNo) || 0
      return {
        orderNo,
        partner: String(order.supplier || ''),
        orderDate: String(order.date || '').slice(0, 10),
        totalAmount,
        settledAmount,
        balance: Math.max(0, totalAmount - settledAmount)
      }
    })
    .filter(row => row.totalAmount > 0)
}

function paymentStatusFromAmounts(total: number, paid: number): string {
  if (paid <= 0) return 'notPaid'
  if (paid >= total) return 'paid'
  return 'partiallyPaid'
}

/** 按订单精确回写销售订单收付款状态 */
export function applySalesOrderSettlementToStorage(partner?: string): void {
  try {
    const raw = localStorage.getItem('sales-orders')
    if (!raw) return
    const orders = JSON.parse(raw) as Record<string, unknown>[]
    const settled = buildSalesOrderSettlements()
    const fundDocs = listFundDocuments()
    let changed = false

    const next = orders.map(order => {
      const p = String(order.customer || '')
      if (partner && p !== partner) return order
      if (String(order.auditStatus || '') !== 'audited') return order

      const orderNo = resolveOrderNo(order)
      const total = parseFundAmount(order.amount)
      const received = Math.min(total, settled.get(orderNo) || 0)
      const paymentStatus = paymentStatusFromAmounts(total, received)
      const linkedPreReceiptDocs = findPrepayFundDocsForOrder(fundDocs, order, 'preReceipt', 'customer')
      const prepaymentStatus =
        derivePrepaymentStatusFromFundDocs(linkedPreReceiptDocs) || String(order.prepaymentStatus || '')

      const prevReceived = parseFundAmount(order.receivedAmount)
      if (
        Math.abs(prevReceived - received) < 0.005 &&
        String(order.paymentStatus || '') === paymentStatus &&
        String(order.prepaymentStatus || '') === prepaymentStatus
      ) {
        return order
      }

      changed = true
      return { ...order, receivedAmount: received, paymentStatus, prepaymentStatus }
    })

    if (changed) localStorage.setItem('sales-orders', JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

/** 按订单精确回写采购订单付款状态 */
export function applyPurchaseOrderSettlementToStorage(partner?: string): void {
  try {
    const raw = localStorage.getItem('purchase-orders')
    if (!raw) return
    const orders = JSON.parse(raw) as Record<string, unknown>[]
    const settled = buildPurchaseOrderSettlements()
    const fundDocs = listFundDocuments()
    let changed = false

    const next = orders.map(order => {
      const p = String(order.supplier || '')
      if (partner && p !== partner) return order
      if (String(order.auditStatus || '') !== 'audited') return order

      const orderNo = resolveOrderNo(order)
      const total = parseFundAmount(order.amount)
      const paid = Math.min(total, settled.get(orderNo) || 0)
      const paymentStatus = paymentStatusFromAmounts(total, paid)
      const linkedPrePaymentDocs = findPrepayFundDocsForOrder(fundDocs, order, 'prePayment', 'supplier')
      const prepaymentStatus =
        derivePrepaymentStatusFromFundDocs(linkedPrePaymentDocs) || String(order.prepaymentStatus || '')
      const prevPaid = parseFundAmount(order.paidAmount)

      if (
        Math.abs(prevPaid - paid) < 0.005 &&
        String(order.paymentStatus || '') === paymentStatus &&
        String(order.prepaymentStatus || '') === prepaymentStatus
      ) {
        return order
      }

      changed = true
      return { ...order, paidAmount: paid, paymentStatus, prepaymentStatus }
    })

    if (changed) localStorage.setItem('purchase-orders', JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

/** 重新计算并回写全部或指定伙伴的订单收付状态 */
export function recalculateAllOrderSettlements(partner?: string): void {
  applySalesOrderSettlementToStorage(partner)
  applyPurchaseOrderSettlementToStorage(partner)
}
