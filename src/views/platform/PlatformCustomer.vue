<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Setting } from '@element-plus/icons-vue'
import { useTableStyle } from '@/composables/useTableStyle'
import { usePlatformCustomerListColumnSettings } from '@/composables/usePlatformCustomerListColumnSettings'
import { ElMessage, ElMessageBox } from 'element-plus'
import { LOADING_RESULT_MESSAGE_DURATION, runWithLoading } from '@/utils/loadingFeedback'
import {
  companyTypeOptions as platformCompanyTypeOptions,
  deletePlatformCustomersByIds,
  getCompanyTypeLabel,
  getPlatformCustomerStatusLabel,
  getPlatformCustomerStatusTagType,
  loadPlatformCustomerList,
  platformCustomerStatusOptions,
  savePlatformCustomerList,
  type PlatformCustomer
} from '@/utils/platformCustomerStore'
import { usePlatformCustomerListBatchActions } from '@/composables/usePlatformCustomerListBatchActions'
import { isPlatformProductAdmin } from '@/utils/userPermission'
import {
  downloadPlatformCustomerImportTemplate,
  mergeImportedPlatformCustomers,
  parsePlatformCustomerImportFile,
  type PlatformCustomerImportRow
} from '@/utils/platformCustomerImportExport'

const router = useRouter()
const tableRef = ref()
const importInputRef = ref<HTMLInputElement>()
const selectedRows = ref<PlatformCustomer[]>([])
const canAudit = computed(() => isPlatformProductAdmin())

const showAdvancedFilter = ref(false)

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

const statusOptions = platformCustomerStatusOptions

const companyTypeOptions = platformCompanyTypeOptions

const platformStatusOptions = [
  { label: '已审核', value: 'platformAudited' },
  { label: '未审核', value: 'platformNotAudited' }
]

const getDateRange = (preset: string): [Date, Date] | null => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (preset) {
    case 'thisMonth':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      return [monthStart, today]
    case 'today':
      return [today, today]
    case 'yesterday':
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return [yesterday, yesterday]
    case 'thisWeek':
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      return [weekStart, today]
    case 'lastMonth':
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      return [lastMonthStart, lastMonthEnd]
    case 'last3Months':
      const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1)
      return [threeMonthsAgo, today]
    case 'halfYear':
      const halfYearAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1)
      return [halfYearAgo, today]
    case 'lastYear':
      const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
      return [yearAgo, today]
    default:
      return null
  }
}

interface SearchFormState {
  keyword: string
  selectedPreset: string
  dateRange: Date[]
  companyCode: string
  province: string
  city: string
  platformUser: string
  status: string[]
  companyType: string[]
  platformStatus: string[]
}

const createEmptySearchForm = (): SearchFormState => ({
  keyword: '',
  selectedPreset: '',
  dateRange: [],
  companyCode: '',
  province: '',
  city: '',
  platformUser: '',
  status: [],
  companyType: [],
  platformStatus: []
})

const cloneSearchForm = (form: SearchFormState): SearchFormState => ({
  ...form,
  dateRange: form.dateRange.map(date => new Date(date)),
  status: [...form.status],
  companyType: [...form.companyType],
  platformStatus: [...form.platformStatus]
})

const searchForm = ref<SearchFormState>(createEmptySearchForm())
const appliedSearch = ref<SearchFormState>(createEmptySearchForm())

const PLATFORM_CUSTOMER_SEED_IMPORTED_KEY = 'platformCustomerSeedImported'

onMounted(async () => {
  localStorage.removeItem('platform-customer-search-form')
  tableData.value = loadPlatformCustomerList()

  if (localStorage.getItem(PLATFORM_CUSTOMER_SEED_IMPORTED_KEY)) return
  if (tableData.value.length > 20) return

  try {
    const response = await fetch('/data/platform-customer-seed.json')
    if (!response.ok) return
    const imported = (await response.json()) as PlatformCustomerImportRow[]
    const { list, added, updated } = mergeImportedPlatformCustomers(tableData.value, imported)
    savePlatformCustomerList(list)
    tableData.value = list
    localStorage.setItem(PLATFORM_CUSTOMER_SEED_IMPORTED_KEY, '1')
    ElMessage.success(`已导入供应商汇总表：新增 ${added} 条，更新 ${updated} 条`)
  } catch {
    // 首次自动导入失败时不打断页面使用，可手动点击「导入汇总表」
  }
})

const handlePresetChange = (val: string) => {
  if (!val) {
    searchForm.value.dateRange = []
    return
  }
  const range = getDateRange(val)
  searchForm.value.dateRange = range ? [...range] : []
}

const tableData = ref(loadPlatformCustomerList())
const currentPage = ref(1)
const pageSize = ref(10)

const includesText = (source: unknown, keyword: string): boolean => {
  if (!keyword) return true
  return String(source ?? '').toLowerCase().includes(keyword.toLowerCase())
}

const matchBySearchForm = (item: ReturnType<typeof loadPlatformCustomerList>[number], form: SearchFormState) => {
  if (form.keyword) {
    const keywords = form.keyword.trim().split(/\s+/).filter(Boolean)
    if (keywords.length > 0) {
      const matchFields = [
        item.companyName,
        item.companyShortName,
        item.pinyin,
        item.contact,
        item.phone,
        item.companyCode
      ]
      const allMatch = keywords.every(keyword => {
        const kw = keyword.toLowerCase()
        return matchFields.some(field => String(field ?? '').toLowerCase().includes(kw))
      })
      if (!allMatch) return false
    }
  }

  if (!includesText(item.companyCode, form.companyCode)) return false
  if (!includesText(item.province, form.province)) return false
  if (!includesText(item.city, form.city)) return false
  if (!includesText(item.platformUser, form.platformUser)) return false

  if (form.dateRange.length === 2) {
    const itemDate = new Date(item.createDate)
    if (Number.isNaN(itemDate.getTime())) return false
    const [startDate, endDate] = form.dateRange
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999)
    if (itemDate < start || itemDate > end) return false
  }

  if (form.platformStatus.length > 0 && !form.platformStatus.includes(item.platformStatus)) {
    return false
  }

  if (form.status.length > 0 && !form.status.includes(item.status)) {
    return false
  }

  if (form.companyType.length > 0 && !form.companyType.includes(item.companyType)) {
    return false
  }

  return true
}

const filteredData = computed(() => {
  return tableData.value.filter(item => matchBySearchForm(item, appliedSearch.value))
})

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

const indexMethod = (index: number) => (currentPage.value - 1) * pageSize.value + index + 1

watch(filteredData, list => {
  const maxPage = Math.max(1, Math.ceil(list.length / pageSize.value) || 1)
  if (currentPage.value > maxPage) {
    currentPage.value = maxPage
  }
})

const { columnWidths, handleHeaderDragend } = useTableStyle('platform-customer', [
  { key: 'index', label: '序号', defaultWidth: 56 },
  { key: 'select', label: '', defaultWidth: 40 },
  { key: 'platformStatus', label: '平台状态', defaultWidth: 80 },
  { key: 'status', label: '状态', defaultWidth: 80 },
  { key: 'companyCode', label: '医享平台编号', defaultWidth: 100 },
  { key: 'companyName', label: '公司名称', defaultWidth: 200 },
  { key: 'companyShortName', label: '公司简称', defaultWidth: 100 },
  { key: 'companyType', label: '公司类型', defaultWidth: 80 },
  { key: 'pinyin', label: '拼音缩写', defaultWidth: 100 },
  { key: 'contact', label: '联系人', defaultWidth: 80 },
  { key: 'phone', label: '公司电话', defaultWidth: 120 },
  { key: 'email', label: '公司邮箱', defaultWidth: 150 },
  { key: 'province', label: '省', defaultWidth: 60 },
  { key: 'city', label: '市', defaultWidth: 80 },
  { key: 'address', label: '地址', defaultWidth: 150 },
  { key: 'license', label: '营业执照', defaultWidth: 150 },
  { key: 'licenseExpire', label: '证件到期', defaultWidth: 100 },
  { key: 'taxId', label: '税号', defaultWidth: 150 },
  { key: 'bank', label: '开户银行', defaultWidth: 120 },
  { key: 'bankAccount', label: '银行账号', defaultWidth: 160 },
  { key: 'platformUser', label: '平台用户', defaultWidth: 80 },
  { key: 'createDate', label: '创建日期', defaultWidth: 100 },
  { key: 'creator', label: '创建人', defaultWidth: 80 },
  { key: 'editor', label: '编辑人员', defaultWidth: 80 },
  { key: 'editDate', label: '编辑日期', defaultWidth: 100 },
  { key: 'remark', label: '备注', defaultWidth: 100 },
  { key: 'recordStatus', label: '平台备案', defaultWidth: 80 },
  { key: 'recordDate', label: '备案日期', defaultWidth: 100 }
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
} = usePlatformCustomerListColumnSettings('platform-customer-list')

const layoutCustomerTable = () => {
  nextTick(() => {
    tableRef.value?.doLayout?.()
  })
}

watch(tableColumnRenderKey, () => {
  layoutCustomerTable()
})

const handleCreate = () => {
  router.push('/platform/customer/create')
}

const handleSelectionChange = (rows: PlatformCustomer[]) => {
  selectedRows.value = rows
}

const clearTableSelection = () => {
  selectedRows.value = []
  tableRef.value?.clearSelection?.()
}

const {
  showBatchModifyDialog,
  batchModifyColumn,
  batchModifyValue,
  batchModifiableColumns,
  batchModifyColumnDef,
  canBatchAudit,
  canBatchUnaudit,
  handleBatchAudit,
  openBatchModifyDialog,
  confirmBatchModify
} = usePlatformCustomerListBatchActions(tableData, selectedRows, clearTableSelection)

const handleToolbarEdit = () => {
  if (selectedRows.value.length !== 1) {
    ElMessage.warning('请先勾选一条客户资料进行修改')
    return
  }
  handleEdit(selectedRows.value[0].id)
}

const handleToolbarDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先勾选要删除的客户资料')
    return
  }

  try {
    const count = selectedRows.value.length
    const names = selectedRows.value.map(item => item.companyName).join('、')
    await ElMessageBox.confirm(
      `请谨慎删除！确定删除选中的 ${count} 条客户资料吗？\n${names}\n此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    const ids = selectedRows.value.map(item => item.id)
    tableData.value = deletePlatformCustomersByIds(ids)
    selectedRows.value = []
    tableRef.value?.clearSelection?.()
    ElMessage.success('删除成功')
  } catch {
    // 用户取消
  }
}

const handleView = (id: number) => {
  router.push(`/platform/customer/edit/${id}`)
}

const handleEdit = (id: number) => {
  router.push(`/platform/customer/edit/${id}`)
}

const handleRowDoubleClick = (row: any) => {
  router.push(`/platform/customer/edit/${row.id}`)
}

const handleSearch = () => {
  appliedSearch.value = cloneSearchForm(searchForm.value)
  currentPage.value = 1
  ElMessage.success(`筛选完成，共 ${filteredData.value.length} 条记录`)
}

const handleReset = () => {
  searchForm.value = createEmptySearchForm()
  appliedSearch.value = createEmptySearchForm()
  showAdvancedFilter.value = false
  currentPage.value = 1
  ElMessage.info('筛选条件已重置')
}

const handleRefresh = async () => {
  await runWithLoading(async () => {
    tableData.value = loadPlatformCustomerList()
    appliedSearch.value = createEmptySearchForm()
    searchForm.value = createEmptySearchForm()
    showAdvancedFilter.value = false
    currentPage.value = 1
    clearTableSelection()
    ElMessage.success({ message: '数据已刷新', duration: LOADING_RESULT_MESSAGE_DURATION })
  }, { text: '正在刷新客户列表，请稍候…', minDurationMs: 800 })
}

const applyImportedCustomers = (imported: PlatformCustomerImportRow[], sourceLabel: string) => {
  if (imported.length === 0) {
    ElMessage.warning({
      message: '未识别到有效客户：请确认含「供应商名称/公司名称」列',
      duration: LOADING_RESULT_MESSAGE_DURATION
    })
    return
  }

  const { list, added, updated, skipped } = mergeImportedPlatformCustomers(tableData.value, imported)
  savePlatformCustomerList(list)
  tableData.value = list
  selectedRows.value = []
  tableRef.value?.clearSelection?.()
  currentPage.value = 1
  ElMessage.success({
    message: `${sourceLabel}完成：共识别 ${imported.length} 条，新增 ${added} 条，更新 ${updated} 条${skipped ? `，跳过 ${skipped} 条` : ''}`,
    duration: LOADING_RESULT_MESSAGE_DURATION
  })
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
    const imported = await parsePlatformCustomerImportFile(file)
    applyImportedCustomers(imported, '导入')
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

const handleDownloadImportTemplate = () => {
  downloadPlatformCustomerImportTemplate('平台客户导入模板')
  ElMessage.success('导入模板已下载，必填：供应商名称/公司名称')
}

const handleImportSeedData = async () => {
  await runWithLoading(async () => {
    const response = await fetch('/data/platform-customer-seed.json')
    if (!response.ok) {
      throw new Error('内置汇总表数据不可用')
    }
    const imported = (await response.json()) as PlatformCustomerImportRow[]
    applyImportedCustomers(imported, '汇总表导入')
  }, {
    text: '正在导入供应商汇总表数据，请稍候…',
    minDurationMs: 1500
  }).catch(error => {
    ElMessage.error({
      message: error instanceof Error ? error.message : '汇总表导入失败',
      duration: LOADING_RESULT_MESSAGE_DURATION
    })
  })
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-info">
        <h1>平台客户列表</h1>
        <div class="breadcrumb">首页 / 平台管理 / 平台配置 / 平台客户列表</div>
      </div>
    </div>

    <div class="search-card">
      <div class="search-row">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="医享平台编号">
            <el-input v-model="searchForm.companyCode" placeholder="医享平台编号" clearable style="width: 140px;" />
          </el-form-item>
          <el-form-item class="keyword-input">
            <el-input
              v-model="searchForm.keyword"
              placeholder="公司名称 / 拼音缩写 / 电话 / 联系人"
              clearable
              style="width: 320px;"
            />
          </el-form-item>
          <el-form-item label="省">
            <el-input v-model="searchForm.province" placeholder="省" clearable style="width: 80px;" />
          </el-form-item>
          <el-form-item label="市">
            <el-input v-model="searchForm.city" placeholder="市" clearable style="width: 80px;" />
          </el-form-item>
          <el-form-item>
            <el-date-picker v-model="searchForm.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 240px;" />
          </el-form-item>
          <el-form-item label="平台用户">
            <el-input v-model="searchForm.platformUser" placeholder="平台用户" clearable style="width: 100px;" />
          </el-form-item>
          <el-form-item>
            <el-select v-model="searchForm.selectedPreset" placeholder="时间预设" clearable style="width: 100px;" @change="handlePresetChange">
              <el-option v-for="preset in timePresets" :key="preset.value" :label="preset.label" :value="preset.value" />
            </el-select>
          </el-form-item>
        </el-form>
        <div class="button-group">
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button @click="handleRefresh">刷新</el-button>
          <el-button type="primary" @click="handleCreate">新增</el-button>
          <el-button :disabled="selectedRows.length !== 1" @click="handleToolbarEdit">修改</el-button>
          <el-button :disabled="selectedRows.length === 0" @click="openBatchModifyDialog">批量修改</el-button>
          <el-button
            v-if="canAudit"
            type="success"
            plain
            :disabled="!canBatchAudit"
            @click="handleBatchAudit('audit')"
          >审核</el-button>
          <el-button
            v-if="canAudit"
            class="btn-unaudit-pink"
            plain
            :disabled="!canBatchUnaudit"
            @click="handleBatchAudit('unaudit')"
          >反审核</el-button>
          <el-button type="danger" plain :disabled="selectedRows.length === 0" @click="handleToolbarDelete">删除</el-button>
          <el-button type="primary" @click="handleImportClick">导入 Excel</el-button>
          <el-button type="success" @click="handleImportSeedData">导入汇总表</el-button>
          <el-button @click="handleDownloadImportTemplate">下载模板</el-button>
          <input
            ref="importInputRef"
            type="file"
            accept=".xlsx,.xls"
            class="hidden-import-input"
            @change="handleImportFile"
          />
          <el-button 
            :type="showAdvancedFilter ? 'success' : 'default'" 
            @click="showAdvancedFilter = !showAdvancedFilter"
          >
            {{ showAdvancedFilter ? '隐藏筛选' : '高级筛选' }}
          </el-button>
        </div>
      </div>

      <div class="search-advanced" v-show="showAdvancedFilter">
        <div class="filter-row">
          <div class="filter-item">
            <span class="filter-label">平台状态：</span>
            <el-checkbox-group v-model="searchForm.platformStatus">
              <el-checkbox-button v-for="opt in platformStatusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</el-checkbox-button>
            </el-checkbox-group>
          </div>
          <div class="filter-item">
            <span class="filter-label">状态：</span>
            <el-checkbox-group v-model="searchForm.status">
              <el-checkbox-button v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</el-checkbox-button>
            </el-checkbox-group>
          </div>
          <div class="filter-item">
            <span class="filter-label">公司类型：</span>
            <el-checkbox-group v-model="searchForm.companyType">
              <el-checkbox-button v-for="opt in companyTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</el-checkbox-button>
            </el-checkbox-group>
          </div>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <div class="table-summary">共 {{ filteredData.length }} 条，当前第 {{ currentPage }} / {{ Math.max(1, Math.ceil(filteredData.length / pageSize) || 1) }} 页</div>
        <el-button size="small" @click="openColumnSettings">
          <el-icon><Setting /></el-icon>
          列表设置
        </el-button>
      </div>
      <div v-if="sortedVisibleColumns.length === 0" class="header-empty-tip">请点击「列表设置」选择要显示的列</div>
      <el-table
        v-else
        ref="tableRef"
        :key="tableColumnRenderKey"
        :data="pagedData"
        row-key="id"
        class="common-table"
        border
        :fit="true"
        @header-dragend="handleHeaderDragend"
        @row-dblclick="handleRowDoubleClick"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="index" label="序号" :index="indexMethod" :width="columnWidths.index" align="center" fixed="left" />
        <el-table-column type="selection" :width="columnWidths.select" />
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
          <template #default="{ row }">
            <template v-if="col.key === 'platformStatus'">
              <el-tag size="small" :type="row.platformStatus === 'platformAudited' ? 'success' : 'warning'">
                {{ row.platformStatus === 'platformAudited' ? '已审核' : '未审核' }}
              </el-tag>
            </template>
            <span
              v-else-if="col.key === 'companyName'"
              class="code-link"
              @click="handleView(row.id)"
            >{{ row.companyName }}</span>
            <el-tag v-else-if="col.key === 'companyType'" size="small" type="info">
              {{ getCompanyTypeLabel(row.companyType) || '—' }}
            </el-tag>
            <el-tag
              v-else-if="col.key === 'status'"
              size="small"
              :type="getPlatformCustomerStatusTagType(row.status)"
            >{{ getPlatformCustomerStatusLabel(row.status) }}</el-tag>
            <el-tag
              v-else-if="col.key === 'recordStatus'"
              size="small"
              :type="row.recordStatus === '是' ? 'success' : 'info'"
            >{{ row.recordStatus }}</el-tag>
            <span v-else>{{ row[col.prop] ?? '' }}</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          v-model:current-page="currentPage"
          :page-sizes="[10, 20, 50, 100]"
          v-model:page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="filteredData.length"
        />
      </div>
    </div>
  </div>

  <el-dialog v-model="showBatchModifyDialog" title="批量修改客户资料" width="480px" draggable>
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
        <el-select
          v-if="batchModifyColumnDef?.key === 'companyType'"
          v-model="batchModifyValue"
          placeholder="请选择三方类型"
          style="width: 100%"
        >
          <el-option
            v-for="opt in companyTypeOptions.filter(item => item.value !== 'all')"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-select
          v-else-if="batchModifyColumnDef?.key === 'status'"
          v-model="batchModifyValue"
          placeholder="请选择状态"
          style="width: 100%"
        >
          <el-option
            v-for="opt in statusOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-select
          v-else-if="batchModifyColumnDef?.key === 'recordStatus'"
          v-model="batchModifyValue"
          placeholder="请选择"
          style="width: 100%"
        >
          <el-option label="是" value="是" />
          <el-option label="否" value="否" />
        </el-select>
        <el-input v-else v-model="batchModifyValue" placeholder="请输入新值" clearable />
      </el-form-item>
      <p class="batch-modify-tip">将修改已选 {{ selectedRows.length }} 条客户资料的对应字段</p>
    </el-form>
    <template #footer>
      <el-button @click="showBatchModifyDialog = false">取消</el-button>
      <el-button type="primary" @click="confirmBatchModify">确定</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="showColumnSelector" title="客户列表设置" width="720px" draggable>
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
.page-container { padding: 20px; background-color: #F5F7FA; min-height: calc(100vh - 60px); }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  .page-info {
    h1 {
      font-size: 22px;
      font-weight: 600;
      margin: 0 0 6px;
      color: #101828;
    }
  }

  .breadcrumb {
    font-size: 14px;
    color: #667085;
  }
}

.search-card { 
  background: transparent; 
  border-radius: 0; 
  padding: 0 0 16px 0; 
  margin-bottom: 16px;
  box-shadow: none; 
  border-bottom: 1px solid #e4e7ed;

  .search-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: space-between;
  }

  .search-form {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    
    :deep(.el-form-item) {
      margin-bottom: 0;
      margin-right: 0;
    }
    
    :deep(.el-input__wrapper) {
      box-shadow: none !important;
      border: none !important;
      border-bottom: 1px solid #e4e7ed !important;
      border-radius: 0 !important;
      background: transparent !important;
      padding: 4px 11px;
      padding-left: 0 !important;
    }
    
    :deep(.el-input__inner) {
      border: none !important;
      background: transparent !important;
      padding: 0;
      padding-left: 0 !important;
      
      &:focus {
        border: none !important;
        box-shadow: none !important;
      }
    }
    
    :deep(.el-select .el-input__wrapper) {
      box-shadow: none !important;
      border: none !important;
      border-bottom: 1px solid #e4e7ed !important;
      border-radius: 0 !important;
      background: transparent !important;
      padding-left: 0 !important;
    }
    
    :deep(.el-select .el-input__inner) {
      padding-left: 0 !important;
      border: none !important;
      background: transparent !important;
    }
    
    :deep(.el-date-editor.el-input__wrapper) {
      box-shadow: none !important;
      border: none !important;
      border-bottom: 1px solid #e4e7ed !important;
      border-radius: 0 !important;
      background: transparent !important;
      padding-left: 0 !important;
    }
    
    :deep(.el-date-editor .el-input__inner) {
      padding-left: 0 !important;
      border: none !important;
      background: transparent !important;
    }
    
    :deep(.el-select__caret) {
      color: #909399;
    }
  }

  .button-group {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .search-row :deep(.el-form--inline) {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 8px;
  }

  .search-row :deep(.el-form-item) {
    margin-bottom: 0;
    flex-shrink: 0;
  }

  .search-advanced {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #f0f0f0;

    .filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 12px;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .filter-item {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;

      .filter-label {
        font-size: 14px;
        color: #606266;
        font-weight: 500;
        min-width: 80px;
        flex-shrink: 0;
      }

      :deep(.el-checkbox-button) {
        margin-right: 0;
      }

      :deep(.el-checkbox-button__inner) {
        border-radius: 4px;
        border: 1px solid #dcdfe6;
        margin-left: -1px;
        transition: all 0.3s;

        &:hover {
          color: #00bfa5;
          border-color: #00bfa5;
        }
      }

      :deep(.el-checkbox-button.is-checked) {
        .el-checkbox-button__inner {
          background-color: #00bfa5;
          border-color: #00bfa5;
          color: #fff;
          box-shadow: 0 2px 4px rgba(0, 191, 165, 0.3);
        }
      }

      :deep(.el-checkbox-button:first-child .el-checkbox-button__inner) {
        border-radius: 4px 0 0 4px;
      }

      :deep(.el-checkbox-button:last-child .el-checkbox-button__inner) {
        border-radius: 0 4px 4px 0;
      }
    }
  }
}

.table-card { 
  background: #fff; 
  border-radius: 8px; 
  padding: 16px; 
  box-shadow: 0 1px 4px rgba(0,0,0,0.04); 
  border: 1px solid #ebeef5;

  .table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .table-summary {
    font-size: 13px;
    color: #667085;
  }
  
  :deep(.el-table) {
    border: none;
    
    th {
      background-color: #fafafa !important;
      border-bottom: 2px solid #e4e7ed;
      border-right: none;
    }
    
    td {
      border-bottom: 1px solid #f2f6fc !important;
      border-right: none !important;
    }
    
    .el-table__header-wrapper th {
      background: #fafafa;
      color: #606266;
      font-weight: 500;
      text-align: center !important;
    }
  }
  :deep(.el-table__row:nth-child(odd)) {
    background-color: #F0F9F7;
  }
  
  :deep(.el-table__row:nth-child(even)) {
    background-color: #FFFFFF;
  }
  
  :deep(.el-table__body tr:hover > td) {
    background-color: #D4EDE6 !important;
  }
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.hidden-import-input {
  display: none;
}

.header-empty-tip {
  padding: 40px 0;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.batch-modify-tip {
  margin: 0;
  font-size: 13px;
  color: #667085;
}

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

.code-link {
  color: #00bfa5;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
}

:deep(.el-tag) {
  &.el-tag--success {
    background-color: #f0f9f7;
    border-color: #e1f3ed;
    color: #00bfa5;
  }

  &.el-tag--warning {
    background-color: #fdf6ec;
    border-color: #faecd8;
    color: #e6a23c;
  }

  &.el-tag--info {
    background-color: #f4f4f5;
    border-color: #e9e9eb;
    color: #909399;
  }

  &.el-tag--danger {
    background-color: #fef0f0;
    border-color: #fde2e2;
    color: #f56c6c;
  }

  &.el-tag--primary {
    background-color: #ecf5ff;
    border-color: #d9ecff;
    color: #409eff;
  }
}
</style>