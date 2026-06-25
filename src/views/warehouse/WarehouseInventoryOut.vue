<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { activeWarehouseOptions, hydrateWarehouseOptionsFromServer } from '@/utils/warehouseSettings'

const form = ref({ inventoryNo: '', warehouse: '', date: '', items: [] })
const warehouseOptions = activeWarehouseOptions

onMounted(() => { void hydrateWarehouseOptionsFromServer() })
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>盘亏出库单</h1>
      <el-button type="primary">保存</el-button>
    </div>
    <div class="form-card">
      <el-form :model="form" label-width="100px">
        <div class="form-row">
          <el-form-item label="盘点单号"><el-input v-model="form.inventoryNo" /></el-form-item>
          <el-form-item label="仓库">
            <el-select v-model="form.warehouse" placeholder="请选择仓库">
              <el-option v-for="w in warehouseOptions" :key="w.value" :label="w.label" :value="w.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="日期"><el-date-picker v-model="form.date" type="date" /></el-form-item>
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
