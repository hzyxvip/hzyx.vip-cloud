<script setup lang="ts">
import '@/styles/product-list-table.scss'
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, MoreFilled } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { useTableStyle } from '@/composables/useTableStyle'
import { usePurchaseOrderListColumnSettings, PURCHASE_ORDER_LIST_COLUMN_DEFINITIONS } from '@/composables/usePurchaseOrderListColumnSettings'
import {
  canDeletePurchaseOrder,
  canUnAuditPurchaseOrder,
  getCollabLinks,
  onPurchaseOrderAudited,
  type PurchaseOrderAuditedCollabResult
} from '@/utils/platformCollaborationService'
import { calcDealAmountFromOrder } from '@/utils/purchaseOrderAmount'
import { resolveSupplierPlatformCode } from '@/utils/orderListPartnerCodes'
import {
  checkPurchaseOrderProductsAudited,
  formatUnapprovedProductsMessage
} from '@/utils/productStore'
import { requiresConfirmBeforeAudit } from '@/utils/auditSystemSettings'
import {
  mergePurchaseOrderListRows,
  loadRawPurchaseOrdersFromStorage
} from '@/utils/purchaseOrderListData'
import { applyPurchaseOrderSettlementToStorage } from '@/utils/fundOrderAllocation'
import {
  PURCHASE_BUSINESS_PROCESS_OPTIONS,
  buildCollabIndexForCompany,
  getCurrentCompanyId,
  matchesBusinessProcessFilter,
  normalizeBusinessProcessFilter,
  resolvePurchaseOrderBusinessProcess,
  stampOrderCompanyId
} from '@/utils/orderBusinessProcess'
import { parseDocumentMoneySortValue } from '@/utils/documentTableSort'
import { useDocumentColumnSort } from '@/composables/useDocumentColumnSort'
import DocumentSortHeader from '@/components/common/DocumentSortHeader.vue'

import {
  CONFIRM_STATUS_CONFIRMED,
  normalizeConfirmStatus
} from '@/utils/documentFunctionSettings'
import { requireTenantCompanyId } from '@/utils/tenantGuard'
import { syncPurchaseOrdersToServer } from '@/utils/orderSyncService'
import { hasPermission } from '@/utils/userPermission'

const router = useRouter()
const showAdvancedFilter = ref(true)
const importInputRef = ref<HTMLInputElement | null>(null)

const PAGE_TITLE = '采购订单记录'
const PAGE_BREADCRUMB = '首页 / 采购管理 / 采购单据 / 采购订单记录'

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

const businessProcessOptions = PURCHASE_BUSINESS_PROCESS_OPTIONS

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
  { key: 'supplier', label: '供应商', defaultWidth: 180 },
  { key: 'supplierPlatformCode', label: '医享平台供应商编号', defaultWidth: 150 },
  { key: 'date', label: '下单日期', defaultWidth: 110 },
  { key: 'itemCount', label: '商品种类', defaultWidth: 90 },
  { key: 'amount', label: '成交金额', defaultWidth: 120 },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 90 },
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
  applyPurchaseOrderSettlementToStorage()
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

  const savedOrders = loadRawPurchaseOrdersFromStorage()
  tableData.value = mergePurchaseOrderListRows(savedOrders).map(normalizeSavedOrder)
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
  const orders = JSON.parse(localStorage.getItem('purchase-orders') || '[]')
  const row = tableData.value.find(r => r.id === orderId)
  if (row) Object.assign(row, changes)

  const index = orders.findIndex((o: any) => o.id === orderId || o.orderNo === orderId)
  if (index > -1) {
    orders[index] = stampOrderCompanyId({ ...orders[index], ...changes }, companyId)
  } else if (row) {
    orders.unshift(stampOrderCompanyId({ ...row, ...changes }, companyId))
  }
  localStorage.setItem('purchase-orders', JSON.stringify(orders))
  void syncPurchaseOrdersToServer()
}

const canUnAuditOrder = (row: any) => canUnAuditPurchaseOrder(row)

/** 仅未审核 + 未关闭可删除 */
const canDeleteOrder = (row: any) => canDeletePurchaseOrder(row)

const selectedRows = ref<any[]>([])

const matchStatusFilter = (rowValue: string, filterValue: string) => {
  if (!filterValue || filterValue === ALL_FILTER_VALUE) return true
  return rowValue === filterValue
}

const collabIndex = computed(() => buildCollabIndexForCompany())

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

    if (
      !matchesBusinessProcessFilter(
        row,
        searchForm.value.businessProcess,
        resolvePurchaseOrderBusinessProcess,
        collabIndex.value
      )
    ) {
      return false
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

const {
  sortOrders,
  getSortIcon,
  handleSort,
  sortRows: sortListRows
} = useDocumentColumnSort(
  computed(() => PURCHASE_ORDER_LIST_COLUMN_DEFINITIONS.map(col => col.key))
)

const getOrderSortValue = (row: Record<string, unknown>, colKey: string): string | number => {
  switch (colKey) {
    case 'amount':
      return parseDocumentMoneySortValue(row.amount)
    case 'itemCount':
      return Number(row.itemCount) || 0
    case 'auditStatus':
      return auditStatusLabels[String(row.auditStatus)] || String(row.auditStatus ?? '')
    case 'executeStatus':
      return executeStatusLabels[String(row.executeStatus)] || String(row.executeStatus ?? '')
    case 'warehouseStatus':
      return warehouseStatusLabels[String(row.warehouseStatus)] || String(row.warehouseStatus ?? '')
    case 'closeStatus':
      return closeStatusLabels[String(row.closeStatus)] || String(row.closeStatus ?? '')
    case 'prepaymentStatus':
      return prepaymentLabels[String(row.prepaymentStatus)] || String(row.prepaymentStatus ?? '-')
    case 'receiveStatus':
      return receiveStatusLabels[String(row.receiveStatus)] || '未接单'
    case 'status':
      return statusLabels[String(row.status)]?.text || String(row.status ?? '')
    default: {
      const col = PURCHASE_ORDER_LIST_COLUMN_DEFINITIONS.find(c => c.key === colKey)
      const prop = col?.prop || colKey
      return String(row[prop] ?? '')
    }
  }
}

const sortedFilteredData = computed(() =>
  sortListRows(filteredData.value, getOrderSortValue)
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

const handleSelectionChange = (val: any[]) => {
  selectedRows.value = val
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

const handleCreate = () => router.push('/purchase/order-list/create')

const IMPORT_LABEL_TO_KEY = Object.fromEntries(
  PURCHASE_ORDER_LIST_COLUMN_DEFINITIONS.map(col => [col.label, col.prop || col.key])
)

const IMPORT_STATUS_REVERSE: Record<string, Record<string, string>> = {
  auditStatus: { 未审核: 'notAudited', 已审核: 'audited' },
  executeStatus: { 未执行: 'notExecuted', 部分执行: 'partiallyExecuted', 全部执行: 'allExecuted' },
  warehouseStatus: { 未入库: 'notInWarehoused', 部分入库: 'partiallyInWarehoused', 全部入库: 'allInWarehoused' },
  closeStatus: { 未关闭: 'notClosed', 已关闭: 'closed', 手动关闭: 'manualClosed' },
  prepaymentStatus: {
    已预付未审核: 'prepaidNotAudited',
    已审核部分核销: 'prepaidPartiallyAudited',
    已审核已核销: 'prepaidAudited'
  },
  receiveStatus: { 已接单: 'received', 未接单: 'notReceived' },
  status: { 待处理: 'pending', 进行中: 'processing', 已完成: 'completed', 已取消: 'cancelled' }
}

const parseImportedOrderRow = (row: Record<string, unknown>): Record<string, unknown> | null => {
  const order: Record<string, unknown> = {}
  Object.entries(IMPORT_LABEL_TO_KEY).forEach(([label, key]) => {
    const raw = row[label]
    if (raw === undefined || raw === '') return
    const text = String(raw).trim()
    const reversed = IMPORT_STATUS_REVERSE[key]?.[text]
    order[key] = reversed ?? raw
  })
  const id = String(order.orderNo || order.id || '').trim()
  if (!id) return null
  order.id = id
  order.orderNo = order.orderNo || id
  order.creator = order.creator || '系统管理员'
  order.auditStatus = order.auditStatus || 'notAudited'
  order.receiveStatus = order.receiveStatus || 'notReceived'
  order.status = order.status || 'pending'
  return order
}

const persistImportedOrders = (orders: Record<string, unknown>[]) => {
  const stored = loadRawPurchaseOrdersFromStorage()
  let added = 0
  let updated = 0
  orders.forEach(order => {
    const id = String(order.id)
    const stamped = stampOrderCompanyId(order, getCurrentCompanyId())
    const index = stored.findIndex(
      o => String(o.id) === id || String(o.orderNo) === id
    )
    if (index >= 0) {
      stored[index] = { ...stored[index], ...stamped }
      updated++
    } else {
      stored.unshift(stamped)
      added++
    }
  })
  localStorage.setItem('purchase-orders', JSON.stringify(stored))
  loadData()
  currentPage.value = 1
  ElMessage.success(`引入完成：新增 ${added} 条，更新 ${updated} 条`)
}

const handleImportClick = () => {
  importInputRef.value?.click()
}

const handleImportFile = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const buffer = e.target?.result
      if (!buffer) throw new Error('empty')
      const workbook = XLSX.read(new Uint8Array(buffer as ArrayBuffer), { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
      const parsed = rows.map(parseImportedOrderRow).filter(Boolean) as Record<string, unknown>[]
      if (parsed.length === 0) {
        ElMessage.warning('未识别到有效订单，请确认含「订单号」列')
        return
      }
      persistImportedOrders(parsed)
    } catch {
      ElMessage.error('引入失败，请检查 Excel 文件格式')
    }
  }
  reader.onerror = () => ElMessage.error('读取文件失败')
  reader.readAsArrayBuffer(file)
}

/** 引出：导出当前筛选/选中列表为 Excel */
const handleExportOut = () => {
  handleExport()
}

const INBOUND_STORAGE_KEY = 'purchaseInboundList'

const resolveLinkedSalesOrderNo = (row: Record<string, unknown>): string => {
  const direct = String(row.sellerOrderNo || '').trim()
  if (direct) return direct
  const poId = String(row.id || row.orderNo || '').trim()
  if (!poId) return ''
  const link = getCollabLinks().find(l =>
    l.buyerOrderId === poId || l.buyerOrderNo === poId
  )
  const fromLink = String(link?.sellerOrderNo || link?.sellerOrderId || '').trim()
  if (!fromLink) return ''
  const orders = JSON.parse(localStorage.getItem('sales-orders') || '[]') as Record<string, unknown>[]
  const matched = orders.find(item =>
    String(item.orderNo) === fromLink || String(item.id) === fromLink
  )
  return String(matched?.orderNo || fromLink)
}

const resolveLinkedSalesOrderId = (row: Record<string, unknown>): string => {
  const direct = String(row.sellerOrderId || row.sellerOrderNo || '').trim()
  if (direct) return direct
  const poId = String(row.id || row.orderNo || '').trim()
  if (!poId) return ''
  const link = getCollabLinks().find(l =>
    l.buyerOrderId === poId || l.buyerOrderNo === poId
  )
  return String(link?.sellerOrderId || link?.sellerOrderNo || '').trim()
}

const resolveLinkedInboundNo = (row: Record<string, unknown>): string => {
  const poId = String(row.id || row.orderNo || '').trim()
  if (!poId) return ''
  const list = JSON.parse(localStorage.getItem(INBOUND_STORAGE_KEY) || '[]') as Record<string, unknown>[]
  const matched = list.find(item =>
    String(item.purchaseOrderId || item.orderNo || '') === poId
    || String(item.orderNo || '') === poId
  )
  if (!matched) return ''
  return String(matched.inboundNo || matched.id || '')
}

const resolveLinkedInboundId = (row: Record<string, unknown>): string => {
  const poId = String(row.id || row.orderNo || '').trim()
  if (!poId) return ''
  const list = JSON.parse(localStorage.getItem(INBOUND_STORAGE_KEY) || '[]') as Record<string, unknown>[]
  const matched = list.find(item =>
    String(item.purchaseOrderId || item.orderNo || '') === poId
    || String(item.orderNo || '') === poId
  )
  return matched ? String(matched.id || matched.inboundNo || '') : ''
}

const formatRowCellValue = (row: Record<string, unknown>, colKey: string): string => {
  const val = row[colKey]
  if (colKey === 'auditStatus') return auditStatusLabels[String(val)] || String(val || '')
  if (colKey === 'executeStatus') return executeStatusLabels[String(val)] || String(val || '')
  if (colKey === 'warehouseStatus') return warehouseStatusLabels[String(val)] || String(val || '')
  if (colKey === 'closeStatus') return closeStatusLabels[String(val)] || String(val || '')
  if (colKey === 'prepaymentStatus') return prepaymentLabels[String(val)] || '-'
  if (colKey === 'receiveStatus') return receiveStatusLabels[String(val)] || '未接单'
  if (colKey === 'status') return statusLabels[String(val)]?.text || String(val || '')
  if (colKey === 'supplierPlatformCode') return String(val || '—')
  return String(val ?? '')
}

const getPrintTargetRows = (multiple: boolean) => {
  if (multiple) {
    if (!requireSelection()) return []
    return selectedRows.value
  }
  const row = getSelectedRow()
  return row ? [row] : []
}

const exportRowsToExcel = (rows: Record<string, unknown>[], fileName: string) => {
  const cols = sortedVisibleColumns.value
  if (cols.length === 0) {
    ElMessage.warning('请先通过「列表设置」选择要导出的列')
    return
  }
  const exportData = rows.map(row => {
    const record: Record<string, string> = {}
    cols.forEach(col => {
      record[col.label] = formatRowCellValue(row, col.prop || col.key)
    })
    return record
  })
  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '采购订单')
  XLSX.writeFile(workbook, fileName)
}

const printListRows = (rows: Record<string, unknown>[], title: string, preview = false) => {
  const cols = sortedVisibleColumns.value
  if (cols.length === 0) {
    ElMessage.warning('请先通过「列表设置」选择要打印的列')
    return
  }
  const head = cols.map(col => `<th>${col.label}</th>`).join('')
  const body = rows.map(row => {
    const cells = cols.map(col => `<td>${formatRowCellValue(row, col.prop || col.key)}</td>`).join('')
    return `<tr>${cells}</tr>`
  }).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
body { font-family: "SimSun", serif; font-size: 12px; margin: 16px; }
h2 { text-align: center; margin-bottom: 12px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #000; padding: 4px 6px; text-align: center; }
</style></head><body>
<h2>${title}</h2>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`
  const win = window.open('', '_blank')
  if (!win) {
    ElMessage.error('无法打开打印窗口，请检查浏览器弹窗设置')
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  if (preview) return
  win.print()
}

const handlePrint = () => {
  const rows = getPrintTargetRows(false)
  if (rows.length === 0) return
  printListRows(rows, '采购订单', false)
  addOperationLog(String(rows[0].id), 'print', '系统管理员', '打印采购订单')
  ElMessage.success(`正在打印订单 ${rows[0].orderNo}`)
}

const handlePrintCommand = (command: string) => {
  if (command === 'printSettings') {
    router.push('/system/print')
    return
  }
  if (command === 'listPrint') {
    const rows = selectedRows.value.length > 0 ? selectedRows.value : filteredData.value
    if (rows.length === 0) {
      ElMessage.warning('当前没有可打印的数据')
      return
    }
    printListRows(rows, '采购订单列表', false)
    ElMessage.success(`正在打印 ${rows.length} 条采购订单列表`)
    return
  }
  if (command === 'exportExcel') {
    const rows = getPrintTargetRows(false) as Record<string, unknown>[]
    if (rows.length === 0) return
    const orderNo = String(rows[0].orderNo || rows[0].id)
    exportRowsToExcel(rows, `采购订单_${orderNo}.xlsx`)
    ElMessage.success(`已导出订单 ${orderNo}`)
    return
  }
  if (command === 'mergeExportExcel') {
    if (!requireSelection()) return
    const ids = selectedRows.value.map(row => String(row.orderNo || row.id)).join('_')
    exportRowsToExcel(selectedRows.value, `采购订单合并_${ids.slice(0, 40)}.xlsx`)
    ElMessage.success(`已合并导出 ${selectedRows.value.length} 条采购订单`)
    return
  }
  if (command === 'printPreview') {
    const rows = getPrintTargetRows(false)
    if (rows.length === 0) return
    printListRows(rows, '采购订单', true)
    ElMessage.info(`打印预览：订单 ${rows[0].orderNo}`)
    return
  }
  if (command === 'mergePrintPreview') {
    if (!requireSelection()) return
    printListRows(selectedRows.value, '采购订单（合并）', true)
    ElMessage.info(`合并打印预览：${selectedRows.value.length} 条订单`)
    return
  }
  if (command === 'mergePrint') {
    if (!requireSelection()) return
    printListRows(selectedRows.value, '采购订单（合并）', false)
    ElMessage.success(`正在合并打印 ${selectedRows.value.length} 条采购订单`)
  }
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
    let collabSuccess = 0
    let collabWarnings = 0
    targets.forEach(row => {
      persistOrderChanges(row.id, {
        auditStatus: 'audited',
        auditor: '系统管理员',
        auditTime,
        status: row.status === 'pending' ? 'processing' : row.status
      })
      const stored = JSON.parse(localStorage.getItem('purchase-orders') || '[]')
      const fullOrder = stored.find((o: any) => o.id === row.id) || row
      const collab: PurchaseOrderAuditedCollabResult = onPurchaseOrderAudited(fullOrder)
      if (collab.link) {
        const refreshed = JSON.parse(localStorage.getItem('purchase-orders') || '[]')
        const updated = refreshed.find((o: any) => o.id === row.id)
        persistOrderChanges(row.id, {
          sendStatus: updated?.sendStatus,
          receiveStatus: updated?.receiveStatus,
          platformOrderNo: updated?.platformOrderNo ?? collab.link.platformOrderNo,
          sellerOrderId: updated?.sellerOrderId ?? collab.link.sellerOrderId,
          sellerOrderNo: updated?.sellerOrderNo ?? collab.link.sellerOrderNo
        })
      }
      if (collab.mode === 'so_first' && !collab.link) collabWarnings += 1
      else if (collab.link && collab.mode !== 'already_linked') collabSuccess += 1
      addOperationLog(row.id, 'audit', '系统管理员', '审核采购订单')
    })
    if (collabWarnings > 0) {
      ElMessage.warning(`已审核 ${targets.length} 条，其中 ${collabWarnings} 条未找到对方销售订单`)
    } else if (collabSuccess > 0) {
      ElMessage.success(`已成功审核 ${targets.length} 条订单，${collabSuccess} 条已触发协同`)
    } else {
      ElMessage.success(`已成功审核 ${targets.length} 条订单`)
    }
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

const purchaseOrderConfirmEnabled = computed(() => requiresConfirmBeforeAudit())

const handleBatchConfirm = () => {
  if (!requireSelection()) return
  if (!hasPermission('purchase_confirm')) {
    ElMessage.warning('无确定权限')
    return
  }
  const targets = selectedRows.value.filter(
    row => normalizeConfirmStatus(row.confirmStatus) !== CONFIRM_STATUS_CONFIRMED
  )
  if (targets.length === 0) {
    ElMessage.info('所选订单均已确定')
    return
  }
  targets.forEach(row => {
    persistOrderChanges(row.id, { confirmStatus: CONFIRM_STATUS_CONFIRMED })
  })
  ElMessage.success(`已确定 ${targets.length} 条采购订单`)
}

const handleModifyRequest = () => {
  const row = getSelectedRow()
  if (!row) return
  if (row.auditStatus !== 'audited') {
    ElMessage.warning('请先审核采购订单')
    return
  }
  router.push(`/purchase/order-list/create/${row.id}`)
  ElMessage.info('请在单据页提交「申请修改」')
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

const parseOrderAmount = (row: Record<string, unknown>) => {
  const raw = String(row.amount || '0').replace(/[¥,]/g, '')
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : 0
}

const resolvePrepayAmount = (row: Record<string, unknown>) => {
  const orders = JSON.parse(localStorage.getItem('purchase-orders') || '[]') as Record<string, unknown>[]
  const full = orders.find(o => String(o.id) === String(row.id)) || row
  const prepaid = Number(full.prepaidDeposit) || 0
  if (prepaid > 0) return prepaid
  const depositRatio = Number(full.depositRatio) || 0
  if (depositRatio > 0) {
    const receivable = Number(full.receivableAmount) || parseOrderAmount(row)
    return Number((receivable * depositRatio / 100).toFixed(2))
  }
  return parseOrderAmount(row)
}

const handlePrepay = () => {
  if (!requireSelection(false)) return
  const row = selectedRows.value[0]
  if (row.auditStatus !== 'audited') {
    ElMessage.warning('请先审核采购订单后再预付')
    return
  }
  if (row.closeStatus === 'closed' || row.closeStatus === 'manualClosed') {
    ElMessage.warning('已关闭的采购订单不能预付')
    return
  }
  const orderNo = String(row.orderNo || row.id)
  const amount = resolvePrepayAmount(row)
  if (amount <= 0) {
    ElMessage.warning('预付金额须大于 0')
    return
  }
  persistOrderChanges(row.id, { prepaymentStatus: 'prepaidNotAudited' })
  addOperationLog(row.id, 'prepay', '系统管理员', `发起预付款，金额 ${amount}`)
  router.push({
    path: '/fund/pre-payment',
    query: {
      partner: String(row.supplier || ''),
      sourceOrderNo: orderNo,
      amount: String(amount),
      remark: `采购订单 ${orderNo} 预付款`
    }
  })
}

const handleMergeInbound = () => {
  if (!requireSelection()) return
  const unaudited = selectedRows.value.filter(row => row.auditStatus !== 'audited')
  if (unaudited.length > 0) {
    ElMessage.warning('请先审核所选采购订单后再合并入库')
    return
  }
  const orderIds = selectedRows.value.map(row => String(row.id)).join(',')
  router.push({
    path: '/purchase/inbound',
    query: { merge: '1', orderIds }
  })
  ElMessage.success(`正在合并 ${selectedRows.value.length} 条采购订单入库`)
}

const handleInbound = () => {
  if (!requireSelection(false)) return
  const row = selectedRows.value[0]
  if (row.auditStatus !== 'audited') {
    ElMessage.warning('请先审核采购订单后再入库')
    return
  }
  if (row.closeStatus === 'closed' || row.closeStatus === 'manualClosed') {
    ElMessage.warning('已关闭的采购订单不能入库')
    return
  }
  addOperationLog(row.id, 'inbound', '系统管理员', '生成采购入库单')
  router.push({ path: '/purchase/inbound', query: { orderId: row.id, from: 'purchaseOrder' } })
}

const handleAttachmentDownload = () => {
  const row = getSelectedRow()
  if (!row) return
  const orders = JSON.parse(localStorage.getItem('purchase-orders') || '[]') as Record<string, unknown>[]
  const full = orders.find(o => String(o.id) === String(row.id)) || row
  const attachments = Array.isArray(full.attachments) ? full.attachments : []
  const count = attachments.length || Number(full.attachmentCount) || 0
  if (count <= 0) {
    ElMessage.warning('该采购订单暂无附件')
    return
  }
  attachments.forEach((item, index) => {
    const file = item as Record<string, unknown>
    const url = String(file.url || file.path || '')
    const name = String(file.name || file.fileName || `附件${index + 1}`)
    if (!url) return
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
  })
  addOperationLog(row.id, 'downloadAttachment', '系统管理员', `下载采购订单附件（${count} 个）`)
  ElMessage.success(`已开始下载 ${count} 个附件`)
}

const handleBatchModifyCommand = (command: string) => {
  if (!requireSelection()) return
  const count = selectedRows.value.length
  const labels: Record<string, string> = {
    batchModify: '批量修改',
    deliveryInfo: '修改交货信息',
    docTag: '修改单据标签',
    clearDocTag: '清空单据标签',
    batchFee: '批录费用'
  }
  ElMessage.info(`${labels[command] || command}：已选择 ${count} 条采购订单`)
}

const handleUpdateCommand = (command: string) => {
  if (!requireSelection()) return
  const count = selectedRows.value.length
  const labels: Record<string, string> = {
    reprice: '重新取价',
    extractStock: '提取库存',
    updateBarcode: '更新条形码',
    updateSupplierCode: '更新供应商商品编码'
  }
  ElMessage.info(`${labels[command] || command}：已选择 ${count} 条采购订单`)
}

const openLinkedSalesOrder = (row: Record<string, unknown>) => {
  const salesOrderId = resolveLinkedSalesOrderId(row)
  if (!salesOrderId) return false
  const orders = JSON.parse(localStorage.getItem('sales-orders') || '[]') as Record<string, unknown>[]
  const so = orders.find(item =>
    String(item.orderNo) === salesOrderId || String(item.id) === salesOrderId
  )
  if (so?.id) {
    router.push(`/sales/order-list/create/${so.id}`)
    return true
  }
  router.push(`/sales/order-list/create/${salesOrderId}`)
  return true
}

const openLinkedPurchaseInbound = (row: Record<string, unknown>) => {
  const inboundId = resolveLinkedInboundId(row)
  if (!inboundId) return false
  router.push({ path: '/purchase/inbound', query: { id: inboundId } })
  return true
}

const handleViewLinkedSalesOrderNo = () => {
  if (!requireSelection(false)) return
  const row = selectedRows.value[0]
  const orderNo = resolveLinkedSalesOrderNo(row)
  if (!orderNo) {
    ElMessage.warning('该采购订单未关联对方销售订单号')
    return
  }
  ElMessageBox.confirm(
    `对方销售订单号：${orderNo}`,
    '查看对方销售订单号',
    { confirmButtonText: '打开单据', cancelButtonText: '关闭', type: 'info' }
  ).then(() => {
    openLinkedSalesOrder(row)
  }).catch(() => {})
}

const handleViewLinkedInboundNo = () => {
  if (!requireSelection(false)) return
  const row = selectedRows.value[0]
  const inboundNo = resolveLinkedInboundNo(row)
  if (!inboundNo) {
    ElMessage.warning('该采购订单暂无关联的采购入库单号')
    return
  }
  ElMessageBox.confirm(
    `采购入库单号：${inboundNo}`,
    '查看采购入库单号',
    { confirmButtonText: '打开单据', cancelButtonText: '关闭', type: 'info' }
  ).then(() => {
    openLinkedPurchaseInbound(row)
  }).catch(() => {})
}

const handleRelatedDocCommand = (command: string) => {
  if (command === 'salesOrder') {
    handleViewLinkedSalesOrderNo()
    return
  }
  if (command === 'purchaseInbound') {
    handleViewLinkedInboundNo()
  }
}

const handleToSalesOrder = () => {
  if (!requireSelection(false)) return
  const row = selectedRows.value[0]
  router.push({ path: '/sales/order-list/create', query: { fromPurchaseOrder: row.id } })
}

const handleExport = () => {
  const rows = selectedRows.value.length > 0 ? selectedRows.value : filteredData.value
  if (rows.length === 0) {
    ElMessage.warning('没有可导出的数据')
    return
  }
  exportRowsToExcel(rows as Record<string, unknown>[], `采购订单_${Date.now()}.xlsx`)
  ElMessage.success(`已导出 ${rows.length} 条采购订单`)
}

const handleMoreCommand = (command: string) => {
  if (command === 'copy') {
    handleCopy()
    return
  }
  if (command === 'export') {
    handleExport()
    return
  }
  const map: Record<string, string> = {
    template: '保存为模板',
    import: '导入'
  }
  ElMessage.info(map[command] || '操作成功')
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

const handleRefresh = () => {
  loadData()
  currentPage.value = 1
  ElMessage.success('数据已刷新')
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
      searchForm.value.executeStatus = migrateSavedFilter(parsed.executeStatus)
      searchForm.value.warehouseStatus = migrateSavedFilter(parsed.warehouseStatus)
      searchForm.value.closeStatus = migrateSavedFilter(parsed.closeStatus)
      searchForm.value.prepaymentStatus = migrateSavedFilter(parsed.prepaymentStatus)
      searchForm.value.receiveStatus = migrateSavedFilter(parsed.receiveStatus ?? parsed.settleStatus)
      searchForm.value.businessProcess = normalizeBusinessProcessFilter(parsed.businessProcess)
      if (parsed.dateRange?.length) {
        searchForm.value.dateRange = parsed.dateRange.map((d: string) => new Date(d))
      }
      showAdvancedFilter.value = parsed.showAdvancedFilter !== false
    } catch {}
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
  localStorage.removeItem('purchase-search-form')
}

const handleReset = () => {
  resetSearchForm()
  ElMessage.success('已重置筛选条件')
}

onMounted(() => {
  document.title = PAGE_TITLE
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
    <div class="page-header">
      <div class="page-info">
        <h1>{{ PAGE_TITLE }}</h1>
        <div class="breadcrumb">{{ PAGE_BREADCRUMB }}</div>
      </div>
    </div>
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
          <el-button type="primary" class="btn-teal" @click="handleCreate">新增</el-button>
          <el-button class="btn-refresh-light" @click="handleRefresh">刷新</el-button>
          <el-button class="btn-refresh-light" @click="handleReset">重置</el-button>
          <el-button class="btn-refresh-light" @click="showAdvancedFilter = !showAdvancedFilter">
            {{ showAdvancedFilter ? '隐匿筛选' : '显示筛选' }}
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
        <el-button
          v-if="purchaseOrderConfirmEnabled"
          type="primary"
          link
          size="small"
          @click="handleBatchConfirm"
        >确定</el-button>
        <el-button type="primary" link size="small" class="btn-modify-link" @click="handleModifyRequest">申请修改</el-button>
        <el-button type="primary" link size="small" @click="handleEnable">启用</el-button>
        <el-button type="primary" link size="small" @click="handleClose">关闭</el-button>
        <el-button type="primary" link size="small" @click="handlePrepay">预付</el-button>
        <el-button type="primary" link size="small" @click="handleInbound">入库</el-button>
        <el-button type="primary" link size="small" @click="handleMergeInbound">合并入库</el-button>
        <el-dropdown trigger="click" @command="handlePrintCommand">
          <el-button type="primary" link size="small">
            打印(含附件/列表)<el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="printPreview">打印预览</el-dropdown-item>
              <el-dropdown-item command="exportExcel">导出为Excel</el-dropdown-item>
              <el-dropdown-item command="mergePrint">合并打印</el-dropdown-item>
              <el-dropdown-item command="mergePrintPreview">合并打印预览</el-dropdown-item>
              <el-dropdown-item command="mergeExportExcel">合并导出为Excel</el-dropdown-item>
              <el-dropdown-item command="printSettings">打印设置</el-dropdown-item>
              <el-dropdown-item command="listPrint">列表打印</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown trigger="click" @command="handleRelatedDocCommand">
          <el-button type="primary" link size="small">
            关联单据<el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="salesOrder">查看对方销售订单号</el-dropdown-item>
              <el-dropdown-item command="purchaseInbound">查看采购入库单号</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown trigger="click" @command="handleUpdateCommand">
          <el-button type="primary" link size="small">
            更新<el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="reprice">重新取价</el-dropdown-item>
              <el-dropdown-item command="extractStock">提取库存</el-dropdown-item>
              <el-dropdown-item command="updateBarcode">更新条形码</el-dropdown-item>
              <el-dropdown-item command="updateSupplierCode">更新供应商商品编码</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown trigger="click" @command="handleBatchModifyCommand">
          <el-button type="primary" link size="small">
            批量修改<el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="batchModify">批量修改</el-dropdown-item>
              <el-dropdown-item command="deliveryInfo">修改交货信息</el-dropdown-item>
              <el-dropdown-item command="docTag">修改单据标签</el-dropdown-item>
              <el-dropdown-item command="clearDocTag">清空单据标签</el-dropdown-item>
              <el-dropdown-item command="batchFee">批录费用</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="primary" link size="small" @click="handleCopy">复制</el-button>
        <el-button type="primary" link size="small" @click="handleExport">导出</el-button>
        <el-dropdown trigger="click" @command="handleMoreCommand">
          <el-button type="primary" link size="small">
            更多<el-icon class="el-icon--right"><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="copy">复制单据</el-dropdown-item>
              <el-dropdown-item command="template">保存为模板</el-dropdown-item>
              <el-dropdown-item command="export">导出</el-dropdown-item>
              <el-dropdown-item command="import">导入</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="primary" link size="small" @click="handleAttachmentDownload">下载附件</el-button>
        <el-button type="primary" link size="small" @click="openColumnSettings">列表设置</el-button>
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
            <span v-else-if="col.key === 'supplierPlatformCode'">{{ row.supplierPlatformCode || '—' }}</span>
            <el-tag
              v-else-if="col.key === 'auditStatus'"
              size="small"
              :type="row.auditStatus === 'audited' ? 'success' : 'info'"
            >
              {{ auditStatusLabels[row.auditStatus] }}
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

.page-header {
  margin-bottom: 12px;

  .page-info {
    min-width: 0;

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
}

.btn-teal {
  --el-button-bg-color: #00bfa5;
  --el-button-border-color: #00bfa5;
  --el-button-hover-bg-color: #00a896;
  --el-button-hover-border-color: #00a896;
  --el-button-active-bg-color: #008f7a;
  --el-button-active-border-color: #008f7a;
}

.btn-refresh-light {
  --el-button-bg-color: #fff;
  --el-button-border-color: #e4e7ed;
  --el-button-text-color: #909399;
  --el-button-hover-bg-color: #fff;
  --el-button-hover-border-color: #79bbff;
  --el-button-hover-text-color: #79bbff;
  --el-button-active-bg-color: #fff;
  --el-button-active-border-color: #66b1ff;
  --el-button-active-text-color: #66b1ff;
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

  .btn-modify-link {
    color: #e6a23c !important;

    &:hover,
    &:focus {
      color: #ebb563 !important;
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

@import '@/styles/document-table-sort.scss';

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
