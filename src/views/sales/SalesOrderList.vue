<script setup lang="ts">
import '@/styles/product-list-table.scss'
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { TableInstance } from 'element-plus'
import { ArrowLeft, ArrowRight, DArrowLeft, DArrowRight } from '@element-plus/icons-vue'
import { useTableStyle } from '@/composables/useTableStyle'
import { useListTableNav } from '@/composables/useListTableNav'
import { useSalesOrderListColumnSettings, SALES_ORDER_LIST_COLUMN_DEFINITIONS } from '@/composables/useSalesOrderListColumnSettings'
import { parseDocumentMoneySortValue } from '@/utils/documentTableSort'
import { useDocumentColumnSort } from '@/composables/useDocumentColumnSort'
import DocumentSortHeader from '@/components/common/DocumentSortHeader.vue'
import { resolveWarehouseLabel } from '@/utils/warehouseSettings'
import {
  onSalesOrderAudited,
  approveModificationRequest,
  hasPendingModification,
  resolveSalesOrderExternalNo,
  resolveSalesOrderCustomerFields
} from '@/utils/platformCollaborationService'
import {
  CONFIRM_STATUS_CONFIRMED,
  CONFIRM_STATUS_UNCONFIRMED,
  normalizeConfirmStatus
} from '@/utils/documentFunctionSettings'
import { resolveCustomerPlatformCode } from '@/utils/orderListPartnerCodes'
import { calcDealAmountFromSalesOrder } from '@/utils/salesOrderAmount'
import { getCurrentUserName } from '@/utils/customerStore'
import {
  mergeSalesOrderListRows,
  loadRawSalesOrdersFromStorage
} from '@/utils/salesOrderListData'
import { applySalesOrderSettlementToStorage } from '@/utils/fundOrderAllocation'
import { syncSalesOrderExecuteStatus } from '@/utils/salesOrderExecution'
import {
  SALES_BUSINESS_PROCESS_OPTIONS,
  buildCollabIndexForCompany,
  matchesBusinessProcessFilter,
  normalizeBusinessProcessFilter,
  resolveSalesOrderBusinessProcess,
  stampOrderCompanyId
} from '@/utils/orderBusinessProcess'
import { requireTenantCompanyId } from '@/utils/tenantGuard'
import { syncSalesOrdersToServer } from '@/utils/orderSyncService'

const router = useRouter()

const PAGE_TITLE = '销售订单记录'
const PAGE_BREADCRUMB = '首页 / 销售管理 / 销售单据 / 销售订单记录'

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

const businessProcessOptions = SALES_BUSINESS_PROCESS_OPTIONS

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
  | 'confirmStatus'
  | 'executeStatus'
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
  closeStatus: ALL_FILTER_VALUE,
  prepaymentStatus: ALL_FILTER_VALUE,
  receiveStatus: ALL_FILTER_VALUE
})

const filterGroupsRow1 = [
  { field: 'auditStatus' as StatusFilterField, label: '审核状态', options: auditStatusOptions },
  { field: 'confirmStatus' as StatusFilterField, label: '确定状态', options: confirmStatusOptions },
  { field: 'executeStatus' as StatusFilterField, label: '执行状态', options: executeStatusOptions },
  { field: 'closeStatus' as StatusFilterField, label: '关闭状态', options: closeStatusOptions }
]

const filterGroupsRow2 = [
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
  { key: 'externalNo', label: '外部单号', defaultWidth: 150 },
  { key: 'customer', label: '客户', defaultWidth: 180 },
  { key: 'customerPlatformCode', label: '医享平台编号', defaultWidth: 150 },
  { key: 'warehouse', label: '仓库', defaultWidth: 110 },
  { key: 'date', label: '下单日期', defaultWidth: 110 },
  { key: 'itemCount', label: '商品种类', defaultWidth: 90 },
  { key: 'amount', label: '成交金额', defaultWidth: 120 },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 90 },
  { key: 'confirmStatus', label: '确定状态', defaultWidth: 90 },
  { key: 'executeStatus', label: '执行状态', defaultWidth: 100 },
  { key: 'closeStatus', label: '关闭状态', defaultWidth: 100 },
  { key: 'prepaymentStatus', label: '预收单据', defaultWidth: 130 },
  { key: 'receiveStatus', label: '接单状态', defaultWidth: 90 },
  { key: 'creator', label: '制单人', defaultWidth: 90 },
  { key: 'salesman', label: '业务员', defaultWidth: 90 },
  { key: 'auditor', label: '审核人', defaultWidth: 90 },
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
} = useSalesOrderListColumnSettings('sales-order-list')

const normalizeSavedOrder = (o: Record<string, unknown>) => {
  const customerFields = resolveSalesOrderCustomerFields(o)
  return {
    ...o,
    orderNo: o.orderNo || o.id,
    externalNo: resolveSalesOrderExternalNo(o),
    customer: customerFields.customer || String(o.customer || ''),
    customerPlatformCode:
      customerFields.customerPlatformCode || resolveCustomerPlatformCode(o),
    warehouse: resolveWarehouseLabel(String(o.warehouse || '')) || String(o.warehouse || ''),
    itemCount: o.itemCount || parseInt(String(o.items || '0'), 10) || 0,
    auditStatus: o.auditStatus || 'notAudited',
    confirmStatus: normalizeConfirmStatus(o.confirmStatus),
    executeStatus: o.executeStatus || 'notExecuted',
    closeStatus: o.closeStatus || 'notClosed',
    receiveStatus: o.receiveStatus || 'notReceived',
    status: o.status || 'pending',
    amount: calcDealAmountFromSalesOrder(o),
    creator: String(o.creator || o.operator || ''),
    salesman: String(o.salesman || ''),
    auditor: String(o.auditor || '')
  }
}

const loadData = () => {
  applySalesOrderSettlementToStorage()
  syncSalesOrderExecuteStatus()
  const savedOrders = loadRawSalesOrdersFromStorage()
  tableData.value = mergeSalesOrderListRows(savedOrders).map(normalizeSavedOrder)
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
  const companyId = requireTenantCompanyId()
  if (!companyId) return
  const orders = JSON.parse(localStorage.getItem('sales-orders') || '[]')
  const row = tableData.value.find(r => r.id === orderId)
  if (row) Object.assign(row, changes)

  const index = orders.findIndex((o: any) => o.id === orderId)
  if (index > -1) {
    orders[index] = stampOrderCompanyId({ ...orders[index], ...changes }, companyId)
  } else if (row) {
    orders.unshift(stampOrderCompanyId({ ...row, ...changes }, companyId))
  }
  localStorage.setItem('sales-orders', JSON.stringify(orders))
  void syncSalesOrdersToServer()
}

const canUnAuditOrder = (row: any) =>
  row.auditStatus === 'audited' && row.executeStatus === 'notExecuted'

const canDeleteOrder = (row: any) =>
  row.auditStatus === 'notAudited' && row.closeStatus === 'notClosed'

const selectedRows = ref<any[]>([])
const tableRef = ref<TableInstance>()

const collabIndex = computed(() => buildCollabIndexForCompany())

const filteredData = computed(() => {
  return tableData.value.filter(row => {
    if (searchForm.value.keyword) {
      const keywords = searchForm.value.keyword.trim().split(/\s+/).filter(Boolean)
      const fields = [
        row.orderNo,
        row.externalNo,
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

    if (
      !matchesBusinessProcessFilter(
        row,
        searchForm.value.businessProcess,
        resolveSalesOrderBusinessProcess,
        collabIndex.value
      )
    ) {
      return false
    }

    if (!matchStatusFilter(row.auditStatus, searchForm.value.auditStatus)) return false
    if (!matchStatusFilter(row.confirmStatus, searchForm.value.confirmStatus)) return false
    if (!matchStatusFilter(row.executeStatus, searchForm.value.executeStatus)) return false
    if (!matchStatusFilter(row.closeStatus, searchForm.value.closeStatus)) return false
    if (!matchStatusFilter(row.prepaymentStatus, searchForm.value.prepaymentStatus)) return false
    if (!matchStatusFilter(row.receiveStatus, searchForm.value.receiveStatus)) return false

    return true
  })
})

const {
  sortOrders,
  getSortIcon,
  handleSort,
  sortRows: sortListRows
} = useDocumentColumnSort(
  computed(() => SALES_ORDER_LIST_COLUMN_DEFINITIONS.map(col => col.key))
)

const getSalesOrderSortValue = (row: Record<string, unknown>, colKey: string): string | number => {
  switch (colKey) {
    case 'amount':
      return parseDocumentMoneySortValue(row.amount)
    case 'itemCount':
      return Number(row.itemCount) || 0
    case 'auditStatus':
      return auditStatusLabels[String(row.auditStatus)] || String(row.auditStatus ?? '')
    case 'confirmStatus':
      return confirmStatusLabels[String(row.confirmStatus)] || String(row.confirmStatus ?? '')
    case 'executeStatus':
      return executeStatusLabels[String(row.executeStatus)] || String(row.executeStatus ?? '')
    case 'closeStatus':
      return closeStatusLabels[String(row.closeStatus)] || String(row.closeStatus ?? '')
    case 'prepaymentStatus':
      return prepaymentLabels[String(row.prepaymentStatus)] || String(row.prepaymentStatus ?? '-')
    case 'receiveStatus':
      return receiveStatusLabels[String(row.receiveStatus)] || '未接单'
    case 'status':
      return statusLabels[String(row.status)]?.text || String(row.status ?? '')
    default: {
      const col = SALES_ORDER_LIST_COLUMN_DEFINITIONS.find(c => c.key === colKey)
      const prop = col?.prop || colKey
      return String(row[prop] ?? '')
    }
  }
}

const sortedFilteredData = computed(() =>
  sortListRows(filteredData.value, getSalesOrderSortValue)
)

const onListColumnSort = (colKey: string) => {
  handleSort(colKey, () => {
    currentPage.value = 1
  })
}

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedFilteredData.value.slice(start, start + pageSize.value)
})

const {
  canNavFirst,
  canNavPrev,
  canNavNext,
  canNavLast,
  handleNavFirst,
  handleNavPrev,
  handleNavNext,
  handleNavLast,
  handleSelectionChange
} = useListTableNav({
  filteredData,
  selectedRows,
  currentPage,
  pageSize,
  tableRef
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
    const auditPerson = getCurrentUserName()
    let collabWarnings = 0
    let collabSuccess = 0
    let collabPushed = 0
    targets.forEach(row => {
      persistOrderChanges(row.id, {
        auditStatus: 'audited',
        auditor: auditPerson,
        auditTime,
        status: row.status === 'pending' ? 'processing' : row.status
      })
      const stored = JSON.parse(localStorage.getItem('sales-orders') || '[]')
      const fullOrder = stored.find((o: any) => o.id === row.id || o.orderNo === row.id) || row
      const collabResult = onSalesOrderAudited(fullOrder)
      if (collabResult.poUpdated) {
        persistOrderChanges(row.id, { receiveStatus: 'received' })
        collabSuccess += 1
      } else if (collabResult.poPushed) {
        collabPushed += 1
      } else if (collabResult.message) {
        collabWarnings += 1
      }
      addOperationLog(row.id, 'audit', auditPerson, '审核销售订单')
    })
    if (collabWarnings > 0) {
      ElMessage.warning(`已审核 ${targets.length} 条销售订单，其中 ${collabWarnings} 条协同处理需关注`)
    } else if (collabPushed > 0) {
      ElMessage.success(`已成功审核 ${targets.length} 条订单，并向买方推送 ${collabPushed} 条待审采购单`)
    } else if (collabSuccess > 0) {
      ElMessage.success(`已成功审核 ${targets.length} 条订单，并回写 ${collabSuccess} 条采购接单状态`)
    } else {
      ElMessage.success(`已成功审核 ${targets.length} 条订单`)
    }
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

const syncPresetDateRange = () => {
  if (!searchForm.value.selectedPreset) return
  handlePresetChange(searchForm.value.selectedPreset)
}

const saveSearchForm = () => {
  localStorage.setItem('sales-search-form', JSON.stringify({
    ...searchForm.value
  }))
}

const loadSearchForm = () => {
  const saved = localStorage.getItem('sales-search-form') || localStorage.getItem('sales-order-search-form')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      Object.assign(searchForm.value, parsed)
      searchForm.value.auditStatus = migrateSavedFilter(parsed.auditStatus ?? parsed.selectedAuditStatus)
      searchForm.value.confirmStatus = migrateSavedFilter(parsed.confirmStatus)
      searchForm.value.executeStatus = migrateSavedFilter(parsed.executeStatus ?? parsed.selectedExecuteStatus)
      searchForm.value.closeStatus = migrateSavedFilter(parsed.closeStatus ?? parsed.selectedCloseStatus)
      searchForm.value.prepaymentStatus = migrateSavedFilter(parsed.prepaymentStatus ?? parsed.selectedPrepaymentStatus)
      searchForm.value.receiveStatus = migrateSavedFilter(parsed.receiveStatus ?? parsed.selectedReceiveStatus)
      searchForm.value.businessProcess = normalizeBusinessProcessFilter(parsed.businessProcess)
      if (parsed.dateRange?.length) {
        searchForm.value.dateRange = parsed.dateRange.map((d: string) => new Date(d))
      }
    } catch {
      /* ignore */
    }
  }
}

watch(() => [
  searchForm.value.auditStatus,
  searchForm.value.confirmStatus,
  searchForm.value.executeStatus,
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
    closeStatus: ALL_FILTER_VALUE,
    prepaymentStatus: ALL_FILTER_VALUE,
    receiveStatus: ALL_FILTER_VALUE
  }
  currentPage.value = 1
  localStorage.removeItem('sales-search-form')
  localStorage.removeItem('sales-order-search-form')
}

onMounted(() => {
  document.title = PAGE_TITLE
  loadSearchForm()
  if (!searchForm.value.selectedPreset) {
    searchForm.value.selectedPreset = 'thisMonth'
  }
  syncPresetDateRange()
  loadData()

  if (filteredData.value.length === 0 && tableData.value.length > 0) {
    resetSearchForm()
  }
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-info">
        <h1>{{ PAGE_TITLE }}</h1>
        <div class="breadcrumb">{{ PAGE_BREADCRUMB }}</div>
      </div>
      <div class="nav-actions">
        <el-button size="small" :icon="DArrowLeft" circle :disabled="!canNavFirst" title="首张" @click="handleNavFirst" />
        <el-button size="small" :icon="ArrowLeft" circle :disabled="!canNavPrev" title="上一张" @click="handleNavPrev" />
        <el-button size="small" :icon="ArrowRight" circle :disabled="!canNavNext" title="下一张" @click="handleNavNext" />
        <el-button size="small" :icon="DArrowRight" circle :disabled="!canNavLast" title="末张" @click="handleNavLast" />
      </div>
    </div>

    <div class="search-card">
      <div class="search-row">
        <el-form :model="searchForm" inline class="search-form">
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
          <el-form-item label="业务流程">
            <el-select v-model="searchForm.businessProcess" placeholder="全部" clearable style="width: 120px;">
              <el-option v-for="opt in businessProcessOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
          <el-form-item class="keyword-input">
            <el-input
              v-model="searchForm.keyword"
              placeholder="客户/订单号/外部单号/制单人/商品规格/备注"
              clearable
              style="width: 300px;"
            />
          </el-form-item>
        </el-form>
        <div class="button-group">
          <el-button type="primary" class="btn-teal" @click="handleSearch">查询</el-button>
          <el-button @click="handleRefresh">刷新</el-button>
          <el-button type="primary" class="btn-teal" @click="handleReset">重置</el-button>
        </div>
      </div>
    </div>

    <div class="status-query-card">
      <div class="status-query-header">
        <span class="status-query-title">状态查询</span>
        <span class="status-query-tip">与列表状态列对应，点击标签快速筛选</span>
      </div>
      <div class="status-query-rows">
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
        <el-button type="primary" link size="small" class="btn-outbound-link" @click="handleOutbound">出库</el-button>
        <el-button type="primary" link size="small" @click="handleBatchModify">批量修改</el-button>
        <el-button type="primary" link size="small" class="btn-modify-pending" @click="handleApproveModify">同意修改</el-button>
        <el-button type="primary" link size="small" @click="handlePrint">打印</el-button>
        <el-button type="primary" link size="small" @click="handleCopy">复制</el-button>
        <el-button type="primary" link size="small" @click="handleExport">导出</el-button>
        <el-button type="primary" link size="small" @click="openColumnSettings">列表设置</el-button>
      </div>
      <div class="action-bar-extra">
        <el-button type="primary" class="btn-teal" size="small" @click="handleCreate">新增</el-button>
      </div>
    </div>

    <div class="table-card product-list-table-card">
      <div v-if="sortedVisibleColumns.length === 0" class="header-empty-tip">
        请点击「列表设置」选择要显示的列
      </div>
      <div v-else class="table-scroll product-list-table-scroll">
      <el-table
        ref="tableRef"
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
          <template v-if="col.sortable !== false" #header>
            <DocumentSortHeader
              :label="col.label"
              :sort-icon="getSortIcon(col.key)"
              :active="!!sortOrders[col.key]"
              :align="col.headerAlign || col.align || 'center'"
              @sort="onListColumnSort(col.key)"
            />
          </template>
          <template #default="{ row }">
            <span
              v-if="col.key === 'orderNo'"
              class="code-link"
              @click="handleOrderNoClick(row)"
            >{{ row.orderNo }}</span>
            <span v-else-if="col.key === 'externalNo'">{{ row.externalNo || '—' }}</span>
            <span v-else-if="col.key === 'customerPlatformCode'">{{ row.customerPlatformCode || '—' }}</span>
            <span v-else-if="col.key === 'warehouse'">{{ row.warehouse || '—' }}</span>
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
            <span v-else-if="col.key === 'creator'">{{ row.creator || '—' }}</span>
            <span v-else-if="col.key === 'salesman'">{{ row.salesman || '—' }}</span>
            <span v-else-if="col.key === 'auditor'">{{ row.auditor || '—' }}</span>
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
          :total="sortedFilteredData.length"
        />
      </div>
    </div>
  </div>

  <el-dialog v-model="showColumnSelector" title="销售订单列表设置" width="720px" draggable>
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
@import '@/styles/document-table-sort.scss';

.page-container {
  padding: 16px 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;

  .page-info {
    h1 {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin: 0 0 6px;
      line-height: 24px;
    }

    .breadcrumb {
      font-size: 13px;
      color: #667085;
      line-height: 20px;
    }
  }

  .nav-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    padding-left: 8px;
    border-left: 1px solid #e8e8e8;
  }
}

.status-query-card {
  background: #fff;
  border-radius: 4px;
  padding: 14px 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);

  .status-query-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px dashed #e4e7ed;
  }

  .status-query-title {
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }

  .status-query-tip {
    font-size: 12px;
    color: #909399;
  }

  .status-query-rows {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .filter-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px 24px;
    align-items: center;
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
    flex: 1;
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

  .btn-outbound-link {
    color: #409eff !important;
    font-weight: 600;

    &:hover,
    &:focus {
      color: #66b1ff !important;
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

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
