<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import PartnerProfileFormShell from '@/components/partner/PartnerProfileFormShell.vue'
import PartnerLicenseSections from '@/components/partner/PartnerLicenseSections.vue'
import { DEFAULT_PARTNER_PROFILE_TAB } from '@/constants/partnerProfileTabs'
import {
  createDefaultPartnerDocuments,
  findExpiredPartnerDocuments,
  normalizePartnerDocuments,
  syncPartnerDocumentStatus
} from '@/utils/partnerLicenseDocuments'
import { getCurrentUserName } from '@/utils/customerStore'
import {
  getSupplierById,
  supplierTypeOptions,
  upsertSupplier,
  type SupplierDocument,
  type SupplierMaster
} from '@/utils/supplierStore'

const router = useRouter()
const route = useRoute()

const isEdit = ref(false)
const supplierId = ref('')
const activeTab = ref(DEFAULT_PARTNER_PROFILE_TAB)

const form = reactive({
  id: '',
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
  remark5: ''
})

const documents = ref<SupplierDocument[]>(createDefaultPartnerDocuments())

onMounted(() => {
  const id = route.params.id
  if (id) {
    isEdit.value = true
    supplierId.value = id as string
    loadSupplierData(id as string)
  } else {
    form.id = `SUP${Date.now().toString().slice(-8)}`
  }
})

const loadSupplierData = (id: string) => {
  const supplier = getSupplierById(id)
  if (!supplier) {
    ElMessage.error('供应商不存在')
    router.push('/data/supplier')
    return
  }

  Object.assign(form, {
    id: supplier.id,
    name: supplier.name,
    shortName: supplier.shortName || '',
    pinyin: supplier.pinyin || '',
    type: supplier.type,
    taxRate: supplier.taxRate ?? 0,
    creditCode: supplier.creditCode || '',
    bankName: supplier.bankName || '',
    bankBranchNo: supplier.bankBranchNo || '',
    bankAccount: supplier.bankAccount || '',
    country: supplier.country || '中国',
    province: supplier.province || '',
    city: supplier.city || '',
    district: supplier.district || '',
    address: supplier.address || '',
    postalCode: supplier.postalCode || '',
    platformUser: supplier.platformUser || '否',
    settlementPeriod: supplier.settlementPeriod ?? 0,
    contact: supplier.contact,
    mobile: supplier.mobile || '',
    email: supplier.email || '',
    phone: supplier.phone || '',
    enterpriseLeader: supplier.enterpriseLeader || supplier.legalPerson || '',
    idCard: supplier.idCard || '',
    leaderPhone: supplier.leaderPhone || '',
    website: supplier.website || '',
    companyIntro: supplier.companyIntro || '',
    legalPerson: supplier.legalPerson || '',
    registerCapital: supplier.registerCapital || '',
    businessScope: supplier.businessScope || '',
    establishDate: supplier.establishDate || '',
    recordStatus: supplier.recordStatus || '否',
    recordDate: supplier.recordDate || '',
    license: supplier.license || '',
    licenseExpire: supplier.licenseExpire || '',
    taxNo: supplier.taxNo || supplier.creditCode || '',
    remark: supplier.remark || '',
    remark2: supplier.remark2 || '',
    remark3: supplier.remark3 || '',
    remark4: supplier.remark4 || '',
    remark5: supplier.remark5 || ''
  })

  documents.value = normalizePartnerDocuments(supplier.documents, supplier.type)
}

watch(
  () => form.type,
  type => {
    documents.value = normalizePartnerDocuments(documents.value, type)
  }
)

const buildSupplierRecord = (): SupplierMaster => {
  const creator = getCurrentUserName()
  const existing = isEdit.value ? getSupplierById(supplierId.value) : undefined

  return {
    id: form.id,
    code: form.id,
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
    auditStatus: existing?.auditStatus || 'notAudited',
    status: existing?.status || 'normal',
    createTime: existing?.createTime || new Date().toISOString().slice(0, 10),
    creator: existing?.creator || creator,
    auditTime: existing?.auditTime,
    auditor: existing?.auditor,
    documents: documents.value.map((doc): SupplierDocument => ({ ...doc }))
  }
}

const syncDocumentStatus = () => {
  documents.value = syncPartnerDocumentStatus(documents.value)
}

const handleSave = () => {
  if (!form.name) {
    ElMessage.warning('请输入供应商名称')
    activeTab.value = 'basic'
    return
  }
  if (!form.type) {
    ElMessage.warning('请选择供应商类型')
    activeTab.value = 'basic'
    return
  }
  if (!form.contact) {
    ElMessage.warning('请输入联系人')
    activeTab.value = 'basic'
    return
  }
  if (!form.phone && !form.mobile) {
    ElMessage.warning('请输入联系电话或手机')
    activeTab.value = 'basic'
    return
  }

  syncDocumentStatus()
  const expiredDocs = findExpiredPartnerDocuments(documents.value)
  if (expiredDocs.length > 0) {
    ElMessage.error(`存在 ${expiredDocs.length} 项已过期证照，请更新后再保存`)
    activeTab.value = 'license'
    return
  }

  upsertSupplier(buildSupplierRecord())
  ElMessage.success(isEdit.value ? '修改成功' : '新增成功')
  router.push('/data/supplier')
}

const handleBack = () => {
  router.push('/data/supplier')
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button icon="ArrowLeft" @click="handleBack">返回</el-button>
        <h1>{{ isEdit ? '编辑供应商' : '新增供应商' }}</h1>
      </div>
      <div class="header-right">
        <el-button @click="handleBack">取消</el-button>
        <el-button type="primary" @click="handleSave">{{ isEdit ? '保存修改' : '保存' }}</el-button>
      </div>
    </div>

    <div class="form-card">
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
            <el-form-item label="供应商编号" required>
              <el-input v-model="form.id" disabled />
            </el-form-item>
            <el-form-item label="供应商名称" required>
              <el-input v-model="form.name" placeholder="请输入供应商名称" />
            </el-form-item>
            <el-form-item label="公司简称">
              <el-input v-model="form.shortName" placeholder="请输入公司简称" />
            </el-form-item>
            <el-form-item label="拼音缩写">
              <el-input v-model="form.pinyin" placeholder="请输入拼音缩写" />
            </el-form-item>
            <el-form-item label="供应商类型" required>
              <el-select v-model="form.type" placeholder="请选择供应商类型" style="width: 100%;">
                <el-option v-for="opt in supplierTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="税率(%)">
              <el-input-number v-model="form.taxRate" :min="0" :max="100" :precision="2" style="width: 100%;" />
            </el-form-item>
            <el-form-item label="公司税号">
              <el-input v-model="form.creditCode" placeholder="请输入统一社会信用代码" />
            </el-form-item>
            <el-form-item label="纳税人识别号">
              <el-input v-model="form.taxNo" placeholder="请输入纳税人识别号" />
            </el-form-item>
            <el-form-item label="开户银行">
              <el-input v-model="form.bankName" placeholder="请输入开户银行" />
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
              <el-input v-model="form.email" placeholder="请输入邮箱地址" />
            </el-form-item>
            <el-form-item label="固定电话">
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
          <PartnerLicenseSections :documents="documents" :company-type="form.type" />
        </template>
      </PartnerProfileFormShell>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container {
  padding: 12px 16px;
  background-color: #f5f7fa;
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
    gap: 16px;
  }

  h1 {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }
}

.form-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 12px 16px;
  overflow: hidden;
}

:deep(.el-button--primary) {
  background-color: #00bfa5 !important;
  border-color: #00bfa5 !important;
  color: #fff !important;
}
</style>
