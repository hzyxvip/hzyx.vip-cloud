<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { buildPartnerFundSummary } from '@/utils/fundReportService'
import { formatFundAmount } from '@/utils/fundStore'

const tableData = computed(() =>
  buildPartnerFundSummary().map(row => ({
    partner: row.partner,
    receiptTotal: formatFundAmount(row.receiptTotal),
    paymentTotal: formatFundAmount(row.paymentTotal),
    net: formatFundAmount(row.net),
    netRaw: row.net
  }))
)

onMounted(() => {
  document.title = '往来报表'
})

const handleExport = () => {
  ElMessage.info('可先使用浏览器打印导出')
  window.print()
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>往来报表</h1>
      <el-button type="primary" @click="handleExport">导出</el-button>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="partner" label="往来单位" min-width="180" />
        <el-table-column prop="receiptTotal" label="收款合计" width="140" align="right" />
        <el-table-column prop="paymentTotal" label="付款合计" width="140" align="right" />
        <el-table-column label="净额(收-付)" width="140" align="right">
          <template #default="{ row }">
            <span :class="row.netRaw >= 0 ? 'positive' : 'negative'">{{ row.net }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.table-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.positive { color: #00bfa5; font-weight: 600; }
.negative { color: #f56c6c; font-weight: 600; }
</style>
