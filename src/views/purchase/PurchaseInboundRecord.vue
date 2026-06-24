<script setup lang="ts">
import '@/styles/product-list-table.scss'
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTableStyle } from '@/composables/useTableStyle'
import { usePurchaseInboundRecordColumnSettings } from '@/composables/usePurchaseInboundRecordColumnSettings'
import {
  onPurchaseInboundAudited,
  onPurchaseInboundDeleted,
  backfillInboundAmounts,
  calcInboundItemsAmount,
  enrichInboundRecord,
  getCollabLinks
} from '@/utils/platformCollaborationService'

const router = useRouter()
const showAdvancedFilter = ref(true)

const PAGE_TITLE = '采购入库单记录'

const INBOUND_STORAGE_KEY = 'purchaseInboundList'
const SEARCH_FORM_KEY = 'purchase-inbound-search-form'
const OPERATION_LOG_KEY = 'purchase-inbound-operation-logs'

const operationLogs = ref<any[]>(JSON.parse(localStorage.getItem(OPERATION_LOG_KEY) || '[]'))

const addOperationLog = (inboundId: string, operationType: string, operator: string, remark: string) => {
  const log = {
    id: Date.now(),
    inboundId,
    operationType,
    operator,
    operationTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    remark
  }
  operationLogs.value.unshift(log)
  localStorage.setItem(OPERATION_LOG_KEY, JSON.stringify(operationLogs.value))
}

const logisticsCompanyMap: Record<string, string> = {
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

const auditStatusOptions = [
  { label: '未审核', value: 'notAudited' },
  { label: '已审核', value: 'audited' }
]

const inboundStatusOptions = [
  { label: '未入库', value: 'notInWarehoused' },
  { label: '部分入库', value: 'partiallyInWarehoused' },
  { label: '全部入库', value: 'allInWarehoused' }
]

const paymentStatusOptions = [
  { label: '未付款', value: 'notPaid' },
  { label: '部分付款', value: 'partiallyPaid' },
  { label: '已付款', value: 'paid' }
]

const docStatusOptions = [
  { label: '待审核', value: 'pending' },
  { label: '审核中', value: 'processing' },
  { label: '已完成', value: 'completed' },
  { label: '已作废', value: 'cancelled' }
]

const closeStatusOptions = [
  { label: '未关闭', value: 'notClosed' },
  { label: '已关闭', value: 'closed' },
  { label: '手动关闭', value: 'manualClosed' }
]

const logisticsStatusOptions = [
  { label: '无物流', value: 'noLogistics' },
  { label: '在途', value: 'inTransit' },
  { label: '已签收', value: 'signed' }
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
  | 'inboundStatus'
  | 'docStatus'
  | 'paymentStatus'
  | 'closeStatus'
  | 'logisticsStatus'

const searchForm = ref({
  keyword: '',
  selectedPreset: 'thisMonth',
  dateRange: [] as Date[],
  auditStatus: ALL_FILTER_VALUE,
  inboundStatus: ALL_FILTER_VALUE,
  docStatus: ALL_FILTER_VALUE,
  paymentStatus: ALL_FILTER_VALUE,
  closeStatus: ALL_FILTER_VALUE,
  logisticsStatus: ALL_FILTER_VALUE
})

type FilterGroupDef = {
  field: StatusFilterField
  label: string
  options: { label: string; value: string }[]
}

const filterRow1: FilterGroupDef[] = [
  { field: 'auditStatus', label: '审核状态', options: auditStatusOptions },
  { field: 'inboundStatus', label: '入库状态', options: inboundStatusOptions },
  { field: 'paymentStatus', label: '付款状态', options: paymentStatusOptions }
]

const filterRow2: FilterGroupDef[] = [
  { field: 'closeStatus', label: '关闭状态', options: closeStatusOptions },
  { field: 'docStatus', label: '单据状态', options: docStatusOptions },
  { field: 'logisticsStatus', label: '物流状态', options: logisticsStatusOptions }
]

const withAllOption = (options: { label: string; value: string }[]) => [
  { label: '全选', value: ALL_FILTER_VALUE },
  ...options
]

const currentPage = ref(1)
const pageSize = ref(10)

const defaultData = [
  {
    id: 'IN20260619001',
    orderNo: 'PO202606001',
    supplier: '北京医疗器械有限公司',
    supplierCode: 'SP001',
    warehouse: '公司库',
    warehouseCode: 'ck01',
    date: '2026-06-19',
    operator: '张三',
    itemCount: '3种',
    totalQuantity: '800',
    amount: '9500.00',
    status: 'completed',
    auditStatus: 'audited',
    closeStatus: 'notClosed',
    logisticsCompany: 'sf',
    logisticsNo: 'SF1234567890',
    logisticsStatus: 'signed',
    inboundStatus: 'allInWarehoused',
    paymentStatus: 'paid',
    signPerson: '仓库管理员',
    signDate: '2026-06-19',
    remark: ''
  },
  {
    id: 'IN20260618002',
    orderNo: 'PO202606002',
    supplier: '上海医疗科技有限公司',
    supplierCode: 'SP002',
    warehouse: '公司库',
    warehouseCode: 'WH002',
    date: '2026-06-18',
    operator: '李四',
    itemCount: '2种',
    totalQuantity: '80',
    amount: '7150.00',
    status: 'processing',
    auditStatus: 'audited',
    closeStatus: 'notClosed',
    logisticsCompany: 'yt',
    logisticsNo: 'YT9876543210',
    logisticsStatus: 'inTransit',
    inboundStatus: 'partiallyInWarehoused',
    paymentStatus: 'notPaid',
    signPerson: '',
    signDate: '',
    remark: '加急入库'
  },
  {
    id: 'IN20260617003',
    orderNo: 'PO202606003',
    supplier: '广州医疗器械厂',
    supplierCode: 'SP003',
    warehouse: '公司库',
    warehouseCode: 'WH003',
    date: '2026-06-17',
    operator: '王五',
    itemCount: '3种',
    totalQuantity: '480',
    amount: '3040.00',
    status: 'pending',
    auditStatus: 'notAudited',
    closeStatus: 'notClosed',
    logisticsCompany: '',
    logisticsNo: '',
    logisticsStatus: 'noLogistics',
    inboundStatus: 'notInWarehoused',
    paymentStatus: 'notPaid',
    signPerson: '',
    signDate: '',
    remark: ''
  },
  {
    id: 'IN20260616004',
    orderNo: 'PO202606004',
    supplier: '深圳医疗设备公司',
    supplierCode: 'SP004',
    warehouse: '公司库',
    warehouseCode: 'WH004',
    date: '2026-06-16',
    operator: '赵六',
    itemCount: '4种',
    totalQuantity: '200',
    amount: '5500.00',
    status: 'completed',
    auditStatus: 'audited',
    closeStatus: 'notClosed',
    logisticsCompany: 'self',
    logisticsNo: '',
    logisticsStatus: 'noLogistics',
    inboundStatus: 'partiallyInWarehoused',
    paymentStatus: 'partiallyPaid',
    signPerson: '仓库管理员',
    signDate: '2026-06-16',
    remark: '部分入库'
  }
]

const tableData = ref<any[]>([])

const auditStatusLabels: Record<string, string> = {
  notAudited: '未审核',
  audited: '已审核'
}

const inboundStatusLabels: Record<string, string> = {
  notInWarehoused: '未入库',
  partiallyInWarehoused: '部分入库',
  allInWarehoused: '全部入库'
}

const paymentStatusLabels: Record<string, string> = {
  notPaid: '未付款',
  partiallyPaid: '部分付款',
  paid: '已付款'
}

const closeStatusLabels: Record<string, string> = {
  notClosed: '未关闭',
  closed: '已关闭',
  manualClosed: '手动关闭'
}

const logisticsStatusLabels: Record<string, string> = {
  noLogistics: '无物流',
  inTransit: '在途',
  signed: '已签收'
}

const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'info' },
  processing: { text: '审核中', color: 'warning' },
  completed: { text: '已完成', color: 'success' },
  cancelled: { text: '已作废', color: 'danger' }
}

const { columnWidths, handleHeaderDragend } = useTableStyle('purchase-inbound-record-list', [
  { key: 'inboundNo', label: '入库单号', defaultWidth: 150 },
  { key: 'orderNo', label: '采购订单号', defaultWidth: 150 },
  { key: 'supplier', label: '供应商', defaultWidth: 180 },
  { key: 'warehouse', label: '仓库', defaultWidth: 120 },
  { key: 'date', label: '入库日期', defaultWidth: 110 },
  { key: 'operator', label: '操作员', defaultWidth: 100 },
  { key: 'itemCount', label: '商品种类', defaultWidth: 90 },
  { key: 'totalQuantity', label: '总数量', defaultWidth: 90 },
  { key: 'amount', label: '入库金额', defaultWidth: 120 },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 90 },
  { key: 'inboundStatus', label: '入库状态', defaultWidth: 100 },
  { key: 'paymentStatus', label: '付款状态', defaultWidth: 100 },
  { key: 'logisticsStatus', label: '物流状态', defaultWidth: 100 },
  { key: 'logisticsCompany', label: '物流公司', defaultWidth: 100 },
  { key: 'logisticsNo', label: '物流单号', defaultWidth: 140 },
  { key: 'closeStatus', label: '关闭状态', defaultWidth: 100 },
  { key: 'status', label: '状态', defaultWidth: 90 },
  { key: 'remark', label: '备注', defaultWidth: 120 }
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
} = usePurchaseInboundRecordColumnSettings('purchase-inbound-record-list')

const resolveLinkedSalesOrderId = (row: Record<string, unknown>): string => {
  const direct = String(row.salesOrderNo || '').trim()
  if (direct) return direct
  const poId = String(row.purchaseOrderId || row.orderNo || '').trim()
  if (!poId) return ''
  const link = getCollabLinks().find(l =>
    l.buyerOrderId === poId || l.buyerOrderNo === poId
  )
  return String(link?.sellerOrderId || link?.sellerOrderNo || '').trim()
}

const resolveLinkedOutboundNo = (row: Record<string, unknown>): string => {
  const direct = String(row.outboundNo || '').trim()
  if (direct) return direct
  const poId = String(row.purchaseOrderId || row.orderNo || '').trim()
  const link = getCollabLinks().find(l =>
    l.buyerOrderId === poId || l.buyerOrderNo === poId
  )
  if (link?.outboundIds?.length) {
    return String(link.outboundIds[link.outboundIds.length - 1])
  }
  return ''
}

const resolveAuditStatus = (row: Record<string, unknown>) => {
  if (row.auditStatus) return String(row.auditStatus)
  const status = String(row.status || '')
  if (status === 'completed' || status === 'processing') return 'audited'
  return 'notAudited'
}

const resolveCloseStatus = (row: Record<string, unknown>) => {
  if (row.closeStatus) return String(row.closeStatus)
  return String(row.status) === 'cancelled' ? 'closed' : 'notClosed'
}

const resolveInboundStatusKey = (row: Record<string, unknown>) => {
  if (row.inboundStatus) return String(row.inboundStatus)
  if (row.signStatus === '已签收') {
    return String(row.remark || '').includes('部分') ? 'partiallyInWarehoused' : 'allInWarehoused'
  }
  if (resolveAuditStatus(row) === 'audited') return 'partiallyInWarehoused'
  return 'notInWarehoused'
}

const resolvePaymentStatusKey = (row: Record<string, unknown>) => {
  if (row.paymentStatus) return String(row.paymentStatus)
  if (String(row.status) === 'completed') return 'paid'
  return 'notPaid'
}

const hasLogisticsTracking = (row: Record<string, unknown>) => {
  const company = String(row.logisticsCompany || '')
  const trackingNo = String(row.logisticsNo || '')
  if (company === 'self') return false
  return Boolean(trackingNo || company)
}

const resolveLogisticsStatusKey = (row: Record<string, unknown>) => {
  if (row.logisticsStatus) return String(row.logisticsStatus)
  if (!hasLogisticsTracking(row)) return 'noLogistics'
  if (row.signStatus === '已签收' || row.signPerson) return 'signed'
  return 'inTransit'
}

const normalizeInboundRow = (row: Record<string, unknown>) => {
  const enriched = enrichInboundRecord(row)
  return {
    ...enriched,
    auditStatus: resolveAuditStatus(enriched),
    closeStatus: resolveCloseStatus(enriched),
    inboundStatus: resolveInboundStatusKey(enriched),
    paymentStatus: resolvePaymentStatusKey(enriched),
    logisticsStatus: resolveLogisticsStatusKey(enriched)
  }
}

const formatInboundAmount = (row: Record<string, unknown>) => {
  const val = Number(row.amount)
  if (val > 0) {
    return val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  const items = (row.items || []) as Record<string, unknown>[]
  const computed = calcInboundItemsAmount(items)
  if (computed > 0) {
    return computed.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return '—'
}

const displayInboundAmount = (row: Record<string, unknown>) => {
  const formatted = formatInboundAmount(row)
  return formatted === '—' ? '—' : `¥${formatted}`
}

const syncInboundStorage = () => {
  tableData.value = tableData.value.map(row => normalizeInboundRow(row))
  localStorage.setItem(INBOUND_STORAGE_KEY, JSON.stringify(tableData.value))
}

const persistInboundChanges = (inboundId: string, changes: Record<string, unknown>) => {
  const row = tableData.value.find(r => r.id === inboundId)
  if (row) Object.assign(row, changes)

  const list = JSON.parse(localStorage.getItem(INBOUND_STORAGE_KEY) || '[]')
  const index = list.findIndex((item: { id: string }) => item.id === inboundId)
  if (index > -1) {
    list[index] = { ...list[index], ...changes }
  } else if (row) {
    list.unshift({ ...row })
  }
  localStorage.setItem(INBOUND_STORAGE_KEY, JSON.stringify(list))
}

const loadData = () => {
  backfillInboundAmounts()
  const savedList = JSON.parse(localStorage.getItem(INBOUND_STORAGE_KEY) || '[]')
  const existingIds = new Set(defaultData.map(item => item.id))
  const newRows = savedList
    .filter((row: Record<string, unknown>) => !existingIds.has(String(row.id)))
    .map(normalizeInboundRow)

  tableData.value = [
    ...newRows,
    ...defaultData.map(row => {
      const saved = savedList.find((item: Record<string, unknown>) => item.id === row.id)
      return saved ? normalizeInboundRow({ ...row, ...saved }) : row
    })
  ]
}

const canDeleteInbound = (row: Record<string, unknown>) => {
  return resolveAuditStatus(row) === 'notAudited' && resolveCloseStatus(row) === 'notClosed'
}

const canUnAuditInbound = (row: Record<string, unknown>) => {
  return resolveAuditStatus(row) === 'audited' && resolveCloseStatus(row) !== 'closed'
}

const selectedRows = ref<any[]>([])

const matchStatusFilter = (rowValue: string, filterValue: string) => {
  if (!filterValue || filterValue === ALL_FILTER_VALUE) return true
  return rowValue === filterValue
}

const filteredData = computed(() => {
  return tableData.value.filter(row => {
    if (searchForm.value.keyword) {
      const keywords = searchForm.value.keyword.trim().split(/\s+/).filter(Boolean)
      const fields = [
        row.id,
        row.orderNo,
        row.supplier,
        row.warehouse,
        row.operator,
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

    if (!matchStatusFilter(resolveAuditStatus(row), searchForm.value.auditStatus)) return false
    if (!matchStatusFilter(resolveInboundStatusKey(row), searchForm.value.inboundStatus)) return false
    if (!matchStatusFilter(String(row.status || ''), searchForm.value.docStatus)) return false
    if (!matchStatusFilter(resolvePaymentStatusKey(row), searchForm.value.paymentStatus)) return false
    if (!matchStatusFilter(resolveCloseStatus(row), searchForm.value.closeStatus)) return false
    if (!matchStatusFilter(resolveLogisticsStatusKey(row), searchForm.value.logisticsStatus)) return false

    return true
  })
})

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

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

const migrateInboundStatusFilter = (value: unknown) => {
  const migrated = migrateSavedFilter(value)
  if (migrated === 'signed') return 'allInWarehoused'
  if (migrated === 'notSigned') return 'notInWarehoused'
  return migrated
}

const getSelectedRow = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择一条入库单')
    return null
  }
  if (selectedRows.value.length > 1) {
    ElMessage.warning('请只选择一条入库单')
    return null
  }
  return selectedRows.value[0]
}

const handleSelectionChange = (val: any[]) => {
  selectedRows.value = val
}

const requireSelection = (multiple = true) => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning(multiple ? '请至少选择一条入库单' : '请先选择一条入库单')
    return false
  }
  if (!multiple && selectedRows.value.length > 1) {
    ElMessage.warning('请只选择一条入库单')
    return false
  }
  return true
}

const handleCreate = () => {
  router.push('/purchase/inbound')
}

const openInbound = (row: Record<string, unknown>) => {
  router.push({ path: '/purchase/inbound', query: { id: String(row.id) } })
}

const handleRowDoubleClick = (row: Record<string, unknown>) => {
  openInbound(row)
}

const handleInboundNoClick = (row: Record<string, unknown>) => {
  openInbound(row)
}

const handleAudit = () => {
  if (!requireSelection()) return
  const targets = selectedRows.value.filter(row => resolveAuditStatus(row) !== 'audited')
  if (targets.length === 0) {
    ElMessage.info('所选入库单均已审核')
    return
  }

  ElMessageBox.confirm(`确定要审核选中的 ${targets.length} 条入库单吗？`, '审核确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    targets.forEach(row => {
      const nextStatus =
        row.status === 'pending' ? 'processing'
        : row.status === 'processing' ? 'completed'
        : row.status
      persistInboundChanges(row.id, {
        auditStatus: 'audited',
        status: nextStatus
      })
      const updated = tableData.value.find(r => r.id === row.id) || row
      if (updated.status === 'completed') {
        onPurchaseInboundAudited(updated)
      }
      addOperationLog(row.id, 'audit', '系统管理员', '审核采购入库单')
    })
    ElMessage.success(`已成功审核 ${targets.length} 条入库单`)
  }).catch(() => {})
}

const handleUnAudit = () => {
  if (!requireSelection()) return
  const targets = selectedRows.value.filter(row => resolveAuditStatus(row) === 'audited')
  if (targets.length === 0) {
    ElMessage.info('所选入库单均未审核')
    return
  }
  const blocked = targets.filter(row => !canUnAuditInbound(row))
  if (blocked.length > 0) {
    ElMessage.warning('已关闭的入库单不能反审核')
    return
  }

  ElMessageBox.confirm(`确定要反审核选中的 ${targets.length} 条入库单吗？`, '反审核确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    targets.forEach(row => {
      persistInboundChanges(row.id, {
        auditStatus: 'notAudited',
        status: row.status === 'processing' || row.status === 'completed' ? 'pending' : row.status
      })
      addOperationLog(row.id, 'unaudit', '系统管理员', '反审核采购入库单')
    })
    ElMessage.success(`已成功反审核 ${targets.length} 条入库单`)
  }).catch(() => {})
}

const auditActionLabel = computed(() => {
  if (selectedRows.value.length === 0) return '审核'
  return selectedRows.value.every(row => resolveAuditStatus(row) === 'audited') ? '反审核' : '审核'
})

const handleAuditToggle = () => {
  if (auditActionLabel.value === '反审核') {
    handleUnAudit()
  } else {
    handleAudit()
  }
}

const handleDelete = () => {
  if (!requireSelection()) return
  const deletable = selectedRows.value.filter(canDeleteInbound)
  const blocked = selectedRows.value.filter(row => !canDeleteInbound(row))

  if (deletable.length === 0) {
    ElMessage.warning('仅未审核、未关闭的入库单允许删除')
    return
  }

  const skipTip = blocked.length > 0 ? `（${blocked.length} 条不符合删除条件，将自动跳过）` : ''
  ElMessageBox.confirm(
    `确定要删除选中的 ${deletable.length} 条入库单吗？此操作不可恢复！${skipTip}`,
    '删除确认',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'error' }
  ).then(() => {
    deletable.forEach(row => onPurchaseInboundDeleted(row))
    const ids = new Set(deletable.map(row => row.id))
    tableData.value = tableData.value.filter(row => !ids.has(row.id))
    const list = JSON.parse(localStorage.getItem(INBOUND_STORAGE_KEY) || '[]')
    localStorage.setItem(
      INBOUND_STORAGE_KEY,
      JSON.stringify(list.filter((item: { id: string }) => !ids.has(item.id)))
    )
    deletable.forEach(row => addOperationLog(row.id, 'delete', '系统管理员', '删除采购入库单'))
    selectedRows.value = []
    ElMessage.success(`已成功删除 ${deletable.length} 条入库单`)
  }).catch(() => {})
}

const handleEnable = () => {
  if (!requireSelection()) return
  selectedRows.value.forEach(row => {
    persistInboundChanges(row.id, {
      status: row.status === 'cancelled' ? 'pending' : row.status,
      closeStatus: resolveCloseStatus(row) === 'closed' || resolveCloseStatus(row) === 'manualClosed'
        ? 'notClosed'
        : resolveCloseStatus(row),
      auditStatus: row.status === 'cancelled' ? 'notAudited' : resolveAuditStatus(row)
    })
    addOperationLog(row.id, 'enable', '系统管理员', '启用采购入库单')
  })
  ElMessage.success(`已启用 ${selectedRows.value.length} 条入库单`)
}

const handleClose = () => {
  if (!requireSelection()) return
  ElMessageBox.confirm(
    `确定要关闭选中的 ${selectedRows.value.length} 条入库单吗？`,
    '关闭确认',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
  ).then(() => {
    selectedRows.value.forEach(row => {
      persistInboundChanges(row.id, { closeStatus: 'closed', status: 'cancelled' })
      addOperationLog(row.id, 'close', '系统管理员', '关闭采购入库单')
    })
    ElMessage.success(`已关闭 ${selectedRows.value.length} 条入库单`)
  }).catch(() => {})
}

const handleBatchModify = () => {
  if (!requireSelection()) return
  ElMessage.info(`批量修改：已选择 ${selectedRows.value.length} 条入库单`)
}

const handleToSalesOrder = () => {
  const row = getSelectedRow()
  if (!row) return
  const salesOrderId = resolveLinkedSalesOrderId(row)
  if (!salesOrderId) {
    ElMessage.warning('该入库单未关联销售订单')
    return
  }
  const orders = JSON.parse(localStorage.getItem('sales-orders') || '[]')
  const so = orders.find((item: Record<string, unknown>) =>
    String(item.orderNo) === salesOrderId || String(item.id) === salesOrderId
  )
  if (so?.id) {
    router.push(`/sales/order-list/create/${so.id}`)
    return
  }
  router.push({ path: '/sales/order-list/create', query: { id: salesOrderId } })
}

const handleToSalesOutbound = () => {
  const row = getSelectedRow()
  if (!row) return
  const outboundNo = resolveLinkedOutboundNo(row)
  if (!outboundNo) {
    ElMessage.warning('该入库单未关联销售出库单')
    return
  }
  router.push({ path: '/sales/outbound', query: { id: outboundNo } })
}

const handleSign = () => {
  const row = getSelectedRow()
  if (!row) return
  if (resolveInboundStatusKey(row) === 'allInWarehoused') {
    ElMessage.info('入库单已全部入库')
    return
  }
  ElMessageBox.prompt('请输入签收人姓名', '入库确认', {
    confirmButtonText: '确认入库',
    cancelButtonText: '取消',
    inputPlaceholder: '请输入签收人姓名'
  }).then(({ value }) => {
    if (!value) {
      ElMessage.warning('请输入签收人姓名')
      return
    }
    persistInboundChanges(row.id, {
      inboundStatus: 'allInWarehoused',
      signStatus: '已签收',
      signPerson: value,
      signDate: new Date().toISOString().split('T')[0]
    })
    addOperationLog(row.id, 'inbound', value, '确认采购入库')
    ElMessage.success(`入库单 ${row.id} 已全部入库`)
  }).catch(() => {})
}

const handleTrackLogistics = (row?: Record<string, unknown>) => {
  const target = row || getSelectedRow()
  if (!target) return

  if (!target.logisticsNo && target.logisticsCompany !== 'self') {
    ElMessage.warning('暂无物流信息')
    return
  }

  if (target.logisticsCompany === 'self') {
    ElMessage.info('此入库单为上门自提，无需物流跟踪')
    return
  }

  const logisticsDetail = {
    company: logisticsCompanyMap[String(target.logisticsCompany)] || '未知',
    trackingNo: target.logisticsNo,
    steps: [
      { time: '2026-06-18 10:30:00', status: '已发出', location: '供应商仓库', remark: '货物已从供应商发出' },
      { time: '2026-06-18 14:20:00', status: '运输中', location: '物流中转站', remark: '货物正在运输途中' },
      { time: '2026-06-18 20:45:00', status: '到达目的城市', location: '目的地城市', remark: '货物已到达目的城市' },
      { time: '2026-06-19 08:15:00', status: '派送中', location: '配送点', remark: '快递员正在派送中' },
      { time: '2026-06-19 10:30:00', status: '已签收', location: '公司仓库', remark: `签收人：${target.signPerson || '仓库管理员'}` }
    ]
  }

  ElMessageBox.alert(
    `<div style="text-align: left; width: 460px;">
      <p style="margin: 10px 0;"><strong>物流公司：</strong>${logisticsDetail.company}</p>
      <p style="margin: 10px 0;"><strong>运单号：</strong>${logisticsDetail.trackingNo}</p>
      <div style="margin-top: 20px;">
        <strong>物流轨迹：</strong>
        <ul style="padding-left: 20px; margin-top: 10px;">
          ${logisticsDetail.steps.map(step => `
            <li style="margin: 8px 0; padding-left: 10px; border-left: 2px solid #00bfa5;">
              <strong>${step.time}</strong> - ${step.status}<br/>
              <span style="color: #667085;">${step.location}</span><br/>
              <span style="color: #999;">${step.remark}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>`,
    '物流跟踪详情',
    {
      confirmButtonText: '关闭',
      dangerouslyUseHTMLString: true
    }
  )
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
  localStorage.setItem(SEARCH_FORM_KEY, JSON.stringify({
    ...searchForm.value,
    showAdvancedFilter: showAdvancedFilter.value
  }))
}

const loadSearchForm = () => {
  const saved = localStorage.getItem(SEARCH_FORM_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      Object.assign(searchForm.value, parsed)
      searchForm.value.auditStatus = migrateSavedFilter(parsed.auditStatus)
      searchForm.value.inboundStatus = migrateInboundStatusFilter(parsed.inboundStatus ?? parsed.signStatus)
      searchForm.value.docStatus = migrateSavedFilter(parsed.docStatus)
      searchForm.value.paymentStatus = migrateSavedFilter(parsed.paymentStatus)
      searchForm.value.closeStatus = migrateSavedFilter(parsed.closeStatus)
      searchForm.value.logisticsStatus = migrateSavedFilter(parsed.logisticsStatus)
      if (parsed.dateRange?.length) {
        searchForm.value.dateRange = parsed.dateRange.map((d: string) => new Date(d))
      }
      showAdvancedFilter.value = parsed.showAdvancedFilter !== false
    } catch {
      /* ignore */
    }
  }
}

const resetSearchForm = () => {
  const range = getDateRange('thisMonth') || []
  searchForm.value = {
    keyword: '',
    selectedPreset: 'thisMonth',
    dateRange: range,
    auditStatus: ALL_FILTER_VALUE,
    inboundStatus: ALL_FILTER_VALUE,
    docStatus: ALL_FILTER_VALUE,
    paymentStatus: ALL_FILTER_VALUE,
    closeStatus: ALL_FILTER_VALUE,
    logisticsStatus: ALL_FILTER_VALUE
  }
  currentPage.value = 1
  localStorage.removeItem(SEARCH_FORM_KEY)
}

watch(() => [
  searchForm.value.auditStatus,
  searchForm.value.inboundStatus,
  searchForm.value.docStatus,
  searchForm.value.paymentStatus,
  searchForm.value.closeStatus,
  searchForm.value.logisticsStatus
], saveSearchForm, { deep: true })

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
      <h1>{{ PAGE_TITLE }}</h1>
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
          <el-form-item class="keyword-input">
            <el-input
              v-model="searchForm.keyword"
              placeholder="入库单号/订单号/供应商/仓库/操作员/备注"
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
        <div class="filter-grid">
          <div v-for="col in filterRow1" :key="col.field" class="filter-item">
            <span class="filter-label">{{ col.label }}</span>
            <div class="filter-tags">
              <span
                v-for="opt in withAllOption(col.options)"
                :key="opt.value"
                class="filter-tag"
                :class="{ active: isFilterActive(col.field, opt.value) }"
                @click="selectFilter(col.field, opt.value)"
              >{{ opt.label }}</span>
            </div>
          </div>
          <div
            v-for="(col, index) in filterRow2"
            :key="col.field"
            class="filter-item"
            :class="`filter-item--col-${index + 1}`"
          >
            <span class="filter-label">{{ col.label }}</span>
            <div class="filter-tags">
              <span
                v-for="opt in withAllOption(col.options)"
                :key="opt.value"
                class="filter-tag"
                :class="{ active: isFilterActive(col.field, opt.value) }"
                @click="selectFilter(col.field, opt.value)"
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
        <el-button type="primary" link size="small" @click="handleBatchModify">批量修改</el-button>
        <el-button type="primary" link size="small" @click="handleToSalesOrder">转销售订单</el-button>
        <el-button type="primary" link size="small" @click="handleToSalesOutbound">转销售出库单</el-button>
        <el-button type="primary" link size="small" @click="handleSign">入库</el-button>
        <el-button type="primary" link size="small" @click="handleTrackLogistics()">物流</el-button>
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
              v-if="col.key === 'inboundNo'"
              class="code-link"
              @click="handleInboundNoClick(row)"
            >{{ row.inboundNo || row.id }}</span>
            <span v-else-if="col.key === 'amount'">{{ displayInboundAmount(row) }}</span>
            <el-tag
              v-else-if="col.key === 'auditStatus'"
              size="small"
              :type="resolveAuditStatus(row) === 'audited' ? 'success' : 'info'"
            >
              {{ auditStatusLabels[resolveAuditStatus(row)] }}
            </el-tag>
            <el-tag
              v-else-if="col.key === 'inboundStatus'"
              size="small"
              :type="resolveInboundStatusKey(row) === 'allInWarehoused' ? 'success' : resolveInboundStatusKey(row) === 'partiallyInWarehoused' ? 'warning' : 'info'"
            >
              {{ inboundStatusLabels[resolveInboundStatusKey(row)] }}
            </el-tag>
            <el-tag
              v-else-if="col.key === 'paymentStatus'"
              size="small"
              :type="resolvePaymentStatusKey(row) === 'paid' ? 'success' : resolvePaymentStatusKey(row) === 'partiallyPaid' ? 'warning' : 'info'"
            >
              {{ paymentStatusLabels[resolvePaymentStatusKey(row)] }}
            </el-tag>
            <el-tag
              v-else-if="col.key === 'logisticsStatus'"
              size="small"
              :type="resolveLogisticsStatusKey(row) === 'signed' ? 'success' : resolveLogisticsStatusKey(row) === 'inTransit' ? 'warning' : 'info'"
            >
              {{ logisticsStatusLabels[resolveLogisticsStatusKey(row)] }}
            </el-tag>
            <span v-else-if="col.key === 'logisticsCompany'">
              {{ logisticsCompanyMap[row.logisticsCompany] || '-' }}
            </span>
            <span
              v-else-if="col.key === 'logisticsNo'"
              :class="{ 'code-link': row.logisticsNo }"
              @click="row.logisticsNo && handleTrackLogistics(row)"
            >{{ row.logisticsNo || '-' }}</span>
            <el-tag
              v-else-if="col.key === 'closeStatus'"
              size="small"
              :type="resolveCloseStatus(row) === 'closed' ? 'danger' : resolveCloseStatus(row) === 'manualClosed' ? 'warning' : 'info'"
            >
              {{ closeStatusLabels[resolveCloseStatus(row)] }}
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

  <el-dialog v-model="showColumnSelector" title="采购入库单列表设置" width="720px" draggable>
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
      <el-button type="primary" class="btn-teal" @click="confirmColumnSelection">确定</el-button>
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

  h1 {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0;
    line-height: 24px;
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

  .search-advanced {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #e4e7ed;

    .filter-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(240px, 1fr));
      gap: 12px 20px;
      align-items: start;
    }

    .filter-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      min-width: 0;

      &.filter-item--col-1 {
        grid-column: 1;
      }

      &.filter-item--col-2 {
        grid-column: 2;
      }

      &.filter-item--col-3 {
        grid-column: 3;
      }
    }

    .filter-label {
      font-size: 13px;
      color: #666;
      width: 72px;
      line-height: 28px;
      flex-shrink: 0;
      text-align: right;
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

  :deep(.el-button.is-link) {
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
