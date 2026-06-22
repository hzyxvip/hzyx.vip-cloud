<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([
  { id: 'IN202401001', type: '入库', product: '一次性口罩', quantity: 500, date: '2024-01-15' },
  { id: 'OUT202401001', type: '出库', product: '医用手套', quantity: 200, date: '2024-01-15' }
])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>出入库明细表</h1>
      <el-date-picker type="daterange" placeholder="选择日期范围" />
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="id" label="单据号" />
        <el-table-column prop="type" label="类型">
          <template #default="{ row }"><el-tag :type="row.type === '入库' ? 'success' : 'danger'">{{ row.type }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="product" label="商品名称" />
        <el-table-column prop="quantity" label="数量" />
        <el-table-column prop="date" label="日期" />
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