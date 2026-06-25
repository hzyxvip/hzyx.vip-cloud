<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { loadCustomerList } from '@/utils/customerStore'
import { getCurrentUserName } from '@/utils/customerStore'
import { saveFundDocument, type FundSettlementType } from '@/utils/fundStore'

const router = useRouter()

const form = ref({
  partner: '',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  account: '',
  settlementType: 'bank' as FundSettlementType,
  remark: '',
  sourceOrderNo: ''
})

const customerOptions = ref<{ label: string; value: string }[]>([])

onMounted(() => {
  customerOptions.value = loadCustomerList()
    .filter(c => c.status !== 'disabled')
    .map(c => ({ label: c.name, value: c.name }))
})

const accountOptions = [
  { label: '工商银行', value: '工商银行' },
  { label: '建设银行', value: '建设银行' },
  { label: '招商银行', value: '招商银行' },
  { label: '现金账户', value: '现金账户' }
]

const settlementOptions = [
  { label: '银行转账', value: 'bank' },
  { label: '现金', value: 'cash' },
  { label: '支票', value: 'check' },
  { label: '汇票', value: 'draft' },
  { label: '第三方支付', value: 'thirdParty' }
]

const canSave = computed(() => form.value.partner && Number(form.value.amount) > 0)

const handleSave = () => {
  if (!canSave.value) {
    ElMessage.warning('请填写客户与有效金额')
    return
  }
  const doc = saveFundDocument({
    type: 'receipt',
    partner: form.value.partner,
    account: form.value.account || accountOptions[0].value,
    date: form.value.date,
    amount: Number(form.value.amount),
    settlementType: form.value.settlementType,
    remark: form.value.remark,
    sourceOrderNo: form.value.sourceOrderNo,
    creator: getCurrentUserName(),
    auditStatus: 'notAudited'
  })
  ElMessage.success(`收款单 ${doc.id} 已保存`)
  router.push('/fund')
}

const handleCancel = () => router.push('/fund')
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>收款单</h1>
      <div class="actions">
        <el-button @click="handleCancel">返回</el-button>
        <el-button type="primary" :disabled="!canSave" @click="handleSave">保存</el-button>
      </div>
    </div>
    <div class="form-card">
      <el-form :model="form" label-width="100px">
        <div class="form-row">
          <el-form-item label="客户" required>
            <el-select v-model="form.partner" filterable placeholder="请选择客户" style="width: 100%">
              <el-option v-for="opt in customerOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="金额" required>
            <el-input v-model="form.amount" type="number" min="0" placeholder="0.00" />
          </el-form-item>
          <el-form-item label="日期">
            <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="结算账户">
            <el-select v-model="form.account" placeholder="请选择账户" style="width: 100%">
              <el-option v-for="opt in accountOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="结算方式">
            <el-select v-model="form.settlementType" style="width: 100%">
              <el-option v-for="opt in settlementOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="关联订单">
            <el-input v-model="form.sourceOrderNo" placeholder="销售订单号（可选）" />
          </el-form-item>
        </div>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  h1 { font-size: 22px; font-weight: 600; margin: 0; }
  .actions { display: flex; gap: 8px; }
}
.form-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.form-row { display: flex; gap: 24px; flex-wrap: wrap; .el-form-item { flex: 1; min-width: 220px; } }
@media (max-width: 768px) {
  .form-row { flex-direction: column; gap: 0; }
}
</style>
