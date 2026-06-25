<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  DEFAULT_PRINT_SETTINGS,
  loadPrintSettings,
  savePrintSettings,
  SALES_LIST_PAPER_OPTIONS,
  SALES_OUTBOUND_PRINT_STYLE_OPTIONS,
  type PrintSettings
} from '@/utils/printSettings'

const router = useRouter()
const form = reactive<PrintSettings>({ ...loadPrintSettings() })

const isSalesListStyle = computed(() => form.salesOutboundPrintStyle === 'list')

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
        <p class="page-desc">销售出库单可单独配置「销售清单」版式；其他单据使用下方通用选项。</p>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="handleReset">恢复默认</el-button>
        <el-button size="small" type="primary" @click="handleSave">保存</el-button>
      </div>
    </div>

    <el-card shadow="never" class="settings-card settings-card-primary">
      <template #header>
        <div class="card-title">销售清单打印样式</div>
        <div class="card-subtitle">作用于销售出库单 · 样式选「销售清单」时生效</div>
      </template>

      <el-form label-width="120px" size="default">
        <el-form-item label="出库单样式">
          <el-radio-group v-model="form.salesOutboundPrintStyle" class="style-option-group">
            <div
              v-for="opt in SALES_OUTBOUND_PRINT_STYLE_OPTIONS"
              :key="opt.value"
              class="style-option"
            >
              <el-radio :value="opt.value">{{ opt.label }}</el-radio>
              <span class="option-hint">{{ opt.hint }}</span>
            </div>
          </el-radio-group>
        </el-form-item>

        <template v-if="isSalesListStyle">
          <el-form-item label="清单纸规">
            <el-radio-group v-model="form.salesListPaperSize" class="paper-option-group">
              <div
                v-for="opt in SALES_LIST_PAPER_OPTIONS"
                :key="opt.value"
                class="paper-option"
              >
                <el-radio :value="opt.value">{{ opt.label }}</el-radio>
                <span class="option-hint">{{ opt.hint }}</span>
              </div>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="页边距(mm)">
            <el-input-number v-model="form.marginMm" :min="0" :max="20" />
            <div class="field-tip">241mm 针式/热敏纸建议 5–8mm；明细多时可适当缩小</div>
          </el-form-item>

          <el-form-item label="页脚备注">
            <el-input
              v-model="form.footerRemark"
              type="textarea"
              :rows="2"
              placeholder="如：本单一式三联，白联存根、粉联客户、黄联仓库"
              maxlength="120"
              show-word-limit
            />
          </el-form-item>
        </template>

        <el-alert
          v-else
          type="info"
          :closable="false"
          show-icon
          class="style-alert"
          title="当前为标准出库单样式，纸张与方向请在下方「通用打印选项」中配置（建议 A4 横向）。"
        />

        <el-row :gutter="24">
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
        </el-row>
      </el-form>
    </el-card>

    <el-card shadow="never" class="settings-card">
      <template #header>
        <div class="card-title-row">
          <div>
            <div class="card-title">通用打印选项</div>
            <div class="card-subtitle">标准出库单、销售订单、采购入库等 hiprint 模板</div>
          </div>
          <el-button type="primary" link @click="router.push('/system/print-template')">
            自定义打印模板 →
          </el-button>
        </div>
      </template>

      <el-form label-width="120px" size="default">
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="纸张">
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
            <el-form-item label="默认打印机">
              <el-input
                v-model="form.printerName"
                placeholder="留空使用系统默认打印机"
                clearable
                maxlength="120"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="显示审核章">
              <el-switch v-model="form.showAuditSeal" />
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
  margin-bottom: 12px;

  :deep(.el-card__header) {
    padding: 14px 20px 10px;
    border-bottom: 1px solid #ebeef5;
  }

  :deep(.el-card__body) {
    padding: 16px 20px 8px;
  }
}

.settings-card-primary {
  :deep(.el-card__header) {
    background: linear-gradient(180deg, #f0f7ff 0%, #fafcff 100%);
  }
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.card-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.card-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.field-tip,
.option-hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.field-tip {
  margin-top: 4px;
}

.style-option-group,
.paper-option-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.style-option,
.paper-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.option-hint {
  margin-left: 22px;
}

.style-alert {
  margin-bottom: 12px;
}

@media (max-width: 768px) {
  .system-settings-page {
    padding: 12px;
  }

  .page-header {
    flex-direction: column;
  }
}
</style>
