<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import PartnerLicenseSections from '@/components/partner/PartnerLicenseSections.vue'
import {
  createDefaultPartnerDocuments,
  findExpiredPartnerDocuments,
  normalizePartnerDocuments,
  syncPartnerDocumentStatus
} from '@/utils/partnerLicenseDocuments'
import { buildPlatformCustomerFromForm, platformCustomerToForm } from '@/utils/platformCustomerFormService'
import {
  getPlatformCustomerFormPath,
  loadPlatformCustomerDraft,
  savePlatformCustomerDraft
} from '@/utils/platformCustomerDraftStore'
import {
  findPlatformCustomerById,
  formatToday,
  loadPlatformCustomerList,
  savePlatformCustomerList,
  type PlatformCustomerDocument
} from '@/utils/platformCustomerStore'

const router = useRouter()
const route = useRoute()

const saving = ref(false)
const loading = ref(false)

const isEdit = computed(() => route.path.includes('/edit/'))
const editId = computed(() => route.params.id as string)
const backPath = computed(() => getPlatformCustomerFormPath(isEdit.value, editId.value))

const companyType = ref('')
const documents = ref<PlatformCustomerDocument[]>(createDefaultPartnerDocuments())

const getOperator = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  return user.realName || user.username || '平台管理员'
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
      companyType.value = customer.companyType
      documents.value = normalizePartnerDocuments(customer.documents, customer.companyType)
      return
    }

    const draft = loadPlatformCustomerDraft()
    if (!draft) {
      ElMessage.warning('请先在客户资料页填写基本信息')
      router.push('/platform/customer/create')
      return
    }
    companyType.value = String(draft.form.companyType || '')
    documents.value = normalizePartnerDocuments(
      draft.documents,
      String(draft.form.companyType || '')
    )
  } finally {
    loading.value = false
  }
}

watch(companyType, type => {
  if (!type) return
  documents.value = normalizePartnerDocuments(documents.value, type)
})

const handleSave = () => {
  saving.value = true
  try {
    const syncedDocuments = syncPartnerDocumentStatus(documents.value)
    const expiredDocs = findExpiredPartnerDocuments(syncedDocuments)
    if (expiredDocs.length > 0) {
      ElMessage.error(`存在 ${expiredDocs.length} 项已过期证照，请更新后再保存`)
      return
    }

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
        companyType: companyType.value
      }
      const today = formatToday()
      const operator = getOperator()
      list[index] = buildPlatformCustomerFromForm(mergedForm, syncedDocuments, existing, {
        operator,
        today
      })
      savePlatformCustomerList(list)
      documents.value = syncedDocuments
      ElMessage.success('企业证照保存成功')
      return
    }

    const draft = loadPlatformCustomerDraft()
    if (!draft) {
      ElMessage.warning('草稿已失效，请返回客户资料页重新填写')
      router.push('/platform/customer/create')
      return
    }
    savePlatformCustomerDraft({
      form: { ...draft.form, companyType: companyType.value },
      documents: syncedDocuments
    })
    documents.value = syncedDocuments
    ElMessage.success('企业证照已暂存，返回客户资料页后请一并保存')
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="page-container profile-page-primary-btn">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="router.push(backPath)">返回</el-button>
        <div>
          <h1>企业证照</h1>
          <div class="breadcrumb">
            首页 / 平台管理 / 平台客户资料 / {{ isEdit ? '编辑' : '新增' }} / 企业证照
          </div>
        </div>
      </div>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </div>

    <div v-loading="loading" class="form-card license-card">
      <div class="card-title">企业证照</div>
      <PartnerLicenseSections
        v-model:company-type="companyType"
        :documents="documents"
        variant="platform"
      />
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

.license-card {
  overflow: hidden;
}
</style>
