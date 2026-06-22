<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { loadTenantCompanyProfile, saveTenantCompanyProfile } from '@/utils/companyDataService'
import { shouldWarnOnCloseIntro } from '@/utils/companyPublicDisplayService'

const router = useRouter()
const saving = ref(false)
const loading = ref(false)
const companyIntro = ref('')
const allowPublicDisplay = ref(true)

const loadData = async () => {
  loading.value = true
  try {
    const profile = await loadTenantCompanyProfile()
    companyIntro.value = profile.companyIntro || ''
    allowPublicDisplay.value = profile.allowPublicDisplay !== false
  } finally {
    loading.value = false
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
        allowPublicDisplay.value = false
      } catch {
        allowPublicDisplay.value = true
      }
      return
    }
    allowPublicDisplay.value = false
    return
  }

  try {
    await ElMessageBox.confirm(
      '开启公示后，您的企业简介将对平台各入驻企业公开可见，便于合作方了解本企业。确定允许公示吗？',
      '允许公示',
      { confirmButtonText: '确定开启', cancelButtonText: '取消', type: 'warning' }
    )
    allowPublicDisplay.value = true
  } catch {
    allowPublicDisplay.value = false
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    const profile = await loadTenantCompanyProfile()
    await saveTenantCompanyProfile({
      ...profile,
      companyIntro: companyIntro.value,
      allowPublicDisplay: allowPublicDisplay.value
    })
    ElMessage.success('企业简介保存成功')
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="router.push('/data/company')">返回</el-button>
        <div>
          <h1>企业简介</h1>
          <div class="breadcrumb">首页 / 资料管理 / 基础资料 / 公司资料设定 / 企业简介</div>
        </div>
      </div>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </div>

    <div v-loading="loading" class="form-card">
      <div class="intro-header">
        <div class="card-title">企业简介</div>
        <div class="intro-actions">
          <span class="public-label">允许公示</span>
          <el-switch
            :model-value="allowPublicDisplay"
            @change="handleAllowPublicChange"
          />
        </div>
      </div>
      <el-alert
        v-if="allowPublicDisplay"
        class="public-alert"
        type="info"
        :closable="false"
        show-icon
        title="已开启公示：您的企业简介对平台各入驻企业可见"
      />
      <el-input
        v-model="companyIntro"
        type="textarea"
        :rows="8"
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

.form-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #344054;
  padding-left: 8px;
  border-left: 3px solid #00bfa5;
}

.intro-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.intro-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.public-label {
  font-size: 14px;
  color: #344054;
}

.public-alert {
  margin-bottom: 12px;
}
</style>
