<script setup lang="ts">
import { ref, computed, onMounted, onActivated, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, OfficeBuilding, Briefcase, Postcard } from '@element-plus/icons-vue'
import {
  createDefaultPartnerDocuments,
  findExpiredPartnerDocuments,
  normalizePartnerDocuments,
  syncPartnerDocumentStatus
} from '@/utils/partnerLicenseDocuments'
import {
  buildPlatformCustomerFromForm,
  createEmptyPlatformCustomerForm,
  getPlatformCustomerFieldSelectOptions,
  getPlatformCustomerFormKey,
  getTenantEditableFieldDefs,
  isFullWidthField,
  isPlatformCustomerReadOnlyField,
  platformCustomerToForm,
  syncCompanyFieldFormatFromPlatform,
  validatePlatformCustomerByFieldDefs
} from '@/utils/platformCustomerFormService'
import {
  clearPlatformCustomerDraft,
  getPlatformCustomerInvestmentPath,
  getPlatformCustomerLicensePath,
  loadPlatformCustomerDraft,
  savePlatformCustomerDraft
} from '@/utils/platformCustomerDraftStore'
import {
  findPlatformCustomerById,
  formatToday,
  getNextPlatformCustomerCode,
  loadPlatformCustomerList,
  savePlatformCustomerList,
  type PlatformCustomer,
  type PlatformCustomerDocument
} from '@/utils/platformCustomerStore'
import { isPlatformProductAdmin, requirePlatformProductAdmin } from '@/utils/userPermission'
import type { PlatformFieldDef } from '@/utils/platformFieldStore'
import { useLayoutNavigateBack } from '@/composables/useLayoutNavigateBack'

const router = useRouter()
const route = useRoute()
const layoutNavigateBack = useLayoutNavigateBack()

const isEdit = computed(() => route.path.includes('/edit/'))
const editId = computed(() => route.params.id as string)
const canAudit = computed(() => isPlatformProductAdmin())

const platformFields = ref<PlatformFieldDef[]>([])
const form = ref<Record<string, unknown>>(createEmptyPlatformCustomerForm())
const documents = ref<PlatformCustomerDocument[]>(createDefaultPartnerDocuments())
const introSectionRef = ref<HTMLElement | null>(null)

const companyType = computed(() => String(form.value.companyType || ''))
const platformStatus = computed(
  () => String(form.value.platformStatus || 'platformNotAudited') as PlatformCustomer['platformStatus']
)

const quickEntryItems = [
  {
    key: 'intro',
    label: '企业简介',
    desc: '见下方客户资料、企业介绍，可直接编辑',
    icon: OfficeBuilding,
    tone: 'intro'
  },
  {
    key: 'investment',
    label: '招商信息',
    desc: '平台用户、备案与招商备注',
    icon: Briefcase,
    tone: 'investment'
  },
  {
    key: 'license',
    label: '企业证照',
    desc: '证照资料上传与有效期管理',
    icon: Postcard,
    tone: 'license'
  }
] as const

const refreshFieldLayout = () => {
  platformFields.value = getTenantEditableFieldDefs()
}

const loadCreateState = () => {
  const draft = loadPlatformCustomerDraft()
  if (draft) {
    form.value = draft.form
    documents.value = normalizePartnerDocuments(
      draft.documents,
      String(draft.form.companyType || '')
    )
    return
  }

  form.value = createEmptyPlatformCustomerForm()
  form.value.companyCode = getNextPlatformCustomerCode(loadPlatformCustomerList())
  documents.value = createDefaultPartnerDocuments()
}

const restoreCreateDraft = () => {
  const draft = loadPlatformCustomerDraft()
  if (!draft) return
  form.value = draft.form
  documents.value = normalizePartnerDocuments(
    draft.documents,
    String(draft.form.companyType || '')
  )
}

onMounted(() => {
  syncCompanyFieldFormatFromPlatform()
  refreshFieldLayout()

  if (isEdit.value && editId.value) {
    const customer = findPlatformCustomerById(editId.value)
    if (!customer) {
      ElMessage.error('客户资料不存在')
      router.push('/platform/customer')
      return
    }
    form.value = platformCustomerToForm(customer)
    documents.value = normalizePartnerDocuments(customer.documents, customer.companyType)
    return
  }

  loadCreateState()
})

onActivated(() => {
  if (!isEdit.value) {
    restoreCreateDraft()
  }
})

watch(companyType, type => {
  if (!type) return
  form.value.companyCategory = getCompanyCategory(type)
  documents.value = normalizePartnerDocuments(documents.value, type)
})

const getOperator = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  return user.realName || user.username || '平台管理员'
}

const syncDocumentStatus = () => {
  documents.value = syncPartnerDocumentStatus(documents.value)
}

const handleQuickEntryClick = (item: (typeof quickEntryItems)[number]) => {
  if (item.key === 'intro') {
    introSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  if (!isEdit.value) {
    savePlatformCustomerDraft({
      form: form.value,
      documents: documents.value
    })
  }

  if (item.key === 'investment') {
    router.push(getPlatformCustomerInvestmentPath(isEdit.value, editId.value))
    return
  }

  if (item.key === 'license') {
    router.push(getPlatformCustomerLicensePath(isEdit.value, editId.value))
  }
}

const handleSave = () => {
  const validationError = validatePlatformCustomerByFieldDefs(form.value, platformFields.value)
  if (validationError) {
    ElMessage.warning(validationError)
    return
  }

  const list = loadPlatformCustomerList()
  if (!isEdit.value) {
    form.value.companyCode = getNextPlatformCustomerCode(list)
  }

  syncDocumentStatus()
  const expiredDocs = findExpiredPartnerDocuments(documents.value)
  if (expiredDocs.length > 0) {
    ElMessage.error(`存在 ${expiredDocs.length} 项已过期证照，请更新后再保存`)
    return
  }

  const today = formatToday()
  const operator = getOperator()
  const existing =
    isEdit.value && editId.value ? list.find(item => String(item.id) === editId.value) : undefined
  const record = buildPlatformCustomerFromForm(form.value, documents.value, existing, {
    operator,
    today
  })

  if (isEdit.value && editId.value) {
    const index = list.findIndex(item => String(item.id) === editId.value)
    if (index === -1) {
      ElMessage.error('客户资料不存在')
      return
    }
    list[index] = record
    savePlatformCustomerList(list)
    ElMessage.success('修改成功')
    router.push('/platform/customer')
    return
  }

  list.unshift(record)
  savePlatformCustomerList(list)
  clearPlatformCustomerDraft()
  ElMessage.success('新增成功')
  router.push('/platform/customer')
}

const handleAuditToggle = async () => {
  if (!requirePlatformProductAdmin('审核客户资料')) return

  const isApproved = platformStatus.value === 'platformAudited'
  try {
    await ElMessageBox.confirm(
      isApproved ? '确定反审核该客户资料吗？' : '确定审核通过该客户资料吗？',
      isApproved ? '反审核确认' : '审核确认',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    form.value.platformStatus = isApproved ? 'platformNotAudited' : 'platformAudited'
    ElMessage.success(isApproved ? '已反审核' : '审核通过')
  } catch {
    // 用户取消
  }
}

const handleBack = () => {
  layoutNavigateBack()
}
</script>

<template>
  <div class="page-container profile-page-primary-btn">
    <div class="page-header">
      <div class="page-info">
        <h1>{{ isEdit ? '编辑平台客户资料' : '平台客户资料增加' }}</h1>
        <div class="breadcrumb">
          首页 / 平台管理 / 平台客户资料 / {{ isEdit ? '编辑' : '新增' }}
        </div>
        <div class="format-tip">表单字段格式与「公司资料设定」同步（平台资料字段目录）</div>
      </div>
      <div class="page-actions">
        <el-button :icon="ArrowLeft" @click="handleBack">返回</el-button>
        <el-button
          v-if="canAudit"
          :type="platformStatus === 'platformAudited' ? 'warning' : 'success'"
          @click="handleAuditToggle"
        >
          {{ platformStatus === 'platformAudited' ? '反审核' : '审核' }}
        </el-button>
        <el-button @click="handleBack">取消</el-button>
        <el-button type="primary" @click="handleSave">{{ isEdit ? '保存修改' : '保存' }}</el-button>
      </div>
    </div>

    <div class="summary-card">
      <div class="summary-item">
        <span class="label">公司名称</span>
        <span class="value">{{ String(form.companyName || '').trim() || '未填写' }}</span>
      </div>
      <div class="summary-item summary-item-status">
        <span class="label">平台审核状态</span>
        <el-tag :type="platformStatus === 'platformAudited' ? 'success' : 'warning'" size="small">
          {{ platformStatus === 'platformAudited' ? '已审核' : '未审核' }}
        </el-tag>
      </div>
    </div>

    <div class="quick-entry-card">
      <div class="card-title">快捷入口</div>
      <div class="quick-entry-row">
        <div
          v-for="item in quickEntryItems"
          :key="item.key"
          class="quick-entry-item"
          @click="handleQuickEntryClick(item)"
        >
          <div class="quick-entry-icon" :class="item.tone">
            <el-icon><component :is="item.icon" /></el-icon>
          </div>
          <div class="quick-entry-text">
            <div class="quick-entry-label">{{ item.label }}</div>
            <div class="quick-entry-desc">{{ item.desc }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="form-card">
      <div class="card-title">客户资料</div>
      <el-form :model="form" label-width="140px" class="company-form">
        <el-row :gutter="16">
          <el-col
            v-for="field in platformFields"
            :key="field.fieldCode"
            :span="isFullWidthField(field) ? 24 : 12"
          >
            <el-form-item :required="field.isRequired">
              <template #label>
                <span>{{ field.fieldName }}</span>
              </template>

              <el-input
                v-if="isPlatformCustomerReadOnlyField(field.fieldCode)"
                :model-value="String(form[getPlatformCustomerFormKey(field.fieldCode)] || '')"
                disabled
              />

              <el-select
                v-else-if="field.fieldType === 'select' || field.fieldCode === 'companyType' || field.fieldCode === 'status'"
                v-model="form[getPlatformCustomerFormKey(field.fieldCode)]"
                :placeholder="`请选择${field.fieldName}`"
                style="width: 100%;"
                clearable
              >
                <el-option
                  v-for="opt in getPlatformCustomerFieldSelectOptions(field)"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>

              <el-input
                v-else-if="field.fieldType === 'textarea'"
                v-model="form[getPlatformCustomerFormKey(field.fieldCode)]"
                type="textarea"
                :rows="2"
                :maxlength="field.length ? Number(field.length) : undefined"
                show-word-limit
              />

              <el-input
                v-else-if="field.fieldType === 'number'"
                v-model="form[getPlatformCustomerFormKey(field.fieldCode)]"
                :maxlength="field.length ? Number(field.length) : undefined"
              />

              <el-date-picker
                v-else-if="field.fieldType === 'date'"
                v-model="form[getPlatformCustomerFormKey(field.fieldCode)]"
                type="date"
                value-format="YYYY-MM-DD"
                style="width: 100%;"
              />

              <el-date-picker
                v-else-if="field.fieldType === 'datetime'"
                v-model="form[getPlatformCustomerFormKey(field.fieldCode)]"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />

              <el-switch
                v-else-if="field.fieldType === 'boolean'"
                v-model="form[getPlatformCustomerFormKey(field.fieldCode)]"
              />

              <el-input
                v-else
                v-model="form[getPlatformCustomerFormKey(field.fieldCode)]"
                :maxlength="field.length ? Number(field.length) : undefined"
                :placeholder="field.remark || `请输入${field.fieldName}`"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <div ref="introSectionRef" class="intro-card">
      <div class="card-title">企业介绍</div>
      <el-input
        v-model="form.companyIntro"
        type="textarea"
        :rows="6"
        maxlength="2000"
        show-word-limit
        placeholder="请填写企业简介、主营业务、服务优势等信息，便于合作方了解该客户"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/company-profile-page.scss';
</style>
