<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  buildReceivableDetailRows,
  summarizeReceivables
} from '@/utils/fundReportService'
import { formatFundAmount } from '@/utils/fundStore'

const selectedMonth = ref('')
const tableData = ref(buildReceivableDetailRows())

onMounted(() => {
  const now = new Date()
  selectedMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  refreshData()
})

const refreshData = () => {
  const month = selectedMonth.value
  tableData.value = buildReceivableDetailRows().filter(row =>
    !month || row.orderDate.slice(0, 7) === month
  )
}

watch(selectedMonth, refreshData)

const summary = computed(() => summarizeReceivables(tableData.value))

const partnerSummary = computed(() => {
  const map = new Map<string, { total: number; balance: number }>()
  tableData.value.forEach(row => {
    const cur = map.get(row.partner) || { total: 0, balance: 0 }
    cur.total += row.totalAmount
    cur.balance += row.balance
    map.set(row.partner, cur)
  })
  return Array.from(map.entries())
    .map(([partner, v]) => ({
      partner,
      total: formatFundAmount(v.total),
      balance: formatFundAmount(v.balance),
      overdue: formatFundAmount(v.balance)
    }))
    .sort((a, b) => parseFloat(b.balance.replace(/[¥,]/g, '')) - parseFloat(a.balance.replace(/[¥,]/g, '')))
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>应收款汇总表</h1>
      <el-date-picker v-model="selectedMonth" type="month" value-format="YYYY-MM" placeholder="选择月份" @change="refreshData" />
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <p>应收账款总额</p>
        <p class="value">{{ formatFundAmount(summary.totalAmount) }}</p>
      </div>
      <div class="stat-card">
        <p>未收余额</p>
        <p class="value" style="color: #ef5350;">{{ formatFundAmount(summary.totalBalance) }}</p>
      </div>
      <div class="stat-card">
        <p>涉及客户</p>
        <p class="value" style="color: #ffa726;">{{ summary.partnerCount }}</p>
      </div>
    </div>
    <div class="table-card">
      <el-table :data="partnerSummary" border>
        <el-table-column prop="partner" label="客户" min-width="180" />
        <el-table-column prop="total" label="应收总额" width="140" align="right" />
        <el-table-column prop="balance" label="未收余额" width="140" align="right" />
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 20px; }
.stat-card { background: #fff; border-radius: 12px; padding: 20px; text-align: center; .value { font-size: 24px; font-weight: 700; color: #1565c0; } }
.table-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
</style>
