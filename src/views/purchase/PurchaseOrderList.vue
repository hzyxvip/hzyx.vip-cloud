<script setup lang="ts">
import '@/styles/product-list-table.scss'
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTableStyle } from '@/composables/useTableStyle'
import { usePurchaseOrderListColumnSettings } from '@/composables/usePurchaseOrderListColumnSettings'
import {
  canDeletePurchaseOrder,
  canUnAuditPurchaseOrder,
  onPurchaseOrderAudited,
  onPurchaseOrderManualCompleted
} from '@/utils/platformCollaborationService'
import { calcDealAmountFromOrder } from '@/utils/purchaseOrderAmount'
import { resolveSupplierPlatformCode } from '@/utils/orderListPartnerCodes'
import {
  checkPurchaseOrderProductsAudited,
  formatUnapprovedProductsMessage
} from '@/utils/productStore'
import {
  CONFIRM_STATUS_CONFIRMED,
  CONFIRM_STATUS_UNCONFIRMED,
  normalizeConfirmStatus
} from '@/utils/documentFunctionSettings'

const router = useRouter()
const showAdvancedFilter = ref(true)

const operationLogs = ref<any[]>(JSON.parse(localStorage.getItem('purchase-operation-logs') || '[]'))

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
  localStorage.setItem('purchase-operation-logs', JSON.stringify(operationLogs.value))
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
  { label: '标准采购', value: 'standard' },
  { label: '跨公司采购', value: 'crossCompany' },
  { label: '平台采购', value: 'platform' }
]

const auditStatusOptions = [
  { label: '未审核', value: 'notAudited' },
  { label: '已审核', value: 'audited' }
]

const confirmStatusOptions = [
  { label: '未确认', value: CONFIRM_STATUS_UNCONFIRMED },
  { label: '已确认', value: CONFIRM_STATUS_CONFIRMED }
]

const executeStatusOptions = [
  { label: '未执行', value: 'notExecuted' },
  { label: '部分执行', value: 'partiallyExecuted' },
  { label: '全部执行', value: 'allExecuted' }
]

const warehouseStatusOptions = [
  { label: '未入库', value: 'notInWarehoused' },
  { label: '部分入库', value: 'partiallyInWarehoused' },
  { label: '全部入库', value: 'allInWarehoused' }
]

const closeStatusOptions = [
  { label: '未关闭', value: 'notClosed' },
  { label: '已关闭', value: 'closed' },
  { label: '手动关闭', value: 'manualClosed' }
]

const prepaymentAuditOptions = [
  { label: '已预付未审核', value: 'prepaidNotAudited' },
  { label: '已审核部分核销', value: 'prepaidPartiallyAudited' },
  { label: '已审核已核销', value: 'prepaidAudited' }
]

const receiveStatusFilterOptions = [
  { label: '已接单', value: 'received' },
  { label: '未接单', value: 'notReceived' }
]

/** 转为 YYYY-MM-DD，避免 UTC 解析导致当天订单被筛掉 */
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
  | 'confirmStatus'
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
  confirmStatus: ALL_FILTER_VALUE,
  executeStatus: ALL_FILTER_VALUE,
  warehouseStatus: ALL_FILTER_VALUE,
  closeStatus: ALL_FILTER_VALUE,
  prepaymentStatus: ALL_FILTER_VALUE,
  receiveStatus: ALL_FILTER_VALUE
})

const filterGroupsRow1 = [
  { field: 'auditStatus' as StatusFilterField, label: '审核状态', options: auditStatusOptions },
  { field: 'confirmStatus' as StatusFilterField, label: '确定状态', options: confirmStatusOptions },
  { field: 'executeStatus' as StatusFilterField, label: '执行状态', options: executeStatusOptions },
  { field: 'warehouseStatus' as StatusFilterField, label: '入库状态', options: warehouseStatusOptions }
]

const filterGroupsRow2 = [
  { field: 'closeStatus' as StatusFilterField, label: '关闭状态', options: closeStatusOptions },
  { field: 'prepaymentStatus' as StatusFilterField, label: '预付单据', options: prepaymentAuditOptions },
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
  { id: 'PO20260620001', orderNo: 'PO-20260620-0001', supplier: '北京医疗器械有限公司', date: '2026-06-20', amount: '¥12,500.00', itemCount: 5, auditStatus: 'notAudited', executeStatus: 'notExecuted', warehouseStatus: 'notInWarehoused', closeStatus: 'notClosed', prepaymentStatus: '', receiveStatus: 'notReceived', status: 'pending', creator: '系统管理员' },
  { id: 'PO20260619002', orderNo: 'PO-20260619-0002', supplier: '上海医疗设备有限公司', date: '2026-06-19', amount: '¥8,800.00', itemCount: 3, auditStatus: 'audited', executeStatus: 'partiallyExecuted', warehouseStatus: 'partiallyInWarehoused', closeStatus: 'notClosed', prepaymentStatus: 'prepaidAudited', receiveStatus: 'notReceived', status: 'processing', creator: '系统管理员' },
  { id: 'PO20260618003', orderNo: 'PO-20260618-0003', supplier: '广州医疗科技有限公司', date: '2026-06-18', amount: '¥25,600.00', itemCount: 8, auditStatus: 'audited', executeStatus: 'allExecuted', warehouseStatus: 'allInWarehoused', closeStatus: 'closed', prepaymentStatus: '', receiveStatus: 'received', status: 'completed', creator: '系统管理员' },
  { id: 'PO20260617004', orderNo: 'PO-20260617-0004', supplier: '北京医疗器械有限公司', date: '2026-06-17', amount: '¥15,200.00', itemCount: 4, auditStatus: 'notAudited', executeStatus: 'notExecuted', warehouseStatus: 'notInWarehoused', closeStatus: 'notClosed', prepaymentStatus: 'prepaidNotAudited', receiveStatus: 'notReceived', status: 'pending', creator: '系统管理员' },
  { id: 'PO20260616005', orderNo: 'PO-20260616-0005', supplier: '上海医疗设备有限公司', date: '2026-06-16', amount: '¥6,800.00', itemCount: 2, auditStatus: 'audited', executeStatus: 'allExecuted', warehouseStatus: 'allInWarehoused', closeStatus: 'closed', prepaymentStatus: '', receiveStatus: 'received', status: 'completed', creator: '系统管理员' },
  { id: 'PO20260615006', orderNo: 'PO-20260615-0006', supplier: '广州医疗科技有限公司', date: '2026-06-15', amount: '¥32,000.00', itemCount: 10, auditStatus: 'audited', executeStatus: 'partiallyExecuted', warehouseStatus: 'partiallyInWarehoused', closeStatus: 'notClosed', prepaymentStatus: 'prepaidPartiallyAudited', receiveStatus: 'notReceived', status: 'processing', creator: '系统管理员' },
  { id: 'PO20260614007', orderNo: 'PO-20260614-0007', supplier: '北京医疗器械有限公司', date: '2026-06-14', amount: '¥9,500.00', itemCount: 3, auditStatus: 'notAudited', executeStatus: 'notExecuted', warehouseStatus: 'notInWarehoused', closeStatus: 'manualClosed', prepaymentStatus: '', receiveStatus: 'notReceived', status: 'cancelled', creator: '系统管理员' },
  { id: 'PO20260613008', orderNo: 'PO-20260613-0008', supplier: '上海医疗设备有限公司', date: '2026-06-13', amount: '¥18,900.00', itemCount: 6, auditStatus: 'audited', executeStatus: 'allExecuted', warehouseStatus: 'allInWarehoused', closeStatus: 'closed', prepaymentStatus: '', receiveStatus: 'received', status: 'completed', creator: '系统管理员' }
]

const auditStatusLabels: Record<string, string> = {
  notAudited: '未审核',
  audited: '已审核'
}

const confirmStatusLabels: Record<string, string> = {
  [CONFIRM_STATUS_UNCONFIRMED]: '未确认',
  [CONFIRM_STATUS_CONFIRMED]: '已确认'
}

const executeStatusLabels: Record<string, string> = {
  notExecuted: '未执行',
  partiallyExecuted: '部分执行',
  allExecuted: '全部执行'
}

const warehouseStatusLabels: Record<string, string> = {
  notInWarehoused: '未入库',
  partiallyInWarehoused: '部分入库',
  allInWarehoused: '全部入库'
}

const closeStatusLabels: Record<string, string> = {
  notClosed: '未关闭',
  closed: '已关闭',
  manualClosed: '手动关闭'
}

const prepaymentLabels: Record<string, string> = {
  prepaidNotAudited: '已预付未审核',
  prepaidPartiallyAudited: '已审核部分核销',
  prepaidAudited: '已审核已核销'
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

const { columnWidths, handleHeaderDragend } = useTableStyle('purchase-order-list', [
  { key: 'orderNo', label: '订单号', defaultWidth: 150 },
  { key: 'projectName', label: '项目名称', defaultWidth: 140 },
  { key: 'supplier', label: '供应商', defaultWidth: 180 },
  { key: 'supplierPlatformCode', label: '医享平台供应商编号', defaultWidth: 150 },
  { key: 'date', label: '下单日期', defaultWidth: 110 },
  { key: 'itemCount', label: '商品种类', defaultWidth: 90 },
  { key: 'amount', label: '成交金额', defaultWidth: 120 },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 90 },
  { key: 'confirmStatus', label: '确定状态', defaultWidth: 90 },
  { key: 'executeStatus', label: '执行状态', defaultWidth: 100 },
  { key: 'warehouseStatus', label: '入库状态', defaultWidth: 100 },
  { key: 'closeStatus', label: '关闭状态', defaultWidth: 100 },
  { key: 'prepaymentStatus', label: '预付单据', defaultWidth: 130 },
  { key: 'receiveStatus', label: '接单状态', defaultWidth: 90 },
  { key: 'status', label: '状态', defaultWidth: 90 }
])

const {
  showColumnSelector,
  columnOptions,
  selectedColumns,
  sortedVisibleColumns,
  tableColumnRenderKey,
  openColumnSettings,
  handleColumnDragStart,
  handleColumnDragOver,
  handleColumnDrop,
  confirmColumnSelection
} = usePurchaseOrderListColumnSettings('purchase-order-list')

const loadData = () => {
  const normalizeSavedOrder = (o: Record<string, unknown>) => ({
    ...o,
    orderNo: o.orderNo || o.id,
    projectName: String(o.projectName || ''),
    supplierPlatformCode: resolveSupplierPlatformCode(o),
    itemCount: o.itemCount || parseInt(String(o.items || '0'), 10) || 0,
    auditStatus: o.auditStatus || 'notAudited',
    confirmStatus: normalizeConfirmStatus(o.confirmStatus),
    receiveStatus: o.receiveStatus || 'notReceived',
    status: o.status || 'pending',
    amount: calcDealAmountFromOrder(o)
  })

  const savedOrders = JSON.parse(localStorage.getItem('purchase-orders') || '[]')
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
  const orders = JSON.parse(localStorage.getItem('purchase-orders') || '[]')
  const row = tableData.value.find(r => r.id === orderId)
  if (row) Object.assign(row, changes)

  const index = orders.findIndex((o: any) => o.id === orderId || o.orderNo === orderId)
  if (index > -1) {
    orders[index] = { ...orders[index], ...changes }
  } else if (row) {
    orders.unshift({ ...row, ...changes })
  }
  localStorage.setItem('purchase-orders', JSON.stringify(orders))
}

const canUnAuditOrder = (row: any) => canUnAuditPurchaseOrder(row)

/** 仅未审核 + 未关闭可删除 */
const canDeleteOrder = (row: any) => canDeletePurchaseOrder(row)

const selectedRows = ref<any[]>([])

const filteredData = computed(() => {
  return tableData.value.filter(row => {
    if (searchForm.value.keyword) {
      const keywords = searchForm.value.keyword.trim().split(/\s+/).filter(Boolean)
      const fields = [row.orderNo, row.supplier, row.creator, row.remark || ''].map(v => String(v).toLowerCase())
      if (!keywords.every(kw => fields.some(f => f.includes(kw.toLowerCase())))) return false
    }

    if (searchForm.value.dateRange.length === 2) {
      const itemKey = toDateKey(row.date)
      const startKey = toDateKey(searchForm.value.dateRange[0])
      const endKey = toDateKey(searchForm.value.dateRange[1])
      if (!itemKey || itemKey < startKey || itemKey > endKey) return false
    }

    if (!matchStatusFilter(row.auditStatus, searchForm.value.auditStatus)) return false
    if (!matchStatusFilter(row.confirmStatus, searchForm.value.confirmStatus)) return false
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
    ElMessage.warning('请先选择一条采购订单')
    return null
  }
  if (selectedRows.value.length > 1) {
    ElMessage.warning('请只选择一条采购订单')
    return null
  }
  return selectedRows.value[0]
}

const handleSelectionChange = (val: any[]) => {
  selectedRows.value = val
}

const handleCreate = () => router.push('/purchase/order-list/create')

const handleEdit = () => {
  const row = getSelectedRow()
  if (row) router.push(`/purchase/order-list/create/${row.id}`)
}

const handleView = () => {
  const row = getSelectedRow()
  if (row) router.push(`/purchase/order-list/create/${row.id}`)
}

const handlePrint = () => {
  const row = getSelectedRow()
  if (row) ElMessage.success(`正在打印订单 ${row.orderNo}`)
}

const handleAudit = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请至少选择一条采购订单')
    return
  }
  const targets = selectedRows.value.filter(row => row.auditStatus !== 'audited')
  if (targets.length === 0) {
    ElMessage.info('所选订单均已审核')
    return
  }

  const stored = JSON.parse(localStorage.getItem('purchase-orders') || '[]')
  const blockedMessages: string[] = []
  targets.forEach(row => {
    const full = stored.find((o: { id: string }) => o.id === row.id) || row
    const check = checkPurchaseOrderProductsAudited(full.detailItems || [])
    if (!check.ok) {
      blockedMessages.push(
        `订单 ${row.orderNo || row.id}：${formatUnapprovedProductsMessage(check.unapprovedProducts)}`
      )
    }
  })
  if (blockedMessages.length > 0) {
    ElMessageBox.alert(
      `以下采购订单含未审核的商品资料，请先在「资料管理 → 商品基本资料」中审核后再审单：\n\n${blockedMessages.join('\n')}`,
      '无法审核',
      { type: 'warning', confirmButtonText: '知道了' }
    )
    return
  }

  ElMessageBox.confirm(`确定要审核选中的 ${targets.length} 条采购订单吗？`, '审核确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    const auditTime = formatLocalDateTime()
    targets.forEach(row => {
      persistOrderChanges(row.id, {
        auditStatus: 'audited',
        auditor: '系统管理员',
        auditTime,
        status: row.status === 'pending' ? 'processing' : row.status
      })
      const stored = JSON.parse(localStorage.getItem('purchase-orders') || '[]')
      const fullOrder = stored.find((o: any) => o.id === row.id) || row
      const link = onPurchaseOrderAudited(fullOrder)
      if (link) {
        persistOrderChanges(row.id, {
          sendStatus: '已发单',
          platformOrderNo: link.platformOrderNo,
          sellerOrderId: link.sellerOrderId,
          sellerOrderNo: link.sellerOrderNo
        })
      }
      addOperationLog(row.id, 'audit', '系统管理员', '审核采购订单')
    })
    ElMessage.success(`已成功审核 ${targets.length} 条订单`)
  }).catch(() => {})
}

const handleUnAudit = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请至少选择一条采购订单')
    return
  }
  const targets = selectedRows.value.filter(row => row.auditStatus === 'audited')
  if (targets.length === 0) {
    ElMessage.info('所选订单均未审核')
    return
  }
  const blocked = targets.filter(row => !canUnAuditOrder(row))
  if (blocked.length > 0) {
    ElMessage.warning('已接单或已入库的订单不能反审核，请使用申请修改或关闭')
    return
  }
  ElMessageBox.confirm(`确定要反审核选中的 ${targets.length} 条采购订单吗？`, '反审核确认', {
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
      addOperationLog(row.id, 'unaudit', '系统管理员', '反审核采购订单')
    })
    ElMessage.success(`已成功反审核 ${targets.length} 条订单`)
  }).catch(() => {})
}

/** 选中项全部已审核时显示「反审核」，否则显示「审核」 */
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
    ElMessage.warning(multiple ? '请至少选择一条采购订单' : '请先选择一条采购订单')
    return false
  }
  if (!multiple && selectedRows.value.length > 1) {
    ElMessage.warning('请只选择一条采购订单')
    return false
  }
  return true
}

const handleDelete = () => {
  if (!requireSelection()) return
  const deletable = selectedRows.value.filter(canDeleteOrder)
  const blocked = selectedRows.value.filter(row => !canDeleteOrder(row))

  if (deletable.length === 0) {
    ElMessage.warning('仅未审核、未关闭的采购订单允许删除')
    return
  }

  const skipTip = blocked.length > 0 ? `（${blocked.length} 条不符合删除条件，将自动跳过）` : ''
  ElMessageBox.confirm(
    `确定要删除选中的 ${deletable.length} 条采购订单吗？此操作不可恢复！${skipTip}`,
    '删除确认',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'error' }
  ).then(() => {
    const ids = new Set(deletable.map(row => row.id))
    tableData.value = tableData.value.filter(row => !ids.has(row.id))
    const orders = JSON.parse(localStorage.getItem('purchase-orders') || '[]')
    localStorage.setItem(
      'purchase-orders',
      JSON.stringify(orders.filter((o: any) => !ids.has(o.id)))
    )
    deletable.forEach(row => addOperationLog(row.id, 'delete', '系统管理员', '删除采购订单'))
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
    addOperationLog(row.id, 'enable', '系统管理员', '启用采购订单')
  })
  ElMessage.success(`已启用 ${selectedRows.value.length} 条订单`)
}

const handleClose = () => {
  if (!requireSelection()) return
  ElMessageBox.confirm(
    `确定要关闭选中的 ${selectedRows.value.length} 条采购订单吗？`,
    '关闭确认',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
  ).then(() => {
    selectedRows.value.forEach(row => {
      persistOrderChanges(row.id, { closeStatus: 'closed', status: 'cancelled' })
      addOperationLog(row.id, 'close', '系统管理员', '关闭采购订单')
    })
    ElMessage.success(`已关闭 ${selectedRows.value.length} 条订单`)
  }).catch(() => {})
}

const handleInbound = () => {
  if (!requireSelection(false)) return
  const row = selectedRows.value[0]
  if (row.auditStatus !== 'audited') {
    ElMessage.warning('请先审核采购订单后再入库')
    return
  }
  router.push({ path: '/purchase/inbound', query: { orderId: row.id } })
}

const handleBatchModify = () => {
  if (!requireSelection()) return
  ElMessage.info(`批量修改：已选择 ${selectedRows.value.length} 条采购订单`)
}

const handleToPurchaseInbound = () => {
  if (!requireSelection(false)) return
  const row = selectedRows.value[0]
  if (row.auditStatus !== 'audited') {
    ElMessage.warning('请先审核采购订单')
    return
  }
  router.push({ path: '/purchase/inbound', query: { orderId: row.id, from: 'purchaseOrder' } })
}

const handleToSalesOrder = () => {
  if (!requireSelection(false)) return
  const row = selectedRows.value[0]
  router.push({ path: '/sales/order-list/create', query: { fromPurchaseOrder: row.id } })
}

const handleExport = () => {
  ElMessage.success(`已导出 ${filteredData.value.length} 条采购订单`)
}

const handleFromRequest = () => {
  ElMessage.info('从采购申请：可选择采购申请单生成采购订单')
}

const handleCopy = () => {
  const row = getSelectedRow()
  if (!row) return
  router.push({ path: '/purchase/order-list/create', query: { copyFrom: row.id } })
}

const handleRowDoubleClick = (row: any) => {
  router.push(`/purchase/order-list/create/${row.id}`)
}

const handleOrderNoClick = (row: any) => {
  router.push(`/purchase/order-list/create/${row.id}`)
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
  localStorage.setItem('purchase-search-form', JSON.stringify({
    ...searchForm.value,
    showAdvancedFilter: showAdvancedFilter.value
  }))
}

const loadSearchForm = () => {
  const saved = localStorage.getItem('purchase-search-form')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      Object.assign(searchForm.value, parsed)
      searchForm.value.auditStatus = migrateSavedFilter(parsed.auditStatus)
      searchForm.value.confirmStatus = migrateSavedFilter(parsed.confirmStatus)
      searchForm.value.executeStatus = migrateSavedFilter(parsed.executeStatus)
      searchForm.value.warehouseStatus = migrateSavedFilter(parsed.warehouseStatus)
      searchForm.value.closeStatus = migrateSavedFilter(parsed.closeStatus)
      searchForm.value.prepaymentStatus = migrateSavedFilter(parsed.prepaymentStatus)
      searchForm.value.receiveStatus = migrateSavedFilter(parsed.receiveStatus ?? parsed.settleStatus)
      if (parsed.dateRange?.length) {
        searchForm.value.dateRange = parsed.dateRange.map((d: string) => new Date(d))
      }
      showAdvancedFilter.value = parsed.showAdvancedFilter !== false
    } catch {}
  }
}

watch(() => [
  searchForm.value.auditStatus,
  searchForm.value.confirmStatus,
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
    confirmStatus: ALL_FILTER_VALUE,
    executeStatus: ALL_FILTER_VALUE,
    warehouseStatus: ALL_FILTER_VALUE,
    closeStatus: ALL_FILTER_VALUE,
    prepaymentStatus: ALL_FILTER_VALUE,
    receiveStatus: ALL_FILTER_VALUE
  }
  currentPage.value = 1
  localStorage.removeItem('purchase-search-form')
}

onMounted(() => {
  document.title = '采购订单'
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
        <el-button type="primary" link size="small" @click="handleInbound">入库</el-button>
        <el-button type="primary" link size="small" @click="handleBatchModify">批量修改</el-button>
        <el-button type="primary" link size="small" @click="handleToPurchaseInbound">转采购入库单</el-button>
        <el-button type="primary" link size="small" @click="handleToSalesOrder">转销售订单</el-button>
        <el-button type="primary" link size="small" @click="openColumnSettings">列表设置</el-button>
      </div>
      <div class="action-bar-extra">
        <el-button type="primary" class="btn-teal" size="small" @click="handleCreate">新增采购订单</el-button>
      </div>
    </div>

    <div class="table-card product-list-table-card">
      <div v-if="sortedVisibleColumns.length === 0" class="header-empty-tip">
        请点击「列表设置」选择要显示的列
      </div>
      <div v-else class="table-scroll product-list-table-scroll">
      <el-table
        :key="tableColumnRenderKey"
        :data="pagedData"
        class="common-table"
        border
        @row-dblclick="handleRowDoubleClick"
        @header-dragend="handleHeaderDragend"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column
          v-for="col in sortedVisibleColumns"
          :key="col.key"
          :prop="col.prop"
          :label="col.label"
          :width="columnWidths[col.key]"
          :align="col.align"
          :header-align="col.headerAlign || col.align || 'center'"
        >
          <template #default="{ row }">
            <span
              v-if="col.key === 'orderNo'"
              class="code-link"
              @click="handleOrderNoClick(row)"
            >{{ row.orderNo }}</span>
            <span v-else-if="col.key === 'projectName'">{{ row.projectName || '—' }}</span>
            <span v-else-if="col.key === 'supplierPlatformCode'">{{ row.supplierPlatformCode || '—' }}</span>
            <el-tag
              v-else-if="col.key === 'auditStatus'"
              size="small"
              :type="row.auditStatus === 'audited' ? 'success' : 'info'"
            >
              {{ auditStatusLabels[row.auditStatus] }}
            </el-tag>
            <el-tag
              v-else-if="col.key === 'confirmStatus'"
              size="small"
              :type="row.confirmStatus === CONFIRM_STATUS_CONFIRMED ? 'success' : 'warning'"
            >
              {{ confirmStatusLabels[row.confirmStatus] || CONFIRM_STATUS_UNCONFIRMED }}
            </el-tag>
            <el-tag
              v-else-if="col.key === 'executeStatus'"
              size="small"
              :type="row.executeStatus === 'allExecuted' ? 'success' : row.executeStatus === 'partiallyExecuted' ? 'warning' : 'info'"
            >
              {{ executeStatusLabels[row.executeStatus] }}
            </el-tag>
            <el-tag
              v-else-if="col.key === 'warehouseStatus'"
              size="small"
              :type="row.warehouseStatus === 'allInWarehoused' ? 'success' : row.warehouseStatus === 'partiallyInWarehoused' ? 'warning' : 'info'"
            >
              {{ warehouseStatusLabels[row.warehouseStatus] }}
            </el-tag>
            <el-tag
              v-else-if="col.key === 'closeStatus'"
              size="small"
              :type="row.closeStatus === 'closed' ? 'danger' : row.closeStatus === 'manualClosed' ? 'warning' : 'info'"
            >
              {{ closeStatusLabels[row.closeStatus] }}
            </el-tag>
            <span v-else-if="col.key === 'prepaymentStatus'">
              {{ prepaymentLabels[row.prepaymentStatus] || '-' }}
            </span>
            <el-tag
              v-else-if="col.key === 'receiveStatus'"
              size="small"
              :type="row.receiveStatus === 'received' ? 'success' : 'info'"
            >
              {{ receiveStatusLabels[row.receiveStatus] || '未接单' }}
            </el-tag>
            <el-tag
              v-else-if="col.key === 'status'"
              size="small"
              :type="statusLabels[row.status]?.color || 'info'"
            >
              {{ statusLabels[row.status]?.text || row.status }}
            </el-tag>
            <span v-else>{{ col.prop ? row[col.prop] : '' }}</span>
          </template>
        </el-table-column>
      </el-table>
      </div>

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

  <el-dialog v-model="showColumnSelector" title="采购订单列表设置" width="720px" draggable>
    <div class="field-selector">
      <p class="sort-tip">勾选需要在列表中显示的列，拖拽可调整顺序</p>
      <el-checkbox-group v-model="selectedColumns">
        <el-row :gutter="10">
          <el-col :span="8" v-for="(col, index) in columnOptions" :key="col.key">
            <div
              class="field-item"
              draggable="true"
              @dragstart="(event) => handleColumnDragStart(event, index)"
              @dragover="handleColumnDragOver"
              @drop="(event) => handleColumnDrop(event, index)"
            >
              <span class="field-order">{{ index + 1 }}.</span>
              <el-checkbox :label="col.key" :disabled="col.required">{{ col.label }}</el-checkbox>
            </div>
          </el-col>
        </el-row>
      </el-checkbox-group>
    </div>
    <template #footer>
      <el-button @click="showColumnSelector = false">取消</el-button>
      <el-button type="primary" @click="confirmColumnSelection">确定</el-button>
    </template>
  </el-dialog>
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
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px 24px;
      align-items: center;
      margin-bottom: 12px;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .filter-item {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .filter-label {
      font-size: 13px;
      color: #666;
      width: 64px;
      flex-shrink: 0;
      text-align: right;
      line-height: 28px;
    }

    .filter-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      min-width: 0;
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

  :deep(.el-dropdown) {
    vertical-align: middle;
  }

  .btn-delete-link {
    color: #f56c6c !important;

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
}

.header-empty-tip {
  padding: 40px 0;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.field-selector {
  max-height: 400px;
  overflow-y: auto;
  padding: 10px 0;

  .sort-tip {
    color: #909399;
    font-size: 12px;
    margin-bottom: 10px;
    padding: 0 10px;
  }

  .field-item {
    cursor: move;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    gap: 4px;

    &:hover {
      background: #f5f7fa;
    }

    .field-order {
      color: #909399;
      font-size: 12px;
      min-width: 20px;
    }
  }
}

.table-scroll {
  overflow-x: auto;
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
