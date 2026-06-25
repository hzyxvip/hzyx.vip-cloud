<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { buildReceivableForecastRows } from '@/utils/fundReportService'
import { formatFundAmount } from '@/utils/fundStore'
import { buildFundExportFileName, exportRowsToExcel } from '@/utils/fundExcelExport'

const tableData = ref(buildReceivableForecastRows())

onMounted(() => {
  document.title = '应收款预警表'
  refreshData()
})

const refreshData = () => {
  tableData.value = buildReceivableForecastRows()
}

const summary = computed(() => {
  const rows = tableData.value
  return {
    total: rows.reduce((s, r) => s + r.amount, 0),
    overdue: rows.filter(r => r.daysRemaining < 0).length,
    dueSoon: rows.filter(r => r.daysRemaining >= 0 && r.daysRemaining <= 7).length
  }
})

const tagType = (level: string) => {
  if (level === 'danger') return 'danger'
  if (level === 'warning') return 'warning'
  return 'info'
}

const handleExport = () => {
  exportRowsToExcel(
    buildFundExportFileName('应收款预警'),
    '应收预警',
    [
      { key: 'partner', header: '客户' },
      { key: 'orderNo', header: '销售订单号' },
      { key: 'amountDisplay', header: '未收金额' },
      { key: 'dueDate', header: '到期日' },
      { key: 'statusLabel', header: '预警状态' }
    ],
    tableData.value as unknown as Record<string, unknown>[]
  )
  ElMessage.success('导出成功')
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>应收款预警表</h1>
      <div class="actions">
        <el-button @click="refreshData">刷新</el-button>
        <el-button type="primary" @click="handleExport">导出</el-button>
      </div>
    </div>

    <div class="summary-cards">
      <span>预警笔数 {{ tableData.length }}</span>
      <span>未收合计 {{ formatFundAmount(summary.total) }}</span>
      <span class="warn">7日内/已逾期 {{ summary.overdue + summary.dueSoon }} 笔</span>
    </div>

    <div class="table-card">
      <div class="table-scroll">
        <el-table :data="tableData" border>
          <el-table-column prop="partner" label="客户" min-width="160" />
          <el-table-column prop="orderNo" label="销售订单号" min-width="140" />
          <el-table-column prop="amountDisplay" label="未收金额" width="120" align="right" />
          <el-table-column prop="dueDate" label="到期日" width="120" />
          <el-table-column label="预警" width="140" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="tagType(row.level)">{{ row.statusLabel }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <el-empty v-if="!tableData.length" description="暂无未收应收预警" />
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
