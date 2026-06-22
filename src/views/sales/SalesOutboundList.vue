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

const confirmOptions = [
  { label: '是', value: 'confirmed' },
  { label: '否', value: 'notConfirmed' }
]

const auditOptions = [
  { label: '是', value: 'audited' },
  { label: '否', value: 'notAudited' }
]

const paymentOptions = [
  { label: '已收款', value: 'received' },
  { label: '未收款', value: 'notReceived' }
]

const signOptions = [
  { label: '已签收', value: 'signed' },
  { label: '未签收', value: 'notSigned' }
]

const paymentStatusLabels: Record<string, string> = {
  received: '已收款',
  notReceived: '未收款',
  paid: '已收款',
  notPaid: '未收款'
}

const signStatusLabels: Record<string, string> = {
  signed: '已签收',
  notSigned: '未签收'
}

const resolvePaymentStatusKey = (row: Record<string, unknown>) => {
  const status = row.paymentStatus
  if (!status) return 'notReceived'
  const value = String(status)
  if (value === 'received' || value === 'paid' || value === '已收款') return 'received'
  return 'notReceived'
}

const resolveSignStatusKey = (row: Record<string, unknown>) => {
  const status = row.signStatus
  if (!status) return 'notSigned'
  const value = String(status)
  if (value === 'signed' || value === '已签收') return 'signed'
  return 'notSigned'
}

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
  confirmStatus: [] as string[],
  auditStatus: [] as string[],
  paymentStatus: [] as string[],
  signStatus: [] as string[],
  salesOrderNo: '',
  outboundNo: ''
})

onMounted(() => {
  const range = getDateRange('thisMonth')
  if (range) {
    searchForm.value.dateRange = range
  }
  
  const savedForm = localStorage.getItem('sales-outbound-search-form')
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
  localStorage.setItem('sales-outbound-search-form', JSON.stringify(toSave))
}

const handlePresetChange = (val: string) => {
  const range = getDateRange(val)
  if (range) {
    searchForm.value.dateRange = range
  }
  saveSearchForm()
}

watch(() => [searchForm.value.confirmStatus, searchForm.value.auditStatus, searchForm.value.paymentStatus, searchForm.value.signStatus], () => {
  saveSearchForm()
}, { deep: true })

const tableData = ref([
  { 
    id: 'XH-20260618-0020', 
    customer: '金华市华厦医疗器材有限公司', 
    customerCode: 'GX01014',
    outboundDate: '2026-06-18', 
    amount: '¥900', 
    creator: '胡素琴',
    createDate: '2026-06-18',
    createTime: '19:10:13',
    confirmDate: '2026-06-18',
    confirmPerson: '胡素琴',
    auditDate: '2026-06-18',
    auditPerson: '胡素琴',
    salesOrder: 'DD-20260618-0020',
    inspectionDoc: '',
    signStatus: 'notSigned',
    confirmStatus: 'confirmed',
    auditStatus: 'audited',
    paymentStatus: 'notReceived'
  },
  { 
    id: 'XH-20260618-0019', 
    customer: '宁波市镇海国威医疗器材有限公司', 
    customerCode: 'GX00970',
    outboundDate: '2026-06-18', 
    amount: '¥2,200', 
    creator: '胡素琴',
    createDate: '2026-06-18',
    createTime: '19:08:01',
    confirmDate: '2026-06-18',
    confirmPerson: '胡素琴',
    auditDate: '2026-06-18',
    auditPerson: '胡素琴',
    salesOrder: 'DD-20260618-0019',
    inspectionDoc: '',
    signStatus: 'notSigned',
    confirmStatus: 'confirmed',
    auditStatus: 'audited',
    paymentStatus: 'notReceived'
  },
  { 
    id: 'XH-20260618-0018', 
    customer: '宁波天工医疗器械有限公司', 
    customerCode: 'GX00947',
    outboundDate: '2026-06-18', 
    amount: '¥6,670', 
    creator: '胡素琴',
    createDate: '2026-06-18',
    createTime: '19:03:26',
    confirmDate: '2026-06-18',
    confirmPerson: '胡素琴',
    auditDate: '2026-06-18',
    auditPerson: '胡素琴',
    salesOrder: 'DD-20260618-0018',
    inspectionDoc: '',
    signStatus: 'notSigned',
    confirmStatus: 'confirmed',
    auditStatus: 'audited',
    paymentStatus: 'notReceived'
  },
  { 
    id: 'XH-20260617-0017', 
    customer: '温州市康达医疗器械有限公司', 
    customerCode: 'GX00856',
    outboundDate: '2026-06-17', 
    amount: '¥3,500', 
    creator: '王小明',
    createDate: '2026-06-17',
    createTime: '14:22:35',
    confirmDate: '2026-06-17',
    confirmPerson: '王小明',
    auditDate: '2026-06-17',
    auditPerson: '王小明',
    salesOrder: 'DD-20260617-0017',
    inspectionDoc: '',
    signStatus: 'signed',
    confirmStatus: 'confirmed',
    auditStatus: 'audited',
    paymentStatus: 'received'
  },
  { 
    id: 'XH-20260616-0016', 
    customer: '绍兴市医疗器械厂', 
    customerCode: 'GX00789',
    outboundDate: '2026-06-16', 
    amount: '¥8,900', 
    creator: '李小红',
    createDate: '2026-06-16',
    createTime: '10:15:42',
    confirmDate: '',
    confirmPerson: '',
    auditDate: '',
    auditPerson: '',
    salesOrder: 'DD-20260616-0016',
    inspectionDoc: '',
    signStatus: 'notSigned',
    confirmStatus: 'notConfirmed',
    auditStatus: 'notAudited',
    paymentStatus: 'notReceived'
  },
  { 
    id: 'XH-20260615-0015', 
    customer: '嘉兴市医疗器械有限公司', 
    customerCode: 'GX00723',
    outboundDate: '2026-06-15', 
    amount: '¥12,500', 
    creator: '张伟',
    createDate: '2026-06-15',
    createTime: '16:45:18',
    confirmDate: '2026-06-15',
    confirmPerson: '张伟',
    auditDate: '2026-06-15',
    auditPerson: '张伟',
    salesOrder: 'DD-20260615-0015',
    inspectionDoc: '',
    signStatus: 'signed',
    confirmStatus: 'confirmed',
    auditStatus: 'audited',
    paymentStatus: 'received'
  }
])

const filteredData = computed(() => {
  return tableData.value.filter(item => {
    if (searchForm.value.keyword) {
      const keywords = searchForm.value.keyword.trim().split(/\s+/).filter(k => k)
      if (keywords.length > 0) {
        const matchFields = [
          item.customer,
          item.creator,
          item.confirmPerson || '',
          item.auditPerson || '',
          item.salesOrder,
          item.id
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
      const itemDate = new Date(item.outboundDate)
      const [startDate, endDate] = searchForm.value.dateRange
      if (itemDate < startDate || itemDate > endDate) {
        return false
      }
    }
    
    if (searchForm.value.salesOrderNo && !item.salesOrder.includes(searchForm.value.salesOrderNo)) {
      return false
    }
    
    if (searchForm.value.outboundNo && !item.id.includes(searchForm.value.outboundNo)) {
      return false
    }
    
    if (searchForm.value.confirmStatus.length > 0 && !searchForm.value.confirmStatus.includes(item.confirmStatus)) {
      return false
    }
    
    if (searchForm.value.auditStatus.length > 0 && !searchForm.value.auditStatus.includes(item.auditStatus)) {
      return false
    }
    
    if (searchForm.value.paymentStatus.length > 0 && !searchForm.value.paymentStatus.includes(resolvePaymentStatusKey(item))) {
      return false
    }
    
    if (searchForm.value.signStatus.length > 0 && !searchForm.value.signStatus.includes(resolveSignStatusKey(item))) {
      return false
    }
    
    return true
  })
})

const { columnWidths, handleHeaderDragend } = useTableStyle('sales-outbound', [
  { key: 'select', label: '', defaultWidth: 50 },
  { key: 'confirmStatus', label: '确认', defaultWidth: 60 },
  { key: 'auditStatus', label: '审核', defaultWidth: 60 },
  { key: 'id', label: '销货单号', defaultWidth: 180 },
  { key: 'customer', label: '交易客户', defaultWidth: 200 },
  { key: 'outboundDate', label: '销货日期', defaultWidth: 100 },
  { key: 'amount', label: '销售金额', defaultWidth: 100 },
  { key: 'creator', label: '开单人员', defaultWidth: 80 },
  { key: 'createDate', label: '创建日期', defaultWidth: 100 },
  { key: 'createTime', label: '创建时间', defaultWidth: 80 },
  { key: 'confirmDate', label: '确认日期', defaultWidth: 100 },
  { key: 'confirmPerson', label: '确认人员', defaultWidth: 80 },
  { key: 'auditDate', label: '审核日期', defaultWidth: 100 },
  { key: 'auditPerson', label: '审核人员', defaultWidth: 80 },
  { key: 'salesOrder', label: '销售订单', defaultWidth: 160 },
  { key: 'inspectionDoc', label: '对方验收单', defaultWidth: 120 },
  { key: 'signStatus', label: '签收状态', defaultWidth: 90 },
  { key: 'paymentStatus', label: '收款状态', defaultWidth: 90 },
  { key: 'action', label: '操作', defaultWidth: 120 }
])

const handleCreate = () => {
  router.push('/sales/outbound')
}

const handleView = (_id: string) => {
  router.push('/sales/outbound')
}

const handleEdit = (_id: string) => {
  router.push('/sales/outbound')
}

const handleDelete = (_id: string) => {
}

const handleRowDoubleClick = (_row: any) => {
  router.push('/sales/outbound')
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
    confirmStatus: [],
    auditStatus: [],
    paymentStatus: [],
    signStatus: [],
    salesOrderNo: '',
    outboundNo: ''
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
          <el-form-item label="销货日期">
            <el-select v-model="searchForm.selectedPreset" placeholder="选择时间段" clearable style="width: 100px;" @change="handlePresetChange">
              <el-option v-for="preset in timePresets" :key="preset.value" :label="preset.label" :value="preset.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-date-picker v-model="searchForm.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 240px;" @change="saveSearchForm()" />
          </el-form-item>
          <el-form-item class="keyword-input">
            <el-input v-model="searchForm.keyword" placeholder="客户名称/拼音/开单人员/销售订单/销货单号" clearable style="width: 300px;" @input="saveSearchForm()" />
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
            <span class="filter-label">确认：</span>
            <el-checkbox-group v-model="searchForm.confirmStatus">
              <el-checkbox-button v-for="opt in confirmOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</el-checkbox-button>
            </el-checkbox-group>
          </div>
          <div class="filter-item">
            <span class="filter-label">审核：</span>
            <el-checkbox-group v-model="searchForm.auditStatus">
              <el-checkbox-button v-for="opt in auditOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</el-checkbox-button>
            </el-checkbox-group>
          </div>
          <div class="filter-item">
            <span class="filter-label">收款状态：</span>
            <el-checkbox-group v-model="searchForm.paymentStatus">
              <el-checkbox-button v-for="opt in paymentOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</el-checkbox-button>
            </el-checkbox-group>
          </div>
          <div class="filter-item">
            <span class="filter-label">签收状态：</span>
            <el-checkbox-group v-model="searchForm.signStatus">
              <el-checkbox-button v-for="opt in signOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</el-checkbox-button>
            </el-checkbox-group>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-item">
            <span class="filter-label">销售订单：</span>
            <el-input v-model="searchForm.salesOrderNo" placeholder="输入销售订单号" clearable style="width: 200px;" @input="saveSearchForm()" />
          </div>
          <div class="filter-item">
            <span class="filter-label">销货单号：</span>
            <el-input v-model="searchForm.outboundNo" placeholder="输入销货单号" clearable style="width: 200px;" @input="saveSearchForm()" />
          </div>
        </div>
      </div>
    </div>

    <div class="table-card">
      <el-table :data="filteredData" class="common-table" border :fit="true" @header-dragend="handleHeaderDragend" @row-dblclick="handleRowDoubleClick">
        <el-table-column type="selection" :width="columnWidths.select" />
        <el-table-column label="确认" :width="columnWidths.confirmStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.confirmStatus === 'confirmed' ? 'success' : 'info'">
              {{ row.confirmStatus === 'confirmed' ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核" :width="columnWidths.auditStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.auditStatus === 'audited' ? 'success' : 'info'">
              {{ row.auditStatus === 'audited' ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="id" label="销货单号" :width="columnWidths.id">
          <template #default="{ row }">
            <span class="code-link" @click="handleView(row.id)">{{ row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="customer" label="交易客户" :width="columnWidths.customer" />
        <el-table-column prop="outboundDate" label="销货日期" :width="columnWidths.outboundDate" />
        <el-table-column prop="amount" label="销售金额" :width="columnWidths.amount" />
        <el-table-column prop="creator" label="开单人员" :width="columnWidths.creator" />
        <el-table-column prop="createDate" label="创建日期" :width="columnWidths.createDate" />
        <el-table-column prop="createTime" label="创建时间" :width="columnWidths.createTime" />
        <el-table-column prop="confirmDate" label="确认日期" :width="columnWidths.confirmDate" />
        <el-table-column prop="confirmPerson" label="确认人员" :width="columnWidths.confirmPerson" />
        <el-table-column prop="auditDate" label="审核日期" :width="columnWidths.auditDate" />
        <el-table-column prop="auditPerson" label="审核人员" :width="columnWidths.auditPerson" />
        <el-table-column prop="salesOrder" label="销售订单" :width="columnWidths.salesOrder" />
        <el-table-column prop="inspectionDoc" label="对方验收单" :width="columnWidths.inspectionDoc" />
        <el-table-column label="签收状态" :width="columnWidths.signStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="resolveSignStatusKey(row) === 'signed' ? 'success' : 'warning'">
              {{ signStatusLabels[resolveSignStatusKey(row)] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="收款状态" :width="columnWidths.paymentStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="resolvePaymentStatusKey(row) === 'received' ? 'success' : 'warning'">
              {{ paymentStatusLabels[resolvePaymentStatusKey(row)] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" :width="columnWidths.action" align="center">
          <template #default="{ row }">
            <el-button type="text" size="small" @click="handleView(row.id)">查看</el-button>
            <el-button type="text" size="small" @click="handleEdit(row.id)">编辑</el-button>
            <el-button type="text" size="small" @click="handleDelete(row.id)" :disabled="row.confirmStatus === 'confirmed'">删除</el-button>
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

  .search-row :deep(.keyword-input .el-input__wrapper) {
    border-radius: 0 !important;
    border: none !important;
    border-bottom: 1px solid #e4e7ed !important;
    box-shadow: none !important;
    background-color: transparent !important;
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
    background-color: #fff;
  }
  
  :deep(.el-table__row:nth-child(even)) {
    background-color: #fafafa;
  }
  
  :deep(.el-table__body tr:hover > td) {
    background-color: #f0f9ff !important;
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
