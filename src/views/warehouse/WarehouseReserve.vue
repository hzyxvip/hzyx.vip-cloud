<script setup lang="ts">
import { ref } from 'vue'

const form = ref({ warehouse: '', orderNo: '', date: '', items: [] })
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>预留单</h1>
      <el-button type="primary">保存</el-button>
    </div>
    <div class="form-card">
      <el-form :model="form" label-width="100px">
        <div class="form-row">
          <el-form-item label="仓库"><el-select v-model="form.warehouse"><el-option label="北京仓库" value="beijing" /></el-select></el-form-item>
          <el-form-item label="关联订单"><el-input v-model="form.orderNo" /></el-form-item>
          <el-form-item label="预留日期"><el-date-picker v-model="form.date" type="date" /></el-form-item>
        </div>
      </el-form>
      <el-table :data="form.items" border><el-table-column prop="productName" label="商品名称" /></el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.form-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.form-row { display: flex; gap: 24px; .el-form-item { flex: 1; } }
</style>