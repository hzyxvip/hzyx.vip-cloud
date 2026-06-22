<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTableStyle } from '@/composables/useTableStyle'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  companyTypeOptions as platformCompanyTypeOptions,
  getCompanyTypeLabel,
  loadPlatformCustomerList,
  savePlatformCustomerList,
  type PlatformCustomer
} from '@/utils/platformCustomerStore'

const router = useRouter()
const tableRef = ref()
const selectedRows = ref<PlatformCustomer[]>([])

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

const statusOptions = [
  { label: '已审核', value: 'audited' },
  { label: '未审核', value: 'notAudited' }
]

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
  companyName: string
  pinyin: string
  phone: string
  contact: string
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
  companyName: '',
  pinyin: '',
  phone: '',
  contact: '',
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

onMounted(() => {
  localStorage.removeItem('platform-customer-search-form')
  tableData.value = loadPlatformCustomerList()
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
  if (!includesText(item.companyName, form.companyName)) return false
  if (!includesText(item.pinyin, form.pinyin)) return false
  if (!includesText(item.phone, form.phone)) return false
  if (!includesText(item.contact, form.contact)) return false
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
  { key: 'index', label: '', defaultWidth: 50 },
  { key: 'select', label: '', defaultWidth: 40 },
  { key: 'platformStatus', label: '平台状态', defaultWidth: 80 },
  { key: 'companyCode', label: '公司代码', defaultWidth: 100 },
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
  { key: 'recordDate', label: '备案日期', defaultWidth: 100 },
  { key: 'action', label: '操作', defaultWidth: 100 }
])

const handleCreate = () => {
  router.push('/platform/customer/create')
}

const handleSelectionChange = (rows: PlatformCustomer[]) => {
  selectedRows.value = rows
}

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
    const ids = new Set(selectedRows.value.map(item => item.id))
    const list = loadPlatformCustomerList().filter(item => !ids.has(item.id))
    savePlatformCustomerList(list)
    tableData.value = list
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

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('请谨慎删除！确定删除该客户资料吗？此操作不可恢复。', '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const list = loadPlatformCustomerList().filter(item => item.id !== id)
    savePlatformCustomerList(list)
    tableData.value = list
    ElMessage.success('删除成功')
  } catch {
    // 用户取消
  }
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

const handleRefresh = () => {
  tableData.value = loadPlatformCustomerList()
  handleReset()
  ElMessage.success('数据已刷新')
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
    <div class="search-card">
      <div class="search-row">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="公司代码">
            <el-input v-model="searchForm.companyCode" placeholder="公司代码" clearable style="width: 120px;" />
          </el-form-item>
          <el-form-item label="公司名称">
            <el-input v-model="searchForm.companyName" placeholder="公司名称" clearable style="width: 180px;" />
          </el-form-item>
          <el-form-item label="拼音缩写">
            <el-input v-model="searchForm.pinyin" placeholder="拼音缩写" clearable style="width: 120px;" />
          </el-form-item>
          <el-form-item label="电话">
            <el-input v-model="searchForm.phone" placeholder="电话" clearable style="width: 120px;" />
          </el-form-item>
          <el-form-item label="联系人">
            <el-input v-model="searchForm.contact" placeholder="联系人" clearable style="width: 100px;" />
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
          <el-button type="danger" plain :disabled="selectedRows.length === 0" @click="handleToolbarDelete">删除</el-button>
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
            <span class="filter-label">公司类型：</span>
            <el-checkbox-group v-model="searchForm.companyType">
              <el-checkbox-button v-for="opt in companyTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</el-checkbox-button>
            </el-checkbox-group>
          </div>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-summary">共 {{ filteredData.length }} 条，当前第 {{ currentPage }} / {{ Math.max(1, Math.ceil(filteredData.length / pageSize) || 1) }} 页</div>
      <el-table
        ref="tableRef"
        :data="pagedData"
        class="common-table"
        border
        :fit="true"
        @header-dragend="handleHeaderDragend"
        @row-dblclick="handleRowDoubleClick"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="index" :index="indexMethod" :width="columnWidths.index" align="center" />
        <el-table-column type="selection" :width="columnWidths.select" />
        <el-table-column label="平台状态" :width="columnWidths.platformStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.platformStatus === 'platformAudited' ? 'success' : 'warning'">
              {{ row.platformStatus === 'platformAudited' ? '已审核' : '未审核' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="companyCode" label="公司代码" :width="columnWidths.companyCode" />
        <el-table-column prop="companyName" label="公司名称" :width="columnWidths.companyName">
          <template #default="{ row }">
            <span class="code-link" @click="handleView(row.id)">{{ row.companyName }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="companyShortName" label="公司简称" :width="columnWidths.companyShortName" />
        <el-table-column prop="companyType" label="三方类型" :width="columnWidths.companyType">
          <template #default="{ row }">
            <el-tag size="small" type="info">
              {{ getCompanyTypeLabel(row.companyType) || '—' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="pinyin" label="拼音缩写" :width="columnWidths.pinyin" />
        <el-table-column prop="contact" label="联系人" :width="columnWidths.contact" />
        <el-table-column prop="phone" label="公司电话" :width="columnWidths.phone" />
        <el-table-column prop="email" label="公司邮箱" :width="columnWidths.email" />
        <el-table-column prop="province" label="省" :width="columnWidths.province" />
        <el-table-column prop="city" label="市" :width="columnWidths.city" />
        <el-table-column prop="address" label="地址" :width="columnWidths.address" />
        <el-table-column prop="license" label="营业执照" :width="columnWidths.license" />
        <el-table-column prop="licenseExpire" label="证件到期" :width="columnWidths.licenseExpire" />
        <el-table-column prop="taxId" label="税号" :width="columnWidths.taxId" />
        <el-table-column prop="bank" label="开户银行" :width="columnWidths.bank" />
        <el-table-column prop="bankAccount" label="银行账号" :width="columnWidths.bankAccount" />
        <el-table-column prop="platformUser" label="平台用户" :width="columnWidths.platformUser" />
        <el-table-column prop="createDate" label="创建日期" :width="columnWidths.createDate" />
        <el-table-column prop="creator" label="创建人" :width="columnWidths.creator" />
        <el-table-column prop="editor" label="编辑人员" :width="columnWidths.editor" />
        <el-table-column prop="editDate" label="编辑日期" :width="columnWidths.editDate" />
        <el-table-column prop="remark" label="备注" :width="columnWidths.remark" />
        <el-table-column label="平台备案" :width="columnWidths.recordStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.recordStatus === '是' ? 'success' : 'info'">{{ row.recordStatus }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="recordDate" label="备案日期" :width="columnWidths.recordDate" />
        <el-table-column label="操作" :width="columnWidths.action" align="center">
          <template #default="{ row }">
            <el-button type="text" size="small" @click="handleView(row.id)">查看</el-button>
            <el-button type="text" size="small" @click="handleEdit(row.id)">编辑</el-button>
            <el-button type="text" size="small" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
        <el-table-column label="" />
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
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; background-color: #F5F7FA; min-height: calc(100vh - 60px); }

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

  .table-summary {
    margin-bottom: 12px;
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