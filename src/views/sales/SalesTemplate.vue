<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([{ id: 1, name: '常用销售模板', items: '8种商品', createTime: '2024-01-10' }])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>销售模板</h1>
      <el-button type="primary">新建模板</el-button>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="id" label="编号" />
        <el-table-column prop="name" label="模板名称" />
        <el-table-column prop="items" label="商品数量" />
        <el-table-column prop="createTime" label="创建时间" />
        <el-table-column label="操作"><el-button type="text">使用</el-button><el-button type="text">删除</el-button></el-table-column>
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