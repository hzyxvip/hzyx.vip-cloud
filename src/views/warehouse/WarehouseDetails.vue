<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([{ product: '一次性口罩', batch: '20240101', stock: 500, expiry: '2025-01-01' }])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>库存现况明细表</h1>
      <el-button type="primary">导出</el-button>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="product" label="商品名称" />
        <el-table-column prop="batch" label="批次号" />
        <el-table-column prop="stock" label="库存数量" />
        <el-table-column prop="expiry" label="有效期" />
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