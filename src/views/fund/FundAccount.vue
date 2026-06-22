<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([{ account: '工商银行', balance: '¥125,000', currency: '人民币' }])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>账户余额表</h1>
      <el-button type="primary">导出</el-button>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="account" label="账户" />
        <el-table-column prop="balance" label="余额" />
        <el-table-column prop="currency" label="币种" />
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.table-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
</style>