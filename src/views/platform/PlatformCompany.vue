<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([
  { id: 1, code: 'TYPE001', name: '生产企业', desc: '医疗器械生产企业', approval: '医疗器械生产许可证', status: '启用' },
  { id: 2, code: 'TYPE002', name: '经营公司', desc: '医疗器械经营企业', approval: '医疗器械经营许可证', status: '启用' },
  { id: 3, code: 'TYPE003', name: '医院', desc: '医疗机构', approval: '医疗机构执业许可证', status: '启用' },
  { id: 4, code: 'TYPE004', name: '科研机构', desc: '医疗器械研发机构', approval: '无', status: '禁用' }
])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>公司类型设定</h1>
      <el-button type="primary">新增类型</el-button>
    </div>
    <div class="search-form">
      <el-input placeholder="类型编码/名称" style="width: 200px;" />
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
        <el-table-column prop="code" label="类型编码" />
        <el-table-column prop="name" label="类型名称" />
        <el-table-column prop="desc" label="类型描述" />
        <el-table-column prop="approval" label="所需证件" />
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
.table-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
</style>