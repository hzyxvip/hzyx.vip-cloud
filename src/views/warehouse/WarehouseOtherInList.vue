<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTableStyle } from '@/composables/useTableStyle'
import { ElMessage } from 'element-plus'

const router = useRouter()

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

const inTypeOptions = [
  { label: '报损入库', value: 'damage' },
  { label: '报溢入库', value: 'overflow' },
  { label: '赠送入库', value: 'gift' },
  { label: '退货入库', value: 'return' },
  { label: '其他入库', value: 'other' }
]

const auditStatusOptions = [
  { label: '未审核', value: 'notAudited' },
  { label: '已审核', value: 'audited' }
]

const closeStatusOptions = [
  { label: '未关闭', value: 'notClosed' },
  { label: '已关闭', value: 'closed' }
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
  inType: [] as string[],
  auditStatus: [] as string[],
  closeStatus: [] as string[]
})

onMounted(() => {
  const range = getDateRange('thisMonth')
  if (range) {
    searchForm.value.dateRange = range
  }
  
  const savedForm = localStorage.getItem('warehouse-other-in-search-form')
  if (savedForm) {
    try {
      const parsed = JSON.parse(savedForm)
      Object.assign(searchForm.value, parsed)
      
      if (parsed.dateRange && Array.isArray(parsed.dateRange)) {
        searchForm.value.dateRange = parsed.dateRange.map((d: string) => new Date(d))
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
  localStorage.setItem('warehouse-other-in-search-form', JSON.stringify(toSave))
}

const handlePresetChange = (val: string) => {
  const range = getDateRange(val)
  if (range) {
    searchForm.value.dateRange = range
  }
  saveSearchForm()
}

watch(() => [searchForm.value.inType, searchForm.value.auditStatus, searchForm.value.closeStatus], () => {
  saveSearchForm()
}, { deep: true })

const getWarehouseList = () => {
  const stored = localStorage.getItem('warehouseList')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return []
    }
  }
  return []
}

const warehouseList = getWarehouseList()

const tableData = ref([
  { 
    id: 'IN202606001', 
    warehouse: warehouseList[0]?.name || '公司库', 
    inType: 'damage',
    date: '2026-06-15', 
    amount: '¥12,500', 
    status: 'pending',
    auditStatus: 'notAudited',
    closeStatus: 'notClosed',
    items: '5种',
    operator: '张三'
  },
  { 
    id: 'IN202606002', 
    warehouse: warehouseList[1]?.name || '公司库', 
    inType: 'overflow',
    date: '2026-06-14', 
    amount: '¥8,800', 
    status: 'approved',
    auditStatus: 'audited',
    closeStatus: 'closed',
    items: '3种',
    operator: '李四'
  },
  { 
    id: 'IN202606003', 
    warehouse: warehouseList[2]?.name || '公司库', 
    inType: 'gift',
    date: '2026-06-13', 
    amount: '¥15,200', 
    status: 'completed',
    auditStatus: 'audited',
    closeStatus: 'notClosed',
    items: '8种',
    operator: '王五'
  },
  { 
    id: 'IN202606004', 
    warehouse: warehouseList[0]?.name || '公司库', 
    inType: 'return',
    date: '2026-06-12', 
    amount: '¥45,600', 
    status: 'pending',
    auditStatus: 'notAudited',
    closeStatus: 'notClosed',
    items: '12种',
    operator: '赵六'
  },
  { 
    id: 'IN202606005', 
    warehouse: warehouseList[1]?.name || '公司库', 
    inType: 'other',
    date: '2026-06-11', 
    amount: '¥8,900', 
    status: 'approved',
    auditStatus: 'audited',
    closeStatus: 'closed',
    items: '2种',
    operator: '钱七'
  },
  { 
    id: 'IN202606006', 
    warehouse: warehouseList[2]?.name || '公司库', 
    inType: 'damage',
    date: '2026-06-10', 
    amount: '¥35,000', 
    status: 'completed',
    auditStatus: 'audited',
    closeStatus: 'closed',
    items: '6种',
    operator: '孙八'
  }
])

const statusLabels = {
  pending: { text: '待审核', color: 'warning' },
  approved: { text: '已审核', color: 'primary' },
  completed: { text: '已完成', color: 'success' },
  rejected: { text: '已驳回', color: 'danger' }
}

const inTypeLabels: Record<string, string> = {
  damage: '报损入库',
  overflow: '报溢入库',
  gift: '赠送入库',
  return: '退货入库',
  other: '其他入库'
}

const auditStatusLabels: Record<string, string> = {
  notAudited: '未审核',
  audited: '已审核'
}

const closeStatusLabels: Record<string, string> = {
  notClosed: '未关闭',
  closed: '已关闭'
}

const { columnWidths, handleHeaderDragend } = useTableStyle('warehouse-other-in', [
  { key: 'id', label: '单据号', defaultWidth: 140 },
  { key: 'warehouse', label: '仓库', defaultWidth: 150 },
  { key: 'inType', label: '入库类别', defaultWidth: 100 },
  { key: 'date', label: '入库日期', defaultWidth: 120 },
  { key: 'items', label: '商品种类', defaultWidth: 100 },
  { key: 'amount', label: '入库金额', defaultWidth: 120 },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 100 },
  { key: 'closeStatus', label: '关闭状态', defaultWidth: 100 },
  { key: 'operator', label: '经办人', defaultWidth: 100 },
  { key: 'status', label: '状态', defaultWidth: 100 },
  { key: 'action', label: '操作', defaultWidth: 180 }
])

const filteredData = computed(() => {
  return tableData.value.filter(item => {
    if (searchForm.value.keyword) {
      const keywords = searchForm.value.keyword.trim().split(/\s+/).filter(k => k)
      if (keywords.length > 0) {
        const matchFields = [
          item.id,
          item.warehouse,
          item.operator || '',
          item.inType || ''
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
      const itemDate = new Date(item.date)
      const [startDate, endDate] = searchForm.value.dateRange
      if (itemDate < startDate || itemDate > endDate) {
        return false
      }
    }
    
    if (searchForm.value.inType.length > 0 && !searchForm.value.inType.includes(item.inType)) {
      return false
    }
    
    if (searchForm.value.auditStatus.length > 0 && !searchForm.value.auditStatus.includes(item.auditStatus)) {
      return false
    }
    
    if (searchForm.value.closeStatus.length > 0 && !searchForm.value.closeStatus.includes(item.closeStatus)) {
      return false
    }
    
    return true
  })
})

const handleCreate = () => {
  router.push('/warehouse/other-in')
}

const handleView = (_id: string) => {
  router.push('/warehouse/details')
}

const handleEdit = (_id: string) => {
  router.push('/warehouse/other-in')
}

const handleDelete = (_id: string) => {
}

const handleRowDoubleClick = (_row: any) => {
  router.push('/warehouse/details')
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
    inType: [],
    auditStatus: [],
    closeStatus: []
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
</script>

<template>
  <div class="page-container">
    <div class="search-card">
      <div class="search-row">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="业务时段">
            <el-select v-model="searchForm.selectedPreset" placeholder="选择时间段" clearable style="width: 100px;" @change="handlePresetChange">
              <el-option v-for="preset in timePresets" :key="preset.value" :label="preset.label" :value="preset.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker v-model="searchForm.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 240px;" @change="saveSearchForm()" />
          </el-form-item>
          <el-form-item class="keyword-input">
            <el-input v-model="searchForm.keyword" placeholder="单据号/仓库/经办人/入库类别" clearable style="width: 280px;" @input="saveSearchForm()" />
          </el-form-item>
        </el-form>
        <div class="button-group">
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleRefresh">刷新</el-button>
          <el-button type="primary" @click="handleCreate">新增</el-button>
          <el-button 
            :type="showAdvancedFilter ? 'success' : 'default'" 
            @click="showAdvancedFilter = !showAdvancedFilter; saveSearchForm()"
          >
            {{ showAdvancedFilter ? '隐藏筛选' : '高级筛选' }}
          </el-button>
        </div>
      </div>

      <div class="search-advanced" v-show="showAdvancedFilter">
        <div class="filter-row">
          <div class="filter-item">
            <span class="filter-label">入库类别：</span>
            <el-checkbox-group v-model="searchForm.inType">
              <el-checkbox-button 
                v-for="opt in inTypeOptions" 
                :key="opt.value" 
                :value="opt.value"
              >
                {{ opt.label }}
              </el-checkbox-button>
            </el-checkbox-group>
          </div>
          
          <div class="filter-item">
            <span class="filter-label">审核状态：</span>
            <el-checkbox-group v-model="searchForm.auditStatus">
              <el-checkbox-button 
                v-for="opt in auditStatusOptions" 
                :key="opt.value" 
                :value="opt.value"
              >
                {{ opt.label }}
              </el-checkbox-button>
            </el-checkbox-group>
          </div>
          
          <div class="filter-item">
            <span class="filter-label">关闭状态：</span>
            <el-checkbox-group v-model="searchForm.closeStatus">
              <el-checkbox-button 
                v-for="opt in closeStatusOptions" 
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
      <el-table :data="filteredData" class="common-table" border :fit="true" @row-dblclick="handleRowDoubleClick" @header-dragend="handleHeaderDragend">
        <el-table-column prop="id" label="单据号" :width="columnWidths.id">
          <template #default="{ row }">
            <span class="code-link" @click="handleOrderNoClick(row)">
              {{ row.id }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="warehouse" label="仓库" :width="columnWidths.warehouse" />
        <el-table-column prop="inType" label="入库类别" :width="columnWidths.inType">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ inTypeLabels[row.inType] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="date" label="入库日期" :width="columnWidths.date" />
        <el-table-column prop="items" label="商品种类" :width="columnWidths.items" />
        <el-table-column prop="amount" label="入库金额" :width="columnWidths.amount" />
        
        <el-table-column label="审核状态" :width="columnWidths.auditStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.auditStatus === 'audited' ? 'success' : 'info'">
              {{ auditStatusLabels[row.auditStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="关闭状态" :width="columnWidths.closeStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.closeStatus === 'closed' ? 'danger' : 'info'">
              {{ closeStatusLabels[row.closeStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="operator" label="经办人" :width="columnWidths.operator" />
        
        <el-table-column prop="status" label="状态" :width="columnWidths.status">
          <template #default="{ row }">
            <el-tag :type="statusLabels[row.status as keyof typeof statusLabels].color">
              {{ statusLabels[row.status as keyof typeof statusLabels].text }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" :width="columnWidths.action" align="center">
          <template #default="{ row }">
            <el-button type="text" size="small" @click="handleView(row.id)">查看</el-button>
            <el-button type="text" size="small" @click="handleEdit(row.id)">编辑</el-button>
            <el-button type="text" size="small" @click="handleDelete(row.id)" :disabled="row.status === 'completed'">删除</el-button>
          </template>
        </el-table-column>
        <el-table-column label="" />
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