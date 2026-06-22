<script setup lang="ts">
import { ref } from 'vue'

const form = ref({ customer: '', amount: '', date: '', account: '' })
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>预收款</h1>
      <el-button type="primary">保存</el-button>
    </div>
    <div class="form-card">
      <el-form :model="form" label-width="100px">
        <div class="form-row">
          <el-form-item label="客户"><el-select v-model="form.customer"><el-option label="北京协和医院" value="hospital" /></el-select></el-form-item>
          <el-form-item label="金额"><el-input v-model="form.amount" /></el-form-item>
          <el-form-item label="日期"><el-date-picker v-model="form.date" type="date" /></el-form-item>
        </div>
        <el-form-item label="结算账户"><el-select v-model="form.account"><el-option label="工商银行" value="icbc" /></el-select></el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.form-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.form-row { display: flex; gap: 24px; .el-form-item { flex: 1; } }
</style>