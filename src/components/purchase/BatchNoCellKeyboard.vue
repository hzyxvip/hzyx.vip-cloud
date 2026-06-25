<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { InputInstance } from 'element-plus'
import {
  clearRowBatchNoFormat,
  formatProductionDateToBatchNo,
  getRowProductionDate,
  setRowBatchNoFormat,
  type BatchNoFormat
} from '@/utils/productBatchExpiry'

const props = defineProps<{
  row: Record<string, any>
  globalFormat?: BatchNoFormat
  disabled?: boolean
}>()

const emit = defineEmits<{
  'format-change': []
  'batch-input': []
}>()

const FORMAT_KEYS: BatchNoFormat[] = ['YYYYMMDD', 'YYMMDD']

const inputRef = ref<InputInstance>()
const formatBtnRefs = ref<(HTMLButtonElement | null)[]>([null, null])

/** 选择格式时只显示两行；确认后只显示批号输入框 */
const hasProductionDate = computed(() => Boolean(getRowProductionDate(props.row)))

const showFormatPicker = computed(
  () => hasProductionDate.value && props.row._batchFormatPickerOpen === true
)

const showBatchInput = computed(
  () => hasProductionDate.value && props.row._batchFormatPickerOpen === false
)

/** 按当前生产日期预览 8 位 / 6 位批号（无生产日期时不展示） */
const formatPreviewLabels = computed(() => {
  const pd = getRowProductionDate(props.row)
  if (!pd) return []
  return [
    formatProductionDateToBatchNo(pd, 'YYYYMMDD') || '—',
    formatProductionDateToBatchNo(pd, 'YYMMDD') || '—'
  ]
})

const setFormatRef = (index: number, el: unknown) => {
  formatBtnRefs.value[index] = (el as HTMLButtonElement | null) ?? null
}

const openFormatPicker = () => {
  if (!getRowProductionDate(props.row)) return
  props.row._batchFormatPickerOpen = true
}

const closeFormatPicker = () => {
  props.row._batchFormatPickerOpen = false
}

const focusFormatButton = (index: number) => {
  openFormatPicker()
  nextTick(() => {
    formatBtnRefs.value[index]?.focus()
  })
}

const focusBatchInput = () => {
  nextTick(() => {
    const input = inputRef.value?.input ?? inputRef.value?.$el?.querySelector('input')
    if (input instanceof HTMLInputElement) {
      input.focus()
      input.select?.()
    }
  })
}

const focusFirstFormat = () => focusFormatButton(0)

defineExpose({ focusFirstFormat, focusBatchInput, openFormatPicker })

const applyFormat = (format: 'YYYYMMDD' | 'YYMMDD') => {
  if (props.disabled) return
  setRowBatchNoFormat(props.row, format, props.globalFormat)
  props.row._batchNoManual = false
  closeFormatPicker()
  emit('format-change')
  focusBatchInput()
}

const startCustomBatchInput = (firstChar?: string) => {
  clearRowBatchNoFormat(props.row)
  props.row.batchNo = firstChar || ''
  closeFormatPicker()
  focusBatchInput()
  if (firstChar) emit('batch-input')
}

const onFormatKeydown = (e: KeyboardEvent, index: 0 | 1) => {
  if (props.disabled || !showFormatPicker.value) return

  if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
    applyFormat(FORMAT_KEYS[index] as 'YYYYMMDD' | 'YYMMDD')
    return
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    e.stopPropagation()
    if (index === 0) focusFormatButton(1)
    return
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    e.stopPropagation()
    if (index === 1) focusFormatButton(0)
    return
  }

  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.key.startsWith('Arrow')) {
    e.preventDefault()
    e.stopPropagation()
    startCustomBatchInput(e.key)
  }
}

const onInputKeydown = (e: KeyboardEvent) => {
  if (props.disabled) return
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    e.stopPropagation()
    focusFormatButton(1)
  }
}

const onBatchInput = () => {
  emit('batch-input')
}
</script>

<template>
  <div class="batch-no-cell-kb">
    <template v-if="showFormatPicker">
      <button
        v-for="(label, index) in formatPreviewLabels"
        :key="FORMAT_KEYS[index]"
        :ref="el => setFormatRef(index, el)"
        type="button"
        class="fmt-pick"
        :disabled="disabled"
        :data-batch-format="FORMAT_KEYS[index]"
        tabindex="0"
        @keydown="onFormatKeydown($event, index as 0 | 1)"
        @click="applyFormat(FORMAT_KEYS[index] as 'YYYYMMDD' | 'YYMMDD')"
      >
        {{ label }}
      </button>
    </template>
    <el-input
      v-else-if="showBatchInput"
      ref="inputRef"
      v-model="row.batchNo"
      size="small"
      :disabled="disabled"
      @keydown="onInputKeydown"
      @input="onBatchInput"
    />
  </div>
</template>

<style scoped lang="scss">
.batch-no-cell-kb {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  min-height: 24px;
  justify-content: center;

  .fmt-pick {
    width: 100%;
    margin: 0;
    padding: 1px 4px;
    border: 1px solid transparent;
    border-radius: 2px;
    background: transparent;
    color: #b0b3b8;
    font-size: 12px;
    line-height: 1.45;
    text-align: center;
    cursor: pointer;
    transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease;

    &:hover:not(:disabled):not(:focus) {
      color: #606266;
      background: #f0f2f5;
    }

    &:focus {
      outline: none;
      color: #1d2939;
      font-weight: 600;
      background: #ffc53d;
      border-color: #d48806;
      box-shadow: inset 0 0 0 1px #d48806;
    }

    &:focus-visible {
      outline: none;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }
  }

  :deep(.el-input__wrapper.is-focus),
  :deep(.el-input.is-focus .el-input__wrapper) {
    background: #ffc53d !important;
    box-shadow: inset 0 0 0 1px #d48806 !important;
  }

  :deep(.el-input__wrapper.is-focus .el-input__inner),
  :deep(.el-input.is-focus .el-input__inner) {
    color: #1d2939 !important;
    font-weight: 600;
    -webkit-text-fill-color: #1d2939 !important;
  }
}
</style>
