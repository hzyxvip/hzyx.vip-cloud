<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([
  { id: 1, code: 'ADMIN', name: '系统管理员', desc: '拥有全部权限', permissions: '全部', status: '启用' },
  { id: 2, code: 'PURCHASE', name: '采购专员', desc: '负责采购相关操作', permissions: '采购管理', status: '启用' },
  { id: 3, code: 'SALES', name: '销售专员', desc: '负责销售相关操作', permissions: '销售管理', status: '启用' },
  { id: 4, code: 'WAREHOUSE', name: '仓库管理员', desc: '负责库存管理', permissions: '仓库管理', status: '启用' },
  { id: 5, code: 'FINANCE', name: '财务人员', desc: '负责资金管理', permissions: '资金管理', status: '禁用' }
])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>角色设定</h1>
      <el-button type="primary">新增角色</el-button>
    </div>
    <div class="search-form">
      <el-input placeholder="角色编码/名称" style="width: 200px;" />
      <el-select placeholder="状态" style="width: 120px;">
        <el-option label="全部" value="" />
        <el-option label="启用" value="启用" />
        <el-option label="禁用" value="禁用" />
      </el-select>
      <el-button type="primary">查询</el-button>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="id" label="编号" width="80" />
        <el-table-column prop="code" label="角色编码" />
        <el-table-column prop="name" label="角色名称" />
        <el-table-column prop="desc" label="角色描述" />
        <el-table-column prop="permissions" label="权限范围" />
        <el-table-column prop="status" label="状态">
          <template #default="scope">
            <el-tag :type="scope.row.status === '启用' ? 'success' : 'info'">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default>
            <el-button type="text" size="small">权限配置</el-button>
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
