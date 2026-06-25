<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick, type Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { print, preview } from '@/utils/printService'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { TableInstance } from 'element-plus'
import { useTableStyle } from '@/composables/useTableStyle'
import {
  ArrowLeft, ArrowRight, DArrowLeft, DArrowRight,
  MoreFilled, Plus, Minus, CopyDocument, Setting, QuestionFilled, Coin
} from '@element-plus/icons-vue'
import { loadProductList, findProductByCode, findProductsByCompositeQuery, findProductByCompositeQuery, getProductLastPrice, toBatchProductRow, type ProductMaster } from '@/utils/productStore'
import {
  applyPlatformProductToSalesItem,
  findPlatformProductByCode,
  getPlatformProductsForSales,
  type PlatformProduct
} from '@/utils/platformProductStore'
import {
  syncSalesOrderItemsToLocalProducts,
  isNormalCustomerCompany
} from '@/utils/customerProductService'
import {
  hydrateCustomerListFromServer,
  loadActiveCustomerList,
  resolveCustomerMaster,
  getCurrentUserName,
  type CustomerMaster
} from '@/utils/customerStore'
import { onSalesOrderAudited, backfillSalesOrderExternalNos, resolveSalesOrderExternalNo } from '@/utils/platformCollaborationService'
import { useDocumentConfirm } from '@/composables/useDocumentConfirm'
import { useOrderDocumentNav } from '@/composables/useOrderDocumentNav'
import { CONFIRM_STATUS_CONFIRMED, CONFIRM_STATUS_UNCONFIRMED, normalizeConfirmStatus } from '@/utils/documentFunctionSettings'
import { generateDocumentNo } from '@/utils/documentNumberSettings'
import {
  loadSalesOrderNavIds,
  mergeSalesOrderListRows
} from '@/utils/salesOrderListData'
import {
  arrowKeyToDirection,
  findFieldKeyFromElement,
  focusCellControl,
  focusFieldByKey,
  focusItemDateCell,
  handleFormGridSelectKeyboard,
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
  applyProductionDateToItemRow,
  resolveProductForRow,
} from '@/utils/productBatchExpiry'
import {
  useDocumentItemBatchNo,
  isBatchNoFormatTarget,
  isBatchNoInputTarget,
} from '@/composables/useDocumentItemBatchNo'
import BatchNoCellKeyboard from '@/components/purchase/BatchNoCellKeyboard.vue'
import { useDocumentItemTableSort } from '@/composables/useDocumentItemTableSort'
import DocumentSortHeader from '@/components/common/DocumentSortHeader.vue'
import ProductBatchSelectDialog from '@/components/common/ProductBatchSelectDialog.vue'
import {
  activeWarehouseOptions,
  getDefaultWarehouseValue,
  resolveWarehouseLabel,
  shouldSkipWarehouseField,
  hydrateWarehouseOptionsFromServer,
} from '@/utils/warehouseSettings'
import { getCurrentCompanyId } from '@/utils/orderBusinessProcess'
import { requireTenantCompanyId } from '@/utils/tenantGuard'
import { syncSalesOrdersToServer } from '@/utils/orderSyncService'
import {
  calcSalesOrderAmounts,
  formatDealAmountStr
} from '@/utils/salesOrderAmount'
import { saveFundDocument, type FundSettlementType } from '@/utils/fundStore'

const router = useRouter()
const route = useRoute()

interface OrderItem {
  productCode: string
  productName: string
  spec: string
  unit: string
  quantity: number | string
  price: number | string
  amount: number | string
  bidType?: string
  manufacturer?: string
  batchNo?: string
  productionDate?: string
  expiryDate?: string
  registrationNo?: string
  productionLicenseNo?: string
  storageCondition?: string
  itemRemark?: string
  productLocked?: boolean
  orderDiscountShare?: number
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
  'unit', 'quantity', 'price', 'lastPrice', 'amount',
  'batchNo', 'productionDate', 'expiryDate', 'storageCondition', 'bidType', 'remark'
]

const DEFAULT_ITEM_ROW_COUNT = 6

const ITEM_COLUMN_DEFINITIONS: ItemColumnDef[] = [
  { key: 'productCode', label: '商品编码', prop: 'productCode', align: 'center', required: true },
  { key: 'productName', label: '商品名称', prop: 'productName', align: 'center', overflow: true },
  { key: 'spec', label: '规格型号', prop: 'spec', align: 'center', overflow: true },
  { key: 'manufacturer', label: '生产厂家', prop: 'manufacturer', align: 'center', overflow: true },
  { key: 'registrationNo', label: '注册证号', prop: 'registrationNo', align: 'center' },
  { key: 'productionLicenseNo', label: '生产许可证号', prop: 'productionLicenseNo', align: 'center' },
  { key: 'unit', label: '单位', prop: 'unit', align: 'center', required: true },
  { key: 'quantity', label: '数量', prop: 'quantity', align: 'right', required: true },
  { key: 'price', label: '单价', prop: 'price', align: 'right' },
  { key: 'lastPrice', label: '上次价格', prop: 'lastPrice', align: 'right' },
  { key: 'amount', label: '金额', prop: 'amount', align: 'right' },
  { key: 'batchNo', label: '生产批号', prop: 'batchNo', align: 'center' },
  { key: 'productionDate', label: '生产日期', prop: 'productionDate', align: 'center' },
  { key: 'expiryDate', label: '有效期至', prop: 'expiryDate', align: 'center' },
  { key: 'storageCondition', label: '贮存条件', prop: 'storageCondition', align: 'center' },
  { key: 'bidType', label: '招标类型', prop: 'bidType', align: 'center' },
  { key: 'remark', label: '备注', prop: 'itemRemark', align: 'center' }
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
  type: 'input' | 'select' | 'date' | 'datetime' | 'number' | 'textarea' | 'status'
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
  'orderNo', 'date', 'customer', 'warehouse', 'receiveAddress', 'remark'
]

const HEADER_FIELD_DEFINITIONS: HeaderFieldOption[] = [
  { key: 'orderNo', label: '订单号', type: 'input', disabled: true },
  { key: 'date', label: '下单日期', type: 'date', required: true },
  { key: 'confirmStatus', label: '确定状态', type: 'status', disabled: true },
  { key: 'customer', label: '客户', type: 'select', options: 'customerOptions', required: true },
  { key: 'customerCode', label: '客户编码', type: 'input', disabled: true },
  { key: 'warehouse', label: '仓库', type: 'select', options: 'warehouseOptions' },
  { key: 'deliveryDate', label: '预计发货', type: 'date' },
  { key: 'contact', label: '联系人', type: 'input' },
  { key: 'phone', label: '联系电话', type: 'input' },
  { key: 'remark', label: '备注', type: 'input', maxLength: 30 },
  { key: 'salesman', label: '业务员', type: 'input' },
  { key: 'department', label: '部门', type: 'input' },
  { key: 'receiveAddress', label: '收货地址', type: 'input', span2: true },
  { key: 'creator', label: '制单人', type: 'input' },
  { key: 'createTime', label: '制单时间', type: 'datetime', disabled: true },
  { key: 'auditor', label: '审核人', type: 'input', disabled: true },
  { key: 'auditTime', label: '审核时间', type: 'input', disabled: true },
  { key: 'docSource', label: '单据来源', type: 'input' },
  { key: 'externalNo', label: '外部单号', type: 'input' },
  { key: 'printCount', label: '打印次数', type: 'number', min: 0, disabled: true }
]

const warehouseOptions = activeWarehouseOptions

const applySingleWarehouseDefault = () => {
  const sole = warehouseOptions.value[0]
  if (!sole) return
  form.value.warehouse = sole.value
}

const ensureDefaultWarehouse = () => {
  if (String(form.value.warehouse || '').trim()) return
  const defaultVal = getDefaultWarehouseValue(warehouseOptions.value)
  if (!defaultVal) return
  form.value.warehouse = defaultVal
}

const initWarehouseDefaults = async () => {
  await hydrateWarehouseOptionsFromServer()
  if (shouldSkipWarehouseField.value) {
    applySingleWarehouseDefault()
  } else {
    ensureDefaultWarehouse()
  }
}

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
  const savedOrder = localStorage.getItem('sales-field-order')
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

  const saved = localStorage.getItem('sales-field-config')
  if (saved) {
    try {
      const keys = (JSON.parse(saved) as string[]).filter(key =>
        HEADER_FIELD_DEFINITIONS.some(f => f.key === key)
      )
      if (keys.length) {
        const filtered = keys.filter(key => key !== 'confirmStatus')
        visibleFields.value = new Set(filtered)
        selectedFields.value = filtered
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
  localStorage.setItem('sales-field-config', JSON.stringify(selectedFields.value))
  localStorage.setItem('sales-field-order', JSON.stringify(fieldOptions.value.map(f => f.key)))
  showFieldSelector.value = false
  ElMessage.success('表头设置已保存')
}

initHeaderFieldConfig()

const customerList = ref<CustomerMaster[]>([])

const customerOptions = computed(() =>
  customerList.value.map(c => ({ label: c.name, value: c.name, code: c.code || '' }))
)

const getOptions = (optionsKey?: string) => {
  if (optionsKey === 'customerOptions') return customerOptions.value
  if (optionsKey === 'warehouseOptions') return warehouseOptions.value
  return []
}

const isEdit = ref(false)
const orderId = ref('')
const basicInfoCollapsed = ref(false)
const itemsCollapsed = ref(false)
const amountInfoCollapsed = ref(false)

const receiptAccountOptions = [
  { label: '基本户-工商银行', value: 'icbc' },
  { label: '一般户-建设银行', value: 'ccb' },
  { label: '现金账户', value: 'cash' }
]

const receiptMethodOptions = [
  { label: '银行转账', value: 'transfer' },
  { label: '现金', value: 'cash' },
  { label: '承兑汇票', value: 'acceptance' },
  { label: '月结', value: 'monthly' }
]

const mapReceiptMethodToSettlement = (method: string): FundSettlementType => {
  const map: Record<string, FundSettlementType> = {
    transfer: 'bank',
    cash: 'cash',
    acceptance: 'draft',
    monthly: 'bank'
  }
  return map[method] || 'bank'
}

const resolveReceiptAccountLabel = (value: string) =>
  receiptAccountOptions.find(o => o.value === value)?.label || value

const salesExpenses = ref<{ name: string; amount: number }[]>([])
const customerExpenses = ref<{ name: string; amount: number }[]>([])
const receiptAccounts = ref<{ account: string; amount: number }[]>([])
const showMultiReceiptDialog = ref(false)
const multiReceiptDraft = ref<{ account: string; amount: number }[]>([])

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

const insertItemColumnKey = (keys: string[], columnKey: string, afterKey: string) => {
  if (keys.includes(columnKey)) return keys
  const afterIdx = keys.indexOf(afterKey)
  if (afterIdx !== -1) {
    keys.splice(afterIdx + 1, 0, columnKey)
  } else {
    keys.push(columnKey)
  }
  return keys
}

const NEW_ITEM_COLUMNS: { key: string; after: string }[] = [
  { key: 'registrationNo', after: 'manufacturer' },
  { key: 'productionLicenseNo', after: 'registrationNo' },
  { key: 'lastPrice', after: 'price' },
  { key: 'batchNo', after: 'amount' },
  { key: 'productionDate', after: 'batchNo' },
  { key: 'expiryDate', after: 'productionDate' },
  { key: 'storageCondition', after: 'expiryDate' },
  { key: 'bidType', after: 'storageCondition' },
  { key: 'remark', after: 'bidType' }
]

const migrateItemColumnKeys = (keys: string[]) => {
  const merged = [...keys]
  let changed = false
  NEW_ITEM_COLUMNS.forEach(({ key, after }) => {
    if (!merged.includes(key)) {
      insertItemColumnKey(merged, key, after)
      changed = true
    }
  })
  return { merged, changed }
}

const initItemColumnConfig = () => {
  let orderKeys = ITEM_COLUMN_DEFINITIONS.map(c => c.key)
  let visibleKeys = [...DEFAULT_ITEM_COLUMN_KEYS]
  let configChanged = false

  const savedOrder = localStorage.getItem('sales-item-column-order')
  if (savedOrder) {
    try {
      orderKeys = JSON.parse(savedOrder) as string[]
    } catch {
      /* ignore */
    }
  }

  const saved = localStorage.getItem('sales-item-column-config')
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

  const orderMigration = migrateItemColumnKeys(orderKeys.filter(key =>
    ITEM_COLUMN_DEFINITIONS.some(c => c.key === key)
  ))
  const visibleMigration = migrateItemColumnKeys(visibleKeys.filter(key =>
    ITEM_COLUMN_DEFINITIONS.some(c => c.key === key)
  ))

  orderKeys = orderMigration.merged
  visibleKeys = visibleMigration.merged
  configChanged = orderMigration.changed || visibleMigration.changed

  const ordered = orderKeys
    .map(key => ITEM_COLUMN_DEFINITIONS.find(c => c.key === key))
    .filter(Boolean) as ItemColumnDef[]
  const missing = ITEM_COLUMN_DEFINITIONS.filter(c => !orderKeys.includes(c.key))
  itemColumnOptions.value = [...ordered, ...missing]

  visibleItemColumns.value = new Set(visibleKeys)
  selectedItemColumns.value = [...visibleKeys]

  if (configChanged) {
    localStorage.setItem(
      'sales-item-column-order',
      JSON.stringify(itemColumnOptions.value.map(c => c.key))
    )
    localStorage.setItem('sales-item-column-config', JSON.stringify(visibleKeys))
  }
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
  localStorage.setItem('sales-item-column-config', JSON.stringify(selectedItemColumns.value))
  localStorage.setItem('sales-item-column-order', JSON.stringify(itemColumnOptions.value.map(c => c.key)))
  showItemColumnSelector.value = false
  ElMessage.success('商品信息设置已保存')
  syncItemsTableLayout()
}

initItemColumnConfig()

const { columnWidths: itemColumnWidths, handleHeaderDragend: handleItemsHeaderDragendBase } = useTableStyle('sales-order-items', [
  { key: 'index', label: '行号', defaultWidth: 52 },
  { key: 'productCode', label: '商品编码', defaultWidth: 120 },
  { key: 'productName', label: '商品名称', defaultWidth: 160 },
  { key: 'spec', label: '规格型号', defaultWidth: 120 },
  { key: 'manufacturer', label: '生产厂家', defaultWidth: 140 },
  { key: 'registrationNo', label: '注册证号', defaultWidth: 150 },
  { key: 'productionLicenseNo', label: '生产许可证号', defaultWidth: 160 },
  { key: 'unit', label: '单位', defaultWidth: 64 },
  { key: 'quantity', label: '数量', defaultWidth: 88 },
  { key: 'price', label: '单价', defaultWidth: 96 },
  { key: 'lastPrice', label: '上次价格', defaultWidth: 90 },
  { key: 'amount', label: '金额', defaultWidth: 100 },
  { key: 'batchNo', label: '生产批号', defaultWidth: 118 },
  { key: 'productionDate', label: '生产日期', defaultWidth: 100 },
  { key: 'expiryDate', label: '有效期至', defaultWidth: 100 },
  { key: 'storageCondition', label: '贮存条件', defaultWidth: 120 },
  { key: 'bidType', label: '招标类型', defaultWidth: 100 },
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

const createEmptyItemRow = (): OrderItem => ({
  productCode: '',
  productName: '',
  spec: '',
  unit: '',
  quantity: 1,
  price: 0,
  lastPrice: 0,
  amount: 0,
  productLocked: false
})

const formatQty = (val: number | string) =>
  Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

const formatMoney = (val: number | string) =>
  Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const calcRowAmount = (row: OrderItem) => {
  row.amount = Number((Number(row.quantity) * Number(row.price)).toFixed(2))
}

const orderAmounts = computed(() =>
  calcSalesOrderAmounts({
    lines: form.value.items,
    discountRate: form.value.discountRate,
    discountAmount: form.value.discountAmount,
    salesExpenses: salesExpenses.value,
    customerExpenses: customerExpenses.value
  })
)

const formatDealAmount = (val: number) => formatDealAmountStr(val)

const form = ref({
  orderNo: '',
  customer: '',
  customerCode: '',
  warehouse: '',
  date: '',
  deliveryDate: '',
  contact: '',
  phone: '',
  remark: '',
  salesman: '',
  department: '',
  receiveAddress: '',
  creator: '当前用户',
  createTime: '',
  docSource: '',
  externalNo: '',
  printCount: 0,
  auditStatus: 'notAudited' as 'notAudited' | 'audited',
  confirmStatus: CONFIRM_STATUS_UNCONFIRMED,
  auditor: '',
  auditTime: '',
  discountRate: 0,
  discountAmount: 0,
  receiptAccount: '',
  receiptMethod: '',
  depositRatio: 0,
  prepaidDeposit: 0,
  currentReceiptAmount: 0,
  enablePreDeduction: false,
  items: [] as OrderItem[]
})

const {
  confirmEnabled: salesOrderConfirmEnabled,
  canConfirm: canConfirmSalesOrder,
  handleConfirm: handleConfirmSalesOrder,
  requireConfirmedBeforeAudit: requireSalesOrderConfirmed,
  resetConfirmStatus: resetSalesOrderConfirm,
  autoConfirmIfNeeded: autoConfirmSalesOrderIfNeeded
} = useDocumentConfirm(
  'sales_order',
  () => form.value.confirmStatus,
  value => { form.value.confirmStatus = value },
  {
    permissionCode: 'sales_confirm',
    validate: () => validateForm(),
    onPersist: () => persistOrder()
  }
)

const showPlatformHint = computed(() => isNormalCustomerCompany())

const totalQuantity = computed(() => orderAmounts.value.totalQuantity)

const totalAmount = computed(() => orderAmounts.value.lineAmountTotal)

const salesExpenseTotal = computed(() =>
  salesExpenses.value.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
)

const customerExpenseTotal = computed(() =>
  customerExpenses.value.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
)

const multiReceiptSummary = computed(() => {
  if (!receiptAccounts.value.length) return ''
  const total = receiptAccounts.value.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  return `${receiptAccounts.value.length}个账户 · ${formatMoney(total)}`
})

const receivableAmount = computed(() => orderAmounts.value.receivableAmount)

const isOrderAudited = computed(() => form.value.auditStatus === 'audited')

const prepayAmount = computed(() =>
  Number((receivableAmount.value * (Number(form.value.depositRatio) || 0) / 100).toFixed(2))
)

watch(
  () => form.value.depositRatio,
  () => {
    if (isOrderAudited.value) return
    form.value.prepaidDeposit = prepayAmount.value
  }
)

const applyLocalProductToItem = (target: OrderItem, product: ProductMaster) => {
  target.productCode = product.code
  target.productName = product.name
  target.spec = product.spec || ''
  target.unit = product.measureUnit || product.purchaseUnit || '盒'
  target.lastPrice = getProductLastPrice(product)
  target.price = Number(product.lastPrice ?? product.unitPrice ?? 0)
  target.manufacturer = product.manufacturer || ''
  target.registrationNo = product.registerNo || ''
  target.productionLicenseNo = product.licenseNo || ''
  target.storageCondition = product.storageCondition || ''
  target.bidType = String(product.bidType || '')
  target._fromPlatform = Boolean(product.fromPlatform)
  target._platformProductCode = String(product.platformProductCode || '')
  if (target.productionDate) {
    applyProductionDateToItemRow(target as Record<string, any>, product, loadBatchNoFormat())
  }
}

const applyBatchExpiryFromProductionDate = (
  row: OrderItem,
  product?: ProductMaster | Record<string, unknown>
) => {
  if (row.productionDate) {
    applyProductionDateToItemRow(row as Record<string, any>, product, loadBatchNoFormat())
  }
}

const {
  handleProductionDateChange,
  handleBatchFormatChange,
  handleBatchNoInput,
  handleExpiryDateChange,
  focusBatchNoCell,
} = useDocumentItemBatchNo()

const clearProductBoundFields = (row: OrderItem) => {
  row.productName = ''
  row.spec = ''
  row.manufacturer = ''
  row.registrationNo = ''
  row.productionLicenseNo = ''
  row.unit = ''
  row.storageCondition = ''
  row.bidType = ''
  row.lastPrice = 0
  row.price = 0
  row.amount = 0
  row._fromPlatform = false
  row._platformProductCode = ''
}

const syncItemFromProductMaster = (item: OrderItem, code: string): boolean => {
  const trimmed = String(code || '').trim()
  if (!trimmed) return false

  const local = findProductByCode(trimmed)
  if (local) {
    applyLocalProductToItem(item, local)
    item.productLocked = true
    calcRowAmount(item)
    return true
  }

  const platform = findPlatformProductByCode(trimmed)
  if (platform) {
    applyPlatformProductToSalesItem(item as Record<string, unknown>, platform)
    applyBatchExpiryFromProductionDate(item)
    item.productLocked = true
    calcRowAmount(item)
    return true
  }

  return false
}

const buildItemProductSearchQuery = (item: OrderItem): string =>
  String(item.productCode || '').trim()

const resolveProductFromCompositeQuery = (
  query: string
): { source: 'local' | 'platform'; product: ProductMaster } | 'ambiguous' | null => {
  const trimmed = query.trim()
  if (!trimmed) return null

  const localList = loadProductList()
  const localMatches = findProductsByCompositeQuery(trimmed, localList)
  if (localMatches.length === 1) return { source: 'local', product: localMatches[0] }
  if (localMatches.length > 1) {
    const single = findProductByCompositeQuery(trimmed, localList)
    if (single) return { source: 'local', product: single }
    return 'ambiguous'
  }

  const platformList = getPlatformProductsForSales()
  const platformMatches = findProductsByCompositeQuery(trimmed, platformList)
  if (platformMatches.length === 1) return { source: 'platform', product: platformMatches[0] }
  if (platformMatches.length > 1) {
    const single = findProductByCompositeQuery(trimmed, platformList)
    if (single) return { source: 'platform', product: single }
    return 'ambiguous'
  }

  return null
}

const applyResolvedProductToItem = (
  item: OrderItem,
  resolved: { source: 'local' | 'platform'; product: ProductMaster }
) => {
  if (resolved.source === 'platform') {
    applyPlatformProductToSalesItem(item as Record<string, unknown>, resolved.product as PlatformProduct)
    applyBatchExpiryFromProductionDate(item)
    return
  }
  applyLocalProductToItem(item, resolved.product)
}

const PRODUCT_SUGGEST_LIMIT = 15
const productAutocompleteRefs = new Map<Record<string, unknown>, Record<string, unknown>>()

const getRowAutocompleteRefs = (row: Record<string, unknown>) => {
  if (!productAutocompleteRefs.has(row)) {
    productAutocompleteRefs.set(row, {})
  }
  return productAutocompleteRefs.get(row)!
}

const setProductAutocompleteRef = (row: Record<string, unknown>, colKey: string, el: unknown) => {
  const refs = getRowAutocompleteRefs(row)
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
  row: OrderItem,
  cb: (results: ItemProductSuggestion[]) => void
) => {
  const query = buildItemProductSearchQuery(row)
  if (!query) {
    resetSuggestMultiContext(row)
    cb([])
    return
  }
  const localMatches = findProductsByCompositeQuery(query, loadProductList())
    .slice(0, PRODUCT_SUGGEST_LIMIT)
    .map(toLocalItemSuggestion)
  const platformMatches = findProductsByCompositeQuery(query, getPlatformProductsForSales())
    .slice(0, 8)
    .map(toPlatformItemSuggestion)
  const merged = [...localMatches]
  platformMatches.forEach(item => {
    if (!merged.some(m => m.code === item.code)) merged.push(item)
  })
  const results = merged.slice(0, PRODUCT_SUGGEST_LIMIT)
  initSuggestMultiContext(row, results)
  cb(results)
}

type SuggestMultiContext = {
  row: OrderItem
  rowIndex: number
  results: ItemProductSuggestion[]
  selected: Set<string>
}

const suggestMultiContext = ref<SuggestMultiContext | null>(null)

const initSuggestMultiContext = (row: OrderItem, results: ItemProductSuggestion[]) => {
  const rowIndex = findItemRowIndex(row)
  const prev = suggestMultiContext.value
  const resultCodes = new Set(results.map(item => item.code))

  if (prev?.row === row) {
    const selected = new Set([...prev.selected].filter(code => resultCodes.has(code)))
    suggestMultiContext.value = { row, rowIndex, results, selected }
    return
  }

  suggestMultiContext.value = {
    row,
    rowIndex,
    results,
    selected: new Set<string>()
  }
}

const resetSuggestMultiContext = (row?: OrderItem) => {
  if (!row || suggestMultiContext.value?.row === row) {
    suggestMultiContext.value = null
  }
}

const isActiveSuggestMultiRow = (row: OrderItem) => suggestMultiContext.value?.row === row

const showSuggestMultiBar = (row: OrderItem) =>
  isActiveSuggestMultiRow(row) && (suggestMultiContext.value?.results.length ?? 0) > 1

const suggestSelectedCount = (row: OrderItem) =>
  isActiveSuggestMultiRow(row) ? suggestMultiContext.value!.selected.size : 0

const isSuggestSelected = (row: OrderItem, code: string) =>
  isActiveSuggestMultiRow(row) && suggestMultiContext.value!.selected.has(code)

const isAllSuggestSelected = (row: OrderItem) => {
  const ctx = suggestMultiContext.value
  if (!isActiveSuggestMultiRow(row) || !ctx?.results.length) return false
  return ctx.results.every(item => ctx.selected.has(item.code))
}

const isSuggestSelectionIndeterminate = (row: OrderItem) => {
  const ctx = suggestMultiContext.value
  if (!isActiveSuggestMultiRow(row) || !ctx?.results.length) return false
  const count = ctx.results.filter(item => ctx.selected.has(item.code)).length
  return count > 0 && count < ctx.results.length
}

const toggleSuggestSelection = (
  row: OrderItem,
  suggestion: ItemProductSuggestion,
  selected?: boolean
) => {
  const ctx = suggestMultiContext.value
  if (!ctx || ctx.row !== row) return
  const next = new Set(ctx.selected)
  const shouldSelect = selected ?? !next.has(suggestion.code)
  if (shouldSelect) next.add(suggestion.code)
  else next.delete(suggestion.code)
  suggestMultiContext.value = { ...ctx, selected: next }
}

const toggleSelectAllSuggest = (row: OrderItem, checked: boolean) => {
  const ctx = suggestMultiContext.value
  if (!ctx || ctx.row !== row) return
  suggestMultiContext.value = {
    ...ctx,
    selected: checked ? new Set(ctx.results.map(item => item.code)) : new Set<string>()
  }
}

const closeSuggestForRow = (row: OrderItem) => {
  const refs = getRowAutocompleteRefs(row as Record<string, unknown>)
  const ac = refs.productCode as { close?: () => void } | undefined
  ac?.close?.()
  resetSuggestMultiContext(row)
}

const isEmptyItemRow = (row: OrderItem) =>
  !String(row.productCode || '').trim() && !String(row.productName || '').trim()

/** 排序或批量添加后，将无商品空行集中到表体末尾，避免中间断行 */
const compactEmptyItemRowsToEnd = () => {
  const items = form.value.items
  const filled = items.filter(row => !isEmptyItemRow(row))
  const empty = items.filter(row => isEmptyItemRow(row))
  if (!empty.length) return
  items.splice(0, items.length, ...filled, ...empty)
}

/** 搜索下拉多选：从当前行起连续写入，优先占用后续空行 */
const insertFilledItemRowsAfterAnchor = (rows: OrderItem[], anchorIndex: number) => {
  if (!rows.length || anchorIndex < 0 || anchorIndex >= form.value.items.length) return
  const items = form.value.items
  Object.assign(items[anchorIndex], rows[0])
  let insertAt = anchorIndex + 1
  for (let i = 1; i < rows.length; i++) {
    if (insertAt < items.length && isEmptyItemRow(items[insertAt])) {
      Object.assign(items[insertAt], rows[i])
    } else {
      items.splice(insertAt, 0, rows[i])
    }
    insertAt += 1
  }
  compactEmptyItemRowsToEnd()
}

/** 批量选择弹窗：优先填充现有空行，再追加到末尾 */
const appendFilledItemRows = (rows: OrderItem[]) => {
  if (!rows.length) return
  let scanFrom = 0
  for (const filled of rows) {
    let placed = false
    for (let j = scanFrom; j < form.value.items.length; j++) {
      if (isEmptyItemRow(form.value.items[j])) {
        Object.assign(form.value.items[j], filled)
        scanFrom = j + 1
        placed = true
        break
      }
    }
    if (!placed) {
      form.value.items.push(filled)
      scanFrom = form.value.items.length
    }
  }
  compactEmptyItemRowsToEnd()
}

const confirmSuggestMultiAdd = (row: OrderItem) => {
  const ctx = suggestMultiContext.value
  if (!ctx || ctx.row !== row || ctx.selected.size === 0) return

  const selected = ctx.results.filter(item => ctx.selected.has(item.code))
  if (!selected.length) return

  const filledRows = selected.map(suggestion => {
    const newRow = createEmptyItemRow()
    applySuggestionToItem(newRow, suggestion)
    newRow.productLocked = true
    calcRowAmount(newRow)
    return newRow
  })

  insertFilledItemRowsAfterAnchor(filledRows, ctx.rowIndex)

  closeSuggestForRow(row)
  syncItemsTableLayout()
  ElMessage.success(`已添加 ${selected.length} 个商品`)
  nextTick(() => focusAfterProductLocked(ctx.rowIndex))
}

const handleSuggestVisibleChange = (row: OrderItem, visible: boolean) => {
  if (!visible) resetSuggestMultiContext(row)
}

const isRowProductLocked = (row: OrderItem) => Boolean(row.productLocked)

const clearProductLock = (row: OrderItem) => {
  if (row._skipProductBlurSearch) return
  if (row.productLocked) clearProductBoundFields(row)
  row.productLocked = false
}

/** 仅商品编码可选；其余商品资料字段由编码绑定带出，不可编辑 */
const PRODUCT_BOUND_COLS = [
  'productName', 'spec', 'manufacturer',
  'registrationNo', 'productionLicenseNo', 'storageCondition', 'bidType'
] as const

const PRODUCT_BOUND_SKIP_FOCUS = new Set<string>([...PRODUCT_BOUND_COLS, 'unit'])

const isProductBoundField = (colKey: string) => PRODUCT_BOUND_SKIP_FOCUS.has(colKey)

const getEffectiveFocusCols = (_row: OrderItem, cols: string[]) =>
  cols.filter(k => !PRODUCT_BOUND_SKIP_FOCUS.has(k))

const getPrevItemFocusColKey = (
  currentColKey: string,
  row: OrderItem,
  cols: string[]
): string | null => {
  const effectiveCols = getEffectiveFocusCols(row, cols)
  const effIdx = effectiveCols.indexOf(currentColKey)
  if (effIdx > 0) return effectiveCols[effIdx - 1]
  return null
}

const getNextItemFocusColKey = (
  currentColKey: string,
  row: OrderItem,
  cols: string[]
): string | null => {
  const effectiveCols = getEffectiveFocusCols(row, cols)
  const effIdx = effectiveCols.indexOf(currentColKey)
  if (effIdx < 0) return effectiveCols[0] ?? null

  if (currentColKey === 'productCode' || isProductBoundField(currentColKey)) {
    if (effectiveCols.includes('quantity')) return 'quantity'
    return effectiveCols[effIdx + 1] ?? null
  }

  if (effIdx < effectiveCols.length - 1) return effectiveCols[effIdx + 1]
  return null
}

const closeProductSuggestForRow = (row: OrderItem) => {
  const refs = getRowAutocompleteRefs(row as Record<string, unknown>)
  Object.values(refs).forEach((ac: any) => ac?.close?.())
}

const isTextInputFocused = () => {
  const el = document.activeElement
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
}

const findItemRowIndex = (row: OrderItem) => form.value.items.indexOf(row)

const isProductAutocompleteTarget = (target: EventTarget | null) =>
  !!(target as HTMLElement)?.closest('.items-detail-table .el-autocomplete')

const isProductSuggestOpen = () => {
  const popper = document.querySelector('.product-suggest-popper') as HTMLElement | null
  if (!popper) return false
  const style = window.getComputedStyle(popper)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

const findSuggestRowFromTarget = (target: HTMLElement): OrderItem | null => {
  const tr = target.closest('.items-detail-table tbody tr.el-table__row')
  if (!tr) return null
  const tableEl = itemsTableRef.value?.$el as HTMLElement | undefined
  const rows = tableEl?.querySelectorAll('.el-table__body-wrapper tbody tr.el-table__row')
  const rowIndex = rows ? Array.from(rows).indexOf(tr as Element) : -1
  if (rowIndex < 0 || rowIndex >= form.value.items.length) return null
  return form.value.items[rowIndex]
}

const findSuggestContextFromTarget = (target: HTMLElement) => {
  const row = findSuggestRowFromTarget(target)
  if (!row) return null
  const autocompleteRoot = target.closest('.el-autocomplete')
  if (!autocompleteRoot) return null
  const refs = getRowAutocompleteRefs(row as Record<string, unknown>)
  const ac = Object.values(refs).find((item: any) => item?.$el === autocompleteRoot)
  if (!ac) return null
  return { row, ac }
}

const getAcSuggestions = (ac: any): ItemProductSuggestion[] =>
  ac?.suggestions?.value ?? ac?.suggestions ?? []

const getAcHighlightIndex = (ac: any): number =>
  ac?.highlightedIndex?.value ?? ac?.highlightedIndex ?? -1

const handleProductSuggestKeyboard = (e: KeyboardEvent): boolean => {
  if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return false

  const ctx = findSuggestContextFromTarget(e.target as HTMLElement)
  if (!ctx) return false
  const { row, ac } = ctx

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    const query = buildItemProductSearchQuery(row as Record<string, unknown>)
    const suggestions = getAcSuggestions(ac)
    if (!suggestions.length && query.trim()) {
      ac.getData(query)
      nextTick(() => ac.highlight(0))
    } else {
      ac.highlight(getAcHighlightIndex(ac) + 1)
    }
    return true
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    ac.highlight(getAcHighlightIndex(ac) - 1)
    return true
  }

  if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()

    if (isProductSuggestOpen()) {
      ac.handleKeyEnter()
      return true
    }

    const item = row as OrderItem
    const rowIndex = findItemRowIndex(item)
    const lockedResult = handleItemProductSearch(item)
    if (lockedResult === 'locked') {
      closeProductSuggestForRow(item)
      focusAfterProductLocked(rowIndex)
      return true
    }

    const query = buildItemProductSearchQuery(row as Record<string, unknown>).trim()
    if (!query) return true

    fetchItemProductSuggestions(row as Record<string, unknown>, suggestions => {
      if (suggestions.length === 1) {
        handleItemProductSuggestionSelect(item, suggestions[0])
        return
      }
      if (suggestions.length > 1) {
        ac.getData(query)
        nextTick(() => ac.highlight(0))
        return
      }
      handleItemProductSearch(item)
    })
    return true
  }

  return false
}

const applySuggestionToItem = (target: OrderItem, suggestion: ItemProductSuggestion) => {
  if (suggestion.source === 'platform') {
    applyPlatformProductToSalesItem(target as Record<string, unknown>, suggestion.raw as PlatformProduct)
    target.lastPrice = suggestion.lastPrice
    applyBatchExpiryFromProductionDate(target)
    return
  }
  applyLocalProductToItem(target, suggestion.raw as ProductMaster)
}

const handleItemProductSuggestionSelect = (row: OrderItem, suggestion: ItemProductSuggestion) => {
  row._skipProductBlurSearch = true
  applySuggestionToItem(row, suggestion)
  row.productLocked = true
  calcRowAmount(row)
  const ctx = findSuggestContextFromTarget(document.activeElement as HTMLElement)
  ctx?.ac?.close?.()
  nextTick(() => {
    focusAfterProductLocked(findItemRowIndex(row))
  })
}

type ProductSearchResult = 'locked' | 'ambiguous' | 'not_found' | 'noop'

const handleItemProductSearch = (
  item: OrderItem,
  options: { silent?: boolean } = {}
): ProductSearchResult => {
  const query = buildItemProductSearchQuery(item)
  if (!query) return 'noop'

  if (!query.includes(' ') && syncItemFromProductMaster(item, query)) {
    item._skipProductBlurSearch = true
    return 'locked'
  }

  const resolved = resolveProductFromCompositeQuery(query)
  if (resolved === 'ambiguous') {
    if (!options.silent) {
      ElMessage.warning('匹配到多个商品，请补充编码/名称/规格/厂家条件')
    }
    return 'ambiguous'
  }
  if (resolved) {
    applyResolvedProductToItem(item, resolved)
    item.productLocked = true
    item._skipProductBlurSearch = true
    calcRowAmount(item)
    return 'locked'
  }

  if (!options.silent) {
    ElMessage.warning('未找到匹配商品，请检查编码/名称/规格/厂家')
  }
  return 'not_found'
}

const handleBoundProductColumnFocus = (row: OrderItem, colKey: string) => {
  if (!isProductBoundField(colKey)) return
  const rowIndex = findItemRowIndex(row)
  if (rowIndex < 0) return
  nextTick(() => focusNextItemCell(rowIndex, colKey))
}

const handleItemProductBlur = (item: OrderItem) => {
  if (item._skipProductBlurSearch) {
    item._skipProductBlurSearch = false
    return
  }
  if (isRowProductLocked(item)) return
  handleItemProductSearch(item, { silent: true })
}

const showBatchAdd = ref(false)

const batchProductList = computed(() => loadProductList().map(toBatchProductRow))

const openBatchAdd = () => {
  showBatchAdd.value = true
}

const confirmBatchAdd = (selected: ProductMaster[]) => {
  const filledRows = selected.map(product => {
    const row = createEmptyItemRow()
    applyLocalProductToItem(row, product)
    row.productLocked = true
    applyBatchExpiryFromProductionDate(row, product)
    calcRowAmount(row)
    return row
  })
  appendFilledItemRows(filledRows)
  ElMessage.success(`成功添加 ${selected.length} 个商品`)
  syncItemsTableLayout()
}


const handleItemDateKeydown = (e: KeyboardEvent, row: OrderItem, colKey: string) => {
  const rowIndex = findItemRowIndex(row)
  if (rowIndex < 0) return
  rememberItemTableFocus(rowIndex, colKey)

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

const handleItemCellEnterKeydown = (e: KeyboardEvent, row: OrderItem, colKey: string) => {
  if (e.key !== 'Enter') return
  const rowIndex = findItemRowIndex(row)
  if (rowIndex < 0) return
  e.preventDefault()
  e.stopPropagation()
  if (colKey === 'quantity' || colKey === 'price') {
    calcRowAmount(row)
  }
  rememberItemTableFocus(rowIndex, colKey)
  nextTick(() => focusNextItemCell(rowIndex, colKey))
}

const shouldNavigateOnArrow = (e: KeyboardEvent) =>
  shouldNavigateOnArrowBase(e, {
    isProductAutocompleteTarget,
    productSuggestOpen: isProductSuggestOpen,
    isItemDatePickerTarget
  })

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
  if (field.type === 'select' || field.key === 'customer') {
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
  itemTableColumnKeys.value.filter(key => {
    if (key === 'index' || key === 'amount' || key === 'lastPrice') return false
    if (key === 'unit') return false
    return true
  })
)

const lastItemTableFocus = ref<{ row: number; colKey: string } | null>(null)

const rememberItemTableFocus = (rowIndex: number, colKey: string) => {
  lastItemTableFocus.value = { row: rowIndex, colKey }
}

const resolveItemTableCell = (rowEl: HTMLElement, colKey: string): HTMLElement | undefined => {
  const inner = rowEl.querySelector(`[data-col-key="${colKey}"]`) as HTMLElement | null
  return inner?.closest('td.el-table__cell') as HTMLElement | undefined
}

const focusItemCell = (rowIndex: number, colKey: string, fromColKey?: string) => {
  rememberItemTableFocus(rowIndex, colKey)
  nextTick(() => {
    const tableEl = itemsTableRef.value?.$el as HTMLElement | undefined
    if (!tableEl) return
    const rows = tableEl.querySelectorAll('.el-table__body-wrapper tbody tr.el-table__row')
    const row = rows[rowIndex] as HTMLElement | undefined
    if (!row) return

    let cell = resolveItemTableCell(row, colKey)
    if (!cell) {
      const colIndex = itemTableColumnKeys.value.indexOf(colKey)
      if (colIndex < 0) return
      cell = row.querySelectorAll('td.el-table__cell')[colIndex] as HTMLElement | undefined
    }
    if (!cell) return

    if (colKey === 'productionDate') {
      focusItemDateCell(cell, true)
      return
    }
    if (colKey === 'expiryDate') {
      focusItemDateCell(cell, false)
      return
    }

    if (colKey === 'batchNo') {
      const rowData = form.value.items[rowIndex] as Record<string, any>
      if (rowData) {
        focusBatchNoCell({
          rowData,
          cell,
          fromColKey,
          onFocusFailed: () => {
            const nextKey = getNextItemFocusColKey(
              'batchNo',
              form.value.items[rowIndex],
              focusableItemColumnKeys.value
            )
            if (nextKey) focusItemCell(rowIndex, nextKey, 'batchNo')
          },
        })
      }
      return
    }

    focusCellControl(cell)
  })
}

const navigateItemsTableFrom = (
  rowIndex: number,
  colKey: string,
  direction: 'up' | 'down' | 'left' | 'right'
) => {
  const cols = focusableItemColumnKeys.value
  const row = form.value.items[rowIndex]
  if (!row) return
  const effectiveCols = getEffectiveFocusCols(row, cols)
  let focusColKey = effectiveCols.includes(colKey) ? colKey : effectiveCols[0]
  let colIdx = effectiveCols.indexOf(focusColKey)
  if (colIdx < 0) colIdx = 0

  if (direction === 'left') {
    if (colIdx > 0) focusItemCell(rowIndex, effectiveCols[colIdx - 1])
    return
  }
  if (direction === 'right') {
    if (colIdx < effectiveCols.length - 1) focusItemCell(rowIndex, effectiveCols[colIdx + 1])
    return
  }
  if (direction === 'up') {
    if (rowIndex > 0) {
      focusItemCell(rowIndex - 1, focusColKey)
    } else {
      const fields = getFocusableHeaderFields()
      if (fields.length) focusFieldByKey(fields[fields.length - 1].key)
    }
    return
  }
  if (direction === 'down' && rowIndex < form.value.items.length - 1) {
    focusItemCell(rowIndex + 1, focusColKey)
  }
}

const navigateItemsTable = (direction: 'up' | 'down' | 'left' | 'right') => {
  const pos = findItemsTableFocus()
  if (!pos) return
  navigateItemsTableFrom(pos.row, pos.colKey, direction)
}

const focusNextItemCell = (rowIndex: number, currentColKey: string) => {
  const row = form.value.items[rowIndex]
  const cols = focusableItemColumnKeys.value
  const nextKey = getNextItemFocusColKey(currentColKey, row, cols)
  if (nextKey) {
    focusItemCell(rowIndex, nextKey, currentColKey)
    return
  }
  if (rowIndex < form.value.items.length - 1) {
    focusItemCell(rowIndex + 1, cols[0])
    return
  }
  addItem()
  nextTick(() => focusItemCell(form.value.items.length - 1, cols[0]))
}

const focusAfterProductLocked = (rowIndex: number) => {
  if (rowIndex < 0) return
  const row = form.value.items[rowIndex]
  if (!row) return
  row._skipProductBlurSearch = true
  closeProductSuggestForRow(row)

  const applyFocus = () => focusNextItemCell(rowIndex, 'productCode')

  nextTick(() => {
    applyFocus()
    requestAnimationFrame(() => {
      if (!isTextInputFocused()) applyFocus()
    })
  })
}

const findItemsTableFocus = (target?: EventTarget | null) => {
  const active = (target ?? document.activeElement) as HTMLElement | null
  if (!active) return lastItemTableFocus.value

  const row = active.closest('.items-detail-table tr.el-table__row') as HTMLElement | null
  const colRoot = active.closest('[data-col-key]') as HTMLElement | null
  if (colRoot && row) {
    const colKey = colRoot.dataset.colKey
    const tableEl = itemsTableRef.value?.$el as HTMLElement | undefined
    const rows = tableEl?.querySelectorAll('.el-table__body-wrapper tbody tr.el-table__row')
    const rowIndex = rows ? Array.from(rows).indexOf(row) : -1
    if (rowIndex >= 0 && colKey) return { row: rowIndex, colKey }
  }

  const cell = active.closest('.items-detail-table td.el-table__cell') as HTMLElement | null
  if (!cell || !row) return lastItemTableFocus.value

  const tableEl = itemsTableRef.value?.$el as HTMLElement | undefined
  const rows = tableEl?.querySelectorAll('.el-table__body-wrapper tbody tr.el-table__row')
  const rowIndex = rows ? Array.from(rows).indexOf(row) : -1
  const colIndex = Array.from(row.querySelectorAll('td.el-table__cell')).indexOf(cell)
  const colKey = itemTableColumnKeys.value[colIndex]
  if (rowIndex < 0 || !colKey) return lastItemTableFocus.value
  return { row: rowIndex, colKey }
}

const handleItemsTableKeydown = (e: KeyboardEvent) => {
  if (isProductAutocompleteTarget(e.target) && handleProductSuggestKeyboard(e)) {
    e.preventDefault()
    e.stopPropagation()
    return
  }

  if (handleItemSelectKeyboard(e)) return
  if (isItemDatePickerTarget(e.target)) return

  if (e.key === 'Enter') {
    if (isProductSuggestOpen()) return
    if (isBatchNoFormatTarget(e.target)) return

    if (isDatePickerPanelOpen()) {
      const pos = findItemsTableFocus()
      if (pos) {
        e.preventDefault()
        e.stopPropagation()
        scheduleAfterDatePickerClose(() => focusNextItemCell(pos.row, pos.colKey))
      }
      return
    }

    const pos = findItemsTableFocus()
    if (!pos) return
    const row = form.value.items[pos.row]

    const advanceItemCell = () => {
      e.preventDefault()
      e.stopPropagation()
      if (row) {
        if (
          isRowProductLocked(row) &&
          (pos.colKey === 'productCode' || isProductBoundField(pos.colKey))
        ) {
          focusAfterProductLocked(pos.row)
          return
        }
        if (pos.colKey === 'productCode') {
          const result = handleItemProductSearch(row)
          if (result === 'locked') {
            closeProductSuggestForRow(row)
            focusAfterProductLocked(pos.row)
            return
          }
        }
      }
      focusNextItemCell(pos.row, pos.colKey)
    }

    if (isSelectDropdownOpen() && isItemSelectTarget(e.target)) {
      scheduleAfterSelectClose(advanceItemCell)
      return
    }
    if (isSelectDropdownOpen()) return

    advanceItemCell()
    return
  }

  const direction = arrowKeyToDirection(e.key)
  if (!direction) return
  if (isDatePickerPanelOpen()) return
  if (isBatchNoFormatTarget(e.target)) return
  if (isBatchNoInputTarget(e.target) && (direction === 'up' || direction === 'down')) return
  if (!shouldNavigateOnArrow(e)) return
  if (!findItemsTableFocus() && !((e.target as HTMLElement).closest('.items-detail-table'))) return

  e.preventDefault()
  e.stopPropagation()
  navigateItemsTable(direction)
}

const generateOrderNo = () => generateDocumentNo('sales_order')

const formatLocalDateTime = () =>
  new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')

const applyOrderToForm = (order: Record<string, unknown>) => ({
  orderNo: String(order.id || ''),
  customer: String(order.customer || ''),
  customerCode: String(order.customerCode || ''),
  warehouse: String(order.warehouse || ''),
  date: String(order.date || ''),
  deliveryDate: String(order.deliveryDate || ''),
  contact: String(order.contact || ''),
  phone: String(order.phone || ''),
  remark: String(order.remark || ''),
  salesman: String(order.salesman || ''),
  department: String(order.department || ''),
  receiveAddress: String(order.receiveAddress || ''),
  creator: String(order.creator || order.operator || '当前用户'),
  createTime: String(order.createTime || ''),
  docSource: String(order.docSource || ''),
  externalNo: resolveSalesOrderExternalNo(order),
  printCount: Number(order.printCount) || 0,
  auditStatus: (order.auditStatus === 'audited' ? 'audited' : 'notAudited') as 'notAudited' | 'audited',
  confirmStatus: normalizeConfirmStatus(order.confirmStatus),
  auditor: String(order.auditor || ''),
  auditTime: String(order.auditTime || ''),
  discountRate: Number(order.discountRate) || 0,
  discountAmount: Number(order.discountAmount) || 0,
  receiptAccount: String(order.receiptAccount || order.paymentAccount || ''),
  receiptMethod: String(order.receiptMethod || order.paymentMethod || ''),
  depositRatio: Number(order.depositRatio) || 0,
  prepaidDeposit: Number(order.prepaidDeposit) || 0,
  currentReceiptAmount: Number(order.currentReceiptAmount || order.currentPaymentAmount) || 0,
  enablePreDeduction: Boolean(order.enablePreDeduction),
  items: ((order.detailItems as OrderItem[]) || []).map(item => {
    const normalized: OrderItem = {
      ...item,
      productLocked: item.productLocked ?? Boolean(String(item.productCode || '').trim())
    }
    const code = String(normalized.productCode || '').trim()
    if (code) syncItemFromProductMaster(normalized, code)
    return normalized
  })
})

onMounted(() => {
  void (async () => {
    backfillSalesOrderExternalNos()
    await initWarehouseDefaults()
    await hydrateCustomerListFromServer()

    const now = new Date()
    form.value.date = now.toISOString().slice(0, 10)
    form.value.orderNo = generateOrderNo()
    form.value.createTime = formatLocalDateTime()

    customerList.value = loadActiveCustomerList()

    const editId = route.params.id as string
    if (editId) {
      isEdit.value = true
      orderId.value = editId
      const orders = mergeSalesOrderListRows()
      const order = orders.find((o: Record<string, unknown>) => o.id === editId || o.orderNo === editId)
      if (order) {
        form.value = applyOrderToForm(order)
        salesExpenses.value = Array.isArray(order.salesExpenses)
          ? order.salesExpenses.map((e: { name: string; amount: number }) => ({ ...e }))
          : []
        customerExpenses.value = Array.isArray(order.customerExpenses)
          ? order.customerExpenses.map((e: { name: string; amount: number }) => ({ ...e }))
          : []
        receiptAccounts.value = Array.isArray(order.receiptAccounts)
          ? (order.receiptAccounts as { account: string; amount: number }[]).map(r => ({ ...r }))
          : []
        ensureDefaultWarehouse()
      }
    } else {
      ensureDefaultWarehouse()
    }

    if (!isEdit.value) {
      ensureDefaultItemRows()
    } else if (form.value.items.length === 0) {
      ensureDefaultItemRows()
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

watch(() => form.value.items.length, syncItemsTableLayout)
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

const formItems = computed({
  get: () => form.value.items as Record<string, unknown>[],
  set: items => { form.value.items = items as typeof form.value.items }
})

const itemColumnSortKeys = computed(() => sortedVisibleItemColumns.value.map(c => c.key))

const {
  getItemSortIcon,
  handleItemColumnSort,
  isColumnSortable,
  itemSortOrders
} = useDocumentItemTableSort(formItems as Ref<Record<string, unknown>[]>, itemColumnSortKeys, {
  documentKind: 'sales_order',
  getColumnDef: key => ITEM_COLUMN_DEFINITIONS.find(c => c.key === key),
  onSorted: () => {
    compactEmptyItemRowsToEnd()
    syncItemsTableLayout()
  }
})

watch(
  () => route.params.id as string | undefined,
  (newId, oldId) => {
    if (newId === oldId || !newId) return
    isEdit.value = true
    orderId.value = newId
    const order = mergeSalesOrderListRows().find(
      (o: Record<string, unknown>) => o.id === newId || o.orderNo === newId
    )
    if (order) {
      form.value = applyOrderToForm(order)
      salesExpenses.value = Array.isArray(order.salesExpenses)
        ? (order.salesExpenses as { name: string; amount: number }[]).map(e => ({ ...e }))
        : []
      customerExpenses.value = Array.isArray(order.customerExpenses)
        ? (order.customerExpenses as { name: string; amount: number }[]).map(e => ({ ...e }))
        : []
      receiptAccounts.value = Array.isArray(order.receiptAccounts)
        ? (order.receiptAccounts as { account: string; amount: number }[]).map(r => ({ ...r }))
        : []
      ensureDefaultWarehouse()
      nextTick(() => syncItemsTableLayout())
    }
  }
)

const handleCustomerChange = (customerName: string) => {
  const customer = resolveCustomerMaster(customerName)
  if (customer) {
    form.value.customerCode = customer.code || customer.id
    form.value.contact = customer.contact || ''
    form.value.phone = customer.phone || customer.mobile || ''
  }
}

const addItem = () => {
  form.value.items.push(createEmptyItemRow())
  syncItemsTableLayout()
}

const ensureDefaultItemRows = () => {
  while (form.value.items.length < DEFAULT_ITEM_ROW_COUNT) {
    form.value.items.push(createEmptyItemRow())
  }
  syncItemsTableLayout()
}

const insertItemAfter = (index: number) => {
  form.value.items.splice(index + 1, 0, createEmptyItemRow())
  syncItemsTableLayout()
}

const removeItem = (index: number) => {
  if (form.value.items.length <= 1) {
    ElMessage.warning('至少保留一行明细')
    return
  }
  form.value.items.splice(index, 1)
  syncItemsTableLayout()
}

const copyItem = (index: number) => {
  form.value.items.splice(index + 1, 0, { ...form.value.items[index] })
  syncItemsTableLayout()
}

const itemSummaryMethod = ({ columns, data }: { columns: any[]; data: OrderItem[] }) => {
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
    } else {
      sums[index] = ''
    }
  })
  return sums
}

const addOperationLog = (oid: string, operationType: string, operator: string, remark: string) => {
  const logs = JSON.parse(localStorage.getItem('sales-operation-logs') || '[]')
  logs.unshift({
    id: Date.now(),
    orderId: oid,
    operationType,
    operator,
    operationTime: formatLocalDateTime(),
    remark
  })
  localStorage.setItem('sales-operation-logs', JSON.stringify(logs))
}

const buildOrderData = () => {
  ensureDefaultWarehouse()
  const warehouseLabel = resolveWarehouseLabel(form.value.warehouse) || form.value.warehouse
  const orders = JSON.parse(localStorage.getItem('sales-orders') || '[]') as Record<string, unknown>[]
  const existing = orders.find(o => o.id === form.value.orderNo)
  const docSource = String(form.value.docSource || existing?.docSource || '')
  return {
  id: form.value.orderNo,
  companyId: existing?.companyId || getCurrentCompanyId(),
  businessProcess:
    existing?.businessProcess ||
    (docSource === '平台协同' ? 'collaborative' : 'standard'),
  customer: form.value.customer,
  customerCode: form.value.customerCode,
  date: form.value.date,
  amount: formatDealAmount(receivableAmount.value),
  receivableAmount: receivableAmount.value,
  lineAmountTotal: totalAmount.value,
  discountRate: form.value.discountRate,
  discountAmount: form.value.discountAmount,
  salesExpenses: salesExpenses.value.map(e => ({ ...e })),
  customerExpenses: customerExpenses.value.map(e => ({ ...e })),
  receiptAccount: form.value.receiptAccount,
  receiptAccounts: receiptAccounts.value.map(r => ({ ...r })),
  receiptMethod: form.value.receiptMethod,
  depositRatio: form.value.depositRatio,
  prepaidDeposit: form.value.prepaidDeposit,
  prepayAmount: prepayAmount.value,
  currentReceiptAmount: form.value.currentReceiptAmount,
  enablePreDeduction: form.value.enablePreDeduction,
  status: form.value.auditStatus === 'audited' ? 'processing' : 'pending',
  auditStatus: form.value.auditStatus,
  confirmStatus: form.value.confirmStatus,
  auditor: form.value.auditor,
  auditTime: form.value.auditTime,
  executeStatus: 'notExecuted',
  closeStatus: 'notClosed',
  prepaymentAudit: 'prepaidNotAudited',
  receiveStatus: String(existing?.receiveStatus || '') === 'received' ? 'received' : 'notReceived',
  items: `${form.value.items.length}种`,
  operator: form.value.creator || '当前用户',
  creator: form.value.creator,
  createTime: form.value.createTime,
  salesman: form.value.salesman,
  department: form.value.department,
  receiveAddress: form.value.receiveAddress,
  docSource: form.value.docSource,
  externalNo: form.value.externalNo,
  printCount: form.value.printCount,
  warehouse: warehouseLabel,
  deliveryDate: form.value.deliveryDate,
  contact: form.value.contact,
  phone: form.value.phone,
  remark: form.value.remark,
  detailItems: form.value.items
  }
}

const persistOrder = () => {
  const companyId = requireTenantCompanyId()
  if (!companyId) return null
  const orders = JSON.parse(localStorage.getItem('sales-orders') || '[]')
  const orderData = buildOrderData()
  orderData.companyId = companyId
  const index = orders.findIndex((o: any) => o.id === form.value.orderNo)
  if (index > -1) {
    orders[index] = { ...orders[index], ...orderData }
  } else {
    orders.unshift(orderData)
  }
  localStorage.setItem('sales-orders', JSON.stringify(orders))
  void syncSalesOrdersToServer()
  return orderData
}

const validateForm = () => {
  ensureDefaultWarehouse()
  if (!form.value.customer) {
    ElMessage.warning('请选择客户')
    return false
  }
  if (!form.value.warehouse) {
    ElMessage.warning('请选择仓库')
    return false
  }
  if (form.value.items.length === 0) {
    ElMessage.warning('请至少添加一个商品')
    return false
  }
  const invalidLine = form.value.items.find(item => {
    const code = String(item.productCode || '').trim()
    if (!code) return true
    return !item.productLocked
  })
  if (invalidLine) {
    ElMessage.warning('明细中存在未匹配商品资料的商品，请确认查询条件后再保存')
    return false
  }
  return true
}

const syncProductsIfNeeded = () => {
  if (!isNormalCustomerCompany()) return
  const syncResult = syncSalesOrderItemsToLocalProducts(
    form.value.items as unknown as Record<string, unknown>[]
  )
  if (syncResult.added + syncResult.updated > 0) {
    const pendingNote = syncResult.added > 0 ? '（新增为待审核）' : ''
    ElMessage.info(`已将 ${syncResult.added + syncResult.updated} 条商品写入本企业商品资料${pendingNote}`)
  }
}

const handleSubmit = (options: { navigate?: boolean; resetAfter?: boolean } = {}) => {
  const { navigate = true, resetAfter = false } = options
  if (!validateForm()) return

  persistOrder()

  if (isEdit.value) {
    addOperationLog(form.value.orderNo, 'edit', '当前用户', '编辑销售订单')
    ElMessage.success('销售订单保存成功')
  } else {
    addOperationLog(form.value.orderNo, 'create', '当前用户', '创建销售订单')
    ElMessage.success('销售订单创建成功')
    isEdit.value = true
    orderId.value = form.value.orderNo
  }

  syncProductsIfNeeded()

  if (resetAfter) {
    form.value = {
      orderNo: generateOrderNo(),
      customer: '',
      customerCode: '',
      warehouse: '',
      date: new Date().toISOString().slice(0, 10),
      deliveryDate: '',
      contact: '',
      phone: '',
      remark: '',
      salesman: '',
      department: '',
      receiveAddress: '',
      creator: '当前用户',
      createTime: formatLocalDateTime(),
      docSource: '',
      externalNo: '',
      printCount: 0,
      auditStatus: 'notAudited',
      confirmStatus: CONFIRM_STATUS_UNCONFIRMED,
      auditor: '',
      auditTime: '',
      discountRate: 0,
      discountAmount: 0,
      receiptAccount: '',
      receiptMethod: '',
      depositRatio: 0,
      prepaidDeposit: 0,
      currentReceiptAmount: 0,
      enablePreDeduction: false,
      items: []
    }
    salesExpenses.value = []
    customerExpenses.value = []
    receiptAccounts.value = []
    ensureDefaultItemRows()
    return
  }

  if (navigate) router.push('/sales/order-list')
}

const handleSaveAndNew = () => {
  handleSubmit({ navigate: false, resetAfter: true })
}

const confirmStatusTagType = computed(() =>
  form.value.confirmStatus === CONFIRM_STATUS_CONFIRMED ? 'success' : 'warning'
)

const handleSaveAndAudit = () => {
  if (!validateForm()) return
  if (form.value.auditStatus === 'audited') {
    ElMessage.info('订单已审核')
    return
  }

  persistOrder()
  if (isEdit.value) {
    addOperationLog(form.value.orderNo, 'edit', '当前用户', '编辑销售订单')
    ElMessage.success('销售订单保存成功')
  } else {
    addOperationLog(form.value.orderNo, 'create', '当前用户', '创建销售订单')
    ElMessage.success('销售订单创建成功')
    isEdit.value = true
    orderId.value = form.value.orderNo
  }
  syncProductsIfNeeded()

  if (!autoConfirmSalesOrderIfNeeded()) return
  handleAuditToggle()
}

const handleAuditToggle = () => {
  if (!validateForm()) return

  if (form.value.auditStatus === 'audited') {
    ElMessageBox.confirm('确定要反审核该销售订单吗？', '反审核确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      form.value.auditStatus = 'notAudited'
      form.value.auditor = ''
      form.value.auditTime = ''
      resetSalesOrderConfirm()
      persistOrder()
      addOperationLog(form.value.orderNo, 'unaudit', '当前用户', '反审核销售订单')
      ElMessage.success('反审核成功')
    }).catch(() => {})
    return
  }

  if (!requireSalesOrderConfirmed()) return

  ElMessageBox.confirm('确定要审核该销售订单吗？', '审核确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    form.value.auditStatus = 'audited'
    form.value.auditor = getCurrentUserName()
    form.value.auditTime = formatLocalDateTime()
    const saved = persistOrder()
    if (!saved) return
    const collabResult = onSalesOrderAudited(saved)
    if (collabResult.poUpdated) {
      const orders = JSON.parse(localStorage.getItem('sales-orders') || '[]')
      const idx = orders.findIndex((o: any) => o.id === form.value.orderNo)
      if (idx >= 0) {
        orders[idx] = { ...orders[idx], receiveStatus: 'received' }
        localStorage.setItem('sales-orders', JSON.stringify(orders))
        void syncSalesOrdersToServer()
      }
    }
    addOperationLog(form.value.orderNo, 'audit', form.value.auditor, '审核销售订单')
    if (collabResult.poUpdated && collabResult.buyerOrderNo) {
      ElMessage.success(`审核成功，已回写采购订单 ${collabResult.buyerOrderNo} 接单状态`)
    } else if (collabResult.poPushed && collabResult.buyerOrderNo) {
      ElMessage.success(`审核成功，已向对方推送采购订单 ${collabResult.buyerOrderNo}，待对方审核核对`)
    } else if (collabResult.message) {
      ElMessage.warning(`销售订单已审核，${collabResult.message}`)
    } else {
      ElMessage.success('审核成功')
    }
  }).catch(() => {})
}

const handleFormGridSelectOnlyKeydown = (e: KeyboardEvent) => {
  handleFormGridSelectKeyboard(e)
}

const handleAddExpense = () => {
  if (isOrderAudited.value) {
    ElMessage.warning('订单已审核，不能修改金额信息')
    return
  }
  ElMessageBox.prompt('请输入费用名称', '添加销售费用', {
    confirmButtonText: '下一步',
    cancelButtonText: '取消',
    inputPlaceholder: '如：运费、装卸费'
  }).then(({ value }) => {
    if (!value?.trim()) return
    ElMessageBox.prompt('请输入费用金额', '添加销售费用', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '0.00',
      inputPattern: /^\d+(\.\d{1,2})?$/,
      inputErrorMessage: '请输入有效金额'
    }).then(({ value: amountStr }) => {
      salesExpenses.value.push({ name: value.trim(), amount: Number(amountStr) || 0 })
      ElMessage.success('费用已添加')
    }).catch(() => {})
  }).catch(() => {})
}

const handleAddCustomerExpense = () => {
  if (isOrderAudited.value) {
    ElMessage.warning('订单已审核，不能修改金额信息')
    return
  }
  ElMessageBox.prompt('请输入费用名称', '添加客户承担费用', {
    confirmButtonText: '下一步',
    cancelButtonText: '取消',
    inputPlaceholder: '如：运费、安装费'
  }).then(({ value }) => {
    if (!value?.trim()) return
    ElMessageBox.prompt('请输入费用金额', '添加客户承担费用', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '0.00',
      inputPattern: /^\d+(\.\d{1,2})?$/,
      inputErrorMessage: '请输入有效金额'
    }).then(({ value: amountStr }) => {
      customerExpenses.value.push({ name: value.trim(), amount: Number(amountStr) || 0 })
      ElMessage.success('费用已添加')
    }).catch(() => {})
  }).catch(() => {})
}

const handleAllocateDiscount = () => {
  if (isOrderAudited.value) {
    ElMessage.warning('订单已审核，不能修改金额信息')
    return
  }
  const discount = Number(form.value.discountAmount) || 0
  if (discount <= 0) {
    ElMessage.warning('请先填写整单折扣额')
    return
  }
  const validItems = form.value.items.filter(item => {
    const qty = Number(item.quantity) || 0
    return qty > 0 && Boolean(String(item.productCode || '').trim() || String(item.productName || '').trim())
  })
  if (!validItems.length) {
    ElMessage.warning('请先添加有效商品明细')
    return
  }
  validItems.forEach(item => calcRowAmount(item))
  const totalLineAmount = validItems.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  if (totalLineAmount <= 0) {
    ElMessage.warning('商品金额合计须大于 0')
    return
  }
  let allocated = 0
  validItems.forEach((row, idx) => {
    if (idx === validItems.length - 1) {
      row.orderDiscountShare = Number((discount - allocated).toFixed(2))
    } else {
      const share = Number((discount * Number(row.amount) / totalLineAmount).toFixed(2))
      row.orderDiscountShare = share
      allocated += share
    }
  })
  form.value.items.forEach(row => {
    if (!validItems.includes(row)) row.orderDiscountShare = 0
  })
  ElMessage.success('整单折扣已分摊至明细行')
}

const openMultiReceiptDialog = () => {
  if (isOrderAudited.value) return
  multiReceiptDraft.value = receiptAccounts.value.length
    ? receiptAccounts.value.map(r => ({ ...r }))
    : [{ account: form.value.receiptAccount || '', amount: Number(form.value.prepaidDeposit) || 0 }]
  showMultiReceiptDialog.value = true
}

const addMultiReceiptRow = () => {
  multiReceiptDraft.value.push({ account: '', amount: 0 })
}

const removeMultiReceiptRow = (index: number) => {
  if (multiReceiptDraft.value.length <= 1) return
  multiReceiptDraft.value.splice(index, 1)
}

const confirmMultiReceipt = () => {
  const rows = multiReceiptDraft.value.filter(r => r.account && Number(r.amount) > 0)
  if (!rows.length) {
    ElMessage.warning('请至少填写一条有效收款账户')
    return
  }
  receiptAccounts.value = rows.map(r => ({ account: r.account, amount: Number(r.amount) }))
  if (rows.length === 1) {
    form.value.receiptAccount = rows[0].account
  }
  showMultiReceiptDialog.value = false
  ElMessage.success('多账户收款已设置')
}

const applyDepositRatio = () => {
  if (isOrderAudited.value) {
    ElMessage.warning('订单已审核，不能修改金额信息')
    return
  }
  form.value.prepaidDeposit = prepayAmount.value
  ElMessage.success('已按订金比率更新预收订金')
}

const handleGeneratePrepay = () => {
  if (isOrderAudited.value) {
    ElMessage.warning('订单已审核，不能修改金额信息')
    return
  }
  if (!form.value.customer) {
    ElMessage.warning('请先选择客户')
    return
  }
  let amount = Number(form.value.prepaidDeposit) || 0
  if (amount <= 0) {
    form.value.prepaidDeposit = prepayAmount.value
    amount = Number(form.value.prepaidDeposit) || 0
  }
  if (amount <= 0) {
    ElMessage.warning('请填写预收订金或设置订金比率')
    return
  }

  persistOrder()

  const primaryAccount = receiptAccounts.value.length
    ? resolveReceiptAccountLabel(receiptAccounts.value[0].account)
    : resolveReceiptAccountLabel(form.value.receiptAccount)

  const doc = saveFundDocument({
    type: 'preReceipt',
    partner: form.value.customer,
    partnerCode: form.value.customerCode || undefined,
    account: primaryAccount || '工商银行',
    date: form.value.date || new Date().toISOString().slice(0, 10),
    amount,
    settlementType: mapReceiptMethodToSettlement(form.value.receiptMethod),
    remark: receiptAccounts.value.length > 1
      ? `销售订单 ${form.value.orderNo} 预收订金（${receiptAccounts.value.length}个账户）`
      : `销售订单 ${form.value.orderNo} 预收订金`,
    creator: getCurrentUserName(),
    auditStatus: 'notAudited',
    sourceOrderNo: form.value.enablePreDeduction ? form.value.orderNo : undefined
  })
  ElMessage.success(`预收款单 ${doc.id} 已生成，可在资金模块查看`)
}

const handleCancel = () => {
  router.push('/sales/order-list')
}

const hasDraftChanges = () => {
  if (String(form.value.customer || '').trim()) return true
  if (String(form.value.remark || '').trim()) return true
  return form.value.items.some(item =>
    String(item.productCode || '').trim() || String(item.productName || '').trim()
  )
}

const navCurrentId = computed(() => String(orderId.value || route.params.id || ''))

const {
  canNavFirst,
  canNavPrev,
  canNavNext,
  canNavLast,
  handleNavFirst,
  handleNavPrev,
  handleNavNext,
  handleNavLast
} = useOrderDocumentNav({
  loadOrderIds: loadSalesOrderNavIds,
  currentId: navCurrentId,
  editRoutePath: id => `/sales/order-list/create/${id}`,
  hasUnsavedChanges: hasDraftChanges
})

const buildPrintData = () => ({
  orderDate: form.value.date,
  deliveryDate: form.value.deliveryDate,
  customerName: form.value.customer,
  customerCode: form.value.customerCode,
  customerAddress: '',
  customerPhone: form.value.phone,
  contact: form.value.contact,
  documentNo: form.value.orderNo,
  warehouseName: resolveWarehouseLabel(form.value.warehouse) || form.value.warehouse,
  remark: form.value.remark,
  items: form.value.items.map(row => ({
    productCode: row.productCode,
    bidType: row.bidType || '',
    productName: row.productName,
    spec: row.spec,
    manufacturer: row.manufacturer || '',
    unit: row.unit,
    quantity: Number(row.quantity),
    unitPrice: Number(row.price),
    amount: Number(row.amount),
    batchNo: row.batchNo || '',
    productionDate: row.productionDate || '',
    expiryDate: row.expiryDate || '',
    registrationNo: row.registrationNo || '',
    productionLicenseNo: row.productionLicenseNo || '',
    storageCondition: row.storageCondition || ''
  })),
  totalAmount: totalAmount.value
})

const handlePrint = () => {
  if (form.value.items.length === 0) {
    ElMessage.warning('请先添加商品')
    return
  }
  try {
    print('salesOrder', buildPrintData())
  } catch (error) {
    ElMessage.error('打印失败：' + (error as Error).message)
  }
}

const handlePrintPreview = () => {
  if (form.value.items.length === 0) {
    ElMessage.warning('请先添加商品')
    return
  }
  try {
    preview('salesOrder', buildPrintData())
  } catch (error) {
    ElMessage.error('预览失败：' + (error as Error).message)
  }
}

const handleMore = (command: string) => {
  const map: Record<string, string> = {
    copy: '复制单据',
    template: '保存为模板',
    export: '导出',
    import: '导入'
  }
  ElMessage.success(map[command] || '操作成功')
}
</script>

<template>
  <div class="erp-page">
    <div v-if="form.auditStatus === 'audited'" class="audit-seal" aria-hidden="true">
      <div class="audit-seal-frame">
        <span class="audit-seal-text">已审核</span>
      </div>
    </div>

    <div class="page-title-bar">
      <div class="title-left">
        <h2>销售订单</h2>
        <div class="status-badges">
          <div v-if="salesOrderConfirmEnabled" class="audit-badge">
            <el-tag :type="confirmStatusTagType" effect="plain" size="small">
              {{ form.confirmStatus || CONFIRM_STATUS_UNCONFIRMED }}
            </el-tag>
          </div>
          <div v-if="form.auditStatus === 'audited'" class="audit-badge">
            <el-tag type="danger" effect="plain" size="small" class="audit-tag-seal">已审核</el-tag>
            <span v-if="form.auditor || form.auditTime" class="audit-meta">
              {{ form.auditor }}<template v-if="form.auditor && form.auditTime"> · </template>{{ form.auditTime }}
            </span>
          </div>
        </div>
      </div>
      <div class="title-actions">
        <el-button type="primary" size="small" @click="handleSubmit()">保存</el-button>
        <el-button
          type="primary"
          size="small"
          plain
          :disabled="form.auditStatus === 'audited'"
          @click="handleSaveAndAudit"
        >保存并审核</el-button>
        <el-button type="primary" size="small" plain @click="handleSaveAndNew">保存并新增</el-button>
        <el-button
          v-if="canConfirmSalesOrder"
          size="small"
          type="success"
          @click="handleConfirmSalesOrder"
        >确定</el-button>
        <el-button
          size="small"
          :type="form.auditStatus === 'audited' ? 'warning' : 'success'"
          @click="handleAuditToggle"
        >{{ form.auditStatus === 'audited' ? '反审核' : '审核' }}</el-button>
        <el-dropdown split-button type="primary" size="small" class="btn-print" @click="handlePrint">
          打印
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handlePrintPreview">打印预览</el-dropdown-item>
              <el-dropdown-item @click="handlePrint">直接打印</el-dropdown-item>
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
              <el-dropdown-item command="template">保存为模板</el-dropdown-item>
              <el-dropdown-item command="export">导出</el-dropdown-item>
              <el-dropdown-item command="import">导入</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <div class="nav-actions">
          <el-button size="small" :icon="DArrowLeft" circle :disabled="!canNavFirst" title="首张" @click="handleNavFirst" />
          <el-button size="small" :icon="ArrowLeft" circle :disabled="!canNavPrev" title="上一张" @click="handleNavPrev" />
          <el-button size="small" :icon="ArrowRight" circle :disabled="!canNavNext" title="下一张" @click="handleNavNext" />
          <el-button size="small" :icon="DArrowRight" circle :disabled="!canNavLast" title="末张" @click="handleNavLast" />
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
                v-if="field.key === 'customer'"
                v-model="form.customer"
                filterable
                default-first-option
                placeholder="请选择客户"
                size="small"
                style="width: 100%;"
                @change="handleCustomerChange"
              >
                <el-option
                  v-for="c in customerOptions"
                  :key="c.code || c.value"
                  :label="c.label"
                  :value="c.value"
                />
              </el-select>

              <el-input
                v-else-if="field.type === 'input'"
                v-model="form[field.key as keyof typeof form]"
                :maxlength="field.maxLength"
                size="small"
                :disabled="field.disabled"
              />

              <el-select
                v-else-if="field.type === 'select'"
                v-model="form[field.key as keyof typeof form]"
                default-first-option
                size="small"
                style="width: 100%;"
                clearable
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
                :disabled="field.disabled"
                @keydown.enter="(e: KeyboardEvent) => handleDateFieldEnter(field, e)"
              />

              <el-date-picker
                v-else-if="field.type === 'datetime'"
                v-model="form[field.key as keyof typeof form]"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                size="small"
                style="width: 100%;"
                :disabled="field.disabled"
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
                :disabled="field.disabled"
              />

              <el-input
                v-else-if="field.type === 'textarea'"
                v-model="form[field.key as keyof typeof form]"
                type="textarea"
                :rows="2"
                size="small"
                :disabled="field.disabled"
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
          <p v-if="showPlatformHint" class="product-query-hint">
            商品查询：编码、名称、规格、厂家，空格隔开，不限顺序；下拉可勾选多项一次添加；保存后写入本企业商品资料（待审核）。
          </p>
          <p v-else class="product-query-hint">商品查询：编码、名称、规格、厂家，空格隔开，不限顺序；下拉可勾选多项一次添加。</p>
          <div class="toolbar-right">
            <el-button size="small" plain @click="openBatchAdd">批量选择</el-button>
            <el-button size="small" plain @click="addItem">添加行</el-button>
          </div>
        </div>

        <div ref="itemsTableWrapRef" class="items-table-wrap" @keydown.capture="handleItemsTableKeydown">
          <div v-if="sortedVisibleItemColumns.length === 0" class="header-empty-tip">请点击「商品信息设置」选择要显示的列</div>
          <el-table
            v-else
            :key="itemsTableRenderKey"
            ref="itemsTableRef"
            :data="form.items"
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
                  <div class="row-index-actions">
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
              <template #header>
                <DocumentSortHeader
                  v-if="isColumnSortable(col)"
                  :label="col.label"
                  :required="col.required"
                  :sort-icon="getItemSortIcon(col.key)"
                  :active="!!itemSortOrders[col.key]"
                  :align="col.align === 'right' ? 'right' : 'center'"
                  @sort="handleItemColumnSort(col.key)"
                />
                <span v-else-if="col.required" class="required-col">{{ col.label }}</span>
                <span v-else>{{ col.label }}</span>
              </template>
              <template #default="{ row }">
                <div class="item-cell" :data-col-key="col.key">
                <div v-if="col.key === 'productCode'" class="code-cell">
                  <el-autocomplete
                    v-model="row.productCode"
                    :ref="(el: any) => setProductAutocompleteRef(row, 'productCode', el)"
                    size="small"
                    class="product-code-autocomplete"
                    popper-class="product-suggest-popper"
                    :debounce="150"
                    :trigger-on-focus="false"
                    highlight-first-item
                    :fetch-suggestions="(_q, cb) => fetchItemProductSuggestions(row, cb)"
                    @select="(item: ItemProductSuggestion) => handleItemProductSuggestionSelect(row, item)"
                    @visible-change="(visible: boolean) => handleSuggestVisibleChange(row, visible)"
                    @blur="handleItemProductBlur(row)"
                    @input="clearProductLock(row)"
                  >
                    <template #header>
                      <div class="product-suggest-item is-header">
                        <span class="col-check">
                          <el-checkbox
                            v-if="showSuggestMultiBar(row)"
                            :model-value="isAllSuggestSelected(row)"
                            :indeterminate="isSuggestSelectionIndeterminate(row)"
                            @change="(val: boolean) => toggleSelectAllSuggest(row, val)"
                            @click.stop
                          />
                        </span>
                        <span class="col-code">商品编码</span>
                        <span class="col-name">商品名称</span>
                        <span class="col-spec">规格型号</span>
                        <span class="col-mfr">生产厂家</span>
                        <span class="col-price is-num">上次价格</span>
                        <span class="col-source">来源</span>
                      </div>
                      <div v-if="showSuggestMultiBar(row)" class="suggest-multi-bar">
                        <span class="suggest-multi-tip">勾选多项后一次添加；单击行仍为单选</span>
                        <el-button
                          size="small"
                          type="primary"
                          :disabled="suggestSelectedCount(row) === 0"
                          @mousedown.prevent
                          @click.stop="confirmSuggestMultiAdd(row)"
                        >
                          添加已选{{ suggestSelectedCount(row) > 0 ? `（${suggestSelectedCount(row)}）` : '' }}
                        </el-button>
                      </div>
                    </template>
                    <template #default="{ item: suggestion }">
                      <div class="product-suggest-item">
                        <span class="col-check" @mousedown.stop @click.stop>
                          <el-checkbox
                            v-if="showSuggestMultiBar(row)"
                            :model-value="isSuggestSelected(row, suggestion.code)"
                            @change="(val: boolean) => toggleSuggestSelection(row, suggestion, val)"
                          />
                        </span>
                        <span class="col-code s-code">{{ suggestion.code }}</span>
                        <span class="col-name s-name" :title="suggestion.name">{{ suggestion.name }}</span>
                        <span class="col-spec s-spec" :title="suggestion.spec">{{ suggestion.spec || '-' }}</span>
                        <span class="col-mfr s-mfr" :title="suggestion.manufacturer">{{ suggestion.manufacturer || '-' }}</span>
                        <span class="col-price s-last-price is-num">{{ formatMoney(suggestion.lastPrice) }}</span>
                        <span class="col-source">{{ suggestion.source === 'platform' ? '平台' : '本地' }}</span>
                      </div>
                    </template>
                  </el-autocomplete>
                </div>
                <el-input
                  v-else-if="col.key === 'productName'"
                  v-model="row.productName"
                  size="small"
                  class="product-bound-field"
                  readonly
                  tabindex="-1"
                  @focus="handleBoundProductColumnFocus(row, 'productName')"
                />
                <el-input
                  v-else-if="col.key === 'spec'"
                  v-model="row.spec"
                  size="small"
                  class="product-bound-field"
                  readonly
                  tabindex="-1"
                  @focus="handleBoundProductColumnFocus(row, 'spec')"
                />
                <el-input
                  v-else-if="col.key === 'manufacturer'"
                  v-model="row.manufacturer"
                  size="small"
                  class="product-bound-field"
                  readonly
                  tabindex="-1"
                  @focus="handleBoundProductColumnFocus(row, 'manufacturer')"
                />
                <el-input
                  v-else-if="col.key === 'registrationNo'"
                  v-model="row.registrationNo"
                  size="small"
                  class="product-bound-field"
                  readonly
                  tabindex="-1"
                  @focus="handleBoundProductColumnFocus(row, 'registrationNo')"
                />
                <el-input
                  v-else-if="col.key === 'productionLicenseNo'"
                  v-model="row.productionLicenseNo"
                  size="small"
                  class="product-bound-field"
                  readonly
                  tabindex="-1"
                  @focus="handleBoundProductColumnFocus(row, 'productionLicenseNo')"
                />
                <el-input-number
                  v-else-if="col.key === 'quantity'"
                  v-model="row.quantity"
                  :min="0"
                  :precision="3"
                  :controls="false"
                  size="small"
                  class="cell-number"
                  @change="calcRowAmount(row)"
                  @keydown.capture="(e: KeyboardEvent) => handleItemCellEnterKeydown(e, row, 'quantity')"
                />
                <el-input v-else-if="col.key === 'unit'" v-model="row.unit" size="small" />
                <el-input-number
                  v-else-if="col.key === 'price'"
                  v-model="row.price"
                  :min="0"
                  :precision="4"
                  :controls="false"
                  size="small"
                  class="cell-number"
                  @change="calcRowAmount(row)"
                  @keydown.capture="(e: KeyboardEvent) => handleItemCellEnterKeydown(e, row, 'price')"
                />
                <span v-else-if="col.key === 'lastPrice'" class="calc-text">{{ formatMoney(row.lastPrice) }}</span>
                <span v-else-if="col.key === 'amount'" class="amount-text">{{ formatMoney(row.amount) }}</span>
                <BatchNoCellKeyboard
                  v-else-if="col.key === 'batchNo'"
                  :row="row"
                  :global-format="loadBatchNoFormat()"
                  @format-change="handleBatchFormatChange(row)"
                  @batch-input="handleBatchNoInput(row)"
                />
                <div
                  v-else-if="col.key === 'productionDate'"
                  class="cell-date-wrap"
                  @keydown.capture="(e: KeyboardEvent) => handleItemDateKeydown(e, row, 'productionDate')"
                >
                  <el-date-picker
                    v-model="row.productionDate"
                    type="date"
                    value-format="YYYY-MM-DD"
                    size="small"
                    class="cell-date"
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
                    @change="handleExpiryDateChange(row)"
                  />
                </div>
                <el-input
                  v-else-if="col.key === 'storageCondition'"
                  v-model="row.storageCondition"
                  size="small"
                  class="product-bound-field"
                  readonly
                  tabindex="-1"
                  @focus="handleBoundProductColumnFocus(row, 'storageCondition')"
                />
                <el-input
                  v-else-if="col.key === 'bidType'"
                  v-model="row.bidType"
                  size="small"
                  class="product-bound-field"
                  readonly
                  tabindex="-1"
                  @focus="handleBoundProductColumnFocus(row, 'bidType')"
                />
                <el-input
                  v-else-if="col.key === 'remark'"
                  v-model="row.itemRemark"
                  size="small"
                  maxlength="200"
                />
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div class="summary-bar">
          <div class="summary-left">
            <span>数量合计：<strong>{{ formatQty(totalQuantity) }}</strong></span>
            <span>金额合计：<strong>{{ formatMoney(totalAmount) }}</strong></span>
          </div>
          <div class="summary-right">
            成交金额：<strong>{{ formatMoney(receivableAmount) }}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- 金额信息 -->
    <div class="section-card">
      <div class="section-header" @click="amountInfoCollapsed = !amountInfoCollapsed">
        <span class="section-icon" :class="{ collapsed: amountInfoCollapsed }">▼</span>
        <h3>金额信息</h3>
      </div>
      <div class="section-body amount-section" v-show="!amountInfoCollapsed" @keydown.capture="handleFormGridSelectOnlyKeydown">
        <div class="form-grid amount-grid">
          <div class="form-field">
            <label class="label-with-link">
              整单折扣额
              <button type="button" class="inline-link" :disabled="isOrderAudited" @click="handleAllocateDiscount">分摊</button>
            </label>
            <el-input-number
              v-model="form.discountAmount"
              :min="0"
              :precision="2"
              :controls="false"
              size="small"
              style="width: 100%;"
              :disabled="isOrderAudited"
            />
          </div>
          <div class="form-field">
            <label>整单折扣率 %</label>
            <el-input-number
              v-model="form.discountRate"
              :min="0"
              :max="100"
              :precision="2"
              :controls="false"
              size="small"
              style="width: 100%;"
              :disabled="isOrderAudited"
            />
          </div>
          <div class="form-field">
            <label>成交金额</label>
            <span class="deal-amount-value">{{ formatMoney(receivableAmount) }}</span>
          </div>
        </div>
        <div class="expense-dual-row">
          <div class="expense-block">
            <div class="expense-block-head">
              <span class="expense-label">预计销售费用明细</span>
              <button type="button" class="toolbar-link" :disabled="isOrderAudited" @click="handleAddExpense">+ 添加费用</button>
              <span class="expense-total">合计: {{ formatMoney(salesExpenseTotal) }}</span>
            </div>
            <div v-if="salesExpenses.length" class="expense-tags">
              <el-tag
                v-for="(exp, idx) in salesExpenses"
                :key="`s-${idx}`"
                size="small"
                closable
                :disable-transitions="false"
                @close="!isOrderAudited && salesExpenses.splice(idx, 1)"
              >
                {{ exp.name }} {{ formatMoney(exp.amount) }}
              </el-tag>
            </div>
          </div>
          <div class="expense-block">
            <div class="expense-block-head">
              <span class="expense-label">预计客户承担费用明细</span>
              <button type="button" class="toolbar-link" :disabled="isOrderAudited" @click="handleAddCustomerExpense">+ 添加费用</button>
              <span class="expense-total">合计: {{ formatMoney(customerExpenseTotal) }}</span>
            </div>
            <div v-if="customerExpenses.length" class="expense-tags">
              <el-tag
                v-for="(exp, idx) in customerExpenses"
                :key="`c-${idx}`"
                size="small"
                closable
                type="warning"
                :disable-transitions="false"
                @close="!isOrderAudited && customerExpenses.splice(idx, 1)"
              >
                {{ exp.name }} {{ formatMoney(exp.amount) }}
              </el-tag>
            </div>
          </div>
        </div>
        <div class="amount-divider" />
        <div class="form-grid amount-grid">
          <div class="form-field">
            <label class="label-with-link">
              收款账户
              <button type="button" class="inline-link" :disabled="isOrderAudited" @click="openMultiReceiptDialog">多账户收款</button>
            </label>
            <el-select
              v-model="form.receiptAccount"
              default-first-option
              size="small"
              :placeholder="multiReceiptSummary || '请选择'"
              style="width: 100%;"
              :disabled="isOrderAudited"
            >
              <el-option v-for="opt in receiptAccountOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
            <span v-if="multiReceiptSummary" class="field-hint">{{ multiReceiptSummary }}</span>
          </div>
          <div class="form-field">
            <label>收款方式</label>
            <el-select
              v-model="form.receiptMethod"
              default-first-option
              size="small"
              placeholder="请选择"
              style="width: 100%;"
              :disabled="isOrderAudited"
            >
              <el-option v-for="opt in receiptMethodOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </div>
          <div class="form-field">
            <label class="label-with-link">
              本次订金比率 %
              <button type="button" class="icon-link" :disabled="isOrderAudited" title="按比率计算预收订金" @click="applyDepositRatio">
                <el-icon><Coin /></el-icon>
              </button>
            </label>
            <el-input-number
              v-model="form.depositRatio"
              :min="0"
              :max="100"
              :precision="2"
              :controls="false"
              size="small"
              style="width: 100%;"
              :disabled="isOrderAudited"
            />
          </div>
          <div class="form-field">
            <label class="label-with-link">
              预收订金
              <button type="button" class="inline-link" :disabled="isOrderAudited" @click="handleGeneratePrepay">生成预收单</button>
            </label>
            <div class="prepay-row">
              <el-input-number
                v-model="form.prepaidDeposit"
                :min="0"
                :precision="2"
                :controls="false"
                size="small"
                style="flex: 1;"
                :disabled="isOrderAudited"
              />
              <el-checkbox v-model="form.enablePreDeduction" size="small" :disabled="isOrderAudited">定向抵扣</el-checkbox>
              <el-tooltip content="开启后，预收订金将按本销售订单号定向抵扣应收" placement="top">
                <el-icon class="help-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <ProductBatchSelectDialog
    v-model="showBatchAdd"
    :products="batchProductList"
    @confirm="confirmBatchAdd"
  />

  <el-dialog v-model="showMultiReceiptDialog" title="多账户收款" width="560px" draggable>
    <div class="multi-receipt-dialog">
      <div v-for="(row, idx) in multiReceiptDraft" :key="idx" class="multi-receipt-row">
        <el-select v-model="row.account" size="small" placeholder="收款账户" style="flex: 1;">
          <el-option v-for="opt in receiptAccountOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-input-number
          v-model="row.amount"
          :min="0"
          :precision="2"
          :controls="false"
          size="small"
          placeholder="金额"
          style="width: 140px;"
        />
        <el-button size="small" :icon="Minus" :disabled="multiReceiptDraft.length <= 1" @click="removeMultiReceiptRow(idx)" />
      </div>
      <el-button size="small" type="primary" link :icon="Plus" @click="addMultiReceiptRow">添加账户</el-button>
    </div>
    <template #footer>
      <el-button @click="showMultiReceiptDialog = false">取消</el-button>
      <el-button type="primary" @click="confirmMultiReceipt">确定</el-button>
    </template>
  </el-dialog>

  <!-- 表头设置 -->
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

  <!-- 商品信息列设置 -->
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
@import '@/styles/order-form-basic-info.scss';
@import '@/styles/document-table-sort.scss';

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
    flex-wrap: nowrap;
    flex-shrink: 0;
    max-width: 100%;
    overflow-x: auto;
  }

  .nav-actions {
    display: flex;
    gap: 4px;
    margin-left: 8px;
    padding-left: 8px;
    border-left: 1px solid #e8e8e8;
    flex-shrink: 0;
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

.batch-cell-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;

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

    strong {
      color: #333;
      font-weight: 600;
    }
  }
}

.deal-amount-value {
  display: block;
  min-height: 24px;
  line-height: 24px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 24px;

  &.amount-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 4px;

    label {
      font-size: 12px;
      color: #666;
      line-height: 20px;
    }

    .label-with-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .inline-link {
      border: none;
      background: none;
      color: #1677ff;
      font-size: 12px;
      cursor: pointer;
      padding: 0;

      &:disabled {
        color: #c0c4cc;
        cursor: not-allowed;
      }
    }

    .prepay-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .field-hint {
      font-size: 11px;
      color: #1677ff;
      line-height: 16px;
    }

    .icon-link {
      border: none;
      background: none;
      color: #1677ff;
      cursor: pointer;
      padding: 0;
      display: inline-flex;
      align-items: center;

      &:disabled {
        color: #c0c4cc;
        cursor: not-allowed;
      }
    }

    .help-icon {
      color: #909399;
      font-size: 14px;
      cursor: help;
    }
  }
}

.amount-section {
  .expense-dual-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px 24px;
    padding: 12px 0;
    margin: 4px 0;
    border-top: 1px dashed #e8e8e8;
    border-bottom: 1px dashed #e8e8e8;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }

  .expense-block {
    min-width: 0;

    .expense-block-head {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px 12px;
      margin-bottom: 8px;
    }
  }

  .amount-divider {
    height: 1px;
    background: #f0f0f0;
    margin: 8px 0 12px;
  }

  .expense-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    padding: 12px 0;
    margin: 4px 0 12px;
    border-top: 1px dashed #e8e8e8;
    border-bottom: 1px dashed #e8e8e8;

    .expense-label {
      font-size: 12px;
      color: #666;
    }

    .expense-total {
      margin-left: auto;
      font-size: 13px;
      color: #333;
      font-weight: 500;
    }

    .expense-tags {
      width: 100%;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }

  .toolbar-link {
    border: none;
    background: none;
    color: #1677ff;
    font-size: 12px;
    cursor: pointer;
    padding: 0;

    &:disabled {
      color: #c0c4cc;
      cursor: not-allowed;
    }
  }
}

.multi-receipt-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .multi-receipt-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
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
    border: 1px solid var(--yx-table-line-color);

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
      min-height: var(--yx-table-detail-row-height);

      .row-index-num {
        line-height: calc(var(--yx-table-detail-row-height) - var(--yx-table-cell-padding-y) * 2);
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
      background-color: var(--yx-table-line-color);
    }

    th.el-table__cell,
    td.el-table__cell {
      border-color: var(--yx-table-line-color) !important;
      border-right: 1px solid var(--yx-table-line-color);
      border-bottom: 1px solid var(--yx-table-line-color);
      padding: var(--yx-table-cell-padding-y) 8px;
      vertical-align: middle;
    }

    th.el-table__cell .cell,
    td.el-table__cell .cell {
      padding: 0;
      line-height: 22px;
    }

    .el-table__header-wrapper th.el-table__cell {
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
    }

    .product-bound-field {
      width: 100%;

      :deep(.el-input__inner) {
        cursor: default;
        background-color: #f5f7fa;
        color: #606266;
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

    .calc-text {
      color: #666;
      font-size: 13px;
      display: block;
      text-align: right;
    }

    .amount-text {
      color: #165dff;
      font-weight: 600;
      font-size: 13px;
      display: block;
      text-align: right;
    }

    .el-table__footer-wrapper td.el-table__cell {
      background: var(--yx-table-row-even-bg) !important;
      color: #333;
      font-weight: 600;
      border-color: var(--yx-table-line-color) !important;
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
  --product-suggest-cols: 28px 80px 180px 100px 140px 72px 56px;

  min-width: 788px !important;
  width: 788px !important;

  .el-autocomplete-suggestion__header {
    padding: 0;
    margin: 0;
    border-bottom: 1px solid #e4e7ed;
  }

  .suggest-multi-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 10px;
    background: #f0f7ff;
    border-top: 1px solid #d9ecff;
  }

  .suggest-multi-tip {
    font-size: 12px;
    color: #606266;
  }

  .col-check {
    display: flex;
    align-items: center;
    justify-content: center;
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
