<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  BUILTIN_PRINT_TEMPLATES,
  applyCustomPrintTemplate,
  getDefaultTemplateJson,
  preview,
  resetPrintTemplateToDefault,
  type BuiltinPrintTemplateId
} from '@/utils/printService'
import {
  clearCustomTemplateBody,
  hasCustomTemplate,
  loadCustomTemplateBody,
  saveCustomTemplateBody
} from '@/utils/printTemplateSettings'
import { PRINT_TEMPLATE_SAMPLE_DATA } from '@/utils/printSampleData'

const router = useRouter()
const selectedId = ref<BuiltinPrintTemplateId>('salesOutbound')
const editorText = ref('')
const parseError = ref('')
const importInputRef = ref<HTMLInputElement>()

const templateOptions = BUILTIN_PRINT_TEMPLATES.map(item => ({
  value: item.id,
  label: item.name
}))

const isCustom = computed(() => hasCustomTemplate(selectedId.value))

const fieldHints = computed(() => {
  const common = [
    '{{companyName}}', '{{companyAddress}}', '{{companyPhone}}',
    '{{totalAmount}}', '{{totalAmountUppercase}}', '{{footerRemark}}'
  ]
  const map: Record<BuiltinPrintTemplateId, string[]> = {
    salesOutbound: [
      ...common,
      '{{deliveryDate}}', '{{salesDate}}', '{{buyerName}}', '{{buyerAddress}}',
      '{{buyerPhone}}', '{{documentNo}}', '{{warehouseName}}', '{{receiver}}',
      '{{receiverPhone}}', '{{licenseNo}}', '{{qualityStatus}}', '{{items}}'
    ],
    salesReturn: [
      ...common,
      '{{returnDate}}', '{{buyerName}}', '{{documentNo}}', '{{returnTypeLabel}}',
      '{{returnReason}}', '{{logisticsCompany}}', '{{logisticsNo}}', '{{items}}'
    ],
    purchaseInbound: [
      ...common,
      '{{inboundDate}}', '{{supplierName}}', '{{documentNo}}', '{{warehouseName}}',
      '{{checker}}', '{{inspector}}', '{{qualityStatus}}', '{{items}}'
    ],
    purchaseReturn: [
      ...common,
      '{{returnDate}}', '{{supplierName}}', '{{documentNo}}', '{{returnReason}}',
      '{{logisticsCompany}}', '{{logisticsNo}}', '{{items}}'
    ],
    salesOrder: [
      ...common,
      '{{orderDate}}', '{{deliveryDate}}', '{{customerName}}', '{{customerCode}}',
      '{{contact}}', '{{documentNo}}', '{{warehouseName}}', '{{remark}}', '{{items}}'
    ]
  }
  return map[selectedId.value]
})

const loadEditorFromEffective = () => {
  parseError.value = ''
  const customBody = loadCustomTemplateBody(selectedId.value)
  editorText.value = customBody
    ? JSON.stringify(customBody, null, 2)
    : getDefaultTemplateJson(selectedId.value)
}

watch(selectedId, loadEditorFromEffective, { immediate: true })

const parseEditorJson = (): unknown | null => {
  parseError.value = ''
  try {
    const parsed = JSON.parse(editorText.value)
    if (!parsed || typeof parsed !== 'object') {
      parseError.value = '模板须为 JSON 对象'
      return null
    }
    return parsed
  } catch (error) {
    parseError.value = 'JSON 格式错误：' + (error as Error).message
    return null
  }
}

const handleSave = () => {
  const body = parseEditorJson()
  if (!body) return
  saveCustomTemplateBody(selectedId.value, body)
  applyCustomPrintTemplate(selectedId.value, body)
  ElMessage.success('自定义模板已保存，打印时将立即生效')
}

const handleReset = () => {
  ElMessageBox.confirm('确定恢复为系统内置模板？您的自定义 JSON 将被清除。', '恢复默认', {
    type: 'warning',
    confirmButtonText: '恢复',
    cancelButtonText: '取消'
  }).then(() => {
    clearCustomTemplateBody(selectedId.value)
    resetPrintTemplateToDefault(selectedId.value)
    loadEditorFromEffective()
    ElMessage.success('已恢复系统默认模板')
  }).catch(() => {})
}

const handlePreview = () => {
  const body = parseEditorJson()
  if (!body) return
  applyCustomPrintTemplate(selectedId.value, body)
  const sample = PRINT_TEMPLATE_SAMPLE_DATA[selectedId.value]
  if (!sample) {
    ElMessage.warning('暂无该模板的示例数据')
    return
  }
  try {
    preview(selectedId.value, structuredClone(sample))
  } catch (error) {
    ElMessage.error('预览失败：' + (error as Error).message)
  }
}

const handleExport = () => {
  const body = parseEditorJson()
  if (!body) return
  const blob = new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `print-template-${selectedId.value}.json`
  link.click()
  URL.revokeObjectURL(url)
}

const triggerImport = () => {
  importInputRef.value?.click()
}

const handleImportFile = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    editorText.value = String(reader.result || '')
    parseError.value = ''
    ElMessage.success('已导入 JSON，请检查后保存')
  }
  reader.onerror = () => ElMessage.error('读取文件失败')
  reader.readAsText(file, 'utf-8')
}

const loadSystemDefault = () => {
  editorText.value = getDefaultTemplateJson(selectedId.value)
  parseError.value = ''
  ElMessage.info('已载入系统默认模板（未保存）')
}
</script>

<template>
  <div class="system-settings-page">
    <div class="page-header">
      <div>
        <div class="breadcrumb">首页 / 系统设置 / 打印模板</div>
        <h2>自定义打印模板</h2>
        <p class="page-desc">
          编辑 hiprint 模板 JSON，适用于「标准出库单」及销售订单、采购入库等 A4 模板。
          销售清单（241mm）样式请在
          <el-button link type="primary" @click="router.push('/system/print')">打印设置</el-button>
          中配置。
        </p>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="router.push('/system/print')">返回打印设置</el-button>
        <el-button size="small" @click="loadSystemDefault">载入系统默认</el-button>
        <el-button size="small" @click="handleReset">恢复默认</el-button>
        <el-button size="small" type="primary" @click="handleSave">保存模板</el-button>
      </div>
    </div>

    <el-card shadow="never" class="settings-card">
      <el-form label-width="100px" inline class="selector-form">
        <el-form-item label="模板类型">
          <el-select v-model="selectedId" style="width: 220px">
            <el-option
              v-for="opt in templateOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="当前状态">
          <el-tag :type="isCustom ? 'success' : 'info'" size="small">
            {{ isCustom ? '已自定义' : '系统默认' }}
          </el-tag>
        </el-form-item>
      </el-form>

      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="hint-alert"
        title="模板为 hiprint JSON：含 width、height、elements 等。文本中使用 {{字段名}} 占位；明细表 type 为 table，dataKey 一般为 items。"
      />

      <div class="editor-layout">
        <div class="editor-panel">
          <div class="panel-head">
            <span>模板 JSON</span>
            <div class="panel-actions">
              <el-button size="small" @click="triggerImport">导入 JSON</el-button>
              <el-button size="small" @click="handleExport">导出 JSON</el-button>
              <el-button size="small" type="primary" plain @click="handlePreview">预览</el-button>
            </div>
          </div>
          <el-input
            v-model="editorText"
            type="textarea"
            :rows="28"
            class="json-editor"
            spellcheck="false"
            placeholder="在此编辑 hiprint 模板 JSON…"
          />
          <p v-if="parseError" class="parse-error">{{ parseError }}</p>
        </div>

        <div class="hint-panel">
          <div class="panel-head">可用占位字段</div>
          <ul class="field-list">
            <li v-for="field in fieldHints" :key="field"><code>{{ field }}</code></li>
          </ul>
          <div class="panel-head sub">明细表 columns.field 示例</div>
          <ul class="field-list">
            <li><code>productCode</code></li>
            <li><code>productName</code></li>
            <li><code>spec</code></li>
            <li><code>manufacturer</code></li>
            <li><code>quantity</code></li>
            <li><code>unitPrice</code></li>
            <li><code>amount</code></li>
            <li><code>batchNo</code></li>
          </ul>
        </div>
      </div>
    </el-card>

    <input
      ref="importInputRef"
      type="file"
      accept="application/json,.json"
      class="hidden-input"
      @change="handleImportFile"
    />
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
  line-height: 1.6;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
}

.settings-card {
  :deep(.el-card__body) {
    padding: 16px 20px 20px;
  }
}

.selector-form {
  margin-bottom: 8px;
}

.hint-alert {
  margin-bottom: 12px;
}

.editor-layout {
  display: grid;
  grid-template-columns: 1fr 240px;
  gap: 16px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;

  &.sub {
    margin-top: 16px;
    font-size: 12px;
    font-weight: 500;
    color: #606266;
  }
}

.panel-actions {
  display: flex;
  gap: 6px;
}

.json-editor :deep(textarea) {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
}

.parse-error {
  margin: 8px 0 0;
  font-size: 12px;
  color: #f56c6c;
}

.field-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: #606266;
  line-height: 1.8;

  code {
    font-family: Consolas, 'Courier New', monospace;
    font-size: 11px;
    color: #409eff;
  }
}

.hidden-input {
  display: none;
}

@media (max-width: 960px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
  }
}
</style>
