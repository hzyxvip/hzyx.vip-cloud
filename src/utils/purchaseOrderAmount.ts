/** 采购订单金额计算（列表/详情/协同共用） */

export interface PurchaseOrderLine {
  productCode?: string
  productName?: string
  quantity?: number | string
  unitPrice?: number | string
  discountRate?: number | string
  amount?: number | string
  auxUnitRatio?: number | string
  auxQuantity?: number | string
  retailPrice?: number | string
  retailTotal?: number | string
  [key: string]: unknown
}

export interface PurchaseOrderAmountInput {
  lines: PurchaseOrderLine[]
  discountRate?: number | string
  discountAmount?: number | string
  purchaseExpenses?: { amount?: number | string }[]
}

export interface PurchaseOrderAmountResult {
  lineCount: number
  totalQuantity: number
  lineAmountTotal: number
  receivableAmount: number
  dealAmount: number
}

const round2 = (n: number) => Number(n.toFixed(2))
const round3 = (n: number) => Number(n.toFixed(3))
const round4 = (n: number) => Number(n.toFixed(4))

export const isValidOrderLine = (row: PurchaseOrderLine): boolean => {
  const hasProduct = Boolean(String(row.productCode || '').trim() || String(row.productName || '').trim())
  const qty = Number(row.quantity) || 0
  return hasProduct && qty > 0
}

/** 计算单行金额：金额 = 数量 × 单价 × (1 - 折扣率%) */
export const calcLineAmounts = (row: PurchaseOrderLine): PurchaseOrderLine => {
  const quantity = Number(row.quantity) || 0
  const discountRate = Number(row.discountRate) || 0
  const discountFactor = 1 - discountRate / 100
  let unitPrice = Number(row.unitPrice) || 0
  const storedAmount = Number(row.amount) || 0

  if (quantity > 0 && unitPrice <= 0 && storedAmount > 0) {
    row.amount = round2(storedAmount)
    unitPrice = discountFactor > 0
      ? round4(row.amount / quantity / discountFactor)
      : round4(row.amount / quantity)
    row.unitPrice = unitPrice
  } else {
    row.amount = round2(quantity * unitPrice * discountFactor)
    if (unitPrice > 0) {
      row.unitPrice = round4(unitPrice)
    }
  }

  row.auxQuantity = round3(quantity * (Number(row.auxUnitRatio) || 1))
  row.retailTotal = round2((Number(row.retailPrice) || 0) * quantity)
  return row
}

export const calcPurchaseOrderAmounts = (input: PurchaseOrderAmountInput): PurchaseOrderAmountResult => {
  const validLines = input.lines.filter(isValidOrderLine)

  let totalQuantity = 0
  let lineAmountTotal = 0

  validLines.forEach(line => {
    calcLineAmounts(line)
    totalQuantity += Number(line.quantity) || 0
    lineAmountTotal += Number(line.amount) || 0
  })

  lineAmountTotal = round2(lineAmountTotal)

  const orderDiscountRate = Number(input.discountRate) || 0
  const orderDiscountAmount = Number(input.discountAmount) || 0
  const expenseTotal = (input.purchaseExpenses || []).reduce(
    (s, e) => s + (Number(e.amount) || 0),
    0
  )

  const orderDiscountByRate = round2(lineAmountTotal * orderDiscountRate / 100)
  const receivableAmount = round2(
    lineAmountTotal - orderDiscountByRate - orderDiscountAmount + expenseTotal
  )

  return {
    lineCount: validLines.length,
    totalQuantity,
    lineAmountTotal,
    receivableAmount,
    dealAmount: receivableAmount
  }
}

export const formatMoneyNumber = (val: number) =>
  Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatDealAmountStr = (val: number) => `¥${formatMoneyNumber(val)}`

/** 从已保存订单对象计算成交金额（列表刷新用） */
export const calcDealAmountFromOrder = (order: Record<string, unknown>): string => {
  const lines = (order.detailItems || order.items || []) as PurchaseOrderLine[]
  if (!Array.isArray(lines) || lines.length === 0) {
    return String(order.amount || '¥0.00')
  }

  const result = calcPurchaseOrderAmounts({
    lines: lines.map(l => ({ ...l })),
    discountRate: order.discountRate,
    discountAmount: order.discountAmount,
    purchaseExpenses: order.purchaseExpenses as { amount?: number | string }[]
  })
  return formatDealAmountStr(result.dealAmount)
}
