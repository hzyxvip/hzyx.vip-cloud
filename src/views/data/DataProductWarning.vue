<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([
  { id: 1, code: 'PD003', name: '医用手套', certName: '医疗器械注册证', certNo: '国械注准20162660001', expireDate: '2024-03-15', daysLeft: 45, status: '即将过期' },
  { id: 2, code: 'PD005', name: '医用口罩', certName: '医疗器械注册证', certNo: '国械注准20172660002', expireDate: '2024-02-20', daysLeft: 10, status: '紧急' },
  { id: 3, code: 'PD006', name: '消毒液', certName: '消毒产品卫生许可证', certNo: '卫消证字(2020)第0001号', expireDate: '2024-04-30', daysLeft: 70, status: '即将过期' }
])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>商品证件预警</h1>
    </div>
    <div class="search-form">
      <el-input placeholder="商品编码/名称" style="width: 200px;" />
      <el-select placeholder="预警状态" style="width: 150px;">
        <el-option label="全部" value="" />
        <el-option label="紧急" value="紧急" />
        <el-option label="即将过期" value="即将过期" />
      </el-select>
      <el-button type="primary">查询</el-button>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="id" label="编号" width="80" />
        <el-table-column prop="code" label="商品编码" />
        <el-table-column prop="name" label="商品名称" />
        <el-table-column prop="certName" label="证件名称" />
        <el-table-column prop="certNo" label="证件编号" />
        <el-table-column prop="expireDate" label="到期日期" />
        <el-table-column prop="daysLeft" label="剩余天数">
          <template #default="scope">
            <el-tag :type="scope.row.daysLeft <= 30 ? 'danger' : 'warning'">{{ scope.row.daysLeft }}天</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="预警状态">
          <template #default="scope">
            <el-tag :type="scope.row.status === '紧急' ? 'danger' : 'warning'">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default>
            <el-button type="text" size="small">详情</el-button>
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
