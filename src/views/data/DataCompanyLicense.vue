<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import PartnerLicenseSections from '@/components/partner/PartnerLicenseSections.vue'
import {
  buildTenantLicenseSectionOrder,
  createTenantLicenseVisibility,
  normalizeTenantCompanyDocuments,
  TENANT_LICENSE_REFERENCE_TIP,
  TENANT_LICENSE_RULE_TIP
} from '@/utils/tenantCompanyLicenseService'
import { loadTenantCompanyProfile, saveTenantCompanyProfile } from '@/utils/companyDataService'
import { useLayoutNavigateBack } from '@/composables/useLayoutNavigateBack'
import type { PartnerDocument } from '@/types/partnerProfile'
import type { Company } from '@/utils/dataStore'
import type { LicenseVisibilityConfig } from '@/utils/partnerLicenseVisibility'

const layoutNavigateBack = useLayoutNavigateBack()
const saving = ref(false)
const loading = ref(false)
const tenantProfile = ref<Company | null>(null)
const documents = ref<PartnerDocument[]>([])
const sectionOrder = ref<Record<string, string[]>>({})
const licenseVisibility = ref<LicenseVisibilityConfig>({ sections: {}, items: {} })

const loadData = async () => {
  loading.value = true
  try {
    const profile = await loadTenantCompanyProfile()
    tenantProfile.value = profile
    const originalCount = profile.documents?.length || 0
    documents.value = normalizeTenantCompanyDocuments(profile.documents, profile.companyType)
    sectionOrder.value = { ...(profile.licenseSectionOrder || buildTenantLicenseSectionOrder(documents.value)) }
    licenseVisibility.value = createTenantLicenseVisibility(
      profile.companyType,
      documents.value,
      profile.licenseVisibility
    )

    if (documents.value.length !== originalCount) {
      await saveTenantCompanyProfile({
        ...profile,
        documents: documents.value,
        licenseSectionOrder: buildTenantLicenseSectionOrder(documents.value),
        licenseVisibility: licenseVisibility.value
      })
    }
  } finally {
    loading.value = false
  }
}

const handleVisibilityConfigChange = (config: LicenseVisibilityConfig) => {
  licenseVisibility.value = config
}

const handleSectionOrderChange = (order: Record<string, string[]>) => {
  sectionOrder.value = order
}

const handleSave = async () => {
  if (!tenantProfile.value) return
  saving.value = true
  try {
    const licenseSectionOrder = buildTenantLicenseSectionOrder(documents.value)
    await saveTenantCompanyProfile({
      ...tenantProfile.value,
      documents: documents.value,
      licenseSectionOrder,
      licenseVisibility: licenseVisibility.value
    })
    ElMessage.success('企业证照保存成功')
    await loadData()
  } catch (error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '企业证照保存失败')
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
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="handleBack">返回</el-button>
        <div>
          <h1>企业证照</h1>
          <div class="breadcrumb">首页 / 资料管理 / 基础资料 / 公司资料设定 / 企业证照</div>
        </div>
      </div>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </div>

    <el-alert
      class="tenant-tip"
      type="info"
      :closable="false"
      show-icon
      :title="`${TENANT_LICENSE_REFERENCE_TIP} ${TENANT_LICENSE_RULE_TIP} 审核前可拖拽卡片右上角手柄调整排序。`"
    />

    <div v-loading="loading" class="form-card">
      <PartnerLicenseSections
        tenant-mode
        :documents="documents"
        :company-type="tenantProfile?.companyType"
        :section-order="sectionOrder"
        :visibility-config="licenseVisibility"
        @section-order-change="handleSectionOrderChange"
        @visibility-config-change="handleVisibilityConfigChange"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}

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

.breadcrumb {
  font-size: 13px;
  color: #667085;
  margin-top: 6px;
}

.tenant-tip {
  margin-bottom: 16px;
}

.form-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}
</style>
