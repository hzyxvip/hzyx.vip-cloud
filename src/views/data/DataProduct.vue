<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElLoading } from 'element-plus'
import { Setting } from '@element-plus/icons-vue'
import { useTableStyle } from '@/composables/useTableStyle'
import { useProductListColumnSettings } from '@/composables/useProductListColumnSettings'
import { useProductListBatchActions } from '@/composables/useProductListBatchActions'
import { productSourceLabel } from '@/utils/customerProductService'
import { saveProductList, loadAndEnsureProductList, clearProductList } from '@/utils/productStore'
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
  requirePlatformProductAdmin
} from '@/utils/userPermission'
import {
  applyProductListFilters,
  CATEGORY_ALL_ID,
  createEmptyProductSearchForm,
  isAllCategorySelected,
  isValidCategorySelection,
  sortProductsByColumn,
  type ProductColumnSortOrder
} from '@/utils/productListFilter'

const router = useRouter()
const importInputRef = ref<HTMLInputElement | null>(null)
const canProductAuditDelete = computed(() => isPlatformProductAdmin())
const LEGACY_CATEGORY_STORAGE_KEYS = ['defaultProductCategory', 'defaultPlatformProductCategory']

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
const storedSortType = localStorage.getItem('categorySortType')
const categorySortType = ref<string>(storedSortType || 'all')

// 搜索表单数据
const searchForm = reactive({
  codeName: '',
  spec: '',
  manufacturer: '',
  brand: '',
  type: '',
  auditStatus: '',
  status: ''
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

const { columnWidths, handleHeaderDragend } = useTableStyle('product-list', [
  { key: 'selection', label: '', defaultWidth: 50 },
  { key: 'index', label: '行号', defaultWidth: 56 },
  { key: 'code', label: '商品编码', defaultWidth: 120 },
  { key: 'name', label: '商品名称', defaultWidth: 150 },
  { key: 'spec', label: '规格型号', defaultWidth: 120 },
  { key: 'manufacturer', label: '生产厂家', defaultWidth: 150 },
  { key: 'brand', label: '品牌', defaultWidth: 80 },
  { key: 'category', label: '商品分类', defaultWidth: 100 },
  { key: 'type', label: '商品类型', defaultWidth: 100 },
  { key: 'licenseNo', label: '生产许可证号', defaultWidth: 180 },
  { key: 'registerNo', label: '注册证号', defaultWidth: 160 },
  { key: 'udiCode', label: 'UDI码', defaultWidth: 140 },
  { key: 'medicalCode', label: '医保码', defaultWidth: 180 },
  { key: 'medicalClass', label: '医保报销分类', defaultWidth: 120 },
  { key: 'measureUnit', label: '计量单位', defaultWidth: 80 },
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
  sortedVisibleColumns,
  tableColumnRenderKey,
  openColumnSettings,
  handleColumnDragStart,
  handleColumnDragOver,
  handleColumnDrop,
  confirmColumnSelection
} = useProductListColumnSettings('data-product-list')

const initProductListData = () => {
  allProducts.value = loadAndEnsureProductList(defaultProducts)
}

// 初始化localStorage
onMounted(() => {
  initProductListData()

  selectedCategory.value = CATEGORY_ALL_ID
  categorySearchKeyword.value = ''
  clearSavedCategoryFilters()
  Object.assign(searchForm, createEmptyProductSearchForm())
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
  if (
    !isAllCategorySelected(selectedCategory.value) &&
    !isValidCategorySelection(selectedCategory.value, categorySortType.value, categories.value)
  ) {
    selectedCategory.value = CATEGORY_ALL_ID
  }

  filteredData.value = applyProductListFilters(allProducts.value, searchForm, {
    sortType: categorySortType.value,
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
  Object.assign(searchForm, createEmptyProductSearchForm())
  selectedIds.value = []
  selectAll.value = false
  refreshProductList(true)
}

// 刷新数据
const handleRefresh = () => {
  initProductListData()

  currentPage.value = 1
  handleCategorySort()
}

// 搜索商品（与分类筛选联合，排除不符合条件的记录）
const handleSearch = () => {
  refreshProductList(true)
}

const selectedIds = ref<(number | string)[]>([])
const selectAll = ref(false)
const productTableRef = ref<{
  toggleRowSelection: (row: any, selected?: boolean) => void
  clearSelection: () => void
  doLayout?: () => void
}>()

const layoutProductTable = () => {
  nextTick(() => {
    productTableRef.value?.doLayout?.()
  })
}

const handleSelectionChange = (val: any[]) => {
  selectedIds.value = val.map(item => item.id)
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
  refreshProductList(true)
}

const handleCategorySortTypeChange = () => {
  selectedCategory.value = CATEGORY_ALL_ID
  clearSavedCategoryFilters()
  handleCategorySort()
}

// 分类排序处理
const handleCategorySort = (resetPage = true) => {
  localStorage.setItem('categorySortType', categorySortType.value)

  if (categorySortType.value === 'all') {
    categories.value = []
    expandedKeys.value = []
  } else if (categorySortType.value === 'type') {
    categories.value = [...defaultCategories]
    expandedKeys.value = [1, 2]
  } else {
    const categoryField = categorySortType.value as 'manufacturer' | 'brand' | 'name'
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

  refreshProductList(resetPage)
}

const sortOrders = reactive<Record<'code' | 'name' | 'spec' | 'manufacturer', ProductColumnSortOrder>>({
  code: '',
  name: '',
  spec: '',
  manufacturer: ''
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

const clearTableSelection = () => {
  selectedIds.value = []
  selectAll.value = false
  nextTick(() => productTableRef.value?.clearSelection())
}

// 双击行跳转到编辑页面
const handleRowDoubleClick = (row: any) => {
  router.push(`/data/product/edit/${row.id}`)
}

const handleCodeClick = (row: any) => {
  router.push(`/data/product/edit/${row.id}`)
}

const {
  showBatchModifyDialog,
  batchModifyColumn,
  batchModifyValue,
  batchModifiableColumns,
  auditActionLabel,
  handleAuditToggle,
  handleBatchDelete,
  openBatchModifyDialog,
  confirmBatchModify
} = useProductListBatchActions(allProducts, selectedIds, selectAll, () => {
  handleCategorySort(false)
  clearTableSelection()
})

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

  const { exported, total } = exportProductsToExcel(source, '商品资料列表')
  if (total > PRODUCT_EXPORT_LIMIT) {
    ElMessage.success(`已导出 ${exported} 条，共 ${total} 条（每次最多 ${PRODUCT_EXPORT_LIMIT} 条）`)
    return
  }
  ElMessage.success(`已导出 ${exported} 条商品资料`)
}

const handleDownloadImportTemplate = () => {
  downloadProductImportTemplate('商品资料导入模板')
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
  clearProductList()
  selectedIds.value = []
  selectAll.value = false
  currentPage.value = 1
  handleCategorySort()
  ElMessage.success(`已清空全部 ${total} 条商品资料，请重新导入`)
}

const handleImportClick = () => {
  importInputRef.value?.click()
}

const handleImportFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  const loading = ElLoading.service({
    lock: true,
    text: `正在导入 ${file.name}，请稍候…`,
    background: 'rgba(255, 255, 255, 0.7)'
  })

  try {
    await new Promise(resolve => setTimeout(resolve, 0))
    const imported = await parseProductImportFile(file)
    if (imported.length === 0) {
      ElMessage.warning('未识别到有效商品：请确认含「商品编号/商品编码」和「商品名称」列（WPS 导出格式已支持）')
      return
    }

    const { list, added, updated, skipped } = mergeImportedProducts(allProducts.value, imported)
    allProducts.value = list
    saveProductList(list)
    handleCategorySort()
    ElMessage.success(`导入完成：共识别 ${imported.length} 条，新增 ${added} 条，更新 ${updated} 条${skipped ? `，跳过 ${skipped} 条` : ''}`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '导入失败，请检查文件格式')
  } finally {
    loading.close()
  }
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <h1>商品资料列表</h1>
      </div>
    </div>
    
    <div class="search-form">
      <el-input v-model="searchForm.codeName" placeholder="商品编码/名称" style="width: 200px;" />
      <el-input v-model="searchForm.spec" placeholder="规格型号" style="width: 150px;" />
      <el-input v-model="searchForm.manufacturer" placeholder="生产厂家" style="width: 150px;" />
      <el-input v-model="searchForm.brand" placeholder="品牌" style="width: 100px;" />
      <el-input v-model="searchForm.type" placeholder="商品类型" style="width: 100px;" />
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button @click="resetProductFilters">重置</el-button>
      <el-button type="primary" @click="router.push('/data/product/create')">新增</el-button>
      <el-button v-if="canProductAuditDelete" type="danger" plain @click="handleClearAllProducts">清空全部</el-button>
      <el-button type="primary" @click="handleRefresh">刷新</el-button>
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
    
    <div class="product-layout">
      <div class="category-sidebar">
        <div class="category-header">商品分类方式</div>
        <div class="category-sort">
          <el-select 
            v-model="categorySortType" 
            placeholder="选择分类方式" 
            size="small"
            @change="handleCategorySortTypeChange"
            style="width: 100%;"
          >
            <el-option label="全部分类" value="all" />
            <el-option label="按生产厂家" value="manufacturer" />
            <el-option label="按品牌" value="brand" />
            <el-option label="按商品名称" value="name" />
            <el-option label="按商品类型" value="type" />
          </el-select>
        </div>
        <div v-if="categorySortType !== 'all'" class="category-search">
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
        <div v-if="categorySortType !== 'all'" class="category-tree">
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
            <el-button v-if="canProductAuditDelete" type="primary" link size="small" @click="handleAuditToggle">
              {{ auditActionLabel }}
            </el-button>
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
            <el-button type="primary" link size="small" @click="openBatchModifyDialog">批量修改</el-button>
          </div>
          <div class="action-bar-extra">
            <el-button size="small" @click="openColumnSettings">
              <el-icon><Setting /></el-icon> 商品资料设置
            </el-button>
          </div>
        </div>
        
        <div class="table-card">
          <div class="table-scroll">
          <div v-if="sortedVisibleColumns.length === 0" class="header-empty-tip">请点击「商品资料设置」选择要显示的列</div>
          <el-table
            v-else
            ref="productTableRef"
            :key="tableColumnRenderKey"
            :data="tableData"
            :row-key="getProductRowKey"
            class="common-table"
            border
            :fit="false"
            @selection-change="handleSelectionChange"
            @row-dblclick="handleRowDoubleClick"
            @header-dragend="handleHeaderDragend"
          >
            <el-table-column type="selection" :width="columnWidths.selection" align="center" header-align="center" />
            <el-table-column
              type="index"
              label="行号"
              :index="indexMethod"
              :width="columnWidths.index"
              align="center"
              header-align="center"
            />

            <el-table-column
              v-for="col in sortedVisibleColumns"
              :key="col.key"
              :prop="col.prop"
              :label="col.label"
              :width="columnWidths[col.key]"
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

  <el-dialog v-model="showBatchModifyDialog" title="批量修改列内容" width="480px" draggable>
    <el-form label-width="72px">
      <el-form-item label="修改列">
        <el-select v-model="batchModifyColumn" placeholder="选择列" style="width: 100%">
          <el-option
            v-for="col in batchModifiableColumns"
            :key="col.key"
            :label="col.label"
            :value="col.key"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="新值">
        <el-input v-model="batchModifyValue" placeholder="请输入新值" clearable />
      </el-form-item>
      <p class="batch-modify-tip">将修改已选 {{ selectedIds.length }} 条商品的对应列内容</p>
    </el-form>
    <template #footer>
      <el-button @click="showBatchModifyDialog = false">取消</el-button>
      <el-button type="primary" @click="confirmBatchModify">确定</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="showColumnSelector" title="商品资料设置" width="720px" draggable>
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

.batch-modify-tip {
  margin: 0;
  padding-left: 72px;
  font-size: 12px;
  color: #909399;
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
  overflow: auto;

  :deep(.common-table.el-table) {
    --table-line-color: #d9d9d9;
    --table-row-odd-bg: #f0f7ff;
    --table-row-even-bg: #f5f5f5;
    --table-row-hover-bg: #fff3cd;
    --table-header-bg: #f5f5f5;

    border: 1px solid var(--table-line-color);

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
    }

    .el-table__header-wrapper th.el-table__cell {
      background: var(--table-header-bg) !important;
      color: #333;
      font-weight: 600;
    }

    .el-table__header-wrapper th.el-table__cell .cell {
      text-align: center;
      justify-content: center;
      white-space: nowrap;
    }

    .el-table__header-wrapper th.el-table__cell.is-right,
    .el-table__body-wrapper td.el-table__cell.is-right {
      text-align: right;
    }

    .el-table__header-wrapper th.el-table__cell.is-right .cell,
    .el-table__body-wrapper td.el-table__cell.is-right .cell {
      text-align: right;
      justify-content: flex-end;
    }

    .el-table__header-wrapper th.el-table__cell.is-left .cell,
    .el-table__body-wrapper td.el-table__cell.is-left .cell {
      text-align: left;
      justify-content: flex-start;
    }

    .el-table__body-wrapper td.el-table__cell.is-center .cell {
      text-align: center !important;
      justify-content: center;
    }

    .el-table__body-wrapper .el-table__row:nth-child(odd) > td.el-table__cell {
      background-color: var(--table-row-odd-bg) !important;
    }

    .el-table__body-wrapper .el-table__row:nth-child(even) > td.el-table__cell {
      background-color: var(--table-row-even-bg) !important;
    }

    .el-table__body-wrapper .el-table__row:hover > td.el-table__cell {
      background-color: var(--table-row-hover-bg) !important;
    }
  }
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