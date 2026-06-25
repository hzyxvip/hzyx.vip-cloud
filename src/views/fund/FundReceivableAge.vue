<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { buildReceivableAgeRows } from '@/utils/fundReportService'
import { formatFundAmount } from '@/utils/fundStore'
import { buildFundExportFileName, exportRowsToExcel } from '@/utils/fundExcelExport'

const tableData = ref(buildReceivableAgeRows())

onMounted(() => {
  document.title = '应收账款账龄表'
  refreshData()
})

const refreshData = () => {
  tableData.value = buildReceivableAgeRows()
}

const totals = computed(() => {
  const rows = tableData.value
  return {
    total: rows.reduce((s, r) => s + r.total, 0),
    age0_30: rows.reduce((s, r) => s + r.age0_30, 0),
    age31_60: rows.reduce((s, r) => s + r.age31_60, 0),
    age61_90: rows.reduce((s, r) => s + r.age61_90, 0),
    age90Plus: rows.reduce((s, r) => s + r.age90Plus, 0)
  }
})

const handleExport = () => {
  if (!tableData.value.length) {
    ElMessage.warning('暂无数据可导出')
    return
  }
  exportRowsToExcel(
    buildFundExportFileName('应收账龄'),
    '应收账龄',
    [
      { key: 'partner', header: '客户' },
      { key: 'totalDisplay', header: '总额' },
      { key: 'age0_30Display', header: '0-30天' },
      { key: 'age31_60Display', header: '31-60天' },
      { key: 'age61_90Display', header: '61-90天' },
      { key: 'age90PlusDisplay', header: '90天以上' }
    ],
    tableData.value as unknown as Record<string, unknown>[]
  )
  ElMessage.success('导出成功')
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>应收账款账龄表</h1>
      <div class="actions">
        <el-button @click="refreshData">刷新</el-button>
        <el-button type="primary" @click="handleExport">导出</el-button>
      </div>
    </div>

    <div class="summary-cards">
      <span>合计 {{ formatFundAmount(totals.total) }}</span>
      <span>0-30天 {{ formatFundAmount(totals.age0_30) }}</span>
      <span>31-60天 {{ formatFundAmount(totals.age31_60) }}</span>
      <span>61-90天 {{ formatFundAmount(totals.age61_90) }}</span>
      <span class="warn">90天+ {{ formatFundAmount(totals.age90Plus) }}</span>
    </div>

    <div class="table-card">
      <div class="table-scroll">
        <el-table :data="tableData" border>
          <el-table-column prop="partner" label="客户" min-width="160" />
          <el-table-column prop="totalDisplay" label="总额" width="120" align="right" />
          <el-table-column prop="age0_30Display" label="0-30天" width="120" align="right" />
          <el-table-column prop="age31_60Display" label="31-60天" width="120" align="right" />
          <el-table-column prop="age61_90Display" label="61-90天" width="120" align="right" />
          <el-table-column prop="age90PlusDisplay" label="90天以上" width="120" align="right" />
        </el-table>
      </div>
      <el-empty v-if="!tableData.length" description="暂无未收应收数据" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.actions { display: flex; gap: 8px; }
.summary-cards { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px; font-size: 13px; color: #667085; .warn { color: #ef5350; font-weight: 600; } }
.table-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.table-scroll { overflow-x: auto; }
@media (max-width: 768px) { .page-container { padding: 12px; } }
</style>
