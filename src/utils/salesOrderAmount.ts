/** 销售订单金额计算（列表/详情共用） */

export interface SalesOrderLine {
  productCode?: string
  productName?: string
  quantity?: number | string
  price?: number | string
  amount?: number | string
  [key: string]: unknown
}

export interface SalesOrderAmountInput {
  lines: SalesOrderLine[]
  discountRate?: number | string
  discountAmount?: number | string
  salesExpenses?: { amount?: number | string }[]
  customerExpenses?: { amount?: number | string }[]
}

export interface SalesOrderAmountResult {
  lineCount: number
  totalQuantity: number
  lineAmountTotal: number
  receivableAmount: number
  dealAmount: number
}

const round2 = (n: number) => Number(n.toFixed(2))

export const isValidSalesOrderLine = (row: SalesOrderLine): boolean => {
  const hasProduct = Boolean(String(row.productCode || '').trim() || String(row.productName || '').trim())
  const qty = Number(row.quantity) || 0
  return hasProduct && qty > 0
}

/** 计算单行金额并写回 row */
export const calcSalesLineAmount = (row: SalesOrderLine): SalesOrderLine => {
  const quantity = Number(row.quantity) || 0
  const price = Number(row.price) || 0
  row.amount = round2(quantity * price)
  return row
}

export const calcSalesOrderAmounts = (input: SalesOrderAmountInput): SalesOrderAmountResult => {
  const validLines = input.lines.filter(isValidSalesOrderLine)

  let totalQuantity = 0
  let lineAmountTotal = 0

  validLines.forEach(line => {
    calcSalesLineAmount(line)
    totalQuantity += Number(line.quantity) || 0
    lineAmountTotal += Number(line.amount) || 0
  })

  lineAmountTotal = round2(lineAmountTotal)

  const orderDiscountRate = Number(input.discountRate) || 0
  const orderDiscountAmount = Number(input.discountAmount) || 0
  const expenseTotal = (input.salesExpenses || []).reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  )
  const customerExpenseTotal = (input.customerExpenses || []).reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  )

  const orderDiscountByRate = round2(lineAmountTotal * orderDiscountRate / 100)
  const receivableAmount = round2(
    lineAmountTotal - orderDiscountByRate - orderDiscountAmount + expenseTotal + customerExpenseTotal
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
export const calcDealAmountFromSalesOrder = (order: Record<string, unknown>): string => {
  const lines = (order.detailItems || order.items || []) as SalesOrderLine[]
  if (!Array.isArray(lines) || lines.length === 0) {
    return String(order.amount || '¥0.00')
  }

  const result = calcSalesOrderAmounts({
    lines: lines.map(line => ({ ...line })),
    discountRate: order.discountRate,
    discountAmount: order.discountAmount,
    salesExpenses: order.salesExpenses as { amount?: number | string }[],
    customerExpenses: order.customerExpenses as { amount?: number | string }[]
  })
  return formatDealAmountStr(result.dealAmount)
}
