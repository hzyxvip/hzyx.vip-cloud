<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([{ id: 'RC202401001', customer: '北京协和医院', amount: '¥10,000', date: '2024-01-15', account: '工商银行' }])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>收款明细表</h1>
      <el-button type="primary">导出</el-button>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="id" label="收款单号" />
        <el-table-column prop="customer" label="客户" />
        <el-table-column prop="amount" label="金额" />
        <el-table-column prop="date" label="日期" />
        <el-table-column prop="account" label="结算账户" />
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
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