<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([{ id: 'PY202401001', supplier: '北京医疗器械有限公司', amount: '¥12,500', dueDate: '2024-02-10', status: 'pending' }])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>应付单据</h1>
      <el-button type="primary">新增应付单</el-button>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="id" label="单据号" />
        <el-table-column prop="supplier" label="供应商" />
        <el-table-column prop="amount" label="金额" />
        <el-table-column prop="dueDate" label="到期日" />
        <el-table-column prop="status" label="状态" />
        <el-table-column label="操作"><el-button type="text">查看</el-button></el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.table-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
</style>