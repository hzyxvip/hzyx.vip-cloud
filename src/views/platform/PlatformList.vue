<script setup lang="ts">
import { ref } from 'vue'

const categories = ref([
  { name: '平台商品基本资料', path: '/platform/product', desc: '管理平台共享商品信息' },
  { name: '线上客户协同', path: '/platform/collab-monitor', desc: '本公司参与的协同订单链路监控' },
  { name: '证照公示看板', path: '/platform/license-public', desc: '面向协同伙伴的资质公示' },
  { name: '公司类型设定', path: '/platform/company', desc: '设定平台企业类型' },
  { name: '文档目录设定', path: '/platform/document', desc: '管理文档分类目录' },
  { name: '登录账号设定', path: '/platform/account', desc: '管理平台用户账号' },
  { name: '文档归档设定', path: '/platform/archive', desc: '文档归档管理配置' },
  { name: '汉字拼音缩写补充资料', path: '/platform/dictionary', desc: '汉字拼音缩写字典' },
  { name: '计数单位设定', path: '/platform/counting', desc: '计量单位配置' }
])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>平台管理</h1>
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
.cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
.category-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; }
.card-content { h3 { margin: 0 0 8px; font-size: 16px; } p { margin: 0; color: #666; font-size: 13px; } }
</style>