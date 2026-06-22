<script setup lang="ts">
import { ref } from 'vue'

const searchForm = ref({
  invoiceNo: '',
  orderNo: ''
})

const tableData = ref([{ id: 'INV202401001', orderNo: 'SO202401001', amount: '¥28,800', date: '2024-01-15' }])

const handleSearch = () => {
}

const handleReset = () => {
  searchForm.value = {
    invoiceNo: '',
    orderNo: ''
  }
}

const handleRefresh = () => {
  const stored = localStorage.getItem('salesInvoiceList')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        tableData.value = parsed
      }
    } catch {
      console.error('Failed to parse sales invoice data')
    }
  }
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>已开发票列表</h1>
    </div>
    <div class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="发票号"><el-input v-model="searchForm.invoiceNo" placeholder="请输入发票号" clearable /></el-form-item>
        <el-form-item label="订单号"><el-input v-model="searchForm.orderNo" placeholder="请输入订单号" clearable /></el-form-item>
        <el-form-item><el-button type="primary" icon="Search" @click="handleSearch">查询</el-button><el-button @click="handleReset">重置</el-button><el-button @click="handleRefresh">刷新</el-button></el-form-item>
      </el-form>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="id" label="发票号" />
        <el-table-column prop="orderNo" label="订单号" />
        <el-table-column prop="amount" label="金额" />
        <el-table-column prop="date" label="开票日期" />
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.search-card { background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
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