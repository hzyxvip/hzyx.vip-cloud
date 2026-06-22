<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([{ customer: '北京协和医院', amount: '¥15,000', date: '2024-01-20', days: 5 }])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>应收款预警表</h1>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="customer" label="客户" />
        <el-table-column prop="amount" label="金额" />
        <el-table-column prop="date" label="到期日" />
        <el-table-column prop="days" label="剩余天数">
          <template #default="{ row }"><el-tag :type="row.days <= 7 ? 'danger' : 'warning'">{{ row.days }}天</el-tag></template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
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