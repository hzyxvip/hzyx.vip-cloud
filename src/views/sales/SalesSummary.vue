<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import ReportBarChart from '@/components/ReportBarChart.vue'

const router = useRouter()

const selectedMonth = ref('')
const summaryData = ref({
  totalAmount: 0,
  totalOrders: 0,
  totalCustomers: 0,
  auditedOrders: 0,
  notAuditedOrders: 0,
  completedOrders: 0
})

const customerSummary = ref<Array<{ customer: string; amount: string; count: number; percentage: string; amountNum: number }>>([])
const monthlySummary = ref<Array<{ month: string; amount: string; count: number; amountNum: number }>>([])

const parseAmount = (raw: unknown): number => {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  return parseFloat(String(raw ?? '').replace(/[¥,\s]/g, '')) || 0
}

onMounted(() => {
  const now = new Date()
  selectedMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  loadSummaryData()
})

const loadSummaryData = () => {
  const allOrders = JSON.parse(localStorage.getItem('sales-orders') || '[]')
  const month = selectedMonth.value
  const orders = month
    ? allOrders.filter((o: { date?: string }) => String(o.date || '').slice(0, 7) === month)
    : allOrders

  const totalAmount = orders.reduce((sum: number, order: Record<string, unknown>) => sum + parseAmount(order.amount), 0)
  const customers = new Set(orders.map((o: Record<string, unknown>) => o.customer))

  summaryData.value = {
    totalAmount,
    totalOrders: orders.length,
    totalCustomers: customers.size,
    auditedOrders: orders.filter((o: Record<string, unknown>) => o.auditStatus === 'audited').length,
    notAuditedOrders: orders.filter((o: Record<string, unknown>) => o.auditStatus === 'notAudited').length,
    completedOrders: orders.filter((o: Record<string, unknown>) => o.closeStatus === 'closed').length
  }

  const customerMap = new Map<string, { amount: number; count: number }>()
  orders.forEach((order: Record<string, unknown>) => {
    const customer = String(order.customer || '')
    const amount = parseAmount(order.amount)
    const cur = customerMap.get(customer) || { amount: 0, count: 0 }
    cur.amount += amount
    cur.count += 1
    customerMap.set(customer, cur)
  })

  customerSummary.value = Array.from(customerMap.entries())
    .map(([customer, data]) => ({
      customer,
      amount: `¥${data.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
      amountNum: data.amount,
      count: data.count,
      percentage: totalAmount > 0 ? `${((data.amount / totalAmount) * 100).toFixed(1)}%` : '0%'
    }))
    .sort((a, b) => b.amountNum - a.amountNum)

  const monthMap = new Map<string, { amount: number; count: number }>()
  orders.forEach((order: Record<string, unknown>) => {
    const m = String(order.date || '').slice(0, 7)
    const amount = parseAmount(order.amount)
    const cur = monthMap.get(m) || { amount: 0, count: 0 }
    cur.amount += amount
    cur.count += 1
    monthMap.set(m, cur)
  })

  monthlySummary.value = Array.from(monthMap.entries())
    .map(([m, data]) => ({
      month: m,
      amount: `¥${data.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
      amountNum: data.amount,
      count: data.count
    }))
    .sort((a, b) => b.month.localeCompare(a.month))
}

const chartLabels = computed(() => customerSummary.value.slice(0, 8).map(r => r.customer))
const chartValues = computed(() => customerSummary.value.slice(0, 8).map(r => r.amountNum))

const handleMonthChange = () => {
  loadSummaryData()
  ElMessage.success(`已切换到 ${selectedMonth.value} 月的数据`)
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>销售汇总表</h1>
      <div class="header-actions">
        <el-date-picker
          v-model="selectedMonth"
          type="month"
          placeholder="选择月份"
          format="YYYY-MM"
          value-format="YYYY-MM"
          @change="handleMonthChange"
        />
        <el-button type="primary" @click="router.push('/sales/order-list')">查看订单列表</el-button>
        <el-button @click="router.push('/sales/record')">查看订单记录</el-button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card primary">
        <p class="stat-label">销售总金额</p>
        <p class="stat-value">¥{{ summaryData.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</p>
      </div>
      <div class="stat-card success">
        <p class="stat-label">销售订单数</p>
        <p class="stat-value">{{ summaryData.totalOrders }}</p>
      </div>
      <div class="stat-card warning">
        <p class="stat-label">客户数量</p>
        <p class="stat-value">{{ summaryData.totalCustomers }}</p>
      </div>
      <div class="stat-card info">
        <p class="stat-label">已审核订单</p>
        <p class="stat-value">{{ summaryData.auditedOrders }}</p>
      </div>
    </div>

    <div class="table-card chart-card">
      <div class="card-header">
        <h3>客户销售分布</h3>
      </div>
      <ReportBarChart
        v-if="chartLabels.length"
        :labels="chartLabels"
        :values="chartValues"
        color="#36B37E"
        title="Top 客户销售金额"
      />
      <el-empty v-else description="暂无销售数据" />
    </div>

    <div class="table-card">
      <div class="card-header">
        <h3>按客户汇总</h3>
      </div>
      <div class="table-scroll">
        <el-table :data="customerSummary" border class="summary-table">
          <el-table-column prop="customer" label="客户" min-width="200" />
          <el-table-column prop="amount" label="销售金额" width="150" align="right" />
          <el-table-column prop="count" label="订单数量" width="100" align="center" />
          <el-table-column prop="percentage" label="占比" width="100" align="center" />
        </el-table>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; background-color: #F5F7FA; min-height: calc(100vh - 60px); }
.page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; color: #344054; margin: 0; } }
.header-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 20px; }
.stat-card { background: #fff; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 4px solid #00bfa5; &.success { border-left-color: #67c23a; } &.warning { border-left-color: #e6a23c; } &.info { border-left-color: #909399; } .stat-label { font-size: 14px; color: #667085; margin: 0 0 8px; } .stat-value { font-size: 24px; font-weight: 700; color: #344054; margin: 0; } }
.table-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 20px; .card-header h3 { margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #344054; padding-left: 12px; border-left: 4px solid #36B37E; } }
.table-scroll { overflow-x: auto; }
.summary-table :deep(.el-table__header-wrapper th) { background: #f5f7fa; font-weight: 600; }
@media (max-width: 768px) {
  .page-container { padding: 12px; }
  .page-header { flex-direction: column; align-items: stretch; }
}
</style>
