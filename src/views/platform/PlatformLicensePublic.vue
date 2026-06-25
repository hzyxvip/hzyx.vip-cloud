<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { loadTenantCompanyProfile } from '@/utils/companyDataService'
import type { Company } from '@/utils/dataStore'
import {
  buildQualificationPublicItems,
  getCollaborationPartnerNames,
  getTradedProductsWithCollaborationPartners,
  type QualificationPublicItem
} from '@/utils/companyPublicDisplayService'

const companyName = ref('')
const partnerNames = ref<string[]>([])
const tradedCount = ref(0)
const publicItems = ref<QualificationPublicItem[]>([])
const keyword = ref('')

onMounted(async () => {
  document.title = '证照公示'
  const company: Company = await loadTenantCompanyProfile()
  companyName.value = company?.name || '本企业'
  partnerNames.value = getCollaborationPartnerNames()
  const traded = getTradedProductsWithCollaborationPartners()
  tradedCount.value = traded.length
  publicItems.value = buildQualificationPublicItems(
    company?.companyType,
    company?.qualificationPublicMap || {},
    traded
  )
})

const visibleItems = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return publicItems.value
    .filter(item => item.publicVisible)
    .filter(item => !kw || item.docName.toLowerCase().includes(kw) || item.sectionTitle.toLowerCase().includes(kw))
})

const hiddenCount = computed(() => publicItems.value.filter(item => !item.publicVisible).length)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1>证照公示</h1>
        <p class="desc">{{ companyName }} · 面向协同伙伴的资质公示看板（只读）</p>
      </div>
      <el-input v-model="keyword" placeholder="搜索证照名称" clearable style="max-width: 240px" />
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <p>已公示证照</p>
        <strong>{{ visibleItems.length }}</strong>
      </div>
      <div class="stat-card">
        <p>未公示</p>
        <strong>{{ hiddenCount }}</strong>
      </div>
      <div class="stat-card">
        <p>协同伙伴</p>
        <strong>{{ partnerNames.length }}</strong>
      </div>
      <div class="stat-card">
        <p>协同交易产品</p>
        <strong>{{ tradedCount }}</strong>
      </div>
    </div>

    <div v-if="partnerNames.length" class="partner-tags">
      <span class="label">协同伙伴：</span>
      <el-tag v-for="name in partnerNames" :key="name" size="small" type="success">{{ name }}</el-tag>
    </div>

    <div class="table-card">
      <el-table :data="visibleItems" border>
        <el-table-column prop="sectionTitle" label="分类" width="140" />
        <el-table-column prop="docName" label="证照名称" min-width="200" />
        <el-table-column label="公示方式" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.autoEnabled ? 'warning' : 'success'">
              {{ row.autoEnabled ? '交易自动' : '手动开启' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="关联产品" min-width="180">
          <template #default="{ row }">
            <span v-if="row.relatedProductNames.length">{{ row.relatedProductNames.join('、') }}</span>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!visibleItems.length" description="暂无公示证照，请在企业资料中配置或在协同交易中自动开启" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; background: #f5f7fa; min-height: calc(100vh - 60px); }
.page-header { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; h1 { margin: 0 0 4px; font-size: 22px; } .desc { margin: 0; color: #667085; font-size: 13px; } }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 16px; }
.stat-card { background: #fff; border-radius: 10px; padding: 16px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); p { margin: 0 0 6px; color: #667085; font-size: 13px; } strong { font-size: 22px; color: #00bfa5; } }
.partner-tags { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 16px; .label { color: #667085; font-size: 13px; } }
.table-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow-x: auto; }
.muted { color: #909399; }
@media (max-width: 768px) { .page-container { padding: 12px; } .page-header { flex-direction: column; } }
</style>
