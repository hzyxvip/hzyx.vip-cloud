<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import PartnerProfileFormShell from '@/components/partner/PartnerProfileFormShell.vue'
import PartnerLicenseSections from '@/components/partner/PartnerLicenseSections.vue'
import { DEFAULT_PARTNER_PROFILE_TAB } from '@/constants/partnerProfileTabs'
import { getCustomerById, type CustomerDocument } from '@/utils/customerStore'
import { normalizePartnerDocuments } from '@/utils/partnerLicenseDocuments'
import { useLayoutNavigateBack } from '@/composables/useLayoutNavigateBack'

const router = useRouter()
const route = useRoute()
const layoutNavigateBack = useLayoutNavigateBack()

const activeTab = ref(DEFAULT_PARTNER_PROFILE_TAB)

const customerTypeLabels: Record<string, string> = {
  hospital: '医院',
  clinic: '诊所',
  pharmacy: '药店',
  deviceCompany: '医疗器械公司',
  other: '其他'
}

const auditStatusLabels: Record<string, string> = {
  notAudited: '未审核',
  audited: '已审核'
}

const statusLabels: Record<string, { text: string; color: string }> = {
  normal: { text: '正常', color: 'success' },
  disabled: { text: '停用', color: 'danger' }
}

const customerData = ref({
  id: '',
  name: '',
  contact: '',
  phone: '',
  mobile: '',
  email: '',
  type: '',
  address: '',
  province: '',
  city: '',
  district: '',
  postalCode: '',
  auditStatus: 'notAudited' as 'notAudited' | 'audited',
  status: 'normal' as 'normal' | 'disabled',
  creditCode: '',
  bankName: '',
  bankAccount: '',
  taxNo: '',
  legalPerson: '',
  registerCapital: '',
  businessScope: '',
  establishDate: '',
  createTime: '',
  creator: '',
  auditTime: '',
  auditor: ''
})

const documents = ref<CustomerDocument[]>([])

onMounted(() => {
  const customerId = route.params.id as string
  if (!customerId) {
    ElMessage.error('客户编号无效')
    router.push('/data/customer')
    return
  }

  const customer = getCustomerById(customerId)
  if (!customer) {
    ElMessage.error('客户不存在')
    router.push('/data/customer')
    return
  }

  Object.assign(customerData.value, customer)
  documents.value = normalizePartnerDocuments(customer.documents, customer.type)
})

const handleEdit = () => {
  router.push(`/data/customer/create/${customerData.value.id}`)
}

const handleBack = () => {
  layoutNavigateBack()
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="handleBack()" icon="ArrowLeft">返回</el-button>
        <h1>客户详情</h1>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleEdit">编辑</el-button>
      </div>
    </div>

    <div class="detail-card">
      <div class="card-header">
        <div class="header-info">
          <div class="customer-name">{{ customerData.name }}</div>
          <div class="customer-id">{{ customerData.id }}</div>
        </div>
        <div class="header-status">
          <el-tag :type="customerData.auditStatus === 'audited' ? 'success' : 'info'" size="large">
            {{ auditStatusLabels[customerData.auditStatus] }}
          </el-tag>
          <el-tag :type="statusLabels[customerData.status].color" size="large">
            {{ statusLabels[customerData.status].text }}
          </el-tag>
        </div>
      </div>

      <div class="card-body">
        <PartnerProfileFormShell v-model="activeTab">
          <template #intro>
            <div class="form-section">
              <div class="form-grid">
                <div class="form-item span-full">
                  <label class="form-label">企业介绍</label>
                  <span class="form-value">{{ customerData.companyIntro || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">法定代表人</label>
                  <span class="form-value">{{ customerData.legalPerson || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">注册资本</label>
                  <span class="form-value">{{ customerData.registerCapital || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">成立日期</label>
                  <span class="form-value">{{ customerData.establishDate || '-' }}</span>
                </div>
                <div class="form-item span-full">
                  <label class="form-label">经营范围</label>
                  <span class="form-value">{{ customerData.businessScope || '-' }}</span>
                </div>
                <div class="form-item span-full">
                  <label class="form-label">备注</label>
                  <span class="form-value">{{ customerData.remark || '-' }}</span>
                </div>
              </div>
            </div>
          </template>

          <template #basic>
            <div class="form-section">
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">客户类型</label>
                  <span class="form-value">{{ customerTypeLabels[customerData.type] || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">公司简称</label>
                  <span class="form-value">{{ customerData.shortName || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">拼音缩写</label>
                  <span class="form-value">{{ customerData.pinyin || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">税率(%)</label>
                  <span class="form-value">{{ customerData.taxRate ?? '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">公司税号</label>
                  <span class="form-value">{{ customerData.creditCode || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">开户银行</label>
                  <span class="form-value">{{ customerData.bankName || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">银行行号</label>
                  <span class="form-value">{{ customerData.bankBranchNo || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">银行账号</label>
                  <span class="form-value">{{ customerData.bankAccount || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">国家</label>
                  <span class="form-value">{{ customerData.country || '中国' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">省</label>
                  <span class="form-value">{{ customerData.province || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">市</label>
                  <span class="form-value">{{ customerData.city || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">区</label>
                  <span class="form-value">{{ customerData.district || '-' }}</span>
                </div>
                <div class="form-item span-full">
                  <label class="form-label">详细地址</label>
                  <span class="form-value">{{ customerData.address || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">邮政编码</label>
                  <span class="form-value">{{ customerData.postalCode || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">联系人</label>
                  <span class="form-value">{{ customerData.contact || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">手机号码</label>
                  <span class="form-value">{{ customerData.mobile || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">电子邮箱</label>
                  <span class="form-value">{{ customerData.email || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">固定电话</label>
                  <span class="form-value">{{ customerData.phone || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">企业负责人</label>
                  <span class="form-value">{{ customerData.enterpriseLeader || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">创建人</label>
                  <span class="form-value">{{ customerData.creator || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">审核人</label>
                  <span class="form-value">{{ customerData.auditor || '-' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">审核时间</label>
                  <span class="form-value">{{ customerData.auditTime || '-' }}</span>
                </div>
              </div>
            </div>
          </template>

          <template #investment>
            <div class="form-section">
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">平台用户</label>
                  <span class="form-value">{{ customerData.platformUser || '否' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">结算期限(天)</label>
                  <span class="form-value">{{ customerData.settlementPeriod ?? 0 }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">平台备案</label>
                  <span class="form-value">{{ customerData.recordStatus || '否' }}</span>
                </div>
                <div class="form-item">
                  <label class="form-label">备案日期</label>
                  <span class="form-value">{{ customerData.recordDate || '-' }}</span>
                </div>
                <div class="form-item span-full">
                  <label class="form-label">备注2</label>
                  <span class="form-value">{{ customerData.remark2 || '-' }}</span>
                </div>
                <div class="form-item span-full">
                  <label class="form-label">备注3</label>
                  <span class="form-value">{{ customerData.remark3 || '-' }}</span>
                </div>
                <div class="form-item span-full">
                  <label class="form-label">备注4</label>
                  <span class="form-value">{{ customerData.remark4 || '-' }}</span>
                </div>
                <div class="form-item span-full">
                  <label class="form-label">备注5</label>
                  <span class="form-value">{{ customerData.remark5 || '-' }}</span>
                </div>
              </div>
            </div>
          </template>

          <template #license>
            <PartnerLicenseSections :documents="documents" :company-type="customerData.type" readonly />
          </template>
        </PartnerProfileFormShell>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 12px 16px; background-color: #F5F7FA; min-height: calc(100vh - 60px); }

.page-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 12px;
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
    
    h1 { 
      font-size: 22px; 
      font-weight: 600; 
      margin: 0; 
    }
  }
}

.detail-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  overflow: hidden;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #fafafa;
    border-bottom: 1px solid #e4e7ed;

    .header-info {
      display: flex;
      align-items: baseline;
      gap: 16px;

      .customer-name {
        font-size: 20px;
        font-weight: 600;
        color: #344054;
      }

      .customer-id {
        font-size: 14px;
        color: #667085;
        background: #f2f3f5;
        padding: 4px 12px;
        border-radius: 4px;
      }
    }

    .header-status {
      display: flex;
      gap: 12px;
    }
  }

  .card-body {
    padding: 12px 16px;
  }

  .form-section {
    .form-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px 12px;

      @media (max-width: 1400px) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      @media (max-width: 1100px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    .form-item {
      display: flex;
      flex-direction: column;
      gap: 4px;

      &.span-full,
      &.span-2 {
        grid-column: 1 / -1;
      }

      .form-label {
        font-size: 13px;
        color: #667085;
        font-weight: 500;
      }

      .form-value {
        font-size: 13px;
        color: #344054;
        padding: 4px 8px;
        background: #fafafa;
        border-radius: 4px;
        min-height: 28px;
        display: flex;
        align-items: center;
      }
    }
  }

  .table-section {
    :deep(.common-table) {
      .el-table__header-wrapper th {
        background: #f5f7fa;
        color: #344054;
        font-weight: 600;
      }

    .el-table__row:nth-child(odd) {
      background-color: #F0F9F7;
    }
    
    .el-table__row:nth-child(even) {
      background-color: #FFFFFF;
    }
    
    .el-table__body tr:hover > td {
      background-color: #D4EDE6 !important;
    }    }
  }
}

:deep(.el-button--primary) {
  background-color: #00bfa5 !important;
  border-color: #00bfa5 !important;
  color: #fff !important;
}
</style>