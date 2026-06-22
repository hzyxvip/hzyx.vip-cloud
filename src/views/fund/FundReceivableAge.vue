<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([{ customer: '北京协和医院', total: '¥45,000', '0-30': '¥20,000', '31-60': '¥15,000', '61-90': '¥10,000', '90+': '¥0' }])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>应收账款账龄表</h1>
      <el-button type="primary">导出</el-button>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="customer" label="客户" />
        <el-table-column prop="total" label="总额" />
        <el-table-column prop="'0-30'" label="0-30天" />
        <el-table-column prop="'31-60'" label="31-60天" />
        <el-table-column prop="'61-90'" label="61-90天" />
        <el-table-column prop="'90+'" label="90天以上" />
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