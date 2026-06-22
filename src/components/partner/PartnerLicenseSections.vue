<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Setting } from '@element-plus/icons-vue'
import { formatLicenseSectionCode, PARTNER_LICENSE_SECTIONS } from '@/constants/partnerLicenseSections'
import {
  filterLicenseSectionsByProfile,
  getPartnerQualificationProfileLabel,
  getPlatformTripartiteSectionTitle,
  PLATFORM_TRIPARTITE_ITEMS,
  resolvePartnerQualificationProfile
} from '@/constants/partnerCompanyQualification'
import PartnerLicenseCardGrid from '@/components/partner/PartnerLicenseCardGrid.vue'
import PartnerLicenseWarningPanel from '@/components/partner/PartnerLicenseWarningPanel.vue'
import PartnerLicenseValiditySettings from '@/components/partner/PartnerLicenseValiditySettings.vue'
import {
  buildLicenseSectionDocumentRows,
  canAddLicenseInstance,
  createPartnerDocumentFromTemplate,
  createProductLicenseDuplicate,
  getLicenseVisibilityKey,
  isProductLicenseDuplicateKey,
  isRepeatableProductLicense,
  normalizePartnerDocuments,
  resolvePartnerDocTemplateKey,
  syncPartnerDocumentStatus
} from '@/utils/partnerLicenseDocuments'
import {
  type LicenseVisibilityConfig,
  isLicenseItemVisible,
  isLicenseSectionVisible,
  loadLicenseVisibility,
  setLicenseItemVisible
} from '@/utils/partnerLicenseVisibility'
import { getPartnerLicenseWarningMonths } from '@/utils/partnerLicenseWarning'
import {
  type CustomLicenseTemplate,
  getEffectiveLicenseSections,
  getEditableLicenseTemplate
} from '@/utils/partnerLicenseSettings'
import type { PartnerDocument } from '@/types/partnerProfile'
import type { PartnerQualificationProfile } from '@/constants/partnerCompanyQualification'
import {
  buildTenantLicenseSectionOrder,
  createTenantLicenseDocument,
  createTenantLicenseVisibility,
  isTenantLicenseDeletable,
  isTenantLicenseKey,
  reorderTenantSectionDocuments,
  sortDocumentsInSection,
  TENANT_LICENSE_DELETE_CONFIRM
} from '@/utils/tenantCompanyLicenseService'
import {
  formatCompanyLicenseQuota,
  getCompanyLicenseImageStats,
  LICENSE_IMAGE_UPLOAD_HINT
} from '@/utils/partnerLicenseUpload'

const props = defineProps<{
  documents: PartnerDocument[]
  readonly?: boolean
  companyType?: string
  /** 平台企业使用三方信息展示 */
  variant?: 'default' | 'platform'
  /** 租户企业证照：由本企业自行添加，不可删除，可拖拽排序 */
  tenantMode?: boolean
  sectionOrder?: Record<string, string[]>
  visibilityConfig?: LicenseVisibilityConfig
}>()

const emit = defineEmits<{
  'update:companyType': [value: string]
  'section-order-change': [order: Record<string, string[]>]
  'visibility-config-change': [config: LicenseVisibilityConfig]
}>()

const displayVariant = computed(() => props.variant || 'default')

const settingsVisible = ref(false)
const settingsRef = ref<{ openAddDialog: () => void } | null>(null)
const warningMonths = ref(getPartnerLicenseWarningMonths())
const visibility = ref<LicenseVisibilityConfig>(
  props.visibilityConfig || loadLicenseVisibility()
)
const orderVersion = ref(0)

const syncTenantVisibility = () => {
  if (!props.tenantMode) return
  visibility.value = createTenantLicenseVisibility(
    props.companyType,
    props.documents,
    props.visibilityConfig || visibility.value
  )
}

watch(
  () => props.visibilityConfig,
  config => {
    if (!props.tenantMode || !config) return
    visibility.value = config
  },
  { deep: true }
)

watch(
  () => [props.companyType, props.documents?.length] as const,
  () => syncTenantVisibility()
)

const qualificationProfile = computed(() => resolvePartnerQualificationProfile(props.companyType))
const profileLabel = computed(() =>
  getPartnerQualificationProfileLabel(qualificationProfile.value, displayVariant.value)
)

const handleTripartiteSelect = (profile: PartnerQualificationProfile) => {
  if (props.readonly || displayVariant.value !== 'platform') return
  emit('update:companyType', profile)
}

const licenseSections = computed(() => {
  orderVersion.value
  return filterLicenseSectionsByProfile(getEffectiveLicenseSections(), qualificationProfile.value)
})

const sectionRows = computed(() => {
  if (props.tenantMode) {
    const orderConfig = props.sectionOrder || buildTenantLicenseSectionOrder(props.documents)

    return licenseSections.value.map(section => {
      const sectionDocs = buildLicenseSectionDocumentRows(section, props.documents)
      const templateOrder = orderConfig[section.code] || sectionDocs.map(doc => String(doc.docKey || ''))
      const rows = sortDocumentsInSection(sectionDocs, section.code, templateOrder)
        .filter(doc => isLicenseItemVisible(visibility.value, getLicenseVisibilityKey(doc), section.code))

      return {
        ...section,
        displayTitle: section.title,
        rows
      }
    }).filter(section => {
      if (!isLicenseSectionVisible(visibility.value, section.code)) return false
      return section.rows.length > 0
    })
  }

  return licenseSections.value.map(section => ({
    ...section,
    displayTitle:
      displayVariant.value === 'platform'
        ? getPlatformTripartiteSectionTitle(section.code, section.title)
        : section.title,
    rows: buildLicenseSectionDocumentRows(section, props.documents)
      .filter(doc => isLicenseItemVisible(visibility.value, getLicenseVisibilityKey(doc), section.code))
  })).filter(section => {
    if (!isLicenseSectionVisible(visibility.value, section.code)) return false
    return section.items.length > 0
  })
})

const visibleDocuments = computed(() => sectionRows.value.flatMap(section => section.rows))

const licenseQuotaText = computed(() =>
  formatCompanyLicenseQuota(getCompanyLicenseImageStats(props.documents))
)

const emptyDescription = computed(() => {
  if (props.tenantMode) {
    if (!props.companyType) {
      return '请先在公司资料中设置企业类型，以加载平台默认证照模板'
    }
    return '请打开「企业证照展示」，勾选需要的平台证照项目'
  }
  if (!props.companyType) {
    return displayVariant.value === 'platform'
      ? '请选择三方类型（全部/生产企业/经营公司/医疗机构），再上传对应资质'
      : '请先在基本信息中选择企业/客户类型，以加载对应资质分类'
  }
  if (qualificationProfile.value === 'other') {
    return '当前仅显示「工商公示证照」。选择全部、生产企业、经营公司或医疗机构后，将显示对应专业资质分类'
  }
  return '当前分类下证照均被隐匿，请在右上角「证照有效期设置」中开启显示'
})

const applyStatusSync = () => {
  const synced = syncPartnerDocumentStatus(props.documents, warningMonths.value)
  synced.forEach((doc, index) => {
    Object.assign(props.documents[index], doc)
  })
}

const handleWarningMonthsChange = (months: number) => {
  warningMonths.value = months
  applyStatusSync()
}

const handleVisibilityChange = (config: LicenseVisibilityConfig) => {
  visibility.value = config
  if (props.tenantMode) {
    emit('visibility-config-change', config)
  }
}

watch(
  () => props.companyType,
  companyType => {
    if (props.tenantMode) return
    syncDocumentsByCompanyType(companyType)
  }
)

const syncDocumentsByCompanyType = (companyType?: string) => {
  const normalized = normalizePartnerDocuments(props.documents, companyType)
  props.documents.splice(0, props.documents.length, ...normalized)
  applyStatusSync()
}

const handleLicenseAdded = (template: CustomLicenseTemplate) => {
  const section = licenseSections.value.find(item => item.code === template.sectionCode)
  if (!section) return

  if (!canAddLicenseInstance(props.documents, template.key)) {
    ElMessage.warning('该证照为唯一性证件，不可重复添加')
    return
  }

  const exists = props.documents.some(doc => doc.docKey === template.key)
  if (exists) return

  props.documents.push(
    createPartnerDocumentFromTemplate(template, template.sectionCode, section.title)
  )
  applyStatusSync()
}

const handleDuplicateDocument = (source: PartnerDocument) => {
  const templateKey = resolvePartnerDocTemplateKey(source)
  if (!isRepeatableProductLicense(templateKey)) {
    ElMessage.warning('该证照为唯一性证件，不可重复添加')
    return
  }

  const duplicate = createProductLicenseDuplicate(source, source.sectionTitle)
  props.documents.push(duplicate)
  if (props.tenantMode) {
    emit('section-order-change', buildTenantLicenseSectionOrder(props.documents))
  }
  applyStatusSync()
  ElMessage.success('已添加证照副本，请填写对应产品信息')
}

const handleRemoveDocument = async (doc: PartnerDocument) => {
  const docKey = String(doc.docKey || '')
  const isDuplicate = isProductLicenseDuplicateKey(docKey)
  const isTenantCustom = isTenantLicenseDeletable(docKey)

  if (!isDuplicate && !isTenantCustom) return

  if (isTenantCustom) {
    try {
      await ElMessageBox.confirm(TENANT_LICENSE_DELETE_CONFIRM, '删除证照', {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }
  }

  const index = props.documents.findIndex(item => item.docKey === doc.docKey)
  if (index < 0) return
  props.documents.splice(index, 1)

  if (isTenantCustom && props.tenantMode) {
    const nextItems = { ...visibility.value.items }
    delete nextItems[docKey]
    visibility.value = { ...visibility.value, items: nextItems }
    emit('visibility-config-change', visibility.value)
  }

  if (props.tenantMode) {
    emit('section-order-change', buildTenantLicenseSectionOrder(props.documents))
  }
  applyStatusSync()
  ElMessage.success('证照已删除')
}

const handleTenantLicenseRemoved = (docKey: string) => {
  if (!isTenantLicenseKey(docKey)) return
  const index = props.documents.findIndex(item => item.docKey === docKey)
  if (index < 0) return
  props.documents.splice(index, 1)
  const nextItems = { ...visibility.value.items }
  delete nextItems[docKey]
  visibility.value = { ...visibility.value, items: nextItems }
  emit('visibility-config-change', visibility.value)
  emit('section-order-change', buildTenantLicenseSectionOrder(props.documents))
  applyStatusSync()
}

const handleLicenseRemoved = (key: string) => {
  if (props.tenantMode) return
  const index = props.documents.findIndex(doc => doc.docKey === key)
  if (index >= 0) {
    props.documents.splice(index, 1)
  }
}

const handleTenantLicenseCreate = (payload: {
  docName: string
  docNameSub: string
  sectionCode: string
  docNoLabel: string
  longTerm: boolean
  validityNote: string
}) => {
  const doc = createTenantLicenseDocument(payload)
  props.documents.push(doc)
  visibility.value = {
    sections: { ...visibility.value.sections, [payload.sectionCode]: true },
    items: { ...visibility.value.items, [String(doc.docKey)]: true }
  }
  if (props.tenantMode) {
    emit('visibility-config-change', visibility.value)
  }
  emit('section-order-change', buildTenantLicenseSectionOrder(props.documents))
  applyStatusSync()
}

const handleTenantLicenseReference = (templateKey: string) => {
  const template = getEditableLicenseTemplate(templateKey)
  if (!template) {
    ElMessage.warning('未找到该平台证照项目')
    return
  }

  const section = licenseSections.value.find(item => item.code === template.sectionCode)
  if (!section) return

  const exists = props.documents.some(doc => doc.docKey === templateKey)
  if (!exists) {
    if (!canAddLicenseInstance(props.documents, templateKey)) {
      ElMessage.warning('该证照为唯一性证件，不可重复添加')
      return
    }
    props.documents.push(
      createPartnerDocumentFromTemplate(template, template.sectionCode, section.title)
    )
  }

  visibility.value = setLicenseItemVisible(
    visibility.value,
    template.sectionCode,
    templateKey,
    true
  )
  emit('visibility-config-change', visibility.value)
  emit('section-order-change', buildTenantLicenseSectionOrder(props.documents))
  applyStatusSync()
}

const handleTenantLicenseUpdate = (payload: {
  docKey: string
  docName: string
  docNameSub: string
  sectionCode: string
  docNoLabel: string
  longTerm: boolean
  validityNote: string
}) => {
  const doc = props.documents.find(item => item.docKey === payload.docKey)
  if (!doc) return
  const section = PARTNER_LICENSE_SECTIONS.find(item => item.code === payload.sectionCode)
  doc.docName = payload.docName.trim()
  doc.docNameSub = payload.docNameSub.trim()
  doc.sectionCode = payload.sectionCode
  doc.sectionTitle = section?.title || doc.sectionTitle
  doc.docNoLabel = payload.docNoLabel.trim() || '证照编号'
  doc.longTerm = payload.longTerm
  doc.validityNote = payload.longTerm ? '' : payload.validityNote.trim()
  emit('section-order-change', buildTenantLicenseSectionOrder(props.documents))
  applyStatusSync()
}

const openSettings = () => {
  settingsVisible.value = true
}

const handleSectionOrderChange = (sectionCode: string, orderedKeys: string[]) => {
  if (!props.tenantMode) {
    handleOrderChange()
    return
  }
  const reordered = reorderTenantSectionDocuments(props.documents, sectionCode, orderedKeys)
  props.documents.splice(0, props.documents.length, ...reordered)
  emit('section-order-change', buildTenantLicenseSectionOrder(props.documents))
  handleOrderChange()
}

const handleTemplatesChange = () => {
  if (props.tenantMode) return
  orderVersion.value += 1
  const normalized = normalizePartnerDocuments(props.documents, props.companyType)
  props.documents.splice(0, props.documents.length, ...normalized)
  applyStatusSync()
}

const handleOrderChange = () => {
  orderVersion.value += 1
}

onMounted(() => {
  if (props.tenantMode) {
    syncTenantVisibility()
    if (props.companyType) {
      const normalized = normalizePartnerDocuments(props.documents, props.companyType)
      const customDocs = props.documents.filter(
        doc => String(doc.docKey || '').startsWith('tenant_')
          && !normalized.some(item => item.docKey === doc.docKey)
      )
      props.documents.splice(0, props.documents.length, ...normalized, ...customDocs)
    }
    applyStatusSync()
    return
  }
  syncDocumentsByCompanyType(props.companyType)
})
</script>

<template>
  <div class="license-sections">
    <div class="license-layout-main">
    <div class="qualification-profile-bar">
      <template v-if="displayVariant === 'platform'">
        <span class="profile-bar-label">三方信息</span>
        <div class="profile-filter-tags">
          <el-tag
            v-for="item in PLATFORM_TRIPARTITE_ITEMS"
            :key="item.key"
            :type="qualificationProfile === item.key ? 'success' : 'info'"
            effect="plain"
            :class="{ 'is-clickable': !readonly }"
            @click="handleTripartiteSelect(item.key)"
          >
            {{ item.label }}
          </el-tag>
        </div>
        <span class="profile-hint">已按三方类型筛选，仅显示需上传的资质分类</span>
        <span v-if="companyType" class="profile-current">
          当前企业：<strong>{{ profileLabel }}</strong>
        </span>
        <div v-else-if="!readonly" class="profile-picker">
          <span class="profile-hint">请选择三方类型：</span>
          <el-select
            :model-value="companyType"
            placeholder="全部 / 生产企业 / 经营公司 / 医疗机构"
            style="width: 220px;"
            @update:model-value="emit('update:companyType', $event)"
          >
            <el-option
              v-for="item in PLATFORM_TRIPARTITE_ITEMS"
              :key="item.key"
              :label="item.label"
              :value="item.key"
            />
          </el-select>
        </div>
        <span v-else class="profile-hint">请先在基本信息中选择三方类型：全部 / 生产企业 / 经营公司 / 医疗机构</span>
      </template>
      <template v-else>
        <el-tag type="success" effect="plain">{{ profileLabel }}</el-tag>
        <span class="profile-hint">已按企业性质筛选，仅显示需上传的资质分类</span>
      </template>
    </div>

    <div class="license-top-toolbar">
      <div class="toolbar-content">
        <PartnerLicenseWarningPanel
          :documents="visibleDocuments"
          :readonly="readonly"
          :warning-months="warningMonths"
        />
        <div v-if="!readonly" class="license-quota-tip">
          <span>{{ LICENSE_IMAGE_UPLOAD_HINT }}</span>
          <span class="quota-usage">{{ licenseQuotaText }}</span>
        </div>
        <div v-if="!readonly" class="license-drag-tip">
          同分类下有多张证照时，可按住卡片右上角「拖拽」调整顺序
        </div>
      </div>
      <div class="toolbar-actions">
        <el-button
          type="primary"
          :icon="Setting"
          @click="openSettings"
        >
          {{ tenantMode ? '企业证照展示' : '证照有效期设置' }}
        </el-button>
      </div>
    </div>

    <PartnerLicenseValiditySettings
      ref="settingsRef"
      v-model="settingsVisible"
      :readonly="readonly"
      :tenant-mode="tenantMode"
      :company-type="companyType"
      :documents="documents"
      :visibility-config="visibility"
      @visibility-change="handleVisibilityChange"
      @warning-months-change="handleWarningMonthsChange"
      @license-added="handleLicenseAdded"
      @license-removed="handleLicenseRemoved"
      @tenant-license-create="handleTenantLicenseCreate"
      @tenant-license-reference="handleTenantLicenseReference"
      @tenant-license-update="handleTenantLicenseUpdate"
      @tenant-license-removed="handleTenantLicenseRemoved"
      @templates-change="handleTemplatesChange"
    />

    <div v-for="section in sectionRows" :key="section.code" class="license-section-block">
      <div class="partner-section-title">
        <span class="section-code">{{ formatLicenseSectionCode(section.code) }}</span>
        <span class="section-name">{{ section.displayTitle || section.title }}</span>
      </div>

      <PartnerLicenseCardGrid
        :documents="section.rows"
        :all-documents="documents"
        :section-code="section.code"
        :readonly="readonly"
        :warning-months="warningMonths"
        :local-order-only="tenantMode"
        @order-change="keys => handleSectionOrderChange(section.code, keys)"
        @duplicate="handleDuplicateDocument"
        @remove="handleRemoveDocument"
      />
    </div>

    <el-empty
      v-if="sectionRows.length === 0"
      :description="emptyDescription"
    />
    </div>

  </div>
</template>

<style lang="scss" scoped>
.license-sections {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.license-layout-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.qualification-profile-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #f0fdfa;
  border: 1px solid #b2f0e3;
  border-radius: 6px;
  flex-wrap: wrap;

  .profile-bar-label {
    font-size: 13px;
    font-weight: 600;
    color: #344054;
    flex-shrink: 0;
  }

  .profile-filter-tags {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;

    :deep(.el-tag.is-clickable) {
      cursor: pointer;
    }
  }

  .profile-current {
    margin-left: auto;
    font-size: 12px;
    color: #667085;

    strong {
      color: #344054;
      font-size: 13px;
    }
  }

  .profile-hint {
    font-size: 12px;
    color: #667085;
  }

  .profile-picker {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
}

.license-top-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;

.toolbar-content {
  flex: 1;
  min-width: 0;
}

.license-quota-tip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 12px;
  color: #667085;

  .quota-usage {
    color: #007a6a;
    font-weight: 600;
  }
}

.license-drag-tip {
  margin-top: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px dashed #7fdcc8;
  background: #f6fffd;
  font-size: 12px;
  color: #007a6a;
  line-height: 1.45;
}

  > .el-button {
    flex-shrink: 0;
    margin-top: 2px;
  }
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-top: 2px;
}

.license-section-block {
  .partner-section-title {
    display: flex;
    align-items: center;
    gap: 0;
    margin: 0 0 6px;
    padding-left: 8px;
    border-left: 3px solid #00bfa5;
    font-size: 14px;
    font-weight: 600;
    color: #344054;

    .section-code {
      width: 40px;
      flex-shrink: 0;
      color: #00bfa5;
    }

    .section-name {
      min-width: 0;
      line-height: 1.35;
    }
  }
}
</style>
