<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, OfficeBuilding, Briefcase, Postcard } from '@element-plus/icons-vue'
import type { Company } from '@/utils/dataStore'
import type { PlatformFieldDef } from '@/utils/platformFieldStore'
import { isPlatformOperator } from '@/utils/customerProductService'
import {
  buildCompanyFromFlatForm,
  companyToFlatForm,
  getCompanyTypeOptions,
  getLoggedInUserContext,
  getTenantEditableFieldDefs,
  isFullWidthField,
  isTenantReadOnlyField,
  loadTenantCompanyProfile,
  saveTenantCompanyProfile,
  syncCompanyFieldFormatFromPlatform,
  validateCompanyByFieldDefs,
  getCompanyFormKey,
  resolveTenantPlatformPartnerCode
} from '@/utils/companyDataService'
import { shouldWarnOnCloseIntro } from '@/utils/companyPublicDisplayService'

const router = useRouter()
const syncing = ref(false)
const saving = ref(false)
const platformFields = ref<PlatformFieldDef[]>([])
const tenantProfile = ref<Company | null>(null)
const form = ref<Record<string, unknown>>({})

const userContext = computed(() => getLoggedInUserContext())
const includePlatformType = computed(() => isPlatformOperator())
const tenantPlatformCode = computed(() => resolveTenantPlatformPartnerCode(tenantProfile.value))

const refreshFieldLayout = () => {
  platformFields.value = getTenantEditableFieldDefs()
}

const loadProfile = async () => {
  tenantProfile.value = await loadTenantCompanyProfile()
  form.value = companyToFlatForm(tenantProfile.value)
}

const saveProfile = async () => {
  const error = validateCompanyByFieldDefs(form.value, platformFields.value)
  if (error) {
    ElMessage.warning(error)
    return
  }

  saving.value = true
  try {
    const payload = buildCompanyFromFlatForm(
      form.value,
      platformFields.value,
      userContext.value.companyId
    )
    await saveTenantCompanyProfile(payload)
    tenantProfile.value = await loadTenantCompanyProfile()
    form.value = companyToFlatForm(tenantProfile.value)
    ElMessage.success('公司资料保存成功')
  } finally {
    saving.value = false
  }
}

const handleSyncFieldFormat = () => {
  ElMessageBox.confirm(
    '将从「平台资料字段目录」同步本企业资料表单字段格式（字段名称、类型、必填等），不会覆盖已填写内容。',
    '同步平台字段格式',
    { confirmButtonText: '确定同步', cancelButtonText: '取消', type: 'info' }
  ).then(() => {
    syncing.value = true
    try {
      const result = syncCompanyFieldFormatFromPlatform()
      refreshFieldLayout()
      ElMessage.success(`格式同步完成：共 ${result.fieldCount} 项，新增 ${result.added} 项`)
    } finally {
      syncing.value = false
    }
  }).catch(() => {})
}

const getSelectOptions = (field: PlatformFieldDef) => {
  if (field.fieldCode === 'companyType') return getCompanyTypeOptions(includePlatformType.value)
  return []
}

const quickEntryItems = [
  {
    key: 'intro',
    label: '企业简介',
    desc: '见下方本企业资料、企业介绍，可直接编辑',
    icon: OfficeBuilding,
    tone: 'intro'
  },
  {
    key: 'investment',
    label: '招商信息',
    desc: '平台用户、备案与招商备注',
    path: '/data/company/investment',
    icon: Briefcase,
    tone: 'investment'
  },
  {
    key: 'license',
    label: '企业证照',
    desc: '证照资料上传与有效期管理',
    path: '/data/company/license',
    icon: Postcard,
    tone: 'license'
  }
]

const profileSectionRef = ref<HTMLElement | null>(null)

const handleQuickEntryClick = (item: (typeof quickEntryItems)[number]) => {
  if (item.key === 'intro') {
    profileSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    ElMessage.info('企业简介已在下方「本企业资料」「企业介绍」中展示，可直接编辑，无需跳转其他页面')
    return
  }
  if (item.path) {
    router.push(item.path)
  }
}

const handleAllowPublicChange = async (val: string | number | boolean) => {
  const enabled = Boolean(val)
  if (!enabled) {
    const { shouldWarn, partnerNames, tradedProductNames } = shouldWarnOnCloseIntro()
    if (shouldWarn) {
      const parts: string[] = []
      if (partnerNames.length) parts.push(`协同客户：${partnerNames.join('、')}`)
      if (tradedProductNames.length) parts.push(`已交易产品：${tradedProductNames.join('、')}`)
      try {
        await ElMessageBox.confirm(
          `${parts.join('；')}。关闭后对方将无法查看本企业公示资料，请勿关闭。仍要关闭公示吗？`,
          '关闭公示提示',
          { type: 'warning', confirmButtonText: '仍要关闭', cancelButtonText: '保持开启' }
        )
        form.value.allowPublicDisplay = false
      } catch {
        form.value.allowPublicDisplay = true
      }
      return
    }
    form.value.allowPublicDisplay = false
    return
  }

  try {
    await ElMessageBox.confirm(
      '开启公示后，您的企业介绍将对平台各入驻企业公开可见，便于合作方了解本企业。确定允许公示吗？',
      '允许公示',
      { confirmButtonText: '确定开启', cancelButtonText: '取消', type: 'warning' }
    )
    form.value.allowPublicDisplay = true
  } catch {
    form.value.allowPublicDisplay = false
  }
}

onMounted(async () => {
  syncCompanyFieldFormatFromPlatform()
  refreshFieldLayout()
  await loadProfile()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-info">
        <h1>公司资料设定</h1>
        <div class="breadcrumb">首页 / 资料管理 / 基础资料 / 公司资料设定</div>
        <div class="format-tip">
          维护本企业（{{ userContext.companyName || '当前租户' }}）资料；表单字段格式与平台「公司资料」模块同步
        </div>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" :loading="syncing" @click="handleSyncFieldFormat">同步平台格式</el-button>
        <el-button type="primary" :loading="saving" @click="saveProfile">保存</el-button>
      </div>
    </div>

    <div v-if="tenantProfile" class="summary-card">
      <div class="summary-primary">
        <div class="summary-item">
          <span class="label">企业名称</span>
          <span class="value">{{ tenantProfile.name || '-' }}</span>
        </div>
        <div v-if="tenantPlatformCode" class="summary-item summary-item-vip">
          <span class="label">
            医享平台<span class="vip-accent">VIP</span>编号
          </span>
          <span class="value vip-value">{{ tenantPlatformCode }}</span>
        </div>
      </div>
      <div class="summary-item summary-item-status">
        <span class="label">账户状态</span>
        <el-tag :type="tenantProfile.status === '启用' ? 'success' : 'danger'" size="small">
          {{ tenantProfile.status || '启用' }}
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

    <div ref="profileSectionRef" class="form-card intro-content-zone">
      <div class="card-title">本企业资料</div>
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
                v-if="isTenantReadOnlyField(field.fieldCode)"
                :model-value="String(form[getCompanyFormKey(field.fieldCode)] || '')"
                disabled
              />

              <el-select
                v-else-if="field.fieldType === 'select' || field.fieldCode === 'companyType'"
                v-model="form[getCompanyFormKey(field.fieldCode)]"
                :placeholder="`请选择${field.fieldName}`"
                style="width: 100%;"
                clearable
              >
                <el-option
                  v-for="opt in getSelectOptions(field)"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>

              <el-input
                v-else-if="field.fieldType === 'textarea'"
                v-model="form[getCompanyFormKey(field.fieldCode)]"
                type="textarea"
                :rows="2"
                :maxlength="field.length ? Number(field.length) : undefined"
                show-word-limit
              />

              <el-input
                v-else-if="field.fieldType === 'number'"
                v-model="form[getCompanyFormKey(field.fieldCode)]"
                :maxlength="field.length ? Number(field.length) : undefined"
              />

              <el-date-picker
                v-else-if="field.fieldType === 'date'"
                v-model="form[getCompanyFormKey(field.fieldCode)]"
                type="date"
                value-format="YYYY-MM-DD"
                style="width: 100%;"
              />

              <el-date-picker
                v-else-if="field.fieldType === 'datetime'"
                v-model="form[getCompanyFormKey(field.fieldCode)]"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />

              <el-switch
                v-else-if="field.fieldType === 'boolean'"
                v-model="form[getCompanyFormKey(field.fieldCode)]"
              />

              <el-input
                v-else
                v-model="form[getCompanyFormKey(field.fieldCode)]"
                :maxlength="field.length ? Number(field.length) : undefined"
                :placeholder="field.remark || `请输入${field.fieldName}`"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <div class="intro-card intro-content-zone">
      <div class="intro-header">
        <div class="card-title">企业介绍</div>
        <div class="intro-actions">
          <span class="public-label">允许公示</span>
          <el-switch
            :model-value="Boolean(form.allowPublicDisplay)"
            @change="handleAllowPublicChange"
          />
        </div>
      </div>
      <el-alert
        v-if="form.allowPublicDisplay"
        class="public-alert"
        type="info"
        :closable="false"
        show-icon
        title="已开启公示：您的企业介绍对平台各入驻企业可见"
      />
      <el-input
        v-model="form.companyIntro"
        type="textarea"
        :rows="6"
        maxlength="2000"
        show-word-limit
        placeholder="请填写企业简介、主营业务、服务优势等信息，便于合作方了解您的企业"
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
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 16px;

  h1 {
    font-size: 22px;
    font-weight: 600;
    margin: 0;
  }
}

.page-info {
  .breadcrumb {
    font-size: 13px;
    color: #667085;
    margin-top: 6px;
  }

  .format-tip {
    font-size: 12px;
    color: #98a2b3;
    margin-top: 4px;
  }
}

.page-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.summary-card,
.quick-entry-card,
.form-card,
.intro-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

.summary-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 32px;
}

.summary-primary {
  display: flex;
  align-items: flex-start;
  gap: 48px;
  flex-wrap: wrap;
}

.summary-item-status {
  align-items: flex-end;
  text-align: right;
  margin-left: auto;
  flex-shrink: 0;
}

.summary-item-vip {
  .label .vip-accent {
    color: #c9920a;
    font-weight: 600;
  }

  .vip-value {
    color: #b8860b;
    letter-spacing: 0.04em;
  }
}

.quick-entry-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.quick-entry-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 1px solid #eaecf0;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;

  &:hover {
    border-color: #00bfa5;
    box-shadow: 0 4px 12px rgba(0, 191, 165, 0.12);
    transform: translateY(-1px);
  }
}

.quick-entry-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;

  &.intro {
    background: #f4f3ff;
    color: #7a5af8;
  }

  &.investment {
    background: #ecfdf3;
    color: #12b76a;
  }

  &.license {
    background: #eff8ff;
    color: #2e90fa;
  }
}

.quick-entry-label {
  font-size: 15px;
  font-weight: 600;
  color: #344054;
}

.quick-entry-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #667085;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .label {
    font-size: 12px;
    color: #667085;
  }

  .value {
    font-size: 15px;
    font-weight: 600;
    color: #344054;
  }
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #344054;
  margin-bottom: 16px;
  padding-left: 8px;
  border-left: 3px solid #00bfa5;
}

.intro-content-zone {
  border: 1px solid #b2f0e3;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(178, 240, 227, 0.35);
}

.intro-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;

  .card-title {
    margin-bottom: 0;
  }
}

.intro-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.public-label {
  font-size: 14px;
  color: #344054;
}

.public-alert {
  margin-bottom: 12px;
}

.company-form :deep(.el-form-item) {
  margin-bottom: 14px;
}
</style>
