<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getCurrentUserName } from '@/utils/customerStore'
import { saveFundDocument, type FundSettlementType } from '@/utils/fundStore'

const router = useRouter()

const expenseTypeOptions = [
  { label: '办公费用', value: 'office' },
  { label: '运输费用', value: 'transport' },
  { label: '其他', value: 'other' }
]

const form = ref({
  type: 'office',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  account: '工商银行',
  settlementType: 'bank' as FundSettlementType,
  remark: ''
})

const canSave = computed(() => Number(form.value.amount) > 0)

const handleSave = () => {
  if (!canSave.value) {
    ElMessage.warning('请输入有效金额')
    return
  }
  const typeLabel = expenseTypeOptions.find(o => o.value === form.value.type)?.label || '其他支出'
  const doc = saveFundDocument({
    type: 'otherExpense',
    partner: typeLabel,
    account: form.value.account,
    date: form.value.date,
    amount: Number(form.value.amount),
    settlementType: form.value.settlementType,
    remark: form.value.remark,
    creator: getCurrentUserName(),
    auditStatus: 'notAudited'
  })
  ElMessage.success(`其他支出单 ${doc.id} 已保存`)
  router.push('/fund')
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>其他支出</h1>
      <div class="actions">
        <el-button @click="router.push('/fund')">返回</el-button>
        <el-button type="primary" :disabled="!canSave" @click="handleSave">保存</el-button>
      </div>
    </div>
    <div class="form-card">
      <el-form :model="form" label-width="100px">
        <el-form-item label="支出类型">
          <el-select v-model="form.type">
            <el-option v-for="opt in expenseTypeOptions" :key="opt.value" v-bind="opt" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额"><el-input v-model="form.amount" type="number" /></el-form-item>
        <el-form-item label="日期"><el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="结算账户"><el-input v-model="form.account" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="3" /></el-form-item>
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
