<script setup lang="ts">
import { ref } from 'vue'

const summaryData = ref({ total: '¥125,600', overdue: '¥35,000', today: '¥12,000' })
const tableData = ref([{ customer: '北京协和医院', total: '¥45,000', overdue: '¥15,000' }])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>应收款汇总表</h1>
      <el-date-picker type="month" placeholder="选择月份" />
    </div>
    <div class="stats-grid">
      <div class="stat-card"><p>应收账款总额</p><p class="value">{{ summaryData.total }}</p></div>
      <div class="stat-card"><p>逾期金额</p><p class="value" style="color: #ef5350;">{{ summaryData.overdue }}</p></div>
      <div class="stat-card"><p>今日到期</p><p class="value" style="color: #ffa726;">{{ summaryData.today }}</p></div>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="customer" label="客户" />
        <el-table-column prop="total" label="应收总额" />
        <el-table-column prop="overdue" label="逾期金额" />
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { background: #fff; border-radius: 12px; padding: 20px; text-align: center; .value { font-size: 24px; font-weight: 700; color: #1565c0; } }
.table-card { 
  background: #fff; 
  border-radius: 12px; 
  padding: 20px; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.06); 
  
  :deep(.el-table__header-wrapper th) {
    background: #f5f7fa;
    color: #344054;
    font-weight: 600;
    text-align: center !important;
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
</style>