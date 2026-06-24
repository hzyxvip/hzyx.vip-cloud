<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Setting, ArrowLeft, Plus, Close } from '@element-plus/icons-vue'
import { useTableStyle } from '@/composables/useTableStyle'
import { useElTableLayout } from '@/composables/useElTableLayout'
import '@/styles/product-list-table.scss'
import { useProductListColumnSettings, getCategorySortColumnLabel } from '@/composables/useProductListColumnSettings'
import { useProductListBatchActions } from '@/composables/useProductListBatchActions'
import { usePlatformProductListSearchKeyboard } from '@/composables/useListSearchKeyboard'
import {
  approveCustomerProductAsPlatform,
  getCustomerProductsPendingPlatformReview,
  productSourceLabel,
  rejectCustomerProductPlatformReview
} from '@/utils/customerProductService'
import { saveProductList, clearProductListFully, getProductUnit, getProductListBackupInfo, restoreProductListFromBackup, tryAutoRecoverProductListFromBackup, acknowledgeRestoredProductCodes } from '@/utils/productStore'
import { hydratePlatformAdminProductList, loadPlatformAdminProductList } from '@/utils/platformProductStore'
import { LOADING_RESULT_MESSAGE_DURATION, runWithLoading } from '@/utils/loadingFeedback'
import {
  PRODUCT_EXPORT_LIMIT,
  exportProductsToExcel,
  mergeImportedProducts,
  parseProductImportFile,
  downloadProductImportTemplate
} from '@/utils/productImportExport'
import {
  confirmClearAllProducts,
  isPlatformProductAdmin,
  isProductAuditor,
  requirePlatformProductAdmin
} from '@/utils/userPermission'
import {
  applyProductListFilters,
  CATEGORY_ALL_ID,
  clearProductListCategoryFilter,
  createEmptyProductSearchForm,
  findCategoryNameBySelection,
  isAllCategorySelected,
  loadProductListCategoryFilter,
  resolveSelectedCategoryAfterRebuild,
  saveProductListCategoryFilter,
  sortProductsByColumn,
  type ProductColumnSortOrder
} from '@/utils/productListFilter'
import { useLayoutNavigateBack } from '@/composables/useLayoutNavigateBack'

const router = useRouter()
const layoutNavigateBack = useLayoutNavigateBack()

const handleBack = () => {
  layoutNavigateBack()
}

const importInputRef = ref<HTMLInputElement | null>(null)
const canProductAuditDelete = computed(() => isPlatformProductAdmin())
const canProductAudit = computed(() => isProductAuditor())
const LEGACY_CATEGORY_STORAGE_KEYS = ['defaultPlatformProductCategory', 'defaultProductCategory']
const CATEGORY_FILTER_STORAGE_KEY = 'platformProductListCategoryFilter'

const defaultCategories = [
  { id: 1, name: '手术器械', children: [
    { id: 11, name: '外科手术器械' },
    { id: 12, name: '神经外科手术器械' },
    { id: 13, name: '显微外科手术器械' },
    { id: 14, name: '眼科手术器械' },
    { id: 15, name: '耳鼻喉科手术器械' },
    { id: 16, name: '口腔科手术器械' },
    { id: 17, name: '胸腔心血管外科手术器械' },
    { id: 18, name: '腹部外科手术器械' },
    { id: 19, name: '泌尿肛肠外科手术器械' },
    { id: 110, name: '骨科手术器械' },
    { id: 111, name: '妇产科手术器械' },
    { id: 112, name: '儿科手术器械' }
  ]},
  { id: 2, name: '消毒灭菌设备', children: [
    { id: 21, name: '消毒灭菌设备及器具' }
  ]},
  { id: 3, name: '医用材料', children: [
    { id: 31, name: '医用卫生材料及敷料' },
    { id: 32, name: '医用缝合材料和粘合剂' },
    { id: 33, name: '医用高分子材料及制品' }
  ]},
  { id: 4, name: '介入器械', children: [
    { id: 41, name: '介入器械' }
  ]},
  { id: 5, name: '手术室设备', children: [
    { id: 51, name: '手术室急救室诊疗室设备及器具' }
  ]},
  { id: 6, name: '医用电子仪器', children: [
    { id: 61, name: '医用电子仪器设备' }
  ]},
  { id: 7, name: '医用光学仪器', children: [
    { id: 71, name: '医用光学器具仪器及内窥镜设备' }
  ]},
  { id: 8, name: '医用超声仪器', children: [
    { id: 81, name: '医用超声仪器及有关设备' }
  ]},
  { id: 9, name: '体外诊断试剂', children: [
    { id: 91, name: '体外诊断试剂' }
  ]}
]

const categories = ref([...defaultCategories])
const expandedKeys = ref<number[]>([1, 2])
const selectedCategory = ref<number | null>(CATEGORY_ALL_ID)
const categorySearchKeyword = ref('')

const filteredCategories = computed(() => {
  if (!categorySearchKeyword.value) {
    return categories.value
  }
  const keyword = categorySearchKeyword.value.toLowerCase()
  return categories.value.filter(cat => {
    const matchSelf = cat.name.toLowerCase().includes(keyword)
    const matchChildren = cat.children?.some(child => child.name.toLowerCase().includes(keyword))
    return matchSelf || matchChildren
  })
})

// 分类排序方式
const storedSortType = localStorage.getItem('platformCategorySortType')
const platformCategorySortType = ref<string>(storedSortType || 'all')
const lastCategorySortType = ref(platformCategorySortType.value)

const getSavedCategoryName = () => {
  const saved = loadProductListCategoryFilter(CATEGORY_FILTER_STORAGE_KEY)
  if (!saved || saved.sortType !== platformCategorySortType.value) return null
  return saved.categoryName ?? null
}

const persistCategoryFilter = () => {
  saveProductListCategoryFilter(CATEGORY_FILTER_STORAGE_KEY, {
    sortType: platformCategorySortType.value,
    categoryId: selectedCategory.value,
    categoryName: findCategoryNameBySelection(selectedCategory.value, categories.value) ?? undefined
  })
}

const syncSelectedCategory = () => {
  selectedCategory.value = resolveSelectedCategoryAfterRebuild(
    platformCategorySortType.value,
    categories.value,
    selectedCategory.value,
    getSavedCategoryName()
  )
}

// 搜索表单数据
const searchForm = reactive({
  ...createEmptyProductSearchForm()
})

// 默认商品数据
const defaultProducts = [
  { 
    id: 1, 
    code: 'PD001', 
    name: '一次性医用口罩', 
    spec: '10只/包',
    manufacturer: '北京医疗科技有限公司',
    registrant: '北京医疗科技有限公司',
    brand: '医享',
    category: '医用耗材',
    type: '一次性用品',
    licenseNo: '京食药监械生产许xxxxxxxx号',
    registerNo: '京械注准xxxxxxxxxx',
    udiCode: '1234567890123',
    medicalCode: '123456789012345678901234567',
    medicalClass: '二类',
    measureUnit: '包',
    storageCondition: '阴凉干燥处',
    medType: '二类',
    remark1: '',
    remark2: '',
    remark3: '',
    remark4: '',
    remark5: '',
    status: '正常',
    auditStatus: '已审核'
  },
  { 
    id: 2, 
    code: 'PD002', 
    name: '医用防护服', 
    spec: 'M/L/XL',
    manufacturer: '上海医疗器械有限公司',
    registrant: '上海医疗器械有限公司',
    brand: '医盾',
    category: '医用耗材',
    type: '防护用品',
    licenseNo: '沪食药监械生产许xxxxxxxx号',
    registerNo: '沪械注准xxxxxxxxxx',
    udiCode: '9876543210987',
    medicalCode: '987654321098765432109876543',
    medicalClass: '二类',
    measureUnit: '套',
    storageCondition: '常温',
    medType: '二类',
    remark1: '',
    remark2: '',
    remark3: '',
    remark4: '',
    remark5: '',
    status: '正常',
    auditStatus: '已审核'
  },
  { 
    id: 3, 
    code: 'PD003', 
    name: '医用手套', 
    spec: '100只/盒',
    manufacturer: '广州医疗用品有限公司',
    registrant: '广州医疗用品有限公司',
    brand: '康护',
    category: '医用耗材',
    type: '一次性用品',
    licenseNo: '粤食药监械生产许xxxxxxxx号',
    registerNo: '粤械注准xxxxxxxxxx',
    udiCode: '5555555555555',
    medicalCode: '555555555555555555555555555',
    medicalClass: '一类',
    measureUnit: '盒',
    storageCondition: '常温干燥',
    medType: '一类',
    remark1: '',
    remark2: '',
    remark3: '',
    remark4: '',
    remark5: '',
    status: '预警',
    auditStatus: '已审核'
  },
  { 
    id: 4, 
    code: 'PD004', 
    name: '电子体温计', 
    spec: '医用级',
    manufacturer: '深圳电子科技有限公司',
    registrant: '深圳电子科技有限公司',
    brand: '精准',
    category: '诊断设备',
    type: '检验设备',
    licenseNo: '粤食药监械生产许xxxxxxxx号',
    registerNo: '粤械注准xxxxxxxxxx',
    udiCode: '8888888888888',
    medicalCode: '888888888888888888888888888',
    medicalClass: '二类',
    measureUnit: '个',
    storageCondition: '常温',
    medType: '二类',
    remark1: '',
    remark2: '',
    remark3: '',
    remark4: '',
    remark5: '',
    status: '正常',
    auditStatus: '待审核'
  }
]

// 从localStorage读取数据
const allProducts = ref<any[]>([])
const filteredData = ref<any[]>([])
const tableData = ref<any[]>([])

const { columnWidths, getColumnWidth, handleHeaderDragend } = useTableStyle('platform-product-list', [
  { key: 'selection', label: '', defaultWidth: 50 },
  { key: 'index', label: '行号', defaultWidth: 56 },
  { key: 'code', label: '商品编码', defaultWidth: 120 },
  { key: 'name', label: '商品名称', defaultWidth: 150 },
  { key: 'spec', label: '规格型号', defaultWidth: 120 },
  { key: 'measureUnit', label: '单位', defaultWidth: 72, align: 'center' },
  { key: 'manufacturer', label: '生产厂家', defaultWidth: 150 },
  { key: 'registrant', label: '注册人/备案人', defaultWidth: 150 },
  { key: 'brand', label: '品牌', defaultWidth: 80 },
  { key: 'category', label: '商品分类', defaultWidth: 100 },
  { key: 'type', label: '商品类型', defaultWidth: 100 },
  { key: 'licenseNo', label: '生产许可证号', defaultWidth: 180 },
  { key: 'registerNo', label: '注册证号', defaultWidth: 160 },
  { key: 'udiCode', label: 'UDI码', defaultWidth: 140 },
  { key: 'medicalCode', label: '医保码', defaultWidth: 180 },
  { key: 'medicalClass', label: '医保报销分类', defaultWidth: 120 },
  { key: 'storageCondition', label: '储运条件', defaultWidth: 120 },
  { key: 'medType', label: '医疗器械分类', defaultWidth: 120 },
  { key: 'source', label: '商品来源', defaultWidth: 100 },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 100 },
  { key: 'status', label: '状态', defaultWidth: 80 },
  { key: 'auditTime', label: '审核时间', defaultWidth: 160 }
])

const {
  showColumnSelector,
  columnOptions,
  selectedColumns,
  selectedCategorySortTypes,
  enabledCategorySortTypes,
  availableCategorySortColumns,
  selectedCategorySortColumnDefs,
  sortedVisibleColumns,
  tableColumnRenderKey,
  openColumnSettings,
  addCategorySortColumn,
  removeCategorySortColumn,
  handleCategorySortDragStart,
  handleCategorySortDragOver,
  handleCategorySortDropOnSelected,
  handleCategorySortDropOnSelectedList,
  handleColumnDragStart,
  handleColumnDragOver,
  handleColumnDrop,
  confirmColumnSelection
} = useProductListColumnSettings('platform-product-list')

const platformCategorySortOptions = computed(() => [
  { label: '全部分类', value: 'all' },
  ...enabledCategorySortTypes.value.map(key => ({
    label: `按${getCategorySortColumnLabel(key)}`,
    value: key
  }))
])

const ensureActiveCategorySortType = () => {
  if (
    platformCategorySortType.value !== 'all' &&
    !enabledCategorySortTypes.value.includes(platformCategorySortType.value)
  ) {
    platformCategorySortType.value = 'all'
    lastCategorySortType.value = 'all'
    selectedCategory.value = CATEGORY_ALL_ID
    clearProductListCategoryFilter(CATEGORY_FILTER_STORAGE_KEY)
  }
}

const handleConfirmColumnSelection = () => {
  if (!confirmColumnSelection()) return
  ensureActiveCategorySortType()
  handleCategorySort()
}

const initProductListData = () => {
  allProducts.value = loadPlatformAdminProductList(defaultProducts)
}

const bootstrapPlatformProducts = async () => {
  tryAutoRecoverProductListFromBackup({ forceIfCurrentBelow: 20 })
  if (localStorage.getItem('token')) {
    allProducts.value = await hydratePlatformAdminProductList(defaultProducts)
  } else {
    initProductListData()
  }
  handleCategorySort()
}

// 初始化localStorage
onMounted(async () => {
  await bootstrapPlatformProducts()

  categorySearchKeyword.value = ''
  clearSavedCategoryFilters()

  const saved = loadProductListCategoryFilter(CATEGORY_FILTER_STORAGE_KEY)
  if (saved?.sortType === platformCategorySortType.value && saved.categoryId != null) {
    selectedCategory.value = saved.categoryId
  } else {
    selectedCategory.value = CATEGORY_ALL_ID
  }

  resetSearchFormSilently(searchForm)
  ensureActiveCategorySortType()
  handleCategorySort()
  layoutProductTable()
})

watch(tableColumnRenderKey, () => {
  layoutProductTable()
})

const currentPage = ref(1)
const pageSize = ref(20)

const indexMethod = (index: number) => (currentPage.value - 1) * pageSize.value + index + 1

const getProductRowKey = (row: { id?: number | string; code?: string }) =>
  String(row.id ?? row.code ?? '')

const clearSavedCategoryFilters = () => {
  LEGACY_CATEGORY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key))
}

const refreshProductList = (resetPage = true) => {
  syncSelectedCategory()

  filteredData.value = applyProductListFilters(allProducts.value, searchForm, {
    sortType: platformCategorySortType.value,
    selectedCategoryId: selectedCategory.value,
    categories: categories.value
  })

  const maxPage = Math.max(1, Math.ceil(filteredData.value.length / pageSize.value) || 1)
  if (resetPage) {
    currentPage.value = 1
  } else if (currentPage.value > maxPage) {
    currentPage.value = maxPage
  }

  paginateData()
}

const paginateData = () => {
  const total = filteredData.value.length
  const maxPage = Math.max(1, Math.ceil(total / pageSize.value) || 1)
  if (currentPage.value > maxPage) {
    currentPage.value = maxPage
  }
  if (currentPage.value < 1) {
    currentPage.value = 1
  }

  let displayData = filteredData.value
  const activeSort = getActiveColumnSort()
  if (activeSort) {
    displayData = sortProductsByColumn(displayData, activeSort.prop, activeSort.order)
  }

  const start = (currentPage.value - 1) * pageSize.value
  tableData.value = displayData.slice(start, start + pageSize.value)
  layoutProductTable()
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  paginateData()
}

const handlePageSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  paginateData()
}

const resetProductFilters = () => {
  selectedCategory.value = CATEGORY_ALL_ID
  categorySearchKeyword.value = ''
  clearSavedCategoryFilters()
  clearProductListCategoryFilter(CATEGORY_FILTER_STORAGE_KEY)
  resetSearchFormSilently(searchForm)
  selectedIds.value = []
  selectAll.value = false
  refreshProductList(true)
}

const productBackupInfo = computed(() => getProductListBackupInfo())

const handleRestoreFromBackup = async () => {
  const info = getProductListBackupInfo()
  const restoreCount = Math.max(info.bestRecoveryCount, info.backupCount, info.snapshotCount, info.catalogCount)
  if (!info.canRestore || restoreCount <= allProducts.value.length) {
    ElMessage.warning('未找到比当前列表更多的商品备份。如有 Excel 文件，请使用「导入」。')
    return
  }
  try {
    await ElMessageBox.confirm(
      `检测到本地备份约 ${restoreCount} 条（当前 ${allProducts.value.length} 条）。确定恢复吗？`,
      '恢复商品备份',
      { type: 'warning', confirmButtonText: '恢复', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  await runWithLoading(async () => {
    const result = await restoreProductListFromBackup()
    if (!result.ok) {
      ElMessage.warning({ message: result.message, duration: LOADING_RESULT_MESSAGE_DURATION })
      return
    }
    allProducts.value = loadPlatformAdminProductList(defaultProducts)
    handleCategorySort()
    ElMessage.success({ message: result.message, duration: LOADING_RESULT_MESSAGE_DURATION })
  }, { text: '正在恢复商品资料，请稍候…', minDurationMs: 1200 })
}

// 刷新数据：重新拉取并清空筛选，避免刷新后列表被旧条件隐藏
const handleRefresh = async () => {
  await runWithLoading(async () => {
    if (localStorage.getItem('token')) {
      allProducts.value = await hydratePlatformAdminProductList(defaultProducts)
    } else {
      initProductListData()
    }
    selectedCategory.value = CATEGORY_ALL_ID
    categorySearchKeyword.value = ''
    clearSavedCategoryFilters()
    clearProductListCategoryFilter(CATEGORY_FILTER_STORAGE_KEY)
    resetSearchFormSilently(searchForm)
    selectedIds.value = []
    selectAll.value = false
    productTableRef.value?.clearSelection?.()
    currentPage.value = 1
    handleCategorySort()
    ElMessage.success({ message: '数据已刷新', duration: LOADING_RESULT_MESSAGE_DURATION })
  }, { text: '正在刷新商品资料，请稍候…', minDurationMs: 800 })
}

// 搜索商品（与分类筛选联合，排除不符合条件的记录）
const handleSearch = () => {
  refreshProductList(true)
}

const {
  onInputEnter: onSearchInputEnter,
  resetSearchFormSilently
} = usePlatformProductListSearchKeyboard(handleSearch)

const selectedIds = ref<(number | string)[]>([])
const selectAll = ref(false)
const productTableRef = ref<{
  toggleRowSelection: (row: any, selected?: boolean) => void
  clearSelection: () => void
  doLayout?: () => void
}>()
const tableScrollRef = ref<HTMLElement | null>(null)

const layoutProductTable = () => {
  relayoutTable()
}

const { relayoutTable, tableHeight } = useElTableLayout(productTableRef, tableScrollRef)

watch(tableData, () => layoutProductTable())
watch(tableColumnRenderKey, () => layoutProductTable())
watch(pageSize, () => layoutProductTable())

const handleSelectionChange = (val: any[]) => {
  selectedIds.value = val.map(item => getProductRowKey(item))
  selectAll.value = val.length > 0 && val.length === tableData.value.length
}

const handleSelectAllChange = (checked: boolean) => {
  selectAll.value = checked
  if (!productTableRef.value) return
  if (checked) {
    tableData.value.forEach(row => productTableRef.value!.toggleRowSelection(row, true))
  } else {
    productTableRef.value.clearSelection()
  }
}

const handleCategoryClick = (id: number) => {
  selectedCategory.value = id
  persistCategoryFilter()
  refreshProductList(true)
}

const handleCategorySortTypeChange = () => {
  const typeChanged = platformCategorySortType.value !== lastCategorySortType.value
  lastCategorySortType.value = platformCategorySortType.value

  if (typeChanged) {
    selectedCategory.value = CATEGORY_ALL_ID
    clearProductListCategoryFilter(CATEGORY_FILTER_STORAGE_KEY)
  }

  handleCategorySort()
}

// 分类排序处理
const handleCategorySort = (resetPage = true) => {
  localStorage.setItem('platformCategorySortType', platformCategorySortType.value)

  if (platformCategorySortType.value === 'all') {
    categories.value = []
    expandedKeys.value = []
  } else if (platformCategorySortType.value === 'type') {
    categories.value = [...defaultCategories]
    expandedKeys.value = [1, 2]
  } else {
    const categoryField = platformCategorySortType.value
    const uniqueValues = [...new Set(allProducts.value.map(p => p[categoryField]).filter(Boolean))]
    
    let idCounter = 1
    const dynamicCategories = uniqueValues.map(name => {
      const parentId = idCounter++
      return {
        id: parentId,
        name: name,
        children: []
      }
    })
    
    categories.value = dynamicCategories
    expandedKeys.value = dynamicCategories.map(c => c.id)
  }

  syncSelectedCategory()
  persistCategoryFilter()
  refreshProductList(resetPage)
}

const sortOrders = reactive<Record<'code' | 'name' | 'spec' | 'manufacturer' | 'registrant', ProductColumnSortOrder>>({
  code: '',
  name: '',
  spec: '',
  manufacturer: '',
  registrant: ''
})

const getActiveColumnSort = () => {
  for (const key of Object.keys(sortOrders) as Array<keyof typeof sortOrders>) {
    const order = sortOrders[key]
    if (order) return { prop: key, order }
  }
  return null
}

const getSortIcon = (key: keyof typeof sortOrders) => {
  const order = sortOrders[key]
  return order === 'ascending' ? '↑' : order === 'descending' ? '↓' : ''
}

const handleSort = (prop: keyof typeof sortOrders) => {
  if (sortOrders[prop] === '') {
    sortOrders[prop] = 'ascending'
  } else if (sortOrders[prop] === 'ascending') {
    sortOrders[prop] = 'descending'
  } else {
    sortOrders[prop] = ''
  }
  
  Object.keys(sortOrders).forEach((key) => {
    if (key !== prop) {
      sortOrders[key as keyof typeof sortOrders] = ''
    }
  })

  currentPage.value = 1
  paginateData()
}

const pendingPlatformReviewCount = computed(() => getCustomerProductsPendingPlatformReview().length)

const selectedPendingPlatformReviewIds = computed(() =>
  selectedIds.value.filter(id => {
    const row = allProducts.value.find(item => item.id === id)
    return row?.source === 'customerEntry' && row?.platformReviewStatus === '待平台审核'
  })
)

const canApprovePlatformReview = computed(
  () => canProductAudit.value && selectedPendingPlatformReviewIds.value.length > 0
)

const handleApprovePlatformReview = () => {
  if (!canApprovePlatformReview.value) return
  let count = 0
  selectedPendingPlatformReviewIds.value.forEach(id => {
    if (approveCustomerProductAsPlatform(id)) count += 1
  })
  handleCategorySort(false)
  clearTableSelection()
  ElMessage.success(`已纳入平台资料 ${count} 条`)
}

const handleRejectPlatformReview = async () => {
  if (!canApprovePlatformReview.value) return
  let count = 0
  selectedPendingPlatformReviewIds.value.forEach(id => {
    if (rejectCustomerProductPlatformReview(id)) count += 1
  })
  handleCategorySort(false)
  clearTableSelection()
  ElMessage.info(`已驳回 ${count} 条客户录入商品`)
}

const filterPendingPlatformReview = () => {
  const pendingIds = new Set(getCustomerProductsPendingPlatformReview().map(item => item.id))
  filteredData.value = allProducts.value.filter(item => pendingIds.has(item.id))
  currentPage.value = 1
  paginateData()
  ElMessage.info(`已筛选待平台审核商品 ${filteredData.value.length} 条`)
}

const clearTableSelection = () => {
  selectedIds.value = []
  selectAll.value = false
  nextTick(() => productTableRef.value?.clearSelection())
}

const openProductEdit = (row: { code?: string }) => {
  const code = String(row.code ?? '').trim()
  if (!code) return
  router.push(`/platform/product/edit/${encodeURIComponent(code)}`)
}

// 双击行跳转到编辑页面
const handleRowDoubleClick = (row: any) => {
  openProductEdit(row)
}

const handleCodeClick = (row: any) => {
  openProductEdit(row)
}

const {
  showBatchModifyDialog,
  batchModifyColumn,
  batchModifyValue,
  batchModifiableColumns,
  batchModifyColumnDef,
  batchModifySelectOptions,
  canBatchAudit,
  canBatchUnaudit,
  handleBatchAudit,
  handleBatchDelete,
  openBatchModifyDialog,
  confirmBatchModify
} = useProductListBatchActions(allProducts, selectedIds, selectAll, () => {
  handleCategorySort(false)
  clearTableSelection()
}, { deleteGuard: 'platform', requireAdminForModify: true })

const getExportProducts = () => {
  if (selectedIds.value.length > 0) {
    return allProducts.value.filter(item => selectedIds.value.includes(item.id))
  }
  return filteredData.value
}

const handleExport = () => {
  const source = getExportProducts()
  if (source.length === 0) {
    ElMessage.warning('没有可导出的商品数据')
    return
  }

  const { exported, total } = exportProductsToExcel(source, '平台商品资料')
  if (total > PRODUCT_EXPORT_LIMIT) {
    ElMessage.success(`已导出 ${exported} 条，共 ${total} 条（每次最多 ${PRODUCT_EXPORT_LIMIT} 条）`)
    return
  }
  ElMessage.success(`已导出 ${exported} 条商品资料`)
}

const handleDownloadImportTemplate = () => {
  downloadProductImportTemplate('平台商品导入模板')
  ElMessage.success('导入模板已下载，必填：商品编码、商品名称')
}

const handleClearAllProducts = async () => {
  if (!requirePlatformProductAdmin('清空商品资料')) return

  const total = allProducts.value.length
  if (total === 0) {
    ElMessage.info('当前没有商品资料')
    return
  }

  const confirmed = await confirmClearAllProducts(total)
  if (!confirmed) return

  allProducts.value = []
  const synced = await clearProductListFully()
  selectedIds.value = []
  selectAll.value = false
  currentPage.value = 1
  handleCategorySort()
  ElMessage.success(
    synced
      ? `已清空全部 ${total} 条商品资料，请重新导入（以商品编码为唯一标识）`
      : `本地已清空 ${total} 条，服务器同步失败，请检查网络后点「刷新」`
  )
}

const handleImportClick = () => {
  importInputRef.value?.click()
}

const handleImportFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  await runWithLoading(async () => {
    const imported = await parseProductImportFile(file)
    if (imported.length === 0) {
      ElMessage.warning({
        message: '未识别到有效商品：请确认含「商品编号/商品编码」和「商品名称」列（WPS 导出格式已支持）',
        duration: LOADING_RESULT_MESSAGE_DURATION
      })
      return
    }

    const { list, added, updated, skipped } = mergeImportedProducts(allProducts.value, imported)
    allProducts.value = list
    acknowledgeRestoredProductCodes(imported.map(item => String(item.code ?? '')))
    saveProductList(list)
    handleCategorySort()
    ElMessage.success({
      message: `导入完成：共识别 ${imported.length} 条，新增 ${added} 条，更新 ${updated} 条${skipped ? `，跳过 ${skipped} 条（含名称+规格+厂家重复）` : ''}`,
      duration: LOADING_RESULT_MESSAGE_DURATION
    })
  }, {
    text: `正在导入 ${file.name}，请稍候…`,
    minDurationMs: 1500
  }).catch(error => {
    ElMessage.error({
      message: error instanceof Error ? error.message : '导入失败，请检查文件格式',
      duration: LOADING_RESULT_MESSAGE_DURATION
    })
  })
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="handleBack">返回</el-button>
        <h1>平台商品基本资料</h1>
      </div>
    </div>
    
    <div class="search-form list-search-form">
      <div class="search-field" data-search-key="codeName">
        <el-input
          v-model="searchForm.codeName"
          placeholder="商品编码/名称/拼音"
          style="width: 200px;"
          @keydown.enter="onSearchInputEnter('codeName', $event)"
        />
      </div>
      <div class="search-field" data-search-key="spec">
        <el-input
          v-model="searchForm.spec"
          placeholder="规格型号/拼音"
          style="width: 150px;"
          @keydown.enter="onSearchInputEnter('spec', $event)"
        />
      </div>
      <div class="search-field" data-search-key="registrant">
        <el-input
          v-model="searchForm.registrant"
          placeholder="注册人/备案人/拼音"
          style="width: 160px;"
          @keydown.enter="onSearchInputEnter('registrant', $event)"
        />
      </div>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button type="danger" plain @click="resetProductFilters">重置</el-button>
      <el-button type="primary" @click="router.push('/platform/product/create')">新增</el-button>
      <el-button v-if="canProductAuditDelete" type="danger" plain @click="handleClearAllProducts">清空全部</el-button>
      <el-button type="primary" @click="handleRefresh">刷新</el-button>
      <el-button v-if="productBackupInfo.canRestore" @click="handleRestoreFromBackup">恢复备份</el-button>
      <div class="search-form-io-group">
        <el-button type="primary" @click="handleImportClick">导入</el-button>
        <el-button type="primary" @click="handleExport">导出</el-button>
        <el-button @click="handleDownloadImportTemplate">下载导入模板</el-button>
        <input
          ref="importInputRef"
          type="file"
          accept=".xlsx,.xls"
          class="hidden-import-input"
          @change="handleImportFile"
        />
      </div>
    </div>

    <el-alert
      v-if="allProducts.length <= 50 && productBackupInfo.canRestore && productBackupInfo.bestRecoveryCount > allProducts.length"
      class="platform-review-alert"
      type="warning"
      :closable="false"
      show-icon
      :title="`当前仅 ${allProducts.length} 条商品，本地备份约 ${productBackupInfo.bestRecoveryCount} 条，可点「恢复备份」找回`"
    >
      <el-button type="primary" link @click="handleRestoreFromBackup">立即恢复</el-button>
    </el-alert>

    <el-alert
      v-if="pendingPlatformReviewCount > 0"
      class="platform-review-alert"
      type="info"
      :closable="false"
      show-icon
      :title="`有 ${pendingPlatformReviewCount} 条客户自行录入的商品待平台审核，审核通过后可纳入平台资料`"
    >
      <el-button type="primary" link @click="filterPendingPlatformReview">查看待审核</el-button>
    </el-alert>
    
    <div class="product-layout">
      <div class="category-sidebar">
        <div class="category-header">商品分类方式</div>
        <div class="category-sort">
          <el-select 
            v-model="platformCategorySortType" 
            placeholder="选择分类方式" 
            size="small"
            @change="handleCategorySortTypeChange"
            style="width: 100%;"
          >
            <el-option
              v-for="option in platformCategorySortOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        <div v-if="platformCategorySortType !== 'all'" class="category-search">
          <el-input 
            v-model="categorySearchKeyword" 
            placeholder="搜索分类" 
            size="small"
            clearable
          >
            <template #prefix>
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </template>
          </el-input>
        </div>
        <div v-if="platformCategorySortType !== 'all'" class="category-tree">
          <div
            class="category-title category-all-item"
            :class="{ active: isAllCategorySelected(selectedCategory) }"
            @click="handleCategoryClick(CATEGORY_ALL_ID)"
          >
            全部分类
          </div>
            <div v-for="cat in filteredCategories" :key="cat.id" class="category-item">
            <div 
              class="category-title" 
              :class="{ active: selectedCategory === cat.id }"
              @click="handleCategoryClick(cat.id)"
            >
              <span class="expand-icon" v-if="cat.children?.length">
                {{ expandedKeys.includes(cat.id) ? '▼' : '▶' }}
              </span>
              <span>{{ cat.name }}</span>
            </div>
            <div v-if="expandedKeys.includes(cat.id) && cat.children?.length" class="category-children">
              <div 
                v-for="child in cat.children" 
                :key="child.id"
                class="category-child"
                :class="{ active: selectedCategory === child.id }"
                @click="handleCategoryClick(child.id)"
              >
                {{ child.name }}
              </div>
            </div>
            </div>
        </div>
      </div>
      
      <div class="product-content">
        <div class="action-bar">
          <div class="action-bar-left">
            <el-checkbox
              :model-value="selectAll"
              :indeterminate="selectedIds.length > 0 && selectedIds.length < tableData.length"
              @change="handleSelectAllChange"
            >
              全选
            </el-checkbox>
            <span class="selected-text">已选中 <strong>{{ selectedIds.length }}</strong> 条</span>
          </div>
          <div class="action-bar-controls">
            <el-button
              v-if="canProductAudit"
              type="primary"
              plain
              size="small"
              :disabled="!canApprovePlatformReview"
              @click="handleApprovePlatformReview"
            >纳入平台</el-button>
            <el-button
              v-if="canProductAudit"
              type="warning"
              plain
              size="small"
              :disabled="!canApprovePlatformReview"
              @click="handleRejectPlatformReview"
            >驳回客户商品</el-button>
            <el-button
              v-if="canProductAudit"
              type="success"
              plain
              size="small"
              :disabled="!canBatchAudit"
              @click="handleBatchAudit('audit')"
            >审核</el-button>
            <el-button
              v-if="canProductAudit"
              class="btn-unaudit-pink"
              plain
              size="small"
              :disabled="!canBatchUnaudit"
              @click="handleBatchAudit('unaudit')"
            >反审核</el-button>
            <el-button
              type="danger"
              link
              size="small"
              class="btn-delete-link"
              :disabled="selectedIds.length === 0"
              @click="handleBatchDelete"
            >
              删除
            </el-button>
            <el-button
              type="primary"
              plain
              size="small"
              :disabled="selectedIds.length === 0"
              @click="openBatchModifyDialog"
            >批量修改</el-button>
          </div>
          <div class="action-bar-extra">
            <el-button size="small" @click="openColumnSettings">
              <el-icon><Setting /></el-icon> 商品资料设置
            </el-button>
          </div>
        </div>
        
        <div class="table-card product-list-table-card">
          <div ref="tableScrollRef" class="table-scroll product-list-table-scroll">
          <div v-if="sortedVisibleColumns.length === 0" class="header-empty-tip">请点击「商品资料设置」选择要显示的列</div>
          <el-table
            v-else
            ref="productTableRef"
            :key="tableColumnRenderKey"
            :data="tableData"
            :height="tableHeight"
            :row-key="getProductRowKey"
            class="common-table"
            border
            :fit="true"
            @selection-change="handleSelectionChange"
            @row-dblclick="handleRowDoubleClick"
            @header-dragend="handleHeaderDragend"
          >
            <el-table-column type="selection" :width="getColumnWidth('selection', 50)" align="center" header-align="center" />
            <el-table-column
              type="index"
              label="行号"
              :index="indexMethod"
              :width="getColumnWidth('index', 56)"
              align="center"
              header-align="center"
            />

            <el-table-column
              v-for="col in sortedVisibleColumns"
              :key="col.key"
              :prop="col.prop"
              :label="col.label"
              :width="getColumnWidth(col.key)"
              :align="col.align"
              :header-align="col.headerAlign || col.align || 'center'"
              show-overflow-tooltip
            >
              <template v-if="col.sortable" #header>
                <span
                  class="sort-header"
                  :class="{
                    'is-active': !!sortOrders[col.key as keyof typeof sortOrders],
                    'is-right': (col.headerAlign || col.align) === 'right',
                    'is-left': (col.headerAlign || col.align) === 'left'
                  }"
                  @click="handleSort(col.key as keyof typeof sortOrders)"
                >
                  {{ col.label }}
                  <span class="sort-icon">{{ getSortIcon(col.key as keyof typeof sortOrders) }}</span>
                </span>
              </template>

              <template #default="scope">
                <span
                  v-if="col.key === 'code'"
                  class="code-link"
                  @click="handleCodeClick(scope.row)"
                >{{ scope.row.code }}</span>

                <el-tag
                  v-else-if="col.key === 'medType'"
                  :type="scope.row.medType === '一类' ? 'info' : scope.row.medType === '二类' ? 'warning' : scope.row.medType === '三类' ? 'danger' : 'success'"
                >
                  {{ scope.row.medType }}
                </el-tag>

                <el-tag
                  v-else-if="col.key === 'source'"
                  size="small"
                  :type="scope.row.source === 'tradeImported' ? 'success' : scope.row.fromPlatform ? 'warning' : 'info'"
                >
                  {{ productSourceLabel(scope.row.source) }}
                </el-tag>

                <span
                  v-else-if="col.key === 'auditStatus'"
                  :class="['audit-text', scope.row.auditStatus === '已审核' ? 'audit-approved' : 'audit-pending']"
                >
                  {{ scope.row.auditStatus }}
                </span>

                <span v-else-if="col.key === 'auditTime'">{{ scope.row.auditTime || '-' }}</span>

                <span v-else-if="col.key === 'measureUnit'">{{ getProductUnit(scope.row) || '-' }}</span>

                <span v-else>{{ scope.row[col.prop] ?? '' }}</span>
              </template>
            </el-table-column>
          </el-table>
          </div>
          
          <div class="pagination-container">
            <span class="pagination-info">共 {{ filteredData.length }} 条</span>
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :total="filteredData.length"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, prev, pager, next, sizes"
              @size-change="handlePageSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </div>
      </div>
    </div>
  </div>

  <el-dialog
    v-model="showBatchModifyDialog"
    title="批量修改商品资料"
    width="420px"
    draggable
    class="batch-modify-dialog-wrap"
    :close-on-click-modal="false"
  >
    <div class="batch-modify-panel">
      <el-form label-width="68px" class="batch-modify-form list-search-form">
        <el-form-item label="修改列：">
          <el-select v-model="batchModifyColumn" placeholder="选择列" style="width: 100%" filterable>
            <el-option
              v-for="col in batchModifiableColumns"
              :key="col.key"
              :label="col.label"
              :value="col.key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="新值：">
          <el-select
            v-if="batchModifySelectOptions"
            v-model="batchModifyValue"
            :placeholder="`请选择${batchModifyColumnDef?.label || ''}`"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="opt in batchModifySelectOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <el-input v-else v-model="batchModifyValue" placeholder="请输入新值" clearable />
        </el-form-item>
        <p class="batch-modify-tip">
          将修改已选 {{ selectedIds.length }} 条商品的「{{ batchModifyColumnDef?.label || '对应字段' }}」
        </p>
      </el-form>
    </div>
    <template #footer>
      <el-button @click="showBatchModifyDialog = false">取消</el-button>
      <el-button type="primary" @click="confirmBatchModify">确定</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="showColumnSelector"
    title="商品资料设置"
    width="680px"
    draggable
    class="product-settings-dialog-wrap"
  >
    <div class="product-settings-dialog">
      <div class="settings-block">
        <div class="settings-block-head">
          <span class="settings-block-title">商品分类方式</span>
          <span class="settings-block-hint">点击或拖入已选，× 删除</span>
        </div>
        <div class="category-sort-compact">
          <div class="sort-zone">
            <span class="zone-label">可选</span>
            <div class="chip-wrap">
              <button
                v-for="(col, index) in availableCategorySortColumns"
                :key="col.key"
                type="button"
                class="chip chip-add"
                draggable="true"
                @dragstart="(event) => handleCategorySortDragStart(event, 'available', index)"
                @click="addCategorySortColumn(col.key)"
              >
                <span class="chip-text">{{ col.label }}</span>
                <el-icon class="chip-icon"><Plus /></el-icon>
              </button>
              <span v-if="availableCategorySortColumns.length === 0" class="zone-empty">无</span>
            </div>
          </div>
          <div
            class="sort-zone sort-zone--selected"
            @dragover="handleCategorySortDragOver"
            @drop="handleCategorySortDropOnSelectedList"
          >
            <span class="zone-label">已选</span>
            <div class="chip-wrap">
              <button
                v-for="(col, index) in selectedCategorySortColumnDefs"
                :key="col.key"
                type="button"
                class="chip chip-selected"
                draggable="true"
                @dragstart="(event) => handleCategorySortDragStart(event, 'selected', index)"
                @dragover="handleCategorySortDragOver"
                @drop="(event) => handleCategorySortDropOnSelected(event, index)"
              >
                <span class="chip-order">{{ index + 1 }}</span>
                <span class="chip-text">{{ col.label }}</span>
                <el-icon
                  class="chip-remove"
                  @click.stop="removeCategorySortColumn(col.key)"
                >
                  <Close />
                </el-icon>
              </button>
              <span v-if="selectedCategorySortColumnDefs.length === 0" class="zone-empty">拖入或点击上方添加</span>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-block">
        <div class="settings-block-head">
          <span class="settings-block-title">列表显示列</span>
          <span class="settings-block-hint">勾选显示，拖拽排序</span>
        </div>
        <el-checkbox-group v-model="selectedColumns" class="column-grid-group">
          <div class="column-grid">
            <div
              v-for="(col, index) in columnOptions"
              :key="col.key"
              class="column-grid-item"
              draggable="true"
              @dragstart="(event) => handleColumnDragStart(event, index)"
              @dragover="handleColumnDragOver"
              @drop="(event) => handleColumnDrop(event, index)"
            >
              <span class="col-idx">{{ index + 1 }}</span>
              <el-checkbox :label="col.key" :disabled="col.required" size="small">
                {{ col.label }}
              </el-checkbox>
            </div>
          </div>
        </el-checkbox-group>
      </div>
    </div>
    <template #footer>
      <el-button size="small" @click="showColumnSelector = false">取消</el-button>
      <el-button size="small" type="primary" @click="handleConfirmColumnSelection">确定</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.page-container {
  padding: 20px;
  height: calc(100vh - 50px - 24px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.hidden-import-input {
  display: none;
}

.page-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 20px;
  flex-shrink: 0;
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
    
    h1 { 
      font-size: 22px; 
      font-weight: 600; 
      margin: 0; 
    }
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.platform-review-alert {
  margin-bottom: 12px;
}

.search-form { 
  display: flex; 
  gap: 20px; 
  padding: 16px 20px; 
  background: #f5f7fa; 
  border-radius: 8px; 
  margin-bottom: 16px; 
  flex-wrap: wrap;
  align-items: center;
  flex-shrink: 0;
  
  .search-form-io-group {
    margin-left: auto;
    display: flex;
    gap: 20px;
    align-items: center;
    flex-wrap: wrap;
  }
  
  :deep(.el-button) {
    min-width: 80px;
  }
  
  :deep(.el-button--primary) {
    background-color: #00bfa5 !important;
    border-color: #00bfa5 !important;
    color: #fff !important;
  }
}

.product-layout {
  display: flex;
  gap: 20px;
  flex: 1;
  min-height: 0;
  align-items: stretch;
}

.category-sidebar {
  width: 220px;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.category-header {
  font-size: 16px;
  font-weight: 600;
  color: #1D2939;
  padding-bottom: 12px;
  border-bottom: 1px solid #E4E7EC;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.category-search {
  margin-bottom: 12px;
  flex-shrink: 0;
  
  :deep(.el-input__wrapper) {
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    padding-left: 0;
    padding-right: 0;
  }

  :deep(.el-input__wrapper.is-focus),
  :deep(.el-input__wrapper:hover) {
    box-shadow: none !important;
  }
  
  .search-icon {
    width: 16px;
    height: 16px;
    color: #999;
  }
}

.category-sort {
  margin-bottom: 12px;
  flex-shrink: 0;
  
  :deep(.el-select__wrapper) {
    box-shadow: none !important;
    border: none !important;
    border-bottom: 1px solid #E4E7EC !important;
    border-radius: 0 !important;
    background: transparent !important;
    padding-left: 0;
    padding-right: 0;
    min-height: 28px;
  }

  :deep(.el-select__wrapper.is-focused),
  :deep(.el-select__wrapper.is-hovering) {
    box-shadow: none !important;
    border: none !important;
    border-bottom: 1px solid #00bfa5 !important;
  }
  
  :deep(.el-select__selected-item),
  :deep(.el-select__placeholder) {
    color: #00bfa5 !important;
  }
  
  :deep(.el-select__caret) {
    color: #00bfa5 !important;
  }
}

.category-tree {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;

  .category-item {
    margin-bottom: 4px;
  }
  
  .category-title {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 6px;
    color: #667085;
    font-size: 14px;
    
    &:hover {
      background: #F5F7FA;
      color: #344054;
    }
    
    &.active {
      background: rgba(0, 191, 165, 0.08);
      color: #00bfa5;
      font-weight: 500;
    }
    
    .expand-icon {
      width: 16px;
      font-size: 10px;
      color: #667085;
    }
  }
  
  .category-children {
    padding-left: 16px;
    margin-top: 2px;
  }
  
  .category-child {
    padding: 6px 12px;
    cursor: pointer;
    border-radius: 4px;
    color: #667085;
    font-size: 13px;
    
    &:hover {
      background: #F5F7FA;
      color: #344054;
    }
    
    &.active {
      background: rgba(0, 191, 165, 0.08);
      color: #00bfa5;
    }
  }
}

.product-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  flex-shrink: 0;

  .action-bar-left {
    display: flex;
    align-items: center;
    gap: 12px;
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

    .audit-dropdown-icon {
      margin-left: 4px;
    }

    .btn-unaudit-pink {
      --el-button-text-color: #db2777;
      --el-button-border-color: #f9a8d4;
      --el-button-bg-color: #fdf2f8;
      --el-button-hover-text-color: #be185d;
      --el-button-hover-border-color: #f472b6;
      --el-button-hover-bg-color: #fce7f3;
      --el-button-disabled-text-color: #f9a8d4;
      --el-button-disabled-border-color: #fce7f3;
      --el-button-disabled-bg-color: #fff;
    }

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
    margin-left: auto;
  }
}

.batch-modify-panel {
  border-radius: 6px;
  padding: 4px 0 0;
  box-sizing: border-box;
}

.batch-modify-form {
  :deep(.el-form-item) {
    margin-bottom: 14px;
    align-items: flex-end;
  }

  :deep(.el-form-item:last-of-type) {
    margin-bottom: 0;
  }

  :deep(.el-form-item__label) {
    line-height: 20px;
    height: auto;
    padding-bottom: 6px;
    display: inline-flex;
    align-items: flex-end;
    justify-content: flex-start;
    text-align: left;
  }

  :deep(.el-form-item__content) {
    display: flex;
    align-items: flex-end;
    min-height: 32px;
    line-height: 32px;
  }
}

.batch-modify-tip {
  margin: 12px 0 0;
  padding-left: 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.table-card {
  background: #fff;
  border-radius: 4px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-scroll {
  flex: 1;
  min-height: 0;
}

.sort-header {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  white-space: nowrap;

  &.is-right {
    justify-content: flex-end;
  }

  &.is-left {
    justify-content: flex-start;
  }
  
  .sort-icon {
    font-size: 12px;
    color: #98A2B3;
  }

  &.is-active .sort-icon {
    color: #00897b;
    font-weight: 700;
  }
}

.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid #E4E7EC;
  flex-shrink: 0;
  
  .pagination-info {
    color: #667085;
    font-size: 14px;
  }
}

.code-link {
  color: #00bfa5;
  cursor: pointer;
  font-weight: 500;
  
  &:hover {
    color: #00a896;
    text-decoration: underline;
  }
}

.audit-text {
  font-size: 13px;
  font-weight: 500;
}

.audit-approved {
  color: #36B37E;
}

.audit-pending {
  color: #FF9F43;
}

.header-empty-tip {
  padding: 40px 0;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.field-selector {
  max-height: 320px;
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

:deep(.product-settings-dialog-wrap) {
  .el-dialog__body {
    padding: 10px 16px 6px;
  }

  .el-dialog__footer {
    padding-top: 8px;
  }
}

.product-settings-dialog {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings-block {
  padding: 8px 10px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fafbfc;
}

.settings-block-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  min-height: 20px;
}

.settings-block-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  flex-shrink: 0;
}

.settings-block-hint {
  font-size: 11px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-sort-compact {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sort-zone {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-height: 28px;
}

.zone-label {
  flex-shrink: 0;
  width: 28px;
  padding-top: 4px;
  font-size: 11px;
  color: #909399;
  line-height: 20px;
}

.chip-wrap {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  min-height: 24px;
}

.sort-zone--selected {
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px dashed #dcdfe6;
  background: #fff;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  max-width: 100%;
  height: 24px;
  padding: 0 6px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
  line-height: 1;
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: #b3d8ff;
    background: #f5faff;
  }
}

.chip-add {
  padding-right: 4px;

  .chip-icon {
    font-size: 12px;
    color: #409eff;
  }
}

.chip-selected {
  cursor: grab;
  border-color: #c6e2ff;
  background: #ecf5ff;
  color: #303133;

  .chip-order {
    min-width: 14px;
    font-size: 10px;
    color: #909399;
    text-align: center;
  }

  .chip-remove {
    margin-left: 2px;
    font-size: 11px;
    color: #909399;
    border-radius: 50%;
    padding: 1px;

    &:hover {
      color: #f56c6c;
      background: rgba(245, 108, 108, 0.12);
    }
  }
}

.chip-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.zone-empty {
  font-size: 11px;
  color: #c0c4cc;
  line-height: 24px;
}

.column-grid-group {
  width: 100%;
}

.column-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px 4px;
  max-height: 140px;
  overflow-y: auto;
  padding: 2px 0;
}

.column-grid-item {
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 24px;
  padding: 1px 4px;
  border-radius: 3px;
  cursor: move;

  &:hover {
    background: rgba(64, 158, 255, 0.06);
  }

  .col-idx {
    flex-shrink: 0;
    width: 16px;
    font-size: 10px;
    color: #c0c4cc;
    text-align: right;
  }

  :deep(.el-checkbox) {
    height: 24px;
    margin-right: 0;

    .el-checkbox__label {
      font-size: 12px;
      padding-left: 6px;
      line-height: 24px;
    }
  }
}
</style>

<style lang="scss">
/* 弹窗 teleport 到 body，scoped 无法作用在外壳，需全局样式 */
.batch-modify-dialog-wrap.el-dialog {
  width: 420px !important;
  border: 1px solid #d0d5dd !important;
  border-radius: 8px !important;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08) !important;
  background: #fff;
}

.batch-modify-dialog-wrap .el-dialog__header {
  margin-right: 0;
  padding: 14px 20px 12px;
  border-bottom: 1px solid #e4e7ec;
  text-align: left;
}

.batch-modify-dialog-wrap .el-dialog__title {
  font-size: 16px;
  font-weight: 600;
  color: #1d2939;
  text-align: left;
}

.batch-modify-dialog-wrap .el-dialog__body {
  padding: 16px 20px 12px;
}

.batch-modify-dialog-wrap .el-dialog__footer {
  padding: 12px 20px 16px;
  border-top: 1px solid #e4e7ec;
}

/* 弹窗内表单：左对齐 + 单条下划线 */
.batch-modify-dialog-wrap .batch-modify-form.list-search-form {
  .el-form-item__label {
    justify-content: flex-start !important;
    text-align: left !important;
  }

  .el-input__inner,
  .el-textarea__inner {
    border: none !important;
    border-bottom: none !important;
    box-shadow: none !important;
    background-color: transparent !important;
  }

  .el-input__wrapper,
  .el-select__wrapper {
    box-shadow: none !important;
    border: none !important;
    border-bottom: 1px solid #cbd5e1 !important;
    border-radius: 0 !important;
    background-color: transparent !important;
    padding-left: 0;
    padding-right: 0;
  }

  .el-input__wrapper.is-focus,
  .el-select__wrapper.is-focused {
    box-shadow: none !important;
    border-bottom: 2px solid #00bfa5 !important;
  }

  .el-select .el-input__wrapper {
    border-bottom: none !important;
    box-shadow: none !important;
  }
}
</style>