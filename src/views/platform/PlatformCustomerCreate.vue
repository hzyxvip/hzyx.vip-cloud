<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import PartnerProfileFormShell from '@/components/partner/PartnerProfileFormShell.vue'
import PartnerLicenseSections from '@/components/partner/PartnerLicenseSections.vue'
import { DEFAULT_PARTNER_PROFILE_TAB } from '@/constants/partnerProfileTabs'
import {
  createDefaultPartnerDocuments,
  normalizePartnerDocuments
} from '@/utils/partnerLicenseDocuments'
import {
  companyTypeOptions,
  findPlatformCustomerById,
  formatToday,
  getCompanyCategory,
  loadPlatformCustomerList,
  savePlatformCustomerList,
  type PlatformCustomer,
  type PlatformCustomerDocument
} from '@/utils/platformCustomerStore'
import { isPlatformProductAdmin, requirePlatformProductAdmin } from '@/utils/userPermission'

const router = useRouter()
const route = useRoute()

const isEditMode = computed(() => route.path.includes('/edit/'))
const editId = computed(() => route.params.id as string)
const canAudit = computed(() => isPlatformProductAdmin())

const activeTab = ref(DEFAULT_PARTNER_PROFILE_TAB)

const form = reactive({
  companyCode: '',
  companyName: '',
  companyShortName: '',
  companyType: '',
  companyCategory: '',
  pinyin: '',
  taxRate: 0,
  contact: '',
  phone: '',
  mobile: '',
  email: '',
  country: '中国',
  province: '',
  city: '',
  district: '',
  address: '',
  postalCode: '',
  companyIntro: '',
  businessScope: '',
  legalPerson: '',
  registerCapital: '',
  establishDate: '',
  license: '',
  licenseExpire: '',
  taxId: '',
  bank: '',
  bankBranchNo: '',
  bankAccount: '',
  platformUser: '否',
  settlementPeriod: 0,
  enterpriseLeader: '',
  idCard: '',
  leaderPhone: '',
  website: '',
  remark: '',
  remark2: '',
  remark3: '',
  remark4: '',
  remark5: '',
  recordStatus: '否',
  recordDate: '',
  platformStatus: 'platformNotAudited' as PlatformCustomer['platformStatus']
})

const documents = ref<PlatformCustomerDocument[]>(createDefaultPartnerDocuments())

watch(
  () => form.companyType,
  value => {
    form.companyCategory = getCompanyCategory(value)
    documents.value = normalizePartnerDocuments(documents.value, value)
  }
)

const fillForm = (customer: PlatformCustomer) => {
  Object.assign(form, {
    companyCode: customer.companyCode,
    companyName: customer.companyName,
    companyShortName: customer.companyShortName,
    companyType: customer.companyType,
    companyCategory: customer.companyCategory,
    pinyin: customer.pinyin,
    taxRate: customer.taxRate ?? 0,
    contact: customer.contact,
    phone: customer.phone,
    mobile: customer.mobile || '',
    email: customer.email,
    country: customer.country || '中国',
    province: customer.province,
    city: customer.city,
    district: customer.district || '',
    address: customer.address,
    postalCode: customer.postalCode || '',
    companyIntro: customer.companyIntro || '',
    businessScope: customer.businessScope || '',
    legalPerson: customer.legalPerson || '',
    registerCapital: customer.registerCapital || '',
    establishDate: customer.establishDate || '',
    license: customer.license,
    licenseExpire: customer.licenseExpire,
    taxId: customer.taxId,
    bank: customer.bank,
    bankBranchNo: customer.bankBranchNo || '',
    bankAccount: customer.bankAccount,
    platformUser: customer.platformUser || '否',
    settlementPeriod: customer.settlementPeriod ?? 0,
    enterpriseLeader: customer.enterpriseLeader || customer.legalPerson || '',
    idCard: customer.idCard || '',
    leaderPhone: customer.leaderPhone || '',
    website: customer.website || '',
    remark: customer.remark,
    remark2: customer.remark2 || '',
    remark3: customer.remark3 || '',
    remark4: customer.remark4 || '',
    remark5: customer.remark5 || '',
    recordStatus: customer.recordStatus,
    recordDate: customer.recordDate,
    platformStatus: customer.platformStatus
  })

  documents.value = normalizePartnerDocuments(customer.documents, customer.companyType)
}

onMounted(() => {
  if (isEditMode.value && editId.value) {
    const customer = findPlatformCustomerById(editId.value)
    if (!customer) {
      ElMessage.error('客户资料不存在')
      router.push('/platform/customer')
      return
    }
    fillForm(customer)
    return
  }

  form.companyCode = `PC${Date.now().toString().slice(-6)}`
})

const buildRecord = (existing?: PlatformCustomer): PlatformCustomer => {
  const today = formatToday()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const operator = user.realName || user.username || '平台管理员'

  return {
    id: existing?.id ?? Date.now(),
    platformStatus: form.platformStatus,
    companyCode: form.companyCode.trim(),
    companyName: form.companyName.trim(),
    companyShortName: form.companyShortName.trim(),
    companyType: form.companyType,
    companyCategory: form.companyCategory || getCompanyCategory(form.companyType),
    pinyin: form.pinyin.trim(),
    taxRate: form.taxRate,
    contact: form.contact.trim(),
    phone: form.phone.trim(),
    mobile: form.mobile.trim(),
    email: form.email.trim(),
    country: form.country.trim(),
    province: form.province.trim(),
    city: form.city.trim(),
    district: form.district.trim(),
    address: form.address.trim(),
    postalCode: form.postalCode.trim(),
    companyIntro: form.companyIntro.trim(),
    businessScope: form.businessScope.trim(),
    legalPerson: form.legalPerson.trim() || form.enterpriseLeader.trim(),
    registerCapital: form.registerCapital.trim(),
    establishDate: form.establishDate,
    license: form.license.trim(),
    licenseExpire: form.licenseExpire,
    taxId: form.taxId.trim(),
    bank: form.bank.trim(),
    bankBranchNo: form.bankBranchNo.trim(),
    bankAccount: form.bankAccount.trim(),
    settlementPeriod: form.settlementPeriod,
    enterpriseLeader: form.enterpriseLeader.trim(),
    idCard: form.idCard.trim(),
    leaderPhone: form.leaderPhone.trim(),
    website: form.website.trim(),
    documents: documents.value.map(doc => ({ ...doc })),
    platformUser: form.platformUser.trim() || '否',
    createDate: existing?.createDate || today,
    creator: existing?.creator || operator,
    editor: operator,
    editDate: today,
    remark: form.remark.trim(),
    remark2: form.remark2.trim(),
    remark3: form.remark3.trim(),
    remark4: form.remark4.trim(),
    remark5: form.remark5.trim(),
    recordStatus: form.recordStatus,
    recordDate: form.recordStatus === '是' ? form.recordDate || today : ''
  }
}

const validateForm = (): boolean => {
  if (!form.companyCode.trim()) {
    ElMessage.warning('请输入公司代码')
    activeTab.value = 'basic'
    return false
  }
  if (!form.companyName.trim()) {
    ElMessage.warning('请输入公司名称')
    activeTab.value = 'basic'
    return false
  }
  if (!form.companyType) {
    ElMessage.warning('请选择三方类型')
    activeTab.value = 'basic'
    return false
  }
  if (!form.contact.trim()) {
    ElMessage.warning('请输入联系人')
    activeTab.value = 'basic'
    return false
  }
  if (!form.phone.trim()) {
    ElMessage.warning('请输入公司电话')
    activeTab.value = 'basic'
    return false
  }
  return true
}

const handleSave = () => {
  if (!validateForm()) return

  const list = loadPlatformCustomerList()
  const duplicate = list.find(
    item =>
      item.companyCode === form.companyCode.trim() &&
      String(item.id) !== String(editId.value || '')
  )
  if (duplicate) {
    ElMessage.warning('公司代码已存在')
    return
  }

  if (isEditMode.value && editId.value) {
    const index = list.findIndex(item => String(item.id) === editId.value)
    if (index === -1) {
      ElMessage.error('客户资料不存在')
      return
    }
    list[index] = buildRecord(list[index])
    savePlatformCustomerList(list)
    ElMessage.success('修改成功')
    router.push('/platform/customer')
    return
  }

  list.unshift(buildRecord())
  savePlatformCustomerList(list)
  ElMessage.success('新增成功')
  router.push('/platform/customer')
}

const handleAuditToggle = async () => {
  if (!requirePlatformProductAdmin('审核客户资料')) return

  const isApproved = form.platformStatus === 'platformAudited'
  try {
    await ElMessageBox.confirm(
      isApproved ? '确定反审核该客户资料吗？' : '确定审核通过该客户资料吗？',
      isApproved ? '反审核确认' : '审核确认',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    form.platformStatus = isApproved ? 'platformNotAudited' : 'platformAudited'
    ElMessage.success(isApproved ? '已反审核' : '审核通过')
  } catch {
    // 用户取消
  }
}

const handleBack = () => {
  router.push('/platform/customer')
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="handleBack">返回</el-button>
        <h1>{{ isEditMode ? '编辑平台客户资料' : '平台客户资料增加' }}</h1>
      </div>
      <div class="header-right">
        <el-button v-if="canAudit" :type="form.platformStatus === 'platformAudited' ? 'warning' : 'success'" @click="handleAuditToggle">
          {{ form.platformStatus === 'platformAudited' ? '反审核' : '审核' }}
        </el-button>
        <el-button @click="handleBack">取消</el-button>
        <el-button type="primary" @click="handleSave">{{ isEditMode ? '保存修改' : '保存' }}</el-button>
      </div>
    </div>

    <div class="form-card">
      <div class="status-bar">
        <span>平台状态：</span>
        <el-tag :type="form.platformStatus === 'platformAudited' ? 'success' : 'warning'">
          {{ form.platformStatus === 'platformAudited' ? '已审核' : '未审核' }}
        </el-tag>
      </div>

      <PartnerProfileFormShell v-model="activeTab">
        <template #intro>
          <div class="partner-form-grid">
            <el-form-item label="企业介绍" class="span-full">
              <el-input v-model="form.companyIntro" type="textarea" :rows="3" placeholder="请输入企业介绍" />
            </el-form-item>
            <el-form-item label="法定代表人">
              <el-input v-model="form.legalPerson" placeholder="请输入法定代表人" />
            </el-form-item>
            <el-form-item label="注册资本">
              <el-input v-model="form.registerCapital" placeholder="请输入注册资本" />
            </el-form-item>
            <el-form-item label="成立日期">
              <el-date-picker v-model="form.establishDate" type="date" value-format="YYYY-MM-DD" placeholder="选择成立日期" style="width: 100%;" />
            </el-form-item>
            <el-form-item label="经营范围" class="span-full">
              <el-input v-model="form.businessScope" type="textarea" :rows="2" placeholder="请输入经营范围" />
            </el-form-item>
            <el-form-item label="备注" class="span-full">
              <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
            </el-form-item>
          </div>
        </template>

        <template #basic>
          <div class="partner-form-grid">
            <el-form-item label="公司代号" required>
              <el-input v-model="form.companyCode" placeholder="请输入公司代号" />
            </el-form-item>
            <el-form-item label="公司名称" required>
              <el-input v-model="form.companyName" placeholder="请输入公司名称" />
            </el-form-item>
            <el-form-item label="公司简称">
              <el-input v-model="form.companyShortName" placeholder="请输入公司简称" />
            </el-form-item>
            <el-form-item label="拼音缩写">
              <el-input v-model="form.pinyin" placeholder="请输入拼音缩写" />
            </el-form-item>
            <el-form-item label="三方类型" required>
              <el-select v-model="form.companyType" placeholder="请选择全部 / 生产企业 / 经营公司 / 医疗机构" style="width: 100%;">
                <el-option v-for="opt in companyTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="税率(%)">
              <el-input-number v-model="form.taxRate" :min="0" :max="100" :precision="2" style="width: 100%;" />
            </el-form-item>
            <el-form-item label="公司税号">
              <el-input v-model="form.taxId" placeholder="请输入公司税号" />
            </el-form-item>
            <el-form-item label="开户银行">
              <el-input v-model="form.bank" placeholder="请输入开户银行" />
            </el-form-item>
            <el-form-item label="银行行号">
              <el-input v-model="form.bankBranchNo" placeholder="请输入银行行号" />
            </el-form-item>
            <el-form-item label="银行账号">
              <el-input v-model="form.bankAccount" placeholder="请输入银行账号" />
            </el-form-item>
            <el-form-item label="国家">
              <el-input v-model="form.country" placeholder="请输入国家" />
            </el-form-item>
            <el-form-item label="省">
              <el-input v-model="form.province" placeholder="请输入省份" />
            </el-form-item>
            <el-form-item label="市">
              <el-input v-model="form.city" placeholder="请输入城市" />
            </el-form-item>
            <el-form-item label="区">
              <el-input v-model="form.district" placeholder="请输入区县" />
            </el-form-item>
            <el-form-item label="详细地址" class="span-full">
              <el-input v-model="form.address" placeholder="请输入详细地址" />
            </el-form-item>
            <el-form-item label="邮政编码">
              <el-input v-model="form.postalCode" placeholder="请输入邮政编码" />
            </el-form-item>
            <el-form-item label="联系人" required>
              <el-input v-model="form.contact" placeholder="请输入联系人" />
            </el-form-item>
            <el-form-item label="手机号码">
              <el-input v-model="form.mobile" placeholder="请输入手机号码" />
            </el-form-item>
            <el-form-item label="电子邮箱">
              <el-input v-model="form.email" placeholder="请输入电子邮箱" />
            </el-form-item>
            <el-form-item label="固定电话" required>
              <el-input v-model="form.phone" placeholder="请输入固定电话" />
            </el-form-item>
            <el-form-item label="企业负责人">
              <el-input v-model="form.enterpriseLeader" placeholder="请输入企业负责人" />
            </el-form-item>
            <el-form-item label="身份证号">
              <el-input v-model="form.idCard" placeholder="请输入身份证号" />
            </el-form-item>
            <el-form-item label="负责人电话">
              <el-input v-model="form.leaderPhone" placeholder="请输入负责人电话" />
            </el-form-item>
            <el-form-item label="企业网址">
              <el-input v-model="form.website" placeholder="请输入企业网址" />
            </el-form-item>
          </div>
        </template>

        <template #investment>
          <div class="partner-form-grid">
            <el-form-item label="平台用户">
              <el-select v-model="form.platformUser" style="width: 100%;">
                <el-option label="是" value="是" />
                <el-option label="否" value="否" />
              </el-select>
            </el-form-item>
            <el-form-item label="结算期限(天)">
              <el-input-number v-model="form.settlementPeriod" :min="0" style="width: 100%;" />
            </el-form-item>
            <el-form-item label="平台备案">
              <el-select v-model="form.recordStatus" style="width: 100%;">
                <el-option label="是" value="是" />
                <el-option label="否" value="否" />
              </el-select>
            </el-form-item>
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
            <el-form-item label="备注2" class="span-full">
              <el-input v-model="form.remark2" type="textarea" :rows="1" placeholder="备注2" />
            </el-form-item>
            <el-form-item label="备注3" class="span-full">
              <el-input v-model="form.remark3" type="textarea" :rows="1" placeholder="备注3" />
            </el-form-item>
            <el-form-item label="备注4" class="span-full">
              <el-input v-model="form.remark4" type="textarea" :rows="1" placeholder="备注4" />
            </el-form-item>
            <el-form-item label="备注5" class="span-full">
              <el-input v-model="form.remark5" type="textarea" :rows="1" placeholder="备注5" />
            </el-form-item>
          </div>
        </template>

        <template #license>
          <PartnerLicenseSections
            v-model:company-type="form.companyType"
            :documents="documents"
            variant="platform"
          />
        </template>
      </PartnerProfileFormShell>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container {
  padding: 12px 16px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  .header-left,
  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }
}

.form-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

:deep(.el-button--primary) {
  background-color: #00bfa5 !important;
  border-color: #00bfa5 !important;
}
</style>
