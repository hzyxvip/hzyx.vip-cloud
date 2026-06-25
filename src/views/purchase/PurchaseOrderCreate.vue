<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick, toRef, type Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { TableInstance } from 'element-plus'
import { useTableStyle } from '@/composables/useTableStyle'
import {
  loadProductList,
  getPurchaseableProducts,
  findProductInList,
  findProductsByCompositeQuery,
  findProductByCompositeQuery,
  applyProductToOrderItem,
  toBatchProductRow,
  toStockProductRow,
  getProductLastPrice,
  getProductStockQty,
  getProductAuxUnit,
  getProductDisplayName,
  getProductUnit,
  isProductAvailableForPurchase,
  checkPurchaseOrderProductsAudited,
  formatUnapprovedProductsMessage,
  type ProductMaster
} from '@/utils/productStore'
import {
  ArrowLeft, ArrowRight, DArrowLeft, DArrowRight,
  MoreFilled, QuestionFilled, Coin, Setting,
  Plus, Minus, CopyDocument
} from '@element-plus/icons-vue'
import {
  canUnAuditPurchaseOrder,
  onPurchaseOrderAudited,
  submitModificationRequest,
  isSupplierCollaborationEnabled,
  COLLAB_PO_FIRST_HINT,
  COLLAB_SO_FIRST_HINT,
  type PurchaseOrderAuditedCollabResult
} from '@/utils/platformCollaborationService'
import {
  calcLineAmounts,
  calcPurchaseOrderAmounts,
  formatDealAmountStr,
  isValidOrderLine,
  type PurchaseOrderLine
} from '@/utils/purchaseOrderAmount'
import { resolveSupplierPlatformCode } from '@/utils/orderListPartnerCodes'
import {
  loadSupplierSelectOptions,
  hydrateSupplierListFromServer,
  resolveSupplierMaster,
  type SupplierSelectOption
} from '@/utils/supplierStore'
import { useDocumentConfirm } from '@/composables/useDocumentConfirm'
import { CONFIRM_STATUS_CONFIRMED, CONFIRM_STATUS_UNCONFIRMED, normalizeConfirmStatus } from '@/utils/documentFunctionSettings'
import { generateDocumentNo } from '@/utils/documentNumberSettings'
import { getCurrentCompanyId } from '@/utils/orderBusinessProcess'
import { requireTenantCompanyId } from '@/utils/tenantGuard'
import { syncPurchaseOrdersToServer } from '@/utils/orderSyncService'
import {
  arrowKeyToDirection,
  findFieldKeyFromElement,
  focusCellControl,
  focusFieldByKey,
  focusItemDateCell,
  handleFormGridSelectKeyboard,
  handleItemSelectEnter,
  handleItemSelectKeyboard,
  isDatePickerPanelOpen,
  isHeaderDatePickerTarget,
  isItemDatePickerTarget,
  isItemSelectTarget,
  isSelectDropdownOpen,
  navigateSequentialFields,
  scheduleAfterDatePickerClose,
  scheduleAfterSelectClose,
  shouldNavigateOnArrow as shouldNavigateOnArrowBase
} from '@/utils/erpFormKeyboard'
import {
  activeWarehouseOptions,
  getDefaultWarehouseValue,
  isMultiWarehouseMode,
  resolveWarehouseLabel,
  shouldSkipWarehouseField,
  hydrateWarehouseOptionsFromServer,
} from '@/utils/warehouseSettings'
import { SYSTEM_DEFAULT_WAREHOUSE_NAME } from '@/utils/warehouseDefaults'
import {
  loadBatchNoFormat,
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
import { useOrderDocumentNav } from '@/composables/useOrderDocumentNav'
import {
  loadPurchaseOrderNavIds,
  mergePurchaseOrderListRows
} from '@/utils/purchaseOrderListData'

const router = useRouter()
const route = useRoute()

const isEdit = ref(false)
const orderId = ref('')
const basicInfoCollapsed = ref(false)
const itemsCollapsed = ref(false)
const amountInfoCollapsed = ref(false)
const deliveryCollapsed = ref(false)

const paymentAccountOptions = [
  { label: '基本户-工商银行', value: 'icbc' },
  { label: '一般户-建设银行', value: 'ccb' },
  { label: '现金账户', value: 'cash' }
]

const paymentMethodOptions = [
  { label: '银行转账', value: 'transfer' },
  { label: '现金', value: 'cash' },
  { label: '承兑汇票', value: 'acceptance' },
  { label: '月结', value: 'monthly' }
]

const deliveryMethodOptions = [
  { label: '送货上门', value: 'delivery' },
  { label: '自提', value: 'pickup' },
  { label: '第三方物流', value: 'logistics' }
]

const shippingMethodOptions = [
  { label: '公路运输', value: 'road' },
  { label: '航空运输', value: 'air' },
  { label: '冷链运输', value: 'cold' }
]

const purchaseExpenses = ref<{ name: string; amount: number }[]>([])

const DEFAULT_HEADER_FIELDS = ['orderNo', 'date', 'supplier', 'payableBalance', 'receiveAddress', 'remark']

type HeaderFieldOption = {
  key: string
  label: string
  type: 'input' | 'date' | 'datetime' | 'select' | 'number' | 'textarea' | 'switch'
  placeholder?: string
  required?: boolean
  disabled?: boolean
  fullWidth?: boolean
  span2?: boolean
  maxLength?: number
  tip?: string
  options?: string
  min?: number
  max?: number
  precision?: number
}

const HEADER_FIELD_DEFINITIONS: HeaderFieldOption[] = [
  { key: 'orderNo', label: '单据编号', type: 'input' },
  { key: 'date', label: '单据日期', type: 'date', required: true },
  { key: 'supplier', label: '供应商', type: 'select', options: 'supplierOptions', required: true },
  { key: 'projectName', label: '项目名称', type: 'input' },
  { key: 'settlementDate', label: '结算日期', type: 'date' },
  { key: 'settlementPeriod', label: '结算期限', type: 'input' },
  { key: 'salesman', label: '业务员', type: 'input' },
  { key: 'department', label: '部门', type: 'input' },
  { key: 'docTag', label: '单据标签', type: 'input' },
  { key: 'payableBalance', label: '应付款余额', type: 'input', disabled: true, tip: '供应商累计应付款余额' },
  { key: 'lastDebt', label: '上次欠款', type: 'input' },
  { key: 'supplierDeliveryAddr', label: '供应商发货地址', type: 'input', span2: true },
  { key: 'warehouse', label: '仓库', type: 'select', options: 'warehouseOptions', required: true },
  { key: 'receiveAddress', label: '收货地址', type: 'input', span2: true },
  { key: 'remark', label: '单据备注', type: 'input', maxLength: 30 },
  { key: 'customer', label: '客户', type: 'input' },
  { key: 'docSource', label: '单据来源', type: 'input' },
  { key: 'sendStatus', label: '发送状态', type: 'input', disabled: true },
  { key: 'sendFailReason', label: '发送失败原因', type: 'input', disabled: true },
  { key: 'creator', label: '制单人', type: 'input' },
  { key: 'createTime', label: '制单时间', type: 'datetime', disabled: true },
  { key: 'auditor', label: '审核人', type: 'input', disabled: true },
  { key: 'auditTime', label: '审核时间', type: 'datetime', disabled: true },
  { key: 'lastModifier', label: '最后修改人', type: 'input', disabled: true },
  { key: 'lastModifyTime', label: '最后修改时间', type: 'datetime', disabled: true },
  { key: 'changeReason', label: '变更原因', type: 'input', disabled: true },
  { key: 'changer', label: '变更人', type: 'input', disabled: true },
  { key: 'changeTime', label: '变更时间', type: 'datetime', disabled: true },
  { key: 'versionNo', label: '版本号', type: 'input', disabled: true },
  { key: 'externalNo', label: '外部单号', type: 'input' },
  {
    key: 'sellerOrderNo',
    label: '对方销售订单号',
    type: 'input',
    tip: '路径B：对方已先开销售单时填写，审核即核对并反馈接单'
  },
  { key: 'printCount', label: '打印次数', type: 'number', min: 0, disabled: true },
  { key: 'discountRate', label: '整单折扣率 %', type: 'number', min: 0, max: 100, precision: 2 },
  { key: 'purchaseCostDetail', label: '预计采购费用明细', type: 'textarea', fullWidth: true },
  { key: 'paymentAccount', label: '付款账户', type: 'select', options: 'paymentAccountOptions' },
  { key: 'paymentMethod', label: '付款方式', type: 'select', options: 'paymentMethodOptions' },
  { key: 'depositRatio', label: '本次订金比率 %', type: 'number', min: 0, max: 100, precision: 2 },
  { key: 'prepaidDeposit', label: '预付订金', type: 'number', min: 0, precision: 2 },
  { key: 'directDeduction', label: '定向抵扣', type: 'input' },
  { key: 'deliveryMethod', label: '交货方式', type: 'select', options: 'deliveryMethodOptions' },
  { key: 'attachmentCount', label: '附件数', type: 'number', min: 0 },
  { key: 'carryAttachment', label: '携带附件到下游单据', type: 'switch' }
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

const collabEnabledForSupplier = computed(() =>
  Boolean(form.supplier && isSupplierCollaborationEnabled(form.supplier))
)

const activeCollabHint = computed(() =>
  String(form.sellerOrderNo || '').trim() ? COLLAB_SO_FIRST_HINT : COLLAB_PO_FIRST_HINT
)

const reloadCollabFieldsFromStorage = () => {
  const orders = JSON.parse(localStorage.getItem('purchase-orders') || '[]') as Record<string, unknown>[]
  const row = orders.find(
    o => o.id === form.orderNo || o.orderNo === form.orderNo || o.id === orderId.value
  )
  if (!row) return
  if (row.sendStatus != null) form.sendStatus = String(row.sendStatus)
  if (row.sellerOrderNo != null) form.sellerOrderNo = String(row.sellerOrderNo)
}

const showPurchaseOrderCollabAuditMessage = (collab: PurchaseOrderAuditedCollabResult) => {
  if (collab.mode === 'disabled') {
    ElMessage.success('审核成功')
    return
  }
  if (collab.mode === 'so_first' && !collab.link) {
    ElMessage.warning(collab.message || '未找到对方销售订单，请核对单号')
    return
  }
  if (collab.message) {
    if (collab.mode === 'po_first' || collab.mode === 'so_first') {
      ElMessage.success(`审核成功，${collab.message}`)
      return
    }
    ElMessage.info(collab.message)
    return
  }
  ElMessage.success('审核成功')
}

const initHeaderFieldConfig = () => {
  const savedOrder = localStorage.getItem('purchase-field-order')
  if (savedOrder) {
    try {
      const order = JSON.parse(savedOrder) as string[]
      const orderedFields = order
        .map(key => HEADER_FIELD_DEFINITIONS.find(f => f.key === key))
        .filter(Boolean) as HeaderFieldOption[]
      const newFields = HEADER_FIELD_DEFINITIONS.filter(f => !order.includes(f.key))
      fieldOptions.value = [...orderedFields, ...newFields]
    } catch {}
  } else {
    fieldOptions.value = [...HEADER_FIELD_DEFINITIONS]
  }

  const saved = localStorage.getItem('purchase-field-config')
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
    } catch {}
  }

  visibleFields.value = new Set(DEFAULT_HEADER_FIELDS)
  selectedFields.value = [...DEFAULT_HEADER_FIELDS]
}

const openHeaderSettings = () => {
  selectedFields.value = sortedVisibleFields.value.map(f => f.key)
  showFieldSelector.value = true
}

// 仓库选项（来自仓库资料 / 系统参数）
const warehouseOptions = activeWarehouseOptions

const resolveWarehouseLabelLocal = (warehouseVal?: string) =>
  resolveWarehouseLabel(warehouseVal, warehouseOptions.value)

const getDefaultItemWarehouse = () => resolveWarehouseLabelLocal(form.warehouse) || SYSTEM_DEFAULT_WAREHOUSE_NAME

const applySingleWarehouseDefault = () => {
  const sole = warehouseOptions.value[0]
  if (!sole) return
  form.warehouse = sole.value
  handleHeaderWarehouseChange()
}

const ensureDefaultWarehouse = () => {
  if (String(form.warehouse || '').trim()) return
  const defaultVal = getDefaultWarehouseValue(warehouseOptions.value)
  if (!defaultVal) return
  form.warehouse = defaultVal
  handleHeaderWarehouseChange()
}

const initWarehouseDefaults = async () => {
  await hydrateWarehouseOptionsFromServer()
  if (shouldSkipWarehouseField.value) {
    applySingleWarehouseDefault()
  } else {
    ensureDefaultWarehouse()
  }
}

const shouldSkipItemWarehouseField = () =>
  isHeaderWarehouseSet.value || shouldSkipWarehouseField.value

const syncedHeaderWarehouseLabel = ref('')

const shouldSyncItemWarehouse = (current: string, previousHeaderLabel: string) => {
  const trimmed = current.trim()
  if (!trimmed) return true
  if (trimmed === SYSTEM_DEFAULT_WAREHOUSE_NAME) return true
  if (previousHeaderLabel && trimmed === previousHeaderLabel) return true
  return false
}

const syncItemsWarehouseFromHeader = (previousHeaderLabel = '') => {
  const nextLabel = getDefaultItemWarehouse()
  form.items.forEach(row => {
    const current = String(row.warehouse || '')
    if (shouldSyncItemWarehouse(current, previousHeaderLabel)) {
      row.warehouse = nextLabel
    }
  })
  syncedHeaderWarehouseLabel.value = nextLabel
}

const handleHeaderWarehouseChange = () => {
  syncItemsWarehouseFromHeader(syncedHeaderWarehouseLabel.value)
}

const ensureItemWarehouseDefault = (item: Record<string, any>) => {
  if (shouldSyncItemWarehouse(String(item.warehouse || ''), syncedHeaderWarehouseLabel.value)) {
    item.warehouse = getDefaultItemWarehouse()
  }
}

// 从 localStorage 加载已保存的表头配置
initHeaderFieldConfig()

// 拖拽开始
const handleDragStart = (e: DragEvent, index: number) => {
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

// 拖拽经过
const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

// 拖拽放下
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

// 确认字段选择
const confirmFieldSelection = () => {
  visibleFields.value = new Set(selectedFields.value)
  localStorage.setItem('purchase-field-config', JSON.stringify(selectedFields.value))
  localStorage.setItem('purchase-field-order', JSON.stringify(fieldOptions.value.map(f => f.key)))
  showFieldSelector.value = false
  ElMessage.success('表头设置已保存')
}

const getOptions = (optionsKey?: string) => {
  if (optionsKey === 'supplierOptions') return supplierOptions.value
  if (optionsKey === 'warehouseOptions') return warehouseOptions.value
  if (optionsKey === 'paymentAccountOptions') return paymentAccountOptions
  if (optionsKey === 'paymentMethodOptions') return paymentMethodOptions
  if (optionsKey === 'deliveryMethodOptions') return deliveryMethodOptions
  return []
}

const formatLocalDate = (d = new Date()) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const formatLocalDateCompact = (d = new Date()) => formatLocalDate(d).replace(/-/g, '')

const formatLocalDateTime = (d = new Date()) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}:${s}`
}

// 表单数据
const form = reactive({
  orderNo: '',
  date: '',
  supplier: '',
  supplierCode: '',
  supplierAddress: '',
  projectName: '',
  warehouse: '',
  deliveryDate: '',
  remark: '',
  items: [] as any[],
  auditStatus: 'notAudited' as 'notAudited' | 'audited', // 审核状态
  confirmStatus: CONFIRM_STATUS_UNCONFIRMED,
  // 可选字段
  settlementDate: '',
  settlementPeriod: '',
  salesman: '',
  department: '',
  docTag: '',
  payableBalance: '',
  lastDebt: '',
  supplierDeliveryAddr: '',
  receiveAddress: '',
  customer: '',
  docSource: '',
  sendStatus: '',
  sendFailReason: '',
  creator: '',
  createTime: '',
  auditor: '',
  auditTime: '',
  lastModifier: '',
  lastModifyTime: '',
  changeReason: '',
  changer: '',
  changeTime: '',
  versionNo: '',
  externalNo: '',
  sellerOrderNo: '',
  printCount: 0,
  discountRate: 0,
  discountAmount: 0,
  purchaseCostDetail: '',
  paymentAccount: '',
  paymentMethod: '',
  settlementMethod: '',
  depositRatio: 0,
  prepaidDeposit: 0,
  currentPaymentAmount: 0,
  directDeduction: '',
  deliveryMethod: '',
  shippingMethod: '',
  enablePreDeduction: false,
  attachmentCount: 0,
  carryAttachment: false
})

const {
  confirmEnabled: purchaseOrderConfirmEnabled,
  handleConfirm: handleConfirmPurchaseOrder,
  requireConfirmedBeforeAudit: requirePurchaseOrderConfirmed,
  resetConfirmStatus: resetPurchaseOrderConfirm,
  autoConfirmIfNeeded: autoConfirmPurchaseOrderIfNeeded
} = useDocumentConfirm(
  'purchase_order',
  () => form.confirmStatus,
  value => { form.confirmStatus = value },
  {
    permissionCode: 'purchase_confirm',
    validate: () => {
      if (!form.supplier) {
        ElMessage.warning('请选择供应商')
        return false
      }
      if (form.items.length === 0) {
        ElMessage.warning('请至少添加一个商品')
        return false
      }
      return true
    },
    onPersist: () => upsertOrderToStorage()
  }
)

// 创建空白明细行
const createEmptyItemRow = (): Record<string, any> => ({
  productCode: '',
  productName: '',
  spec: '',
  quantity: 1,
  unit: '',
  unitPrice: 0,
  lastPrice: 0,
  discountRate: 0,
  origin: '',
  brand: '',
  productionLicense: '',
  registrationNo: '',
  registrant: '',
  batchNo: '',
  productionDate: '',
  expiryDate: '',
  warehouse: getDefaultItemWarehouse(),
  auxUnit: '',
  auxQuantity: 0,
  auxUnitRatio: 1,
  amount: 0,
  retailPrice: 0,
  retailTotal: 0,
  manufacturer: '',
  location: '',
  storageCondition: '',
  itemRemark: '',
  productLocked: false,
  _batchFormatPickerOpen: true
})

const formatQty = (val: number) =>
  Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

const formatMoney = (val: number) =>
  Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 列表/保存用的成交金额（= 应交金额） */
const formatDealAmount = (val: number) => formatDealAmountStr(val)

// 计算行金额（数量 × 单价）
const calcRowAmount = (row: PurchaseOrderLine) => {
  calcLineAmounts(row)
}

const recalcAllItemAmounts = () => {
  form.items.forEach(row => calcLineAmounts(row))
}

const isHeaderWarehouseSet = computed(() => Boolean(String(form.warehouse || '').trim()))

const orderAmounts = computed(() =>
  calcPurchaseOrderAmounts({
    lines: form.items,
    discountRate: form.discountRate,
    discountAmount: form.discountAmount,
    purchaseExpenses: purchaseExpenses.value
  })
)

const validItems = computed(() => form.items.filter(isValidOrderLine))

// 供应商选项（来自供应商资料，编码为唯一 value，避免同名折叠）
const supplierOptions = ref<SupplierSelectOption[]>([])

const refreshSupplierList = async () => {
  await hydrateSupplierListFromServer()
  supplierOptions.value = loadSupplierSelectOptions()
}

/** 编辑旧单时，若供应商已从资料中删除，仍保留在下拉中以便回显 */
const ensureCurrentSupplierOption = () => {
  const master = resolveSupplierMaster(form.supplierCode || form.supplier)
  if (master) {
    form.supplier = master.name
    form.supplierCode = master.code || master.id
    if (!form.supplierAddress) {
      form.supplierAddress = master.address || [master.province, master.city].filter(Boolean).join('')
    }
  }

  const code = String(form.supplierCode || '').trim()
  if (!code || supplierOptions.value.some(item => item.value === code)) return

  const name = String(form.supplier || '').trim()
  const fallback: SupplierSelectOption = {
    label: name || code,
    value: code,
    code,
    address: String(form.supplierAddress || ''),
    id: code
  }
  supplierOptions.value = [fallback, ...supplierOptions.value]
}

// 商品资料（来自商品资料列表 localStorage productList）
const productList = ref<ProductMaster[]>([])

const refreshProductList = () => {
  productList.value = getPurchaseableProducts()
}

// 明细合计（仅统计有效商品行）
const totalQuantity = computed(() => orderAmounts.value.totalQuantity)

const totalAmount = computed(() => orderAmounts.value.lineAmountTotal)

const totalRetailAmount = computed(() =>
  validItems.value.reduce((sum, item) => sum + (Number(item.retailTotal) || 0), 0)
)

const purchaseExpenseTotal = computed(() =>
  purchaseExpenses.value.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
)

const receivableAmount = computed(() => orderAmounts.value.receivableAmount)

const isOrderAudited = computed(() => form.auditStatus === 'audited')
const isOrderConfirmed = computed(() => form.confirmStatus === CONFIRM_STATUS_CONFIRMED)

/** 一级审批：确定；二级审批：审核（同一按钮位） */
const approvalButtonLabel = computed(() => {
  if (purchaseOrderConfirmEnabled.value && !isOrderConfirmed.value) return '确定'
  return form.auditStatus === 'audited' ? '反审核' : '审核'
})

const approvalButtonType = computed<'success' | 'warning'>(() => {
  if (purchaseOrderConfirmEnabled.value && !isOrderConfirmed.value) return 'success'
  return form.auditStatus === 'audited' ? 'warning' : 'success'
})

const handleApprovalToggle = () => {
  if (purchaseOrderConfirmEnabled.value && !isOrderConfirmed.value) {
    handleConfirmPurchaseOrder()
    return
  }
  handleAuditToggle()
}
const confirmStatusTagType = computed(() =>
  form.confirmStatus === CONFIRM_STATUS_CONFIRMED ? 'success' : 'warning'
)

const auditStatusLabel = computed(() =>
  form.auditStatus === 'audited' ? '已审核' : '未审核'
)

const auditStatusTagType = computed(() =>
  form.auditStatus === 'audited' ? 'danger' : 'info'
)

/** 应预付订金 = 应交金额 × 订金比率 */
const prepayAmount = computed(() =>
  Number((receivableAmount.value * (Number(form.depositRatio) || 0) / 100).toFixed(2))
)

/** 按订金比率计算的尾款 */
const tailPayAmount = computed(() =>
  Number(Math.max(0, receivableAmount.value - prepayAmount.value).toFixed(2))
)

const paidAmount = computed(() => Number(form.prepaidDeposit) || 0)

/** 抵扣预付定金后的应付余额 */
const balanceAfterPrepay = computed(() =>
  Number(Math.max(0, receivableAmount.value - paidAmount.value).toFixed(2))
)

/** 本次付款后的剩余未付 */
const remainPayAmount = computed(() =>
  Number(Math.max(0, balanceAfterPrepay.value - (Number(form.currentPaymentAmount) || 0)).toFixed(2))
)

const syncPrepaidDepositFromRatio = () => {
  if (isOrderAudited.value) return
  form.prepaidDeposit = prepayAmount.value
}

const normalizePrepaidDeposit = () => {
  if (isOrderAudited.value) return
  const max = receivableAmount.value
  if (form.prepaidDeposit > max) form.prepaidDeposit = max
  if (form.prepaidDeposit < 0) form.prepaidDeposit = 0
}

const normalizeCurrentPaymentAmount = () => {
  if (isOrderAudited.value) return
  const max = balanceAfterPrepay.value
  if (form.currentPaymentAmount > max) form.currentPaymentAmount = max
  if (form.currentPaymentAmount < 0) form.currentPaymentAmount = 0
}

const validatePaymentAmounts = (): boolean => {
  if (form.prepaidDeposit > receivableAmount.value) {
    ElMessage.warning('预付定金不能大于应交金额')
    return false
  }
  if (form.currentPaymentAmount > balanceAfterPrepay.value) {
    ElMessage.warning('本次付款金额不能大于抵扣预付定金后的应付余额')
    return false
  }
  return true
}

watch(
  () => form.depositRatio,
  () => {
    syncPrepaidDepositFromRatio()
  }
)

watch(receivableAmount, (newVal, oldVal) => {
  if (isOrderAudited.value) return
  if (oldVal !== undefined) {
    const oldPrepay = Number((Number(oldVal) * (Number(form.depositRatio) || 0) / 100).toFixed(2))
    if (form.prepaidDeposit === 0 || Math.abs(form.prepaidDeposit - oldPrepay) < 0.01) {
      form.prepaidDeposit = prepayAmount.value
    }
  }
  normalizePrepaidDeposit()
  normalizeCurrentPaymentAmount()
})

const itemsTableRef = ref<TableInstance>()
const itemsTableWrapRef = ref<HTMLElement>()
let itemsTableBodyEl: HTMLElement | null = null
let itemsTableResizeObserver: ResizeObserver | null = null

type ItemColumnDef = {
  key: string
  label: string
  prop: string
  align: 'center' | 'right'
  required?: boolean
}

const DEFAULT_ITEM_COLUMN_KEYS = [
  'productCode', 'productName', 'spec', 'manufacturer',
  'productionLicense', 'registrationNo', 'registrant',
  'warehouse',
  'quantity', 'unit', 'unitPrice', 'lastPrice', 'amount', 'auxQuantity',
  'productionDate', 'batchNo', 'expiryDate', 'remark'
]

const ITEM_COLUMN_DEFINITIONS: ItemColumnDef[] = [
  { key: 'productCode', label: '商品编码', prop: 'productCode', align: 'center', required: true },
  { key: 'productName', label: '商品名称', prop: 'productName', align: 'center' },
  { key: 'spec', label: '规格型号', prop: 'spec', align: 'center' },
  { key: 'manufacturer', label: '生产厂家', prop: 'manufacturer', align: 'center' },
  { key: 'productionLicense', label: '生产许可证号', prop: 'productionLicense', align: 'center' },
  { key: 'registrationNo', label: '注册证号', prop: 'registrationNo', align: 'center' },
  { key: 'registrant', label: '注册人/备案人', prop: 'registrant', align: 'center' },
  { key: 'warehouse', label: '仓库', prop: 'warehouse', align: 'center', required: true },
  { key: 'quantity', label: '数量', prop: 'quantity', align: 'right', required: true },
  { key: 'unit', label: '单位', prop: 'unit', align: 'center' },
  { key: 'unitPrice', label: '单价', prop: 'unitPrice', align: 'right' },
  { key: 'lastPrice', label: '上次进价', prop: 'lastPrice', align: 'right' },
  { key: 'amount', label: '金额', prop: 'amount', align: 'right' },
  { key: 'auxQuantity', label: '辅助数量', prop: 'auxQuantity', align: 'right' },
  { key: 'productionDate', label: '生产日期', prop: 'productionDate', align: 'center' },
  { key: 'batchNo', label: '生产批号', prop: 'batchNo', align: 'center' },
  { key: 'expiryDate', label: '有效期至', prop: 'expiryDate', align: 'center' },
  { key: 'remark', label: '备注', prop: 'itemRemark', align: 'center' }
]

const showItemColumnSelector = ref(false)
const itemColumnOptions = ref<ItemColumnDef[]>([...ITEM_COLUMN_DEFINITIONS])
const visibleItemColumns = ref<string[]>([...DEFAULT_ITEM_COLUMN_KEYS])
const selectedItemColumns = ref<string[]>([...DEFAULT_ITEM_COLUMN_KEYS])
const itemDragIndex = ref(-1)

const sortedVisibleItemColumns = computed(() =>
  itemColumnOptions.value.filter(col => visibleItemColumns.value.includes(col.key))
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
  { key: 'lastPrice', after: 'unitPrice' },
  { key: 'remark', after: 'expiryDate' },
  { key: 'productionLicense', after: 'manufacturer' },
  { key: 'registrationNo', after: 'productionLicense' },
  { key: 'registrant', after: 'registrationNo' }
]

const LEGACY_TAX_ITEM_COLUMN_KEYS = [
  'taxRate',
  'taxAmount',
  'taxIncludedUnitPrice',
  'taxIncludedAmount',
  'unitPriceIncludesTax'
]

const stripLegacyTaxFields = (row: Record<string, any>) => {
  LEGACY_TAX_ITEM_COLUMN_KEYS.forEach(key => {
    delete row[key]
  })
}

const migrateItemColumnKeys = (keys: string[]) => {
  const merged = keys.filter(key => !LEGACY_TAX_ITEM_COLUMN_KEYS.includes(key))
  let changed = merged.length !== keys.length
  NEW_ITEM_COLUMNS.forEach(({ key, after }) => {
    if (!merged.includes(key)) {
      insertItemColumnKey(merged, key, after)
      changed = true
    }
  })
  return { merged, changed }
}

const normalizeItemRow = (row: Record<string, any>) => {
  const merged = { ...createEmptyItemRow(), ...row }
  stripLegacyTaxFields(merged)
  if (!merged.itemRemark && row.remark) {
    merged.itemRemark = row.remark
  }
  if (merged.productLocked === undefined) {
    merged.productLocked = Boolean(merged.productCode && merged.productName)
  }
  if (merged.warehouse) {
    merged.warehouse = resolveWarehouseLabelLocal(merged.warehouse)
  }
  if (merged.productCode) {
    const master = resolveProductForRow(merged)
    if (master) {
      merged.unit = getProductUnit(master)
    }
  }
  calcLineAmounts(merged)
  return merged
}

const initItemColumnConfig = () => {
  let orderKeys = ITEM_COLUMN_DEFINITIONS.map(c => c.key)
  let visibleKeys = [...DEFAULT_ITEM_COLUMN_KEYS]
  let configChanged = false

  const savedOrder = localStorage.getItem('purchase-item-column-order')
  if (savedOrder) {
    try {
      orderKeys = JSON.parse(savedOrder) as string[]
    } catch {}
  }

  const saved = localStorage.getItem('purchase-item-column-config')
  if (saved) {
    try {
      const parsed = (JSON.parse(saved) as string[]).filter(key =>
        ITEM_COLUMN_DEFINITIONS.some(c => c.key === key)
      )
      if (parsed.length) visibleKeys = parsed
    } catch {}
  }

  const orderMigration = migrateItemColumnKeys(orderKeys.filter(key =>
    ITEM_COLUMN_DEFINITIONS.some(c => c.key === key)
  ))

  orderKeys = orderMigration.merged
  visibleKeys = visibleKeys.filter(key => ITEM_COLUMN_DEFINITIONS.some(c => c.key === key))
  if (!visibleKeys.length) visibleKeys = [...DEFAULT_ITEM_COLUMN_KEYS]

  const visibleMigration = migrateItemColumnKeys([...visibleKeys])
  visibleKeys = visibleMigration.merged
  configChanged = orderMigration.changed || visibleMigration.changed

  const ordered = orderKeys
    .map(key => ITEM_COLUMN_DEFINITIONS.find(c => c.key === key))
    .filter(Boolean) as ItemColumnDef[]
  const missing = ITEM_COLUMN_DEFINITIONS.filter(c => !orderKeys.includes(c.key))
  itemColumnOptions.value = [...ordered, ...missing]

  visibleItemColumns.value = [...visibleKeys]
  selectedItemColumns.value = [...visibleKeys]

  if (configChanged) {
    localStorage.setItem(
      'purchase-item-column-order',
      JSON.stringify(itemColumnOptions.value.map(c => c.key))
    )
    localStorage.setItem('purchase-item-column-config', JSON.stringify(visibleKeys))
  }
}

const openItemColumnSettings = () => {
  selectedItemColumns.value = itemColumnOptions.value
    .filter(col => visibleItemColumns.value.includes(col.key))
    .map(col => col.key)
  showItemColumnSelector.value = true
}

const handleItemDragStart = (e: DragEvent, index: number) => {
  const target = e.target as HTMLElement | null
  if (target?.closest('.el-checkbox, .el-checkbox__input, .el-checkbox__label')) {
    e.preventDefault()
    return
  }
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
  const selectedSet = new Set(selectedItemColumns.value)
  const orderedVisible = itemColumnOptions.value
    .filter(col => selectedSet.has(col.key))
    .map(col => col.key)
  visibleItemColumns.value = orderedVisible
  selectedItemColumns.value = [...orderedVisible]
  localStorage.setItem('purchase-item-column-config', JSON.stringify(orderedVisible))
  localStorage.setItem('purchase-item-column-order', JSON.stringify(itemColumnOptions.value.map(c => c.key)))
  showItemColumnSelector.value = false
  ElMessage.success('商品信息设置已保存')
  nextTick(() => {
    syncItemsTableLayout()
    itemsTableRef.value?.doLayout?.()
  })
}

initItemColumnConfig()

const { columnWidths: itemColumnWidths, handleHeaderDragend: handleItemsHeaderDragendBase } = useTableStyle('purchase-order-items', [
  { key: 'index', label: '行号', defaultWidth: 52 },
  { key: 'productCode', label: '商品编码', defaultWidth: 120 },
  { key: 'productName', label: '商品名称', defaultWidth: 130 },
  { key: 'spec', label: '规格型号', defaultWidth: 110 },
  { key: 'manufacturer', label: '生产厂家', defaultWidth: 130 },
  { key: 'productionLicense', label: '生产许可证号', defaultWidth: 160 },
  { key: 'registrationNo', label: '注册证号', defaultWidth: 150 },
  { key: 'registrant', label: '注册人/备案人', defaultWidth: 140 },
  { key: 'warehouse', label: '仓库', defaultWidth: 100 },
  { key: 'quantity', label: '数量', defaultWidth: 90 },
  { key: 'unit', label: '单位', defaultWidth: 70 },
  { key: 'unitPrice', label: '单价', defaultWidth: 90 },
  { key: 'lastPrice', label: '上次进价', defaultWidth: 90 },
  { key: 'amount', label: '金额', defaultWidth: 100 },
  { key: 'auxQuantity', label: '辅助数量', defaultWidth: 90 },
  { key: 'productionDate', label: '生产日期', defaultWidth: 100 },
  { key: 'batchNo', label: '生产批号', defaultWidth: 118 },
  { key: 'expiryDate', label: '有效期至', defaultWidth: 100 },
  { key: 'remark', label: '备注', prop: 'itemRemark', defaultWidth: 120 }
])

const ITEM_DATE_COLUMN_MAX_WIDTH = 105

const {
  syncExpiryFromProductionDate,
  handleProductionDateChange,
  handleBatchFormatChange,
  handleBatchNoInput,
  handleExpiryDateChange,
  focusBatchNoCell,
} = useDocumentItemBatchNo()

const clampItemDateColumnWidths = () => {
  let changed = false
  ;(['productionDate', 'expiryDate'] as const).forEach(key => {
    if ((itemColumnWidths.value[key] ?? 0) > ITEM_DATE_COLUMN_MAX_WIDTH) {
      itemColumnWidths.value[key] = ITEM_DATE_COLUMN_MAX_WIDTH
      changed = true
    }
  })
  if (changed) {
    localStorage.setItem(
      'purchase-order-items-column-widths',
      JSON.stringify(itemColumnWidths.value)
    )
  }
}

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

watch(() => form.items.length, syncItemsTableLayout)
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

const itemColumnSortKeys = computed(() => sortedVisibleItemColumns.value.map(c => c.key))

const {
  getItemSortIcon,
  handleItemColumnSort,
  isColumnSortable,
  itemSortOrders
} = useDocumentItemTableSort(toRef(form, 'items') as Ref<Record<string, unknown>[]>, itemColumnSortKeys, {
  documentKind: 'purchase_order',
  getColumnDef: key => ITEM_COLUMN_DEFINITIONS.find(c => c.key === key),
  onSorted: syncItemsTableLayout
})

// 表格合计行
const itemSummaryMethod = ({ columns, data }: { columns: any[]; data: any[] }) => {
  const validData = data.filter(isValidOrderLine)
  const sums: string[] = []
  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = '合计'
      return
    }
    const prop = column.property
    if (prop === 'quantity') {
      sums[index] = formatQty(validData.reduce((s, r) => s + (Number(r.quantity) || 0), 0))
    } else if (prop === 'amount') {
      sums[index] = formatMoney(validData.reduce((s, r) => s + (Number(r.amount) || 0), 0))
    } else if (prop === 'auxQuantity') {
      sums[index] = formatQty(validData.reduce((s, r) => s + (Number(r.auxQuantity) || 0), 0))
    } else {
      sums[index] = ''
    }
  })
  return sums
}

onMounted(() => {
  nextTick(() => clampItemDateColumnWidths())
  refreshProductList()
  void initWarehouseDefaults()
  void (async () => {
    await refreshSupplierList()
    const id = route.params.id
    if (id) {
      isEdit.value = true
      orderId.value = id as string
      loadOrderData(id as string)
      ensureCurrentSupplierOption()
    } else {
      const date = new Date()
      form.orderNo = generateDocumentNo('purchase_order', date)
      form.date = formatLocalDate(date)
      form.creator = form.creator || '系统管理员'
    }
  })()
  // 页面加载后自动聚焦，以便捕获键盘事件
  setTimeout(() => {
    const pageEl = document.querySelector('.erp-page') as HTMLElement
    if (pageEl) pageEl.focus()
  }, 100)
  // 加载完成后添加一行空白商品明细
  setTimeout(() => {
    if (form.items.length === 0) {
      addItem()
    }
    recalcAllItemAmounts()
    syncItemsTableLayout()
    bindItemsTableResizeObserver()
    if (visibleFields.value.has('orderNo')) {
      focusHeaderField('orderNo')
    }
  }, 200)
  window.addEventListener('resize', debouncedSyncItemsTableLayout)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', debouncedSyncItemsTableLayout)
  unbindItemsTableScrollSync()
  unbindItemsTableResizeObserver()
})

watch(
  () => route.params.id as string | undefined,
  (newId, oldId) => {
    if (newId === oldId || !newId) return
    isEdit.value = true
    orderId.value = newId
    loadOrderData(newId)
    ensureCurrentSupplierOption()
    nextTick(() => {
      recalcAllItemAmounts()
      syncItemsTableLayout()
    })
  }
)

const loadOrderData = (id: string) => {
  const orders = mergePurchaseOrderListRows()
  const order = orders.find((o: Record<string, unknown>) => o.id === id || o.orderNo === id)
  if (!order) {
    form.orderNo = id
    return
  }
  purchaseExpenses.value = Array.isArray(order.purchaseExpenses)
    ? order.purchaseExpenses.map((e: { name: string; amount: number }) => ({ ...e }))
    : []
  const rawItems = (order.detailItems || order.items || []) as PurchaseOrderLine[]
  Object.assign(form, {
    orderNo: order.orderNo || order.id,
    date: order.date,
    supplier: order.supplier,
    supplierCode: order.supplierCode || '',
    supplierAddress: order.supplierAddress || '',
    projectName: order.projectName || '',
    warehouse: order.warehouse || '',
    deliveryDate: order.deliveryDate || '',
    remark: order.remark || '',
    auditStatus: order.auditStatus || 'notAudited',
    confirmStatus: normalizeConfirmStatus(order.confirmStatus),
    auditor: order.auditor || '',
    auditTime: order.auditTime || '',
    discountRate: Number(order.discountRate) || 0,
    discountAmount: Number(order.discountAmount) || 0,
    depositRatio: Number(order.depositRatio) || 0,
    prepaidDeposit: Number(order.prepaidDeposit) || 0,
    paymentAccount: order.paymentAccount || '',
    paymentMethod: order.paymentMethod || '',
    settlementMethod: order.settlementMethod || '',
    currentPaymentAmount: Number(order.currentPaymentAmount) || 0,
    enablePreDeduction: order.enablePreDeduction === true,
    deliveryMethod: order.deliveryMethod || '',
    shippingMethod: order.shippingMethod || '',
    department: order.department || '',
    salesman: order.salesman || '',
    creator: order.creator || '',
    items: rawItems.map((item: Record<string, any>) => normalizeItemRow(item))
  })
  if (!form.items.length) {
    form.items.push(createEmptyItemRow())
  }
  if (form.supplier && !form.supplierCode) {
    const master = resolveSupplierMaster(form.supplier)
    if (master) form.supplierCode = master.code || master.id
  }
  recalcAllItemAmounts()
  syncedHeaderWarehouseLabel.value = getDefaultItemWarehouse()
}

const findStoredOrder = (
  orders: Record<string, unknown>[],
  idHint = ''
) => {
  const keys = [String(form.orderNo || ''), String(orderId.value || ''), String(idHint || '')]
    .map(v => v.trim())
    .filter(Boolean)
  return orders.find((o: any) =>
    keys.some(key => o.id === key || o.orderNo === key)
  ) as Record<string, unknown> | undefined
}

const buildOrderRecord = () => {
  const today = formatLocalDate()
  if (!form.orderNo && orderId.value) {
    form.orderNo = orderId.value
  }
  if (!form.orderNo) {
    form.orderNo = generateDocumentNo('purchase_order')
  }
  const orders = JSON.parse(localStorage.getItem('purchase-orders') || '[]') as Record<string, unknown>[]
  const existing = findStoredOrder(orders)
  const explicitlyUnAudited = form.auditStatus === 'notAudited' && existing?.auditStatus === 'audited'
  const audited = !explicitlyUnAudited && (form.auditStatus === 'audited' || existing?.auditStatus === 'audited')
  const auditStatus = audited ? 'audited' : form.auditStatus
  const auditor = audited
    ? String(form.auditor || existing?.auditor || '')
    : (explicitlyUnAudited ? '' : String(form.auditor || ''))
  const auditTime = audited
    ? String(form.auditTime || existing?.auditTime || '')
    : (explicitlyUnAudited ? '' : String(form.auditTime || ''))
  if (audited && form.auditStatus !== 'audited') {
    form.auditStatus = 'audited'
    form.auditor = auditor
    form.auditTime = auditTime
  }
  return {
    id: form.orderNo,
    orderNo: form.orderNo,
    companyId: existing?.companyId || getCurrentCompanyId(),
    businessProcess: existing?.businessProcess || 'standard',
    supplier: form.supplier,
    supplierCode: form.supplierCode,
    supplierAddress: form.supplierAddress,
    projectName: form.projectName,
    supplierPlatformCode: resolveSupplierPlatformCode({
      supplier: form.supplier,
      supplierCode: form.supplierCode
    }),
    date: form.date || today,
    amount: formatDealAmount(receivableAmount.value),
    receivableAmount: receivableAmount.value,
    lineAmountTotal: totalAmount.value,
    discountRate: form.discountRate,
    discountAmount: form.discountAmount,
    paymentAccount: form.paymentAccount,
    paymentMethod: form.paymentMethod,
    settlementMethod: form.settlementMethod,
    depositRatio: form.depositRatio,
    prepaidDeposit: form.prepaidDeposit,
    prepayAmount: prepayAmount.value,
    balanceAfterPrepay: balanceAfterPrepay.value,
    remainPayAmount: remainPayAmount.value,
    currentPaymentAmount: form.currentPaymentAmount,
    enablePreDeduction: form.enablePreDeduction,
    purchaseExpenses: purchaseExpenses.value.map(e => ({ ...e })),
    itemCount: orderAmounts.value.lineCount,
    status: audited
      ? (existing?.status && existing.status !== 'pending' ? existing.status : 'processing')
      : (existing?.status === 'processing' ? 'pending' : (existing?.status || 'pending')),
    auditStatus,
    confirmStatus: form.confirmStatus,
    auditor,
    auditTime,
    executeStatus: existing?.executeStatus || 'notExecuted',
    warehouseStatus: existing?.warehouseStatus || 'notInWarehoused',
    closeStatus: existing?.closeStatus || 'notClosed',
    prepaymentStatus: existing?.prepaymentStatus || '',
    receiveStatus: existing?.receiveStatus || 'notReceived',
    sendStatus: existing?.sendStatus || '',
    platformOrderNo: existing?.platformOrderNo || '',
    sellerOrderId: String(form.sellerOrderNo || existing?.sellerOrderId || '').trim(),
    sellerOrderNo: String(form.sellerOrderNo || existing?.sellerOrderNo || '').trim(),
    collaborationEnabled: existing?.collaborationEnabled,
    operator: '当前用户',
    creator: form.creator || existing?.creator || '系统管理员',
    warehouse: form.warehouse,
    deliveryDate: form.deliveryDate,
    remark: form.remark,
    detailItems: form.items
  }
}

const upsertOrderToStorage = () => {
  const companyId = requireTenantCompanyId()
  if (!companyId) return null
  const orders = JSON.parse(localStorage.getItem('purchase-orders') || '[]') as Record<string, unknown>[]
  const orderData = buildOrderRecord()
  orderData.companyId = companyId
  const index = orders.findIndex((o: any) =>
    o.id === orderData.id || o.id === orderId.value || o.orderNo === orderData.orderNo
  )
  if (index > -1) {
    orders[index] = { ...orders[index], ...orderData }
  } else {
    orders.unshift(orderData)
  }
  localStorage.setItem('purchase-orders', JSON.stringify(orders))
  void syncPurchaseOrdersToServer()
  if (!isEdit.value) {
    isEdit.value = true
    orderId.value = String(orderData.id)
  } else if (!orderId.value) {
    orderId.value = String(orderData.id)
  }
  return orderData
}

// 选择供应商时自动填充
const handleSupplierChange = (code: string) => {
  const supplier = supplierOptions.value.find(s => s.value === code)
  if (supplier) {
    form.supplier = supplier.label
    form.supplierCode = supplier.code
    form.supplierAddress = supplier.address
    return
  }
  const master = resolveSupplierMaster(code)
  if (master) {
    form.supplier = master.name
    form.supplierCode = master.code || master.id
    form.supplierAddress = master.address || [master.province, master.city].filter(Boolean).join('')
  }
}

// 表头仓库变更时，同步到仍使用默认仓库的明细行（已手工修改的行保留）
// 添加商品
const addItem = () => {
  if (isOrderAudited.value) {
    ElMessage.warning('订单已审核，不能修改商品明细')
    return
  }
  form.items.push(createEmptyItemRow())
  syncItemsTableLayout()
}

const insertItemAfter = (index: number) => {
  if (isOrderAudited.value) return
  form.items.splice(index + 1, 0, createEmptyItemRow())
  syncItemsTableLayout()
}

const removeItem = (index: number) => {
  if (isOrderAudited.value) return
  if (form.items.length <= 1) {
    ElMessage.warning('至少保留一行明细')
    return
  }
  form.items.splice(index, 1)
  syncItemsTableLayout()
}

// 复制行
const copyItem = (index: number) => {
  if (isOrderAudited.value) return
  const item = form.items[index]
  const newItem = { ...item }
  form.items.splice(index + 1, 0, newItem)
  syncItemsTableLayout()
  ElMessage.success('复制成功')
}

// 批量添加弹窗
const showBatchAdd = ref(false)

const batchProductList = computed(() => loadProductList().map(toBatchProductRow))

const openBatchAdd = () => {
  showBatchAdd.value = true
}

const batchRowSelectable = (row: Record<string, unknown>) =>
  isProductAvailableForPurchase(row as ProductMaster)

const confirmBatchAdd = (selected: ProductMaster[]) => {
  const unavailable = selected.filter(p => !isProductAvailableForPurchase(p))
  if (unavailable.length > 0) {
    ElMessage.warning(
      `以下商品未审核或已停用，无法添加：${unavailable.map(p => `${p.code} ${getProductDisplayName(p)}`).join('；')}`
    )
    return
  }

  selected.forEach(p => {
    const master = findProductInList(p.code) || p
    const newRow = createEmptyItemRow()
    applyProductToOrderItem(newRow, master, getDefaultItemWarehouse())
    newRow.productLocked = true
    syncExpiryFromProductionDate(newRow, master)
    calcRowAmount(newRow)
    form.items.push(newRow)
  })
  ElMessage.success(`成功添加 ${selected.length} 个商品`)
}

// 库存明细弹窗
const showStockSelect = ref(false)
const stockSearchQuery = ref('')
const stockSelectedItems = ref<any[]>([])

// 库存数据（商品信息来自商品资料，库存数量为模拟数据）
const stockList = ref<any[]>([])

// 库存搜索过滤
const filteredStockList = computed(() => {
  if (!stockSearchQuery.value) return stockList.value
  const query = stockSearchQuery.value.toLowerCase()
  return stockList.value.filter(s =>
    (s.code || '').toLowerCase().includes(query) ||
    (getProductDisplayName(s) || '').toLowerCase().includes(query) ||
    (s.spec || '').toLowerCase().includes(query)
  )
})

// 打开库存明细弹窗
const openStockSelect = () => {
  stockList.value = getPurchaseableProducts().map(toStockProductRow)
  stockSearchQuery.value = ''
  stockSelectedItems.value = []
  showStockSelect.value = true
}

// 确认从库存添加
const confirmStockAdd = () => {
  const selected = stockSelectedItems.value
  if (selected.length === 0) {
    ElMessage.warning('请选择至少一个库存商品')
    return
  }
  selected.forEach(s => {
    const master = findProductInList(s.code) || s
    const newRow = createEmptyItemRow()
    applyProductToOrderItem(newRow, master, getDefaultItemWarehouse())
    newRow.productLocked = true
    newRow.warehouse = s.warehouse
    newRow.location = s.location
    newRow.batchNo = s.batchNo
    newRow.productionDate = s.productionDate
    newRow.expiryDate = s.expiryDate
    calcRowAmount(newRow)
    form.items.push(newRow)
  })
  ElMessage.success(`成功从库存添加 ${selected.length} 个商品`)
  showStockSelect.value = false
}

// 合并明细行编码/名称/规格/厂家为综合查询文本（编码栏含空格时视为整段查询）
const buildItemProductSearchQuery = (item: Record<string, any>): string => {
  const code = item.productCode?.trim() || ''
  if (code.includes(' ')) return code
  return [code, item.productName?.trim(), item.spec?.trim(), item.manufacturer?.trim()]
    .filter(Boolean)
    .join(' ')
}

type ProductSuggestion = {
  value: string
  label: string
  product: ProductMaster
  lastPrice: number
  stockQty: number
  auxUnit: string
}

const PRODUCT_SUGGEST_LIMIT = 15

const productAutocompleteRefs = new Map<Record<string, any>, Record<string, any>>()

const getRowAutocompleteRefs = (row: Record<string, any>) => {
  if (!productAutocompleteRefs.has(row)) {
    productAutocompleteRefs.set(row, {})
  }
  return productAutocompleteRefs.get(row)!
}

const setProductAutocompleteRef = (row: Record<string, any>, colKey: string, el: any) => {
  const refs = getRowAutocompleteRefs(row)
  if (el) refs[colKey] = el
  else delete refs[colKey]
}

const findSuggestContextFromTarget = (target: HTMLElement) => {
  const row = findSuggestRowFromTarget(target)
  if (!row) return null
  const autocompleteRoot = target.closest('.el-autocomplete')
  if (!autocompleteRoot) return null
  const refs = getRowAutocompleteRefs(row)
  const ac = Object.values(refs).find((item: any) => item?.$el === autocompleteRoot)
  if (!ac) return null
  return { row, ac }
}

const findSuggestRowFromTarget = (target: HTMLElement): Record<string, any> | null => {
  const tr = target.closest('.items-detail-table tbody tr.el-table__row')
  if (!tr) return null
  const tableEl = itemsTableRef.value?.$el as HTMLElement | undefined
  const rows = tableEl?.querySelectorAll('.el-table__body-wrapper tbody tr.el-table__row')
  const rowIndex = rows ? Array.from(rows).indexOf(tr as Element) : -1
  if (rowIndex < 0 || rowIndex >= form.items.length) return null
  return form.items[rowIndex]
}

const getAcSuggestions = (ac: any): ProductSuggestion[] =>
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
    const query = buildItemProductSearchQuery(row)
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
    if (!isProductSuggestOpen()) return false
    e.preventDefault()
    ac.handleKeyEnter()
    return true
  }

  return false
}

const resolveProductMaster = (product: ProductMaster): ProductMaster =>
  findProductInList(product.code) || product

const toProductSuggestion = (product: ProductMaster): ProductSuggestion => {
  const master = resolveProductMaster(product)
  const name = getProductDisplayName(master)
  return {
    value: master.code,
    label: `${master.code} | ${name} | ${master.spec || '-'} | ${master.manufacturer || '-'}`,
    product: master,
    lastPrice: getProductLastPrice(master),
    stockQty: getProductStockQty(master),
    auxUnit: getProductAuxUnit(master)
  }
}

const fetchProductSuggestions = (
  row: Record<string, any>,
  cb: (results: ProductSuggestion[]) => void
) => {
  const searchText = buildItemProductSearchQuery(row)
  if (!searchText.trim()) {
    cb([])
    return
  }
  const matches = findProductsByCompositeQuery(searchText, loadProductList())
    .slice(0, PRODUCT_SUGGEST_LIMIT)
    .map(toProductSuggestion)
  cb(matches)
}

const PRODUCT_LOOKUP_COLS = ['productCode', 'productName', 'spec', 'manufacturer']
const PRODUCT_BASIC_INFO_COLS = [
  'productName', 'spec', 'manufacturer', 'productionLicense', 'registrationNo', 'registrant'
]

const isRowProductLocked = (row: Record<string, any>) => Boolean(row.productLocked)

const clearProductLock = (row: Record<string, any>) => {
  if (row._skipProductBlurSearch) return
  row.productLocked = false
}

const LOCKED_SKIP_FOCUS_COLS = new Set([
  'productName', 'spec', 'manufacturer', 'productionLicense', 'registrationNo', 'registrant'
])

const getEffectiveFocusCols = (row: Record<string, any>, cols: string[]) => {
  let effective = isRowProductLocked(row) ? cols.filter(k => !LOCKED_SKIP_FOCUS_COLS.has(k)) : cols
  if (shouldSkipItemWarehouseField()) {
    effective = effective.filter(k => k !== 'warehouse')
  }
  return effective
}

const getPrevItemFocusColKey = (
  currentColKey: string,
  row: Record<string, any>,
  cols: string[]
): string | null => {
  const effectiveCols = getEffectiveFocusCols(row, cols)
  const effIdx = effectiveCols.indexOf(currentColKey)
  if (effIdx > 0) return effectiveCols[effIdx - 1]
  return null
}
const getNextItemFocusColKey = (
  currentColKey: string,
  row: Record<string, any>,
  cols: string[]
): string | null => {
  const effectiveCols = getEffectiveFocusCols(row, cols)
  const effIdx = effectiveCols.indexOf(currentColKey)
  if (effIdx < 0) return effectiveCols[0] ?? null

  if (isRowProductLocked(row)) {
    const skipAfterProduct = [...PRODUCT_LOOKUP_COLS, ...PRODUCT_BASIC_INFO_COLS]
    if (skipAfterProduct.includes(currentColKey)) {
      if (effectiveCols.includes('quantity')) return 'quantity'
      if (effectiveCols.includes('warehouse')) return 'warehouse'
      return effectiveCols[effIdx + 1] ?? null
    }
  }

  if (effIdx < effectiveCols.length - 1) return effectiveCols[effIdx + 1]
  return null
}

const closeProductSuggestForRow = (row: Record<string, any>) => {
  const refs = getRowAutocompleteRefs(row)
  Object.values(refs).forEach((ac: any) => ac?.close?.())
}

const isTextInputFocused = () => {
  const el = document.activeElement
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
}

const focusAfterProductLocked = (rowIndex: number) => {
  if (rowIndex < 0) return
  const row = form.items[rowIndex]
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

const findItemRowIndex = (row: Record<string, any>) => form.items.indexOf(row)

/** 日历弹出时焦点在 body，用此记录当前明细格 */
const lastItemTableFocus = ref<{ row: number; colKey: string } | null>(null)

const rememberItemTableFocus = (rowIndex: number, colKey: string) => {
  lastItemTableFocus.value = { row: rowIndex, colKey }
}

const resolveItemTableFocus = () => findItemsTableFocus() || lastItemTableFocus.value

const isItemSelectTargetLocal = (target: EventTarget | null) => isItemSelectTarget(target)

const isItemDatePickerTargetLocal = (target: EventTarget | null) => isItemDatePickerTarget(target)

const isProductAutocompleteTarget = (target: EventTarget | null) =>
  !!(target as HTMLElement)?.closest('.items-detail-table .el-autocomplete')

const isProductSuggestOpen = () => {
  const popper = document.querySelector('.product-suggest-popper') as HTMLElement | null
  if (!popper) return false
  const style = window.getComputedStyle(popper)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

const shouldNavigateOnArrow = (e: KeyboardEvent) =>
  shouldNavigateOnArrowBase(e, {
    isProductAutocompleteTarget,
    productSuggestOpen: isProductSuggestOpen,
    isItemDatePickerTarget: isItemDatePickerTargetLocal
  })

const handleItemSelectEnterKeydown = (e: KeyboardEvent, rowIndex: number, colKey: string) => {
  handleItemSelectEnter(e, () => focusNextItemCell(rowIndex, colKey))
}

const handleItemWarehouseEnter = (e: KeyboardEvent, rowIndex: number) => {
  handleItemSelectEnterKeydown(e, rowIndex, 'warehouse')
}

const handleItemDateKeydown = (e: KeyboardEvent, row: Record<string, any>, colKey: string) => {
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

  e.preventDefault()
  e.stopPropagation()
  navigateItemsTableFrom(rowIndex, colKey, direction)
}

const focusNextItemCell = (rowIndex: number, currentColKey: string) => {
  const row = form.items[rowIndex]
  const cols = focusableItemColumnKeys.value
  const nextKey = getNextItemFocusColKey(currentColKey, row, cols)
  if (nextKey) {
    focusItemCell(rowIndex, nextKey, currentColKey)
    return
  }
  if (rowIndex < form.items.length - 1) {
    focusItemCell(rowIndex + 1, cols[0])
    return
  }
  finishItemEntry()
}

const finishItemEntry = () => {
  ;(document.activeElement as HTMLElement | null)?.blur?.()
  nextTick(() => {
    const pageEl = document.querySelector('.erp-page') as HTMLElement | null
    pageEl?.focus()
  })
}

const trimTrailingEmptyItems = () => {
  while (form.items.length > 1) {
    const last = form.items[form.items.length - 1]
    if (isValidOrderLine(last as PurchaseOrderLine)) break
    const hasPartial = Boolean(String(last.productCode || '').trim() || String(last.productName || '').trim())
    if (!hasPartial && !(Number(last.quantity) > 0)) {
      form.items.pop()
    } else {
      break
    }
  }
  syncItemsTableLayout()
}

const saveOrderDraft = (): boolean => {
  if (!form.supplier) {
    ElMessage.warning('请选择供应商')
    return false
  }
  if (validItems.value.length === 0) {
    ElMessage.warning('请至少添加一个有效商品明细')
    return false
  }
  trimTrailingEmptyItems()
  const wasEdit = isEdit.value
  const orderData = upsertOrderToStorage()
  addOperationLog(
    String(orderData.orderNo),
    wasEdit ? 'edit' : 'create',
    '当前用户',
    wasEdit ? '编辑采购订单' : '创建采购订单'
  )
  ElMessage.success('采购订单已保存')
  if (!wasEdit && orderData.orderNo) {
    void router.replace(`/purchase/order-list/create/${String(orderData.orderNo)}`)
  }
  return true
}

const focusPrevItemCell = (rowIndex: number, currentColKey: string) => {
  const row = form.items[rowIndex]
  const cols = focusableItemColumnKeys.value
  const prevKey = getPrevItemFocusColKey(currentColKey, row, cols)
  if (prevKey) {
    focusItemCell(rowIndex, prevKey)
    return
  }
  if (rowIndex > 0) {
    const prevRow = form.items[rowIndex - 1]
    const prevCols = getEffectiveFocusCols(prevRow, cols)
    if (prevCols.length) focusItemCell(rowIndex - 1, prevCols[prevCols.length - 1])
    return
  }
  const fields = getFocusableHeaderFields()
  if (fields.length) focusHeaderField(fields[fields.length - 1].key)
}

const handleProductSuggestionSelect = (
  row: Record<string, any>,
  suggestion: ProductSuggestion
) => {
  const master = resolveProductMaster(suggestion.product)
  if (!isProductAvailableForPurchase(master)) {
    ElMessage.warning(
      `商品 ${master.code} ${getProductDisplayName(master)} 尚未审核或已停用，无法采购`
    )
    return
  }
  row._skipProductBlurSearch = true
  applyProductToOrderItem(row, master, getDefaultItemWarehouse())
  ensureItemWarehouseDefault(row)
  syncExpiryFromProductionDate(row, master)
  row.productLocked = true
  calcRowAmount(row)
  const ctx = findSuggestContextFromTarget(document.activeElement as HTMLElement)
  ctx?.ac?.close?.()
  nextTick(() => {
    focusAfterProductLocked(findItemRowIndex(row))
  })
}

type ProductSearchResult = 'locked' | 'ambiguous' | 'not_found' | 'noop'

// 商品编码/名称/规格/厂家综合查询（空格分隔，顺序不限）
const handleItemProductSearch = (
  item: Record<string, any>,
  options: { silent?: boolean } = {}
): ProductSearchResult => {
  const searchText = buildItemProductSearchQuery(item)
  if (!searchText) return 'noop'

  const masterList = loadProductList()
  const matches = findProductsByCompositeQuery(searchText, masterList)
  if (matches.length === 1) {
    const master = resolveProductMaster(matches[0])
    if (!isProductAvailableForPurchase(master)) {
      if (!options.silent) {
        ElMessage.warning(
          `商品 ${master.code} ${getProductDisplayName(master)} 尚未审核或已停用，无法采购`
        )
      }
      return 'not_found'
    }
    applyProductToOrderItem(item, master, getDefaultItemWarehouse())
    ensureItemWarehouseDefault(item)
    syncExpiryFromProductionDate(item, master)
    item.productLocked = true
    item._skipProductBlurSearch = true
    calcRowAmount(item)
    return 'locked'
  }
  if (matches.length > 1) {
    const product = findProductByCompositeQuery(searchText, masterList)
    if (product) {
      const master = resolveProductMaster(product)
      if (!isProductAvailableForPurchase(master)) {
        if (!options.silent) {
          ElMessage.warning(
            `商品 ${master.code} ${getProductDisplayName(master)} 尚未审核或已停用，无法采购`
          )
        }
        return 'not_found'
      }
      applyProductToOrderItem(item, master, getDefaultItemWarehouse())
      ensureItemWarehouseDefault(item)
      syncExpiryFromProductionDate(item, master)
      item.productLocked = true
      item._skipProductBlurSearch = true
      calcRowAmount(item)
      return 'locked'
    }
    if (!options.silent) {
      ElMessage.warning('匹配到多个商品，请补充编码/名称/规格/厂家条件')
    }
    return 'ambiguous'
  }
  if (item.productCode && !item.productName && !options.silent) {
    ElMessage.warning('未找到匹配商品，请检查编码/名称/规格/厂家')
  }
  return item.productCode && !item.productName ? 'not_found' : 'noop'
}

const handleItemProductBlur = (item: Record<string, any>) => {
  if (item._skipProductBlurSearch) {
    item._skipProductBlurSearch = false
    return
  }
  if (isRowProductLocked(item)) return
  handleItemProductSearch(item, { silent: true })
}

const handleSupplierPriceQuery = () => {
  ElMessage.info('查询供应商价格')
}

const handleHistoryDocs = () => {
  router.push('/purchase/order-list')
}

const handleAddExpense = () => {
  if (isOrderAudited.value) {
    ElMessage.warning('订单已审核，不能修改金额信息')
    return
  }
  ElMessageBox.prompt('请输入费用名称', '添加采购费用', {
    confirmButtonText: '下一步',
    cancelButtonText: '取消',
    inputPlaceholder: '如：运费、装卸费'
  }).then(({ value }) => {
    if (!value?.trim()) return
    ElMessageBox.prompt('请输入费用金额', '添加采购费用', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '0.00',
      inputPattern: /^\d+(\.\d{1,2})?$/,
      inputErrorMessage: '请输入有效金额'
    }).then(({ value: amountStr }) => {
      purchaseExpenses.value.push({ name: value.trim(), amount: Number(amountStr) || 0 })
      ElMessage.success('费用已添加')
    }).catch(() => {})
  }).catch(() => {})
}

const handleGeneratePrepay = () => {
  if (isOrderAudited.value) {
    ElMessage.warning('订单已审核，不能修改付款信息')
    return
  }
  form.prepaidDeposit = prepayAmount.value
  ElMessage.success('已按订金比率更新预付定金')
}

const handleQuickQuery = () => {
  ElMessageBox.prompt('请输入商品编码、名称、规格、厂家', '快速查询', {
    confirmButtonText: '查询',
    cancelButtonText: '取消',
    inputPlaceholder: '编码 名称 规格 厂家（空格分隔）'
  }).then(({ value }) => {
    if (!value?.trim()) return
    const row = createEmptyItemRow()
    row.productCode = value.trim()
    form.items.push(row)
    const rowIndex = form.items.length - 1
    const result = handleItemProductSearch(row)
    if (result === 'locked') {
      nextTick(() => focusAfterProductLocked(rowIndex))
    } else if (!row.productName) {
      ElMessage.warning('未找到匹配商品')
    }
  }).catch(() => {})
}

const handlePurchaseBySales = () => {
  ElMessage.info('按销售订单采购：可从销售需求生成采购明细')
}

const handleUnAudit = () => {
  if (form.auditStatus !== 'audited') {
    ElMessage.info('当前订单未审核')
    return
  }
  const orders = JSON.parse(localStorage.getItem('purchase-orders') || '[]')
  const existing = orders.find((o: any) => o.id === form.orderNo)
  const checkRow = existing || {
    auditStatus: form.auditStatus,
    receiveStatus: existing?.receiveStatus || 'notReceived',
    warehouseStatus: existing?.warehouseStatus || 'notInWarehoused'
  }
  if (!canUnAuditPurchaseOrder(checkRow)) {
    ElMessage.warning('已接单或已入库的订单不能反审核，请使用申请修改或关闭')
    return
  }
  ElMessageBox.confirm('确定要反审核该采购订单吗？', '反审核确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    form.auditStatus = 'notAudited'
    form.auditor = ''
    form.auditTime = ''
    upsertOrderToStorage()
    addOperationLog(form.orderNo, 'unaudit', '系统管理员', '反审核采购订单')
    ElMessage.success('反审核成功，单据仍为已确定状态，可再次审核')
  }).catch(() => {})
}

const handleClosePage = () => {
  router.push('/purchase/order-list')
}

// 记录操作日志
const addOperationLog = (orderId: string, operationType: string, operator: string, remark: string) => {
  const logs = JSON.parse(localStorage.getItem('purchase-operation-logs') || '[]')
  logs.unshift({
    id: Date.now(),
    orderId,
    operationType,
    operator,
    operationTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    remark
  })
  localStorage.setItem('purchase-operation-logs', JSON.stringify(logs))
}

// 保存订单
const handleSubmit = () => {
  if (!form.supplier) {
    ElMessage.warning('请选择供应商')
    return
  }
  if (form.items.length === 0) {
    ElMessage.warning('请至少添加一个商品')
    return
  }

  const wasEdit = isEdit.value
  const orderData = upsertOrderToStorage()
  addOperationLog(
    String(orderData.orderNo),
    wasEdit ? 'edit' : 'create',
    '当前用户',
    wasEdit ? '编辑采购订单' : '创建采购订单'
  )
  ElMessage.success(wasEdit ? '采购订单修改成功' : '采购订单创建成功')
  router.push('/purchase/order-list')
}

const handleCancel = () => {
  router.push('/purchase/order-list')
}

const hasDraftChanges = () => {
  if (String(form.supplier || '').trim()) return true
  if (String(form.remark || '').trim()) return true
  return form.items.some(item =>
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
  loadOrderIds: loadPurchaseOrderNavIds,
  currentId: navCurrentId,
  editRoutePath: id => `/purchase/order-list/create/${id}`,
  hasUnsavedChanges: hasDraftChanges
})

const resetToNewOrder = () => {
  Object.assign(form, {
    orderNo: '',
    date: '',
    supplier: '',
    supplierCode: '',
    supplierAddress: '',
    projectName: '',
    warehouse: '',
    deliveryDate: '',
    remark: '',
    items: [],
    auditStatus: 'notAudited',
    confirmStatus: CONFIRM_STATUS_UNCONFIRMED,
    settlementDate: '',
    settlementPeriod: '',
    salesman: '',
    department: '',
    docTag: '',
    payableBalance: '',
    lastDebt: '',
    supplierDeliveryAddr: '',
    receiveAddress: '',
    customer: '',
    docSource: '',
    sendStatus: '',
    sendFailReason: '',
    creator: '',
    createTime: '',
    auditor: '',
    auditTime: '',
    lastModifier: '',
    lastModifyTime: '',
    changeReason: '',
    changer: '',
    changeTime: '',
    versionNo: '',
    externalNo: '',
    printCount: 0,
    discountRate: 0,
    discountAmount: 0,
    purchaseCostDetail: '',
    paymentAccount: '',
    paymentMethod: '',
    settlementMethod: '',
    depositRatio: 0,
    prepaidDeposit: 0,
    currentPaymentAmount: 0,
    directDeduction: '',
    deliveryMethod: '',
    shippingMethod: '',
    enablePreDeduction: false,
    attachmentCount: 0,
    carryAttachment: false
  })
  purchaseExpenses.value = []

  const newDate = new Date()
  form.orderNo = generateDocumentNo('purchase_order', newDate)
  form.date = formatLocalDate(newDate)
  form.creator = '系统管理员'
  syncedHeaderWarehouseLabel.value = ''
  form.items.push(createEmptyItemRow())
  isEdit.value = false
  orderId.value = ''
  resetPurchaseOrderConfirm()
}

const focusNewOrderEntry = () => {
  nextTick(() => {
    if (visibleFields.value.has('supplier')) {
      focusHeaderField('supplier')
      return
    }
    if (visibleFields.value.has('orderNo')) {
      focusHeaderField('orderNo')
    }
  })
}

const handleCreateNew = async () => {
  if (hasDraftChanges()) {
    try {
      await ElMessageBox.confirm(
        '当前单据尚未保存，确定要新建采购订单吗？未保存内容将丢失。',
        '新增采购订单',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
      )
    } catch {
      return
    }
  }

  if (route.params.id) {
    await router.replace('/purchase/order-list/create')
  }
  resetToNewOrder()
  focusNewOrderEntry()
}

const handleSaveAndNew = () => {
  if (!form.supplier) {
    ElMessage.warning('请选择供应商')
    return
  }
  if (form.items.length === 0) {
    ElMessage.warning('请至少添加一个商品')
    return
  }

  const orderData = upsertOrderToStorage()
  addOperationLog(String(orderData.orderNo), 'create', '当前用户', '创建采购订单')
  ElMessage.success('采购订单创建成功')

  resetToNewOrder()
  focusNewOrderEntry()
}

const handleSaveAndAudit = () => {
  if (!form.supplier) {
    ElMessage.warning('请选择供应商')
    return
  }
  if (form.items.length === 0) {
    ElMessage.warning('请至少添加一个商品')
    return
  }
  if (form.auditStatus === 'audited') {
    ElMessage.info('订单已审核')
    return
  }

  upsertOrderToStorage()
  if (isEdit.value) {
    addOperationLog(form.orderNo, 'edit', '当前用户', '编辑采购订单')
  } else {
    addOperationLog(form.orderNo, 'create', '当前用户', '创建采购订单')
  }

  if (!autoConfirmPurchaseOrderIfNeeded()) return
  handleAudit()
}

// 审核 / 反审核（同一按钮切换）
const handleAuditToggle = () => {
  if (form.auditStatus === 'audited') {
    handleUnAudit()
  } else {
    handleAudit()
  }
}

// 审核
const handleAudit = () => {
  if (!requirePurchaseOrderConfirmed()) return
  if (!form.supplier) {
    ElMessage.warning('请选择供应商')
    return
  }
  if (form.items.length === 0) {
    ElMessage.warning('请至少添加一个商品')
    return
  }
  if (form.auditStatus === 'audited') {
    ElMessage.info('订单已审核')
    return
  }
  const productCheck = checkPurchaseOrderProductsAudited(form.items)
  if (!productCheck.ok) {
    ElMessageBox.alert(
      `订单中以下商品资料尚未审核，请先到「资料管理 → 商品基本资料」完成审核后再审单：\n\n${formatUnapprovedProductsMessage(productCheck.unapprovedProducts)}`,
      '无法审核',
      { type: 'warning', confirmButtonText: '知道了' }
    )
    return
  }
  if (!validatePaymentAmounts()) return
  ElMessageBox.confirm('确定要审核该采购订单吗？', '审核确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    form.auditStatus = 'audited'
    form.auditor = '系统管理员'
    form.auditTime = formatLocalDateTime()
    upsertOrderToStorage()
    const orders = JSON.parse(localStorage.getItem('purchase-orders') || '[]')
    const fullOrder = orders.find(
      (o: any) => o.id === form.orderNo || o.orderNo === form.orderNo || o.id === orderId.value
    )
    if (fullOrder) {
      const collab = onPurchaseOrderAudited(fullOrder)
      reloadCollabFieldsFromStorage()
      upsertOrderToStorage()
      showPurchaseOrderCollabAuditMessage(collab)
    } else {
      ElMessage.success('审核成功')
    }
    addOperationLog(form.orderNo, 'audit', '系统管理员', '审核采购订单')
  }).catch(() => {})
}

const handleModifyRequest = () => {
  if (form.auditStatus !== 'audited') {
    ElMessage.warning('请先审核采购订单')
    return
  }
  const orders = JSON.parse(localStorage.getItem('purchase-orders') || '[]')
  const existing = orders.find((o: any) => o.id === form.orderNo)
  if (existing?.receiveStatus !== 'received') {
    ElMessage.warning('仅已接单订单可申请修改')
    return
  }
  ElMessageBox.prompt('请输入需冲减的数量（将对选中明细生成负数对冲行）', '申请修改', {
    confirmButtonText: '提交',
    cancelButtonText: '取消',
    inputPattern: /^[1-9]\d*$/,
    inputErrorMessage: '请输入正整数'
  }).then(({ value }) => {
    const qty = Number(value)
    if (!form.items.length) return
    const target = form.items[0]
    const offsetLines = [{
      ...target,
      quantity: -qty,
      amount: -(Number(target.unitPrice || 0) * qty),
      _offset: true
    }]
    submitModificationRequest(form.orderNo, offsetLines)
    addOperationLog(form.orderNo, 'modifyRequest', '系统管理员', `申请修改，冲减 ${qty}`)
    ElMessage.success('修改申请已提交，等待卖方同意')
  }).catch(() => {})
}

// 打印
const handlePrint = () => {
  ElMessage.info('打印采购订单')
}

// 更多操作
const handleMore = (command: string) => {
  const map: Record<string, string> = {
    copy: '复制单据',
    template: '保存为模板',
    export: '导出',
    import: '导入'
  }
  ElMessage.success(map[command] || '操作成功')
}

const handleEscapeSaveAndBlur = (e: KeyboardEvent) => {
  e.preventDefault()
  saveOrderDraft()
  finishItemEntry()
}

// 键盘事件处理
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return

  if (showItemColumnSelector.value) {
    showItemColumnSelector.value = false
    e.preventDefault()
    return
  }
  if (showFieldSelector.value) {
    showFieldSelector.value = false
    e.preventDefault()
    return
  }
  if (showBatchAdd.value) {
    showBatchAdd.value = false
    e.preventDefault()
    return
  }
  if (showStockSelect.value) {
    showStockSelect.value = false
    e.preventDefault()
    return
  }

  // 联想/日期/下拉面板打开时先交给组件关闭面板，再次 ESC 再保存并收起光标
  if (isProductSuggestOpen() || isDatePickerPanelOpen() || isSelectDropdownOpen()) {
    return
  }

  handleEscapeSaveAndBlur(e)
}

// 跳到下一个基本信息字段
const focusHeaderField = (key: string) => {
  const field = fieldOptions.value.find(f => f.key === key)
  if (field?.type === 'date' || field?.type === 'datetime') {
    focusFieldByKey(key, '.basic-info-grid', { openDatePanel: true })
    return
  }
  if (key === 'supplier') {
    focusFieldByKey(key, '.basic-info-grid', { openSelectDropdown: true })
    return
  }
  if (key === 'warehouse') {
    if (isMultiWarehouseMode.value) {
      ensureDefaultWarehouse()
      focusFieldByKey(key, '.basic-info-grid', { openSelectDropdown: true })
    } else {
      focusFieldByKey(key)
    }
    return
  }
  focusFieldByKey(key)
}

const focusNextHeaderField = (currentKey: string) => {
  const fields = getFocusableHeaderFields()
  const currentIndex = fields.findIndex(f => f.key === currentKey)
  for (let i = currentIndex + 1; i < fields.length; i++) {
    const nextKey = fields[i].key
    if (nextKey === 'warehouse' && shouldSkipWarehouseField.value) {
      applySingleWarehouseDefault()
      continue
    }
    focusHeaderField(nextKey)
    return
  }
  jumpToItems()
}

const focusPrevHeaderField = (currentKey: string) => {
  const fields = getFocusableHeaderFields()
  const currentIndex = fields.findIndex(f => f.key === currentKey)
  for (let i = currentIndex - 1; i >= 0; i--) {
    const prevKey = fields[i].key
    if (prevKey === 'warehouse' && shouldSkipWarehouseField.value) {
      continue
    }
    focusHeaderField(prevKey)
    return
  }
}

const getFocusableHeaderFields = () =>
  sortedVisibleFields.value.filter(f => !f.disabled && f.type !== 'switch')

const handleFormGridSelectOnlyKeydown = (e: KeyboardEvent) => {
  handleFormGridSelectKeyboard(e)
}

const handleBasicInfoArrowKeydown = (e: KeyboardEvent) => {
  if (handleFormGridSelectKeyboard(e)) return

  const target = e.target as HTMLElement
  if (isHeaderDatePickerTarget(target)) return
  if (target.closest('.el-date-picker-panel, .el-picker-panel')) return
  if (isDatePickerPanelOpen()) return

  const direction = arrowKeyToDirection(e.key)
  if (!direction) return
  if (!shouldNavigateOnArrow(e)) return

  const fieldKey = findFieldKeyFromElement(e.target as HTMLElement)
  if (!fieldKey) return

  e.preventDefault()
  e.stopPropagation()
  navigateSequentialFields(fieldKey, direction, getFocusableHeaderFields(), {
    onAfterLastDown: jumpToItems,
    focusField: focusHeaderField
  })
}

const itemTableColumnKeys = computed(() => [
  'index',
  ...sortedVisibleItemColumns.value.map(c => c.key)
])

const focusableItemColumnKeys = computed(() =>
  itemTableColumnKeys.value.filter(key => {
    if (key === 'index') return false
    if (['lastPrice', 'amount', 'auxQuantity', 'unit'].includes(key)) return false
    if (key === 'warehouse' && shouldSkipItemWarehouseField()) return false
    return true
  })
)

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

const focusItemCell = (rowIndex: number, colKey: string, fromColKey?: string) => {
  rememberItemTableFocus(rowIndex, colKey)
  nextTick(() => {
    const tableEl = itemsTableRef.value?.$el as HTMLElement | undefined
    if (!tableEl) return
    const rows = tableEl.querySelectorAll('.el-table__body-wrapper tbody tr.el-table__row')
    const row = rows[rowIndex] as HTMLElement | undefined
    if (!row) return

    const colIndex = itemTableColumnKeys.value.indexOf(colKey)
    if (colIndex < 0) return
    const cell = row.querySelectorAll('td.el-table__cell')[colIndex] as HTMLElement | undefined

    if (colKey === 'productionDate') {
      focusItemDateCell(cell, true)
      return
    }
    if (colKey === 'expiryDate') {
      focusItemDateCell(cell, false)
      return
    }

    if (colKey === 'batchNo') {
      const rowData = form.items[rowIndex]
      if (rowData) {
        focusBatchNoCell({ rowData, cell, fromColKey })
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
  const row = form.items[rowIndex]
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
      if (fields.length) focusHeaderField(fields[fields.length - 1].key)
    }
    return
  }
  if (direction === 'down' && rowIndex < form.items.length - 1) {
    focusItemCell(rowIndex + 1, focusColKey)
  }
}

const navigateItemsTable = (direction: 'up' | 'down' | 'left' | 'right') => {
  const pos = findItemsTableFocus()
  if (!pos) return
  navigateItemsTableFrom(pos.row, pos.colKey, direction)
}

const handleItemsTableKeydown = (e: KeyboardEvent) => {
  if (isProductAutocompleteTarget(e.target) && handleProductSuggestKeyboard(e)) {
    e.preventDefault()
    e.stopPropagation()
    return
  }

  if (handleItemSelectKeyboard(e)) return

  // 明细日期列由 handleItemDateKeydown 单独处理（避免与日历面板冲突）
  if (isItemDatePickerTargetLocal(e.target)) return

  if (e.key === 'Enter') {
    if (isProductSuggestOpen()) return
    if (isBatchNoFormatTarget(e.target)) return

    if (isDatePickerPanelOpen()) {
      const pos = resolveItemTableFocus()
      if (pos) {
        e.preventDefault()
        e.stopPropagation()
        scheduleAfterDatePickerClose(() => focusNextItemCell(pos.row, pos.colKey))
      }
      return
    }

    const pos = findItemsTableFocus()
    if (!pos) return

    const advanceItemCell = () => {
      e.preventDefault()
      e.stopPropagation()
      const row = form.items[pos.row]
      if (row) {
        if (isRowProductLocked(row) && [...PRODUCT_LOOKUP_COLS, ...PRODUCT_BASIC_INFO_COLS].includes(pos.colKey)) {
          focusAfterProductLocked(pos.row)
          return
        }
        if (PRODUCT_LOOKUP_COLS.includes(pos.colKey)) {
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
  if (field.key === 'supplier' || field.key === 'warehouse') {
    e.preventDefault()
    e.stopPropagation()
    focusHeaderField(field.key)
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
  if (field.type === 'select' || field.key === 'supplier' || field.key === 'warehouse') {
    handleSelectFieldEnter(field, e)
    return
  }
  if (field.type === 'textarea' && e.shiftKey) return
  handleHeaderEnter(field, e)
}

// 直接跳到商品明细表格
const jumpToItems = () => {
  setTimeout(() => {
    const cols = focusableItemColumnKeys.value
    if (cols.length) {
      focusItemCell(0, cols[0])
    }
  }, 100)
}

// 跳到下一个输入框
const focusNextInput = (e: KeyboardEvent) => {
  const inputs = Array.from(document.querySelectorAll('.erp-page input, .erp-page select, .erp-page textarea')) as HTMLElement[]
  const currentIndex = inputs.indexOf(e.target as HTMLElement)
  if (currentIndex >= 0) {
    let nextIndex = currentIndex + 1
    // 跳过系统自带字段（只读字段）
    while (nextIndex < inputs.length) {
      const nextInput = inputs[nextIndex]
      const formField = nextInput.closest('.form-field')
      if (!formField || !formField.classList.contains('system-field')) {
        nextInput.focus()
        if ('select' in nextInput) {
          (nextInput as HTMLInputElement).select()
        }
        e.preventDefault()
        return
      }
      nextIndex++
    }
    // 如果是最后一个输入框，跳到商品明细表格的第一个输入框
    const tableInputs = Array.from(document.querySelectorAll('.erp-page .el-table input')) as HTMLElement[]
    if (tableInputs.length > 0) {
      tableInputs[0].focus()
      if ('select' in tableInputs[0]) {
        (tableInputs[0] as HTMLInputElement).select()
      }
    }
  }
  e.preventDefault()
}
</script>

<template>
  <div class="erp-page" tabindex="0" @keydown="handleKeyDown">
    <div v-if="form.auditStatus === 'audited'" class="audit-seal" aria-hidden="true">
      <div class="audit-seal-frame">
        <span class="audit-seal-text">已审核</span>
      </div>
    </div>
    <!-- 页面标题 -->
    <div class="page-title-bar">
      <div class="title-left">
        <h2>采购订单</h2>
        <div class="status-badges">
          <el-tag
            v-if="purchaseOrderConfirmEnabled"
            size="small"
            effect="plain"
            :type="confirmStatusTagType"
          >
            {{ form.confirmStatus || CONFIRM_STATUS_UNCONFIRMED }}
          </el-tag>
          <el-tag
            size="small"
            effect="plain"
            :type="auditStatusTagType"
            :class="{ 'audit-tag-seal': form.auditStatus === 'audited' }"
          >
            {{ auditStatusLabel }}
          </el-tag>
          <span
            v-if="form.auditStatus === 'audited' && (form.auditor || form.auditTime)"
            class="audit-meta"
          >
            {{ form.auditor }}<template v-if="form.auditor && form.auditTime"> · </template>{{ form.auditTime }}
          </span>
        </div>
      </div>
      <div class="title-actions">
        <el-button type="primary" size="small" plain @click="handleCreateNew">新增采购订单</el-button>
        <el-button type="primary" size="small" @click="handleSubmit">保存</el-button>
        <el-button
          type="primary"
          size="small"
          plain
          :disabled="form.auditStatus === 'audited'"
          @click="handleSaveAndAudit"
        >保存并审核</el-button>
        <el-button type="primary" size="small" plain @click="handleSaveAndNew">保存并新增</el-button>
        <el-button
          size="small"
          :type="approvalButtonType"
          @click="handleApprovalToggle"
        >{{ approvalButtonLabel }}</el-button>
        <el-button
          size="small"
          type="danger"
          plain
          :disabled="form.auditStatus !== 'audited'"
          @click="handleModifyRequest"
        >申请修改</el-button>
        <el-button size="small" @click="handleHistoryDocs">历史单据</el-button>
        <el-dropdown split-button type="primary" size="small" class="btn-print" @click="handlePrint">
          打印(含附件/列表)
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handlePrint">打印预览</el-dropdown-item>
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

    <!-- 基本信息 -->
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
        <p v-if="collabEnabledForSupplier && form.auditStatus !== 'audited'" class="collab-flow-hint">
          {{ activeCollabHint }}
          <span v-if="!visibleFields.has('sellerOrderNo')" class="collab-field-tip">
            （可在「表头设置」中显示「对方销售订单号」字段）
          </span>
        </p>
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
              <label v-if="field.tip" class="label-with-tip">
                {{ field.label }}
                <el-tooltip
                  :content="field.tip"
                  placement="top"
                  effect="dark"
                  popper-class="form-field-tooltip"
                >
                  <el-icon class="tip-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </label>
              <label v-else>{{ field.label }}</label>

              <el-select
                v-if="field.key === 'supplier'"
                v-model="form.supplierCode"
                filterable
                default-first-option
                placeholder="请选择供应商"
                @change="handleSupplierChange"
                size="small"
                style="width: 100%;"
              >
                <el-option v-for="opt in supplierOptions" :key="opt.code" :label="opt.label" :value="opt.value">
                  <span>{{ opt.label }}</span>
                  <span class="option-sub">{{ opt.code }}</span>
                </el-option>
              </el-select>

              <el-input
                v-else-if="field.type === 'input'"
                v-model="form[field.key as keyof typeof form]"
                :maxlength="field.maxLength"
                size="small"
                :disabled="field.disabled"
              />

              <el-select
                v-else-if="field.key === 'warehouse'"
                v-model="form.warehouse"
                default-first-option
                placeholder="请选择仓库"
                size="small"
                style="width: 100%;"
                clearable
                @change="handleHeaderWarehouseChange"
              >
                <el-option
                  v-for="opt in warehouseOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>

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
                @keydown.enter="(e: KeyboardEvent) => handleDateFieldEnter(field, e)"
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

              <el-switch
                v-else-if="field.type === 'switch'"
                v-model="form[field.key as keyof typeof form]"
              />
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 商品信息 -->
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
          <div class="toolbar-right">
            <button type="button" class="toolbar-link" @click="handleSupplierPriceQuery">供应商价格查询</button>
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
                    :fetch-suggestions="(_q, cb) => fetchProductSuggestions(row, cb)"
                    @select="(item: ProductSuggestion) => handleProductSuggestionSelect(row, item)"
                    @blur="handleItemProductBlur(row)"
                    @input="clearProductLock(row)"
                  >
                    <template #header>
                      <div class="product-suggest-item is-header">
                        <span class="col-code">商品编码</span>
                        <span class="col-name">商品名称</span>
                        <span class="col-spec">规格型号</span>
                        <span class="col-mfr">生产厂家</span>
                        <span class="col-price is-num">上次进价</span>
                        <span class="col-stock is-num">库存</span>
                        <span class="col-aux">辅助单位</span>
                      </div>
                    </template>
                    <template #default="{ item: suggestion }">
                      <div class="product-suggest-item">
                        <span class="col-code s-code">{{ suggestion.product.code }}</span>
                        <span class="col-name s-name" :title="getProductDisplayName(suggestion.product)">{{ getProductDisplayName(suggestion.product) }}</span>
                        <span class="col-spec s-spec" :title="suggestion.product.spec">{{ suggestion.product.spec || '-' }}</span>
                        <span class="col-mfr s-mfr" :title="suggestion.product.manufacturer">{{ suggestion.product.manufacturer || '-' }}</span>
                        <span class="col-price s-last-price is-num">{{ formatMoney(suggestion.lastPrice) }}</span>
                        <span class="col-stock s-stock is-num">{{ suggestion.stockQty }}</span>
                        <span class="col-aux s-aux">{{ suggestion.auxUnit }}</span>
                      </div>
                    </template>
                  </el-autocomplete>
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
                  :fetch-suggestions="(_q, cb) => fetchProductSuggestions(row, cb)"
                  @select="(item: ProductSuggestion) => handleProductSuggestionSelect(row, item)"
                  @blur="handleItemProductBlur(row)"
                  @input="clearProductLock(row)"
                >
                  <template #header>
                    <div class="product-suggest-item is-header">
                      <span class="col-code">商品编码</span>
                      <span class="col-name">商品名称</span>
                      <span class="col-spec">规格型号</span>
                      <span class="col-mfr">生产厂家</span>
                      <span class="col-price is-num">上次进价</span>
                      <span class="col-stock is-num">库存</span>
                      <span class="col-aux">辅助单位</span>
                    </div>
                  </template>
                  <template #default="{ item: suggestion }">
                    <div class="product-suggest-item">
                      <span class="col-code s-code">{{ suggestion.product.code }}</span>
                      <span class="col-name s-name" :title="getProductDisplayName(suggestion.product)">{{ getProductDisplayName(suggestion.product) }}</span>
                      <span class="col-spec s-spec" :title="suggestion.product.spec">{{ suggestion.product.spec || '-' }}</span>
                      <span class="col-mfr s-mfr" :title="suggestion.product.manufacturer">{{ suggestion.product.manufacturer || '-' }}</span>
                      <span class="col-price s-last-price is-num">{{ formatMoney(suggestion.lastPrice) }}</span>
                      <span class="col-stock s-stock is-num">{{ suggestion.stockQty }}</span>
                      <span class="col-aux s-aux">{{ suggestion.auxUnit }}</span>
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
                  :fetch-suggestions="(_q, cb) => fetchProductSuggestions(row, cb)"
                  @select="(item: ProductSuggestion) => handleProductSuggestionSelect(row, item)"
                  @blur="handleItemProductBlur(row)"
                  @input="clearProductLock(row)"
                >
                  <template #header>
                    <div class="product-suggest-item is-header">
                      <span class="col-code">商品编码</span>
                      <span class="col-name">商品名称</span>
                      <span class="col-spec">规格型号</span>
                      <span class="col-mfr">生产厂家</span>
                      <span class="col-price is-num">上次进价</span>
                      <span class="col-stock is-num">库存</span>
                      <span class="col-aux">辅助单位</span>
                    </div>
                  </template>
                  <template #default="{ item: suggestion }">
                    <div class="product-suggest-item">
                      <span class="col-code s-code">{{ suggestion.product.code }}</span>
                      <span class="col-name s-name" :title="getProductDisplayName(suggestion.product)">{{ getProductDisplayName(suggestion.product) }}</span>
                      <span class="col-spec s-spec" :title="suggestion.product.spec">{{ suggestion.product.spec || '-' }}</span>
                      <span class="col-mfr s-mfr" :title="suggestion.product.manufacturer">{{ suggestion.product.manufacturer || '-' }}</span>
                      <span class="col-price s-last-price is-num">{{ formatMoney(suggestion.lastPrice) }}</span>
                      <span class="col-stock s-stock is-num">{{ suggestion.stockQty }}</span>
                      <span class="col-aux s-aux">{{ suggestion.auxUnit }}</span>
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
                  :fetch-suggestions="(_q, cb) => fetchProductSuggestions(row, cb)"
                  @select="(item: ProductSuggestion) => handleProductSuggestionSelect(row, item)"
                  @blur="handleItemProductBlur(row)"
                  @input="clearProductLock(row)"
                >
                  <template #header>
                    <div class="product-suggest-item is-header">
                      <span class="col-code">商品编码</span>
                      <span class="col-name">商品名称</span>
                      <span class="col-spec">规格型号</span>
                      <span class="col-mfr">生产厂家</span>
                      <span class="col-price is-num">上次进价</span>
                      <span class="col-stock is-num">库存</span>
                      <span class="col-aux">辅助单位</span>
                    </div>
                  </template>
                  <template #default="{ item: suggestion }">
                    <div class="product-suggest-item">
                      <span class="col-code s-code">{{ suggestion.product.code }}</span>
                      <span class="col-name s-name" :title="getProductDisplayName(suggestion.product)">{{ getProductDisplayName(suggestion.product) }}</span>
                      <span class="col-spec s-spec" :title="suggestion.product.spec">{{ suggestion.product.spec || '-' }}</span>
                      <span class="col-mfr s-mfr" :title="suggestion.product.manufacturer">{{ suggestion.product.manufacturer || '-' }}</span>
                      <span class="col-price s-last-price is-num">{{ formatMoney(suggestion.lastPrice) }}</span>
                      <span class="col-stock s-stock is-num">{{ suggestion.stockQty }}</span>
                      <span class="col-aux s-aux">{{ suggestion.auxUnit }}</span>
                    </div>
                  </template>
                </el-autocomplete>
                <el-input v-else-if="col.key === 'productionLicense'" v-model="row.productionLicense" size="small" />
                <el-input v-else-if="col.key === 'registrationNo'" v-model="row.registrationNo" size="small" />
                <el-input v-else-if="col.key === 'registrant'" v-model="row.registrant" size="small" />
                <span
                  v-else-if="col.key === 'warehouse' && shouldSkipItemWarehouseField()"
                  class="calc-text warehouse-sync-text"
                  :title="row.warehouse || getDefaultItemWarehouse()"
                >{{ row.warehouse || getDefaultItemWarehouse() }}</span>
                <el-select
                  v-else-if="col.key === 'warehouse'"
                  v-model="row.warehouse"
                  default-first-option
                  size="small"
                  style="width: 100%;"
                  @keydown.enter.capture="(e: KeyboardEvent) => handleItemWarehouseEnter(e, $index)"
                >
                  <el-option :label="SYSTEM_DEFAULT_WAREHOUSE_NAME" :value="SYSTEM_DEFAULT_WAREHOUSE_NAME" />
                  <el-option v-for="opt in warehouseOptions" :key="opt.value" :label="opt.label" :value="opt.label" />
                </el-select>
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
                <span v-else-if="col.key === 'unit'" class="calc-text">{{ row.unit || '-' }}</span>
                <el-input-number
                  v-else-if="col.key === 'unitPrice'"
                  v-model="row.unitPrice"
                  :min="0"
                  :precision="4"
                  :controls="false"
                  size="small"
                  class="cell-number"
                  :disabled="isOrderAudited"
                  @change="calcRowAmount(row)"
                  @input="calcRowAmount(row)"
                />
                <span v-else-if="col.key === 'lastPrice'" class="calc-text">{{ formatMoney(row.lastPrice) }}</span>
                <span v-else-if="col.key === 'amount'" class="amount-text">{{ formatMoney(row.amount) }}</span>
                <span v-else-if="col.key === 'auxQuantity'" class="calc-text">{{ formatQty(row.auxQuantity) }}</span>
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
                <BatchNoCellKeyboard
                  v-else-if="col.key === 'batchNo'"
                  :row="row"
                  :global-format="loadBatchNoFormat()"
                  :disabled="isOrderAudited"
                  @format-change="handleBatchFormatChange(row)"
                  @batch-input="handleBatchNoInput(row)"
                />
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
            成交金额：<strong class="highlight-amount">{{ formatMoney(receivableAmount) }}</strong>
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
            <label>整单折扣额</label>
            <el-input-number v-model="form.discountAmount" :min="0" :precision="2" :controls="false" size="small" style="width: 100%;" />
          </div>
          <div class="form-field">
            <label>整单折扣率 %</label>
            <el-input-number v-model="form.discountRate" :min="0" :max="100" :precision="2" :controls="false" size="small" style="width: 100%;" />
          </div>
          <div class="form-field">
            <label>应交金额（成交金额）</label>
            <el-input :model-value="formatMoney(receivableAmount)" size="small" disabled />
          </div>
        </div>
        <div class="expense-row">
          <span class="expense-label">预计采购费用明细</span>
          <button type="button" class="toolbar-link" @click="handleAddExpense">+ 添加费用</button>
          <span class="expense-total">合计: {{ formatMoney(purchaseExpenseTotal) }}</span>
          <div v-if="purchaseExpenses.length" class="expense-tags">
            <el-tag
              v-for="(exp, idx) in purchaseExpenses"
              :key="idx"
              size="small"
              closable
              @close="purchaseExpenses.splice(idx, 1)"
            >
              {{ exp.name }} {{ formatMoney(exp.amount) }}
            </el-tag>
          </div>
        </div>
        <div class="form-grid amount-grid">
          <div class="form-field">
            <label class="label-with-link">
              付款账户
              <button type="button" class="inline-link">读取账户余额</button>
            </label>
            <el-select v-model="form.paymentAccount" default-first-option size="small" placeholder="请选择" style="width: 100%;">
              <el-option v-for="opt in paymentAccountOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </div>
          <div class="form-field">
            <label>付款方式</label>
            <el-select v-model="form.paymentMethod" default-first-option size="small" placeholder="请选择" style="width: 100%;">
              <el-option v-for="opt in paymentMethodOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </div>
          <div class="form-field">
            <label>本次付款金额</label>
            <div class="input-with-icon">
              <el-input-number v-model="form.currentPaymentAmount" :min="0" :precision="2" :controls="false" size="small" style="width: 100%;" />
              <el-icon class="calc-icon"><Coin /></el-icon>
            </div>
          </div>
          <div class="form-field">
            <label class="label-with-link">
              预付定金
              <button type="button" class="inline-link" @click="handleGeneratePrepay">生成预付单</button>
            </label>
            <div class="prepay-row">
              <el-input-number v-model="form.prepaidDeposit" :min="0" :precision="2" :controls="false" size="small" style="flex: 1;" />
              <el-checkbox v-model="form.enablePreDeduction" size="small">定向抵扣</el-checkbox>
              <el-tooltip content="开启后，预付订金将按本采购订单号定向抵扣应付" placement="top">
                <el-icon class="help-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 交货信息 -->
    <div class="section-card">
      <div class="section-header" @click="deliveryCollapsed = !deliveryCollapsed">
        <span class="section-icon" :class="{ collapsed: deliveryCollapsed }">▼</span>
        <h3>交货信息</h3>
      </div>
      <div class="section-body" v-show="!deliveryCollapsed" @keydown.capture="handleFormGridSelectOnlyKeydown">
        <div class="form-grid delivery-grid">
          <div class="form-field">
            <label>交货方式</label>
            <el-select v-model="form.deliveryMethod" default-first-option size="small" placeholder="请选择交货方式" style="width: 100%;">
              <el-option v-for="opt in deliveryMethodOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </div>
          <div class="form-field">
            <label>运送方式</label>
            <el-select v-model="form.shippingMethod" default-first-option size="small" placeholder="请选择运送方式" style="width: 100%;">
              <el-option v-for="opt in shippingMethodOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </div>
        </div>
      </div>
    </div>
  </div>

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

  <!-- 批量添加弹窗 -->
  <ProductBatchSelectDialog
    v-model="showBatchAdd"
    variant="purchase"
    :products="batchProductList"
    :row-selectable="batchRowSelectable"
    @confirm="confirmBatchAdd"
  />

  <!-- 库存明细弹窗 -->
  <el-dialog v-model="showStockSelect" title="从库存明细添加" width="900px" draggable>
    <div class="stock-select-dialog">
      <div class="batch-search">
        <el-input v-model="stockSearchQuery" placeholder="搜索商品编码/名称/规格" prefix-icon="Search" clearable />
      </div>
      <el-table :data="filteredStockList" height="400" @selection-change="(val: any[]) => stockSelectedItems = val">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="code" label="商品编码" width="100" />
        <el-table-column label="商品名称" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getProductDisplayName(row) }}
          </template>
        </el-table-column>
        <el-table-column prop="spec" label="规格" width="120" />
        <el-table-column prop="manufacturer" label="生产厂家" min-width="150" />
        <el-table-column prop="stockQty" label="库存数量" width="100" align="right" />
        <el-table-column prop="availableQty" label="可用数量" width="100" align="right" />
        <el-table-column prop="warehouse" label="仓库" width="100" />
        <el-table-column prop="location" label="库位" width="100" />
        <el-table-column prop="batchNo" label="批号" width="120" />
        <el-table-column prop="productionDate" label="生产日期" width="110" />
        <el-table-column prop="expiryDate" label="有效期至" width="110" />
      </el-table>
    </div>
    <template #footer>
      <el-button @click="showStockSelect = false">取消</el-button>
      <el-button type="primary" @click="confirmStockAdd">确定添加</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
@import '@/styles/order-form-basic-info.scss';
@import '@/styles/document-table-sort.scss';

.erp-page {
  padding: 0;
  background-color: #F0F2F5;
  min-height: calc(100vh - 60px);
}

// 页面标题栏
.erp-page {
  position: relative;
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
  border-bottom: 1px solid #E8E8E8;

  .title-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: nowrap;
    min-width: 0;
  }

  .status-badges {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
    min-height: 24px;
  }

  h2 {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0;
    line-height: 24px;
    flex-shrink: 0;
  }

  .audit-tag-seal {
    border-color: #d32f2f;
    color: #c62828;
    background: rgba(211, 47, 47, 0.06);
    font-weight: 600;
  }

  .audit-meta {
    font-size: 12px;
    color: #c62828;
    line-height: 24px;
    white-space: nowrap;
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
    border-left: 1px solid #E8E8E8;
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

// 区块卡片
.section-card {
  background: #fff;
  margin: 8px 16px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: #FAFAFA;
  border-bottom: 1px solid #F0F0F0;
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
}

// 表单网格
.form-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 24px;

  .header-empty-tip {
    color: #999;
    font-size: 13px;
    padding: 8px 0;
  }

  &.amount-grid,
  &.delivery-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  &:not(.basic-info-grid) .form-field {
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
      color: #F53F3F;
      margin-left: 2px;
    }

    label {
      font-size: 12px;
      color: #666;
      line-height: 20px;
    }

    .field-status-value {
      display: flex;
      align-items: center;
      min-height: 28px;
      padding-bottom: 4px;
      box-sizing: border-box;
    }

    .label-with-tip,
    .label-with-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .tip-icon {
      color: #1677ff;
      font-size: 16px;
      cursor: help;
    }

    .inline-link {
      border: none;
      background: none;
      color: #1890ff;
      font-size: 12px;
      cursor: pointer;
      padding: 0;
      margin-left: 8px;

      &:hover {
        color: #096dd9;
      }
    }

    .option-sub {
      color: #999;
      font-size: 12px;
      margin-left: 8px;
    }

    .input-with-icon {
      position: relative;

      .calc-icon {
        position: absolute;
        right: 4px;
        top: 50%;
        transform: translateY(-50%);
        color: #1890ff;
        font-size: 16px;
        pointer-events: none;
      }
    }

    .prepay-row {
      display: flex;
      align-items: center;
      gap: 12px;

      .help-icon {
        color: #909399;
        font-size: 14px;
        cursor: help;
      }
    }

    // 彻底清除所有边框，用 box-shadow 模拟底部线
    :deep(.el-input),
    :deep(.el-select),
    :deep(.el-textarea) {
      border: none !important;
      outline: none !important;
    }

    :deep(.el-input__wrapper),
    :deep(.el-select__wrapper) {
      box-shadow: 0 1px 0 0 #e4e7ed !important;
      border: none !important;
      background: transparent;
      border-radius: 0;
      padding: 1px 0 4px 0 !important;
      outline: none !important;
      height: 28px !important;
      line-height: 22px !important;
    }

    :deep(.el-input__wrapper::before),
    :deep(.el-input__wrapper::after),
    :deep(.el-select__wrapper::before),
    :deep(.el-select__wrapper::after) {
      display: none !important;
    }

    :deep(.el-input__inner) {
      border: none !important;
      outline: none !important;
      background: transparent;
      height: 22px !important;
      line-height: 22px !important;
    }

    :deep(.el-textarea) {
      border: none !important;
      outline: none !important;
    }

    :deep(.el-textarea__inner) {
      border: none !important;
      outline: none !important;
      background: transparent;
      box-shadow: 0 1px 0 0 #e4e7ed !important;
      resize: vertical;
      min-height: 28px !important;
      padding: 1px 0 4px 0 !important;
    }

    // 清除 textarea 可能的伪元素边框
    :deep(.el-textarea__inner::before),
    :deep(.el-textarea__inner::after) {
      display: none !important;
    }

    :deep(.el-select__wrapper) {
      min-height: 28px !important;
    }

    :deep(.el-select__selected-text) {
      line-height: 22px !important;
    }
  }
}

// 商品添加行
.item-add-row {
  display: flex;
  gap: 0;
  margin-top: 0;
  align-items: center;
  border: 1px solid #e4e7ed;
  border-top: none;
  background: #fff;
  padding: 0;
  flex-wrap: nowrap;
  overflow-x: auto;

  .add-cell {
    padding: 8px;
    display: flex;
    align-items: center;
    border-right: 1px solid #e4e7ed;
    min-height: 36px;
    box-sizing: border-box;

    &:last-child {
      border-right: none;
    }

    .calc-text {
      color: #666;
      font-size: 13px;
    }
  }
}

// 合计行
.summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #FAFAFA;
  border-top: 1px solid #F0F0F0;
  margin-top: 0;

  &.items-summary-bar {
    background: #FFFBE6;
    border-top: 1px solid #FFE58F;

    .highlight-amount {
      color: #D48806;
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

.item-toolbar {
  flex-wrap: wrap;
  gap: 4px;

  :deep(.el-divider--vertical) {
    margin: 0 4px;
    height: 20px;
  }
}

.collab-flow-hint {
  margin: 0 16px 12px;
  padding: 8px 12px;
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  color: #096dd9;
  font-size: 13px;
  line-height: 1.6;

  .collab-field-tip {
    color: #595959;
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

  .toolbar-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: none;
    background: transparent;
    color: #1890ff;
    font-size: 13px;
    cursor: pointer;
    padding: 4px 0;

    &:hover {
      color: #096dd9;
      text-decoration: underline;
    }
  }

  .toolbar-right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 24px;
  }
}

.attachment-section {
  min-height: 80px;

  .attachment-empty {
    color: #999;
    font-size: 13px;
    padding: 16px 0;
  }

  .attachment-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .attachment-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #fafafa;
    border-radius: 4px;
    font-size: 13px;

    .file-name {
      color: #333;
      flex: 1;
    }

    .file-size {
      color: #999;
      font-size: 12px;
    }
  }
}

.items-table-wrap {
  overflow: hidden;
  padding: 0;
  width: 100%;

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
        background: linear-gradient(180deg, #ffffff 0%, #eef4ff 100%);
        border: 1px solid #91caff;
        border-radius: 6px;
        box-shadow:
          0 0 0 1px rgba(22, 93, 255, 0.08),
          0 6px 16px rgba(22, 93, 255, 0.18),
          0 2px 6px rgba(0, 0, 0, 0.12);
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
        transition: all 0.15s ease;

        .el-icon {
          font-size: 14px;
          font-weight: 700;
        }

        &.is-add {
          color: #1677ff;
          background: #e6f4ff;
          border-color: #91caff;

          &:hover {
            color: #fff;
            background: #1677ff;
            border-color: #1677ff;
            box-shadow: 0 2px 6px rgba(22, 119, 255, 0.35);
          }
        }

        &.is-remove {
          color: #f53f3f;
          background: #ffece8;
          border-color: #ffccc7;

          &:hover {
            color: #fff;
            background: #f53f3f;
            border-color: #f53f3f;
            box-shadow: 0 2px 6px rgba(245, 63, 63, 0.35);
          }
        }

        &.is-copy {
          color: #00b578;
          background: #e8fff3;
          border-color: #7be0a8;

          &:hover {
            color: #fff;
            background: #00b578;
            border-color: #00b578;
            box-shadow: 0 2px 6px rgba(0, 181, 120, 0.35);
          }
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
    .el-table__border-right-patch {
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

      .el-select .el-select__selected-item {
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

      .batch-no-cell-kb {
        .el-input__wrapper.is-focus,
        .el-input.is-focus .el-input__wrapper {
          background: #ffc53d !important;
          box-shadow: inset 0 0 0 1px #d48806 !important;
        }
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
      color: #F53F3F;
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

        :deep(.el-input__inner) {
          color: #1d2939 !important;
          -webkit-text-fill-color: #1d2939 !important;
        }
      }

      .el-input {
        flex: 1;
      }
    }

    .product-field-autocomplete {
      width: 100%;

      :deep(.el-input__inner) {
        color: #1d2939 !important;
        -webkit-text-fill-color: #1d2939 !important;
      }
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
      color: #165DFF;
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

.amount-section {
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
}

// 字段选择弹窗
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
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    cursor: move;
    user-select: none;

    &:hover {
      background: #f5f7fa;
    }

    :deep(.el-checkbox) {
      cursor: pointer;
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

// 批量添加弹窗
.batch-add-dialog,
.stock-select-dialog {
  .batch-search {
    margin-bottom: 16px;

    .el-input {
      width: 300px;
    }
  }
}
</style>

<style lang="scss">
.form-field-tooltip.el-popper {
  font-size: 14px !important;
  line-height: 22px !important;
  padding: 10px 14px !important;
  max-width: 320px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.product-suggest-popper {
  --product-suggest-cols: 80px 200px 100px 180px 88px 60px 72px;

  min-width: 920px !important;
  width: 920px !important;

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
    overflow: visible !important;
    white-space: normal !important;
    text-overflow: clip !important;
    color: #1d2939 !important;

    &.highlighted,
    &:hover {
      background-color: #fff3cd !important;
      color: #1d2939 !important;
    }
  }

  .product-suggest-item {
    display: grid;
    grid-template-columns: var(--product-suggest-cols);
    column-gap: 0;
    align-items: stretch;
    width: 100%;
    box-sizing: border-box;
    font-size: 12px;
    color: #333;

    &.is-header {
      background: #f5f7fa;
      font-weight: 600;
      color: #606266;
    }

    .is-num {
      text-align: right;
    }

    .col-code,
    .s-code {
      color: #0e42d2 !important;
      font-weight: 600;
    }

    .col-name,
    .s-name {
      color: #1d2939 !important;
    }

    &.is-header .col-code {
      color: #606266;
      font-weight: 600;
    }

    .col-name,
    .col-spec,
    .col-mfr,
    .col-aux,
    .s-name,
    .s-spec,
    .s-mfr,
    .s-aux {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .col-spec,
    .col-mfr,
    .col-aux,
    .s-spec,
    .s-mfr,
    .s-aux {
      color: #666;
    }

    &.is-header .col-spec,
    &.is-header .col-mfr,
    &.is-header .col-aux {
      color: #606266;
    }

    .s-last-price {
      color: #d48806;
      font-weight: 500;
    }

    .s-stock {
      color: #1677ff;
      font-weight: 500;
    }
  }
}
</style>