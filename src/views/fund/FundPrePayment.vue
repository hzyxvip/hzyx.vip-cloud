<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { loadSupplierList } from '@/utils/supplierStore'
import { getCurrentUserName } from '@/utils/customerStore'
import { saveFundDocument, type FundSettlementType } from '@/utils/fundStore'

const router = useRouter()
const route = useRoute()

const form = ref({
  partner: '',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  account: '',
  settlementType: 'bank' as FundSettlementType,
  remark: '',
  sourceOrderNo: ''
})

const supplierOptions = ref<{ label: string; value: string }[]>([])

onMounted(() => {
  supplierOptions.value = loadSupplierList()
    .filter(s => s.status !== 'disabled')
    .map(s => ({ label: s.name, value: s.name }))

  const query = route.query
  if (query.partner) form.value.partner = String(query.partner)
  if (query.amount) form.value.amount = String(query.amount)
  if (query.remark) form.value.remark = String(query.remark)
  if (query.sourceOrderNo) form.value.sourceOrderNo = String(query.sourceOrderNo)
})

const canSave = computed(() => form.value.partner && Number(form.value.amount) > 0)

const handleSave = () => {
  if (!canSave.value) {
    ElMessage.warning('请填写供应商与有效金额')
    return
  }
  const doc = saveFundDocument({
    type: 'prePayment',
    partner: form.value.partner,
    account: form.value.account || '工商银行',
    date: form.value.date,
    amount: Number(form.value.amount),
    settlementType: form.value.settlementType,
    remark: form.value.remark,
    sourceOrderNo: form.value.sourceOrderNo || undefined,
    creator: getCurrentUserName(),
    auditStatus: 'notAudited'
  })
  ElMessage.success(`预付款单 ${doc.id} 已保存`)
  router.push('/fund')
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>预付款单</h1>
      <div class="actions">
        <el-button @click="router.push('/fund')">返回</el-button>
        <el-button type="primary" :disabled="!canSave" @click="handleSave">保存</el-button>
      </div>
    </div>
    <div class="form-card">
      <el-form :model="form" label-width="100px">
        <el-form-item label="供应商">
          <el-select v-model="form.partner" filterable placeholder="选择供应商">
            <el-option v-for="opt in supplierOptions" :key="opt.value" v-bind="opt" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额"><el-input v-model="form.amount" type="number" /></el-form-item>
        <el-form-item label="日期"><el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="结算账户"><el-input v-model="form.account" placeholder="工商银行" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item>
        <el-form-item v-if="form.sourceOrderNo" label="来源单号">
          <el-input v-model="form.sourceOrderNo" disabled />
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.form-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
@media (max-width: 768px) { .page-container { padding: 12px; } }
</style>
