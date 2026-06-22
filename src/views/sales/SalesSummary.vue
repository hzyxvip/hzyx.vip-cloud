<script setup lang="ts">
import { ref } from 'vue'

const summaryData = ref({ totalAmount: '¥234,500', totalOrders: 32, totalCustomers: 15 })
const tableData = ref([{ customer: '北京协和医院', amount: '¥89,000', count: 12 }])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>销售汇总表</h1>
      <el-date-picker type="month" placeholder="选择月份" />
    </div>
    <div class="stats-grid">
      <div class="stat-card"><p>销售总金额</p><p class="value">{{ summaryData.totalAmount }}</p></div>
      <div class="stat-card"><p>销售订单数</p><p class="value">{{ summaryData.totalOrders }}</p></div>
      <div class="stat-card"><p>客户数量</p><p class="value">{{ summaryData.totalCustomers }}</p></div>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="customer" label="客户" />
        <el-table-column prop="amount" label="销售金额" />
        <el-table-column prop="count" label="订单数量" />
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { background: #fff; border-radius: 12px; padding: 20px; text-align: center; .value { font-size: 24px; font-weight: 700; color: #388e3c; } }
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