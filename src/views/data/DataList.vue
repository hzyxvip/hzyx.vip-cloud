<script setup lang="ts">
import { ref } from 'vue'

const categories = ref([
  { name: '商品资料列表', path: '/data/product', desc: '商品信息管理' },
  { name: '供应商资料', path: '/data/supplier', desc: '管理供应商基本信息' },
  { name: '客户管理', path: '/data/customer', desc: '管理客户基本信息' },
  { name: '公司资料设定', path: '/data/company', desc: '维护本企业公司资料' },
  { name: '仓库资料设定', path: '/data/warehouse', desc: '仓库信息管理' }
])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>资料管理</h1>
    </div>
    <div class="cards-grid">
      <div class="category-card" v-for="cat in categories" :key="cat.name">
        <div class="card-content">
          <h3>{{ cat.name }}</h3>
          <p>{{ cat.desc }}</p>
        </div>
        <el-button type="primary" @click="$router.push(cat.path)">进入管理</el-button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.cards-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.category-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; }
.card-content { h3 { margin: 0 0 8px; font-size: 16px; } p { margin: 0; color: #666; font-size: 13px; } }
</style>
