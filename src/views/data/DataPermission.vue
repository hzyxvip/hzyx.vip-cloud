<script setup lang="ts">
import { ref } from 'vue'

const permissions = ref([
  { id: 1, name: '采购订单查询', code: 'purchase:query', module: '采购管理' },
  { id: 2, name: '采购订单创建', code: 'purchase:create', module: '采购管理' },
  { id: 3, name: '采购订单审核', code: 'purchase:approve', module: '采购管理' },
  { id: 4, name: '销售订单查询', code: 'sales:query', module: '销售管理' },
  { id: 5, name: '销售订单创建', code: 'sales:create', module: '销售管理' },
  { id: 6, name: '库存查询', code: 'warehouse:query', module: '仓库管理' },
  { id: 7, name: '库存调整', code: 'warehouse:adjust', module: '仓库管理' },
  { id: 8, name: '资金查询', code: 'fund:query', module: '资金管理' },
  { id: 9, name: '收款操作', code: 'fund:receipt', module: '资金管理' },
  { id: 10, name: '付款操作', code: 'fund:pay', module: '资金管理' }
])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>权限设定</h1>
      <el-button type="primary">新增权限</el-button>
    </div>
    <div class="search-form">
      <el-input placeholder="权限名称/编码" style="width: 200px;" />
      <el-select placeholder="所属模块" style="width: 150px;">
        <el-option label="全部" value="" />
        <el-option label="采购管理" value="采购管理" />
        <el-option label="销售管理" value="销售管理" />
        <el-option label="仓库管理" value="仓库管理" />
        <el-option label="资金管理" value="资金管理" />
      </el-select>
      <el-button type="primary">查询</el-button>
    </div>
    <div class="table-card">
      <el-table :data="permissions" border>
        <el-table-column prop="id" label="编号" width="80" />
        <el-table-column prop="name" label="权限名称" />
        <el-table-column prop="code" label="权限编码" />
        <el-table-column prop="module" label="所属模块" />
        <el-table-column label="操作" width="150">
          <template #default>
            <el-button type="text" size="small">编辑</el-button>
            <el-button type="text" size="small">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.search-form { display: flex; gap: 12px; padding: 16px; background: #f5f7fa; border-radius: 8px; margin-bottom: 16px; }
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
