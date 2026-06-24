import { ref, computed, watch, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  type StockBatchModifyColumn,
  parseStockBatchModifyValue
} from '@/utils/stockBatchModifyOptions'

export type StockBatchModifyContext = {
  entityLabel: string
  columns: StockBatchModifyColumn[]
  selectedIds: Ref<number[]>
  getSelectOptions: (key: string) => Array<{ label: string; value: string }> | null
  applyUpdate: (id: number, prop: string, value: unknown) => void | Promise<void>
  validateBatch?: (prop: string, value: unknown, selectedCount: number) => string | null
  clearSelection: () => void
}

export function useStockBatchModifyActions(context: StockBatchModifyContext) {
  const showBatchModifyDialog = ref(false)
  const batchModifyColumn = ref('')
  const batchModifyValue = ref('')

  const batchModifiableColumns = context.columns

  const batchModifyColumnDef = computed(() =>
    batchModifiableColumns.find(col => col.key === batchModifyColumn.value)
  )

  const batchModifySelectOptions = computed(() =>
    context.getSelectOptions(batchModifyColumn.value)
  )

  watch(batchModifyColumn, () => {
    batchModifyValue.value = ''
  })

  const openBatchModifyDialog = () => {
    if (context.selectedIds.value.length === 0) {
      ElMessage.warning(`请先勾选${context.entityLabel}`)
      return
    }
    batchModifyColumn.value = batchModifiableColumns[0]?.key || ''
    batchModifyValue.value = ''
    showBatchModifyDialog.value = true
  }

  const confirmBatchModify = async () => {
    const col = batchModifiableColumns.find(item => item.key === batchModifyColumn.value)
    if (!col) {
      ElMessage.warning('请选择要修改的字段')
      return
    }

    const raw = String(batchModifyValue.value ?? '').trim()
    if (!raw) {
      ElMessage.warning('请填写新值')
      return
    }

    const selectOptions = context.getSelectOptions(col.key)
    if (selectOptions && !selectOptions.some(opt => opt.value === raw)) {
      ElMessage.warning('请选择有效的新值')
      return
    }

    const parsed = parseStockBatchModifyValue(col.key, raw)
    const validationMessage = context.validateBatch?.(col.prop, parsed, context.selectedIds.value.length)
    if (validationMessage) {
      ElMessage.warning(validationMessage)
      return
    }

    const count = context.selectedIds.value.length
    try {
      await Promise.all(
        context.selectedIds.value.map(id => Promise.resolve(context.applyUpdate(id, col.prop, parsed)))
      )
      showBatchModifyDialog.value = false
      context.clearSelection()
      ElMessage.success(`已修改 ${count} 条${context.entityLabel}的「${col.label}」`)
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '修改失败')
    }
  }

  return {
    showBatchModifyDialog,
    batchModifyColumn,
    batchModifyValue,
    batchModifiableColumns,
    batchModifyColumnDef,
    batchModifySelectOptions,
    openBatchModifyDialog,
    confirmBatchModify
  }
}
