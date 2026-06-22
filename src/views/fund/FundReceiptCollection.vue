<script setup lang="ts">
import { ref } from 'vue'

const form = ref({ customer: '', receipts: [], amount: '' })
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>收款核销</h1>
      <el-button type="primary">保存</el-button>
    </div>
    <div class="form-card">
      <el-form :model="form" label-width="100px">
        <el-form-item label="客户"><el-select v-model="form.customer"><el-option label="北京协和医院" value="hospital" /></el-select></el-form-item>
      </el-form>
      <el-table :data="form.receipts" border>
        <el-table-column prop="receiptNo" label="收款单号" />
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