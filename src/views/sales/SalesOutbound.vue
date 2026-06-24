<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { printSalesOutbound, type SalesOutboundData } from '@/utils/printService'
import { loadPrintSettings } from '@/utils/printSettings'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { TableInstance } from 'element-plus'
import { useTableStyle } from '@/composables/useTableStyle'
import {
  ArrowLeft, ArrowRight, DArrowLeft, DArrowRight,
  MoreFilled, Plus, Minus, CopyDocument, Setting
} from '@element-plus/icons-vue'
import { warehouses, locations, loadLocationsFromApi, loadWarehousesFromApi, getCurrentCompany } from '@/utils/dataStore'
import { getDefaultWarehouseValue, refreshWarehouseOptions } from '@/utils/warehouseSettings'
import { getCompanyInfo } from '@/utils/companyConfig'
import { loadProductList, findProductsByCompositeQuery, type ProductMaster } from '@/utils/productStore'
import {
  searchPlatformProducts,
  applyPlatformProductToSalesItem,
  findPlatformProductByCode,
  type PlatformProduct
} from '@/utils/platformProductStore'
import {
  validateOutboundItems,
  appendUdiTraceChain,
  showComplianceResult
} from '@/utils/complianceService'
import { onSalesOutboundAudited } from '@/utils/platformCollaborationService'
import {
  enrichCustomerFieldsFromMaster,
  hydrateCustomerListFromServer,
  loadActiveCustomerList,
  applyCustomerMasterToTarget,
  type CustomerMaster
} from '@/utils/customerStore'
import { useDocumentConfirm } from '@/composables/useDocumentConfirm'
import { CONFIRM_STATUS_CONFIRMED, CONFIRM_STATUS_UNCONFIRMED } from '@/utils/documentFunctionSettings'
import { generateDocumentNo } from '@/utils/documentNumberSettings'
import {
  arrowKeyToDirection,
  findFieldKeyFromElement,
  focusCellControl,
  focusFieldByKey,
  handleFormGridSelectKeyboard,
  handleItemSelectEnter,
  handleItemSelectKeyboard,
  isDatePickerPanelOpen,
  isItemDatePickerTarget,
  isItemSelectTarget,
  isSelectDropdownOpen,
  navigateSequentialFields,
  scheduleAfterDatePickerClose,
  scheduleAfterSelectClose,
  shouldNavigateOnArrow as shouldNavigateOnArrowBase
} from '@/utils/erpFormKeyboard'
import {
  loadBatchNoFormat,
  saveBatchNoFormat,
  applyProductionDateToItemRow,
  markBatchNoManual,
  markExpiryManual,
  reapplyBatchNoFormatToItems,
  type BatchNoFormat
} from '@/utils/productBatchExpiry'
import BatchNoFormatPicker from '@/components/common/BatchNoFormatPicker.vue'
import BatchNoCell from '@/components/common/BatchNoCell.vue'

const OUTBOUND_STORAGE_KEY = 'salesOutboundRecords'
const OPERATION_LOG_KEY = 'sales-outbound-operation-logs'
const HEADER_CONFIG_KEY = 'sales-outbound-field-config'
const HEADER_ORDER_KEY = 'sales-outbound-field-order'
const ITEM_COLUMN_CONFIG_KEY = 'sales-outbound-item-column-config'
const ITEM_COLUMN_ORDER_KEY = 'sales-outbound-item-column-order'

interface OutboundItem {
  id: number
  productCode: string
  productName: string
  spec: string
  unit: string
  quantity: number | string
  unitPrice: number | string
  amount: number | string
  discount: number | string
  netAmount: number | string
  locationCode: string
  locationName: string
  remark: string
  mfgDate: string
  expiryDate: string
  batchNo: string
  bidType: string
  manufacturer: string
  registrationNo: string
  productionLicenseNo: string
  storageCondition: string
  productLocked?: boolean
  _skipProductBlurSearch?: boolean
  _fromPlatform?: boolean
  _platformProductCode?: string
}

type ItemColumnDef = {
  key: string
  label: string
  prop: string
  align: 'center' | 'right'
  required?: boolean
  overflow?: boolean
}

const DEFAULT_ITEM_COLUMN_KEYS = [
  'productCode', 'productName', 'spec', 'manufacturer',
  'registrationNo', 'productionLicenseNo',
  'unit', 'quantity', 'unitPrice', 'amount',
  'discount', 'netAmount',
  'batchNo', 'mfgDate', 'expiryDate', 'storageCondition', 'bidType',
  'locationName', 'remark'
]

const ITEM_COLUMN_DEFINITIONS: ItemColumnDef[] = [
  { key: 'productCode', label: '商品编码', prop: 'productCode', align: 'center', required: true },
  { key: 'productName', label: '商品名称', prop: 'productName', align: 'center', overflow: true },
  { key: 'spec', label: '规格型号', prop: 'spec', align: 'center', overflow: true },
  { key: 'manufacturer', label: '生产厂家', prop: 'manufacturer', align: 'center', overflow: true },
  { key: 'registrationNo', label: '注册证号', prop: 'registrationNo', align: 'center' },
  { key: 'productionLicenseNo', label: '生产许可证号', prop: 'productionLicenseNo', align: 'center' },
  { key: 'unit', label: '单位', prop: 'unit', align: 'center', required: true },
  { key: 'quantity', label: '数量', prop: 'quantity', align: 'right', required: true },
  { key: 'unitPrice', label: '单价', prop: 'unitPrice', align: 'right' },
  { key: 'amount', label: '金额', prop: 'amount', align: 'right' },
  { key: 'discount', label: '折扣%', prop: 'discount', align: 'right' },
  { key: 'netAmount', label: '折后金额', prop: 'netAmount', align: 'right' },
  { key: 'batchNo', label: '生产批号', prop: 'batchNo', align: 'center' },
  { key: 'mfgDate', label: '生产日期', prop: 'mfgDate', align: 'center' },
  { key: 'expiryDate', label: '有效期至', prop: 'expiryDate', align: 'center' },
  { key: 'storageCondition', label: '贮存条件', prop: 'storageCondition', align: 'center' },
  { key: 'bidType', label: '招标类型', prop: 'bidType', align: 'center' },
  { key: 'locationName', label: '库位', prop: 'locationName', align: 'center' },
  { key: 'remark', label: '备注', prop: 'remark', align: 'center' }
]

type ItemProductSuggestion = {
  value: string
  label: string
  code: string
  name: string
  spec: string
  manufacturer: string
  lastPrice: number
  source: 'local' | 'platform'
  raw: ProductMaster | PlatformProduct
}

interface HeaderFieldOption {
  key: string
  label: string
  type: 'input' | 'select' | 'date' | 'number' | 'textarea' | 'status'
  required?: boolean
  disabled?: boolean
  fullWidth?: boolean
  span2?: boolean
  maxLength?: number
  options?: string
  min?: number
  max?: number
  precision?: number
}

const DEFAULT_HEADER_FIELDS = [
  'outboundNo', 'outboundDate', 'salesOrderNo', 'warehouse',
  'customer', 'customerCode', 'contact', 'phone', 'address',
  'transport', 'freight', 'remark'
]

const HEADER_FIELD_DEFINITIONS: HeaderFieldOption[] = [
  { key: 'outboundNo', label: '出库单号', type: 'input', disabled: true },
  { key: 'outboundDate', label: '出库日期', type: 'date', required: true },
  { key: 'salesOrderNo', label: '销售订单号', type: 'select', options: 'salesOrderOptions' },
  { key: 'warehouse', label: '仓库', type: 'select', options: 'warehouseOptions', required: true },
  { key: 'customer', label: '客户', type: 'select', options: 'customerOptions', required: true },
  { key: 'customerCode', label: '客户编码', type: 'input', disabled: true },
  { key: 'contact', label: '联系人', type: 'input' },
  { key: 'phone', label: '联系电话', type: 'input' },
  { key: 'address', label: '收货地址', type: 'input', span2: true },
  { key: 'transport', label: '运输方式', type: 'select', options: 'transportOptions' },
  { key: 'freight', label: '运费', type: 'number', min: 0, precision: 2 },
  { key: 'remark', label: '备注', type: 'textarea', fullWidth: true, maxLength: 200 },
  { key: 'logisticsCompany', label: '物流公司', type: 'select', options: 'logisticsCompanies' },
  { key: 'logisticsNo', label: '物流单号', type: 'input' },
  { key: 'deliveryDate', label: '发货日期', type: 'date' },
  { key: 'deliveryStatus', label: '发货状态', type: 'status' },
  { key: 'signStatus', label: '签收状态', type: 'status' },
  { key: 'signPerson', label: '签收人', type: 'input', disabled: true },
  { key: 'signDate', label: '签收日期', type: 'input', disabled: true },
  { key: 'creator', label: '开单人员', type: 'input', disabled: true },
  { key: 'createDate', label: '创建时间', type: 'input', disabled: true },
  { key: 'confirmStatus', label: '确认状态', type: 'status' },
  { key: 'auditStatus', label: '审核状态', type: 'status' },
  { key: 'paymentStatus', label: '收款状态', type: 'status' }
]

const router = useRouter()
const route = useRoute()

const showFieldSelector = ref(false)
const fieldOptions = ref<HeaderFieldOption[]>([...HEADER_FIELD_DEFINITIONS])
const visibleFields = ref<Set<string>>(new Set(DEFAULT_HEADER_FIELDS))
const selectedFields = ref<string[]>([...DEFAULT_HEADER_FIELDS])
const dragIndex = ref(-1)

const sortedVisibleFields = computed(() => {
  const orderKeys = fieldOptions.value.map(f => f.key)
  return orderKeys
    .filter(key => visibleFields.value.has(key))
    .map(key => fieldOptions.value.find(f => f.key === key))
    .filter(Boolean) as HeaderFieldOption[]
})

const initHeaderFieldConfig = () => {
  const savedOrder = localStorage.getItem(HEADER_ORDER_KEY)
  if (savedOrder) {
    try {
      const order = JSON.parse(savedOrder) as string[]
      const orderedFields = order
        .map(key => HEADER_FIELD_DEFINITIONS.find(f => f.key === key))
        .filter(Boolean) as HeaderFieldOption[]
      const newFields = HEADER_FIELD_DEFINITIONS.filter(f => !order.includes(f.key))
      fieldOptions.value = [...orderedFields, ...newFields]
    } catch {
      /* ignore */
    }
  } else {
    fieldOptions.value = [...HEADER_FIELD_DEFINITIONS]
  }

  const saved = localStorage.getItem(HEADER_CONFIG_KEY)
  if (saved) {
    try {
      const keys = (JSON.parse(saved) as string[]).filter(key =>
        HEADER_FIELD_DEFINITIONS.some(f => f.key === key)
      )
      if (keys.length) {
        visibleFields.value = new Set(keys)
        selectedFields.value = keys
        return
      }
    } catch {
      /* ignore */
    }
  }

  visibleFields.value = new Set(DEFAULT_HEADER_FIELDS)
  selectedFields.value = [...DEFAULT_HEADER_FIELDS]
}

const openHeaderSettings = () => {
  selectedFields.value = sortedVisibleFields.value.map(f => f.key)
  showFieldSelector.value = true
}

const handleDragStart = (e: DragEvent, index: number) => {
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

const handleDrop = (e: DragEvent, index: number) => {
  e.preventDefault()
  if (dragIndex.value !== -1 && dragIndex.value !== index) {
    const items = [...fieldOptions.value]
    const dragItem = items[dragIndex.value]
    items.splice(dragIndex.value, 1)
    items.splice(index, 0, dragItem)
    fieldOptions.value = items
  }
  dragIndex.value = -1
}

const confirmFieldSelection = () => {
  if (selectedFields.value.length === 0) {
    ElMessage.warning('请至少选择一个字段')
    return
  }
  visibleFields.value = new Set(selectedFields.value)
  localStorage.setItem(HEADER_CONFIG_KEY, JSON.stringify(selectedFields.value))
  localStorage.setItem(HEADER_ORDER_KEY, JSON.stringify(fieldOptions.value.map(f => f.key)))
  showFieldSelector.value = false
  ElMessage.success('表头设置已保存')
}

initHeaderFieldConfig()

const logisticsCompanies = [
  { label: '顺丰速运', value: 'sf' },
  { label: '圆通速递', value: 'yt' },
  { label: '中通快递', value: 'zt' },
  { label: '申通快递', value: 'st' },
  { label: '韵达快递', value: 'yd' },
  { label: 'EMS', value: 'ems' },
  { label: '京东物流', value: 'jd' },
  { label: '德邦物流', value: 'db' }
]

const transportOptions = [
  { label: '快递', value: 'express' },
  { label: '物流', value: 'logistics' },
  { label: '自提', value: 'self' }
]

const warehouseOptions = computed(() =>
  warehouses.value
    .filter(w => w.companyId === getCurrentCompany() && w.status === '启用')
    .map(w => ({ label: w.name, value: w.name }))
)

const ensureOutboundWarehouseDefault = () => {
  if (String(form.value.warehouse || '').trim()) return
  refreshWarehouseOptions()
  const defaultVal = getDefaultWarehouseValue(warehouseOptions.value.map(opt => ({
    label: opt.label,
    value: opt.value
  })))
  const fallback = defaultVal || warehouseOptions.value[0]?.value || warehouses.value[0]?.name || ''
  if (!fallback) return
  handleWarehouseChange(fallback)
}

const salesOrderOptions = computed(() => {
  const orders = JSON.parse(localStorage.getItem('sales-orders') || '[]') as Record<string, unknown>[]
  return orders.map(o => ({
    label: `${o.id || o.orderNo} - ${o.customer}`,
    value: String(o.id || o.orderNo || ''),
    customer: String(o.customer || ''),
    customerCode: String(o.customerCode || ''),
    contact: String(o.contact || ''),
    phone: String(o.phone || ''),
    receiveAddress: String(o.receiveAddress || ''),
    warehouse: String(o.warehouse || '')
  }))
})

const customerList = ref<CustomerMaster[]>([])

const customerOptions = computed(() =>
  customerList.value.map(item => ({
    label: item.name,
    value: item.name,
    code: item.code || item.id
  }))
)

const getOptions = (optionsKey?: string) => {
  if (optionsKey === 'salesOrderOptions') return salesOrderOptions.value
  if (optionsKey === 'customerOptions') return customerOptions.value
  if (optionsKey === 'warehouseOptions') return warehouseOptions.value
  if (optionsKey === 'transportOptions') return transportOptions
  if (optionsKey === 'logisticsCompanies') return logisticsCompanies
  return []
}

const getStatusTagType = (key: string, value: string) => {
  if (key === 'confirmStatus') return value === '已确认' ? 'success' : 'warning'
  if (key === 'auditStatus') return value === '已审核' ? 'success' : 'warning'
  if (key === 'deliveryStatus') return value === '已发货' ? 'primary' : 'info'
  if (key === 'signStatus') return value === '已签收' ? 'success' : 'info'
  if (key === 'paymentStatus') return value === '已收款' ? 'success' : 'info'
  return 'info'
}

const basicInfoCollapsed = ref(false)
const itemsCollapsed = ref(false)
const batchNoFormat = ref<BatchNoFormat>(loadBatchNoFormat())

const itemsTableRef = ref<TableInstance>()
const itemsTableWrapRef = ref<HTMLElement>()
let itemsTableBodyEl: HTMLElement | null = null
let itemsTableResizeObserver: ResizeObserver | null = null

const showItemColumnSelector = ref(false)
const itemColumnOptions = ref<ItemColumnDef[]>([...ITEM_COLUMN_DEFINITIONS])
const visibleItemColumns = ref<Set<string>>(new Set(DEFAULT_ITEM_COLUMN_KEYS))
const selectedItemColumns = ref<string[]>([...DEFAULT_ITEM_COLUMN_KEYS])
const itemDragIndex = ref(-1)

const sortedVisibleItemColumns = computed(() =>
  itemColumnOptions.value.filter(col => visibleItemColumns.value.has(col.key))
)

const getItemColumnWidth = (key: string) => itemColumnWidths.value[key] || 120

const itemsTableTotalWidth = computed(() => {
  let total = getItemColumnWidth('index')
  sortedVisibleItemColumns.value.forEach(col => {
    total += getItemColumnWidth(col.key)
  })
  return total
})

const itemsTableRenderKey = computed(() =>
  `${sortedVisibleItemColumns.value.map(c => c.key).join(',')}|${itemsTableTotalWidth.value}`
)

const syncItemsTableColgroup = () => {
  const tableEl = itemsTableRef.value?.$el as HTMLElement | undefined
  if (!tableEl) return

  const headerTable = tableEl.querySelector('.el-table__header-wrapper table') as HTMLElement | null
  const bodyTable = tableEl.querySelector('.el-table__body-wrapper table') as HTMLElement | null
  const footerTable = tableEl.querySelector('.el-table__footer-wrapper table') as HTMLElement | null
  if (!headerTable || !bodyTable) return

  const headerCols = headerTable.querySelectorAll('colgroup col')
  const bodyCols = bodyTable.querySelectorAll('colgroup col')
  const footerCols = footerTable?.querySelectorAll('colgroup col')

  headerCols.forEach((col, index) => {
    const headerCol = col as HTMLTableColElement
    const width = headerCol.style.width
    if (!width) return

    if (bodyCols[index]) {
      const bodyCol = bodyCols[index] as HTMLTableColElement
      bodyCol.style.width = width
      bodyCol.width = headerCol.width
    }
    if (footerCols?.[index]) {
      const footerCol = footerCols[index] as HTMLTableColElement
      footerCol.style.width = width
      footerCol.width = headerCol.width
    }
  })

  const tableWidth = headerTable.style.width
  if (tableWidth) {
    bodyTable.style.width = tableWidth
    if (footerTable) {
      footerTable.style.width = tableWidth
    }
  }
}

const syncItemsTableCellWidths = () => {
  const tableEl = itemsTableRef.value?.$el as HTMLElement | undefined
  if (!tableEl) return

  const headerCells = tableEl.querySelectorAll(
    '.el-table__header-wrapper thead tr th.el-table__cell'
  )
  if (!headerCells.length) return

  const widths = Array.from(headerCells).map(cell => (cell as HTMLElement).getBoundingClientRect().width)

  const syncRowCells = (rowSelector: string) => {
    tableEl.querySelectorAll(rowSelector).forEach(row => {
      row.querySelectorAll('td.el-table__cell, th.el-table__cell').forEach((cell, index) => {
        const width = widths[index]
        if (!width) return
        const el = cell as HTMLElement
        el.style.width = `${width}px`
        el.style.minWidth = `${width}px`
      })
    })
  }

  syncRowCells('.el-table__body-wrapper tbody tr.el-table__row')
  syncRowCells('.el-table__footer-wrapper tfoot tr')
}

const syncItemsTableScroll = () => {
  const tableEl = itemsTableRef.value?.$el as HTMLElement | undefined
  if (!tableEl) return
  const bodyWrapper = tableEl.querySelector('.el-table__body-wrapper') as HTMLElement | null
  const headerWrapper = tableEl.querySelector('.el-table__header-wrapper') as HTMLElement | null
  const footerWrapper = tableEl.querySelector('.el-table__footer-wrapper') as HTMLElement | null
  if (!bodyWrapper || !headerWrapper) return
  headerWrapper.scrollLeft = bodyWrapper.scrollLeft
  if (footerWrapper) {
    footerWrapper.scrollLeft = bodyWrapper.scrollLeft
  }
}

const bindItemsTableScrollSync = () => {
  const tableEl = itemsTableRef.value?.$el as HTMLElement | undefined
  const bodyWrapper = tableEl?.querySelector('.el-table__body-wrapper') as HTMLElement | null
  if (!bodyWrapper) return

  if (itemsTableBodyEl && itemsTableBodyEl !== bodyWrapper) {
    itemsTableBodyEl.removeEventListener('scroll', syncItemsTableScroll)
  }
  if (itemsTableBodyEl === bodyWrapper) return

  itemsTableBodyEl = bodyWrapper
  bodyWrapper.addEventListener('scroll', syncItemsTableScroll, { passive: true })
}

const unbindItemsTableScrollSync = () => {
  itemsTableBodyEl?.removeEventListener('scroll', syncItemsTableScroll)
  itemsTableBodyEl = null
}

const bindItemsTableResizeObserver = () => {
  if (itemsTableResizeObserver || !itemsTableWrapRef.value) return
  itemsTableResizeObserver = new ResizeObserver(() => {
    debouncedSyncItemsTableLayout()
  })
  itemsTableResizeObserver.observe(itemsTableWrapRef.value)
}

const unbindItemsTableResizeObserver = () => {
  itemsTableResizeObserver?.disconnect()
  itemsTableResizeObserver = null
}

const initItemColumnConfig = () => {
  let orderKeys = ITEM_COLUMN_DEFINITIONS.map(c => c.key)
  let visibleKeys = [...DEFAULT_ITEM_COLUMN_KEYS]

  const savedOrder = localStorage.getItem(ITEM_COLUMN_ORDER_KEY)
  if (savedOrder) {
    try {
      orderKeys = JSON.parse(savedOrder) as string[]
    } catch {
      /* ignore */
    }
  }

  const saved = localStorage.getItem(ITEM_COLUMN_CONFIG_KEY)
  if (saved) {
    try {
      const parsed = (JSON.parse(saved) as string[]).filter(key =>
        ITEM_COLUMN_DEFINITIONS.some(c => c.key === key)
      )
      if (parsed.length) visibleKeys = parsed
    } catch {
      /* ignore */
    }
  }

  const ordered = orderKeys
    .map(key => ITEM_COLUMN_DEFINITIONS.find(c => c.key === key))
    .filter(Boolean) as ItemColumnDef[]
  const missing = ITEM_COLUMN_DEFINITIONS.filter(c => !orderKeys.includes(c.key))
  itemColumnOptions.value = [...ordered, ...missing]

  visibleItemColumns.value = new Set(visibleKeys)
  selectedItemColumns.value = [...visibleKeys]
}

const openItemColumnSettings = () => {
  selectedItemColumns.value = sortedVisibleItemColumns.value.map(c => c.key)
  showItemColumnSelector.value = true
}

const handleItemDragStart = (e: DragEvent, index: number) => {
  itemDragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

const handleItemDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

const handleItemDrop = (e: DragEvent, index: number) => {
  e.preventDefault()
  if (itemDragIndex.value !== -1 && itemDragIndex.value !== index) {
    const items = [...itemColumnOptions.value]
    const dragItem = items[itemDragIndex.value]
    items.splice(itemDragIndex.value, 1)
    items.splice(index, 0, dragItem)
    itemColumnOptions.value = items
  }
  itemDragIndex.value = -1
}

const confirmItemColumnSelection = () => {
  if (selectedItemColumns.value.length === 0) {
    ElMessage.warning('请至少选择一列')
    return
  }
  visibleItemColumns.value = new Set(selectedItemColumns.value)
  localStorage.setItem(ITEM_COLUMN_CONFIG_KEY, JSON.stringify(selectedItemColumns.value))
  localStorage.setItem(ITEM_COLUMN_ORDER_KEY, JSON.stringify(itemColumnOptions.value.map(c => c.key)))
  showItemColumnSelector.value = false
  ElMessage.success('商品信息设置已保存')
  syncItemsTableLayout()
}

initItemColumnConfig()

const { columnWidths: itemColumnWidths, handleHeaderDragend: handleItemsHeaderDragendBase } = useTableStyle('sales-outbound-items', [
  { key: 'index', label: '行号', defaultWidth: 52 },
  { key: 'productCode', label: '商品编码', defaultWidth: 120 },
  { key: 'productName', label: '商品名称', defaultWidth: 160 },
  { key: 'spec', label: '规格型号', defaultWidth: 120 },
  { key: 'manufacturer', label: '生产厂家', defaultWidth: 140 },
  { key: 'registrationNo', label: '注册证号', defaultWidth: 150 },
  { key: 'productionLicenseNo', label: '生产许可证号', defaultWidth: 160 },
  { key: 'unit', label: '单位', defaultWidth: 64 },
  { key: 'quantity', label: '数量', defaultWidth: 88 },
  { key: 'unitPrice', label: '单价', defaultWidth: 96 },
  { key: 'amount', label: '金额', defaultWidth: 100 },
  { key: 'discount', label: '折扣%', defaultWidth: 80 },
  { key: 'netAmount', label: '折后金额', defaultWidth: 100 },
  { key: 'batchNo', label: '生产批号', defaultWidth: 110 },
  { key: 'mfgDate', label: '生产日期', defaultWidth: 100 },
  { key: 'expiryDate', label: '有效期至', defaultWidth: 100 },
  { key: 'storageCondition', label: '贮存条件', defaultWidth: 120 },
  { key: 'bidType', label: '招标类型', defaultWidth: 100 },
  { key: 'locationName', label: '库位', defaultWidth: 120 },
  { key: 'remark', label: '备注', defaultWidth: 120 }
])

const handleItemsHeaderDragend = (newWidth: number, oldWidth: number, column: any) => {
  handleItemsHeaderDragendBase(newWidth, oldWidth, column)
  syncItemsTableLayout()
}

const syncItemsTableLayout = () => {
  nextTick(() => {
    itemsTableRef.value?.doLayout()
    requestAnimationFrame(() => {
      itemsTableRef.value?.doLayout()
      syncItemsTableColgroup()
      syncItemsTableCellWidths()
      bindItemsTableScrollSync()
      syncItemsTableScroll()
      requestAnimationFrame(() => {
        itemsTableRef.value?.doLayout()
        syncItemsTableColgroup()
        syncItemsTableCellWidths()
        syncItemsTableScroll()
      })
    })
  })
}

let syncLayoutTimer: ReturnType<typeof setTimeout> | null = null
const debouncedSyncItemsTableLayout = () => {
  if (syncLayoutTimer) clearTimeout(syncLayoutTimer)
  syncLayoutTimer = setTimeout(() => {
    syncItemsTableLayout()
    syncLayoutTimer = null
  }, 150)
}

let nextItemId = 1

const form = ref({
  outboundNo: '',
  warehouse: '',
  warehouseName: '',
  outboundDate: '',
  deliveryDate: '',
  customer: '',
  customerCode: '',
  contact: '',
  phone: '',
  address: '',
  transport: '',
  freight: 0,
  remark: '',
  creator: '',
  createDate: '',
  confirmStatus: '未确认',
  auditStatus: '未审核',
  paymentStatus: '未收款',
  salesOrderNo: '',
  logisticsCompany: '',
  logisticsNo: '',
  deliveryStatus: '未发货',
  signStatus: '未签收',
  signPerson: '',
  signDate: '',
  logisticsStatus: '',
  status: 'pending',
  closeStatus: 'notClosed',
  auditor: '',
  auditTime: ''
})

const addOperationLog = (outboundId: string, operationType: string, operator: string, remark: string) => {
  const logs = JSON.parse(localStorage.getItem(OPERATION_LOG_KEY) || '[]')
  logs.unshift({
    id: Date.now(),
    outboundId,
    operationType,
    operator,
    operationTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    remark
  })
  localStorage.setItem(OPERATION_LOG_KEY, JSON.stringify(logs.slice(0, 500)))
}

const formatLocalDateTime = () =>
  new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')

const {
  confirmEnabled: salesOutboundConfirmEnabled,
  canConfirm: canConfirmSalesOutbound,
  handleConfirm,
  requireConfirmedBeforeAudit: requireSalesOutboundConfirmed,
  resetConfirmStatus: resetSalesOutboundConfirm,
  autoConfirmIfNeeded: autoConfirmSalesOutboundIfNeeded
} = useDocumentConfirm(
  'sales_outbound',
  () => form.value.confirmStatus,
  value => { form.value.confirmStatus = value },
  {
    permissionCode: 'sales_outbound_confirm',
    validate: () => validateForm() && runOutboundComplianceCheck(),
    onPersist: () => { handleSave() }
  }
)

const outboundItems = ref<OutboundItem[]>([])

const isEditable = computed(() => form.value.confirmStatus === CONFIRM_STATUS_UNCONFIRMED)

const confirmStatusTagType = computed(() =>
  form.value.confirmStatus === CONFIRM_STATUS_CONFIRMED ? 'success' : 'warning'
)

const isFieldEditable = (field: HeaderFieldOption) => {
  if (field.disabled || field.type === 'status') return false
  if (isEditable.value) return true
  if (['logisticsCompany', 'logisticsNo'].includes(field.key) && form.value.deliveryStatus !== '已发货') {
    return true
  }
  return false
}

const filteredLocations = computed(() => {
  if (!form.value.warehouse) return []
  return locations.value.filter(l => l.warehouse === form.value.warehouse && l.status === '启用')
})

const totalQuantity = computed(() =>
  outboundItems.value.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
)

const totalAmount = computed(() =>
  outboundItems.value.reduce((sum, item) => sum + Number(item.amount || 0), 0)
)

const totalDiscount = computed(() =>
  outboundItems.value.reduce((sum, item) => sum + (Number(item.amount) * Number(item.discount) / 100), 0)
)

const totalNetAmount = computed(() =>
  outboundItems.value.reduce((sum, item) => sum + Number(item.netAmount || 0), 0) + Number(form.value.freight || 0)
)

const formatQty = (val: number | string) =>
  Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

const formatMoney = (val: number | string) =>
  Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const calcRowAmount = (row: OutboundItem) => {
  row.amount = Number((Number(row.quantity) * Number(row.unitPrice)).toFixed(2))
  row.netAmount = Number((row.amount * (1 - Number(row.discount) / 100)).toFixed(2))
}

const createEmptyItemRow = (): OutboundItem => {
  const defaultLoc = filteredLocations.value[0]
  return {
    id: nextItemId++,
    productCode: '',
    productName: '',
    spec: '',
    unit: '',
    quantity: 1,
    unitPrice: 0,
    amount: 0,
    discount: 0,
    netAmount: 0,
    locationCode: defaultLoc?.code || '',
    locationName: defaultLoc?.name || '',
    remark: '',
    mfgDate: '',
    expiryDate: '',
    batchNo: '',
    bidType: '',
    manufacturer: '',
    registrationNo: '',
    productionLicenseNo: '',
    storageCondition: '',
    productLocked: false
  }
}

const applyLocalProductToItem = (target: OutboundItem, product: ProductMaster) => {
  target.productCode = product.code
  target.productName = product.name
  target.spec = product.spec || ''
  target.unit = product.measureUnit || product.purchaseUnit || '盒'
  target.unitPrice = Number(product.lastPrice ?? product.unitPrice ?? 0)
  target.manufacturer = product.manufacturer || ''
  target.registrationNo = product.registerNo || ''
  target.productionLicenseNo = product.licenseNo || ''
  target.storageCondition = product.storageCondition || ''
  target._fromPlatform = Boolean(product.fromPlatform)
  target._platformProductCode = String(product.platformProductCode || '')
  if (target.mfgDate) {
    applyProductionDateToItemRow(target as Record<string, any>, product, batchNoFormat.value)
  }
}

const applyBatchExpiryFromProductionDate = (
  row: OutboundItem,
  product?: ProductMaster | Record<string, unknown>
) => {
  if (row.mfgDate) {
    applyProductionDateToItemRow(row as Record<string, any>, product, batchNoFormat.value)
  }
}

const handleBatchNoFormatChange = (format: BatchNoFormat) => {
  saveBatchNoFormat(format)
  reapplyBatchNoFormatToItems(outboundItems.value as Record<string, any>[], format)
}

const handleProductionDateChange = (row: OutboundItem) => {
  applyProductionDateToItemRow(row as Record<string, any>, undefined, batchNoFormat.value)
}

const handleBatchNoInput = (row: OutboundItem) => {
  markBatchNoManual(row as Record<string, any>, batchNoFormat.value)
}

const handleExpiryDateChange = (row: OutboundItem) => {
  markExpiryManual(row as Record<string, any>)
}

const buildItemProductSearchQuery = (item: Record<string, unknown>): string => {
  const code = String(item.productCode || '').trim()
  if (code.includes(' ')) return code
  return [code, item.productName, item.spec, item.manufacturer]
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .join(' ')
}

const PRODUCT_SUGGEST_LIMIT = 15
const productAutocompleteRefs = new Map<Record<string, unknown>, Record<string, unknown>>()

const setProductAutocompleteRef = (row: Record<string, unknown>, colKey: string, el: unknown) => {
  if (!productAutocompleteRefs.has(row)) {
    productAutocompleteRefs.set(row, {})
  }
  const refs = productAutocompleteRefs.get(row)!
  if (el) refs[colKey] = el
  else delete refs[colKey]
}

const toLocalItemSuggestion = (product: ProductMaster): ItemProductSuggestion => ({
  value: product.code,
  label: `${product.code} | ${product.name}`,
  code: product.code,
  name: product.name,
  spec: product.spec || '',
  manufacturer: product.manufacturer || '',
  lastPrice: Number(product.lastPrice ?? product.unitPrice ?? 0),
  source: 'local',
  raw: product
})

const toPlatformItemSuggestion = (product: PlatformProduct): ItemProductSuggestion => ({
  value: product.code,
  label: `${product.code} | ${product.name}`,
  code: product.code,
  name: product.name,
  spec: product.spec || '',
  manufacturer: product.manufacturer || '',
  lastPrice: Number(product.unitPrice ?? 0),
  source: 'platform',
  raw: product
})

const fetchItemProductSuggestions = (
  row: Record<string, unknown>,
  cb: (results: ItemProductSuggestion[]) => void
) => {
  const searchText = buildItemProductSearchQuery(row)
  if (!searchText.trim()) {
    cb([])
    return
  }
  const localMatches = findProductsByCompositeQuery(searchText, loadProductList())
    .slice(0, PRODUCT_SUGGEST_LIMIT)
    .map(toLocalItemSuggestion)
  const platformMatches = searchPlatformProducts(searchText, 8).map(toPlatformItemSuggestion)
  const merged = [...localMatches]
  platformMatches.forEach(item => {
    if (!merged.some(m => m.code === item.code)) merged.push(item)
  })
  cb(merged.slice(0, PRODUCT_SUGGEST_LIMIT))
}

const isRowProductLocked = (row: OutboundItem) => Boolean(row.productLocked)

const clearProductLock = (row: OutboundItem) => {
  if (row._skipProductBlurSearch) return
  row.productLocked = false
}

const applySuggestionToItem = (target: OutboundItem, suggestion: ItemProductSuggestion) => {
  if (suggestion.source === 'platform') {
    applyPlatformProductToSalesItem(target as Record<string, unknown>, suggestion.raw as PlatformProduct)
    target.unitPrice = Number(suggestion.lastPrice)
    applyBatchExpiryFromProductionDate(target)
    calcRowAmount(target)
    return
  }
  applyLocalProductToItem(target, suggestion.raw as ProductMaster)
}

const handleItemProductSuggestionSelect = (row: OutboundItem, suggestion: ItemProductSuggestion) => {
  row._skipProductBlurSearch = true
  applySuggestionToItem(row, suggestion)
  row.productLocked = true
  calcRowAmount(row)
}

const handleItemProductSearch = (item: OutboundItem, options: { silent?: boolean } = {}) => {
  const searchText = buildItemProductSearchQuery(item)
  if (!searchText) return

  const localMatches = findProductsByCompositeQuery(searchText, loadProductList())
  if (localMatches.length === 1) {
    applyLocalProductToItem(item, localMatches[0])
    item.productLocked = true
    calcRowAmount(item)
    return
  }

  const code = String(item.productCode || '').trim()
  if (code) {
    const platform = findPlatformProductByCode(code)
    if (platform) {
      applyPlatformProductToSalesItem(item as Record<string, unknown>, platform)
      item.unitPrice = Number(platform.unitPrice ?? 0)
      applyBatchExpiryFromProductionDate(item)
      item.productLocked = true
      calcRowAmount(item)
      return
    }
  }

  if (localMatches.length > 1 && !options.silent) {
    ElMessage.warning('匹配到多个商品，请补充编码/名称/规格/厂家条件')
  } else if (code && !item.productName && !options.silent) {
    ElMessage.warning('未找到匹配商品，请检查编码/名称/规格/厂家')
  }
}

const handleItemProductBlur = (item: OutboundItem) => {
  if (item._skipProductBlurSearch) {
    item._skipProductBlurSearch = false
    return
  }
  if (isRowProductLocked(item)) return
  handleItemProductSearch(item, { silent: true })
}

const showBatchAdd = ref(false)
const batchSearchQuery = ref('')
const batchSelectedProducts = ref<ProductMaster[]>([])

const batchProductList = computed(() => loadProductList())

const filteredBatchProducts = computed(() => {
  if (!batchSearchQuery.value) return batchProductList.value
  const query = batchSearchQuery.value.toLowerCase()
  return batchProductList.value.filter(p =>
    (p.code || '').toLowerCase().includes(query) ||
    (p.name || '').toLowerCase().includes(query) ||
    (p.spec || '').toLowerCase().includes(query)
  )
})

const openBatchAdd = () => {
  batchSearchQuery.value = ''
  batchSelectedProducts.value = []
  showBatchAdd.value = true
}

const confirmBatchAdd = () => {
  if (batchSelectedProducts.value.length === 0) {
    ElMessage.warning('请选择至少一个商品')
    return
  }
  batchSelectedProducts.value.forEach(product => {
    const row = createEmptyItemRow()
    applyLocalProductToItem(row, product)
    row.productLocked = true
    applyBatchExpiryFromProductionDate(row, product)
    calcRowAmount(row)
    outboundItems.value.push(row)
  })
  ElMessage.success(`成功添加 ${batchSelectedProducts.value.length} 个商品`)
  showBatchAdd.value = false
  syncItemsTableLayout()
}

const handleItemDateKeydown = (e: KeyboardEvent, row: OutboundItem, colKey: string) => {
  const rowIndex = outboundItems.value.indexOf(row)
  if (rowIndex < 0) return

  if (e.key === 'Enter') {
    const advance = () => {
      e.preventDefault()
      e.stopPropagation()
      focusNextItemCell(rowIndex, colKey)
    }
    if (isDatePickerPanelOpen()) {
      scheduleAfterDatePickerClose(advance)
      return
    }
    advance()
    return
  }

  const direction = arrowKeyToDirection(e.key)
  if (!direction) return
  if ((e.target as HTMLElement).closest('.el-date-picker-panel, .el-picker-panel')) return
  if (isDatePickerPanelOpen()) return
  if (!shouldNavigateOnArrow(e)) return

  e.preventDefault()
  e.stopPropagation()
  navigateItemsTableFrom(rowIndex, colKey, direction)
}

const handleItemSelectEnterKeydown = (e: KeyboardEvent, rowIndex: number, colKey: string) => {
  handleItemSelectEnter(e, () => focusNextItemCell(rowIndex, colKey))
}

const shouldNavigateOnArrow = (e: KeyboardEvent) =>
  shouldNavigateOnArrowBase(e, { isItemDatePickerTarget })

const getFocusableHeaderFields = () =>
  sortedVisibleFields.value.filter(field => !field.disabled)

const focusNextHeaderField = (currentKey: string) => {
  const fields = getFocusableHeaderFields()
  const currentIndex = fields.findIndex(field => field.key === currentKey)
  for (let i = currentIndex + 1; i < fields.length; i++) {
    focusFieldByKey(fields[i].key)
    return
  }
  jumpToItems()
}

const focusPrevHeaderField = (currentKey: string) => {
  const fields = getFocusableHeaderFields()
  const currentIndex = fields.findIndex(field => field.key === currentKey)
  for (let i = currentIndex - 1; i >= 0; i--) {
    focusFieldByKey(fields[i].key)
    return
  }
}

const jumpToItems = () => {
  nextTick(() => {
    const cols = focusableItemColumnKeys.value
    if (cols.length) focusItemCell(0, cols[0])
  })
}

const handleBasicInfoArrowKeydown = (e: KeyboardEvent) => {
  if (handleFormGridSelectKeyboard(e)) return

  const direction = arrowKeyToDirection(e.key)
  if (!direction) return
  if (!shouldNavigateOnArrow(e)) return

  const fieldKey = findFieldKeyFromElement(e.target as HTMLElement)
  if (!fieldKey) return

  e.preventDefault()
  e.stopPropagation()
  navigateSequentialFields(fieldKey, direction, getFocusableHeaderFields(), {
    onAfterLastDown: jumpToItems
  })
}

const handleHeaderEnter = (field: HeaderFieldOption, e: KeyboardEvent) => {
  if (e.key !== 'Enter') return
  e.preventDefault()
  e.stopPropagation()
  focusNextHeaderField(field.key)
}

const handleSelectFieldEnter = (field: HeaderFieldOption, e: KeyboardEvent) => {
  if (e.key !== 'Enter') return
  if (isSelectDropdownOpen()) {
    scheduleAfterSelectClose(() => focusNextHeaderField(field.key))
    return
  }
  e.preventDefault()
  e.stopPropagation()
  focusNextHeaderField(field.key)
}

const handleDateFieldEnter = (field: HeaderFieldOption, e: KeyboardEvent) => {
  if (e.key !== 'Enter') return
  const target = e.target as HTMLElement
  if (target.closest('.el-date-picker-panel, .el-picker-panel')) return
  const advance = () => {
    e.preventDefault()
    e.stopPropagation()
    focusNextHeaderField(field.key)
  }
  if (isDatePickerPanelOpen()) {
    scheduleAfterDatePickerClose(advance)
    return
  }
  advance()
}

const handleFieldEnterCapture = (field: HeaderFieldOption, e: KeyboardEvent) => {
  if (e.key !== 'Enter') return
  if (field.type === 'date' || field.type === 'datetime') {
    handleDateFieldEnter(field, e)
    return
  }
  if (field.type === 'select' || field.key === 'salesOrderNo' || field.key === 'warehouse' || field.key === 'customer') {
    handleSelectFieldEnter(field, e)
    return
  }
  if (field.type === 'textarea' && e.shiftKey) return
  handleHeaderEnter(field, e)
}

const itemTableColumnKeys = computed(() => [
  'index',
  ...sortedVisibleItemColumns.value.map(c => c.key)
])

const focusableItemColumnKeys = computed(() =>
  itemTableColumnKeys.value.filter(key => key !== 'index' && key !== 'amount' && key !== 'netAmount')
)

const focusItemCell = (rowIndex: number, colKey: string) => {
  nextTick(() => {
    const tableEl = itemsTableRef.value?.$el as HTMLElement | undefined
    if (!tableEl) return
    const rows = tableEl.querySelectorAll('.el-table__body-wrapper tbody tr.el-table__row')
    const row = rows[rowIndex] as HTMLElement | undefined
    if (!row) return
    const colIndex = itemTableColumnKeys.value.indexOf(colKey)
    if (colIndex < 0) return
    const cell = row.querySelectorAll('td.el-table__cell')[colIndex] as HTMLElement | undefined
    focusCellControl(cell)
  })
}

const navigateItemsTableFrom = (
  rowIndex: number,
  colKey: string,
  direction: 'up' | 'down' | 'left' | 'right'
) => {
  const cols = focusableItemColumnKeys.value
  const colIdx = cols.indexOf(colKey)
  if (colIdx < 0) return

  if (direction === 'left') {
    if (colIdx > 0) focusItemCell(rowIndex, cols[colIdx - 1])
    return
  }
  if (direction === 'right') {
    if (colIdx < cols.length - 1) focusItemCell(rowIndex, cols[colIdx + 1])
    return
  }
  if (direction === 'up') {
    if (rowIndex > 0) {
      focusItemCell(rowIndex - 1, colKey)
    } else {
      const fields = getFocusableHeaderFields()
      if (fields.length) focusFieldByKey(fields[fields.length - 1].key)
    }
    return
  }
  if (direction === 'down' && rowIndex < outboundItems.value.length - 1) {
    focusItemCell(rowIndex + 1, colKey)
  }
}

const navigateItemsTable = (direction: 'up' | 'down' | 'left' | 'right') => {
  const pos = findItemsTableFocus()
  if (!pos) return
  navigateItemsTableFrom(pos.row, pos.colKey, direction)
}

const focusNextItemCell = (rowIndex: number, currentColKey: string) => {
  const cols = focusableItemColumnKeys.value
  const idx = cols.indexOf(currentColKey)
  if (idx >= 0 && idx < cols.length - 1) {
    focusItemCell(rowIndex, cols[idx + 1])
    return
  }
  if (rowIndex < outboundItems.value.length - 1) {
    focusItemCell(rowIndex + 1, cols[0])
    return
  }
  addItem()
  nextTick(() => focusItemCell(outboundItems.value.length - 1, cols[0]))
}

const findItemsTableFocus = () => {
  const active = document.activeElement as HTMLElement | null
  const cell = active?.closest('.items-detail-table td.el-table__cell') as HTMLElement | null
  const row = active?.closest('.items-detail-table tr.el-table__row') as HTMLElement | null
  if (!cell || !row) return null
  const tableEl = itemsTableRef.value?.$el as HTMLElement | undefined
  const rows = tableEl?.querySelectorAll('.el-table__body-wrapper tbody tr.el-table__row')
  const rowIndex = rows ? Array.from(rows).indexOf(row) : -1
  const colIndex = Array.from(row.querySelectorAll('td.el-table__cell')).indexOf(cell)
  const colKey = itemTableColumnKeys.value[colIndex]
  if (rowIndex < 0 || !colKey) return null
  return { row: rowIndex, colKey }
}

const handleItemsTableKeydown = (e: KeyboardEvent) => {
  if (handleItemSelectKeyboard(e)) return
  if (isItemDatePickerTarget(e.target)) return

  if (e.key === 'Enter') {
    const pos = findItemsTableFocus()
    if (!pos) return
    const row = outboundItems.value[pos.row]
    const advance = () => {
      e.preventDefault()
      e.stopPropagation()
      if (row && ['productCode', 'productName', 'spec', 'manufacturer'].includes(pos.colKey)) {
        handleItemProductSearch(row)
      }
      focusNextItemCell(pos.row, pos.colKey)
    }

    if (isDatePickerPanelOpen() && isItemDatePickerTarget(e.target)) {
      scheduleAfterDatePickerClose(advance)
      return
    }
    if (isDatePickerPanelOpen()) return

    if (isSelectDropdownOpen() && isItemSelectTarget(e.target)) {
      scheduleAfterSelectClose(advance)
      return
    }
    if (isSelectDropdownOpen()) return

    advance()
    return
  }

  const direction = arrowKeyToDirection(e.key)
  if (!direction) return
  if (!shouldNavigateOnArrow(e)) return
  if (!findItemsTableFocus() && !((e.target as HTMLElement).closest('.items-detail-table'))) return

  e.preventDefault()
  e.stopPropagation()
  navigateItemsTable(direction)
}

const generateOutboundNo = () => generateDocumentNo('sales_outbound')

const handleWarehouseChange = (warehouseName: string) => {
  form.value.warehouse = warehouseName
  const warehouse = warehouses.value.find(w => w.name === warehouseName)
  form.value.warehouseName = warehouse?.name || warehouseName
  outboundItems.value.forEach(item => {
    const validLoc = filteredLocations.value[0]
    if (validLoc) {
      item.locationCode = validLoc.code
      item.locationName = validLoc.name
    }
  })
}

const handleLocationChange = (item: OutboundItem, locationCode: string) => {
  const loc = locations.value.find(l => l.code === locationCode)
  if (loc) {
    item.locationCode = loc.code
    item.locationName = loc.name
  }
}

const handleSalesOrderChange = (orderNo: string) => {
  const order = salesOrderOptions.value.find(o => o.value === orderNo)
  if (order) {
    const customerFields = {
      customer: order.customer,
      customerCode: order.customerCode,
      contact: order.contact,
      phone: order.phone,
      address: order.receiveAddress
    }
    enrichCustomerFieldsFromMaster(customerFields)
    form.value.customer = customerFields.customer
    form.value.customerCode = customerFields.customerCode
    form.value.contact = customerFields.contact
    form.value.phone = customerFields.phone
    form.value.address = customerFields.address
    if (order.warehouse) {
      handleWarehouseChange(order.warehouse)
    } else {
      ensureOutboundWarehouseDefault()
    }

    const orders = JSON.parse(localStorage.getItem('sales-orders') || '[]') as Record<string, unknown>[]
    const fullOrder = orders.find(o =>
      String(o.id) === orderNo || String(o.orderNo) === orderNo
    )
    if (fullOrder && Array.isArray(fullOrder.detailItems) && fullOrder.detailItems.length > 0) {
      outboundItems.value = (fullOrder.detailItems as Record<string, unknown>[]).map(mapOrderItemToOutbound)
      nextItemId = Math.max(...outboundItems.value.map(i => i.id || 0), 0) + 1
      syncItemsTableLayout()
    }
  } else {
    form.value.customer = ''
    form.value.customerCode = ''
  }
}

const handleCustomerChange = (customerName: string) => {
  const customer = customerList.value.find(item => item.name === customerName)
  if (customer) {
    applyCustomerMasterToTarget(form.value, customer)
  }
}

const addItem = () => {
  outboundItems.value.push(createEmptyItemRow())
  syncItemsTableLayout()
}

const insertItemAfter = (index: number) => {
  outboundItems.value.splice(index + 1, 0, createEmptyItemRow())
  syncItemsTableLayout()
}

const handleBatchSelectionChange = (rows: ProductMaster[]) => {
  batchSelectedProducts.value = rows
}

const removeItem = (index: number) => {
  if (outboundItems.value.length <= 1) {
    ElMessage.warning('至少保留一行明细')
    return
  }
  outboundItems.value.splice(index, 1)
  syncItemsTableLayout()
}

const copyItem = (index: number) => {
  const source = outboundItems.value[index]
  outboundItems.value.splice(index + 1, 0, { ...source, id: nextItemId++ })
  syncItemsTableLayout()
}

const itemSummaryMethod = ({ columns, data }: { columns: any[]; data: OutboundItem[] }) => {
  const sums: string[] = []
  columns.forEach((col, index) => {
    if (index === 0) {
      sums[index] = '合计'
      return
    }
    if (col.property === 'quantity') {
      sums[index] = formatQty(data.reduce((sum, row) => sum + Number(row.quantity || 0), 0))
    } else if (col.property === 'amount') {
      sums[index] = formatMoney(data.reduce((sum, row) => sum + Number(row.amount || 0), 0))
    } else if (col.property === 'netAmount') {
      sums[index] = formatMoney(data.reduce((sum, row) => sum + Number(row.netAmount || 0), 0))
    } else {
      sums[index] = ''
    }
  })
  return sums
}

const getValidItems = () =>
  outboundItems.value.filter(item =>
    (String(item.productCode || '').trim() || String(item.productName || '').trim())
    && Number(item.quantity) > 0
  )

const runOutboundComplianceCheck = () => {
  const result = validateOutboundItems(getValidItems(), { blockExpired: true })
  return showComplianceResult(result)
}

const resolveDocStatus = () => {
  if (form.value.closeStatus === 'closed' || form.value.status === 'cancelled') return 'cancelled'
  if (form.value.auditStatus === '已审核') return 'completed'
  if (form.value.confirmStatus === CONFIRM_STATUS_CONFIRMED) return 'processing'
  return 'pending'
}

const buildRecordData = () => {
  const validItems = getValidItems()
  const amount = Number(totalNetAmount.value) || 0
  return {
    ...form.value,
    id: form.value.outboundNo,
    items: validItems,
    outboundItems: validItems,
    warehouse: form.value.warehouseName || form.value.warehouse,
    createDate: form.value.createDate || new Date().toISOString().slice(0, 10),
    creator: form.value.creator || '当前用户',
    operator: form.value.creator || '当前用户',
    date: String(form.value.outboundDate || form.value.createDate || new Date().toISOString().slice(0, 10)),
    itemCount: `${validItems.length}种`,
    totalQuantity: String(validItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)),
    amount: amount.toFixed(2),
    totalNetAmount: amount,
    status: resolveDocStatus(),
    closeStatus: form.value.closeStatus || 'notClosed'
  }
}

const validateForm = () => {
  if (!form.value.outboundNo) {
    ElMessage.warning('请填写出库单号')
    return false
  }
  if (!form.value.warehouse) {
    ElMessage.warning('请选择仓库')
    return false
  }
  if (!form.value.customer) {
    ElMessage.warning('请输入客户名称')
    return false
  }
  if (getValidItems().length === 0) {
    ElMessage.warning('请至少添加一行有效商品明细')
    return false
  }
  return true
}

const handleSave = (): boolean => {
  if (!validateForm()) return false

  const recordData = buildRecordData()
  const existingRecords = JSON.parse(localStorage.getItem(OUTBOUND_STORAGE_KEY) || '[]')
  const existingIndex = existingRecords.findIndex(
    (r: Record<string, unknown>) => r.outboundNo === form.value.outboundNo
  )

  if (existingIndex > -1) {
    existingRecords[existingIndex] = recordData
  } else {
    existingRecords.push(recordData)
  }

  localStorage.setItem(OUTBOUND_STORAGE_KEY, JSON.stringify(existingRecords))
  addOperationLog(
    form.value.outboundNo,
    existingIndex > -1 ? 'edit' : 'create',
    form.value.creator || '当前用户',
    existingIndex > -1 ? '编辑销售出库单' : '创建销售出库单'
  )
  ElMessage.success('销售出库单保存成功')
  return true
}

const resetFormForNew = () => {
  form.value = {
    outboundNo: generateOutboundNo(),
    warehouse: '',
    warehouseName: '',
    outboundDate: new Date().toISOString().slice(0, 10),
    deliveryDate: '',
    customer: '',
    customerCode: '',
    contact: '',
    phone: '',
    address: '',
    transport: '',
    freight: 0,
    remark: '',
    creator: '当前用户',
    createDate: new Date().toISOString().slice(0, 10),
    confirmStatus: CONFIRM_STATUS_UNCONFIRMED,
    auditStatus: '未审核',
    paymentStatus: '未收款',
    salesOrderNo: '',
    logisticsCompany: '',
    logisticsNo: '',
    deliveryStatus: '未发货',
    signStatus: '未签收',
    signPerson: '',
    signDate: '',
    logisticsStatus: '',
    status: 'pending',
    closeStatus: 'notClosed',
    auditor: '',
    auditTime: ''
  }
  outboundItems.value = []
  ensureOutboundWarehouseDefault()
  addItem()
}

const handleSaveAndNew = () => {
  if (!handleSave()) return
  resetFormForNew()
}

const handleSaveAndAudit = () => {
  if (!validateForm()) return
  if (form.value.auditStatus === '已审核') {
    ElMessage.info('出库单已审核')
    return
  }
  if (!handleSave()) return
  if (!autoConfirmSalesOutboundIfNeeded()) return
  handleAudit()
}

const handleAudit = async () => {
  if (!requireSalesOutboundConfirmed()) return
  if (form.value.auditStatus === '已审核') {
    ElMessage.info('出库单已审核')
    return
  }
  if (!runOutboundComplianceCheck()) return

  try {
    await ElMessageBox.confirm(
      '审核后将锁定单据明细，并可能触发平台协同入库，确定审核吗？',
      '审核确认',
      { confirmButtonText: '确定审核', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  form.value.auditStatus = '已审核'
  form.value.auditor = form.value.creator || '当前用户'
  form.value.auditTime = formatLocalDateTime()
  form.value.status = 'completed'
  getValidItems().forEach(item => {
    const traceKey = item.batchNo || item.productCode
    appendUdiTraceChain(traceKey, {
      nodeType: 'outbound',
      documentNo: form.value.outboundNo,
      udiCode: item.productCode,
      batchNo: item.batchNo,
      quantity: item.quantity,
      operator: form.value.creator,
      operatedAt: new Date().toLocaleString('zh-CN')
    })
  })
  handleSave()
  addOperationLog(form.value.outboundNo, 'audit', form.value.auditor, '审核销售出库单')

  const result = onSalesOutboundAudited({
    outboundNo: form.value.outboundNo,
    salesOrderNo: form.value.salesOrderNo,
    customer: form.value.customer,
    customerCode: form.value.customerCode,
    warehouse: form.value.warehouseName || form.value.warehouse,
    items: getValidItems(),
    outboundItems: getValidItems()
  })

  if (result.skipped) {
    ElMessage.success('出库单已审核')
  } else if (result.inbounds.length > 0) {
    ElMessage.success('出库单已审核，已自动生成对应采购入库单')
  } else {
    ElMessage.success('出库单已审核')
  }
}

const handleAuditToggle = () => {
  if (form.value.auditStatus === '已审核') {
    ElMessageBox.confirm('确定要反审核该出库单吗？', '反审核确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      form.value.auditStatus = '未审核'
      form.value.status = 'pending'
      form.value.auditor = ''
      form.value.auditTime = ''
      resetSalesOutboundConfirm()
      handleSave()
      addOperationLog(form.value.outboundNo, 'unaudit', form.value.creator || '当前用户', '反审核销售出库单')
      ElMessage.success('反审核成功')
    }).catch(() => {})
    return
  }
  handleAudit()
}

const handleDelivery = () => {
  if (form.value.auditStatus !== '已审核') {
    ElMessage.warning('请先审核出库单')
    return
  }
  const isSelfPickup = form.value.transport === 'self' || form.value.logisticsCompany === 'self'
  if (!isSelfPickup) {
    if (!form.value.logisticsCompany) {
      ElMessage.warning('请选择物流公司')
      return
    }
    if (!form.value.logisticsNo) {
      ElMessage.warning('请输入物流单号')
      return
    }
  }
  form.value.deliveryStatus = '已发货'
  form.value.logisticsStatus = isSelfPickup ? 'signed' : 'inTransit'
  form.value.deliveryDate = new Date().toISOString().slice(0, 10)
  if (isSelfPickup) {
    form.value.logisticsCompany = form.value.logisticsCompany || 'self'
  }
  handleSave()
  addOperationLog(form.value.outboundNo, 'delivery', form.value.creator || '当前用户', '销售出库单发货')
  ElMessage.success('出库单已发货，物流信息已更新')
}

const handleSign = () => {
  if (form.value.deliveryStatus !== '已发货') {
    ElMessage.warning('请先发货')
    return
  }
  if (form.value.signStatus === '已签收') {
    ElMessage.info('出库单已签收')
    return
  }

  ElMessageBox.prompt('请输入签收人姓名', '签收确认', {
    confirmButtonText: '确认签收',
    cancelButtonText: '取消'
  }).then(({ value }) => {
    if (!value) {
      ElMessage.warning('请输入签收人姓名')
      return
    }
    form.value.signStatus = '已签收'
    form.value.signPerson = value
    form.value.signDate = new Date().toISOString().slice(0, 10)
    handleSave()
    ElMessage.success('出库单已签收')
  }).catch(() => {
    ElMessage.info('已取消签收')
  })
}

const handleCancel = () => {
  router.push('/sales/outbound-record')
}

const buildPrintData = (): SalesOutboundData => {
  const company = getCompanyInfo()
  const salesDate = form.value.outboundDate || form.value.deliveryDate || new Date().toISOString().slice(0, 10)
  const storageFromItems = outboundItems.value.find(item => item.storageCondition)?.storageCondition
  return {
    companyName: company.name,
    companyAddress: company.address,
    companyPhone: company.phone,
    deliveryDate: form.value.deliveryDate || salesDate,
    salesDate,
    buyerName: form.value.customer,
    buyerAddress: form.value.address,
    buyerPhone: form.value.phone,
    documentNo: form.value.outboundNo || 'OUT-' + Date.now(),
    warehouseName: form.value.warehouseName || form.value.warehouse,
    receiver: form.value.contact,
    receiverPhone: form.value.phone,
    licenseNo: company.medicalDeviceLicense,
    salesperson: form.value.creator,
    shipAddress: company.address,
    receiveAddress: form.value.address,
    signPerson: form.value.signPerson,
    storageConditionText: storageFromItems || '常温：空气相对湿度不超过80%且无腐蚀物质清浊，通风良好。',
    items: outboundItems.value.map(item => ({
      productCode: item.productCode,
      bidType: item.bidType,
      productName: item.productName,
      spec: item.spec,
      manufacturer: item.manufacturer,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
      batchNo: item.batchNo,
      productionDate: item.mfgDate,
      expiryDate: item.expiryDate,
      registrationNo: item.registrationNo,
      productionLicenseNo: item.productionLicenseNo,
      storageCondition: item.storageCondition,
      sterilizationBatchNo: '/',
      auxiliaryQty: `${item.quantity}${item.unit || ''}`
    })),
    totalAmount: Number(totalNetAmount.value),
    qualityStatus: '合格'
  }
}

const runSalesOutboundPrint = (previewMode: boolean) => {
  if (outboundItems.value.length === 0) {
    ElMessage.warning('请先添加商品')
    return
  }
  try {
    printSalesOutbound(buildPrintData(), previewMode)
  } catch (error) {
    ElMessage.error((previewMode ? '预览' : '打印') + '失败：' + (error as Error).message)
  }
}

const handlePrint = () => {
  const settings = loadPrintSettings()
  runSalesOutboundPrint(settings.previewBeforePrint)
}

const handlePrintDirect = () => {
  runSalesOutboundPrint(false)
}

const handlePrintPreview = () => {
  runSalesOutboundPrint(true)
}

const handleMore = async (command: string) => {
  if (command === 'copy') {
    if (getValidItems().length === 0) {
      ElMessage.warning('请先添加有效商品明细后再复制')
      return
    }
    const newNo = generateOutboundNo()
    const copied = {
      ...buildRecordData(),
      outboundNo: newNo,
      id: newNo,
      confirmStatus: CONFIRM_STATUS_UNCONFIRMED,
      auditStatus: '未审核',
      status: 'pending',
      closeStatus: 'notClosed',
      auditor: '',
      auditTime: '',
      deliveryStatus: '未发货',
      signStatus: '未签收',
      signPerson: '',
      signDate: '',
      logisticsStatus: '',
      logisticsCompany: '',
      logisticsNo: '',
      createDate: new Date().toISOString().slice(0, 10),
      outboundDate: new Date().toISOString().slice(0, 10)
    }
    const records = JSON.parse(localStorage.getItem(OUTBOUND_STORAGE_KEY) || '[]')
    records.push(copied)
    localStorage.setItem(OUTBOUND_STORAGE_KEY, JSON.stringify(records))
    addOperationLog(newNo, 'copy', form.value.creator || '当前用户', `复制自 ${form.value.outboundNo}`)
    ElMessage.success('已复制为新出库单')
    router.push({ path: '/sales/outbound', query: { id: newNo } })
    return
  }

  if (command === 'close') {
    if (form.value.auditStatus === '已审核') {
      ElMessage.warning('已审核出库单请前往出库记录页关闭')
      return
    }
    try {
      await ElMessageBox.confirm('关闭后单据将作废，确定关闭吗？', '关闭确认', {
        confirmButtonText: '确定关闭',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch {
      return
    }
    form.value.closeStatus = 'closed'
    form.value.status = 'cancelled'
    handleSave()
    addOperationLog(form.value.outboundNo, 'close', form.value.creator || '当前用户', '关闭销售出库单')
    ElMessage.success('出库单已关闭')
    return
  }

  if (command === 'export') {
    if (!form.value.outboundNo) {
      ElMessage.warning('请先保存出库单')
      return
    }
    const payload = buildRecordData()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${form.value.outboundNo}.json`
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('出库单已导出')
    return
  }

  ElMessage.info('操作成功')
}

const mapOrderItemToOutbound = (item: Record<string, unknown>, idx: number): OutboundItem => {
  const defaultLoc = filteredLocations.value[0]
  const qty = Number(item.quantity) || 1
  const unitPrice = Number(item.price ?? item.unitPrice ?? 0)
  const amount = Number(item.amount ?? qty * unitPrice)
  const discount = Number(item.discount ?? 0)
  return {
    id: idx + 1,
    productCode: String(item.productCode || ''),
    productName: String(item.productName || ''),
    spec: String(item.spec || ''),
    unit: String(item.unit || ''),
    quantity: qty,
    unitPrice,
    amount,
    discount,
    netAmount: Number(item.netAmount ?? amount * (1 - discount / 100)),
    locationCode: defaultLoc?.code || '',
    locationName: defaultLoc?.name || '',
    remark: String(item.itemRemark ?? item.remark ?? ''),
    mfgDate: String(item.productionDate ?? item.mfgDate ?? ''),
    expiryDate: String(item.expiryDate || ''),
    batchNo: String(item.batchNo || ''),
    bidType: String(item.bidType || ''),
    manufacturer: String(item.manufacturer || ''),
    registrationNo: String(item.registrationNo || ''),
    productionLicenseNo: String(item.productionLicenseNo || ''),
    storageCondition: String(item.storageCondition || '')
  }
}

const loadOutboundRecord = (recordId: string) => {
  const records = JSON.parse(localStorage.getItem(OUTBOUND_STORAGE_KEY) || '[]')
  const record = records.find(
    (r: Record<string, unknown>) =>
      String(r.outboundNo) === recordId || String(r.id) === recordId
  )
  if (!record) return false

  Object.assign(form.value, record)
  enrichCustomerFieldsFromMaster(form.value)
  form.value.status = form.value.status || (form.value.auditStatus === '已审核' ? 'completed' : 'pending')
  form.value.closeStatus = form.value.closeStatus || 'notClosed'
  if (Array.isArray(record.items)) {
    outboundItems.value = record.items as OutboundItem[]
    nextItemId = Math.max(...outboundItems.value.map(i => i.id || 0), 0) + 1
  }
  return true
}

const loadSalesOrderReference = (orderId: string) => {
  const orders = JSON.parse(localStorage.getItem('sales-orders') || '[]')
  const order = orders.find(
    (o: Record<string, unknown>) => String(o.id) === orderId || String(o.orderNo) === orderId
  )
  if (!order) return

  form.value.salesOrderNo = String(order.id || order.orderNo || '')
  const customerFields = {
    customer: String(order.customer || ''),
    customerCode: String(order.customerCode || ''),
    contact: String(order.contact || ''),
    phone: String(order.phone || ''),
    address: String(order.receiveAddress || '')
  }
  enrichCustomerFieldsFromMaster(customerFields)
  form.value.customer = customerFields.customer
  form.value.customerCode = customerFields.customerCode
  form.value.contact = customerFields.contact
  form.value.phone = customerFields.phone
  form.value.address = customerFields.address
  if (order.warehouse) {
    handleWarehouseChange(String(order.warehouse))
  } else {
    ensureOutboundWarehouseDefault()
  }

  if (Array.isArray(order.detailItems) && order.detailItems.length > 0) {
    outboundItems.value = (order.detailItems as Record<string, unknown>[]).map(mapOrderItemToOutbound)
    nextItemId = Math.max(...outboundItems.value.map(i => i.id || 0), 0) + 1
  }
}

onMounted(() => {
  void (async () => {
    await Promise.all([loadWarehousesFromApi(), loadLocationsFromApi(), hydrateCustomerListFromServer()])
    customerList.value = loadActiveCustomerList()
    refreshWarehouseOptions()

    form.value.creator = form.value.creator || '当前用户'
    form.value.createDate = form.value.createDate || new Date().toISOString().slice(0, 10)
    form.value.outboundDate = form.value.outboundDate || new Date().toISOString().slice(0, 10)

    const recordId = route.query.id as string
    if (recordId) {
      if (!loadOutboundRecord(recordId)) {
        ElMessage.warning('未找到对应出库单')
      }
    } else {
      const orderId = route.query.orderId as string
      if (orderId) {
        loadSalesOrderReference(orderId)
      }
      if (!form.value.outboundNo) {
        form.value.outboundNo = generateOutboundNo()
      }
    }

    ensureOutboundWarehouseDefault()

    if (outboundItems.value.length === 0) {
      addItem()
    }

    nextTick(() => {
      bindItemsTableResizeObserver()
      syncItemsTableLayout()
    })
  })()

  window.addEventListener('resize', debouncedSyncItemsTableLayout)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', debouncedSyncItemsTableLayout)
  unbindItemsTableScrollSync()
  unbindItemsTableResizeObserver()
})

watch(() => outboundItems.value.length, syncItemsTableLayout)
watch(itemsCollapsed, (collapsed) => {
  if (!collapsed) {
    nextTick(() => {
      bindItemsTableResizeObserver()
      syncItemsTableLayout()
    })
  }
})
watch(sortedVisibleItemColumns, syncItemsTableLayout, { deep: true })
watch(itemColumnWidths, syncItemsTableLayout, { deep: true })
watch(itemsTableTotalWidth, syncItemsTableLayout)
watch(() => form.value.warehouse, syncItemsTableLayout)
</script>

<template>
  <div class="erp-page">
    <div v-if="form.auditStatus === '已审核'" class="audit-seal" aria-hidden="true">
      <div class="audit-seal-frame">
        <span class="audit-seal-text">已审核</span>
      </div>
    </div>

    <div class="page-title-bar">
      <div class="title-left">
        <h2>销售出库单</h2>
        <div class="status-badges">
          <div v-if="salesOutboundConfirmEnabled" class="audit-badge">
            <el-tag :type="confirmStatusTagType" effect="plain" size="small">
              {{ form.confirmStatus || CONFIRM_STATUS_UNCONFIRMED }}
            </el-tag>
          </div>
          <div v-if="form.auditStatus === '已审核'" class="audit-badge">
            <el-tag type="danger" effect="plain" size="small" class="audit-tag-seal">已审核</el-tag>
          </div>
        </div>
      </div>
      <div class="title-actions">
        <el-button type="primary" size="small" @click="handleSave">保存</el-button>
        <el-button
          type="primary"
          size="small"
          plain
          :disabled="form.auditStatus === '已审核'"
          @click="handleSaveAndAudit"
        >保存并审核</el-button>
        <el-button type="primary" size="small" plain @click="handleSaveAndNew">保存并新增</el-button>
        <el-button
          v-if="canConfirmSalesOutbound"
          size="small"
          type="success"
          @click="handleConfirm"
        >确定</el-button>
        <el-button
          size="small"
          :type="form.auditStatus === '已审核' ? 'warning' : 'success'"
          @click="handleAuditToggle"
        >{{ form.auditStatus === '已审核' ? '反审核' : '审核' }}</el-button>
        <el-button
          v-if="form.auditStatus === '已审核' && form.deliveryStatus === '未发货'"
          size="small"
          type="primary"
          @click="handleDelivery"
        >发货</el-button>
        <el-button
          v-if="form.deliveryStatus === '已发货' && form.signStatus === '未签收'"
          size="small"
          type="primary"
          @click="handleSign"
        >签收</el-button>
        <el-dropdown split-button type="primary" size="small" class="btn-print" @click="handlePrint">
          打印
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handlePrintPreview">打印预览</el-dropdown-item>
              <el-dropdown-item @click="handlePrintDirect">直接打印</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown @command="handleMore" size="small">
          <el-button size="small">
            更多
            <el-icon class="el-icon--right"><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="copy">复制单据</el-dropdown-item>
              <el-dropdown-item command="export">导出</el-dropdown-item>
              <el-dropdown-item command="close">关闭出库单</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <div class="nav-actions">
          <el-button size="small" :icon="DArrowLeft" circle disabled title="首张" />
          <el-button size="small" :icon="ArrowLeft" circle @click="handleCancel" title="返回列表" />
          <el-button size="small" :icon="ArrowRight" circle disabled title="下一张" />
          <el-button size="small" :icon="DArrowRight" circle disabled title="末张" />
        </div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header" @click="basicInfoCollapsed = !basicInfoCollapsed">
        <span class="section-icon" :class="{ collapsed: basicInfoCollapsed }">▼</span>
        <h3>基本信息</h3>
        <div class="section-actions" @click.stop>
          <el-button size="small" @click="openHeaderSettings">
            <el-icon><Setting /></el-icon> 表头设置
          </el-button>
        </div>
      </div>
      <div class="section-body" v-show="!basicInfoCollapsed" @keydown.capture="handleBasicInfoArrowKeydown">
        <div v-if="sortedVisibleFields.length === 0" class="header-empty-tip">请点击「表头设置」选择要显示的字段</div>
        <div v-else class="form-grid basic-info-grid">
          <template v-for="field in sortedVisibleFields" :key="field.key">
            <div
              :data-field-key="field.key"
              :class="[
                'form-field',
                {
                  required: field.required,
                  'system-field': field.disabled,
                  'full-width': field.fullWidth,
                  'span-2': field.span2
                }
              ]"
              @keydown.enter.capture="handleFieldEnterCapture(field, $event)"
            >
              <label>{{ field.label }}</label>

              <el-select
                v-if="field.key === 'salesOrderNo'"
                v-model="form.salesOrderNo"
                filterable
                default-first-option
                placeholder="请选择销售订单"
                size="small"
                style="width: 100%;"
                clearable
                :disabled="!isFieldEditable(field)"
                @change="handleSalesOrderChange"
              >
                <el-option v-for="opt in salesOrderOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>

              <el-select
                v-else-if="field.key === 'warehouse'"
                v-model="form.warehouse"
                default-first-option
                placeholder="请选择仓库"
                size="small"
                style="width: 100%;"
                :disabled="!isFieldEditable(field)"
                @change="handleWarehouseChange"
              >
                <el-option v-for="w in warehouseOptions" :key="w.value" :label="w.label" :value="w.value" />
              </el-select>

              <el-select
                v-else-if="field.key === 'customer'"
                v-model="form.customer"
                filterable
                default-first-option
                placeholder="请选择客户"
                size="small"
                style="width: 100%;"
                :disabled="!isFieldEditable(field)"
                @change="handleCustomerChange"
              >
                <el-option v-for="c in customerList" :key="c.id" :label="c.name" :value="c.name" />
              </el-select>

              <el-tag
                v-else-if="field.type === 'status'"
                :type="getStatusTagType(field.key, String(form[field.key as keyof typeof form] || ''))"
                size="small"
              >{{ form[field.key as keyof typeof form] }}</el-tag>

              <el-input
                v-else-if="field.type === 'input'"
                v-model="form[field.key as keyof typeof form]"
                :maxlength="field.maxLength"
                size="small"
                :disabled="!isFieldEditable(field)"
              />

              <el-select
                v-else-if="field.type === 'select'"
                v-model="form[field.key as keyof typeof form]"
                default-first-option
                size="small"
                style="width: 100%;"
                clearable
                :disabled="!isFieldEditable(field)"
              >
                <el-option
                  v-for="opt in getOptions(field.options)"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>

              <el-date-picker
                v-else-if="field.type === 'date'"
                v-model="form[field.key as keyof typeof form]"
                type="date"
                value-format="YYYY-MM-DD"
                size="small"
                style="width: 100%;"
                :disabled="!isFieldEditable(field)"
              />

              <el-input-number
                v-else-if="field.type === 'number'"
                v-model="form[field.key as keyof typeof form]"
                :min="field.min"
                :max="field.max"
                :precision="field.precision"
                :controls="false"
                size="small"
                style="width: 100%;"
                :disabled="!isFieldEditable(field)"
              />

              <el-input
                v-else-if="field.type === 'textarea'"
                v-model="form[field.key as keyof typeof form]"
                type="textarea"
                :rows="2"
                size="small"
                :disabled="!isFieldEditable(field)"
              />
            </div>
          </template>
        </div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header" @click="itemsCollapsed = !itemsCollapsed">
        <span class="section-icon" :class="{ collapsed: itemsCollapsed }">▼</span>
        <h3>商品信息</h3>
        <div class="section-actions" @click.stop>
          <el-button size="small" @click="openItemColumnSettings">
            <el-icon><Setting /></el-icon> 商品信息设置
          </el-button>
        </div>
      </div>
      <div class="section-body items-section" v-show="!itemsCollapsed">
        <div class="items-toolbar">
          <p class="product-query-hint">商品查询：编码、名称、规格、厂家，空格隔开，不限顺序。</p>
          <BatchNoFormatPicker
            v-model="batchNoFormat"
            :disabled="!isEditable"
            @change="handleBatchNoFormatChange"
          />
          <div class="toolbar-right">
            <el-button size="small" plain :disabled="!isEditable" @click="openBatchAdd">批量选择</el-button>
            <el-button size="small" plain :disabled="!isEditable" @click="addItem">添加行</el-button>
          </div>
        </div>

        <div ref="itemsTableWrapRef" class="items-table-wrap" @keydown.capture="handleItemsTableKeydown">
          <div v-if="sortedVisibleItemColumns.length === 0" class="header-empty-tip">请点击「商品信息设置」选择要显示的列</div>
          <el-table
            v-else
            :key="itemsTableRenderKey"
            ref="itemsTableRef"
            :data="outboundItems"
            border
            :fit="false"
            class="items-detail-table"
            show-summary
            :summary-method="itemSummaryMethod"
            @header-dragend="handleItemsHeaderDragend"
          >
            <el-table-column
              label="行号"
              :width="getItemColumnWidth('index')"
              align="center"
              header-align="center"
              class-name="row-index-column"
            >
              <template #default="{ $index }">
                <div class="row-index-cell">
                  <span class="row-index-num">{{ $index + 1 }}</span>
                  <div v-if="isEditable" class="row-index-actions">
                    <button type="button" class="row-action-btn is-add" title="插入行" @click.stop="insertItemAfter($index)">
                      <el-icon><Plus /></el-icon>
                    </button>
                    <button type="button" class="row-action-btn is-remove" title="删除行" @click.stop="removeItem($index)">
                      <el-icon><Minus /></el-icon>
                    </button>
                    <button type="button" class="row-action-btn is-copy" title="复制行" @click.stop="copyItem($index)">
                      <el-icon><CopyDocument /></el-icon>
                    </button>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column
              v-for="col in sortedVisibleItemColumns"
              :key="col.key"
              :label="col.label"
              :prop="col.prop"
              :width="getItemColumnWidth(col.key)"
              :align="col.align"
              header-align="center"
            >
              <template v-if="col.required" #header>
                <span class="required-col">{{ col.label }}</span>
              </template>
              <template #default="{ row }">
                <div v-if="col.key === 'productCode'" class="code-cell">
                  <el-autocomplete
                    v-model="row.productCode"
                    :ref="(el: any) => setProductAutocompleteRef(row, 'productCode', el)"
                    size="small"
                    class="product-code-autocomplete"
                    placeholder="编码 名称 规格 厂家"
                    popper-class="product-suggest-popper"
                    :debounce="150"
                    :trigger-on-focus="false"
                    highlight-first-item
                    :disabled="!isEditable"
                    :fetch-suggestions="(_q, cb) => fetchItemProductSuggestions(row, cb)"
                    @select="(item: ItemProductSuggestion) => handleItemProductSuggestionSelect(row, item)"
                    @blur="handleItemProductBlur(row)"
                    @input="clearProductLock(row)"
                  >
                    <template #header>
                      <div class="product-suggest-item is-header">
                        <span class="col-code">商品编码</span>
                        <span class="col-name">商品名称</span>
                        <span class="col-spec">规格型号</span>
                        <span class="col-mfr">生产厂家</span>
                        <span class="col-price is-num">单价</span>
                        <span class="col-source">来源</span>
                      </div>
                    </template>
                    <template #default="{ item: suggestion }">
                      <div class="product-suggest-item">
                        <span class="col-code s-code">{{ suggestion.code }}</span>
                        <span class="col-name s-name" :title="suggestion.name">{{ suggestion.name }}</span>
                        <span class="col-spec s-spec" :title="suggestion.spec">{{ suggestion.spec || '-' }}</span>
                        <span class="col-mfr s-mfr" :title="suggestion.manufacturer">{{ suggestion.manufacturer || '-' }}</span>
                        <span class="col-price s-last-price is-num">{{ formatMoney(suggestion.lastPrice) }}</span>
                        <span class="col-source">{{ suggestion.source === 'platform' ? '平台' : '本地' }}</span>
                      </div>
                    </template>
                  </el-autocomplete>
                  <el-button v-if="isEditable" link type="primary" size="small" class="select-btn" @click="openBatchAdd">选择</el-button>
                </div>
                <el-autocomplete
                  v-else-if="col.key === 'productName'"
                  v-model="row.productName"
                  :ref="(el: any) => setProductAutocompleteRef(row, 'productName', el)"
                  size="small"
                  class="product-field-autocomplete"
                  popper-class="product-suggest-popper"
                  :debounce="150"
                  :trigger-on-focus="false"
                  highlight-first-item
                  :disabled="!isEditable"
                  :fetch-suggestions="(_q, cb) => fetchItemProductSuggestions(row, cb)"
                  @select="(item: ItemProductSuggestion) => handleItemProductSuggestionSelect(row, item)"
                  @blur="handleItemProductBlur(row)"
                  @input="clearProductLock(row)"
                >
                  <template #header>
                    <div class="product-suggest-item is-header">
                      <span class="col-code">商品编码</span>
                      <span class="col-name">商品名称</span>
                      <span class="col-spec">规格型号</span>
                      <span class="col-mfr">生产厂家</span>
                      <span class="col-price is-num">单价</span>
                      <span class="col-source">来源</span>
                    </div>
                  </template>
                  <template #default="{ item: suggestion }">
                    <div class="product-suggest-item">
                      <span class="col-code s-code">{{ suggestion.code }}</span>
                      <span class="col-name s-name" :title="suggestion.name">{{ suggestion.name }}</span>
                      <span class="col-spec s-spec" :title="suggestion.spec">{{ suggestion.spec || '-' }}</span>
                      <span class="col-mfr s-mfr" :title="suggestion.manufacturer">{{ suggestion.manufacturer || '-' }}</span>
                      <span class="col-price s-last-price is-num">{{ formatMoney(suggestion.lastPrice) }}</span>
                      <span class="col-source">{{ suggestion.source === 'platform' ? '平台' : '本地' }}</span>
                    </div>
                  </template>
                </el-autocomplete>
                <el-autocomplete
                  v-else-if="col.key === 'spec'"
                  v-model="row.spec"
                  :ref="(el: any) => setProductAutocompleteRef(row, 'spec', el)"
                  size="small"
                  class="product-field-autocomplete"
                  popper-class="product-suggest-popper"
                  :debounce="150"
                  :trigger-on-focus="false"
                  highlight-first-item
                  :disabled="!isEditable"
                  :fetch-suggestions="(_q, cb) => fetchItemProductSuggestions(row, cb)"
                  @select="(item: ItemProductSuggestion) => handleItemProductSuggestionSelect(row, item)"
                  @blur="handleItemProductBlur(row)"
                  @input="clearProductLock(row)"
                >
                  <template #header>
                    <div class="product-suggest-item is-header">
                      <span class="col-code">商品编码</span>
                      <span class="col-name">商品名称</span>
                      <span class="col-spec">规格型号</span>
                      <span class="col-mfr">生产厂家</span>
                      <span class="col-price is-num">单价</span>
                      <span class="col-source">来源</span>
                    </div>
                  </template>
                  <template #default="{ item: suggestion }">
                    <div class="product-suggest-item">
                      <span class="col-code s-code">{{ suggestion.code }}</span>
                      <span class="col-name s-name" :title="suggestion.name">{{ suggestion.name }}</span>
                      <span class="col-spec s-spec" :title="suggestion.spec">{{ suggestion.spec || '-' }}</span>
                      <span class="col-mfr s-mfr" :title="suggestion.manufacturer">{{ suggestion.manufacturer || '-' }}</span>
                      <span class="col-price s-last-price is-num">{{ formatMoney(suggestion.lastPrice) }}</span>
                      <span class="col-source">{{ suggestion.source === 'platform' ? '平台' : '本地' }}</span>
                    </div>
                  </template>
                </el-autocomplete>
                <el-autocomplete
                  v-else-if="col.key === 'manufacturer'"
                  v-model="row.manufacturer"
                  :ref="(el: any) => setProductAutocompleteRef(row, 'manufacturer', el)"
                  size="small"
                  class="product-field-autocomplete"
                  popper-class="product-suggest-popper"
                  :debounce="150"
                  :trigger-on-focus="false"
                  highlight-first-item
                  :disabled="!isEditable"
                  :fetch-suggestions="(_q, cb) => fetchItemProductSuggestions(row, cb)"
                  @select="(item: ItemProductSuggestion) => handleItemProductSuggestionSelect(row, item)"
                  @blur="handleItemProductBlur(row)"
                  @input="clearProductLock(row)"
                >
                  <template #header>
                    <div class="product-suggest-item is-header">
                      <span class="col-code">商品编码</span>
                      <span class="col-name">商品名称</span>
                      <span class="col-spec">规格型号</span>
                      <span class="col-mfr">生产厂家</span>
                      <span class="col-price is-num">单价</span>
                      <span class="col-source">来源</span>
                    </div>
                  </template>
                  <template #default="{ item: suggestion }">
                    <div class="product-suggest-item">
                      <span class="col-code s-code">{{ suggestion.code }}</span>
                      <span class="col-name s-name" :title="suggestion.name">{{ suggestion.name }}</span>
                      <span class="col-spec s-spec" :title="suggestion.spec">{{ suggestion.spec || '-' }}</span>
                      <span class="col-mfr s-mfr" :title="suggestion.manufacturer">{{ suggestion.manufacturer || '-' }}</span>
                      <span class="col-price s-last-price is-num">{{ formatMoney(suggestion.lastPrice) }}</span>
                      <span class="col-source">{{ suggestion.source === 'platform' ? '平台' : '本地' }}</span>
                    </div>
                  </template>
                </el-autocomplete>
                <el-input v-else-if="col.key === 'registrationNo'" v-model="row.registrationNo" size="small" :disabled="!isEditable" />
                <el-input v-else-if="col.key === 'productionLicenseNo'" v-model="row.productionLicenseNo" size="small" :disabled="!isEditable" />
                <el-input-number
                  v-else-if="col.key === 'quantity'"
                  v-model="row.quantity"
                  :min="0"
                  :precision="3"
                  :controls="false"
                  size="small"
                  class="cell-number"
                  :disabled="!isEditable"
                  @change="calcRowAmount(row)"
                />
                <el-input v-else-if="col.key === 'unit'" v-model="row.unit" size="small" :disabled="!isEditable" />
                <el-input-number
                  v-else-if="col.key === 'unitPrice'"
                  v-model="row.unitPrice"
                  :min="0"
                  :precision="4"
                  :controls="false"
                  size="small"
                  class="cell-number"
                  :disabled="!isEditable"
                  @change="calcRowAmount(row)"
                />
                <span v-else-if="col.key === 'amount'" class="amount-text">{{ formatMoney(row.amount) }}</span>
                <el-input-number
                  v-else-if="col.key === 'discount'"
                  v-model="row.discount"
                  :min="0"
                  :max="100"
                  :precision="2"
                  :controls="false"
                  size="small"
                  class="cell-number"
                  :disabled="!isEditable"
                  @change="calcRowAmount(row)"
                />
                <span v-else-if="col.key === 'netAmount'" class="amount-text">{{ formatMoney(row.netAmount) }}</span>
                <BatchNoCell
                  v-else-if="col.key === 'batchNo'"
                  :row="row"
                  :global-format="batchNoFormat"
                  :disabled="!isEditable"
                  @format-change="handleProductionDateChange(row)"
                  @batch-input="handleBatchNoInput(row)"
                />
                <div
                  v-else-if="col.key === 'mfgDate'"
                  class="cell-date-wrap"
                  @keydown.capture="(e: KeyboardEvent) => handleItemDateKeydown(e, row, 'mfgDate')"
                >
                  <el-date-picker
                    v-model="row.mfgDate"
                    type="date"
                    value-format="YYYY-MM-DD"
                    size="small"
                    class="cell-date"
                    :disabled="!isEditable"
                    @change="handleProductionDateChange(row)"
                  />
                </div>
                <div
                  v-else-if="col.key === 'expiryDate'"
                  class="cell-date-wrap"
                  @keydown.capture="(e: KeyboardEvent) => handleItemDateKeydown(e, row, 'expiryDate')"
                >
                  <el-date-picker
                    v-model="row.expiryDate"
                    type="date"
                    value-format="YYYY-MM-DD"
                    size="small"
                    class="cell-date"
                    clearable
                    :disabled="!isEditable"
                    @change="handleExpiryDateChange(row)"
                  />
                </div>
                <el-input v-else-if="col.key === 'storageCondition'" v-model="row.storageCondition" size="small" :disabled="!isEditable" />
                <el-input v-else-if="col.key === 'bidType'" v-model="row.bidType" size="small" :disabled="!isEditable" />
                <el-select
                  v-else-if="col.key === 'locationName'"
                  v-model="row.locationCode"
                  default-first-option
                  size="small"
                  :disabled="!isEditable"
                  @change="handleLocationChange(row, row.locationCode)"
                  @keydown.enter.capture="(e: KeyboardEvent) => handleItemSelectEnterKeydown(e, $index, 'locationName')"
                >
                  <el-option v-for="loc in filteredLocations" :key="loc.id" :label="loc.name" :value="loc.code" />
                </el-select>
                <el-input
                  v-else-if="col.key === 'remark'"
                  v-model="row.remark"
                  size="small"
                  maxlength="200"
                  :disabled="!isEditable"
                />
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div class="summary-bar items-summary-bar">
          <div class="summary-left">
            <span>数量合计：<strong>{{ formatQty(totalQuantity) }}</strong></span>
            <span>商品金额：<strong>{{ formatMoney(totalAmount) }}</strong></span>
            <span>折扣：<strong>-{{ formatMoney(totalDiscount) }}</strong></span>
            <span>运费：<strong>{{ formatMoney(form.freight) }}</strong></span>
          </div>
          <div class="summary-right">
            合计金额：<strong class="highlight-amount">{{ formatMoney(totalNetAmount) }}</strong>
          </div>
        </div>
      </div>
    </div>
  </div>

  <el-dialog v-model="showBatchAdd" title="批量添加商品" width="800px" draggable>
    <div class="batch-add-dialog">
      <div class="batch-search">
        <el-input v-model="batchSearchQuery" placeholder="搜索商品编码、名称、规格" clearable />
      </div>
      <el-table
        :data="filteredBatchProducts"
        border
        max-height="360"
        @selection-change="handleBatchSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="code" label="商品编码" width="120" />
        <el-table-column prop="name" label="商品名称" min-width="160" />
        <el-table-column prop="spec" label="规格型号" width="120" />
        <el-table-column prop="manufacturer" label="生产厂家" min-width="140" />
      </el-table>
    </div>
    <template #footer>
      <el-button @click="showBatchAdd = false">取消</el-button>
      <el-button type="primary" @click="confirmBatchAdd">确定添加</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="showFieldSelector" title="表头设置" width="720px" draggable>
    <div class="field-selector">
      <p class="sort-tip">勾选需要在基本信息区显示的字段，拖拽可调整顺序</p>
      <el-checkbox-group v-model="selectedFields">
        <el-row :gutter="10">
          <el-col :span="8" v-for="(field, index) in fieldOptions" :key="field.key">
            <div
              class="field-item"
              draggable="true"
              @dragstart="(e) => handleDragStart(e, index)"
              @dragover="handleDragOver"
              @drop="(e) => handleDrop(e, index)"
            >
              <span class="field-order">{{ index + 1 }}.</span>
              <el-checkbox :label="field.key">{{ field.label }}</el-checkbox>
            </div>
          </el-col>
        </el-row>
      </el-checkbox-group>
    </div>
    <template #footer>
      <el-button @click="showFieldSelector = false">取消</el-button>
      <el-button type="primary" @click="confirmFieldSelection">确定</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="showItemColumnSelector" title="商品信息设置" width="720px" draggable>
    <div class="field-selector">
      <p class="sort-tip">勾选需要在商品明细中显示的列，拖拽可调整顺序</p>
      <el-checkbox-group v-model="selectedItemColumns">
        <el-row :gutter="10">
          <el-col :span="8" v-for="(col, index) in itemColumnOptions" :key="col.key">
            <div
              class="field-item"
              draggable="true"
              @dragstart="(e) => handleItemDragStart(e, index)"
              @dragover="handleItemDragOver"
              @drop="(e) => handleItemDrop(e, index)"
            >
              <span class="field-order">{{ index + 1 }}.</span>
              <el-checkbox :label="col.key">{{ col.label }}</el-checkbox>
            </div>
          </el-col>
        </el-row>
      </el-checkbox-group>
    </div>
    <template #footer>
      <el-button @click="showItemColumnSelector = false">取消</el-button>
      <el-button type="primary" @click="confirmItemColumnSelection">确定</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.erp-page {
  position: relative;
  padding: 0;
  background-color: #f0f2f5;
  min-height: calc(100vh - 60px);
  outline: none;
}

.audit-seal {
  position: absolute;
  top: 128px;
  right: 64px;
  transform: rotate(-10deg);
  pointer-events: none;
  z-index: 20;
  user-select: none;

  .audit-seal-frame {
    min-width: 84px;
    height: 38px;
    padding: 0 12px;
    border: 2px solid #d32f2f;
    border-radius: 2px;
    background: rgba(211, 47, 47, 0.04);
    box-shadow:
      inset 0 0 0 1px rgba(211, 47, 47, 0.4),
      0 1px 4px rgba(211, 47, 47, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      inset: 4px;
      border: 1px solid rgba(211, 47, 47, 0.45);
      border-radius: 1px;
      pointer-events: none;
    }
  }

  .audit-seal-text {
    color: #c62828;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 4px;
    line-height: 1;
    white-space: nowrap;
    font-family: 'SimSun', 'STSong', 'Songti SC', serif;
    opacity: 0.9;
  }
}

.page-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;

  .title-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  h2 {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0;
  }

  .status-badges {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .audit-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    .audit-tag-seal {
      border-color: #d32f2f;
      color: #c62828;
      background: rgba(211, 47, 47, 0.06);
      font-weight: 600;
    }

    .audit-meta {
      font-size: 12px;
      color: #c62828;
    }
  }

  .title-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .nav-actions {
    display: flex;
    gap: 4px;
    margin-left: 8px;
    padding-left: 8px;
    border-left: 1px solid #e8e8e8;
  }

  :deep(.btn-print) {
    .el-button-group .el-button--primary {
      background: #722ed1;
      border-color: #722ed1;

      &:hover {
        background: #531dab;
        border-color: #531dab;
      }
    }
  }
}

.section-card {
  background: #fff;
  margin: 8px 16px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  user-select: none;

  .section-icon {
    font-size: 10px;
    color: #999;
    margin-right: 8px;
    transition: transform 0.2s;

    &.collapsed {
      transform: rotate(-90deg);
    }
  }

  h3 {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin: 0;
  }

  .section-actions {
    margin-left: auto;
    display: flex;
    gap: 6px;
  }
}

.section-body {
  padding: 16px;

  &.items-section {
    padding: 0;
  }

  .header-empty-tip {
    color: #999;
    font-size: 13px;
    padding: 8px 0;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 24px;

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 4px;

    &.span-2 {
      grid-column: span 2;
    }

    &.full-width {
      grid-column: 1 / -1;
    }

    &.required label::after {
      content: '*';
      color: #f53f3f;
      margin-left: 2px;
    }

    label {
      font-size: 12px;
      color: #666;
    }

    :deep(.el-input),
    :deep(.el-select),
    :deep(.el-textarea) {
      border: none !important;
    }

    :deep(.el-input__wrapper),
    :deep(.el-select__wrapper) {
      box-shadow: 0 1px 0 0 #e4e7ed !important;
      border: none !important;
      background: transparent;
      border-radius: 0;
      padding: 1px 0 4px 0 !important;
      height: 28px !important;
    }

    :deep(.el-textarea__inner) {
      box-shadow: 0 1px 0 0 #e4e7ed !important;
      border: none !important;
      border-radius: 0;
      padding: 4px 0;
    }
  }
}

.batch-cell-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.items-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  flex-wrap: wrap;

  .product-query-hint {
    margin: 0;
    color: #1890ff;
    font-size: 13px;
    line-height: 1.5;
  }

  .toolbar-right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.quick-add-bar {
  display: none;
}

.summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;

  &.items-summary-bar {
    background: #fffbe6;
    border-top: 1px solid #ffe58f;

    .highlight-amount {
      color: #d48806;
      font-size: 15px;
    }
  }

  .summary-left {
    display: flex;
    gap: 24px;
    font-size: 13px;
    color: #666;
    flex-wrap: wrap;

    strong {
      color: #333;
      font-weight: 600;
    }
  }

  .summary-right {
    font-size: 13px;
    color: #666;
  }
}

.items-table-wrap {
  overflow: hidden;
  padding: 0;
  width: 100%;

  .header-empty-tip {
    color: #999;
    font-size: 13px;
    padding: 16px;
  }

  :deep(.items-detail-table.el-table) {
    --table-line-color: #d9d9d9;
    --table-row-odd-bg: #f0f7ff;
    --table-row-even-bg: #f5f5f5;
    --table-row-hover-bg: #fff3cd;
    --table-header-bg: #f5f5f5;
    --el-table-border-color: #d9d9d9;
    --el-border-color-lighter: #d9d9d9;

    border: 1px solid var(--table-line-color);

    .el-table__header-wrapper,
    .el-table__body-wrapper,
    .el-table__footer-wrapper {
      width: 100% !important;
    }

    .el-table__header-wrapper {
      overflow: hidden !important;
    }

    .el-table__body-wrapper {
      overflow-x: auto !important;
    }

    .el-table__header-wrapper table,
    .el-table__body-wrapper table,
    .el-table__footer-wrapper table {
      table-layout: fixed !important;
    }

    .el-table__body-wrapper .el-table__row > td.el-table__cell:last-child,
    .el-table__footer-wrapper .el-table__row > td.el-table__cell:last-child,
    .el-table__header-wrapper .el-table__row > th.el-table__cell:last-child {
      width: inherit !important;
      min-width: 0 !important;
      max-width: none !important;
    }

    td.row-index-column.el-table__cell,
    th.row-index-column.el-table__cell {
      overflow: visible !important;

      .cell {
        overflow: visible !important;
      }
    }

    .row-index-cell {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 28px;

      .row-index-num {
        line-height: 22px;
        color: #333;
        font-size: 13px;
        font-weight: 600;
        transition: opacity 0.15s ease;
      }

      .row-index-actions {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        display: none;
        align-items: center;
        gap: 4px;
        padding: 5px 6px;
        background: linear-gradient(180deg, #fff 0%, #eef4ff 100%);
        border: 1px solid #91caff;
        border-radius: 6px;
        box-shadow: 0 6px 16px rgba(22, 93, 255, 0.18);
        z-index: 12;
      }

      .row-action-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        border-radius: 4px;
        border: 1px solid transparent;
        cursor: pointer;

        &.is-add {
          color: #1677ff;
          background: #e6f4ff;
          border-color: #91caff;
        }

        &.is-remove {
          color: #f53f3f;
          background: #ffece8;
          border-color: #ffccc7;
        }

        &.is-copy {
          color: #00b578;
          background: #e8fff3;
          border-color: #7be0a8;
        }
      }
    }

    .el-table__body-wrapper .el-table__row:hover > td.row-index-column,
    .el-table__body-wrapper .el-table__row.hover-row > td.row-index-column {
      .row-index-num {
        opacity: 0;
      }

      .row-index-actions {
        display: inline-flex;
      }
    }

    .el-table__inner-wrapper::before,
    .el-table__border-left-patch,
    .el-table__border-right-patch,
    .el-table__border-bottom-patch {
      background-color: var(--table-line-color);
    }

    th.el-table__cell,
    td.el-table__cell {
      border-color: var(--table-line-color) !important;
      border-right: 1px solid var(--table-line-color);
      border-bottom: 1px solid var(--table-line-color);
      padding: 6px 8px;
      vertical-align: middle;
    }

    th.el-table__cell .cell,
    td.el-table__cell .cell {
      padding: 0;
      line-height: 22px;
    }

    .el-table__header-wrapper th.el-table__cell {
      background: var(--table-header-bg) !important;
      color: #333;
      font-weight: 600;
      font-size: 13px;
      text-align: center;
    }

    .el-table__header-wrapper th.el-table__cell .cell {
      text-align: center;
      justify-content: center;
    }

    .el-table__header-wrapper th.el-table__cell.is-right,
    .el-table__body-wrapper td.el-table__cell.is-right,
    .el-table__footer-wrapper td.el-table__cell.is-right {
      text-align: right;
    }

    .el-table__body-wrapper td.el-table__cell.is-right .cell,
    .el-table__footer-wrapper td.el-table__cell.is-right .cell {
      text-align: right;
    }

    .el-table__header-wrapper th.el-table__cell.is-right {
      text-align: right;
    }

    .el-table__header-wrapper th.el-table__cell.is-right .cell {
      text-align: right;
      justify-content: flex-end;
    }

    .el-table__body-wrapper td.el-table__cell.is-center,
    .el-table__footer-wrapper td.el-table__cell.is-center {
      text-align: center;
    }

    .el-table__body-wrapper td.el-table__cell.is-center .cell {
      text-align: center;
    }

    .el-table__body-wrapper td.el-table__cell.is-center {
      .el-input__inner {
        text-align: center;
      }

      .el-date-editor .el-input__inner {
        text-align: center;
      }
    }

    .el-table__footer-wrapper td.el-table__cell.is-center .cell {
      text-align: center;
    }

    .el-table__header-wrapper th.el-table__cell.is-left,
    .el-table__body-wrapper td.el-table__cell.is-left,
    .el-table__footer-wrapper td.el-table__cell.is-left {
      text-align: left;
    }

    .el-table__body-wrapper tr:nth-child(odd) > td.el-table__cell {
      background-color: var(--table-row-odd-bg) !important;
    }

    .el-table__body-wrapper tr:nth-child(even) > td.el-table__cell {
      background-color: var(--table-row-even-bg) !important;
    }

    .el-table__body-wrapper tr:hover > td.el-table__cell {
      background-color: var(--table-row-hover-bg) !important;
    }

    .el-table__cell {
      .cell {
        overflow: hidden;
        min-width: 0;
      }

      .el-input,
      .el-input-number,
      .el-select,
      .el-date-editor,
      .el-autocomplete {
        width: 100%;
        max-width: 100%;
        min-width: 0;
      }

      .cell-date-wrap {
        width: 100%;
        max-width: 100%;
        min-width: 0;
      }

      .cell-date.el-date-editor {
        --el-date-editor-width: 100%;
        width: 100% !important;
        max-width: 100%;
        min-width: 0 !important;

        .el-input__wrapper {
          min-width: 0 !important;
          padding-right: 2px;
        }

        .el-input__prefix {
          display: none;
        }

        .el-input__inner {
          font-size: 12px;
          padding: 0 2px;
        }
      }

      .el-input__wrapper,
      .el-select__wrapper,
      .el-textarea__inner {
        background: transparent !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0;
        padding-left: 0;
        padding-right: 0;
      }

      .el-input__wrapper:hover,
      .el-input__wrapper.is-focus,
      .el-select__wrapper:hover,
      .el-select__wrapper.is-focused,
      .el-select__wrapper.is-hovering {
        box-shadow: none !important;
      }

      .el-input__inner,
      .el-textarea__inner {
        background: transparent !important;
        border: none !important;
        border-bottom: none !important;
        box-shadow: none !important;
        padding-left: 4px;
        padding-right: 4px;

        &:focus {
          border: none !important;
          border-bottom: none !important;
          box-shadow: none !important;
        }
      }

      .el-input-number .el-input__wrapper {
        padding: 0 4px;
      }
    }

    .required-col::before {
      content: '*';
      color: #f53f3f;
      margin-right: 2px;
    }

    .code-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;

      .product-code-autocomplete {
        flex: 1;
        min-width: 0;
      }

      .el-input {
        flex: 1;
      }

      .select-btn {
        flex-shrink: 0;
        padding: 0 4px;
        font-size: 12px;
      }
    }

    .product-field-autocomplete {
      width: 100%;
    }

    .cell-number {
      width: 100%;

      :deep(.el-input__inner) {
        text-align: right;
      }
    }

    .amount-text {
      color: #165dff;
      font-weight: 600;
      font-size: 13px;
      display: block;
      text-align: right;
    }

    .el-table__footer-wrapper td.el-table__cell {
      background: var(--table-row-even-bg) !important;
      color: #333;
      font-weight: 600;
      border-color: var(--table-line-color) !important;
    }
  }
}

.batch-add-dialog {
  .batch-search {
    margin-bottom: 16px;

    .el-input {
      width: 300px;
    }
  }
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

    &:hover {
      background: #f5f7fa;
    }

    &:active {
      background: #e6f7ff;
    }
  }

  .field-order {
    color: #909399;
    font-size: 12px;
    margin-right: 4px;
    font-weight: 500;
    min-width: 20px;
  }

  :deep(.el-checkbox) {
    margin-right: 0;
    margin-bottom: 8px;
  }
}
</style>

<style lang="scss">
.product-suggest-popper {
  --product-suggest-cols: 80px 180px 100px 140px 72px 56px;

  min-width: 760px !important;
  width: 760px !important;

  .el-autocomplete-suggestion__header {
    padding: 0;
    margin: 0;
    border-bottom: 1px solid #e4e7ed;
  }

  .el-autocomplete-suggestion__wrap {
    max-height: 320px;
  }

  .el-autocomplete-suggestion li {
    padding: 0;
    line-height: 1.4;

    &.highlighted {
      background-color: #e6f4ff !important;
    }
  }

  .product-suggest-item {
    display: grid;
    grid-template-columns: var(--product-suggest-cols);
    column-gap: 8px;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
    padding: 6px 10px;
    font-size: 12px;
    color: #333;

    &.is-header {
      padding: 7px 10px;
      background: #f5f7fa;
      font-weight: 600;
      color: #606266;
    }

    .is-num {
      text-align: right;
    }

    .col-code,
    .s-code {
      color: #165dff;
      font-weight: 600;
    }

    &.is-header .col-code {
      color: #606266;
      font-weight: 600;
    }

    .col-name,
    .col-spec,
    .col-mfr,
    .s-name,
    .s-spec,
    .s-mfr {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .col-spec,
    .col-mfr,
    .s-spec,
    .s-mfr {
      color: #666;
    }
  }
}
</style>
