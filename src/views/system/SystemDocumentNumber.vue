<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  DOCUMENT_NUMBER_RULES,
  loadDocumentNumberRules,
  previewDocumentNumber,
  saveDocumentNumberRules,
  type DocumentNumberDatePattern,
  type DocumentNumberRule
} from '@/utils/documentNumberSettings'

const rules = ref<DocumentNumberRule[]>(loadDocumentNumberRules())

const datePatternOptions: Array<{ label: string; value: DocumentNumberDatePattern }> = [
  { label: 'yyyyMMdd', value: 'yyyyMMdd' },
  { label: 'yyyy-MM-dd', value: 'yyyy-MM-dd' },
  { label: '不含日期', value: 'none' }
]

const handleSave = () => {
  saveDocumentNumberRules(rules.value)
  ElMessage.success('单据编号设定已保存')
}

const handleReset = () => {
  rules.value = DOCUMENT_NUMBER_RULES.map(rule => ({ ...rule }))
  saveDocumentNumberRules(rules.value)
  ElMessage.success('已恢复默认编号规则')
}
</script>

<template>
  <div class="system-settings-page">
    <div class="page-header">
      <div>
        <div class="breadcrumb">首页 / 系统设置 / 单据编号设定</div>
        <h2>单据编号设定</h2>
        <p class="page-desc">配置各类单据编号前缀、日期段与流水号规则，右侧为示例预览。</p>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="handleReset">恢复默认</el-button>
        <el-button size="small" type="primary" @click="handleSave">保存</el-button>
      </div>
    </div>

    <el-card shadow="never" class="settings-card">
      <el-table :data="rules" border stripe size="small">
        <el-table-column prop="name" label="单据类型" min-width="110" fixed />
        <el-table-column label="前缀" width="120">
          <template #default="{ row }">
            <el-input v-model="row.prefix" maxlength="12" />
          </template>
        </el-table-column>
        <el-table-column label="日期格式" width="140">
          <template #default="{ row }">
            <el-select v-model="row.datePattern" style="width: 100%">
              <el-option
                v-for="opt in datePatternOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="分隔符" width="90">
          <template #default="{ row }">
            <el-input v-model="row.separator" maxlength="2" />
          </template>
        </el-table-column>
        <el-table-column label="流水位数" width="110">
          <template #default="{ row }">
            <el-input-number v-model="row.serialDigits" :min="0" :max="6" controls-position="right" />
          </template>
        </el-table-column>
        <el-table-column label="编号示例" min-width="180">
          <template #default="{ row }">
            <span class="preview-no">{{ previewDocumentNumber(row) }}</span>
          </template>
        </el-table-column>
      </el-table>
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
    padding: 0;
  }
}

.preview-no {
  font-family: Consolas, 'Courier New', monospace;
  color: #409eff;
  font-size: 12px;
}
</style>
