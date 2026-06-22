<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh, Wallet, DataAnalysis, Money } from '@element-plus/icons-vue'
import { useTableStyle } from '@/composables/useTableStyle'
import { ElMessage } from 'element-plus'

const router = useRouter()

// 筛选条件开关（默认隐藏高级筛选）
const showAdvancedFilter = ref(false)

// 时间预设选项
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

// 收支类型选项
const fundTypeOptions = [
  { label: '收款', value: 'receipt' },
  { label: '付款', value: 'payment' },
  { label: '预收款', value: 'preReceipt' },
  { label: '预付款', value: 'prePayment' },
  { label: '其他收入', value: 'otherIncome' },
  { label: '其他支出', value: 'otherExpense' }
]

// 审核状态选项
const auditStatusOptions = [
  { label: '未审核', value: 'notAudited' },
  { label: '已审核', value: 'audited' }
]

// 核销状态选项
const verifyStatusOptions = [
  { label: '未核销', value: 'notVerified' },
  { label: '部分核销', value: 'partiallyVerified' },
  { label: '已核销', value: 'verified' }
]

// 结算方式选项
const settlementTypeOptions = [
  { label: '现金', value: 'cash' },
  { label: '银行转账', value: 'bank' },
  { label: '支票', value: 'check' },
  { label: '汇票', value: 'draft' },
  { label: '第三方支付', value: 'thirdParty' }
]

// 计算日期范围的函数
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
  // 多选筛选条件
  fundType: [] as string[],
  auditStatus: [] as string[],
  verifyStatus: [] as string[],
  settlementType: [] as string[]
})

// 初始化默认时间段（当月）
onMounted(() => {
  // 设置文档名称
  document.title = '资金管理'

  const range = getDateRange('thisMonth')
  if (range) {
    searchForm.value.dateRange = range
  }
  
  // 尝试从 localStorage 加载保存的搜索条件
  const savedForm = localStorage.getItem('fund-list-search-form')
  if (savedForm) {
    try {
      const parsed = JSON.parse(savedForm)
      Object.assign(searchForm.value, parsed)
      
      // 将字符串日期转换为 Date 对象
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

// 保存搜索条件到 localStorage
const saveSearchForm = () => {
  const toSave = {
    ...searchForm.value,
    showAdvancedFilter: showAdvancedFilter.value
  }
  localStorage.setItem('fund-list-search-form', JSON.stringify(toSave))
}

// 监听预设变化
const handlePresetChange = (val: string) => {
  const range = getDateRange(val)
  if (range) {
    searchForm.value.dateRange = range
  }
  saveSearchForm()
}

// 监听高级筛选条件变化
watch(() => [searchForm.value.fundType, searchForm.value.auditStatus, searchForm.value.verifyStatus, searchForm.value.settlementType], () => {
  saveSearchForm()
}, { deep: true })

const tableData = ref([
  { 
    id: 'RC202606001', 
    type: 'receipt',
    typeName: '收款',
    customer: '北京协和医院', 
    account: '工行北京分行',
    date: '2026-06-15', 
    amount: '¥28,800',
    verifiedAmount: '¥20,000',
    unverifiedAmount: '¥8,800',
    auditStatus: 'audited',
    verifyStatus: 'partiallyVerified',
    settlementType: 'bank',
    creator: '张三',
    auditor: '李四',
    remark: '医疗器械采购款'
  },
  { 
    id: 'RC202606002', 
    type: 'receipt',
    typeName: '收款',
    customer: '上海华山医院', 
    account: '建行上海支行',
    date: '2026-06-14', 
    amount: '¥45,600',
    verifiedAmount: '¥45,600',
    unverifiedAmount: '¥0',
    auditStatus: 'audited',
    verifyStatus: 'verified',
    settlementType: 'bank',
    creator: '张三',
    auditor: '李四',
    remark: '设备维护费'
  },
  { 
    id: 'PD202606001', 
    type: 'payment',
    typeName: '付款',
    customer: '深圳医疗器械有限公司', 
    account: '招行深圳分行',
    date: '2026-06-13', 
    amount: '¥35,000',
    verifiedAmount: '¥35,000',
    unverifiedAmount: '¥0',
    auditStatus: 'audited',
    verifyStatus: 'verified',
    settlementType: 'bank',
    creator: '王五',
    auditor: '赵六',
    remark: '采购货款'
  },
  { 
    id: 'PR202606001', 
    type: 'preReceipt',
    typeName: '预收款',
    customer: '广州中山医院', 
    account: '工行广州分行',
    date: '2026-06-12', 
    amount: '¥50,000',
    verifiedAmount: '¥0',
    unverifiedAmount: '¥50,000',
    auditStatus: 'notAudited',
    verifyStatus: 'notVerified',
    settlementType: 'bank',
    creator: '张三',
    auditor: '',
    remark: '预收货款'
  },
  { 
    id: 'PP202606001', 
    type: 'prePayment',
    typeName: '预付款',
    customer: '杭州医疗设备厂', 
    account: '农行杭州分行',
    date: '2026-06-11', 
    amount: '¥20,000',
    verifiedAmount: '¥0',
    unverifiedAmount: '¥20,000',
    auditStatus: 'audited',
    verifyStatus: 'notVerified',
    settlementType: 'bank',
    creator: '王五',
    auditor: '赵六',
    remark: '预付设备款'
  },
  { 
    id: 'OI202606001', 
    type: 'otherIncome',
    typeName: '其他收入',
    customer: '其他', 
    account: '现金',
    date: '2026-06-10', 
    amount: '¥1,500',
    verifiedAmount: '¥1,500',
    unverifiedAmount: '¥0',
    auditStatus: 'audited',
    verifyStatus: 'verified',
    settlementType: 'cash',
    creator: '张三',
    auditor: '李四',
    remark: '利息收入'
  },
  { 
    id: 'OE202606001', 
    type: 'otherExpense',
    typeName: '其他支出',
    customer: '其他', 
    account: '现金',
    date: '2026-06-09', 
    amount: '¥800',
    verifiedAmount: '¥800',
    unverifiedAmount: '¥0',
    auditStatus: 'audited',
    verifyStatus: 'verified',
    settlementType: 'cash',
    creator: '王五',
    auditor: '赵六',
    remark: '办公费用'
  }
])

// 状态显示标签映射
const auditStatusLabels: Record<string, string> = {
  notAudited: '未审核',
  audited: '已审核'
}

const verifyStatusLabels: Record<string, string> = {
  notVerified: '未核销',
  partiallyVerified: '部分核销',
  verified: '已核销'
}

const settlementTypeLabels: Record<string, string> = {
  cash: '现金',
  bank: '银行转账',
  check: '支票',
  draft: '汇票',
  thirdParty: '第三方支付'
}

const fundTypeLabels: Record<string, string> = {
  receipt: '收款',
  payment: '付款',
  preReceipt: '预收款',
  prePayment: '预付款',
  otherIncome: '其他收入',
  otherExpense: '其他支出'
}

const { columnWidths, handleHeaderDragend } = useTableStyle('fund-list', [
  { key: 'id', label: '单据号', defaultWidth: 140 },
  { key: 'typeName', label: '收支类型', defaultWidth: 100 },
  { key: 'customer', label: '往来单位', defaultWidth: 160 },
  { key: 'account', label: '结算账户', defaultWidth: 140 },
  { key: 'date', label: '日期', defaultWidth: 120 },
  { key: 'amount', label: '金额', defaultWidth: 120 },
  { key: 'verifiedAmount', label: '已核销金额', defaultWidth: 120 },
  { key: 'unverifiedAmount', label: '未核销金额', defaultWidth: 120 },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 100 },
  { key: 'verifyStatus', label: '核销状态', defaultWidth: 100 },
  { key: 'settlementType', label: '结算方式', defaultWidth: 100 },
  { key: 'creator', label: '制单人', defaultWidth: 100 },
  { key: 'auditor', label: '审核人', defaultWidth: 100 },
  { key: 'action', label: '操作', defaultWidth: 180 }
])

// 全选处理
const handleSelectAll = (field: string, options: any[], checkValues: string[]) => {
  if (checkValues.length === options.length) {
    // 如果已经全选，则清空
    switch (field) {
      case 'fundType':
        searchForm.value.fundType = []
        break
      case 'auditStatus':
        searchForm.value.auditStatus = []
        break
      case 'verifyStatus':
        searchForm.value.verifyStatus = []
        break
      case 'settlementType':
        searchForm.value.settlementType = []
        break
    }
  } else {
    // 如果没有全选，则全选
    switch (field) {
      case 'fundType':
        searchForm.value.fundType = options.map(opt => opt.value)
        break
      case 'auditStatus':
        searchForm.value.auditStatus = options.map(opt => opt.value)
        break
      case 'verifyStatus':
        searchForm.value.verifyStatus = options.map(opt => opt.value)
        break
      case 'settlementType':
        searchForm.value.settlementType = options.map(opt => opt.value)
        break
    }
  }
}

// 筛选后的数据
const filteredData = computed(() => {
  return tableData.value.filter(item => {
    // 关键词筛选（支持多个关键词空格分隔，每个关键词需匹配至少一个字段）
    if (searchForm.value.keyword) {
      const keywords = searchForm.value.keyword.trim().split(/\s+/).filter(k => k)
      if (keywords.length > 0) {
        const matchFields = [
          item.customer,        // 往来单位
          item.creator || '',  // 制单人
          item.auditor || '',  // 审核人
          item.remark || ''    // 备注
        ]
        // 每个关键词都需要匹配至少一个字段
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
    
    // 日期范围筛选
    if (searchForm.value.dateRange.length === 2) {
      const itemDate = new Date(item.date)
      const [startDate, endDate] = searchForm.value.dateRange
      if (itemDate < startDate || itemDate > endDate) {
        return false
      }
    }
    
    // 收支类型筛选
    if (searchForm.value.fundType.length > 0 && !searchForm.value.fundType.includes(item.type)) {
      return false
    }
    
    // 审核状态筛选
    if (searchForm.value.auditStatus.length > 0 && !searchForm.value.auditStatus.includes(item.auditStatus)) {
      return false
    }
    
    // 核销状态筛选
    if (searchForm.value.verifyStatus.length > 0 && !searchForm.value.verifyStatus.includes(item.verifyStatus)) {
      return false
    }
    
    // 结算方式筛选
    if (searchForm.value.settlementType.length > 0 && !searchForm.value.settlementType.includes(item.settlementType)) {
      return false
    }
    
    return true
  })
})

// 跳转到对应模块
const navigateToModule = (type: string) => {
  switch (type) {
    case 'receipt':
      router.push('/fund/receipt')
      break
    case 'payment':
      router.push('/fund/pay')
      break
    case 'preReceipt':
      router.push('/fund/pre-receipt')
      break
    case 'prePayment':
      router.push('/fund/pre-payment')
      break
    case 'otherIncome':
      router.push('/fund/other-income')
      break
    case 'otherExpense':
      router.push('/fund/other-expense')
      break
    default:
      router.push('/fund')
  }
}

const handleView = (row: any) => {
  navigateToModule(row.type)
}

const handleEdit = (row: any) => {
  navigateToModule(row.type)
}

const handleDelete = (id: string) => {
}

const handleRowDoubleClick = (row: any) => {
  navigateToModule(row.type)
}

const handleOrderNoClick = (row: any) => {
  navigateToModule(row.type)
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
    fundType: [],
    auditStatus: [],
    verifyStatus: [],
    settlementType: []
  }
  // 重置时恢复默认时间段（当月）
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
      <!-- 第一行：基础搜索条件 + 操作按钮 -->
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
            <el-input v-model="searchForm.keyword" placeholder="往来单位/制单人/审核人/备注" clearable style="width: 260px;" @input="saveSearchForm()" />
          </el-form-item>
        </el-form>
        <div class="button-group">
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleRefresh">刷新</el-button>
          <el-button 
            :type="showAdvancedFilter ? 'success' : 'default'" 
            @click="showAdvancedFilter = !showAdvancedFilter; saveSearchForm()"
          >
            {{ showAdvancedFilter ? '隐藏筛选' : '高级筛选' }}
          </el-button>
        </div>
      </div>

      <!-- 高级筛选条件（可隐藏） -->
      <div class="search-advanced" v-show="showAdvancedFilter">
        <div class="filter-row">
          <div class="filter-item">
            <span class="filter-label">收支类型：</span>
            <el-checkbox-group v-model="searchForm.fundType">
              <el-checkbox-button 
                v-for="opt in fundTypeOptions" 
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
            <span class="filter-label">核销状态：</span>
            <el-checkbox-group v-model="searchForm.verifyStatus">
              <el-checkbox-button 
                v-for="opt in verifyStatusOptions" 
                :key="opt.value" 
                :value="opt.value"
              >
                {{ opt.label }}
              </el-checkbox-button>
            </el-checkbox-group>
          </div>
        </div>
        
        <div class="filter-row">
          <div class="filter-item">
            <span class="filter-label">结算方式：</span>
            <el-checkbox-group v-model="searchForm.settlementType">
              <el-checkbox-button 
                v-for="opt in settlementTypeOptions" 
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

    <!-- 快捷入口卡片 -->
    <div class="quick-entry-card">
      <div class="quick-entry-title">资金管理快捷入口</div>
      <div class="quick-entry-grid">
        <div class="quick-entry-item" @click="router.push('/fund/receivable')">
          <div class="quick-entry-icon receipt">
            <el-icon><Wallet /></el-icon>
          </div>
          <div class="quick-entry-text">
            <div class="quick-entry-label">应收管理</div>
            <div class="quick-entry-desc">应收账款、收款单、退款</div>
          </div>
        </div>
        <div class="quick-entry-item" @click="router.push('/fund/payment')">
          <div class="quick-entry-icon payment">
            <el-icon><Wallet /></el-icon>
          </div>
          <div class="quick-entry-text">
            <div class="quick-entry-label">应付管理</div>
            <div class="quick-entry-desc">应付账款、付款单、退款</div>
          </div>
        </div>
        <div class="quick-entry-item" @click="router.push('/fund/report')">
          <div class="quick-entry-icon report">
            <el-icon><DataAnalysis /></el-icon>
          </div>
          <div class="quick-entry-text">
            <div class="quick-entry-label">资金报表</div>
            <div class="quick-entry-desc">应收应付明细、汇总、预警</div>
          </div>
        </div>
        <div class="quick-entry-item" @click="router.push('/fund/other-income')">
          <div class="quick-entry-icon other">
            <el-icon><Money /></el-icon>
          </div>
          <div class="quick-entry-text">
            <div class="quick-entry-label">其他收支</div>
            <div class="quick-entry-desc">其他收入、其他支出</div>
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
        <el-table-column prop="typeName" label="收支类型" :width="columnWidths.typeName" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.type === 'receipt' || row.type === 'preReceipt' || row.type === 'otherIncome' ? 'success' : 'danger'">
              {{ row.typeName }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="customer" label="往来单位" :width="columnWidths.customer" />
        <el-table-column prop="account" label="结算账户" :width="columnWidths.account" />
        <el-table-column prop="date" label="日期" :width="columnWidths.date" />
        <el-table-column prop="amount" label="金额" :width="columnWidths.amount" align="right">
          <template #default="{ row }">
            <span :class="row.type === 'receipt' || row.type === 'preReceipt' || row.type === 'otherIncome' ? 'amount-income' : 'amount-expense'">
              {{ row.amount }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="verifiedAmount" label="已核销金额" :width="columnWidths.verifiedAmount" align="right" />
        <el-table-column prop="unverifiedAmount" label="未核销金额" :width="columnWidths.unverifiedAmount" align="right" />
        
        <el-table-column label="审核状态" :width="columnWidths.auditStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.auditStatus === 'audited' ? 'success' : 'info'">
              {{ auditStatusLabels[row.auditStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="核销状态" :width="columnWidths.verifyStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.verifyStatus === 'verified' ? 'success' : (row.verifyStatus === 'partiallyVerified' ? 'warning' : 'info')">
              {{ verifyStatusLabels[row.verifyStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="settlementType" label="结算方式" :width="columnWidths.settlementType" align="center">
          <template #default="{ row }">
            {{ settlementTypeLabels[row.settlementType] }}
          </template>
        </el-table-column>
        
        <el-table-column prop="creator" label="制单人" :width="columnWidths.creator" />
        <el-table-column prop="auditor" label="审核人" :width="columnWidths.auditor" />
        
        <el-table-column label="操作" :width="columnWidths.action" align="center">
          <template #default="{ row }">
            <el-button type="text" size="small" @click="handleView(row)">查看</el-button>
            <el-button type="text" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="text" size="small" @click="handleDelete(row.id)" :disabled="row.auditStatus === 'audited'">删除</el-button>
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
    }
  }

  .button-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .search-advanced {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed #e4e7ed;
    
    .filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 12px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
    
    .filter-item {
      display: flex;
      align-items: center;
      
      .filter-label {
        font-size: 14px;
        color: #606266;
        margin-right: 8px;
        white-space: nowrap;
      }
      
      :deep(.el-checkbox-group) {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      
      :deep(.el-checkbox-button) {
        .el-checkbox-button__inner {
          border-radius: 4px;
        }
      }
    }
  }
}

.quick-entry-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  
  .quick-entry-title {
    font-size: 16px;
    font-weight: 600;
    color: #344054;
    margin-bottom: 16px;
  }
  
  .quick-entry-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  
  .quick-entry-item {
    display: flex;
    align-items: center;
    padding: 16px;
    background: #F5F7FA;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
    
    &:hover {
      background: #E4E7ED;
      transform: translateY(-2px);
    }
    
    .quick-entry-icon {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      font-size: 24px;
      
      &.receipt {
        background: #E6F7F1;
        color: #67C23A;
      }
      
      &.payment {
        background: #FDF0F0;
        color: #F56C6C;
      }
      
      &.report {
        background: #EDF2FE;
        color: #409EFF;
      }
      
      &.other {
        background: #FDF6EC;
        color: #E6A23C;
      }
    }
    
    .quick-entry-text {
      .quick-entry-label {
        font-size: 14px;
        font-weight: 600;
        color: #344054;
        margin-bottom: 4px;
      }
      
      .quick-entry-desc {
        font-size: 12px;
        color: #8592A3;
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
    .el-table__header-wrapper th {
      background: #f5f7fa;
      color: #344054;
      font-weight: 600;
      text-align: center !important;
    }
    
    .code-link {
      color: #409EFF;
      cursor: pointer;
      
      &:hover {
        text-decoration: underline;
      }
    }
    
    .amount-income {
      color: #67C23A;
      font-weight: 500;
    }
    
    .amount-expense {
      color: #F56C6C;
      font-weight: 500;

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
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}

@media (max-width: 1200px) {
  .quick-entry-card {
    .quick-entry-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
}

@media (max-width: 768px) {
  .quick-entry-card {
    .quick-entry-grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
