<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import PartnerLicenseSections from '@/components/partner/PartnerLicenseSections.vue'
import PlatformVipBadge from '@/components/customer/PlatformVipBadge.vue'
import CollaborationOnlineBadge from '@/components/customer/CollaborationOnlineBadge.vue'
import { usePartnerProfileQuickEntry } from '@/composables/usePartnerProfileQuickEntry'
import {
  createDefaultPartnerDocuments,
  findExpiredPartnerDocuments,
  normalizePartnerDocuments,
  syncPartnerDocumentStatus
} from '@/utils/partnerLicenseDocuments'
import {
  deleteCustomer,
  getCustomerById,
  getCurrentUserName,
  getNextCustomerCode,
  loadAndEnsureCustomerList,
  loadCustomerList,
  saveCustomerRecord,
  type CustomerDocument,
  type CustomerMaster
} from '@/utils/customerStore'
import { isProductAuditor } from '@/utils/userPermission'
import { isLoggedIn } from '@/utils/authSession'
import { useLayoutNavigateBack } from '@/composables/useLayoutNavigateBack'
import { isPlatformOperator } from '@/utils/customerProductService'
import PlatformCustomerImportDialog from '@/components/customer/PlatformCustomerImportDialog.vue'
import { applyPlatformCustomerToCustomerForm } from '@/utils/platformCustomerImportService'
import { loadPlatformCustomerList, type PlatformCustomer } from '@/utils/platformCustomerStore'
import { resolveLockedPartnerPlatformCode } from '@/utils/partnerPlatformCode'

const router = useRouter()
const route = useRoute()
const layoutNavigateBack = useLayoutNavigateBack()

const isEdit = ref(false)
const customerId = ref('')
const CUSTOMER_CREATE_DRAFT_KEY = 'customer-create-draft'

const customerTypeOptions = [
  { label: '医院', value: 'hospital' },
  { label: '诊所', value: 'clinic' },
  { label: '药店', value: 'pharmacy' },
  { label: '医疗器械公司', value: 'deviceCompany' },
  { label: '其他', value: 'other' }
]

const customerTypeLabels = Object.fromEntries(
  customerTypeOptions.map(item => [item.value, item.label])
)

const createEmptyCustomerForm = () => ({
  id: `CU${Date.now().toString().slice(-8)}`,
  name: '',
  shortName: '',
  pinyin: '',
  type: '',
  taxRate: 0,
  creditCode: '',
  bankName: '',
  bankBranchNo: '',
  bankAccount: '',
  country: '中国',
  province: '',
  city: '',
  district: '',
  address: '',
  postalCode: '',
  platformUser: '否',
  settlementPeriod: 0,
  contact: '',
  mobile: '',
  email: '',
  phone: '',
  enterpriseLeader: '',
  idCard: '',
  leaderPhone: '',
  website: '',
  companyIntro: '',
  legalPerson: '',
  registerCapital: '',
  businessScope: '',
  establishDate: '',
  recordStatus: '否',
  recordDate: '',
  license: '',
  licenseExpire: '',
  taxNo: '',
  remark: '',
  remark2: '',
  remark3: '',
  remark4: '',
  remark5: '',
  platformCustomerId: undefined as number | undefined,
  auditStatus: 'notAudited' as 'notAudited' | 'audited',
  auditTime: '',
  auditor: ''
})

const form = reactive(createEmptyCustomerForm())

const canAudit = computed(() => isProductAuditor())
const auditStatus = computed(() => form.auditStatus)
const auditTime = computed(() => form.auditTime)
const auditor = computed(() => form.auditor)

const documents = ref<CustomerDocument[]>(createDefaultPartnerDocuments())
const basicSectionRef = ref<HTMLElement | null>(null)
const showPlatformImportDialog = ref(false)

const {
  PARTNER_PROFILE_QUICK_ENTRY_ITEMS,
  introSectionRef,
  investmentSectionRef,
  licenseSectionRef,
  scrollToSection
} = usePartnerProfileQuickEntry()

onMounted(() => {
  const id = route.params.id
  if (id) {
    isEdit.value = true
    customerId.value = id as string
    loadCustomerData(id as string)
  } else if (!restoreDraft()) {
    Object.assign(form, createEmptyCustomerForm())
    form.id = getNextCustomerCode(loadAndEnsureCustomerList())
  }
  watch([form, documents], saveDraft, { deep: true })
})

const saveDraft = () => {
  if (isEdit.value) return
  sessionStorage.setItem(
    CUSTOMER_CREATE_DRAFT_KEY,
    JSON.stringify({
      form: { ...form },
      documents: documents.value
    })
  )
}

const restoreDraft = (): boolean => {
  const raw = sessionStorage.getItem(CUSTOMER_CREATE_DRAFT_KEY)
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as {
      form?: Record<string, unknown>
      documents?: CustomerDocument[]
    }
    Object.assign(form, createEmptyCustomerForm(), parsed.form || {})
    documents.value = normalizePartnerDocuments(parsed.documents || [], String(form.type || ''))
    return true
  } catch {
    return false
  }
}

const clearDraft = () => {
  sessionStorage.removeItem(CUSTOMER_CREATE_DRAFT_KEY)
}

const loadCustomerData = (id: string) => {
  const customer = getCustomerById(id)
  if (!customer) {
    ElMessage.error('客户不存在')
    router.push('/data/customer')
    return
  }

  Object.assign(form, {
    id: customer.code || customer.id,
    platformCustomerId: customer.platformCustomerId,
    name: customer.name,
    shortName: customer.shortName || '',
    pinyin: customer.pinyin || '',
    type: customer.type,
    taxRate: customer.taxRate ?? 0,
    creditCode: customer.creditCode || '',
    bankName: customer.bankName || '',
    bankBranchNo: customer.bankBranchNo || '',
    bankAccount: customer.bankAccount || '',
    country: customer.country || '中国',
    province: customer.province || '',
    city: customer.city || '',
    district: customer.district || '',
    address: customer.address || '',
    postalCode: customer.postalCode || '',
    platformUser: customer.platformUser || '否',
    settlementPeriod: customer.settlementPeriod ?? 0,
    contact: customer.contact,
    mobile: customer.mobile || '',
    email: customer.email || '',
    phone: customer.phone || '',
    enterpriseLeader: customer.enterpriseLeader || customer.legalPerson || '',
    idCard: customer.idCard || '',
    leaderPhone: customer.leaderPhone || '',
    website: customer.website || '',
    companyIntro: customer.companyIntro || '',
    legalPerson: customer.legalPerson || '',
    registerCapital: customer.registerCapital || '',
    businessScope: customer.businessScope || '',
    establishDate: customer.establishDate || '',
    recordStatus: customer.recordStatus || '否',
    recordDate: customer.recordDate || '',
    license: customer.license || '',
    licenseExpire: customer.licenseExpire || '',
    taxNo: customer.taxNo || customer.creditCode || '',
    remark: customer.remark || '',
    remark2: customer.remark2 || '',
    remark3: customer.remark3 || '',
    remark4: customer.remark4 || '',
    remark5: customer.remark5 || '',
    auditStatus: customer.auditStatus || 'notAudited',
    auditTime: customer.auditTime || '',
    auditor: customer.auditor || ''
  })

  documents.value = normalizePartnerDocuments(customer.documents, customer.type)
}

watch(
  () => form.type,
  type => {
    documents.value = normalizePartnerDocuments(documents.value, type)
  }
)

const resolveCustomerPlatformCode = (): string => {
  const existing = isEdit.value ? getCustomerById(customerId.value) : undefined
  return resolveLockedPartnerPlatformCode({
    existingCode: existing?.code,
    platformCustomerId: form.platformCustomerId,
    draftCode: form.id,
    usedCodes: loadCustomerList().map(item => item.code || item.id),
    lookupPlatformCode: platformId =>
      loadPlatformCustomerList().find(item => item.id === platformId)?.companyCode
  })
}

const buildCustomerRecord = (): CustomerMaster => {
  const creator = getCurrentUserName()
  const existing = isEdit.value ? getCustomerById(customerId.value) : undefined
  const now = new Date().toLocaleString('zh-CN')
  const isAudited = form.auditStatus === 'audited'
  const displayCode = resolveCustomerPlatformCode()
  form.id = displayCode
  const internalId = existing?.id || `CU${Date.now().toString().slice(-8)}`

  return {
    id: internalId,
    code: displayCode,
    platformCustomerId: form.platformCustomerId,
    name: form.name,
    shortName: form.shortName,
    pinyin: form.pinyin,
    contact: form.contact,
    phone: form.phone,
    mobile: form.mobile,
    email: form.email,
    type: form.type,
    taxRate: form.taxRate,
    address: form.address,
    province: form.province,
    city: form.city,
    district: form.district,
    country: form.country,
    postalCode: form.postalCode,
    creditCode: form.creditCode,
    bankName: form.bankName,
    bankBranchNo: form.bankBranchNo,
    bankAccount: form.bankAccount,
    taxNo: form.taxNo || form.creditCode,
    platformUser: form.platformUser,
    settlementPeriod: form.settlementPeriod,
    enterpriseLeader: form.enterpriseLeader,
    idCard: form.idCard,
    leaderPhone: form.leaderPhone,
    website: form.website,
    companyIntro: form.companyIntro,
    legalPerson: form.legalPerson || form.enterpriseLeader,
    registerCapital: form.registerCapital,
    businessScope: form.businessScope,
    establishDate: form.establishDate,
    recordStatus: form.recordStatus,
    recordDate: form.recordDate,
    license: form.license,
    licenseExpire: form.licenseExpire,
    remark: form.remark,
    remark2: form.remark2,
    remark3: form.remark3,
    remark4: form.remark4,
    remark5: form.remark5,
    auditStatus: isAudited ? 'audited' : 'notAudited',
    status: existing?.status || 'normal',
    createTime: existing?.createTime || new Date().toISOString().slice(0, 10),
    creator: existing?.creator || creator,
    auditTime: isAudited ? form.auditTime || now : '',
    auditor: isAudited ? form.auditor || creator : '',
    documents: documents.value.map((doc): CustomerDocument => ({ ...doc }))
  }
}

const syncDocumentStatus = () => {
  documents.value = syncPartnerDocumentStatus(documents.value)
}

const customerCodeOf = (value: { id?: string; code?: string }) =>
  String(value.code || value.id || '').trim()

const validateFormForSave = (scrollToBasic: () => void): boolean => {
  const code = resolveCustomerPlatformCode()
  form.id = code
  if (!code) {
    ElMessage.warning('医享平台编号未生成，请刷新页面后重试')
    scrollToBasic()
    return false
  }
  if (!isEdit.value) {
    const duplicate = loadCustomerList().find(item => customerCodeOf(item) === code)
    if (duplicate) {
      ElMessage.warning('医享平台编号已存在，请刷新页面后重试')
      scrollToBasic()
      return false
    }
  }
  if (!form.name) {
    ElMessage.warning('请输入客户名称')
    scrollToBasic()
    return false
  }
  if (!form.type) {
    ElMessage.warning('请选择客户类型')
    scrollToBasic()
    return false
  }
  if (!form.contact) {
    ElMessage.warning('请输入联系人')
    scrollToBasic()
    return false
  }
  if (!form.phone && !form.mobile) {
    ElMessage.warning('请输入联系电话或手机')
    scrollToBasic()
    return false
  }
  return true
}

const persistCustomer = async (): Promise<boolean> => {
  syncDocumentStatus()
  const expiredDocs = findExpiredPartnerDocuments(documents.value).filter(doc =>
    String(doc.docNo || '').trim()
  )
  if (expiredDocs.length > 0) {
    ElMessage.error(`存在 ${expiredDocs.length} 项已过期证照，请更新后再保存`)
    scrollToSection('license')
    return false
  }

  const record = buildCustomerRecord()
  if (isEdit.value && customerId.value !== record.id) {
    deleteCustomer(customerId.value)
  }

  const synced = await saveCustomerRecord(record)
  if (!synced && isLoggedIn()) {
    ElMessage.info('客户已保存到本地，后台同步服务器中')
  }
  return true
}

const handleSave = async () => {
  const scrollToBasic = () => {
    basicSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!validateFormForSave(scrollToBasic)) return
  const saved = await persistCustomer()
  if (!saved) return

  clearDraft()
  ElMessage.success(isEdit.value ? '修改成功' : '新增成功')
  router.push('/data/customer')
}

const handleAuditToggle = async () => {
  if (!canAudit.value) {
    ElMessage.warning('您没有客户审核权限')
    return
  }

  const isAudited = auditStatus.value === 'audited'
  try {
    await ElMessageBox.confirm(
      isAudited ? '确定取消该客户的审核状态吗？' : '确定审核通过该客户吗？',
      isAudited ? '取消审核确认' : '审核确认',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    const operator = getCurrentUserName()
    const now = new Date().toLocaleString('zh-CN')
    if (isAudited) {
      form.auditStatus = 'notAudited'
      form.auditTime = ''
      form.auditor = ''
    } else {
      form.auditStatus = 'audited'
      form.auditTime = now
      form.auditor = operator
    }

    const scrollToBasic = () => {
      basicSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    if (validateFormForSave(scrollToBasic)) {
      const saved = await persistCustomer()
      if (saved) {
        clearDraft()
        ElMessage.success(isAudited ? '已取消审核并已保存' : '审核通过并已保存')
        if (!isEdit.value) {
          isEdit.value = true
          customerId.value = form.id.trim()
        }
        return
      }
      return
    }

    ElMessage.success(isAudited ? '已取消审核，请完善资料后保存' : '审核通过，请完善资料后保存')
  } catch {
    // 用户取消
  }
}

const handleBack = () => {
  saveDraft()
  layoutNavigateBack()
}

const handleRefresh = async () => {
  if (isEdit.value && customerId.value) {
    loadCustomerData(customerId.value)
    ElMessage.success('已刷新')
    return
  }

  try {
    await ElMessageBox.confirm(
      '刷新将清空当前未保存内容，是否继续？',
      '刷新确认',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    clearDraft()
    Object.assign(form, createEmptyCustomerForm())
    documents.value = createDefaultPartnerDocuments()
    ElMessage.success('已刷新')
  } catch {
    // 用户取消
  }
}

const handlePlatformImportConfirm = (customer: PlatformCustomer) => {
  applyPlatformCustomerToCustomerForm(form, customer, docs => {
    documents.value = docs
  })
  ElMessage.success(`已引用平台客户「${customer.companyName}」，请核对后保存`)
}
</script>

<template>
  <div class="page-container profile-page-primary-btn">
    <div class="page-header">
      <div class="page-info">
        <h1>{{ isEdit ? '编辑客户' : '新增客户' }}</h1>
        <div class="breadcrumb">首页 / 资料管理 / 基础资料 / 客户列表 / {{ isEdit ? '编辑' : '新增' }}</div>
        <div class="format-tip">界面布局与「公司资料设定」保持一致，便于统一维护资料</div>
      </div>
      <div class="page-actions">
        <el-button :icon="ArrowLeft" @click="handleBack">返回</el-button>
        <el-button @click="handleRefresh">刷新</el-button>
        <el-button type="primary" @click="handleSave">{{ isEdit ? '保存修改' : '保存' }}</el-button>
      </div>
    </div>

    <div class="summary-card summary-card-customer">
      <div class="summary-item summary-item-primary">
        <span class="label">客户名称</span>
        <div class="summary-name-row">
          <span class="value">{{ form.name.trim() || '未填写' }}</span>
          <CollaborationOnlineBadge :customer="form" />
          <PlatformVipBadge :customer="form" />
        </div>
      </div>
      <div class="summary-item summary-item-status">
        <span class="label">审核状态</span>
        <div class="audit-status-row">
          <el-tag
            :class="auditStatus === 'audited' ? 'audit-tag-done' : 'audit-tag-pending'"
            size="small"
          >
            {{ auditStatus === 'audited' ? '已审核' : '未审核' }}
          </el-tag>
        </div>
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

    <div ref="basicSectionRef" class="form-card">
      <div class="card-title">客户资料</div>
      <el-form :model="form" label-width="140px" class="company-form">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="医享平台编号" required>
              <el-input
                v-model="form.id"
                placeholder="系统自动分配，与资料绑定锁定"
                disabled
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户名称" required>
              <div class="customer-name-row">
                <el-input v-model="form.name" placeholder="请输入客户名称" />
                <el-button
                  v-if="!isPlatformOperator()"
                  type="primary"
                  plain
                  class="import-btn"
                  @click="showPlatformImportDialog = true"
                >
                  从平台导入
                </el-button>
                <el-button
                  v-if="canAudit"
                  plain
                  :type="auditStatus === 'audited' ? 'danger' : undefined"
                  :class="auditStatus === 'audited' ? 'audit-btn audit-done' : 'audit-btn audit-pending'"
                  @click="handleAuditToggle"
                >
                  {{ auditStatus === 'audited' ? '已审核' : '审核' }}
                </el-button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="公司简称">
              <el-input v-model="form.shortName" placeholder="请输入公司简称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="拼音缩写">
              <el-input v-model="form.pinyin" placeholder="请输入拼音缩写" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户类型" required>
              <el-select v-model="form.type" placeholder="请选择客户类型" style="width: 100%;">
                <el-option v-for="opt in customerTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="税率(%)">
              <el-input-number v-model="form.taxRate" :min="0" :max="100" :precision="2" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="公司税号">
              <el-input v-model="form.creditCode" placeholder="请输入统一社会信用代码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="纳税人识别号">
              <el-input v-model="form.taxNo" placeholder="请输入纳税人识别号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="开户银行">
              <el-input v-model="form.bankName" placeholder="请输入开户银行" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="银行行号">
              <el-input v-model="form.bankBranchNo" placeholder="请输入银行行号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="银行账号">
              <el-input v-model="form.bankAccount" placeholder="请输入银行账号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="国家">
              <el-input v-model="form.country" placeholder="请输入国家" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="省">
              <el-input v-model="form.province" placeholder="请输入省份" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="市">
              <el-input v-model="form.city" placeholder="请输入城市" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="区">
              <el-input v-model="form.district" placeholder="请输入区县" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="详细地址">
              <el-input v-model="form.address" placeholder="请输入详细地址" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮政编码">
              <el-input v-model="form.postalCode" placeholder="请输入邮政编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系人" required>
              <el-input v-model="form.contact" placeholder="请输入联系人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号码">
              <el-input v-model="form.mobile" placeholder="请输入手机号码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="电子邮箱">
              <el-input v-model="form.email" placeholder="请输入邮箱地址" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="固定电话">
              <el-input v-model="form.phone" placeholder="请输入固定电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="企业负责人">
              <el-input v-model="form.enterpriseLeader" placeholder="请输入企业负责人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="身份证号">
              <el-input v-model="form.idCard" placeholder="请输入身份证号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="负责人电话">
              <el-input v-model="form.leaderPhone" placeholder="请输入负责人电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="企业网址">
              <el-input v-model="form.website" placeholder="请输入企业网址" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="法定代表人">
              <el-input v-model="form.legalPerson" placeholder="请输入法定代表人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="注册资本">
              <el-input v-model="form.registerCapital" placeholder="请输入注册资本" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="成立日期">
              <el-date-picker
                v-model="form.establishDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择成立日期"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="经营范围">
              <el-input v-model="form.businessScope" type="textarea" :rows="2" placeholder="请输入经营范围" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
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
      />
    </div>

    <PlatformCustomerImportDialog
      v-if="!isPlatformOperator()"
      v-model="showPlatformImportDialog"
      @confirm="handlePlatformImportConfirm"
    />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/company-profile-page.scss';

.customer-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;

  .el-input {
    flex: 1;
    min-width: 0;
  }

  .import-btn,
  .audit-btn {
    flex-shrink: 0;
  }
}

.summary-card-customer {
  align-items: center;

  .summary-item-primary {
    flex: 1;
    min-width: 0;
  }

  .summary-item-action {
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
  }
}

.summary-item-primary .value {
  font-size: 24px;
  line-height: 1.35;
  font-weight: 700;
  color: #475467;
  word-break: break-all;
}

.summary-name-row {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  max-width: none;
}

.audit-status-row {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

:deep(.audit-tag-pending.el-tag) {
  --el-tag-bg-color: #fef3c7;
  --el-tag-border-color: #fbbf24;
  --el-tag-text-color: #b45309;
}

:deep(.audit-tag-done.el-tag) {
  --el-tag-bg-color: #ffebee;
  --el-tag-border-color: #ef5350;
  --el-tag-text-color: #c62828;
}

:deep(.audit-btn.audit-pending.el-button.is-plain) {
  --el-button-text-color: #b45309;
  --el-button-border-color: #fbbf24;
  --el-button-bg-color: #fef3c7;
  --el-button-hover-text-color: #92400e;
  --el-button-hover-border-color: #f59e0b;
  --el-button-hover-bg-color: #fde68a;
}

:deep(.audit-btn.audit-done.el-button.is-plain) {
  --el-button-text-color: #c62828;
  --el-button-border-color: #ef5350;
  --el-button-bg-color: #ffebee;
  --el-button-hover-text-color: #b71c1c;
  --el-button-hover-border-color: #e53935;
  --el-button-hover-bg-color: #ffcdd2;
}
</style>
