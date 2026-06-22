<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([
  { id: 1, name: '工商银行-基本户', bank: '工商银行', account: '6222021234567890123', balance: '1,250,000.00', status: '正常' },
  { id: 2, name: '建设银行-一般户', bank: '建设银行', account: '6227001234567890123', balance: '850,000.00', status: '正常' },
  { id: 3, name: '招商银行-专用户', bank: '招商银行', account: '6225881234567890123', balance: '500,000.00', status: '冻结' },
  { id: 4, name: '现金账户', bank: '现金', account: '-', balance: '50,000.00', status: '正常' }
])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>结算账户设定</h1>
      <el-button type="primary">新增账户</el-button>
    </div>
    <div class="search-form">
      <el-input placeholder="账户名称" style="width: 200px;" />
      <el-select placeholder="银行" style="width: 150px;">
        <el-option label="全部" value="" />
        <el-option label="工商银行" value="工商银行" />
        <el-option label="建设银行" value="建设银行" />
        <el-option label="招商银行" value="招商银行" />
        <el-option label="现金" value="现金" />
      </el-select>
      <el-button type="primary">查询</el-button>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="id" label="编号" width="80" />
        <el-table-column prop="name" label="账户名称" />
        <el-table-column prop="bank" label="开户银行" />
        <el-table-column prop="account" label="账号" />
        <el-table-column prop="balance" label="账户余额" />
        <el-table-column prop="status" label="状态">
          <template #default="scope">
            <el-tag :type="scope.row.status === '正常' ? 'success' : 'warning'">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
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
