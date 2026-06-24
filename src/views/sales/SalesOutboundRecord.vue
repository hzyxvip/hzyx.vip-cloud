<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTableStyle } from '@/composables/useTableStyle'
import { onSalesOutboundAudited } from '@/utils/platformCollaborationService'
import { CONFIRM_STATUS_CONFIRMED } from '@/utils/documentFunctionSettings'
import { validateOutboundItems, showComplianceResult } from '@/utils/complianceService'

const router = useRouter()
const showAdvancedFilter = ref(true)

const OUTBOUND_STORAGE_KEY = 'salesOutboundRecords'
const SEARCH_FORM_KEY = 'sales-outbound-record-search-form'
const OPERATION_LOG_KEY = 'sales-outbound-operation-logs'

const operationLogs = ref<any[]>(JSON.parse(localStorage.getItem(OPERATION_LOG_KEY) || '[]'))

const addOperationLog = (outboundId: string, operationType: string, operator: string, remark: string) => {
  const log = {
    id: Date.now(),
    outboundId,
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

const signStatusOptions = [
  { label: '已签收', value: 'signed' },
  { label: '未签收', value: 'notSigned' }
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

const receiptStatusOptions = [
  { label: '已收款', value: 'received' },
  { label: '未收款', value: 'notReceived' }
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

type StatusFilterField = 'auditStatus' | 'signStatus' | 'docStatus' | 'closeStatus' | 'paymentStatus' | 'logisticsStatus'

const searchForm = ref({
  keyword: '',
  selectedPreset: 'thisMonth',
  dateRange: [] as Date[],
  auditStatus: ALL_FILTER_VALUE,
  signStatus: ALL_FILTER_VALUE,
  docStatus: ALL_FILTER_VALUE,
  closeStatus: ALL_FILTER_VALUE,
  paymentStatus: ALL_FILTER_VALUE,
  logisticsStatus: ALL_FILTER_VALUE
})

const filterGroupsRow1 = [
  { field: 'auditStatus' as StatusFilterField, label: '审核状态', options: auditStatusOptions },
  { field: 'signStatus' as StatusFilterField, label: '签收状态', options: signStatusOptions },
  { field: 'paymentStatus' as StatusFilterField, label: '收款状态', options: receiptStatusOptions },
  { field: 'docStatus' as StatusFilterField, label: '单据状态', options: docStatusOptions }
]

const filterGroupsRow2 = [
  { field: 'closeStatus' as StatusFilterField, label: '关闭状态', options: closeStatusOptions },
  { field: 'logisticsStatus' as StatusFilterField, label: '物流状态', options: logisticsStatusOptions }
]

const withAllOption = (options: { label: string; value: string }[]) => [
  { label: '全选', value: ALL_FILTER_VALUE },
  ...options
]

const currentPage = ref(1)
const pageSize = ref(10)

const defaultData = [
  {
    outboundNo: 'XH-20260618-0020',
    id: 'XH-20260618-0020',
    salesOrderNo: 'DD-20260618-0020',
    customer: '金华市华厦医疗器材有限公司',
    customerCode: 'GX01014',
    warehouse: '公司库',
    date: '2026-06-18',
    operator: '胡素琴',
    itemCount: '1种',
    totalQuantity: '10',
    amount: '900.00',
    status: 'completed',
    auditStatus: '已审核',
    closeStatus: 'notClosed',
    logisticsCompany: '',
    logisticsNo: '',
    signStatus: '未签收',
    deliveryStatus: '未发货',
    signPerson: '',
    signDate: '',
    remark: '',
    paymentStatus: '未收款'
  },
  {
    outboundNo: 'XH-20260618-0019',
    id: 'XH-20260618-0019',
    salesOrderNo: 'DD-20260618-0019',
    customer: '宁波市镇海国威医疗器材有限公司',
    customerCode: 'GX00970',
    warehouse: '公司库',
    date: '2026-06-18',
    operator: '胡素琴',
    itemCount: '2种',
    totalQuantity: '40',
    amount: '2200.00',
    status: 'processing',
    auditStatus: '已审核',
    closeStatus: 'notClosed',
    logisticsCompany: 'sf',
    logisticsNo: 'SF1234567890',
    signStatus: '已签收',
    deliveryStatus: '已发货',
    signPerson: '张三',
    signDate: '2026-06-19',
    remark: '',
    paymentStatus: '已收款'
  },
  {
    outboundNo: 'XH-20260618-0018',
    id: 'XH-20260618-0018',
    salesOrderNo: 'DD-20260618-0018',
    customer: '宁波天工医疗器械有限公司',
    customerCode: 'GX00947',
    warehouse: '公司库',
    date: '2026-06-18',
    operator: '胡素琴',
    itemCount: '3种',
    totalQuantity: '150',
    amount: '6670.00',
    status: 'pending',
    auditStatus: '未审核',
    closeStatus: 'notClosed',
    logisticsCompany: '',
    logisticsNo: '',
    signStatus: '未签收',
    deliveryStatus: '未发货',
    signPerson: '',
    signDate: '',
    remark: '待审核出库',
    paymentStatus: '未收款'
  },
  {
    outboundNo: 'XH-20260617-0017',
    id: 'XH-20260617-0017',
    salesOrderNo: 'DD-20260617-0017',
    customer: '温州市康达医疗器械有限公司',
    customerCode: 'GX00856',
    warehouse: '公司库',
    date: '2026-06-17',
    operator: '王小明',
    itemCount: '2种',
    totalQuantity: '80',
    amount: '3500.00',
    status: 'completed',
    auditStatus: '已审核',
    closeStatus: 'notClosed',
    logisticsCompany: 'yt',
    logisticsNo: 'YT9876543210',
    signStatus: '已签收',
    deliveryStatus: '已发货',
    signPerson: '李四',
    signDate: '2026-06-18',
    remark: '部分出库',
    paymentStatus: '未收款'
  }
]

const tableData = ref<any[]>([])

const auditStatusLabels: Record<string, string> = {
  notAudited: '未审核',
  audited: '已审核'
}

const signStatusLabels: Record<string, string> = {
  signed: '已签收',
  notSigned: '未签收'
}

const closeStatusLabels: Record<string, string> = {
  notClosed: '未关闭',
  closed: '已关闭',
  manualClosed: '手动关闭'
}

const receiptStatusLabels: Record<string, string> = {
  received: '已收款',
  notReceived: '未收款'
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

const { columnWidths, handleHeaderDragend } = useTableStyle('sales-outbound-record-list', [
  { key: 'outboundNo', label: '出库单号', defaultWidth: 150 },
  { key: 'salesOrderNo', label: '销售订单号', defaultWidth: 150 },
  { key: 'customer', label: '客户', defaultWidth: 180 },
  { key: 'warehouse', label: '仓库', defaultWidth: 120 },
  { key: 'date', label: '出库日期', defaultWidth: 110 },
  { key: 'operator', label: '操作员', defaultWidth: 100 },
  { key: 'itemCount', label: '商品种类', defaultWidth: 90 },
  { key: 'totalQuantity', label: '总数量', defaultWidth: 90 },
  { key: 'amount', label: '出库金额', defaultWidth: 120 },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 90 },
  { key: 'signStatus', label: '签收状态', defaultWidth: 90 },
  { key: 'paymentStatus', label: '收款状态', defaultWidth: 90 },
  { key: 'logisticsStatus', label: '物流状态', defaultWidth: 90 },
  { key: 'logisticsCompany', label: '物流公司', defaultWidth: 100 },
  { key: 'logisticsNo', label: '物流单号', defaultWidth: 140 },
  { key: 'closeStatus', label: '关闭状态', defaultWidth: 100 },
  { key: 'status', label: '状态', defaultWidth: 90 },
  { key: 'remark', label: '备注', defaultWidth: 120 }
])

const getRowValidItems = (row: Record<string, unknown>) => {
  const items = (row.items || row.outboundItems || []) as Array<Record<string, unknown>>
  return items.filter(item =>
    (String(item.productCode || '').trim() || String(item.productName || '').trim())
    && Number(item.quantity) > 0
  )
}

const isRowConfirmed = (row: Record<string, unknown>) =>
  row.confirmStatus === CONFIRM_STATUS_CONFIRMED || row.confirmStatus === '已确认'

const formatLocalDateTime = () =>
  new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')

const getRowKey = (row: Record<string, unknown>) => String(row.outboundNo || row.id || '')

const resolveAuditStatus = (row: Record<string, unknown>) => {
  const audit = row.auditStatus
  if (audit === '已审核' || audit === 'audited') return 'audited'
  if (audit === '未审核' || audit === 'notAudited') return 'notAudited'
  const status = String(row.status || '')
  if (status === 'completed' || status === 'processing') return 'audited'
  return 'notAudited'
}

const resolveCloseStatus = (row: Record<string, unknown>) => {
  if (row.closeStatus) return String(row.closeStatus)
  return String(row.status) === 'cancelled' ? 'closed' : 'notClosed'
}

const resolveSignStatusKey = (row: Record<string, unknown>) => {
  return row.signStatus === '已签收' ? 'signed' : 'notSigned'
}

const resolveReceiptStatusKey = (row: Record<string, unknown>) => {
  const status = row.paymentStatus || row.receiptStatus
  if (!status) return 'notReceived'
  const value = String(status)
  if (value === 'received' || value === '已收款') return 'received'
  return 'notReceived'
}

const hasLogisticsTracking = (row: Record<string, unknown>) => {
  const trackingNo = String(row.logisticsNo || '').trim()
  const company = String(row.logisticsCompany || '').trim()
  if (company === 'self') return true
  return Boolean(trackingNo || company)
}

const resolveLogisticsStatusKey = (row: Record<string, unknown>) => {
  if (row.logisticsStatus) {
    const value = String(row.logisticsStatus)
    if (value === 'noLogistics' || value === '无物流') return 'noLogistics'
    if (value === 'inTransit' || value === '在途') return 'inTransit'
    if (value === 'signed' || value === '已签收') return 'signed'
  }
  if (row.signStatus === '已签收' || row.signPerson) return 'signed'
  if (row.deliveryStatus === '已发货' || hasLogisticsTracking(row)) return 'inTransit'
  return 'noLogistics'
}

const normalizeOutboundRow = (row: Record<string, unknown>) => {
  const outboundNo = getRowKey(row)
  const itemCount = row.itemCount
  const normalizedItemCount =
    itemCount != null
      ? String(itemCount).includes('种')
        ? itemCount
        : `${itemCount}种`
      : ''

  const rawAmount = row.amount
  const normalizedAmount =
    rawAmount != null ? String(rawAmount).replace(/^¥/, '').replace(/,/g, '') : ''

  const normalized = {
    ...row,
    outboundNo,
    id: outboundNo,
    salesOrderNo: row.salesOrderNo || row.orderNo || '',
    date: row.date || row.outboundDate || '',
    operator: row.operator || row.creator || '',
    itemCount: normalizedItemCount,
    totalQuantity: row.totalQuantity || '',
    amount: normalizedAmount,
    auditStatus: row.auditStatus || (resolveAuditStatus(row) === 'audited' ? '已审核' : '未审核'),
    closeStatus: resolveCloseStatus(row),
    signStatus: row.signStatus || '未签收',
    deliveryStatus: row.deliveryStatus || '未发货',
    paymentStatus: row.paymentStatus || '未收款',
    logisticsStatus: resolveLogisticsStatusKey(row)
  }
  return normalized
}

const persistOutboundChanges = (outboundId: string, changes: Record<string, unknown>) => {
  const row = tableData.value.find(r => getRowKey(r) === outboundId)
  if (row) Object.assign(row, changes)

  const list = JSON.parse(localStorage.getItem(OUTBOUND_STORAGE_KEY) || '[]')
  const index = list.findIndex(
    (item: Record<string, unknown>) =>
      String(item.outboundNo || item.id) === outboundId
  )
  if (index > -1) {
    list[index] = { ...list[index], ...changes }
  } else if (row) {
    list.unshift({ ...row })
  }
  localStorage.setItem(OUTBOUND_STORAGE_KEY, JSON.stringify(list))
}

const loadData = () => {
  const savedList = JSON.parse(localStorage.getItem(OUTBOUND_STORAGE_KEY) || '[]')
  if (savedList.length > 0) {
    tableData.value = savedList.map(normalizeOutboundRow)
    return
  }
  tableData.value = defaultData.map(normalizeOutboundRow)
}

const canDeleteOutbound = (row: Record<string, unknown>) => {
  return resolveAuditStatus(row) === 'notAudited' && resolveCloseStatus(row) === 'notClosed'
}

const canUnAuditOutbound = (row: Record<string, unknown>) => {
  return resolveAuditStatus(row) === 'audited' && resolveCloseStatus(row) === 'notClosed'
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
        row.outboundNo,
        row.salesOrderNo,
        row.customer,
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
    if (!matchStatusFilter(resolveSignStatusKey(row), searchForm.value.signStatus)) return false
    if (!matchStatusFilter(String(row.status || ''), searchForm.value.docStatus)) return false
    if (!matchStatusFilter(resolveCloseStatus(row), searchForm.value.closeStatus)) return false
    if (!matchStatusFilter(resolveReceiptStatusKey(row), searchForm.value.paymentStatus)) return false
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

const getSelectedRow = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择一条出库单')
    return null
  }
  if (selectedRows.value.length > 1) {
    ElMessage.warning('请只选择一条出库单')
    return null
  }
  return selectedRows.value[0]
}

const handleSelectionChange = (val: any[]) => {
  selectedRows.value = val
}

const requireSelection = (multiple = true) => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning(multiple ? '请至少选择一条出库单' : '请先选择一条出库单')
    return false
  }
  if (!multiple && selectedRows.value.length > 1) {
    ElMessage.warning('请只选择一条出库单')
    return false
  }
  return true
}

const handleCreate = () => {
  router.push('/sales/outbound')
}

const openOutbound = (row: Record<string, unknown>) => {
  router.push({
    path: '/sales/outbound',
    query: { id: String(row.outboundNo || row.id) }
  })
}

const handleRowDoubleClick = (row: Record<string, unknown>) => {
  openOutbound(row)
}

const handleOutboundNoClick = (row: Record<string, unknown>) => {
  openOutbound(row)
}

const handleAudit = () => {
  if (!requireSelection()) return
  const targets = selectedRows.value.filter(row => resolveAuditStatus(row) !== 'audited')
  if (targets.length === 0) {
    ElMessage.info('所选出库单均已审核')
    return
  }

  const unconfirmed = targets.filter(row => row.confirmStatus && !isRowConfirmed(row))
  if (unconfirmed.length > 0) {
    ElMessage.warning('存在未确认的出库单，请先在出库单页确认后再审核')
    return
  }

  const emptyItems = targets.filter(row => getRowValidItems(row).length === 0)
  if (emptyItems.length > 0) {
    ElMessage.warning('存在无有效商品明细的出库单，请打开单据补充后再审核')
    return
  }

  for (const row of targets) {
    const compliance = validateOutboundItems(getRowValidItems(row), { blockExpired: true })
    if (!compliance.valid) {
      showComplianceResult(compliance)
      return
    }
  }

  ElMessageBox.confirm(`确定要审核选中的 ${targets.length} 条出库单吗？`, '审核确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    const auditTime = formatLocalDateTime()
    targets.forEach(row => {
      const rowKey = getRowKey(row)
      const validItems = getRowValidItems(row)
      persistOutboundChanges(rowKey, {
        auditStatus: '已审核',
        status: 'completed',
        auditor: '系统管理员',
        auditTime
      })
      const updated = tableData.value.find(r => getRowKey(r) === rowKey) || row
      onSalesOutboundAudited({
        outboundNo: updated.outboundNo || updated.id,
        salesOrderNo: updated.salesOrderNo,
        customer: updated.customer,
        customerCode: updated.customerCode,
        warehouse: updated.warehouse,
        items: validItems,
        outboundItems: validItems
      })
      addOperationLog(rowKey, 'audit', '系统管理员', '审核销售出库单')
    })
    ElMessage.success(`已成功审核 ${targets.length} 条出库单`)
  }).catch(() => {})
}

const handleUnAudit = () => {
  if (!requireSelection()) return
  const targets = selectedRows.value.filter(row => resolveAuditStatus(row) === 'audited')
  if (targets.length === 0) {
    ElMessage.info('所选出库单均未审核')
    return
  }
  const blocked = targets.filter(row => !canUnAuditOutbound(row))
  if (blocked.length > 0) {
    ElMessage.warning('已关闭的出库单不能反审核')
    return
  }

  ElMessageBox.confirm(`确定要反审核选中的 ${targets.length} 条出库单吗？`, '反审核确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    targets.forEach(row => {
      const rowKey = getRowKey(row)
      persistOutboundChanges(rowKey, {
        auditStatus: '未审核',
        status: 'pending',
        auditor: '',
        auditTime: ''
      })
      addOperationLog(rowKey, 'unaudit', '系统管理员', '反审核销售出库单')
    })
    ElMessage.success(`已成功反审核 ${targets.length} 条出库单`)
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
  const deletable = selectedRows.value.filter(canDeleteOutbound)
  const blocked = selectedRows.value.filter(row => !canDeleteOutbound(row))

  if (deletable.length === 0) {
    ElMessage.warning('仅未审核、未关闭的出库单允许删除')
    return
  }

  const skipTip = blocked.length > 0 ? `（${blocked.length} 条不符合删除条件，将自动跳过）` : ''
  ElMessageBox.confirm(
    `确定要删除选中的 ${deletable.length} 条出库单吗？此操作不可恢复！${skipTip}`,
    '删除确认',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'error' }
  ).then(() => {
    const ids = new Set(deletable.map(row => getRowKey(row)))
    tableData.value = tableData.value.filter(row => !ids.has(getRowKey(row)))
    const list = JSON.parse(localStorage.getItem(OUTBOUND_STORAGE_KEY) || '[]')
    localStorage.setItem(
      OUTBOUND_STORAGE_KEY,
      JSON.stringify(
        list.filter(
          (item: Record<string, unknown>) => !ids.has(String(item.outboundNo || item.id))
        )
      )
    )
    deletable.forEach(row => addOperationLog(getRowKey(row), 'delete', '系统管理员', '删除销售出库单'))
    selectedRows.value = []
    ElMessage.success(`已成功删除 ${deletable.length} 条出库单`)
  }).catch(() => {})
}

const handleEnable = () => {
  if (!requireSelection()) return
  selectedRows.value.forEach(row => {
    const rowKey = getRowKey(row)
    persistOutboundChanges(rowKey, {
      status: row.status === 'cancelled' ? 'pending' : row.status,
      closeStatus:
        resolveCloseStatus(row) === 'closed' || resolveCloseStatus(row) === 'manualClosed'
          ? 'notClosed'
          : resolveCloseStatus(row),
      auditStatus:
        row.status === 'cancelled'
          ? '未审核'
          : resolveAuditStatus(row) === 'audited'
            ? '已审核'
            : '未审核'
    })
    addOperationLog(rowKey, 'enable', '系统管理员', '启用销售出库单')
  })
  ElMessage.success(`已启用 ${selectedRows.value.length} 条出库单`)
}

const handleClose = () => {
  if (!requireSelection()) return
  ElMessageBox.confirm(
    `确定要关闭选中的 ${selectedRows.value.length} 条出库单吗？`,
    '关闭确认',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
  ).then(() => {
    selectedRows.value.forEach(row => {
      const rowKey = getRowKey(row)
      persistOutboundChanges(rowKey, { closeStatus: 'closed', status: 'cancelled' })
      addOperationLog(rowKey, 'close', '系统管理员', '关闭销售出库单')
    })
    ElMessage.success(`已关闭 ${selectedRows.value.length} 条出库单`)
  }).catch(() => {})
}

const handleOutbound = () => {
  const row = getSelectedRow()
  if (row) openOutbound(row)
}

const handleBatchModify = () => {
  if (!requireSelection()) return
  ElMessage.info(`批量修改：已选择 ${selectedRows.value.length} 条出库单`)
}

const handleToSalesOrder = () => {
  const row = getSelectedRow()
  if (!row?.salesOrderNo) {
    ElMessage.warning('该出库单未关联销售订单')
    return
  }
  const orders = JSON.parse(localStorage.getItem('sales-orders') || '[]')
  const so = orders.find((item: Record<string, unknown>) =>
    String(item.orderNo) === String(row.salesOrderNo) || String(item.id) === String(row.salesOrderNo)
  )
  if (so?.id) {
    router.push(`/sales/order-list/create/${so.id}`)
    return
  }
  ElMessage.info(`关联销售订单：${row.salesOrderNo}`)
}

const handleDelivery = () => {
  const row = getSelectedRow()
  if (!row) return
  if (resolveAuditStatus(row) !== 'audited') {
    ElMessage.warning('请先审核出库单后再发货')
    return
  }
  if (row.deliveryStatus === '已发货') {
    ElMessage.info('出库单已发货')
    return
  }
  const rowKey = getRowKey(row)
  persistOutboundChanges(rowKey, { deliveryStatus: '已发货', logisticsStatus: 'inTransit' })
  addOperationLog(rowKey, 'delivery', '系统管理员', '发货销售出库单')
  ElMessage.success(`出库单 ${row.outboundNo || row.id} 已发货`)
}

const handleSign = () => {
  const row = getSelectedRow()
  if (!row) return
  if (row.signStatus === '已签收') {
    ElMessage.info('出库单已签收')
    return
  }
  ElMessageBox.prompt('请输入签收人姓名', '签收确认', {
    confirmButtonText: '确认签收',
    cancelButtonText: '取消',
    inputPlaceholder: '请输入签收人姓名'
  }).then(({ value }) => {
    if (!value) {
      ElMessage.warning('请输入签收人姓名')
      return
    }
    const rowKey = getRowKey(row)
    persistOutboundChanges(rowKey, {
      signStatus: '已签收',
      signPerson: value,
      signDate: new Date().toISOString().split('T')[0],
      logisticsStatus: 'signed'
    })
    addOperationLog(rowKey, 'sign', value, '签收销售出库单')
    ElMessage.success(`出库单 ${row.outboundNo || row.id} 已签收`)
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
    ElMessage.info('此出库单为上门自提，无需物流跟踪')
    return
  }

  const logisticsDetail = {
    company: logisticsCompanyMap[String(target.logisticsCompany)] || '未知',
    trackingNo: target.logisticsNo,
    steps: [
      { time: '2026-06-18 10:30:00', status: '已发出', location: '发货仓库', remark: '货物已从仓库发出' },
      { time: '2026-06-18 14:20:00', status: '运输中', location: '物流中转站', remark: '货物正在运输途中' },
      { time: '2026-06-18 20:45:00', status: '到达目的城市', location: '目的地城市', remark: '货物已到达目的城市' },
      { time: '2026-06-19 08:15:00', status: '派送中', location: '配送点', remark: '快递员正在派送中' },
      { time: '2026-06-19 10:30:00', status: '已签收', location: '客户地址', remark: `签收人：${target.signPerson || '客户'}` }
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
      searchForm.value.signStatus = migrateSavedFilter(parsed.signStatus)
      searchForm.value.docStatus = migrateSavedFilter(parsed.docStatus)
      searchForm.value.closeStatus = migrateSavedFilter(parsed.closeStatus)
      searchForm.value.paymentStatus = migrateSavedFilter(parsed.paymentStatus)
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
    signStatus: ALL_FILTER_VALUE,
    docStatus: ALL_FILTER_VALUE,
    closeStatus: ALL_FILTER_VALUE,
    paymentStatus: ALL_FILTER_VALUE,
    logisticsStatus: ALL_FILTER_VALUE
  }
  currentPage.value = 1
  localStorage.removeItem(SEARCH_FORM_KEY)
}

watch(() => [
  searchForm.value.auditStatus,
  searchForm.value.signStatus,
  searchForm.value.docStatus,
  searchForm.value.closeStatus,
  searchForm.value.paymentStatus,
  searchForm.value.logisticsStatus
], saveSearchForm, { deep: true })

onMounted(() => {
  document.title = '销售出库记录'
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
              placeholder="出库单号/销售订单号/客户/仓库/操作员/备注"
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
        <el-button type="primary" link size="small" @click="handleToSalesOrder">关联销售订单</el-button>
        <el-button type="primary" link size="small" @click="handleDelivery">发货</el-button>
        <el-button type="primary" link size="small" @click="handleSign">签收</el-button>
        <el-button type="primary" link size="small" @click="handleTrackLogistics()">物流</el-button>
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
        <el-table-column label="出库单号" :width="columnWidths.outboundNo">
          <template #default="{ row }">
            <span class="code-link" @click="handleOutboundNoClick(row)">{{ row.outboundNo }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="salesOrderNo" label="销售订单号" :width="columnWidths.salesOrderNo" />
        <el-table-column prop="customer" label="客户" :width="columnWidths.customer" />
        <el-table-column prop="warehouse" label="仓库" :width="columnWidths.warehouse" />
        <el-table-column prop="date" label="出库日期" :width="columnWidths.date" />
        <el-table-column prop="operator" label="操作员" :width="columnWidths.operator" />
        <el-table-column prop="itemCount" label="商品种类" :width="columnWidths.itemCount" align="center" />
        <el-table-column prop="totalQuantity" label="总数量" :width="columnWidths.totalQuantity" align="center" />
        <el-table-column label="出库金额" :width="columnWidths.amount" align="right">
          <template #default="{ row }">
            <span>¥{{ row.amount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="审核状态" :width="columnWidths.auditStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="resolveAuditStatus(row) === 'audited' ? 'success' : 'info'">
              {{ auditStatusLabels[resolveAuditStatus(row)] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="签收状态" :width="columnWidths.signStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="resolveSignStatusKey(row) === 'signed' ? 'success' : 'warning'">
              {{ signStatusLabels[resolveSignStatusKey(row)] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="收款状态" :width="columnWidths.paymentStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="resolveReceiptStatusKey(row) === 'received' ? 'success' : 'warning'">
              {{ receiptStatusLabels[resolveReceiptStatusKey(row)] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="物流状态" :width="columnWidths.logisticsStatus" align="center">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="resolveLogisticsStatusKey(row) === 'signed' ? 'success' : resolveLogisticsStatusKey(row) === 'inTransit' ? 'warning' : 'info'"
            >
              {{ logisticsStatusLabels[resolveLogisticsStatusKey(row)] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="物流公司" :width="columnWidths.logisticsCompany" align="center">
          <template #default="{ row }">
            <span>{{ logisticsCompanyMap[row.logisticsCompany] || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="物流单号" :width="columnWidths.logisticsNo">
          <template #default="{ row }">
            <span
              v-if="row.logisticsNo"
              class="code-link"
              @click="handleTrackLogistics(row)"
            >{{ row.logisticsNo }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="关闭状态" :width="columnWidths.closeStatus" align="center">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="resolveCloseStatus(row) === 'closed' ? 'danger' : resolveCloseStatus(row) === 'manualClosed' ? 'warning' : 'info'"
            >
              {{ closeStatusLabels[resolveCloseStatus(row)] }}
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
        <el-table-column prop="remark" label="备注" :width="columnWidths.remark" />
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
