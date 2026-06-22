<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([
  { id: 1, code: 'IN001', name: '采购入库', type: '入库', desc: '采购商品入库', status: '启用' },
  { id: 2, code: 'IN002', name: '生产入库', type: '入库', desc: '生产成品入库', status: '启用' },
  { id: 3, code: 'IN003', name: '调拨入库', type: '入库', desc: '仓库间调拨入库', status: '启用' },
  { id: 4, code: 'IN004', name: '盘盈入库', type: '入库', desc: '盘点盘盈入库', status: '启用' },
  { id: 5, code: 'OUT001', name: '销售出库', type: '出库', desc: '销售商品出库', status: '启用' },
  { id: 6, code: 'OUT002', name: '调拨出库', type: '出库', desc: '仓库间调拨出库', status: '启用' },
  { id: 7, code: 'OUT003', name: '盘亏出库', type: '出库', desc: '盘点盘亏出库', status: '启用' },
  { id: 8, code: 'OUT004', name: '采购退货', type: '出库', desc: '采购商品退货出库', status: '启用' }
])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>出入库类别</h1>
      <el-button type="primary">新增类别</el-button>
    </div>
    <div class="search-form">
      <el-input placeholder="类别编码/名称" style="width: 200px;" />
      <el-select placeholder="类型" style="width: 120px;">
        <el-option label="全部" value="" />
        <el-option label="入库" value="入库" />
        <el-option label="出库" value="出库" />
      </el-select>
      <el-button type="primary">查询</el-button>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="id" label="编号" width="80" />
        <el-table-column prop="code" label="类别编码" />
        <el-table-column prop="name" label="类别名称" />
        <el-table-column prop="type" label="类型">
          <template #default="scope">
            <el-tag :type="scope.row.type === '入库' ? 'success' : 'primary'">{{ scope.row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="desc" label="描述" />
        <el-table-column prop="status" label="状态">
          <template #default="scope">
            <el-tag :type="scope.row.status === '启用' ? 'success' : 'info'">{{ scope.row.status }}</el-tag>
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
