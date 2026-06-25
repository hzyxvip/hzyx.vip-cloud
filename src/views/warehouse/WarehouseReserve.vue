<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { activeWarehouseOptions, hydrateWarehouseOptionsFromServer } from '@/utils/warehouseSettings'

const form = ref({ warehouse: '', orderNo: '', date: '', items: [] })
const warehouseOptions = activeWarehouseOptions

onMounted(() => { void hydrateWarehouseOptionsFromServer() })
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
          <el-form-item label="仓库">
            <el-select v-model="form.warehouse" placeholder="请选择仓库">
              <el-option v-for="w in warehouseOptions" :key="w.value" :label="w.label" :value="w.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="关联订单"><el-input v-model="form.orderNo" /></el-form-item>
          <el-form-item label="预留日期"><el-date-picker v-model="form.date" type="date" /></el-form-item>
        </div>
      </el-form>
      <el-table :data="form.items" border><el-table-column prop="productName" label="商品名称" /></el-table>
    </div>
  </div>
</template>

<style scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.form-card { background: #fff; padding: 20px; border-radius: 4px; }
.form-row { display: flex; gap: 20px; flex-wrap: wrap; }
</style>
