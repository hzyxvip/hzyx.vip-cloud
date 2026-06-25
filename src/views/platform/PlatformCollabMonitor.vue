<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getCollabLinks, type CollabLink } from '@/utils/platformCollaborationService'
import { getCurrentCompanyId } from '@/utils/orderBusinessProcess'

const links = ref<CollabLink[]>([])
const keyword = ref('')
const statusFilter = ref('')

const statusLabels: Record<string, string> = {
  sent: '已发送',
  received: '已接收',
  outbound: '已出库',
  inbound: '已入库',
  completed: '已完成',
  cancelled: '已取消'
}

onMounted(() => {
  document.title = '线上客户协同'
  refreshLinks()
})

const refreshLinks = () => {
  links.value = getCollabLinks().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

const filteredLinks = computed(() => {
  const companyId = getCurrentCompanyId()
  const kw = keyword.value.trim().toLowerCase()
  return links.value.filter(link => {
    const involved =
      link.buyerCompanyId === companyId || link.sellerCompanyId === companyId
    if (!involved) return false
    if (statusFilter.value && link.status !== statusFilter.value) return false
    if (!kw) return true
    return [link.platformOrderNo, link.buyerOrderNo, link.sellerOrderNo, link.customerName, link.supplierName]
      .some(v => String(v || '').toLowerCase().includes(kw))
  })
})

const summary = computed(() => ({
  total: links.value.length,
  active: links.value.filter(l => !['completed', 'cancelled'].includes(l.status)).length,
  completed: links.value.filter(l => l.status === 'completed').length
}))
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1>线上客户协同</h1>
        <p class="desc">本公司参与的协同采购/销售链路（PO→SO→出库→入库）</p>
      </div>
      <div class="actions">
        <el-input v-model="keyword" placeholder="订单号/伙伴" clearable style="width: 200px" />
        <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 140px">
          <el-option v-for="(label, value) in statusLabels" :key="value" :label="label" :value="value" />
        </el-select>
        <el-button @click="refreshLinks">刷新</el-button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><p>协同单总数</p><strong>{{ summary.total }}</strong></div>
      <div class="stat-card"><p>进行中</p><strong>{{ summary.active }}</strong></div>
      <div class="stat-card"><p>已完成</p><strong>{{ summary.completed }}</strong></div>
    </div>

    <div class="table-card">
      <div class="table-scroll">
        <el-table :data="filteredLinks" border>
          <el-table-column prop="platformOrderNo" label="平台单号" min-width="140" />
          <el-table-column prop="buyerOrderNo" label="采购订单" min-width="130" />
          <el-table-column prop="sellerOrderNo" label="销售订单" min-width="130" />
          <el-table-column prop="customerName" label="客户" min-width="140" />
          <el-table-column prop="supplierName" label="供应商" min-width="140" />
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag size="small">{{ statusLabels[row.status] || row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="改单申请" width="100" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="row.modifyRequestStatus === 'pending' ? 'warning' : 'info'">
                {{ row.modifyRequestStatus === 'pending' ? '待处理' : row.modifyRequestStatus === 'approved' ? '已通过' : row.modifyRequestStatus === 'rejected' ? '已驳回' : '无' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="updatedAt" label="更新时间" width="160" />
        </el-table>
      </div>
      <el-empty v-if="!filteredLinks.length" description="暂无本公司协同记录，请在伙伴资料中开启协同并创建/接收协同订单" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; background: #f5f7fa; min-height: calc(100vh - 60px); }
.page-header { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; h1 { margin: 0 0 4px; font-size: 22px; } .desc { margin: 0; color: #667085; font-size: 13px; } }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 16px; }
.stat-card { background: #fff; border-radius: 10px; padding: 16px; text-align: center; p { margin: 0 0 6px; color: #667085; font-size: 13px; } strong { font-size: 22px; color: #1565c0; } }
.table-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.table-scroll { overflow-x: auto; }
@media (max-width: 768px) { .page-container { padding: 12px; } .page-header { flex-direction: column; } }
</style>
