<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Plus, Refresh, Setting } from '@element-plus/icons-vue'
import { useTableStyle } from '@/composables/useTableStyle'
import { ElMessage, ElDialog } from 'element-plus'

const router = useRouter()

const showAdvancedFilter = ref(false)
const showColumnControl = ref(false)

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
  { label: '启用', value: 'enabled' },
  { label: '停用', value: 'disabled' }
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

const searchForm = ref({
  keyword: '',
  selectedPreset: 'thisMonth' as string,
  dateRange: [] as Date[],
  status: [] as string[]
})

onMounted(() => {
  const range = getDateRange('thisMonth')
  if (range) {
    searchForm.value.dateRange = range
  }
  
  const savedForm = localStorage.getItem('barcode-rule-search-form')
  if (savedForm) {
    try {
      const parsed = JSON.parse(savedForm)
      Object.assign(searchForm.value, parsed)
      
      if (parsed.dateRange && Array.isArray(parsed.dateRange)) {
        searchForm.value.dateRange = parsed.dateRange.map(d => new Date(d))
      } else {
        searchForm.value.dateRange = range || []
      }
      
      showAdvancedFilter.value = parsed.showAdvancedFilter || false
    } catch {
      searchForm.value.dateRange = range || []
    }
  }
})

const saveSearchForm = () => {
  const toSave = {
    ...searchForm.value,
    showAdvancedFilter: showAdvancedFilter.value
  }
  localStorage.setItem('barcode-rule-search-form', JSON.stringify(toSave))
}

const handlePresetChange = (val: string) => {
  const range = getDateRange(val)
  if (range) {
    searchForm.value.dateRange = range
  }
  saveSearchForm()
}

watch(() => [searchForm.value.status], () => {
  saveSearchForm()
}, { deep: true })

const tableData = ref([
  { 
    id: 'BR001', 
    code: 'BR001', 
    name: '医疗器械条码规则', 
    status: 'enabled',
    createTime: '2026-06-15',
    creator: '系统管理员'
  },
  { 
    id: 'BR002', 
    code: 'BR002', 
    name: '药品条码规则', 
    status: 'enabled',
    createTime: '2026-06-14',
    creator: '张三'
  },
  { 
    id: 'BR003', 
    code: 'BR003', 
    name: '耗材条码规则', 
    status: 'disabled',
    createTime: '2026-06-13',
    creator: '李四'
  }
])

const statusLabels: Record<string, { text: string; color: string }> = {
  enabled: { text: '启用', color: 'success' },
  disabled: { text: '停用', color: 'danger' }
}

const { columnWidths, handleHeaderDragend } = useTableStyle('barcode-rule-list', [
  { key: 'selection', label: '', defaultWidth: 50 },
  { key: 'code', label: '规则编码', defaultWidth: 120 },
  { key: 'name', label: '规则名称', defaultWidth: 200 },
  { key: 'status', label: '状态', defaultWidth: 100 },
  { key: 'createTime', label: '创建时间', defaultWidth: 120 },
  { key: 'creator', label: '创建人', defaultWidth: 100 },
  { key: 'action', label: '操作', defaultWidth: 150 }
])

const selectedIds = ref<string[]>([])

const handleSelectionChange = (val: any[]) => {
  selectedIds.value = val.map(item => item.id)
}

const handleSelectAll = (field: string, options: any[], checkValues: string[]) => {
  if (checkValues.length === options.length) {
    switch (field) {
      case 'status':
        searchForm.value.status = []
        break
    }
  } else {
    switch (field) {
      case 'status':
        searchForm.value.status = options.map(opt => opt.value)
        break
    }
  }
}

const filteredData = computed(() => {
  return tableData.value.filter(item => {
    if (searchForm.value.keyword) {
      const keywords = searchForm.value.keyword.trim().split(/\s+/).filter(k => k)
      if (keywords.length > 0) {
        const matchFields = [
          item.code,
          item.name,
          item.creator
        ]
        const allMatch = keywords.every(keyword => {
          const kw = keyword.toLowerCase()
          return matchFields.some(field => 
            String(field).toLowerCase().includes(kw)
          )
        })
        if (!allMatch) {
          return false
        }
      }
    }
    
    if (searchForm.value.dateRange.length === 2) {
      const itemDate = new Date(item.createTime)
      const [startDate, endDate] = searchForm.value.dateRange
      if (itemDate < startDate || itemDate > endDate) {
        return false
      }
    }
    
    if (searchForm.value.status.length > 0 && !searchForm.value.status.includes(item.status)) {
      return false
    }
    
    return true
  })
})

const handleCreate = () => {
  router.push('/data/barcode-rule/create')
}

const handleEdit = (id: string) => {
  router.push(`/data/barcode-rule/create/${id}`)
}

const handleDelete = (id: string) => {
  const index = tableData.value.findIndex(item => item.id === id)
  if (index > -1) {
    tableData.value.splice(index, 1)
    ElMessage.success('删除成功')
  }
}

const handleBatchDelete = () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要删除的记录')
    return
  }
  tableData.value = tableData.value.filter(item => !selectedIds.value.includes(item.id))
  selectedIds.value = []
  ElMessage.success(`成功删除 ${selectedIds.value.length} 条记录`)
}

const handleSearch = () => {
  saveSearchForm()
  ElMessage.success(`筛选条件已应用，共找到 ${filteredData.value.length} 条记录`)
}

const handleReset = () => {
  searchForm.value = {
    keyword: '',
    selectedPreset: 'thisMonth',
    dateRange: [],
    status: []
  }
  const range = getDateRange('thisMonth')
  if (range) {
    searchForm.value.dateRange = range
  }
}

const handleRefresh = () => {
  handleReset()
  ElMessage.success('数据已刷新')
}

const handleSizeChange = () => {}
const handleCurrentChange = () => {}

const columns = ref([
  { key: 'code', label: '规则编码', visible: true, frozen: false, header: true },
  { key: 'name', label: '规则名称', visible: true, frozen: false, header: true },
  { key: 'status', label: '状态', visible: true, frozen: false, header: true },
  { key: 'createTime', label: '创建时间', visible: true, frozen: false, header: true },
  { key: 'creator', label: '创建人', visible: true, frozen: false, header: true }
])

const handleColumnControl = () => {
  showColumnControl.value = true
}

const resetColumnDefaults = () => {
  columns.value = columns.value.map(col => ({
    ...col,
    visible: true,
    frozen: false,
    header: true
  }))
}

const hideAllColumns = () => {
  columns.value = columns.value.map(col => ({
    ...col,
    visible: false
  }))
}

const freezeAllColumns = () => {
  columns.value = columns.value.map(col => ({
    ...col,
    frozen: true
  }))
}

const unfreezeAllColumns = () => {
  columns.value = columns.value.map(col => ({
    ...col,
    frozen: false
  }))
}

const moveColumnUp = (index: number) => {
  if (index > 0) {
    const temp = columns.value[index]
    columns.value[index] = columns.value[index - 1]
    columns.value[index - 1] = temp
  }
}

const moveColumnDown = (index: number) => {
  if (index < columns.value.length - 1) {
    const temp = columns.value[index]
    columns.value[index] = columns.value[index + 1]
    columns.value[index + 1] = temp
  }
}

const confirmColumnControl = () => {
  showColumnControl.value = false
  ElMessage.success('列表设置已保存')
}
</script>

<template>
  <div class="page-container">
    <div class="search-card">
      <div class="search-row">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item class="keyword-input">
            <el-input v-model="searchForm.keyword" placeholder="条码规则编码/规则名称" clearable style="width: 280px;" @input="saveSearchForm()" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" multiple placeholder="请选择状态" clearable style="width: 150px;" @change="saveSearchForm()">
              <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
        </el-form>
        <div class="button-group">
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleRefresh">刷新</el-button>
          <el-button type="primary" @click="handleCreate">新增</el-button>
          <el-button @click="handleColumnControl">
            <Setting />
          </el-button>
        </div>
      </div>

      <div class="search-advanced" v-show="showAdvancedFilter">
        <div class="filter-row">
          <div class="filter-item">
            <span class="filter-label">状态：</span>
            <el-checkbox-group v-model="searchForm.status">
              <el-checkbox-button 
                v-for="opt in statusOptions" 
                :key="opt.value" 
                :value="opt.value"
              >
                {{ opt.label }}
              </el-checkbox-button>
            </el-checkbox-group>
          </div>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-header-actions">
        <span>已选 {{ selectedIds.length }} 条</span>
        <el-button type="danger" text size="small" @click="handleBatchDelete" :disabled="selectedIds.length === 0">批量删除</el-button>
      </div>
      
      <el-table 
        :data="filteredData" 
        class="common-table" 
        border 
        :fit="true"
        @header-dragend="handleHeaderDragend"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" :width="columnWidths.selection" />
        
        <el-table-column prop="code" label="规则编码" :width="columnWidths.code">
          <template #default="{ row }">
            <span class="code-link">{{ row.code }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="name" label="规则名称" :width="columnWidths.name" />
        
        <el-table-column prop="status" label="状态" :width="columnWidths.status" align="center">
          <template #default="{ row }">
            <el-tag :type="statusLabels[row.status].color">
              {{ statusLabels[row.status].text }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="createTime" label="创建时间" :width="columnWidths.createTime" />
        
        <el-table-column prop="creator" label="创建人" :width="columnWidths.creator" />
        
        <el-table-column label="操作" :width="columnWidths.action" align="center">
          <template #default="{ row }">
            <el-button type="text" size="small" @click="handleEdit(row.id)">编辑</el-button>
            <el-button type="text" size="small" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="1"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="10"
          layout="total, sizes, prev, pager, next, jumper"
          :total="filteredData.length"
        />
      </div>
    </div>

    <el-dialog title="列表控制" v-model="showColumnControl" width="800px" :close-on-click-modal="false">
      <div class="column-control">
        <div class="control-header">
          <span class="control-title">表格设置</span>
          <div class="control-actions">
            <el-button type="text" size="small" @click="resetColumnDefaults">恢复默认</el-button>
            <el-button type="text" size="small" @click="hideAllColumns">全部隐藏</el-button>
            <el-button type="text" size="small" @click="freezeAllColumns">全部冻结</el-button>
            <el-button type="text" size="small" @click="unfreezeAllColumns">全部解冻</el-button>
            <el-button type="text" size="small" @click="moveColumnUp">移到</el-button>
            <el-button type="text" size="small" @click="moveColumnUp">上移</el-button>
            <el-button type="text" size="small" @click="moveColumnDown">下移</el-button>
          </div>
        </div>
        
        <el-table :data="columns" border class="column-table">
          <el-table-column type="selection" width="50" />
          <el-table-column label="序号" width="60" type="index" />
          <el-table-column label="列名" width="150">
            <template #default="{ row }">{{ row.label }}</template>
          </el-table-column>
          <el-table-column label="对齐方式" width="120">
            <template #default="{ row }">
              <el-select v-model="row.align" placeholder="默认" style="width: 100%;">
                <el-option label="默认" value="default" />
                <el-option label="左对齐" value="left" />
                <el-option label="居中" value="center" />
                <el-option label="右对齐" value="right" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="显示列" width="100" align="center">
            <template #default="{ row }">
              <el-switch v-model="row.visible" />
            </template>
          </el-table-column>
          <el-table-column label="列冻结" width="100" align="center">
            <template #default="{ row }">
              <el-switch v-model="row.frozen" />
            </template>
          </el-table-column>
          <el-table-column label="是否表头" width="100" align="center">
            <template #default="{ row }">
              <el-switch v-model="row.header" />
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <template #footer>
        <el-button @click="showColumnControl = false">取消</el-button>
        <el-button type="primary" @click="confirmColumnControl">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; background-color: #F5F7FA; min-height: calc(100vh - 60px); }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; h1 { font-size: 20px; font-weight: 600; color: #344054; margin: 0; } }

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
    gap: 16px;
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
  }

  .button-group {
    display: flex;
    gap: 8px;
  }

  .search-advanced {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed #e4e7ed;
    
    .filter-row {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }
    
    .filter-item {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .filter-label {
        font-size: 14px;
        color: #667085;
      }
      
      :deep(.el-checkbox-button__inner) {
        border-radius: 4px !important;
        margin-right: 4px;
      }
    }
  }
}

.table-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);

  .table-header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e4e7ed;
    
    span {
      font-size: 14px;
      color: #667085;
    }
  }

  :deep(.common-table) {
    width: 100%;
    
    .el-table__header-wrapper th {
      background: #f5f7fa;
      color: #344054;
      font-weight: 600;
      text-align: center !important;

    .el-table__row:nth-child(odd) {
      background-color: #F0F9F7;
    }
    
    .el-table__row:nth-child(even) {
      background-color: #FFFFFF;
    }
    
    .el-table__body tr:hover > td {
      background-color: #D4EDE6 !important;
    }    }
  }

  .pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #e4e7ed;
  }
}

.column-control {
  .control-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e4e7ed;
    
    .control-title {
      font-weight: 600;
      color: #344054;
    }
    
    .control-actions {
      display: flex;
      gap: 4px;
    }
  }
  
  :deep(.column-table) {
    .el-table__header-wrapper th {
      background: #fafafa;
      font-weight: 500;
    }
  }
}

.code-link {
  color: #00bfa5;
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
  }
}

:deep(.el-button--primary) {
  background-color: #00bfa5 !important;
  border-color: #00bfa5 !important;
  color: #fff !important;
}
</style>