<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTableStyle } from '@/composables/useTableStyle'
import { activeWarehouseOptions, refreshWarehouseOptions } from '@/utils/warehouseSettings'

const searchForm = ref({
  product: '',
  warehouse: ''
})

const tableData = ref([
  { product: '一次性口罩', warehouse: '公司库', stock: 1200, unit: '盒', price: '¥12.50' },
  { product: '医用手套', warehouse: '公司库', stock: 500, unit: '盒', price: '¥28.00' }
])

const { columnWidths, handleHeaderDragend } = useTableStyle('warehouse-list', [
  { key: 'product', label: '商品名称', defaultWidth: 150 },
  { key: 'warehouse', label: '仓库', defaultWidth: 120 },
  { key: 'stock', label: '库存数量', defaultWidth: 100 },
  { key: 'unit', label: '单位', defaultWidth: 60 },
  { key: 'price', label: '单价', defaultWidth: 100 },
  { key: 'action', label: '操作', defaultWidth: 80 }
])

const handleSearch = () => {
}

const handleReset = () => {
  searchForm.value = {
    product: '',
    warehouse: ''
  }
}

const handleRefresh = () => {
  refreshWarehouseOptions()
  const stored = localStorage.getItem('warehouseList')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        tableData.value = parsed
      }
    } catch {
      console.error('Failed to parse warehouse data')
    }
  }
}

onMounted(() => {
  refreshWarehouseOptions()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>库存现况</h1>
      <el-button type="primary">盘点</el-button>
    </div>
    <div class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="商品名称"><el-input v-model="searchForm.product" placeholder="请输入商品名称" clearable /></el-form-item>
        <el-form-item label="仓库"><el-select v-model="searchForm.warehouse" placeholder="请选择仓库" clearable><el-option v-for="opt in activeWarehouseOptions" :key="opt.value" :label="opt.label" :value="opt.value" /></el-select></el-form-item>
        <el-form-item><el-button type="primary" icon="Search" @click="handleSearch">查询</el-button><el-button @click="handleReset">重置</el-button><el-button @click="handleRefresh">刷新</el-button></el-form-item>
      </el-form>
    </div>
    <div class="table-card">
      <el-table :data="tableData" class="common-table" border :fit="true" @header-dragend="handleHeaderDragend">
        <el-table-column prop="product" label="商品名称" :width="columnWidths.product" />
        <el-table-column prop="warehouse" label="仓库" :width="columnWidths.warehouse" />
        <el-table-column prop="stock" label="库存数量" :width="columnWidths.stock" />
        <el-table-column prop="unit" label="单位" :width="columnWidths.unit" />
        <el-table-column prop="price" label="单价" :width="columnWidths.price" />
        <el-table-column label="操作" :width="columnWidths.action"><el-button type="text">详情</el-button></el-table-column>
        <el-table-column label="" />
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; background-color: #F5F7FA; min-height: calc(100vh - 60px); }
.page-header { display: flex; justify-content: space-between; margin-bottom: 20px; h1 { font-size: 20px; font-weight: 600; color: #344054; margin: 0; } }
.search-card { background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
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