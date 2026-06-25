<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  DOCUMENT_FUNCTION_CATEGORY_LABELS,
  DOCUMENT_FUNCTION_ITEMS,
  type DocumentFunctionCategory,
  type DocumentFunctionKey,
  loadDocumentConfirmSettings,
  saveDocumentConfirmSettings
} from '@/utils/documentFunctionSettings'

const confirmSettings = ref(loadDocumentConfirmSettings())

const categoryOrder: DocumentFunctionCategory[] = ['order', 'inbound', 'outbound', 'document']

const groupedItems = computed(() =>
  categoryOrder.map(category => ({
    category,
    label: DOCUMENT_FUNCTION_CATEGORY_LABELS[category],
    items: DOCUMENT_FUNCTION_ITEMS.filter(item => item.category === category)
  }))
)

const handleSave = () => {
  saveDocumentConfirmSettings(confirmSettings.value)
  ElMessage.success('单据功能设定已保存')
}

const handleReset = () => {
  confirmSettings.value = loadDocumentConfirmSettings()
  DOCUMENT_FUNCTION_ITEMS.forEach(item => {
    confirmSettings.value[item.key] = true
  })
  saveDocumentConfirmSettings(confirmSettings.value)
  ElMessage.success('已恢复默认设定')
}

const toggleAll = (category: DocumentFunctionCategory, enabled: boolean) => {
  DOCUMENT_FUNCTION_ITEMS
    .filter(item => item.category === category)
    .forEach(item => {
      confirmSettings.value[item.key as DocumentFunctionKey] = enabled
    })
}
</script>

<template>
  <div class="system-doc-function">
    <div class="page-header">
      <div>
        <div class="breadcrumb">首页 / 系统设置 / 单据功能设定</div>
        <h2>单据功能设定</h2>
        <p class="page-desc">「确定」步骤是否启用，由「权限与用户 → 审核制度」统一控制（双重审核时启用，一级审核时不启用）。</p>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="handleReset">恢复默认</el-button>
        <el-button size="small" type="primary" @click="handleSave">保存</el-button>
      </div>
    </div>

    <div class="category-grid">
      <el-card
        v-for="group in groupedItems"
        :key="group.category"
        shadow="never"
        class="category-card"
      >
        <template #header>
          <div class="card-head">
            <span class="category-tag">{{ group.label }}</span>
            <span class="category-name">{{ group.label === '订' ? '订单' : group.label === '进' ? '入库' : group.label === '出' ? '出库' : '其他单据' }}</span>
            <div class="card-actions">
              <el-button link type="primary" size="small" @click="toggleAll(group.category, true)">全开</el-button>
              <el-button link type="danger" size="small" @click="toggleAll(group.category, false)">全关</el-button>
            </div>
          </div>
        </template>

        <el-table :data="group.items" size="small" border stripe>
          <el-table-column prop="name" label="单据名称" min-width="140" />
          <el-table-column label="确定功能" width="120" align="center">
            <template #default="{ row }">
              <el-switch
                v-model="confirmSettings[row.key]"
                inline-prompt
                active-text="开"
                inactive-text="关"
              />
            </template>
          </el-table-column>
          <el-table-column prop="permissionCode" label="权限码" min-width="160" />
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.system-doc-function {
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

.category-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.category-card {
  :deep(.el-card__header) {
    padding: 10px 12px;
  }

  :deep(.el-card__body) {
    padding: 0;
  }
}

.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: #ecf5ff;
  color: #409eff;
  font-size: 13px;
  font-weight: 700;
}

.category-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.card-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

@media (max-width: 1200px) {
  .category-grid {
    grid-template-columns: 1fr;
  }
}
</style>
