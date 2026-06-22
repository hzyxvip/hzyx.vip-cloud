<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([{ supplier: '北京医疗器械有限公司', amount: '¥8,000', date: '2024-01-18', days: 3 }])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>应付款预警表</h1>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="supplier" label="供应商" />
        <el-table-column prop="amount" label="金额" />
        <el-table-column prop="date" label="到期日" />
        <el-table-column prop="days" label="剩余天数">
          <template #default="{ row }"><el-tag :type="row.days <= 7 ? 'danger' : 'warning'">{{ row.days }}天</el-tag></template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.table-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
</style>