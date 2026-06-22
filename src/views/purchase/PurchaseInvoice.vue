<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([{ id: 'INV202401001', orderNo: 'PO202401001', amount: '¥12,500', status: 'pending' }])
const statusLabels = { pending: { text: '待验收', color: 'warning' }, completed: { text: '已验收', color: 'success' } }
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>发票验收</h1>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="id" label="发票号" />
        <el-table-column prop="orderNo" label="采购订单号" />
        <el-table-column prop="amount" label="发票金额" />
        <el-table-column prop="status" label="状态">
          <template #default="{ row }"><el-tag :type="statusLabels[row.status as keyof typeof statusLabels].color">{{ statusLabels[row.status as keyof typeof statusLabels].text }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作"><el-button type="text">验收</el-button></el-table-column>
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