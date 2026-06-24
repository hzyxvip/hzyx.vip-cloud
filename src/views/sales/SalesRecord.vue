<script setup lang="ts">
import '@/styles/data-list-table.scss'
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Search, Plus, Refresh, View } from '@element-plus/icons-vue'
import { useTableStyle } from '@/composables/useTableStyle'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()

const showAdvancedFilter = ref(false)
const activeTab = ref('order')

const tabs = [
  { label: '订单记录', value: 'order' },
  { label: '操作日志', value: 'log' }
]

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

const auditStatusOptions = [
  { label: '未审核', value: 'notAudited' },
  { label: '已审核', value: 'audited' }
]

const executeStatusOptions = [
  { label: '未执行', value: 'notExecuted' },
  { label: '部分执行', value: 'partiallyExecuted' },
  { label: '全部执行', value: 'allExecuted' }
]

const warehouseStatusOptions = [
  { label: '未出库', value: 'notOutWarehoused' },
  { label: '部分出库', value: 'partiallyOutWarehoused' },
  { label: '全部出库', value: 'allOutWarehoused' }
]

const closeStatusOptions = [
  { label: '未关闭', value: 'notClosed' },
  { label: '已关闭', value: 'closed' },
  { label: '手动关闭', value: 'manualClosed' }
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
  orderId: '' as string,
  auditStatus: '' as string,
  executeStatus: '' as string,
  warehouseStatus: '' as string,
  closeStatus: '' as string
})

// 订单记录数据（从localStorage读取）
const orderRecords = ref<any[]>([])

// 操作日志数据（从localStorage读取）
const operationLogs = ref<any[]>([])

// 状态标签映射
const auditStatusLabels: Record<string, string> = {
  notAudited: '未审核',
  audited: '已审核'
}

const executeStatusLabels: Record<string, string> = {
  notExecuted: '未执行',
  partiallyExecuted: '部分执行',
  allExecuted: '全部执行'
}

const warehouseStatusLabels: Record<string, string> = {
  notOutWarehoused: '未出库',
  partiallyOutWarehoused: '部分出库',
  allOutWarehoused: '全部出库'
}

const closeStatusLabels: Record<string, string> = {
  notClosed: '未关闭',
  closed: '已关闭',
  manualClosed: '手动关闭'
}

const operationTypeLabels: Record<string, string> = {
  create: '创建订单',
  edit: '编辑订单',
  audit: '审核订单',
  unaudit: '反审核',
  order: '下单',
  cancel: '撤单',
  close: '关闭订单',
  delete: '删除订单'
}

onMounted(() => {
  // 设置文档名称
  document.title = '销售订单记录'

  const range = getDateRange('thisMonth')
  if (range) {
    searchForm.value.dateRange = range
  }
  
  // 从URL参数获取订单ID
  const orderIdFromQuery = route.query.orderId as string
  if (orderIdFromQuery) {
    searchForm.value.orderId = orderIdFromQuery
    activeTab.value = 'log'
  }
  
  // 从localStorage读取订单数据
  const savedOrders = localStorage.getItem('sales-orders')
  if (savedOrders) {
    try {
      orderRecords.value = JSON.parse(savedOrders)
    } catch {
      orderRecords.value = []
    }
  }
  
  // 从localStorage读取操作日志
  const savedLogs = localStorage.getItem('sales-operation-logs')
  if (savedLogs) {
    try {
      operationLogs.value = JSON.parse(savedLogs)
    } catch {
      operationLogs.value = []
    }
  }
})

// 筛选订单记录
const filteredOrderRecords = computed(() => {
  return orderRecords.value.filter(item => {
    // 按订单号筛选
    if (searchForm.value.orderId && !item.id.toLowerCase().includes(searchForm.value.orderId.toLowerCase())) {
      return false
    }
    
    // 按关键词筛选
    if (searchForm.value.keyword) {
      const keywords = searchForm.value.keyword.trim().split(/\s+/).filter(k => k)
      if (keywords.length > 0) {
        const matchFields = [
          item.customer,
          item.operator || '',
          item.remark || ''
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
    
    // 按日期筛选
    if (searchForm.value.dateRange.length === 2) {
      const itemDate = new Date(item.date)
      const [startDate, endDate] = searchForm.value.dateRange
      if (itemDate < startDate || itemDate > endDate) {
        return false
      }
    }
    
    // 按审核状态筛选
    if (searchForm.value.auditStatus && item.auditStatus !== searchForm.value.auditStatus) {
      return false
    }
    
    // 按执行状态筛选
    if (searchForm.value.executeStatus && item.executeStatus !== searchForm.value.executeStatus) {
      return false
    }
    
    // 按出库状态筛选
    if (searchForm.value.warehouseStatus && item.warehouseStatus !== searchForm.value.warehouseStatus) {
      return false
    }
    
    // 按关闭状态筛选
    if (searchForm.value.closeStatus && item.closeStatus !== searchForm.value.closeStatus) {
      return false
    }
    
    return true
  })
})

// 筛选操作日志
const filteredOperationLogs = computed(() => {
  return operationLogs.value.filter(log => {
    // 按订单ID筛选
    if (searchForm.value.orderId && !log.orderId.toLowerCase().includes(searchForm.value.orderId.toLowerCase())) {
      return false
    }
    
    // 按关键词筛选
    if (searchForm.value.keyword) {
      const kw = searchForm.value.keyword.toLowerCase()
      if (!log.remark.toLowerCase().includes(kw) && !log.operator.toLowerCase().includes(kw)) {
        return false
      }
    }
    
    return true
  })
})

const { columnWidths, handleHeaderDragend } = useTableStyle('sales-record', [
  { key: 'id', label: '订单号', defaultWidth: 140 },
  { key: 'customer', label: '客户', defaultWidth: 180 },
  { key: 'date', label: '下单日期', defaultWidth: 120 },
  { key: 'amount', label: '订单金额', defaultWidth: 120 },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 100 },
  { key: 'executeStatus', label: '执行状态', defaultWidth: 100 },
  { key: 'warehouseStatus', label: '出库状态', defaultWidth: 100 },
  { key: 'closeStatus', label: '关闭状态', defaultWidth: 100 },
  { key: 'action', label: '操作', defaultWidth: 120 }
])

const handlePresetChange = (val: string) => {
  const range = getDateRange(val)
  if (range) {
    searchForm.value.dateRange = range
  }
}

const handleViewOrder = (id: string) => {
  router.push(`/sales/order-list/details?id=${id}`)
}

const handleViewOrderList = () => {
  router.push('/sales/order-list')
}

const handleSearch = () => {
  const count = activeTab.value === 'order' ? filteredOrderRecords.value.length : filteredOperationLogs.value.length
  ElMessage.success(`筛选条件已应用，共找到 ${count} 条记录`)
}

const handleReset = () => {
  searchForm.value = {
    keyword: '',
    selectedPreset: 'thisMonth',
    dateRange: [],
    orderId: '',
    auditStatus: '',
    executeStatus: '',
    warehouseStatus: '',
    closeStatus: ''
  }
  const range = getDateRange('thisMonth')
  if (range) {
    searchForm.value.dateRange = range
  }
}

const handleRefresh = () => {
  // 重新从localStorage读取数据
  const savedOrders = localStorage.getItem('sales-orders')
  if (savedOrders) {
    try {
      orderRecords.value = JSON.parse(savedOrders)
    } catch {
      orderRecords.value = []
    }
  }
  
  const savedLogs = localStorage.getItem('sales-operation-logs')
  if (savedLogs) {
    try {
      operationLogs.value = JSON.parse(savedLogs)
    } catch {
      operationLogs.value = []
    }
  }
  
  ElMessage.success('数据已刷新')
}

const handleSizeChange = () => {}
const handleCurrentChange = () => {}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>销售订单记录</h1>
      <el-button type="primary" @click="handleViewOrderList">返回订单列表</el-button>
    </div>
    
    <!-- 标签页切换 -->
    <div class="tabs-container">
      <el-tabs v-model="activeTab" class="record-tabs">
        <el-tab-pane v-for="tab in tabs" :key="tab.value" :label="tab.label" :name="tab.value" />
      </el-tabs>
    </div>
    
    <!-- 搜索区域 -->
    <div class="search-card">
      <div class="search-row">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="订单号">
            <el-input v-model="searchForm.orderId" placeholder="输入订单号" clearable style="width: 140px;" />
          </el-form-item>
          <el-form-item label="业务时段">
            <el-select v-model="searchForm.selectedPreset" placeholder="选择时间段" clearable style="width: 100px;" @change="handlePresetChange">
              <el-option v-for="preset in timePresets" :key="preset.value" :label="preset.label" :value="preset.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker v-model="searchForm.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 240px;" />
          </el-form-item>
          <el-form-item class="keyword-input">
            <el-input v-model="searchForm.keyword" placeholder="客户/操作人/备注" clearable style="width: 200px;" />
          </el-form-item>
        </el-form>
        <div class="button-group">
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleRefresh">刷新</el-button>
          <el-button 
            :type="showAdvancedFilter ? 'success' : 'default'" 
            @click="showAdvancedFilter = !showAdvancedFilter"
          >
            {{ showAdvancedFilter ? '隐藏筛选' : '高级筛选' }}
          </el-button>
        </div>
      </div>

      <!-- 高级筛选 -->
      <div class="search-advanced" v-show="showAdvancedFilter && activeTab === 'order'">
        <div class="filter-row">
          <div class="filter-item">
            <span class="filter-label">审核状态：</span>
            <el-radio-group v-model="searchForm.auditStatus">
              <el-radio-button label="">全部</el-radio-button>
              <el-radio-button 
                v-for="opt in auditStatusOptions" 
                :key="opt.value" 
                :value="opt.value"
              >
                {{ opt.label }}
              </el-radio-button>
            </el-radio-group>
          </div>
          
          <div class="filter-item">
            <span class="filter-label">执行状态：</span>
            <el-radio-group v-model="searchForm.executeStatus">
              <el-radio-button label="">全部</el-radio-button>
              <el-radio-button 
                v-for="opt in executeStatusOptions" 
                :key="opt.value" 
                :value="opt.value"
              >
                {{ opt.label }}
              </el-radio-button>
            </el-radio-group>
          </div>
          
          <div class="filter-item">
            <span class="filter-label">出库状态：</span>
            <el-radio-group v-model="searchForm.warehouseStatus">
              <el-radio-button label="">全部</el-radio-button>
              <el-radio-button 
                v-for="opt in warehouseStatusOptions" 
                :key="opt.value" 
                :value="opt.value"
              >
                {{ opt.label }}
              </el-radio-button>
            </el-radio-group>
          </div>
        </div>
        
        <div class="filter-row">
          <div class="filter-item">
            <span class="filter-label">关闭状态：</span>
            <el-radio-group v-model="searchForm.closeStatus">
              <el-radio-button label="">全部</el-radio-button>
              <el-radio-button 
                v-for="opt in closeStatusOptions" 
                :key="opt.value" 
                :value="opt.value"
              >
                {{ opt.label }}
              </el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </div>
    </div>

    <!-- 订单记录表格 -->
    <div class="table-card data-list-table-card" v-show="activeTab === 'order'">
      <el-table :data="filteredOrderRecords" class="common-table" border :fit="true" @header-dragend="handleHeaderDragend">
        <el-table-column prop="id" label="订单号" :width="columnWidths.id">
          <template #default="{ row }">
            <span class="code-link" @click="handleViewOrder(row.id)">
              {{ row.id }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="customer" label="客户" :width="columnWidths.customer" />
        <el-table-column prop="date" label="下单日期" :width="columnWidths.date" />
        <el-table-column prop="amount" label="订单金额" :width="columnWidths.amount" />
        
        <el-table-column label="审核状态" :width="columnWidths.auditStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.auditStatus === 'audited' ? 'success' : 'info'">
              {{ auditStatusLabels[row.auditStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="执行状态" :width="columnWidths.executeStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.executeStatus === 'allExecuted' ? 'success' : (row.executeStatus === 'partiallyExecuted' ? 'warning' : 'info')">
              {{ executeStatusLabels[row.executeStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="出库状态" :width="columnWidths.warehouseStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.warehouseStatus === 'allOutWarehoused' ? 'success' : (row.warehouseStatus === 'partiallyOutWarehoused' ? 'warning' : 'info')">
              {{ warehouseStatusLabels[row.warehouseStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="关闭状态" :width="columnWidths.closeStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.closeStatus === 'closed' ? 'danger' : (row.closeStatus === 'manualClosed' ? 'warning' : 'info')">
              {{ closeStatusLabels[row.closeStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" :width="columnWidths.action" align="center">
          <template #default="{ row }">
            <el-button type="text" size="small" @click="handleViewOrder(row.id)">查看</el-button>
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
          :total="filteredOrderRecords.length"
        />
      </div>
    </div>

    <!-- 操作日志表格 -->
    <div class="table-card data-list-table-card" v-show="activeTab === 'log'">
      <el-table :data="filteredOperationLogs" class="common-table" border>
        <el-table-column prop="orderId" label="订单号" width="140">
          <template #default="{ row }">
            <span class="code-link" @click="handleViewOrder(row.orderId)">
              {{ row.orderId }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="operationType" label="操作类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.operationType === 'create' ? 'success' : (row.operationType === 'delete' ? 'danger' : 'info')">
              {{ operationTypeLabels[row.operationType] || row.operationType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="120" align="center" />
        <el-table-column prop="operationTime" label="操作时间" width="180" align="center" />
        <el-table-column prop="remark" label="备注" min-width="200" />
      </el-table>

      <div class="pagination">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="1"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="10"
          layout="total, sizes, prev, pager, next, jumper"
          :total="filteredOperationLogs.length"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container {
  padding: 20px;
  background-color: #F5F7FA;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  h1 {
    font-size: 22px;
    font-weight: 600;
    color: #344054;
    margin: 0;
  }
}

.tabs-container {
  margin-bottom: 16px;
  
  .record-tabs {
    :deep(.el-tabs__header) {
      margin-bottom: 0;
      border-bottom: 2px solid #e4e7ed;
    }
    
    :deep(.el-tabs__nav-wrap) {
      padding: 0 20px;
    }
    
    :deep(.el-tabs__item) {
      font-size: 16px;
      font-weight: 500;
      color: #667085;
      padding: 12px 20px;
      
      &.is-active {
        color: #00bfa5;
        font-weight: 600;
      }
    }
    
    :deep(.el-tabs__active-bar) {
      background-color: #00bfa5;
      height: 3px;
    }
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

  .search-advanced {
    margin-top: 16px;

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
      gap: 8px;
      
      .filter-label {
        font-size: 14px;
        color: #606266;
        white-space: nowrap;
      }
      
      :deep(.el-radio-button__inner) {
        padding: 8px 16px;
        border-radius: 4px !important;
        border: 1px solid #dcdfe6 !important;
        margin-left: -1px;
      }
      
      :deep(.el-radio-button:first-child .el-radio-button__inner) {
        border-radius: 4px !important;
        border-left: 1px solid #dcdfe6 !important;
      }
      
      :deep(.el-radio-button:last-child .el-radio-button__inner) {
        border-radius: 4px !important;
      }
      
      :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
        background-color: #00bfa5 !important;
        border-color: #00bfa5 !important;
        color: #fff !important;
      }
    }
  }
}

.table-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  
  .common-table {
    :deep(.el-table__header-wrapper th) {
      background: #f5f7fa;
      color: #344054;
      font-weight: 600;
      text-align: center !important;
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
  
  .pagination {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
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

:deep(.el-button--primary) {
  background-color: #00bfa5 !important;
  border-color: #00bfa5 !important;
  color: #fff !important;
}

:deep(.el-button--success) {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
}
</style>