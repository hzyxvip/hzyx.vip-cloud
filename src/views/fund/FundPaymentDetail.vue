<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([{ id: 'PY202401001', supplier: '北京医疗器械有限公司', amount: '¥12,500', paid: '¥5,000', balance: '¥7,500' }])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>应付款明细表</h1>
      <el-button type="primary">导出</el-button>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="id" label="单据号" />
        <el-table-column prop="supplier" label="供应商" />
        <el-table-column prop="amount" label="总金额" />
        <el-table-column prop="paid" label="已付金额" />
        <el-table-column prop="balance" label="余额" />
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.table-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
</style>