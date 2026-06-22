<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()

const selectedMonth = ref('')
const summaryData = ref({
  totalAmount: 0,
  totalOrders: 0,
  totalSuppliers: 0,
  auditedOrders: 0,
  notAuditedOrders: 0,
  completedOrders: 0
})

const supplierSummary = ref<any[]>([])
const monthlySummary = ref<any[]>([])

onMounted(() => {
  // 设置默认月份为当前月
  const now = new Date()
  selectedMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  
  loadSummaryData()
})

const loadSummaryData = () => {
  // 从localStorage读取采购订单数据
  const orders = JSON.parse(localStorage.getItem('purchase-orders') || '[]')
  
  // 计算汇总数据
  const totalAmount = orders.reduce((sum: number, order: any) => {
    const amount = parseFloat(order.amount?.replace('¥', '').replace(',', '') || '0')
    return sum + amount
  }, 0)
  
  const suppliers = new Set(orders.map((o: any) => o.supplier))
  
  const auditedOrders = orders.filter((o: any) => o.auditStatus === 'audited').length
  const notAuditedOrders = orders.filter((o: any) => o.auditStatus === 'notAudited').length
  const completedOrders = orders.filter((o: any) => o.closeStatus === 'closed').length
  
  summaryData.value = {
    totalAmount,
    totalOrders: orders.length,
    totalSuppliers: suppliers.size,
    auditedOrders,
    notAuditedOrders,
    completedOrders
  }
  
  // 按供应商汇总
  const supplierMap = new Map<string, { amount: number; count: number }>()
  orders.forEach((order: any) => {
    const amount = parseFloat(order.amount?.replace('¥', '').replace(',', '') || '0')
    if (supplierMap.has(order.supplier)) {
      const data = supplierMap.get(order.supplier)!
      data.amount += amount
      data.count++
    } else {
      supplierMap.set(order.supplier, { amount, count: 1 })
    }
  })
  
  supplierSummary.value = Array.from(supplierMap.entries()).map(([supplier, data]) => ({
    supplier,
    amount: `¥${data.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    count: data.count,
    percentage: `${((data.amount / totalAmount) * 100).toFixed(1)}%`
  })).sort((a, b) => parseFloat(b.amount.replace('¥', '').replace(',', '')) - parseFloat(a.amount.replace('¥', '').replace(',', '')))
  
  // 按月份汇总
  const monthMap = new Map<string, { amount: number; count: number }>()
  orders.forEach((order: any) => {
    const month = order.date?.slice(0, 7) || ''
    const amount = parseFloat(order.amount?.replace('¥', '').replace(',', '') || '0')
    if (monthMap.has(month)) {
      const data = monthMap.get(month)!
      data.amount += amount
      data.count++
    } else {
      monthMap.set(month, { amount, count: 1 })
    }
  })
  
  monthlySummary.value = Array.from(monthMap.entries()).map(([month, data]) => ({
    month,
    amount: `¥${data.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    count: data.count
  })).sort((a, b) => b.month.localeCompare(a.month))
}

const handleMonthChange = () => {
  loadSummaryData()
  ElMessage.success(`已切换到 ${selectedMonth.value} 月的数据`)
}

const handleViewOrderList = () => {
  router.push('/purchase/order-list')
}

const handleViewRecord = () => {
  router.push('/purchase/record')
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>采购汇总表</h1>
      <div class="header-actions">
        <el-date-picker 
          v-model="selectedMonth" 
          type="month" 
          placeholder="选择月份" 
          format="YYYY-MM"
          value-format="YYYY-MM"
          @change="handleMonthChange"
        />
        <el-button type="primary" @click="handleViewOrderList">查看订单列表</el-button>
        <el-button @click="handleViewRecord">查看订单记录</el-button>
      </div>
    </div>
    
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card primary">
        <p class="stat-label">采购总金额</p>
        <p class="stat-value">¥{{ summaryData.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</p>
      </div>
      <div class="stat-card success">
        <p class="stat-label">采购订单数</p>
        <p class="stat-value">{{ summaryData.totalOrders }}</p>
      </div>
      <div class="stat-card warning">
        <p class="stat-label">供应商数量</p>
        <p class="stat-value">{{ summaryData.totalSuppliers }}</p>
      </div>
      <div class="stat-card info">
        <p class="stat-label">已审核订单</p>
        <p class="stat-value">{{ summaryData.auditedOrders }}</p>
      </div>
      <div class="stat-card danger">
        <p class="stat-label">未审核订单</p>
        <p class="stat-value">{{ summaryData.notAuditedOrders }}</p>
      </div>
      <div class="stat-card completed">
        <p class="stat-label">已完成订单</p>
        <p class="stat-value">{{ summaryData.completedOrders }}</p>
      </div>
    </div>
    
    <!-- 按供应商汇总 -->
    <div class="table-card">
      <div class="card-header">
        <h3>按供应商汇总</h3>
        <span class="card-desc">采购金额按供应商分布</span>
      </div>
      <el-table :data="supplierSummary" border class="summary-table">
        <el-table-column prop="supplier" label="供应商" min-width="200" />
        <el-table-column prop="amount" label="采购金额" width="150" align="right" />
        <el-table-column prop="count" label="订单数量" width="100" align="center" />
        <el-table-column prop="percentage" label="占比" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="parseFloat(row.percentage) > 30 ? 'success' : 'info'">
              {{ row.percentage }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <!-- 按月份汇总 -->
    <div class="table-card">
      <div class="card-header">
        <h3>按月份汇总</h3>
        <span class="card-desc">采购金额按月份分布</span>
      </div>
      <el-table :data="monthlySummary" border class="summary-table">
        <el-table-column prop="month" label="月份" width="120" align="center" />
        <el-table-column prop="amount" label="采购金额" width="150" align="right" />
        <el-table-column prop="count" label="订单数量" width="100" align="center" />
      </el-table>
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
  
  .header-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-left: 4px solid;
  
  &.primary { border-left-color: #00bfa5; }
  &.success { border-left-color: #67c23a; }
  &.warning { border-left-color: #e6a23c; }
  &.info { border-left-color: #909399; }
  &.danger { border-left-color: #f56c6c; }
  &.completed { border-left-color: #409eff; }
  
  .stat-label {
    font-size: 14px;
    color: #667085;
    margin: 0 0 8px;
  }
  
  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #344054;
    margin: 0;
  }
}

.table-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e4e7ed;
    
    h3 {
      font-size: 18px;
      font-weight: 600;
      color: #344054;
      margin: 0;
      padding-left: 12px;
      border-left: 4px solid #00bfa5;
    }
    
    .card-desc {
      font-size: 14px;
      color: #667085;
    }
  }
  
  .summary-table {
    :deep(.el-table__header-wrapper th) {
      background: #f5f7fa;
      color: #344054;
      font-weight: 600;
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

:deep(.el-button--primary) {
  background-color: #00bfa5 !important;
  border-color: #00bfa5 !important;
  color: #fff !important;
}
</style>