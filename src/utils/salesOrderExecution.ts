/** 按已审核销售出库单数量回写销售订单执行状态 */

const SALES_ORDERS_KEY = 'sales-orders'
const OUTBOUND_RECORDS_KEY = 'salesOutboundRecords'

export type ExecuteProgress = 'notExecuted' | 'partiallyExecuted' | 'allExecuted'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data))
}

export function calcExecuteProgress(ordered: number, done: number): ExecuteProgress {
  if (done <= 0) return 'notExecuted'
  if (done >= ordered) return 'allExecuted'
  return 'partiallyExecuted'
}

export function resolveSalesOrderRef(order: Record<string, unknown>): string {
  return String(order.orderNo || order.id || '').trim()
}

function matchSalesOrderRef(outbound: Record<string, unknown>, order: Record<string, unknown>): boolean {
  const ref = String(outbound.salesOrderNo || outbound.orderNo || '').trim()
  if (!ref) return false
  const orderNo = resolveSalesOrderRef(order)
  const orderId = String(order.id || '').trim()
  return ref === orderNo || ref === orderId
}

function isAuditedOutbound(outbound: Record<string, unknown>): boolean {
  const auditStatus = String(outbound.auditStatus || '')
  if (auditStatus === '已审核' || auditStatus === 'audited') return true
  return String(outbound.status || '') === 'completed'
}

function isCountableOutbound(outbound: Record<string, unknown>): boolean {
  if (String(outbound.closeStatus || '') === 'closed') return false
  if (String(outbound.status || '') === 'cancelled') return false
  return true
}

function sumLineQty(lines: Record<string, unknown>[]): number {
  return lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0)
}

/** 出库/订单明细行匹配键（同编码+规格合并扣减） */
export function buildSalesOutboundLineKey(line: Record<string, unknown>): string {
  const code = String(line.productCode || '').trim()
  const spec = String(line.spec || '').trim()
  if (code) return `${code}|${spec}`
  const name = String(line.productName || '').trim()
  return name ? `name:${name}|${spec}` : `row:${String(line.id || '')}`
}

function getOrderDetailItems(order: Record<string, unknown>): Record<string, unknown>[] {
  const detailItems = order.detailItems
  if (Array.isArray(detailItems) && detailItems.length > 0) {
    return detailItems as Record<string, unknown>[]
  }
  const items = order.items
  if (Array.isArray(items) && items.length > 0) {
    return items as Record<string, unknown>[]
  }
  return []
}

function scaleLineQuantity(line: Record<string, unknown>, qty: number): Record<string, unknown> {
  const unitPrice = Number(line.price ?? line.unitPrice ?? 0)
  const discount = Number(line.discount ?? 0)
  const amount = Number((qty * unitPrice).toFixed(2))
  const netAmount = Number((amount * (1 - discount / 100)).toFixed(2))
  return {
    ...line,
    quantity: qty,
    price: unitPrice,
    unitPrice,
    amount,
    netAmount
  }
}

export function sumAuditedOutboundQtyByLineKey(
  order: Record<string, unknown>,
  options?: {
    outboundList?: Record<string, unknown>[]
    excludeOutboundNo?: string
  }
): Map<string, number> {
  const list = options?.outboundList ?? readJson<Record<string, unknown>[]>(OUTBOUND_RECORDS_KEY, [])
  const exclude = String(options?.excludeOutboundNo || '').trim()
  const totals = new Map<string, number>()

  list
    .filter(ob => {
      if (!isCountableOutbound(ob) || !isAuditedOutbound(ob) || !matchSalesOrderRef(ob, order)) {
        return false
      }
      if (!exclude) return true
      const outboundNo = String(ob.outboundNo || ob.id || '').trim()
      return outboundNo !== exclude
    })
    .forEach(ob => {
      const lines = (ob.items || ob.outboundItems || []) as Record<string, unknown>[]
      lines.forEach(line => {
        const qty = Number(line.quantity) || 0
        if (qty <= 0) return
        const key = buildSalesOutboundLineKey(line)
        totals.set(key, (totals.get(key) || 0) + qty)
      })
    })

  return totals
}

/** 按已审核出库扣减，返回仍可出库的订单明细（数量为剩余量） */
export function derivePendingOrderItemsForOutbound(
  order: Record<string, unknown>,
  options?: { excludeOutboundNo?: string; outboundList?: Record<string, unknown>[] }
): Record<string, unknown>[] {
  const detailItems = getOrderDetailItems(order)
  if (!detailItems.length) return []

  const outboundByKey = sumAuditedOutboundQtyByLineKey(order, options)
  const pendingKeys = new Map(outboundByKey)
  const result: Record<string, unknown>[] = []

  detailItems.forEach(line => {
    const ordered = Number(line.quantity) || 0
    if (ordered <= 0) return

    const key = buildSalesOutboundLineKey(line)
    const outDone = pendingKeys.get(key) || 0
    const allocate = Math.min(ordered, outDone)
    pendingKeys.set(key, outDone - allocate)
    const remaining = ordered - allocate
    if (remaining <= 0) return

    result.push(scaleLineQuantity(line, remaining))
  })

  return result
}

export function sumOrderOrderedQty(order: Record<string, unknown>): number {
  const detailItems = (order.detailItems || []) as Record<string, unknown>[]
  if (Array.isArray(detailItems) && detailItems.length > 0) {
    return detailItems.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0)
  }
  const items = order.items
  if (Array.isArray(items) && items.length > 0) {
    return sumLineQty(items)
  }
  const parsed = Number.parseInt(String(order.itemCount || '0'), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function sumAuditedOutboundQtyForSalesOrder(
  order: Record<string, unknown>,
  outboundList?: Record<string, unknown>[]
): number {
  const list = outboundList ?? readJson<Record<string, unknown>[]>(OUTBOUND_RECORDS_KEY, [])
  return list
    .filter(
      ob => isCountableOutbound(ob) && isAuditedOutbound(ob) && matchSalesOrderRef(ob, order)
    )
    .reduce((sum, ob) => {
      const lines = (ob.items || ob.outboundItems || []) as Record<string, unknown>[]
      return sum + sumLineQty(lines)
    }, 0)
}

export function deriveSalesOrderExecuteStatus(
  order: Record<string, unknown>,
  outboundList?: Record<string, unknown>[]
): ExecuteProgress {
  const ordered = sumOrderOrderedQty(order)
  if (ordered <= 0) return 'notExecuted'
  const done = sumAuditedOutboundQtyForSalesOrder(order, outboundList)
  return calcExecuteProgress(ordered, done)
}

/** 重新计算并回写全部或指定销售订单的执行状态 */
export function syncSalesOrderExecuteStatus(orderKey?: string): void {
  const orders = readJson<Record<string, unknown>[]>(SALES_ORDERS_KEY, [])
  const outboundList = readJson<Record<string, unknown>[]>(OUTBOUND_RECORDS_KEY, [])
  const key = String(orderKey || '').trim()
  let changed = false

  const next = orders.map(order => {
    const orderNo = resolveSalesOrderRef(order)
    const orderId = String(order.id || '').trim()
    if (key && key !== orderNo && key !== orderId) return order

    const executeStatus = deriveSalesOrderExecuteStatus(order, outboundList)
    if (String(order.executeStatus || 'notExecuted') === executeStatus) return order

    changed = true
    return { ...order, executeStatus }
  })

  if (changed) writeJson(SALES_ORDERS_KEY, next)
}

export function syncSalesOrderExecuteStatusFromOutbound(outbound: Record<string, unknown>): void {
  const ref = String(outbound.salesOrderNo || outbound.orderNo || '').trim()
  if (ref) syncSalesOrderExecuteStatus(ref)
}
