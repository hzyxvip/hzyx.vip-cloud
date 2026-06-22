<script setup lang="ts">
import { ref } from 'vue'

const form = ref({ supplier: '', payments: [], amount: '' })
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>付款核销</h1>
      <el-button type="primary">保存</el-button>
    </div>
    <div class="form-card">
      <el-form :model="form" label-width="100px">
        <el-form-item label="供应商"><el-select v-model="form.supplier"><el-option label="北京医疗器械有限公司" value="supplier" /></el-select></el-form-item>
      </el-form>
      <el-table :data="form.payments" border>
        <el-table-column prop="payNo" label="付款单号" />
        <el-table-column prop="amount" label="金额" />
        <el-table-column prop="checked" label="选择">
          <template #default><el-checkbox /></template>
        </el-table-column>
      </el-table>
      <div class="total-row">
        <span>核销金额:</span>
        <el-input v-model="form.amount" style="width: 200px;" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.form-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.total-row { display: flex; justify-content: flex-end; align-items: center; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f0; }
</style>