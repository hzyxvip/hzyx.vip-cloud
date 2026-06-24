<script setup lang="ts">
import { reactive, computed } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import {
  BATCH_NO_BUSINESS_RULES,
  BATCH_NO_DOC_INPUT_MODES,
  DEFAULT_BATCH_NO_SETTINGS,
  getBatchNoFormatLabel,
  loadBatchNoSettings,
  resetBatchNoSettings,
  saveBatchNoSettings,
  type BatchNoSettings
} from '@/utils/batchNoSettings'
import { formatProductionDateToBatchNo } from '@/utils/productBatchExpiry'

const form = reactive<BatchNoSettings>({ ...loadBatchNoSettings() })

const previewDate = computed(() => dayjs().format('YYYY-MM-DD'))

const previewBatchNo = computed(() => {
  if (form.defaultFormat === 'custom') return '（手输实际批号）'
  return formatProductionDateToBatchNo(previewDate.value, form.defaultFormat) || '-'
})

const formatSummary = computed(() => {
  const label = getBatchNoFormatLabel(form.defaultFormat)
  if (!label) {
    return form.autoGenerateFromProductionDate
      ? '默认手输批号：新行不预填批号，须在明细批号列选择 8/6 位或手输；确认格式后按生产日期生成'
      : '默认手输批号：系统不自动带出批号，须在明细中手选格式或手输'
  }
  if (form.autoGenerateFromProductionDate) {
    return `默认格式 ${label}：未逐行确认前，填写生产日期可预填批号；采购/销售订单进入批号列仍须确认格式`
  }
  return `默认格式 ${label}：不自动填批号，须在明细中确认格式或手输`
})

const handleSave = () => {
  saveBatchNoSettings({ ...form })
  ElMessage.success('生产批号设定已保存')
}

const handleReset = () => {
  Object.assign(form, resetBatchNoSettings())
  ElMessage.success('已恢复默认设定')
}
</script>

<template>
  <div class="system-settings-page">
    <div class="page-header">
      <div>
        <div class="breadcrumb">首页 / 系统设置 / 生产批号设定</div>
        <h2>生产批号设定</h2>
        <p class="page-desc">
          配置全局默认批号策略。采购/销售订单在明细「生产批号」列内用键盘选择 8 位（20260624）或 6 位（260624），也可手输厂家实际批号；有效期至默认按商品资料自动计算。
        </p>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="handleReset">恢复默认</el-button>
        <el-button size="small" type="primary" @click="handleSave">保存</el-button>
      </div>
    </div>

    <el-card shadow="never" class="settings-card">
      <el-form label-width="160px" class="settings-form">
        <el-form-item label="默认批号格式">
          <div class="format-panel">
            <el-radio-group v-model="form.defaultFormat" class="vertical-options">
              <el-radio value="YYYYMMDD">
                <span class="option-main">20260624</span>
                <span class="option-sub">8 位：年月日</span>
              </el-radio>
              <el-radio value="YYMMDD">
                <span class="option-main">260624</span>
                <span class="option-sub">6 位：年月日</span>
              </el-radio>
              <el-radio value="custom">
                <span class="option-main">手输批号</span>
                <span class="option-sub">不预填批号，在明细中逐行确认或手输</span>
              </el-radio>
            </el-radio-group>
          </div>
        </el-form-item>

        <el-form-item label="自动生成批号">
          <div class="switch-row">
            <el-switch
              v-model="form.autoGenerateFromProductionDate"
              :disabled="form.defaultFormat === 'custom'"
              inline-prompt
              active-text="开"
              inactive-text="关"
            />
            <span class="switch-hint">
              开启后，明细行确认 8/6 位格式时按生产日期写入批号；默认手输时此项不适用
            </span>
          </div>
        </el-form-item>

        <el-form-item label="当前设定摘要">
          <el-alert :title="formatSummary" type="info" show-icon :closable="false" />
        </el-form-item>

        <el-form-item label="格式预览">
          <div class="preview-box">
            <div class="preview-row">
              <span class="preview-label">示例生产日期</span>
              <span class="preview-value">{{ previewDate }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">生成批号</span>
              <span class="preview-value highlight">{{ previewBatchNo }}</span>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="适用单据">
          <div class="doc-mode-list">
            <div v-for="item in BATCH_NO_DOC_INPUT_MODES" :key="item.doc" class="doc-mode-row">
              <el-tag size="small" type="info">{{ item.doc }}</el-tag>
              <span class="doc-mode-hint">{{ item.hint }}</span>
            </div>
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="settings-card rules-card">
      <template #header>
        <span class="rules-card-title">业务规则</span>
      </template>
      <div class="rules-sections">
        <section v-for="section in BATCH_NO_BUSINESS_RULES" :key="section.title" class="rules-section">
          <h4>{{ section.title }}</h4>
          <ul>
            <li v-for="(line, index) in section.items" :key="index">{{ line }}</li>
          </ul>
        </section>
      </div>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.system-settings-page {
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
  margin: 6px 0 0;
  font-size: 13px;
  color: #606266;
  max-width: 820px;
  line-height: 1.6;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.settings-card {
  border-radius: 8px;

  & + & {
    margin-top: 12px;
  }
}

.settings-form {
  max-width: 820px;
}

.format-panel {
  padding: 12px 16px;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.vertical-options {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;

  :deep(.el-radio) {
    height: auto;
    align-items: flex-start;
    margin-right: 0;
  }

  :deep(.el-radio__label) {
    display: inline-flex;
    flex-direction: column;
    gap: 2px;
    line-height: 1.4;
    white-space: normal;
  }
}

.option-main {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.option-sub {
  font-size: 12px;
  color: #909399;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.switch-hint {
  font-size: 12px;
  color: #909399;
}

.preview-box {
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 6px;
  min-width: 280px;
}

.preview-row {
  display: flex;
  align-items: center;
  gap: 16px;

  & + & {
    margin-top: 8px;
  }
}

.preview-label {
  width: 96px;
  color: #909399;
  font-size: 13px;
}

.preview-value {
  font-size: 14px;
  color: #303133;

  &.highlight {
    font-weight: 600;
    color: #409eff;
  }
}

.doc-mode-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.doc-mode-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.doc-mode-hint {
  font-size: 13px;
  color: #606266;
}

.rules-card-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.rules-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.rules-section {
  h4 {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  ul {
    margin: 0;
    padding-left: 20px;
    color: #606266;
    font-size: 13px;
    line-height: 1.7;
  }

  li + li {
    margin-top: 4px;
  }
}
</style>
