<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([
  { id: 1, code: 'DOC001', name: '企业资质', desc: '企业营业执照、许可证等', parent: '无', sort: 1, status: '启用' },
  { id: 2, code: 'DOC002', name: '产品资质', desc: '医疗器械注册证、检验报告等', parent: '无', sort: 2, status: '启用' },
  { id: 3, code: 'DOC003', name: '购销合同', desc: '采购合同、销售合同', parent: '无', sort: 3, status: '启用' },
  { id: 4, code: 'DOC004', name: '物流单据', desc: '发货单、验收单等', parent: '无', sort: 4, status: '启用' },
  { id: 5, code: 'DOC005', name: '财务凭证', desc: '发票、付款凭证等', parent: '无', sort: 5, status: '启用' }
])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>文档目录设定</h1>
      <el-button type="primary">新增目录</el-button>
    </div>
    <div class="search-form">
      <el-input placeholder="目录编码/名称" style="width: 200px;" />
      <el-button type="primary">查询</el-button>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="id" label="编号" width="80" />
        <el-table-column prop="code" label="目录编码" />
        <el-table-column prop="name" label="目录名称" />
        <el-table-column prop="desc" label="目录描述" />
        <el-table-column prop="parent" label="上级目录" />
        <el-table-column prop="sort" label="排序" />
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