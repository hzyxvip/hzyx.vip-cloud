<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { print, preview } from '@/utils/printService'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { TableInstance } from 'element-plus'
import { useTableStyle } from '@/composables/useTableStyle'
import {
  ArrowLeft, ArrowRight, DArrowLeft, DArrowRight,
  MoreFilled, Plus, Minus, CopyDocument, Setting
} from '@element-plus/icons-vue'
import { loadProductList, findProductsByCompositeQuery, type ProductMaster } from '@/utils/productStore'
import {
  searchPlatformProducts,
  applyPlatformProductToSalesItem,
  findPlatformProductByCode,
  type PlatformProduct
} from '@/utils/platformProductStore'
import {
  syncSalesOrderItemsToLocalProducts,
  isNormalCustomerCompany
} from '@/utils/customerProductService'
import { onSalesOrderAudited } from '@/utils/platformCollaborationService'
import {
  arrowKeyToDirection,
  findFieldKeyFromElement,
  focusCellControl,
  focusFieldByKey,
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
  'unit', 'quantity', 'price', 'amount',
  'batchNo', 'productionDate', 'expiryDate', 'storageCondition', 'bidType', 'remark'
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
  { key: 'price', label: '单价', prop: 'price', align: 'right' },
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
  type: 'input' | 'select' | 'date' | 'datetime' | 'number' | 'textarea'
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
  'orderNo', 'date', 'customer', 'customerCode',
  'warehouse', 'deliveryDate', 'contact', 'phone', 'remark',
  'auditor', 'auditTime'
]

const HEADER_FIELD_DEFINITIONS: HeaderFieldOption[] = [
  { key: 'orderNo', label: '订单号', type: 'input', disabled: true },
  { key: 'date', label: '下单日期', type: 'date', required: true },
  { key: 'customer', label: '客户', type: 'select', options: 'customerOptions', required: true },
  { key: 'customerCode', label: '客户编码', type: 'input', disabled: true },
  { key: 'warehouse', label: '仓库', type: 'select', options: 'warehouseOptions' },
  { key: 'deliveryDate', label: '预计发货', type: 'date' },
  { key: 'contact', label: '联系人', type: 'input' },
  { key: 'phone', label: '联系电话', type: 'input' },
  { key: 'remark', label: '备注', type: 'textarea', fullWidth: true, maxLength: 200 },
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

const warehouseOptions = [
  { label: '北京仓库', value: 'beijing' },
  { label: '上海仓库', value: 'shanghai' }
]

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
  localStorage.setItem('sales-field-config', JSON.stringify(selectedFields.value))
  localStorage.setItem('sales-field-order', JSON.stringify(fieldOptions.value.map(f => f.key)))
  showFieldSelector.value = false
  ElMessage.success('表头设置已保存')
}

initHeaderFieldConfig()

const customerList = ref<any[]>([])

const customerOptions = computed(() =>
  customerList.value.map(c => ({ label: c.name, value: c.name, code: c.code || '' }))
)

const getOptions = (optionsKey?: string) => {
  if (optionsKey === 'customerOptions') return customerOptions.value
  if (optionsKey === 'warehouseOptions') return warehouseOptions
  return []
}

const isEdit = ref(false)
const orderId = ref('')
const basicInfoCollapsed = ref(false)
const itemsCollapsed = ref(false)

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
  { key: 'amount', label: '金额', defaultWidth: 100 },
  { key: 'batchNo', label: '生产批号', defaultWidth: 110 },
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
  auditor: '',
  auditTime: '',
  items: [] as OrderItem[]
})

const showPlatformHint = computed(() => isNormalCustomerCompany())

const totalQuantity = computed(() =>
  form.value.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
)

const totalAmount = computed(() =>
  form.value.items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
)

const applyLocalProductToItem = (target: OrderItem, product: ProductMaster) => {
  target.productCode = product.code
  target.productName = product.name
  target.spec = product.spec || ''
  target.unit = product.measureUnit || product.purchaseUnit || '盒'
  target.price = Number(product.lastPrice ?? product.unitPrice ?? 0)
  target.manufacturer = product.manufacturer || ''
  target.registrationNo = product.registerNo || ''
  target.productionLicenseNo = product.licenseNo || ''
  target.storageCondition = product.storageCondition || ''
  target._fromPlatform = Boolean(product.fromPlatform)
  target._platformProductCode = String(product.platformProductCode || '')
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

const isRowProductLocked = (row: OrderItem) => Boolean(row.productLocked)

const clearProductLock = (row: OrderItem) => {
  if (row._skipProductBlurSearch) return
  row.productLocked = false
}

const applySuggestionToItem = (target: OrderItem, suggestion: ItemProductSuggestion) => {
  if (suggestion.source === 'platform') {
    applyPlatformProductToSalesItem(target as Record<string, unknown>, suggestion.raw as PlatformProduct)
    return
  }
  applyLocalProductToItem(target, suggestion.raw as ProductMaster)
}

const handleItemProductSuggestionSelect = (row: OrderItem, suggestion: ItemProductSuggestion) => {
  row._skipProductBlurSearch = true
  applySuggestionToItem(row, suggestion)
  row.productLocked = true
  calcRowAmount(row)
}

const handleItemProductSearch = (item: OrderItem, options: { silent?: boolean } = {}) => {
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

const handleItemProductBlur = (item: OrderItem) => {
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
    calcRowAmount(row)
    form.value.items.push(row)
  })
  ElMessage.success(`成功添加 ${batchSelectedProducts.value.length} 个商品`)
  showBatchAdd.value = false
  syncItemsTableLayout()
}


const handleItemDateKeydown = (e: KeyboardEvent, row: OrderItem, colKey: string) => {
  const rowIndex = form.value.items.indexOf(row)
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
  itemTableColumnKeys.value.filter(key => key !== 'index' && key !== 'amount')
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
  if (direction === 'down' && rowIndex < form.value.items.length - 1) {
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
  if (rowIndex < form.value.items.length - 1) {
    focusItemCell(rowIndex + 1, cols[0])
    return
  }
  addItem()
  nextTick(() => focusItemCell(form.value.items.length - 1, cols[0]))
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
    const row = form.value.items[pos.row]
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

const generateOrderNo = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return `SO${year}${month}${day}${random}`
}

const formatLocalDateTime = () =>
  new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')

const warehouseLabels: Record<string, string> = {
  beijing: '北京仓库',
  shanghai: '上海仓库'
}

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
  externalNo: String(order.externalNo || ''),
  printCount: Number(order.printCount) || 0,
  auditStatus: (order.auditStatus === 'audited' ? 'audited' : 'notAudited') as 'notAudited' | 'audited',
  auditor: String(order.auditor || ''),
  auditTime: String(order.auditTime || ''),
  items: (order.detailItems as OrderItem[]) || []
})

onMounted(() => {
  const now = new Date()
  form.value.date = now.toISOString().slice(0, 10)
  form.value.orderNo = generateOrderNo()
  form.value.createTime = formatLocalDateTime()

  const customers = JSON.parse(localStorage.getItem('customers') || '[]')
  customerList.value = customers

  const editId = route.params.id as string
  if (editId) {
    isEdit.value = true
    orderId.value = editId
    const orders = JSON.parse(localStorage.getItem('sales-orders') || '[]')
    const order = orders.find((o: { id: string }) => o.id === editId)
    if (order) {
      form.value = applyOrderToForm(order)
    }
  }

  if (form.value.items.length === 0) {
    addItem()
  }

  nextTick(() => {
    bindItemsTableResizeObserver()
    syncItemsTableLayout()
  })
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

const handleCustomerChange = (customerName: string) => {
  const customer = customerList.value.find(c => c.name === customerName)
  if (customer) {
    form.value.customerCode = customer.code || ''
    form.value.contact = customer.contact || ''
    form.value.phone = customer.phone || ''
  }
}

const addItem = () => {
  form.value.items.push(createEmptyItemRow())
  syncItemsTableLayout()
}

const insertItemAfter = (index: number) => {
  form.value.items.splice(index + 1, 0, createEmptyItemRow())
  syncItemsTableLayout()
}

const handleBatchSelectionChange = (rows: ProductMaster[]) => {
  batchSelectedProducts.value = rows
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

const buildOrderData = () => ({
  id: form.value.orderNo,
  customer: form.value.customer,
  customerCode: form.value.customerCode,
  date: form.value.date,
  amount: `¥${totalAmount.value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
  status: form.value.auditStatus === 'audited' ? 'processing' : 'pending',
  auditStatus: form.value.auditStatus,
  auditor: form.value.auditor,
  auditTime: form.value.auditTime,
  executeStatus: 'notExecuted',
  warehouseStatus: 'notOutWarehoused',
  closeStatus: 'notClosed',
  prepaymentAudit: 'prepaidNotAudited',
  receiveStatus: form.value.auditStatus === 'audited' ? 'received' : 'notReceived',
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
  warehouse: form.value.warehouse,
  deliveryDate: form.value.deliveryDate,
  contact: form.value.contact,
  phone: form.value.phone,
  remark: form.value.remark,
  detailItems: form.value.items
})

const persistOrder = () => {
  const orders = JSON.parse(localStorage.getItem('sales-orders') || '[]')
  const orderData = buildOrderData()
  const index = orders.findIndex((o: any) => o.id === form.value.orderNo)
  if (index > -1) {
    orders[index] = { ...orders[index], ...orderData }
  } else {
    orders.unshift(orderData)
  }
  localStorage.setItem('sales-orders', JSON.stringify(orders))
  return orderData
}

const validateForm = () => {
  if (!form.value.customer) {
    ElMessage.warning('请选择客户')
    return false
  }
  if (form.value.items.length === 0) {
    ElMessage.warning('请至少添加一个商品')
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
    ElMessage.info(`已将 ${syncResult.added + syncResult.updated} 条商品写入本企业商品资料`)
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
      auditor: '',
      auditTime: '',
      items: []
    }
    return
  }

  if (navigate) router.push('/sales/order-list')
}

const handleSaveAndNew = () => {
  handleSubmit({ navigate: false, resetAfter: true })
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
      persistOrder()
      addOperationLog(form.value.orderNo, 'unaudit', '当前用户', '反审核销售订单')
      ElMessage.success('反审核成功')
    }).catch(() => {})
    return
  }

  ElMessageBox.confirm('确定要审核该销售订单吗？', '审核确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    form.value.auditStatus = 'audited'
    form.value.auditor = '当前用户'
    form.value.auditTime = formatLocalDateTime()
    const saved = persistOrder()
    onSalesOrderAudited(saved)
    addOperationLog(form.value.orderNo, 'audit', '当前用户', '审核销售订单')
    ElMessage.success('审核成功')
  }).catch(() => {})
}

const handleCancel = () => {
  router.push('/sales/order-list')
}

const buildPrintData = () => ({
  orderDate: form.value.date,
  deliveryDate: form.value.deliveryDate,
  customerName: form.value.customer,
  customerCode: form.value.customerCode,
  customerAddress: '',
  customerPhone: form.value.phone,
  contact: form.value.contact,
  documentNo: form.value.orderNo,
  warehouseName: warehouseLabels[form.value.warehouse] || form.value.warehouse,
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
        <div class="audit-badge" v-if="form.auditStatus === 'audited'">
          <el-tag type="danger" effect="plain" size="small" class="audit-tag-seal">已审核</el-tag>
          <span v-if="form.auditor || form.auditTime" class="audit-meta">
            {{ form.auditor }}<template v-if="form.auditor && form.auditTime"> · </template>{{ form.auditTime }}
          </span>
        </div>
      </div>
      <div class="title-actions">
        <el-button type="primary" size="small" @click="handleSubmit()">保存</el-button>
        <el-button type="primary" size="small" plain @click="handleSaveAndNew">保存并新增</el-button>
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
                v-if="field.key === 'customer'"
                v-model="form.customer"
                filterable
                default-first-option
                placeholder="请选择客户"
                size="small"
                style="width: 100%;"
                @change="handleCustomerChange"
              >
                <el-option v-for="c in customerList" :key="c.id" :label="c.name" :value="c.name" />
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
            商品查询：编码、名称、规格、厂家，空格隔开，不限顺序；保存后写入本企业商品资料（待审核）。
          </p>
          <p v-else class="product-query-hint">商品查询：编码、名称、规格、厂家，空格隔开，不限顺序。</p>
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
                  <el-button link type="primary" size="small" class="select-btn" @click="openBatchAdd">选择</el-button>
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
                <el-input v-else-if="col.key === 'registrationNo'" v-model="row.registrationNo" size="small" />
                <el-input v-else-if="col.key === 'productionLicenseNo'" v-model="row.productionLicenseNo" size="small" />
                <el-input-number
                  v-else-if="col.key === 'quantity'"
                  v-model="row.quantity"
                  :min="0"
                  :precision="3"
                  :controls="false"
                  size="small"
                  class="cell-number"
                  @change="calcRowAmount(row)"
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
                />
                <span v-else-if="col.key === 'amount'" class="amount-text">{{ formatMoney(row.amount) }}</span>
                <el-input v-else-if="col.key === 'batchNo'" v-model="row.batchNo" size="small" />
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
                  />
                </div>
                <el-input v-else-if="col.key === 'storageCondition'" v-model="row.storageCondition" size="small" />
                <el-input v-else-if="col.key === 'bidType'" v-model="row.bidType" size="small" />
                <el-input
                  v-else-if="col.key === 'remark'"
                  v-model="row.itemRemark"
                  size="small"
                  maxlength="200"
                />
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div class="summary-bar items-summary-bar">
          <div class="summary-left">
            <span>数量合计：<strong>{{ formatQty(totalQuantity) }}</strong></span>
            <span>金额合计：<strong>{{ formatMoney(totalAmount) }}</strong></span>
          </div>
          <div class="summary-right">
            订单金额：<strong class="highlight-amount">{{ formatMoney(totalAmount) }}</strong>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 批量添加商品 -->
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
