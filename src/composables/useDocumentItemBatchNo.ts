import { nextTick } from 'vue'
import {
  loadBatchNoFormat,
  applyProductionDateToItemRow,
  calcProductExpiryDate,
  resolveProductForRow,
  clearRowBatchNoFormat,
  getRowProductionDate,
  hasConfirmedBatchNoFormat,
  markBatchNoManual,
  markExpiryManual,
  getDefaultBatchFormatFocusKey,
} from '@/utils/productBatchExpiry'

export function isBatchNoFormatTarget(target: EventTarget | null) {
  return !!(target as HTMLElement)?.closest('.batch-no-cell-kb [data-batch-format]')
}

export function isBatchNoInputTarget(target: EventTarget | null) {
  return !!(target as HTMLElement)?.closest('.batch-no-cell-kb .el-input__inner')
}

export type FocusBatchNoCellOptions = {
  rowData: Record<string, any>
  cell: HTMLElement | undefined
  fromColKey?: string
  /** 格式/输入框均无法聚焦时回调（如自动跳到下一列） */
  onFocusFailed?: () => void
}

export function useDocumentItemBatchNo() {
  const syncExpiryFromProductionDate = (
    row: Record<string, any>,
    product?: ReturnType<typeof resolveProductForRow>
  ) => {
    if (row._expiryManual || !row.productionDate) return
    const master = product ?? resolveProductForRow(row)
    const expiry = calcProductExpiryDate(String(row.productionDate), master)
    if (expiry) row.expiryDate = expiry
  }

  const handleProductionDateChange = (row: Record<string, any>) => {
    if (!getRowProductionDate(row)) {
      row._batchFormatPickerOpen = false
      row.batchNo = ''
      clearRowBatchNoFormat(row)
      row._batchNoManual = false
      return
    }
    syncExpiryFromProductionDate(row)
    if (hasConfirmedBatchNoFormat(row)) {
      applyProductionDateToItemRow(row, resolveProductForRow(row), loadBatchNoFormat())
    } else {
      row._batchFormatPickerOpen = false
      row.batchNo = ''
      clearRowBatchNoFormat(row)
      row._batchNoManual = false
    }
  }

  const handleBatchFormatChange = (row: Record<string, any>) => {
    applyProductionDateToItemRow(row, resolveProductForRow(row), loadBatchNoFormat())
    syncExpiryFromProductionDate(row, resolveProductForRow(row))
  }

  const handleBatchNoInput = (row: Record<string, any>) => {
    markBatchNoManual(row, loadBatchNoFormat())
  }

  const handleExpiryDateChange = (row: Record<string, any>) => {
    markExpiryManual(row)
  }

  const focusBatchNoControl = (cell: HTMLElement | undefined) => {
    const focusKey = getDefaultBatchFormatFocusKey()
    const firstFormat = cell?.querySelector(
      `[data-batch-format="${focusKey}"]`
    ) as HTMLButtonElement | null
    if (firstFormat) {
      firstFormat.focus()
      return true
    }
    const batchInput = cell?.querySelector(
      '.batch-no-cell-kb .el-input__inner'
    ) as HTMLInputElement | null
    if (batchInput) {
      batchInput.focus()
      batchInput.select?.()
      return true
    }
    return false
  }

  const focusBatchNoCell = ({ rowData, cell, fromColKey, onFocusFailed }: FocusBatchNoCellOptions) => {
    if (!getRowProductionDate(rowData)) {
      onFocusFailed?.()
      return
    }

    if (fromColKey === 'productionDate') {
      rowData._batchFormatPickerOpen = true
      rowData.batchNo = ''
      clearRowBatchNoFormat(rowData)
      rowData._batchNoManual = false
    } else if (
      rowData._batchFormatPickerOpen === false &&
      String(rowData.batchNo || '').trim()
    ) {
      const input = cell?.querySelector(
        '.batch-no-cell-kb .el-input__inner'
      ) as HTMLInputElement | null
      input?.focus()
      input?.select?.()
      return
    } else {
      rowData._batchFormatPickerOpen = true
    }

    nextTick(() => {
      if (focusBatchNoControl(cell)) return
      if (onFocusFailed) {
        requestAnimationFrame(() => {
          if (!focusBatchNoControl(cell)) onFocusFailed()
        })
      }
    })
  }

  return {
    syncExpiryFromProductionDate,
    handleProductionDateChange,
    handleBatchFormatChange,
    handleBatchNoInput,
    handleExpiryDateChange,
    focusBatchNoCell,
  }
}
