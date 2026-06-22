<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTableStyle } from '@/composables/useTableStyle'
import {
  onSalesOrderAudited,
  approveModificationRequest,
  hasPendingModification
} from '@/utils/platformCollaborationService'

const router = useRouter()
const showAdvancedFilter = ref(true)

const operationLogs = ref<any[]>(JSON.parse(localStorage.getItem('sales-operation-logs') || '[]'))

const addOperationLog = (orderId: string, operationType: string, operator: string, remark: string) => {
  const log = {
    id: Date.now(),
    orderId,
    operationType,
    operator,
    operationTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    remark
  }
  operationLogs.value.unshift(log)
  localStorage.setItem('sales-operation-logs', JSON.stringify(operationLogs.value))
}

const timePresets = [
  { label: '当月', value: 'thisMonth' },
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '本周', value: 'thisWeek' },
  { label: '上月', value: 'lastMonth' },
  { label: '近三个月', value: 'last3Months' },
  { label: '近半年', value: 'halfYear' },
  { label: '近一年', value: 'lastYear' }
]

const businessProcessOptions = [
  { label: '全部流程', value: '' },
  { label: '标准销售', value: 'standard' },
  { label: '跨公司销售', value: 'crossCompany' },
  { label: '平台销售', value: 'platform' }
]

const auditStatusOptions = [
  { label: '未审核', value: 'notAudited' },
  { label: '已审核', value: 'audited' }
]

const executeStatusOptions = [
  { label: '未执行', value: 'notExecuted' },
  { label: '部分执行', value: 'partiallyExecuted' },
  { label: '全部执行', value: 'allExecuted' }
]

const warehouseStatusOptions = [
  { label: '未出库', value: 'notOutWarehoused' },
  { label: '部分出库', value: 'partiallyOutWarehoused' },
  { label: '全部出库', value: 'allOutWarehoused' }
]

const closeStatusOptions = [
  { label: '未关闭', value: 'notClosed' },
  { label: '已关闭', value: 'closed' },
  { label: '手动关闭', value: 'manualClosed' }
]

const prepaymentAuditOptions = [
  { label: '已预收未审核', value: 'prepaidNotAudited' },
  { label: '已预收部分审核', value: 'prepaidPartiallyAudited' },
  { label: '已预收已审核', value: 'prepaidAudited' }
]

const receiveStatusFilterOptions = [
  { label: '已接单', value: 'received' },
  { label: '未接单', value: 'notReceived' }
]

const toDateKey = (value: Date | string | null | undefined): string => {
  if (!value) return ''
  if (typeof value === 'string') {
    const matched = value.match(/^(\d{4}-\d{2}-\d{2})/)
    if (matched) return matched[1]
  }
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const getDateRange = (preset: string): [Date, Date] | null => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (preset) {
    case 'thisMonth':
      return [new Date(today.getFullYear(), today.getMonth(), 1), today]
    case 'today':
      return [today, today]
    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return [yesterday, yesterday]
    }
    case 'thisWeek': {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      return [weekStart, today]
    }
    case 'lastMonth':
      return [
        new Date(today.getFullYear(), today.getMonth() - 1, 1),
        new Date(today.getFullYear(), today.getMonth(), 0)
      ]
    case 'last3Months':
      return [new Date(today.getFullYear(), today.getMonth() - 3, 1), today]
    case 'halfYear':
      return [new Date(today.getFullYear(), today.getMonth() - 6, 1), today]
    case 'lastYear':
      return [new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()), today]
    default:
      return null
  }
}

const ALL_FILTER_VALUE = '__all__'

type StatusFilterField =
  | 'auditStatus'
  | 'executeStatus'
  | 'warehouseStatus'
  | 'closeStatus'
  | 'prepaymentStatus'
  | 'receiveStatus'

const searchForm = ref({
  keyword: '',
  businessProcess: '',
  selectedPreset: 'thisMonth',
  dateRange: [] as Date[],
  auditStatus: ALL_FILTER_VALUE,
  executeStatus: ALL_FILTER_VALUE,
  warehouseStatus: ALL_FILTER_VALUE,
  closeStatus: ALL_FILTER_VALUE,
  prepaymentStatus: ALL_FILTER_VALUE,
  receiveStatus: ALL_FILTER_VALUE
})

const filterGroupsRow1 = [
  { field: 'auditStatus' as StatusFilterField, label: '审核状态', options: auditStatusOptions },
  { field: 'executeStatus' as StatusFilterField, label: '执行状态', options: executeStatusOptions },
  { field: 'warehouseStatus' as StatusFilterField, label: '出库状态', options: warehouseStatusOptions }
]

const filterGroupsRow2 = [
  { field: 'closeStatus' as StatusFilterField, label: '关闭状态', options: closeStatusOptions },
  { field: 'prepaymentStatus' as StatusFilterField, label: '预收单据', options: prepaymentAuditOptions },
  { field: 'receiveStatus' as StatusFilterField, label: '接单状态', options: receiveStatusFilterOptions }
]

const withAllOption = (options: { label: string; value: string }[]) => [
  { label: '全选', value: ALL_FILTER_VALUE },
  ...options
]

const currentPage = ref(1)
const pageSize = ref(10)

const tableData = ref<any[]>([])

const defaultData = [
  { id: 'SO20260620001', orderNo: 'SO-20260620-0001', customer: '北京协和医院', customerCode: 'KH001', warehouse: '北京仓库', date: '2026-06-20', amount: '¥12,500.00', itemCount: 5, auditStatus: 'notAudited', executeStatus: 'notExecuted', warehouseStatus: 'notOutWarehoused', closeStatus: 'notClosed', prepaymentStatus: '', receiveStatus: 'notReceived', status: 'pending', creator: '系统管理员' },
  { id: 'SO20260619002', orderNo: 'SO-20260619-0002', customer: '上海瑞金医院', customerCode: 'KH002', warehouse: '上海仓库', date: '2026-06-19', amount: '¥28,800.00', itemCount: 8, auditStatus: 'audited', executeStatus: 'allExecuted', warehouseStatus: 'allOutWarehoused', closeStatus: 'closed', prepaymentStatus: 'prepaidAudited', receiveStatus: 'received', status: 'completed', creator: '系统管理员' },
  { id: 'SO20260618003', orderNo: 'SO-20260618-0003', customer: '广州中山医院', customerCode: 'KH003', warehouse: '广州仓库', date: '2026-06-18', amount: '¥15,200.00', itemCount: 3, auditStatus: 'audited', executeStatus: 'allExecuted', warehouseStatus: 'allOutWarehoused', closeStatus: 'notClosed', prepaymentStatus: 'prepaidPartiallyAudited', receiveStatus: 'received', status: 'processing', creator: '系统管理员' },
  { id: 'SO20260617004', orderNo: 'SO-20260617-0004', customer: '深圳人民医院', customerCode: 'KH004', warehouse: '深圳仓库', date: '2026-06-17', amount: '¥45,600.00', itemCount: 12, auditStatus: 'notAudited', executeStatus: 'partiallyExecuted', warehouseStatus: 'partiallyOutWarehoused', closeStatus: 'manualClosed', prepaymentStatus: '', receiveStatus: 'notReceived', status: 'pending', creator: '系统管理员' },
  { id: 'SO20260616005', orderNo: 'SO-20260616-0005', customer: '杭州第一医院', customerCode: 'KH005', warehouse: '北京仓库', date: '2026-06-16', amount: '¥8,900.00', itemCount: 2, auditStatus: 'audited', executeStatus: 'notExecuted', warehouseStatus: 'notOutWarehoused', closeStatus: 'notClosed', prepaymentStatus: 'prepaidAudited', receiveStatus: 'received', status: 'processing', creator: '系统管理员' },
  { id: 'SO20260615006', orderNo: 'SO-20260615-0006', customer: '成都华西医院', customerCode: 'KH006', warehouse: '上海仓库', date: '2026-06-15', amount: '¥35,000.00', itemCount: 6, auditStatus: 'audited', executeStatus: 'partiallyExecuted', warehouseStatus: 'partiallyOutWarehoused', closeStatus: 'closed', prepaymentStatus: 'prepaidPartiallyAudited', receiveStatus: 'notReceived', status: 'processing', creator: '系统管理员' },
  { id: 'SO20260614007', orderNo: 'SO-20260614-0007', customer: '北京协和医院', customerCode: 'KH001', warehouse: '广州仓库', date: '2026-06-14', amount: '¥9,500.00', itemCount: 3, auditStatus: 'notAudited', executeStatus: 'notExecuted', warehouseStatus: 'notOutWarehoused', closeStatus: 'manualClosed', prepaymentStatus: '', receiveStatus: 'notReceived', status: 'cancelled', creator: '系统管理员' },
  { id: 'SO20260613008', orderNo: 'SO-20260613-0008', customer: '上海瑞金医院', customerCode: 'KH002', warehouse: '深圳仓库', date: '2026-06-13', amount: '¥18,900.00', itemCount: 6, auditStatus: 'audited', executeStatus: 'allExecuted', warehouseStatus: 'allOutWarehoused', closeStatus: 'closed', prepaymentStatus: '', receiveStatus: 'received', status: 'completed', creator: '系统管理员' }
]

const auditStatusLabels: Record<string, string> = {
  notAudited: '未审核',
  audited: '已审核'
}

const executeStatusLabels: Record<string, string> = {
  notExecuted: '未执行',
  partiallyExecuted: '部分执行',
  allExecuted: '全部执行'
}

const warehouseStatusLabels: Record<string, string> = {
  notOutWarehoused: '未出库',
  partiallyOutWarehoused: '部分出库',
  allOutWarehoused: '全部出库'
}

const closeStatusLabels: Record<string, string> = {
  notClosed: '未关闭',
  closed: '已关闭',
  manualClosed: '手动关闭'
}

const prepaymentLabels: Record<string, string> = {
  prepaidNotAudited: '已预收未审核',
  prepaidPartiallyAudited: '已预收部分审核',
  prepaidAudited: '已预收已审核'
}

const receiveStatusLabels: Record<string, string> = {
  received: '已接单',
  notReceived: '未接单'
}

const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: '待处理', color: 'info' },
  processing: { text: '进行中', color: 'warning' },
  completed: { text: '已完成', color: 'success' },
  cancelled: { text: '已取消', color: 'danger' }
}

const { columnWidths, handleHeaderDragend } = useTableStyle('sales-order-list', [
  { key: 'orderNo', label: '订单号', defaultWidth: 150 },
  { key: 'customer', label: '客户', defaultWidth: 180 },
  { key: 'date', label: '下单日期', defaultWidth: 110 },
  { key: 'itemCount', label: '商品种类', defaultWidth: 90 },
  { key: 'amount', label: '成交金额', defaultWidth: 120 },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 90 },
  { key: 'executeStatus', label: '执行状态', defaultWidth: 100 },
  { key: 'warehouseStatus', label: '出库状态', defaultWidth: 100 },
  { key: 'closeStatus', label: '关闭状态', defaultWidth: 100 },
  { key: 'prepaymentStatus', label: '预收单据', defaultWidth: 130 },
  { key: 'receiveStatus', label: '接单状态', defaultWidth: 90 },
  { key: 'status', label: '状态', defaultWidth: 90 }
])

const normalizeSavedOrder = (o: Record<string, unknown>) => ({
  ...o,
  orderNo: o.orderNo || o.id,
  itemCount: o.itemCount || parseInt(String(o.items || '0'), 10) || 0,
  auditStatus: o.auditStatus || 'notAudited',
  executeStatus: o.executeStatus || 'notExecuted',
  warehouseStatus: o.warehouseStatus || 'notOutWarehoused',
  closeStatus: o.closeStatus || 'notClosed',
  receiveStatus: o.receiveStatus || 'notReceived',
  status: o.status || 'pending',
  amount: o.amount || '¥0.00'
})

const loadData = () => {
  const savedOrders = JSON.parse(localStorage.getItem('sales-orders') || '[]')
  const existingIds = new Set(defaultData.map(item => item.id))
  const newOrders = savedOrders
    .filter((o: Record<string, unknown>) => !existingIds.has(String(o.id)))
    .map(normalizeSavedOrder)
  tableData.value = [...newOrders, ...defaultData.map(row => {
    const saved = savedOrders.find((o: Record<string, unknown>) => o.id === row.id)
    return saved ? normalizeSavedOrder({ ...row, ...saved }) : row
  })]
}

const formatLocalDateTime = (d = new Date()) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}:${s}`
}

const persistOrderChanges = (orderId: string, changes: Record<string, any>) => {
  const orders = JSON.parse(localStorage.getItem('sales-orders') || '[]')
  const row = tableData.value.find(r => r.id === orderId)
  if (row) Object.assign(row, changes)

  const index = orders.findIndex((o: any) => o.id === orderId)
  if (index > -1) {
    orders[index] = { ...orders[index], ...changes }
  } else if (row) {
    orders.unshift({ ...row })
  }
  localStorage.setItem('sales-orders', JSON.stringify(orders))
}

const canUnAuditOrder = (row: any) =>
  row.auditStatus === 'audited' && row.warehouseStatus === 'notOutWarehoused'

const canDeleteOrder = (row: any) =>
  row.auditStatus === 'notAudited' && row.closeStatus === 'notClosed'

const selectedRows = ref<any[]>([])

const filteredData = computed(() => {
  return tableData.value.filter(row => {
    if (searchForm.value.keyword) {
      const keywords = searchForm.value.keyword.trim().split(/\s+/).filter(Boolean)
      const fields = [
        row.orderNo,
        row.customer,
        row.customerCode,
        row.creator,
        row.remark || ''
      ].map(v => String(v).toLowerCase())
      if (!keywords.every(kw => fields.some(f => f.includes(kw.toLowerCase())))) return false
    }

    if (searchForm.value.dateRange.length === 2) {
      const itemKey = toDateKey(row.date)
      const startKey = toDateKey(searchForm.value.dateRange[0])
      const endKey = toDateKey(searchForm.value.dateRange[1])
      if (!itemKey || itemKey < startKey || itemKey > endKey) return false
    }

    if (!matchStatusFilter(row.auditStatus, searchForm.value.auditStatus)) return false
    if (!matchStatusFilter(row.executeStatus, searchForm.value.executeStatus)) return false
    if (!matchStatusFilter(row.warehouseStatus, searchForm.value.warehouseStatus)) return false
    if (!matchStatusFilter(row.closeStatus, searchForm.value.closeStatus)) return false
    if (!matchStatusFilter(row.prepaymentStatus, searchForm.value.prepaymentStatus)) return false
    if (!matchStatusFilter(row.receiveStatus, searchForm.value.receiveStatus)) return false

    return true
  })
})

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

const matchStatusFilter = (rowValue: string, filterValue: string) => {
  if (!filterValue || filterValue === ALL_FILTER_VALUE) return true
  return rowValue === filterValue
}

const selectFilter = (field: StatusFilterField, value: string) => {
  searchForm.value[field] = value
}

const isFilterActive = (field: StatusFilterField, value: string) => {
  if (value === ALL_FILTER_VALUE) return false
  return searchForm.value[field] === value
}

const migrateSavedFilter = (value: unknown) => {
  if (Array.isArray(value)) return value.length === 1 ? value[0] : ALL_FILTER_VALUE
  if (typeof value === 'string' && value) return value
  return ALL_FILTER_VALUE
}

const getSelectedRow = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择一条销售订单')
    return null
  }
  if (selectedRows.value.length > 1) {
    ElMessage.warning('请只选择一条销售订单')
    return null
  }
  return selectedRows.value[0]
}

const handleSelectionChange = (val: any[]) => {
  selectedRows.value = val
}

const handleCreate = () => router.push('/sales/order-list/create')

const handleEdit = () => {
  const row = getSelectedRow()
  if (row) router.push(`/sales/order-list/create/${row.id}`)
}

const handleView = () => {
  const row = getSelectedRow()
  if (row) router.push(`/sales/order-list/create/${row.id}`)
}

const handlePrint = () => {
  const row = getSelectedRow()
  if (row) ElMessage.success(`正在打印订单 ${row.orderNo}`)
}

const handleAudit = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请至少选择一条销售订单')
    return
  }
  const targets = selectedRows.value.filter(row => row.auditStatus !== 'audited')
  if (targets.length === 0) {
    ElMessage.info('所选订单均已审核')
    return
  }

  ElMessageBox.confirm(`确定要审核选中的 ${targets.length} 条销售订单吗？`, '审核确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    const auditTime = formatLocalDateTime()
    const orders = JSON.parse(localStorage.getItem('sales-orders') || '[]')
    targets.forEach(row => {
      persistOrderChanges(row.id, {
        auditStatus: 'audited',
        auditor: '系统管理员',
        auditTime,
        status: row.status === 'pending' ? 'processing' : row.status,
        receiveStatus: 'received'
      })
      const fullOrder = orders.find((o: any) => o.id === row.id) || row
      onSalesOrderAudited(fullOrder)
      addOperationLog(row.id, 'audit', '系统管理员', '审核销售订单')
    })
    ElMessage.success(`已成功审核 ${targets.length} 条订单`)
  }).catch(() => {})
}

const handleUnAudit = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请至少选择一条销售订单')
    return
  }
  const targets = selectedRows.value.filter(row => row.auditStatus === 'audited')
  if (targets.length === 0) {
    ElMessage.info('所选订单均未审核')
    return
  }
  const blocked = targets.filter(row => !canUnAuditOrder(row))
  if (blocked.length > 0) {
    ElMessage.warning('已出库的订单不能反审核，请使用申请修改或关闭')
    return
  }
  ElMessageBox.confirm(`确定要反审核选中的 ${targets.length} 条销售订单吗？`, '反审核确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    targets.forEach(row => {
      persistOrderChanges(row.id, {
        auditStatus: 'notAudited',
        auditor: '',
        auditTime: '',
        status: row.status === 'processing' ? 'pending' : row.status
      })
      addOperationLog(row.id, 'unaudit', '系统管理员', '反审核销售订单')
    })
    ElMessage.success(`已成功反审核 ${targets.length} 条订单`)
  }).catch(() => {})
}

const auditActionLabel = computed(() => {
  if (selectedRows.value.length === 0) return '审核'
  return selectedRows.value.every(row => row.auditStatus === 'audited') ? '反审核' : '审核'
})

const handleAuditToggle = () => {
  if (auditActionLabel.value === '反审核') {
    handleUnAudit()
  } else {
    handleAudit()
  }
}

const requireSelection = (multiple = true) => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning(multiple ? '请至少选择一条销售订单' : '请先选择一条销售订单')
    return false
  }
  if (!multiple && selectedRows.value.length > 1) {
    ElMessage.warning('请只选择一条销售订单')
    return false
  }
  return true
}

const handleDelete = () => {
  if (!requireSelection()) return
  const deletable = selectedRows.value.filter(canDeleteOrder)
  const blocked = selectedRows.value.filter(row => !canDeleteOrder(row))

  if (deletable.length === 0) {
    ElMessage.warning('仅未审核、未关闭的销售订单允许删除')
    return
  }

  const skipTip = blocked.length > 0 ? `（${blocked.length} 条不符合删除条件，将自动跳过）` : ''
  ElMessageBox.confirm(
    `确定要删除选中的 ${deletable.length} 条销售订单吗？此操作不可恢复！${skipTip}`,
    '删除确认',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'error' }
  ).then(() => {
    const ids = new Set(deletable.map(row => row.id))
    tableData.value = tableData.value.filter(row => !ids.has(row.id))
    const orders = JSON.parse(localStorage.getItem('sales-orders') || '[]')
    localStorage.setItem(
      'sales-orders',
      JSON.stringify(orders.filter((o: any) => !ids.has(o.id)))
    )
    deletable.forEach(row => addOperationLog(row.id, 'delete', '系统管理员', '删除销售订单'))
    selectedRows.value = []
    ElMessage.success(`已成功删除 ${deletable.length} 条订单`)
  }).catch(() => {})
}

const handleEnable = () => {
  if (!requireSelection()) return
  selectedRows.value.forEach(row => {
    persistOrderChanges(row.id, {
      status: row.status === 'cancelled' ? 'pending' : row.status,
      closeStatus: row.closeStatus === 'closed' || row.closeStatus === 'manualClosed' ? 'notClosed' : row.closeStatus
    })
    addOperationLog(row.id, 'enable', '系统管理员', '启用销售订单')
  })
  ElMessage.success(`已启用 ${selectedRows.value.length} 条订单`)
}

const handleClose = () => {
  if (!requireSelection()) return
  ElMessageBox.confirm(
    `确定要关闭选中的 ${selectedRows.value.length} 条销售订单吗？`,
    '关闭确认',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
  ).then(() => {
    selectedRows.value.forEach(row => {
      persistOrderChanges(row.id, { closeStatus: 'closed', status: 'cancelled' })
      addOperationLog(row.id, 'close', '系统管理员', '关闭销售订单')
    })
    ElMessage.success(`已关闭 ${selectedRows.value.length} 条订单`)
  }).catch(() => {})
}

const handleOutbound = () => {
  if (!requireSelection(false)) return
  const row = selectedRows.value[0]
  if (row.auditStatus !== 'audited') {
    ElMessage.warning('请先审核销售订单后再出库')
    return
  }
  router.push({ path: '/sales/outbound', query: { orderId: row.id } })
}

const handleBatchModify = () => {
  if (!requireSelection()) return
  ElMessage.info(`批量修改：已选择 ${selectedRows.value.length} 条销售订单`)
}

const handleToSalesOutbound = () => {
  if (!requireSelection(false)) return
  const row = selectedRows.value[0]
  if (row.auditStatus !== 'audited') {
    ElMessage.warning('请先审核销售订单')
    return
  }
  router.push({ path: '/sales/outbound', query: { orderId: row.id, from: 'salesOrder' } })
}

const handleApproveModify = () => {
  if (!requireSelection(false)) return
  const row = selectedRows.value[0]
  if (!hasPendingModification(row.id)) {
    ElMessage.warning('该订单无待处理的修改申请')
    return
  }
  ElMessageBox.confirm('确定同意买方的修改申请？系统将自动计算实际数量并同步。', '同意修改', {
    confirmButtonText: '同意',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    approveModificationRequest(row.id)
    persistOrderChanges(row.id, { modifyRequestStatus: 'approved' })
    addOperationLog(row.id, 'approveModify', '系统管理员', '同意修改申请')
    ElMessage.success('已同意修改申请')
  }).catch(() => {})
}

const handleExport = () => {
  ElMessage.success(`已导出 ${filteredData.value.length} 条销售订单`)
}

const handleCopy = () => {
  const row = getSelectedRow()
  if (!row) return
  router.push({ path: '/sales/order-list/create', query: { copyFrom: row.id } })
}

const handleRowDoubleClick = (row: any) => {
  router.push(`/sales/order-list/create/${row.id}`)
}

const handleOrderNoClick = (row: any) => {
  router.push(`/sales/order-list/create/${row.id}`)
}

const handleSearch = () => {
  currentPage.value = 1
  saveSearchForm()
  ElMessage.success(`共找到 ${filteredData.value.length} 条记录`)
}

const handleRefresh = () => {
  loadData()
  currentPage.value = 1
  ElMessage.success('数据已刷新')
}

const handleReset = () => {
  resetSearchForm()
}

const handlePresetChange = (val: string) => {
  const range = getDateRange(val)
  if (range) searchForm.value.dateRange = range
}

const saveSearchForm = () => {
  localStorage.setItem('sales-search-form', JSON.stringify({
    ...searchForm.value,
    showAdvancedFilter: showAdvancedFilter.value
  }))
}

const loadSearchForm = () => {
  const saved = localStorage.getItem('sales-search-form') || localStorage.getItem('sales-order-search-form')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed.keyword !== undefined) {
        Object.assign(searchForm.value, parsed)
        searchForm.value.auditStatus = migrateSavedFilter(parsed.auditStatus ?? parsed.selectedAuditStatus)
        searchForm.value.executeStatus = migrateSavedFilter(parsed.executeStatus ?? parsed.selectedExecuteStatus)
        searchForm.value.warehouseStatus = migrateSavedFilter(parsed.warehouseStatus ?? parsed.selectedWarehouseStatus)
        searchForm.value.closeStatus = migrateSavedFilter(parsed.closeStatus ?? parsed.selectedCloseStatus)
        searchForm.value.prepaymentStatus = migrateSavedFilter(parsed.prepaymentStatus ?? parsed.selectedPrepaymentStatus)
        searchForm.value.receiveStatus = migrateSavedFilter(parsed.receiveStatus ?? parsed.selectedReceiveStatus)
      }
      if (parsed.dateRange?.length) {
        searchForm.value.dateRange = parsed.dateRange.map((d: string) => new Date(d))
      }
      showAdvancedFilter.value = parsed.showAdvancedFilter !== false
    } catch {
      /* ignore */
    }
  }
}

watch(() => [
  searchForm.value.auditStatus,
  searchForm.value.executeStatus,
  searchForm.value.warehouseStatus,
  searchForm.value.closeStatus,
  searchForm.value.prepaymentStatus,
  searchForm.value.receiveStatus
], saveSearchForm, { deep: true })

const resetSearchForm = () => {
  const range = getDateRange('thisMonth') || []
  searchForm.value = {
    keyword: '',
    businessProcess: '',
    selectedPreset: 'thisMonth',
    dateRange: range,
    auditStatus: ALL_FILTER_VALUE,
    executeStatus: ALL_FILTER_VALUE,
    warehouseStatus: ALL_FILTER_VALUE,
    closeStatus: ALL_FILTER_VALUE,
    prepaymentStatus: ALL_FILTER_VALUE,
    receiveStatus: ALL_FILTER_VALUE
  }
  currentPage.value = 1
  localStorage.removeItem('sales-search-form')
  localStorage.removeItem('sales-order-search-form')
}

onMounted(() => {
  document.title = '销售订单记录'
  const range = getDateRange('thisMonth')
  if (range) {
    searchForm.value.dateRange = range
  }
  loadSearchForm()
  loadData()

  if (filteredData.value.length === 0 && tableData.value.length > 0) {
    resetSearchForm()
  }
})
</script>

<template>
  <div class="page-container">
    <div class="search-card">
      <div class="search-row">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="业务流程">
            <el-select v-model="searchForm.businessProcess" placeholder="全部" clearable style="width: 120px;">
              <el-option v-for="opt in businessProcessOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="时间范围">
            <el-select v-model="searchForm.selectedPreset" placeholder="时间段" style="width: 100px;" @change="handlePresetChange">
              <el-option v-for="preset in timePresets" :key="preset.value" :label="preset.label" :value="preset.value" />
            </el-select>
            <el-date-picker
              v-model="searchForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始"
              end-placeholder="结束"
              style="width: 240px; margin-left: 8px;"
            />
          </el-form-item>
          <el-form-item class="keyword-input">
            <el-input
              v-model="searchForm.keyword"
              placeholder="客户/订单号/制单人/商品规格/备注"
              clearable
              style="width: 300px;"
            />
          </el-form-item>
        </el-form>
        <div class="button-group">
          <el-button type="primary" class="btn-teal" @click="handleSearch">查询</el-button>
          <el-button @click="handleRefresh">刷新</el-button>
          <el-button type="primary" class="btn-teal" @click="handleReset">重置</el-button>
          <el-button type="primary" class="btn-teal" @click="showAdvancedFilter = !showAdvancedFilter">
            {{ showAdvancedFilter ? '隐藏筛选' : '显示筛选' }}
          </el-button>
        </div>
      </div>

      <div class="search-advanced" v-show="showAdvancedFilter">
        <div class="filter-row">
          <div v-for="group in filterGroupsRow1" :key="group.field" class="filter-item">
            <span class="filter-label">{{ group.label }}</span>
            <div class="filter-tags">
              <span
                v-for="opt in withAllOption(group.options)"
                :key="opt.value"
                class="filter-tag"
                :class="{ active: isFilterActive(group.field, opt.value) }"
                @click="selectFilter(group.field, opt.value)"
              >{{ opt.label }}</span>
            </div>
          </div>
        </div>
        <div class="filter-row">
          <div v-for="group in filterGroupsRow2" :key="group.field" class="filter-item">
            <span class="filter-label">{{ group.label }}</span>
            <div class="filter-tags">
              <span
                v-for="opt in withAllOption(group.options)"
                :key="opt.value"
                class="filter-tag"
                :class="{ active: isFilterActive(group.field, opt.value) }"
                @click="selectFilter(group.field, opt.value)"
              >{{ opt.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="action-bar">
      <div class="action-bar-left">
        <span class="selected-text">已选中 <strong>{{ selectedRows.length }}</strong> 条</span>
      </div>
      <div class="action-bar-controls">
        <el-button type="primary" link size="small" @click="handleAuditToggle">
          {{ auditActionLabel }}
        </el-button>
        <el-button type="danger" link size="small" class="btn-delete-link" @click="handleDelete">删除</el-button>
        <el-button type="primary" link size="small" @click="handleEnable">启用</el-button>
        <el-button type="primary" link size="small" @click="handleClose">关闭</el-button>
        <el-button type="primary" link size="small" @click="handleOutbound">出库</el-button>
        <el-button type="primary" link size="small" @click="handleBatchModify">批量修改</el-button>
        <el-button type="primary" link size="small" @click="handleToSalesOutbound">转销售出库单</el-button>
        <el-button type="primary" link size="small" class="btn-modify-pending" @click="handleApproveModify">同意修改</el-button>
        <el-button type="primary" link size="small" @click="handlePrint">打印</el-button>
        <el-button type="primary" link size="small" @click="handleCopy">复制</el-button>
        <el-button type="primary" link size="small" @click="handleExport">导出</el-button>
      </div>
      <div class="action-bar-extra">
        <el-button type="primary" class="btn-teal" size="small" @click="handleCreate">新增</el-button>
      </div>
    </div>

    <div class="table-card">
      <el-table
        :data="pagedData"
        class="common-table"
        border
        @row-dblclick="handleRowDoubleClick"
        @header-dragend="handleHeaderDragend"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="订单号" :width="columnWidths.orderNo">
          <template #default="{ row }">
            <span class="code-link" @click="handleOrderNoClick(row)">{{ row.orderNo }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="customer" label="客户" :width="columnWidths.customer" />
        <el-table-column prop="date" label="下单日期" :width="columnWidths.date" />
        <el-table-column prop="itemCount" label="商品种类" :width="columnWidths.itemCount" align="center" />
        <el-table-column prop="amount" label="成交金额" :width="columnWidths.amount" align="right" />
        <el-table-column label="审核状态" :width="columnWidths.auditStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.auditStatus === 'audited' ? 'success' : 'info'">
              {{ auditStatusLabels[row.auditStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="执行状态" :width="columnWidths.executeStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.executeStatus === 'allExecuted' ? 'success' : row.executeStatus === 'partiallyExecuted' ? 'warning' : 'info'">
              {{ executeStatusLabels[row.executeStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="出库状态" :width="columnWidths.warehouseStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.warehouseStatus === 'allOutWarehoused' ? 'success' : row.warehouseStatus === 'partiallyOutWarehoused' ? 'warning' : 'info'">
              {{ warehouseStatusLabels[row.warehouseStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="关闭状态" :width="columnWidths.closeStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.closeStatus === 'closed' ? 'danger' : row.closeStatus === 'manualClosed' ? 'warning' : 'info'">
              {{ closeStatusLabels[row.closeStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="预收单据" :width="columnWidths.prepaymentStatus" align="center">
          <template #default="{ row }">
            <span>{{ prepaymentLabels[row.prepaymentStatus] || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="接单状态" :width="columnWidths.receiveStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.receiveStatus === 'received' ? 'success' : 'info'">
              {{ receiveStatusLabels[row.receiveStatus] || '未接单' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" :width="columnWidths.status" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="statusLabels[row.status]?.color || 'info'">
              {{ statusLabels[row.status]?.text || row.status }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="filteredData.length"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container {
  padding: 16px 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.btn-teal {
  --el-button-bg-color: #00bfa5;
  --el-button-border-color: #00bfa5;
  --el-button-hover-bg-color: #00a896;
  --el-button-hover-border-color: #00a896;
  --el-button-active-bg-color: #008f7a;
  --el-button-active-border-color: #008f7a;
}

.search-card {
  background: #fff;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);

  .search-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .search-form {
    flex: 1;

    :deep(.el-form-item) {
      margin-bottom: 8px;
      margin-right: 12px;
    }
  }

  .button-group {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .search-advanced {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #e4e7ed;

    .filter-row {
      display: flex;
      align-items: flex-start;
      gap: 24px;
      margin-bottom: 12px;
      flex-wrap: wrap;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .filter-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      flex: 1;
      min-width: 280px;
    }

    .filter-label {
      font-size: 13px;
      color: #666;
      min-width: 72px;
      flex-shrink: 0;
    }

    .filter-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .filter-tag {
      padding: 4px 12px;
      font-size: 12px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      cursor: pointer;
      color: #606266;
      background: #fff;
      transition: all 0.2s;
      user-select: none;

      &:hover {
        color: #00bfa5;
        border-color: #00bfa5;
      }

      &.active {
        background: #00bfa5;
        border-color: #00bfa5;
        color: #fff;
      }
    }
  }
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  background: #fff;
  padding: 10px 16px;
  margin-bottom: 12px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.action-bar-left {
  flex-shrink: 0;

  .selected-text {
    font-size: 13px;
    color: #667085;

    strong {
      color: #00bfa5;
      font-weight: 600;
    }
  }
}

.action-bar-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  flex: 1;

  :deep(.el-button.is-link),
  :deep(.el-dropdown .el-button.is-link) {
    padding: 4px 8px;
    color: #344054;
    font-size: 13px;

    &:hover {
      color: #00bfa5;
    }
  }

  .btn-delete-link {
    color: #f56c6c !important;

    &:hover,
    &:focus {
      color: #f89898 !important;
    }
  }

  .btn-modify-pending {
    color: #f56c6c !important;
    font-weight: 600;

    &:hover,
    &:focus {
      color: #f89898 !important;
    }
  }
}

.action-bar-extra {
  flex-shrink: 0;
}

.table-card {
  background: #fff;
  border-radius: 4px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);

  :deep(.el-table__header-wrapper th) {
    background: #f5f7fa;
    color: #344054;
    font-weight: 600;
  }
  :deep(.el-table__row:nth-child(odd)) {
    background-color: #f0f9f7;
  }
}

.code-link {
  color: #00bfa5;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
