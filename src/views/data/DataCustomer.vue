<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Plus, Refresh } from '@element-plus/icons-vue'
import { useTableStyle } from '@/composables/useTableStyle'
import { usePartnerListBatchAudit } from '@/composables/usePartnerListBatchAudit'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getTradingPartners,
  upsertTradingPartner,
  type TradingPartner
} from '@/utils/platformCollaborationService'
import {
  batchSetCustomerAuditStatus,
  deleteCustomer,
  loadAndEnsureCustomerList,
  setCustomerAuditStatus,
  type CustomerMaster
} from '@/utils/customerStore'

const router = useRouter()
const tableRef = ref()
const selectedRows = ref<CustomerMaster[]>([])

const showAdvancedFilter = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)

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

const customerTypeOptions = [
  { label: '医院', value: 'hospital' },
  { label: '诊所', value: 'clinic' },
  { label: '药店', value: 'pharmacy' },
  { label: '医疗器械公司', value: 'deviceCompany' },
  { label: '其他', value: 'other' }
]

const auditStatusOptions = [
  { label: '未审核', value: 'notAudited' },
  { label: '已审核', value: 'audited' }
]

const statusOptions = [
  { label: '正常', value: 'normal' },
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
  customerType: [] as string[],
  auditStatus: [] as string[],
  status: [] as string[]
})

onMounted(() => {
  const range = getDateRange('thisMonth')
  if (range) {
    searchForm.value.dateRange = range
  }
  
  const savedForm = localStorage.getItem('customer-search-form')
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
  loadCustomerListData()
  loadCustomerCollaboration()
})

const loadCustomerListData = () => {
  tableData.value = loadAndEnsureCustomerList()
}

const saveSearchForm = () => {
  const toSave = {
    ...searchForm.value,
    showAdvancedFilter: showAdvancedFilter.value
  }
  localStorage.setItem('customer-search-form', JSON.stringify(toSave))
}

const handlePresetChange = (val: string) => {
  const range = getDateRange(val)
  if (range) {
    searchForm.value.dateRange = range
  }
  saveSearchForm()
}

watch(() => [searchForm.value.customerType, searchForm.value.auditStatus, searchForm.value.status], () => {
  saveSearchForm()
}, { deep: true })

const tableData = ref<CustomerMaster[]>([])

const customerTypeLabels: Record<string, string> = {
  hospital: '医院',
  clinic: '诊所',
  pharmacy: '药店',
  deviceCompany: '医疗器械公司',
  other: '其他'
}

const auditStatusLabels: Record<string, string> = {
  notAudited: '未审核',
  audited: '已审核'
}

const statusLabels: Record<string, { text: string; color: string }> = {
  normal: { text: '正常', color: 'success' },
  disabled: { text: '停用', color: 'danger' }
}

const { columnWidths, handleHeaderDragend } = useTableStyle('customer-list', [
  { key: 'index', label: '序号', defaultWidth: 56 },
  { key: 'select', label: '', defaultWidth: 42 },
  { key: 'id', label: '客户编号', defaultWidth: 120 },
  { key: 'name', label: '客户名称', defaultWidth: 180 },
  { key: 'contact', label: '联系人', defaultWidth: 100 },
  { key: 'phone', label: '联系电话', defaultWidth: 120 },
  { key: 'mobile', label: '手机', defaultWidth: 120 },
  { key: 'type', label: '客户类型', defaultWidth: 120 },
  { key: 'province', label: '省份', defaultWidth: 100 },
  { key: 'city', label: '城市', defaultWidth: 100 },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 100 },
  { key: 'status', label: '状态', defaultWidth: 100 },
  { key: 'collaboration', label: '平台协同', defaultWidth: 100 },
  { key: 'action', label: '操作', defaultWidth: 240 }
])

const customerPartnerKey = (name: string) => `customer:${name}`

const loadCustomerCollaboration = () => {
  const partners = getTradingPartners()
  tableData.value.forEach((row: Record<string, unknown>) => {
    if (row.collaborationEnabled === undefined) row.collaborationEnabled = true
    const p = partners.find(x => x.partnerKey === customerPartnerKey(String(row.name)))
    if (p) row.collaborationEnabled = p.collaborationEnabled !== false
  })
}

const handleCustomerCollaborationChange = (row: { name: string; collaborationEnabled: boolean }) => {
  const partner: TradingPartner = {
    partnerKey: customerPartnerKey(row.name),
    partnerType: 'customer',
    partnerName: row.name,
    platformCompanyId: 0,
    collaborationEnabled: row.collaborationEnabled
  }
  upsertTradingPartner(partner)
  ElMessage.success(row.collaborationEnabled ? '已开启平台协同' : '已关闭平台协同')
}

const handleSelectAll = (field: string, options: any[], checkValues: string[]) => {
  if (checkValues.length === options.length) {
    switch (field) {
      case 'customerType':
        searchForm.value.customerType = []
        break
      case 'auditStatus':
        searchForm.value.auditStatus = []
        break
      case 'status':
        searchForm.value.status = []
        break
    }
  } else {
    switch (field) {
      case 'customerType':
        searchForm.value.customerType = options.map(opt => opt.value)
        break
      case 'auditStatus':
        searchForm.value.auditStatus = options.map(opt => opt.value)
        break
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
          item.id,
          item.name,
          item.contact,
          item.phone,
          item.mobile,
          item.address,
          item.email
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
    
    if (searchForm.value.customerType.length > 0 && !searchForm.value.customerType.includes(item.type)) {
      return false
    }
    
    if (searchForm.value.auditStatus.length > 0 && !searchForm.value.auditStatus.includes(item.auditStatus)) {
      return false
    }
    
    if (searchForm.value.status.length > 0 && !searchForm.value.status.includes(item.status)) {
      return false
    }
    
    return true
  })
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

const handleCreate = () => {
  router.push('/data/customer/create')
}

const handleView = (id: string) => {
  router.push(`/data/customer/detail/${id}`)
}

const handleEdit = (id: string) => {
  router.push(`/data/customer/create/${id}`)
}

const handleDelete = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定删除该客户吗？删除后不可恢复。', '删除确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    if (deleteCustomer(id)) {
      loadCustomerListData()
      loadCustomerCollaboration()
      ElMessage.success('删除成功')
    } else {
      ElMessage.error('客户不存在')
    }
  } catch {
    // 用户取消
  }
}

const handleAuditToggle = async (row: CustomerMaster) => {
  const isAudited = row.auditStatus === 'audited'
  try {
    await ElMessageBox.confirm(
      isAudited ? '确定反审核该客户吗？' : '确定审核通过该客户吗？',
      isAudited ? '反审核确认' : '审核确认',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    )
    const updated = setCustomerAuditStatus(row.id, !isAudited)
    if (updated) {
      Object.assign(row, updated)
      ElMessage.success(isAudited ? '已反审核' : '审核通过')
    }
  } catch {
    // 用户取消
  }
}

const handleRowDoubleClick = (row: any) => {
  router.push(`/data/customer/detail/${row.id}`)
}

const handleCodeClick = (row: any) => {
  router.push(`/data/customer/detail/${row.id}`)
}

const handleSearch = () => {
  saveSearchForm()
  currentPage.value = 1
  ElMessage.success(`筛选条件已应用，共找到 ${filteredData.value.length} 条记录`)
}

const handleReset = () => {
  searchForm.value = {
    keyword: '',
    selectedPreset: 'thisMonth',
    dateRange: [],
    customerType: [],
    auditStatus: [],
    status: []
  }
  const range = getDateRange('thisMonth')
  if (range) {
    searchForm.value.dateRange = range
  }
}

const handleRefresh = () => {
  handleReset()
  loadCustomerListData()
  loadCustomerCollaboration()
  ElMessage.success('数据已刷新')
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
}

const handleSelectionChange = (rows: CustomerMaster[]) => {
  selectedRows.value = rows
}

const clearTableSelection = () => {
  selectedRows.value = []
  tableRef.value?.clearSelection?.()
}

const {
  canAudit,
  canBatchAudit,
  canBatchUnaudit,
  handleBatchAudit
} = usePartnerListBatchAudit(tableData, selectedRows, clearTableSelection, {
  entityLabel: '客户',
  batchSetAudit: batchSetCustomerAuditStatus
})
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
            <el-input v-model="searchForm.keyword" placeholder="客户编号/客户名称/联系人/电话/地址/邮箱" clearable style="width: 320px;" @input="saveSearchForm()" />
          </el-form-item>
        </el-form>
        <div class="button-group">
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleRefresh">刷新</el-button>
          <el-button type="primary" @click="handleCreate">新增</el-button>
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
            <span class="filter-label">客户类型：</span>
            <el-checkbox-group v-model="searchForm.customerType">
              <el-checkbox-button 
                v-for="opt in customerTypeOptions" 
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
      <el-table
        ref="tableRef"
        :data="pagedData"
        row-key="id"
        class="common-table"
        border
        :fit="true"
        @row-dblclick="handleRowDoubleClick"
        @header-dragend="handleHeaderDragend"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="index" label="序号" :index="indexMethod" :width="columnWidths.index" align="center" fixed="left" />
        <el-table-column type="selection" :width="columnWidths.select" fixed="left" />
        <el-table-column prop="id" label="客户编号" :width="columnWidths.id">
          <template #default="{ row }">
            <span class="code-link" @click="handleCodeClick(row)">
              {{ row.id }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="客户名称" :width="columnWidths.name" />
        <el-table-column prop="contact" label="联系人" :width="columnWidths.contact" />
        <el-table-column prop="phone" label="联系电话" :width="columnWidths.phone" />
        <el-table-column prop="mobile" label="手机" :width="columnWidths.mobile" />
        <el-table-column prop="type" label="客户类型" :width="columnWidths.type">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ customerTypeLabels[row.type] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="province" label="省份" :width="columnWidths.province" />
        <el-table-column prop="city" label="城市" :width="columnWidths.city" />
        
        <el-table-column label="审核状态" :width="columnWidths.auditStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.auditStatus === 'audited' ? 'success' : 'info'">
              {{ auditStatusLabels[row.auditStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" :width="columnWidths.status" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="statusLabels[row.status].color">
              {{ statusLabels[row.status].text }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="平台协同" :width="columnWidths.collaboration" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.collaborationEnabled"
              inline-prompt
              active-text="开"
              inactive-text="关"
              @change="handleCustomerCollaborationChange(row)"
            />
          </template>
        </el-table-column>
        
        <el-table-column label="操作" :width="columnWidths.action" align="center">
          <template #default="{ row }">
            <el-button type="text" size="small" @click="handleView(row.id)">查看</el-button>
            <el-button type="text" size="small" @click="handleEdit(row.id)">编辑</el-button>
            <el-button
              type="text"
              size="small"
              :class="row.auditStatus === 'audited' ? 'audit-reverse' : 'audit-pass'"
              @click="handleAuditToggle(row)"
            >{{ row.auditStatus === 'audited' ? '反审核' : '审核' }}</el-button>
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
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
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
    flex-wrap: wrap;
    align-items: center;
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
    }
    
    .el-table__row:nth-child(odd) {
      background-color: #F0F9F7;
    }
    
    .el-table__row:nth-child(even) {
      background-color: #FFFFFF;
    }
    
    .el-table__body tr:hover > td {
      background-color: #D4EDE6 !important;
    }
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