/** 采购订单金额计算（列表/详情/协同共用） */

export interface PurchaseOrderLine {
  productCode?: string
  productName?: string
  quantity?: number | string
  unitPrice?: number | string
  discountRate?: number | string
  taxRate?: number | string
  amount?: number | string
  taxAmount?: number | string
  taxIncludedAmount?: number | string
  taxIncludedUnitPrice?: number | string
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
  /** 单价是否为含税价录入，默认 false（不含税单价） */
  unitPriceIncludesTax?: boolean
}

export interface PurchaseOrderAmountResult {
  lineCount: number
  totalQuantity: number
  lineAmountTotal: number
  totalTaxAmount: number
  taxIncludedAmount: number
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

/** 计算单行金额并写回 row */
export const calcLineAmounts = (
  row: PurchaseOrderLine,
  unitPriceIncludesTax = false
): PurchaseOrderLine => {
  const quantity = Number(row.quantity) || 0
  let unitPrice = Number(row.unitPrice) || 0
  const discountRate = Number(row.discountRate) || 0
  const taxRate = Number(row.taxRate ?? 13)
  const discountFactor = 1 - discountRate / 100

  const storedTaxIncluded = Number(row.taxIncludedAmount) || 0
  const storedAmount = Number(row.amount) || 0

  // 重载时：有已保存价税合计/金额但单价缺失 → 反推，避免金额被清零
  if (quantity > 0 && unitPrice <= 0) {
    if (storedTaxIncluded > 0) {
      row.taxIncludedAmount = round2(storedTaxIncluded)
      row.amount = round2(storedTaxIncluded / (1 + taxRate / 100))
      row.taxAmount = round2(row.taxIncludedAmount - row.amount)
      row.unitPrice = discountFactor > 0
        ? round4(row.amount / quantity / discountFactor)
        : round4(row.amount / quantity)
      row.taxIncludedUnitPrice = unitPriceIncludesTax
        ? round4(Number(row.unitPrice) || row.unitPrice)
        : round4(row.unitPrice * (1 + taxRate / 100))
      row.auxQuantity = round3(quantity * (Number(row.auxUnitRatio) || 1))
      row.retailTotal = round2((Number(row.retailPrice) || 0) * quantity)
      return row
    }
    if (storedAmount > 0) {
      row.amount = round2(storedAmount)
      row.taxAmount = round2(row.amount * taxRate / 100)
      row.taxIncludedAmount = round2(row.amount + row.taxAmount)
      row.unitPrice = discountFactor > 0
        ? round4(row.amount / quantity / discountFactor)
        : round4(row.amount / quantity)
      row.taxIncludedUnitPrice = unitPriceIncludesTax
        ? round4(row.unitPrice)
        : round4(row.unitPrice * (1 + taxRate / 100))
      row.auxQuantity = round3(quantity * (Number(row.auxUnitRatio) || 1))
      row.retailTotal = round2((Number(row.retailPrice) || 0) * quantity)
      return row
    }
  }

  if (unitPriceIncludesTax) {
    row.taxIncludedAmount = round2(quantity * unitPrice * discountFactor)
    row.amount = round2(row.taxIncludedAmount / (1 + taxRate / 100))
    row.taxAmount = round2(row.taxIncludedAmount - row.amount)
    row.taxIncludedUnitPrice = round4(unitPrice)
  } else {
    row.amount = round2(quantity * unitPrice * discountFactor)
    row.taxIncludedUnitPrice = round4(unitPrice * (1 + taxRate / 100))
    row.taxAmount = round2(row.amount * taxRate / 100)
    row.taxIncludedAmount = round2(row.amount + row.taxAmount)
  }

  row.auxQuantity = round3(quantity * (Number(row.auxUnitRatio) || 1))
  row.retailTotal = round2((Number(row.retailPrice) || 0) * quantity)
  return row
}

export const calcPurchaseOrderAmounts = (input: PurchaseOrderAmountInput): PurchaseOrderAmountResult => {
  const unitPriceIncludesTax = input.unitPriceIncludesTax === true
  const validLines = input.lines.filter(isValidOrderLine)

  let totalQuantity = 0
  let lineAmountTotal = 0
  let totalTaxAmount = 0
  let taxIncludedAmount = 0

  validLines.forEach(line => {
    calcLineAmounts(line, unitPriceIncludesTax)
    totalQuantity += Number(line.quantity) || 0
    lineAmountTotal += Number(line.amount) || 0
    totalTaxAmount += Number(line.taxAmount) || 0
    taxIncludedAmount += Number(line.taxIncludedAmount) || 0
  })

  lineAmountTotal = round2(lineAmountTotal)
  totalTaxAmount = round2(totalTaxAmount)
  taxIncludedAmount = round2(taxIncludedAmount)

  const orderDiscountRate = Number(input.discountRate) || 0
  const orderDiscountAmount = Number(input.discountAmount) || 0
  const expenseTotal = (input.purchaseExpenses || []).reduce(
    (s, e) => s + (Number(e.amount) || 0),
    0
  )

  const orderDiscountByRate = round2(taxIncludedAmount * orderDiscountRate / 100)
  const receivableAmount = round2(
    taxIncludedAmount - orderDiscountByRate - orderDiscountAmount + expenseTotal
  )

  return {
    lineCount: validLines.length,
    totalQuantity,
    lineAmountTotal,
    totalTaxAmount,
    taxIncludedAmount,
    receivableAmount,
    /** 列表/对外展示的成交金额 = 应交金额 */
    dealAmount: receivableAmount
  }
}

export const formatMoneyNumber = (val: number) =>
  Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatDealAmountStr = (val: number) => `¥${formatMoneyNumber(val)}`

export const detectUnitPriceIncludesTax = (lines: PurchaseOrderLine[]): boolean => {
  const valid = lines.filter(isValidOrderLine)
  if (!valid.length) return false
  let matchIncluded = 0
  let matchExcluded = 0
  valid.forEach(line => {
    const qty = Number(line.quantity) || 0
    const price = Number(line.unitPrice) || 0
    const tax = Number(line.taxRate ?? 13)
    const disc = 1 - (Number(line.discountRate) || 0) / 100
    const stored = Number(line.taxIncludedAmount) || Number(line.amount) || 0
    if (!stored || !price || !qty) return
    const asIncluded = round2(qty * price * disc)
    const asExcluded = round2(qty * price * disc * (1 + tax / 100))
    if (Math.abs(stored - asIncluded) < 0.05 || Math.abs(stored - asIncluded * (1 + tax / 100)) < 0.05) {
      matchIncluded++
    }
    if (Math.abs(stored - asExcluded) < 0.05) {
      matchExcluded++
    }
  })
  return matchIncluded >= matchExcluded && matchIncluded > 0
}

/** 从已保存订单对象计算成交金额（列表刷新用） */
export const calcDealAmountFromOrder = (order: Record<string, unknown>): string => {
  const lines = (order.detailItems || order.items || []) as PurchaseOrderLine[]
  if (!Array.isArray(lines) || lines.length === 0) {
    return String(order.amount || '¥0.00')
  }

  const unitPriceIncludesTax =
    order.unitPriceIncludesTax === true
      ? true
      : order.unitPriceIncludesTax === false
        ? false
        : detectUnitPriceIncludesTax(lines)

  const result = calcPurchaseOrderAmounts({
    lines: lines.map(l => ({ ...l })),
    discountRate: order.discountRate,
    discountAmount: order.discountAmount,
    purchaseExpenses: order.purchaseExpenses as { amount?: number | string }[],
    unitPriceIncludesTax
  })
  return formatDealAmountStr(result.dealAmount)
}
