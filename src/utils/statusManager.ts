/**
 * 统一状态管理和显示逻辑工具
 * 用于医享云进销存系统各单据状态的统一管理
 */

// 审核状态
export const auditStatusOptions = [
  { label: '未审核', value: 'notAudited', type: 'info' },
  { label: '已审核', value: 'audited', type: 'success' },
  { label: '已驳回', value: 'rejected', type: 'danger' }
]

// 执行状态
export const executeStatusOptions = [
  { label: '未执行', value: 'notExecuted', type: 'info' },
  { label: '部分执行', value: 'partiallyExecuted', type: 'warning' },
  { label: '全部执行', value: 'allExecuted', type: 'success' }
]

// 采购入库状态
export const warehouseInStatusOptions = [
  { label: '未入库', value: 'notInWarehoused', type: 'info' },
  { label: '部分入库', value: 'partiallyInWarehoused', type: 'warning' },
  { label: '全部入库', value: 'allInWarehoused', type: 'success' }
]

// 销售出库状态
export const warehouseOutStatusOptions = [
  { label: '未出库', value: 'notOutWarehoused', type: 'info' },
  { label: '部分出库', value: 'partiallyOutWarehoused', type: 'warning' },
  { label: '全部出库', value: 'allOutWarehoused', type: 'success' }
]

// 关闭状态
export const closeStatusOptions = [
  { label: '未关闭', value: 'notClosed', type: 'info' },
  { label: '已关闭', value: 'closed', type: 'success' },
  { label: '手动关闭', value: 'manualClosed', type: 'warning' }
]

// 预付款/预收款审核状态
export const prepaymentAuditStatusOptions = [
  { label: '未审核', value: 'notAudited', type: 'info' },
  { label: '部分审核', value: 'partiallyAudited', type: 'warning' },
  { label: '已审核', value: 'audited', type: 'success' }
]

// 接单状态
export const receiveStatusOptions = [
  { label: '已接单', value: 'received', type: 'success' },
  { label: '未接单', value: 'notReceived', type: 'info' }
]

// 确认状态
export const confirmStatusOptions = [
  { label: '未确认', value: 'notConfirmed', type: 'info' },
  { label: '已确认', value: 'confirmed', type: 'success' }
]

// 发货状态
export const deliveryStatusOptions = [
  { label: '未发货', value: 'notDelivered', type: 'info' },
  { label: '已发货', value: 'delivered', type: 'success' }
]

// 签收状态
export const signStatusOptions = [
  { label: '未签收', value: 'notSigned', type: 'info' },
  { label: '已签收', value: 'signed', type: 'success' }
]

// 对方入库状态（协同回写，原「对方已签收」）
export const counterpartyInboundStatusOptions = [
  { label: '未入库', value: 'notInStock', type: 'info' },
  { label: '对方已入库', value: 'inStock', type: 'success' }
]

// 收款状态
export const paymentStatusOptions = [
  { label: '未收款', value: 'notPaid', type: 'info' },
  { label: '部分收款', value: 'partiallyPaid', type: 'warning' },
  { label: '已收款', value: 'paid', type: 'success' }
]

// 付款状态
export const payStatusOptions = [
  { label: '未付款', value: 'notPaid', type: 'info' },
  { label: '部分付款', value: 'partiallyPaid', type: 'warning' },
  { label: '已付款', value: 'paid', type: 'success' }
]

// 单据状态（通用）
export const documentStatusOptions = [
  { label: '草稿', value: 'draft', type: 'info' },
  { label: '待审核', value: 'pending', type: 'warning' },
  { label: '审核中', value: 'processing', type: 'warning' },
  { label: '已完成', value: 'completed', type: 'success' },
  { label: '已作废', value: 'cancelled', type: 'danger' },
  { label: '已驳回', value: 'rejected', type: 'danger' }
]

// 物流公司映射
export const logisticsCompanyMap: Record<string, string> = {
  sf: '顺丰速运',
  yt: '圆通速递',
  zt: '中通快递',
  st: '申通快递',
  yd: '韵达快递',
  ems: 'EMS',
  jd: '京东物流',
  db: '德邦物流',
  self: '上门自提'
}

// 物流公司列表
export const logisticsCompanyOptions = Object.entries(logisticsCompanyMap).map(([value, label]) => ({
  label,
  value
}))

// 仓库列表
export const warehouseOptions = [
  { label: '北京仓库', value: 'beijing', code: 'WH001' },
  { label: '上海仓库', value: 'shanghai', code: 'WH002' },
  { label: '广州仓库', value: 'guangzhou', code: 'WH003' },
  { label: '深圳仓库', value: 'shenzhen', code: 'WH004' }
]

// 状态格式化函数
export const formatStatus = (status: string, options: Array<{ label: string; value: string; type: string }>) => {
  const option = options.find(o => o.value === status)
  return option ? { label: option.label, type: option.type } : { label: status, type: 'info' }
}

// 获取状态类型
export const getStatusType = (status: string, options: Array<{ label: string; value: string; type: string }>) => {
  const option = options.find(o => o.value === status)
  return option ? option.type : 'info'
}

// 获取状态标签
export const getStatusLabel = (status: string, options: Array<{ label: string; value: string; type: string }>) => {
  const option = options.find(o => o.value === status)
  return option ? option.label : status
}

// 单据流转状态映射（用于显示关联单据的状态）
export const documentFlowStatusMap: Record<string, { label: string; type: string }> = {
  // 采购订单状态
  'PO-pending': { label: '待审核', type: 'warning' },
  'PO-approved': { label: '已审核', type: 'success' },
  'PO-completed': { label: '已完成', type: 'success' },
  'PO-rejected': { label: '已驳回', type: 'danger' },
  
  // 销售订单状态
  'SO-pending': { label: '待审核', type: 'warning' },
  'SO-approved': { label: '已审核', type: 'success' },
  'SO-completed': { label: '已完成', type: 'success' },
  'SO-rejected': { label: '已驳回', type: 'danger' },
  
  // 销售出库状态
  'OUT-pending': { label: '待确认', type: 'info' },
  'OUT-confirmed': { label: '已确认', type: 'warning' },
  'OUT-audited': { label: '已审核', type: 'success' },
  'OUT-outbound': { label: '已出库', type: 'success' },
  'OUT-signed': { label: '已签收', type: 'success' },
  
  // 采购入库状态
  'IN-pending': { label: '待审核', type: 'warning' },
  'IN-processing': { label: '审核中', type: 'warning' },
  'IN-completed': { label: '已完成', type: 'success' },
  'IN-cancelled': { label: '已作废', type: 'danger' }
}

// 获取单据流转状态
export const getDocumentFlowStatus = (docType: string, status: string) => {
  const key = `${docType}-${status}`
  return documentFlowStatusMap[key] || { label: status, type: 'info' }
}

// 时间预设选项
export const timePresets = [
  { label: '当月', value: 'thisMonth' },
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '本周', value: 'thisWeek' },
  { label: '上月', value: 'lastMonth' },
  { label: '近三个月', value: 'last3Months' },
  { label: '近半年', value: 'halfYear' },
  { label: '近一年', value: 'lastYear' }
]

// 计算日期范围
export const getDateRange = (preset: string): [Date, Date] | null => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (preset) {
    case 'thisMonth':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      return [monthStart, today]
    case 'today':
      return [today, today]
    case 'yesterday':
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return [yesterday, yesterday]
    case 'thisWeek':
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      return [weekStart, today]
    case 'lastMonth':
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      return [lastMonthStart, lastMonthEnd]
    case 'last3Months':
      const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1)
      return [threeMonthsAgo, today]
    case 'halfYear':
      const halfYearAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1)
      return [halfYearAgo, today]
    case 'lastYear':
      const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
      return [yearAgo, today]
    default:
      return null
  }
}
