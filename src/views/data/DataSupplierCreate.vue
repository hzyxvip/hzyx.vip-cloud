<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import PartnerLicenseSections from '@/components/partner/PartnerLicenseSections.vue'
import { usePartnerProfileQuickEntry } from '@/composables/usePartnerProfileQuickEntry'
import {
  createDefaultPartnerDocuments,
  findExpiredPartnerDocuments,
  normalizePartnerDocuments,
  syncPartnerDocumentStatus
} from '@/utils/partnerLicenseDocuments'
import { getCurrentUserName } from '@/utils/customerStore'
import { syncSupplierToPlatformCustomer } from '@/utils/partnerPlatformSync'
import {
  companyStatusToSupplierStatus,
  createEmptySupplierForm,
  getSupplierFieldSelectOptions,
  getSupplierFormKey,
  getTenantEditableFieldDefs,
  isFullWidthField,
  isSupplierReadOnlyField,
  supplierMasterToForm,
  syncCompanyFieldFormatFromPlatform,
  validateSupplierByFieldDefs
} from '@/utils/supplierFormService'
import { isProductAuditor } from '@/utils/userPermission'
import type { PlatformFieldDef } from '@/utils/platformFieldStore'
import {
  getSupplierById,
  upsertSupplier,
  type SupplierDocument,
  type SupplierMaster
} from '@/utils/supplierStore'

const router = useRouter()
const route = useRoute()

const isEdit = ref(false)
const supplierId = ref('')
const canAudit = computed(() => isProductAuditor())
const platformFields = ref<PlatformFieldDef[]>([])
const form = ref<Record<string, unknown>>(createEmptySupplierForm())
const documents = ref<SupplierDocument[]>(createDefaultPartnerDocuments())

const supplierType = computed(() => String(form.value.type || ''))
const auditStatus = computed(() => String(form.value.auditStatus || 'notAudited'))
const auditTime = computed(() => String(form.value.auditTime || ''))
const auditor = computed(() => String(form.value.auditor || ''))

const {
  PARTNER_PROFILE_QUICK_ENTRY_ITEMS,
  introSectionRef,
  investmentSectionRef,
  licenseSectionRef,
  scrollToSection
} = usePartnerProfileQuickEntry()

const refreshFieldLayout = () => {
  platformFields.value = getTenantEditableFieldDefs()
}

onMounted(() => {
  syncCompanyFieldFormatFromPlatform()
  refreshFieldLayout()

  const id = route.params.id
  if (id) {
    isEdit.value = true
    supplierId.value = id as string
    loadSupplierData(id as string)
    return
  }

  form.value = createEmptySupplierForm()
  form.value.id = `SUP${Date.now().toString().slice(-8)}`
  documents.value = createDefaultPartnerDocuments()
})

const loadSupplierData = (id: string) => {
  const supplier = getSupplierById(id)
  if (!supplier) {
    ElMessage.error('供应商不存在')
    router.push('/data/supplier')
    return
  }

  form.value = supplierMasterToForm(supplier)
  documents.value = normalizePartnerDocuments(supplier.documents, String(form.value.type || ''))
}

watch(supplierType, type => {
  if (!type) return
  documents.value = normalizePartnerDocuments(documents.value, type)
})

const buildSupplierRecord = (): SupplierMaster => {
  const f = form.value
  const creator = getCurrentUserName()
  const existing = isEdit.value ? getSupplierById(supplierId.value) : undefined
  const now = new Date().toLocaleString('zh-CN')
  const isAudited = String(f.auditStatus) === 'audited'

  return {
    id: String(f.id || ''),
    code: String(f.id || ''),
    name: String(f.name || '').trim(),
    contact: String(f.contact || f.legalPerson || '').trim(),
    phone: String(f.phone || '').trim(),
    mobile: String(f.phone || '').trim(),
    email: String(f.email || '').trim(),
    type: String(f.type || ''),
    address: String(f.address || '').trim(),
    creditCode: String(f.creditCode || '').trim(),
    bankName: String(f.bankName || '').trim(),
    bankAccount: String(f.bankAccount || '').trim(),
    taxNo: String(f.creditCode || '').trim(),
    website: String(f.website || '').trim(),
    legalPerson: String(f.legalPerson || '').trim(),
    license: String(f.license || f.creditCode || '').trim(),
    gspCertificate: String(f.gspCertificate || ''),
    medicalDeviceLicense: String(f.medicalDeviceLicense || ''),
    fax: String(f.fax || ''),
    companyIntro: String(f.companyIntro || '').trim(),
    platformUser: String(f.platformUser || '否'),
    settlementPeriod: Number(f.settlementPeriod) || 0,
    recordStatus: String(f.recordStatus || '否'),
    recordDate: String(f.recordDate || ''),
    remark2: String(f.remark2 || ''),
    remark3: String(f.remark3 || ''),
    remark4: String(f.remark4 || ''),
    remark5: String(f.remark5 || ''),
    auditStatus: isAudited ? 'audited' : 'notAudited',
    status: companyStatusToSupplierStatus(f.companyStatus),
    createTime: existing?.createTime || new Date().toISOString().slice(0, 10),
    creator: existing?.creator || creator,
    auditTime: isAudited ? String(f.auditTime || now) : '',
    auditor: isAudited ? String(f.auditor || creator) : '',
    documents: documents.value.map((doc): SupplierDocument => ({ ...doc }))
  }
}

const syncDocumentStatus = () => {
  documents.value = syncPartnerDocumentStatus(documents.value)
}

const handleSave = () => {
  const validationError = validateSupplierByFieldDefs(form.value, platformFields.value)
  if (validationError) {
    ElMessage.warning(validationError)
    return
  }

  syncDocumentStatus()
  const expiredDocs = findExpiredPartnerDocuments(documents.value)
  if (expiredDocs.length > 0) {
    ElMessage.error(`存在 ${expiredDocs.length} 项已过期证照，请更新后再保存`)
    return
  }

  const record = buildSupplierRecord()
  upsertSupplier(record)
  syncSupplierToPlatformCustomer(record)
  ElMessage.success(isEdit.value ? '修改成功，已同步平台客户资料' : '新增成功，已同步平台客户资料')
  router.push('/data/supplier')
}

const handleAuditToggle = async () => {
  if (!canAudit.value) {
    ElMessage.warning('您没有供应商审核权限')
    return
  }

  const isAudited = auditStatus.value === 'audited'
  try {
    await ElMessageBox.confirm(
      isAudited ? '确定反审核该供应商吗？' : '确定审核通过该供应商吗？',
      isAudited ? '反审核确认' : '审核确认',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    const operator = getCurrentUserName()
    const now = new Date().toLocaleString('zh-CN')
    if (isAudited) {
      form.value.auditStatus = 'notAudited'
      form.value.auditTime = ''
      form.value.auditor = ''
    } else {
      form.value.auditStatus = 'audited'
      form.value.auditTime = now
      form.value.auditor = operator
    }
    ElMessage.success(isAudited ? '已反审核' : '审核通过')
  } catch {
    // 用户取消
  }
}

const handleBack = () => {
  router.push('/data/supplier')
}
</script>

<template>
  <div class="page-container profile-page-primary-btn">
    <div class="page-header">
      <div class="page-info">
        <h1>{{ isEdit ? '编辑供应商' : '新增供应商' }}</h1>
        <div class="breadcrumb">首页 / 资料管理 / 基础资料 / 供应商资料 / {{ isEdit ? '编辑' : '新增' }}</div>
        <div class="format-tip">表单字段格式与「公司资料设定」同步（平台资料字段目录）</div>
      </div>
      <div class="page-actions">
        <el-button :icon="ArrowLeft" @click="handleBack">返回</el-button>
        <el-button
          v-if="canAudit"
          :type="auditStatus === 'audited' ? 'warning' : 'success'"
          @click="handleAuditToggle"
        >
          {{ auditStatus === 'audited' ? '反审核' : '审核' }}
        </el-button>
        <el-button @click="handleBack">取消</el-button>
        <el-button type="primary" @click="handleSave">{{ isEdit ? '保存修改' : '保存' }}</el-button>
      </div>
    </div>

    <div class="summary-card">
      <div class="summary-item">
        <span class="label">供应商名称</span>
        <span class="value">{{ String(form.name || '').trim() || '未填写' }}</span>
      </div>
      <div class="summary-item summary-item-status">
        <span class="label">审核状态</span>
        <el-tag :type="auditStatus === 'audited' ? 'success' : 'warning'" size="small">
          {{ auditStatus === 'audited' ? '已审核' : '未审核' }}
        </el-tag>
        <span v-if="auditStatus === 'audited' && auditor" class="audit-meta">
          {{ auditor }} · {{ auditTime }}
        </span>
      </div>
    </div>

    <div class="quick-entry-card">
      <div class="card-title">快捷入口</div>
      <div class="quick-entry-row">
        <div
          v-for="item in PARTNER_PROFILE_QUICK_ENTRY_ITEMS"
          :key="item.key"
          class="quick-entry-item"
          @click="scrollToSection(item.key)"
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
      <div class="card-title">供应商资料</div>
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
                v-if="isSupplierReadOnlyField(field.fieldCode)"
                :model-value="String(form[getSupplierFormKey(field.fieldCode)] || '')"
                disabled
              />

              <el-select
                v-else-if="field.fieldType === 'select' || field.fieldCode === 'companyType' || field.fieldCode === 'status'"
                v-model="form[getSupplierFormKey(field.fieldCode)]"
                :placeholder="`请选择${field.fieldName}`"
                style="width: 100%;"
                clearable
              >
                <el-option
                  v-for="opt in getSupplierFieldSelectOptions(field)"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>

              <el-input
                v-else-if="field.fieldType === 'textarea'"
                v-model="form[getSupplierFormKey(field.fieldCode)]"
                type="textarea"
                :rows="2"
                :maxlength="field.length ? Number(field.length) : undefined"
                show-word-limit
              />

              <el-input
                v-else-if="field.fieldType === 'number'"
                v-model="form[getSupplierFormKey(field.fieldCode)]"
                :maxlength="field.length ? Number(field.length) : undefined"
              />

              <el-date-picker
                v-else-if="field.fieldType === 'date'"
                v-model="form[getSupplierFormKey(field.fieldCode)]"
                type="date"
                value-format="YYYY-MM-DD"
                style="width: 100%;"
              />

              <el-date-picker
                v-else-if="field.fieldType === 'datetime'"
                v-model="form[getSupplierFormKey(field.fieldCode)]"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />

              <el-switch
                v-else-if="field.fieldType === 'boolean'"
                v-model="form[getSupplierFormKey(field.fieldCode)]"
              />

              <el-input
                v-else
                v-model="form[getSupplierFormKey(field.fieldCode)]"
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
        placeholder="请填写企业简介、主营业务、服务优势等信息，便于合作方了解该供应商"
      />
    </div>

    <div ref="investmentSectionRef" class="form-card">
      <div class="card-title">招商信息</div>
      <el-form :model="form" label-width="140px" class="company-form">
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

    <div ref="licenseSectionRef" class="form-card">
      <div class="card-title">企业证照</div>
      <PartnerLicenseSections
        v-model:company-type="form.type"
        :documents="documents"
        variant="platform"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/company-profile-page.scss';
</style>
