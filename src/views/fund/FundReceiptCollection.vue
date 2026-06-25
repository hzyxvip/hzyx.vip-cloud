<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { buildReceivableDetailRows } from '@/utils/fundReportService'
import {
  formatFundAmount,
  getFundDocument,
  listFundDocuments,
  verifyFundDocument
} from '@/utils/fundStore'

const route = useRoute()
const router = useRouter()

const partner = ref('')
const selectedDocId = ref('')
const verifyAmount = ref('')
const receivableRows = ref(buildReceivableDetailRows())

const receiptOptions = computed(() =>
  listFundDocuments('receipt')
    .filter(d => d.auditStatus === 'audited' && d.verifyStatus !== 'verified')
    .filter(d => !partner.value || d.partner === partner.value)
    .map(d => ({
      label: `${d.id} · ${d.partner} · 未核销 ${d.unverifiedAmountDisplay}`,
      value: d.id
    }))
)

const partnerOptions = computed(() => {
  const set = new Set<string>()
  listFundDocuments('receipt').forEach(d => {
    if (d.auditStatus === 'audited' && d.verifyStatus !== 'verified') set.add(d.partner)
  })
  return Array.from(set).map(name => ({ label: name, value: name }))
})

const selectedDoc = computed(() => (selectedDocId.value ? getFundDocument(selectedDocId.value) : undefined))

const filteredReceivables = computed(() =>
  receivableRows.value.filter(row => !partner.value || row.partner === partner.value)
)

onMounted(() => {
  receivableRows.value = buildReceivableDetailRows()
  const docId = String(route.query.docId || '')
  if (docId) {
    selectedDocId.value = docId
    const doc = getFundDocument(docId)
    if (doc) partner.value = doc.partner
  }
})

const handleDocChange = (id: string) => {
  const doc = getFundDocument(id)
  if (doc) {
    partner.value = doc.partner
    verifyAmount.value = String(doc.unverifiedAmount)
  }
}

const handleSave = () => {
  if (!selectedDocId.value) {
    ElMessage.warning('请选择收款单')
    return
  }
  const amount = Number(verifyAmount.value)
  if (!Number.isFinite(amount) || amount <= 0) {
    ElMessage.warning('请输入有效核销金额')
    return
  }
  const doc = verifyFundDocument(selectedDocId.value, amount)
  if (!doc) {
    ElMessage.error('核销失败，请确认单据已审核')
    return
  }
  receivableRows.value = buildReceivableDetailRows()
  ElMessage.success(`已核销 ${formatFundAmount(amount)}`)
  router.push('/fund')
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>收款核销</h1>
      <div class="actions">
        <el-button @click="router.push('/fund')">返回</el-button>
        <el-button type="primary" @click="handleSave">保存核销</el-button>
      </div>
    </div>
    <div class="form-card">
      <el-form label-width="100px">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12">
            <el-form-item label="客户">
              <el-select v-model="partner" filterable clearable placeholder="选择客户">
                <el-option v-for="opt in partnerOptions" :key="opt.value" v-bind="opt" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="收款单">
              <el-select
                v-model="selectedDocId"
                filterable
                placeholder="选择待核销收款单"
                @change="handleDocChange"
              >
                <el-option v-for="opt in receiptOptions" :key="opt.value" v-bind="opt" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item v-if="selectedDoc" label="单据信息">
          <span>金额 {{ selectedDoc.amountDisplay }}，已核销 {{ selectedDoc.verifiedAmountDisplay }}，待核销 {{ selectedDoc.unverifiedAmountDisplay }}</span>
        </el-form-item>
        <el-form-item label="核销金额">
          <el-input v-model="verifyAmount" placeholder="本次核销金额" style="max-width: 240px" />
        </el-form-item>
      </el-form>

      <h3 class="section-title">待收明细（参考）</h3>
      <div class="table-scroll">
        <el-table :data="filteredReceivables" border size="small">
          <el-table-column prop="orderNo" label="销售订单号" min-width="140" />
          <el-table-column prop="totalDisplay" label="订单金额" width="120" align="right" />
          <el-table-column prop="balanceDisplay" label="应收余额" width="120" align="right" />
        </el-table>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.actions { display: flex; gap: 8px; }
.form-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.section-title { margin: 20px 0 12px; font-size: 15px; color: #344054; }
.table-scroll { overflow-x: auto; }
@media (max-width: 768px) {
  .page-container { padding: 12px; }
}
</style>
