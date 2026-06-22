<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([{ id: 'MR202401001', customer: '北京协和医院', receipts: '3笔', amount: '¥45,000', date: '2024-01-15' }])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>合并收款单记录</h1>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="id" label="合并单号" />
        <el-table-column prop="customer" label="客户" />
        <el-table-column prop="receipts" label="合并笔数" />
        <el-table-column prop="amount" label="总金额" />
        <el-table-column prop="date" label="日期" />
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.table-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
</style>