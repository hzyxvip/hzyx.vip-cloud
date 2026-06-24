<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  getBatchNoFormatLabel,
  saveBatchNoFormat,
  type BatchNoFormat
} from '@/utils/productBatchExpiry'
import BatchNoFormatConfirmPanel from '@/components/common/BatchNoFormatConfirmPanel.vue'

const props = withDefaults(
  defineProps<{
    modelValue: BatchNoFormat
    disabled?: boolean
  }>(),
  { disabled: false }
)

const emit = defineEmits<{
  'update:modelValue': [BatchNoFormat]
  change: [BatchNoFormat]
}>()

const panelOpen = ref(false)

const showFormatTag = computed(() => getBatchNoFormatLabel(props.modelValue) !== null)

const openPanel = () => {
  if (props.disabled) return
  panelOpen.value = true
}

const closePanel = () => {
  panelOpen.value = false
}

const handleConfirm = (format: BatchNoFormat) => {
  emit('update:modelValue', format)
  emit('change', format)
  saveBatchNoFormat(format)
  closePanel()
}
</script>

<template>
  <div class="batch-no-format-picker">
    <div v-if="panelOpen" class="picker-panel">
      <BatchNoFormatConfirmPanel
        :model-value="modelValue"
        :disabled="disabled"
        @confirm="handleConfirm"
      />
    </div>
    <template v-else>
      <button
        v-if="showFormatTag"
        type="button"
        class="format-selected-tag"
        :disabled="disabled"
        title="点击更改批号格式"
        @click="openPanel"
      >
        {{ getBatchNoFormatLabel(modelValue) }}
      </button>
      <button
        v-else
        type="button"
        class="format-setup-link"
        :disabled="disabled"
        @click="openPanel"
      >
        设置新行批号格式
      </button>
    </template>
  </div>
</template>

<style scoped lang="scss">
.batch-no-format-picker {
  display: inline-flex;
  align-items: center;

  .picker-panel {
    min-width: 140px;
  }

  .format-selected-tag {
    padding: 2px 10px;
    font-size: 12px;
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

  .format-setup-link {
    padding: 0;
    border: none;
    background: transparent;
    color: #909399;
    font-size: 12px;
    cursor: pointer;

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
