<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { buildReceivableDetailRows } from '@/utils/fundReportService'
import { formatFundAmount } from '@/utils/fundStore'
import { buildFundExportFileName, exportRowsToExcel } from '@/utils/fundExcelExport'

const keyword = ref('')
const tableData = ref(buildReceivableDetailRows())

onMounted(() => {
  document.title = '应收款明细表'
  refreshData()
})

const refreshData = () => {
  tableData.value = buildReceivableDetailRows()
}

const filteredData = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return tableData.value
  return tableData.value.filter(
    row =>
      row.partner.toLowerCase().includes(kw) ||
      row.orderNo.toLowerCase().includes(kw)
  )
})

const totals = computed(() => {
  const rows = filteredData.value
  return {
    total: rows.reduce((s, r) => s + r.totalAmount, 0),
    received: rows.reduce((s, r) => s + r.receivedAmount, 0),
    balance: rows.reduce((s, r) => s + r.balance, 0)
  }
})

const handleExport = () => {
  if (!filteredData.value.length) {
    ElMessage.warning('暂无数据可导出')
    return
  }
  exportRowsToExcel(
    buildFundExportFileName('应收款明细'),
    '应收明细',
    [
      { key: 'orderNo', header: '销售订单号' },
      { key: 'partner', header: '客户' },
      { key: 'orderDate', header: '订单日期' },
      { key: 'totalDisplay', header: '订单金额' },
      { key: 'receivedDisplay', header: '已收金额' },
      { key: 'balanceDisplay', header: '应收余额' }
    ],
    filteredData.value.map(row => ({
      ...row,
      paymentStatus: row.balance <= 0 ? '已结清' : '未结清'
    })) as unknown as Record<string, unknown>[]
  )
  ElMessage.success('导出成功')
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>应收款明细表</h1>
      <div class="actions">
        <el-input v-model="keyword" placeholder="客户/订单号" clearable style="width: 220px" />
        <el-button @click="refreshData">刷新</el-button>
        <el-button type="primary" @click="handleExport">导出</el-button>
      </div>
    </div>

    <div class="summary-cards">
      <div class="card">应收合计：<strong>{{ formatFundAmount(totals.total) }}</strong></div>
      <div class="card">已收合计：<strong>{{ formatFundAmount(totals.received) }}</strong></div>
      <div class="card warn">余额合计：<strong>{{ formatFundAmount(totals.balance) }}</strong></div>
    </div>

    <div class="table-card">
      <el-table :data="filteredData" border>
        <el-table-column prop="orderNo" label="销售订单号" min-width="150" />
        <el-table-column prop="partner" label="客户" min-width="160" />
        <el-table-column prop="orderDate" label="订单日期" width="120" />
        <el-table-column prop="totalDisplay" label="订单金额" width="120" align="right" />
        <el-table-column prop="receivedDisplay" label="已收金额" width="120" align="right" />
        <el-table-column prop="balanceDisplay" label="应收余额" width="120" align="right" />
        <el-table-column label="收款状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.balance <= 0 ? 'success' : 'warning'">
              {{ row.balance <= 0 ? '已结清' : '未结清' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header {
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
  margin-bottom: 16px;
  h1 { font-size: 22px; font-weight: 600; margin: 0; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; }
}
.summary-cards {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px;
  .card { background: #fff; padding: 14px 16px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .warn strong { color: #e6a23c; }
}
.table-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
}
</style>
