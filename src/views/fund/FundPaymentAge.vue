<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([{ supplier: '北京医疗器械有限公司', total: '¥32,000', '0-30': '¥12,000', '31-60': '¥10,000', '61-90': '¥8,000', '90+': '¥2,000' }])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>应付账款账龄表</h1>
      <el-button type="primary">导出</el-button>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="supplier" label="供应商" />
        <el-table-column prop="total" label="总额" />
        <el-table-column prop="'0-30'" label="0-30天" />
        <el-table-column prop="'31-60'" label="31-60天" />
        <el-table-column prop="'61-90'" label="61-90天" />
        <el-table-column prop="'90+'" label="90天以上" />
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.table-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
</style>