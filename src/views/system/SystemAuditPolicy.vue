<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  AUDIT_SYSTEM_MODE_DESCRIPTIONS,
  AUDIT_SYSTEM_MODE_LABELS,
  loadAuditSystemSettings,
  resetAuditSystemSettings,
  saveAuditSystemSettings,
  type AuditSystemMode,
  type AuditSystemSettings
} from '@/utils/auditSystemSettings'

const settings = ref<AuditSystemSettings>(loadAuditSystemSettings())

const handleSave = () => {
  saveAuditSystemSettings(settings.value)
  ElMessage.success('审核制度已保存')
}

const handleReset = () => {
  settings.value = resetAuditSystemSettings()
  ElMessage.success('已恢复默认审核制度')
}
</script>

<template>
  <div class="system-audit-policy">
    <div class="page-header">
      <div>
        <div class="breadcrumb">首页 / 系统设置 / 权限与用户 / 审核制度</div>
        <h2>审核制度</h2>
        <p class="page-desc">
          全系统统一采用同一种审核原则。谁可以「确定」、谁可以「审核」，请在「角色设定 / 权限设定」中配置对应权限。
        </p>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="handleReset">恢复默认</el-button>
        <el-button size="small" type="primary" @click="handleSave">保存</el-button>
      </div>
    </div>

    <el-card shadow="never" class="settings-card">
      <el-form label-width="120px" class="settings-form">
        <el-form-item label="审核制度">
          <el-radio-group v-model="settings.mode" class="mode-options">
            <el-radio
              v-for="(label, mode) in AUDIT_SYSTEM_MODE_LABELS"
              :key="mode"
              :value="mode"
              class="mode-radio"
            >
              <span class="mode-title">{{ label }}</span>
              <span class="mode-desc">{{ AUDIT_SYSTEM_MODE_DESCRIPTIONS[mode as AuditSystemMode] }}</span>
            </el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <el-alert
        type="info"
        show-icon
        :closable="false"
        title="权限说明"
      >
        <template #default>
          <ul class="hint-list">
            <li>一级审核：具备对应单据「审核」权限的用户可直接审核。</li>
            <li>双重审核：具备「确定」权限的用户先确定，具备「审核」权限的用户再审核。</li>
            <li>采购订单示例：确定权限 <code>purchase_confirm</code>，审核权限 <code>purchase_audit</code>。</li>
          </ul>
        </template>
      </el-alert>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.system-audit-policy {
  padding: 16px 20px;
  min-height: 100%;
  background: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;

  h2 {
    margin: 4px 0;
    font-size: 20px;
    font-weight: 600;
    color: #303133;
  }
}

.breadcrumb {
  font-size: 12px;
  color: #909399;
}

.page-desc {
  margin: 0;
  font-size: 12px;
  color: #909399;
  max-width: 640px;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.settings-card {
  max-width: 720px;

  :deep(.el-card__body) {
    padding: 16px 20px 20px;
  }
}

.mode-options {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}

.mode-radio {
  height: auto;
  margin-right: 0;
  align-items: flex-start;

  :deep(.el-radio__label) {
    display: flex;
    flex-direction: column;
    gap: 4px;
    white-space: normal;
    line-height: 1.5;
  }
}

.mode-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.mode-desc {
  font-size: 12px;
  color: #909399;
}

.hint-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.7;
  color: #606266;

  code {
    font-size: 12px;
    color: #409eff;
  }
}
</style>
