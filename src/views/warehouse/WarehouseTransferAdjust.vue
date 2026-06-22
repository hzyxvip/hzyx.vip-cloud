<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([{ id: 'TR202401001', fromWarehouse: '北京仓库', toWarehouse: '上海仓库', date: '2024-01-15', status: 'pending' }])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>调拨差异处理表</h1>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="id" label="调拨单号" />
        <el-table-column prop="fromWarehouse" label="调出仓库" />
        <el-table-column prop="toWarehouse" label="调入仓库" />
        <el-table-column prop="date" label="调拨日期" />
        <el-table-column prop="status" label="状态" />
        <el-table-column label="操作"><el-button type="text">处理</el-button></el-table-column>
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