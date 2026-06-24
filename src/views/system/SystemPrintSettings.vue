<script setup lang="ts">
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import {
  DEFAULT_PRINT_SETTINGS,
  loadPrintSettings,
  savePrintSettings,
  type PrintSettings
} from '@/utils/printSettings'

const form = reactive<PrintSettings>({ ...loadPrintSettings() })

const handleSave = () => {
  savePrintSettings({ ...form })
  ElMessage.success('打印设置已保存')
}

const handleReset = () => {
  Object.assign(form, DEFAULT_PRINT_SETTINGS)
  savePrintSettings({ ...form })
  ElMessage.success('已恢复默认打印设置')
}
</script>

<template>
  <div class="system-settings-page">
    <div class="page-header">
      <div>
        <div class="breadcrumb">首页 / 系统设置 / 打印设置</div>
        <h2>打印设置</h2>
        <p class="page-desc">配置默认纸张、预览方式及打印页眉页脚等全局选项。</p>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="handleReset">恢复默认</el-button>
        <el-button size="small" type="primary" @click="handleSave">保存</el-button>
      </div>
    </div>

    <el-card shadow="never" class="settings-card">
      <el-form label-width="120px" size="default">
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="默认纸张">
              <el-radio-group v-model="form.paperSize">
                <el-radio value="A4">A4</el-radio>
                <el-radio value="A5">A5</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="打印方向">
              <el-radio-group v-model="form.orientation">
                <el-radio value="portrait">纵向</el-radio>
                <el-radio value="landscape">横向</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="默认份数">
              <el-input-number v-model="form.defaultCopies" :min="1" :max="9" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="页边距(mm)">
              <el-input-number v-model="form.marginMm" :min="0" :max="30" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="打印前预览">
              <el-switch v-model="form.previewBeforePrint" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="显示公司抬头">
              <el-switch v-model="form.showCompanyHeader" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="显示审核章">
              <el-switch v-model="form.showAuditSeal" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="销售出库单样式">
              <el-radio-group v-model="form.salesOutboundPrintStyle">
                <el-radio value="list">销售清单（横向）</el-radio>
                <el-radio value="standard">标准出库单</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="页脚备注">
              <el-input
                v-model="form.footerRemark"
                type="textarea"
                :rows="2"
                placeholder="可选，打印在单据页脚"
                maxlength="120"
                show-word-limit
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
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
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.settings-card {
  :deep(.el-card__body) {
    padding: 16px 20px 8px;
  }
}
</style>
