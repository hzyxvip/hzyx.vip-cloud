<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { buildPlatformCustomerFromForm, platformCustomerToForm } from '@/utils/platformCustomerFormService'
import {
  getPlatformCustomerFormPath,
  loadPlatformCustomerDraft,
  savePlatformCustomerDraft
} from '@/utils/platformCustomerDraftStore'
import { getAuthUser } from '@/utils/authSession'
import {
  findPlatformCustomerById,
  formatToday,
  loadPlatformCustomerList,
  savePlatformCustomerList
} from '@/utils/platformCustomerStore'
import { useLayoutNavigateBack } from '@/composables/useLayoutNavigateBack'

const router = useRouter()
const route = useRoute()
const layoutNavigateBack = useLayoutNavigateBack()

const saving = ref(false)
const loading = ref(false)

const isEdit = computed(() => route.path.includes('/edit/'))
const editId = computed(() => route.params.id as string)
const backPath = computed(() => getPlatformCustomerFormPath(isEdit.value, editId.value))

const form = reactive({
  platformUser: '否',
  settlementPeriod: 0,
  recordStatus: '否',
  recordDate: '',
  remark2: '',
  remark3: '',
  remark4: '',
  remark5: ''
})

const getOperator = () => {
  const user = getAuthUser<Record<string, unknown>>()
  return user ? String(user.realName || user.username || '平台管理员') : '平台管理员'
}

const loadData = () => {
  loading.value = true
  try {
    if (isEdit.value && editId.value) {
      const customer = findPlatformCustomerById(editId.value)
      if (!customer) {
        ElMessage.error('客户资料不存在')
        router.push('/platform/customer')
        return
      }
      Object.assign(form, {
        platformUser: customer.platformUser || '否',
        settlementPeriod: customer.settlementPeriod ?? 0,
        recordStatus: customer.recordStatus || '否',
        recordDate: customer.recordDate || '',
        remark2: customer.remark2 || '',
        remark3: customer.remark3 || '',
        remark4: customer.remark4 || '',
        remark5: customer.remark5 || ''
      })
      return
    }

    const draft = loadPlatformCustomerDraft()
    if (!draft) {
      ElMessage.warning('请先在客户资料页填写基本信息')
      router.push('/platform/customer/create')
      return
    }
    Object.assign(form, {
      platformUser: draft.form.platformUser || '否',
      settlementPeriod: Number(draft.form.settlementPeriod) || 0,
      recordStatus: draft.form.recordStatus || '否',
      recordDate: draft.form.recordDate || '',
      remark2: draft.form.remark2 || '',
      remark3: draft.form.remark3 || '',
      remark4: draft.form.remark4 || '',
      remark5: draft.form.remark5 || ''
    })
  } finally {
    loading.value = false
  }
}

const handleSave = () => {
  saving.value = true
  try {
    if (isEdit.value && editId.value) {
      const list = loadPlatformCustomerList()
      const index = list.findIndex(item => String(item.id) === editId.value)
      if (index === -1) {
        ElMessage.error('客户资料不存在')
        return
      }
      const existing = list[index]
      const mergedForm = {
        ...platformCustomerToForm(existing),
        ...form
      }
      const today = formatToday()
      const operator = getOperator()
      list[index] = buildPlatformCustomerFromForm(mergedForm, existing.documents, existing, {
        operator,
        today
      })
      savePlatformCustomerList(list)
      ElMessage.success('招商信息保存成功')
      return
    }

    const draft = loadPlatformCustomerDraft()
    if (!draft) {
      ElMessage.warning('草稿已失效，请返回客户资料页重新填写')
      router.push('/platform/customer/create')
      return
    }
    savePlatformCustomerDraft({
      form: { ...draft.form, ...form },
      documents: draft.documents
    })
    ElMessage.success('招商信息已暂存，返回客户资料页后请一并保存')
  } finally {
    saving.value = false
  }
}

onMounted(loadData)

const handleBack = () => {
  layoutNavigateBack()
}
</script>

<template>
  <div class="page-container profile-page-primary-btn">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="handleBack">返回</el-button>
        <div>
          <h1>招商信息</h1>
          <div class="breadcrumb">
            首页 / 平台管理 / 平台客户资料 / {{ isEdit ? '编辑' : '新增' }} / 招商信息
          </div>
        </div>
      </div>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </div>

    <div v-loading="loading" class="form-card">
      <div class="card-title">招商信息</div>
      <el-form label-width="140px" class="company-form">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="平台用户">
              <el-select v-model="form.platformUser" style="width: 100%;">
                <el-option label="是" value="是" />
                <el-option label="否" value="否" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结算期限(天)">
              <el-input-number v-model="form.settlementPeriod" :min="0" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="平台备案">
              <el-select v-model="form.recordStatus" style="width: 100%;">
                <el-option label="是" value="是" />
                <el-option label="否" value="否" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="备案日期">
              <el-date-picker
                v-model="form.recordDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择备案日期"
                style="width: 100%;"
                :disabled="form.recordStatus !== '是'"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注2">
              <el-input v-model="form.remark2" type="textarea" :rows="2" placeholder="备注2" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注3">
              <el-input v-model="form.remark3" type="textarea" :rows="2" placeholder="备注3" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注4">
              <el-input v-model="form.remark4" type="textarea" :rows="2" placeholder="备注4" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注5">
              <el-input v-model="form.remark5" type="textarea" :rows="2" placeholder="备注5" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/company-profile-page.scss';

.page-header {
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
</style>
