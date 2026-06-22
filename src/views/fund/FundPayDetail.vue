<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([{ id: 'PY202401001', supplier: '北京医疗器械有限公司', amount: '¥5,000', date: '2024-01-15', account: '工商银行' }])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>付款明细表</h1>
      <el-button type="primary">导出</el-button>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="id" label="付款单号" />
        <el-table-column prop="supplier" label="供应商" />
        <el-table-column prop="amount" label="金额" />
        <el-table-column prop="date" label="日期" />
        <el-table-column prop="account" label="结算账户" />
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.table-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
</style>