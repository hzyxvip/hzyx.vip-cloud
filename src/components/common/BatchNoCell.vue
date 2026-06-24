<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  clearRowBatchNoFormat,
  getBatchNoFormatLabel,
  getEffectiveBatchNoFormat,
  hasConfirmedBatchNoFormat,
  setRowBatchNoFormat,
  type BatchNoFormat
} from '@/utils/productBatchExpiry'
import BatchNoFormatConfirmPanel from '@/components/common/BatchNoFormatConfirmPanel.vue'

const props = defineProps<{
  row: Record<string, any>
  globalFormat?: BatchNoFormat
  disabled?: boolean
}>()

const emit = defineEmits<{
  'format-change': []
  'batch-input': []
}>()

const panelOpen = ref(false)

const effectiveFormat = computed(() =>
  getEffectiveBatchNoFormat(props.row, props.globalFormat)
)

const formatLabel = computed(() => getBatchNoFormatLabel(effectiveFormat.value))

const showFormatTag = computed(() =>
  panelOpen.value ? false : hasConfirmedBatchNoFormat(props.row)
)

const openPanel = () => {
  if (props.disabled) return
  panelOpen.value = true
}

const closePanel = () => {
  panelOpen.value = false
}

const handleConfirm = (format: BatchNoFormat) => {
  if (format === 'custom') {
    clearRowBatchNoFormat(props.row)
  } else {
    setRowBatchNoFormat(props.row, format, props.globalFormat)
    props.row._batchNoManual = false
  }
  closePanel()
  emit('format-change')
}

const onBatchInput = () => {
  emit('batch-input')
}
</script>

<template>
  <div class="batch-no-cell">
    <div v-if="panelOpen" class="cell-format-panel">
      <BatchNoFormatConfirmPanel
        :model-value="effectiveFormat === 'custom' ? 'YYYYMMDD' : effectiveFormat"
        :disabled="disabled"
        compact
        @confirm="handleConfirm"
      />
    </div>
    <div v-else-if="showFormatTag" class="cell-format-tag">
      <button
        type="button"
        class="format-selected-tag"
        :disabled="disabled"
        title="点击更改批号格式"
        @click="openPanel"
      >
        {{ formatLabel }}
      </button>
    </div>
    <div class="cell-input-row">
      <el-input
        v-model="row.batchNo"
        size="small"
        placeholder="批号"
        :disabled="disabled"
        @input="onBatchInput"
      />
      <button
        v-if="!showFormatTag && !panelOpen"
        type="button"
        class="format-trigger"
        :disabled="disabled"
        title="按生产日期选择批号格式"
        @click="openPanel"
      >
        格式
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.batch-no-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;

  .cell-format-panel {
    width: 100%;
  }

  .cell-format-tag {
    display: flex;
  }

  .format-selected-tag {
    padding: 1px 8px;
    font-size: 11px;
    line-height: 18px;
    border: 1px solid #409eff;
    border-radius: 3px;
    background: #ecf5ff;
    color: #409eff;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: #d9ecff;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  .cell-input-row {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;

    .el-input {
      flex: 1;
      min-width: 0;
    }
  }

  .format-trigger {
    flex-shrink: 0;
    padding: 0 4px;
    height: 22px;
    border: none;
    background: transparent;
    color: #909399;
    font-size: 11px;
    cursor: pointer;
    white-space: nowrap;

    &:hover:not(:disabled) {
      color: #409eff;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }
}
</style>
