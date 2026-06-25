import dayjs from 'dayjs'
import { findProductInList, type ProductMaster } from '@/utils/productStore'
import {
  type BatchNoFormat,
  getBatchNoFormatLabel,
  isBatchNoAutoGenerateEnabled,
  loadBatchNoFormat,
  saveBatchNoFormat
} from '@/utils/batchNoSettings'

export type { BatchNoFormat } from '@/utils/batchNoSettings'
export {
  BATCH_NO_APPLICABLE_DOCS,
  BATCH_NO_BUSINESS_RULES,
  BATCH_NO_DOC_INPUT_MODES,
  BATCH_NO_FORMAT_OPTIONS,
  DEFAULT_BATCH_NO_SETTINGS,
  getBatchNoFormatLabel,
  getDefaultBatchFormatFocusKey,
  isBatchNoAutoGenerateEnabled,
  loadBatchNoFormat,
  loadBatchNoSettings,
  resetBatchNoSettings,
  saveBatchNoFormat,
  saveBatchNoSettings,
  type BatchNoSettings
} from '@/utils/batchNoSettings'

/** 生产日期 → 批号（按格式） */
export function formatProductionDateToBatchNo(
  productionDate: string,
  format: BatchNoFormat = loadBatchNoFormat()
): string {
  if (!productionDate || format === 'custom') return ''
  const d = dayjs(productionDate)
  if (!d.isValid()) return ''
  if (format === 'YYMMDD') {
    const yy = String(d.year()).slice(-2)
    const mm = String(d.month() + 1).padStart(2, '0')
    const dd = String(d.date()).padStart(2, '0')
    return `${yy}${mm}${dd}`
  }
  return d.format('YYYYMMDD')
}

function addShelfLife(base: dayjs.Dayjs, value: number, unit: string): dayjs.Dayjs {
  if (unit === '年') return base.add(value, 'year')
  if (unit === '月') return base.add(value, 'month')
  return base.add(value, 'day')
}

/** 按商品资料保质期设置计算有效期至 */
export function calcProductExpiryDate(
  productionDate: string,
  product: ProductMaster | Record<string, unknown> | null | undefined
): string {
  if (!productionDate || !product) return ''

  const shelfValue = Number(product.expiryDate)
  if (!shelfValue || shelfValue <= 0) return ''

  const expiryManage = product.expiryManage
  if (expiryManage === '0' || expiryManage === 0 || expiryManage === false) {
    return ''
  }

  const unit = String(product.expiryUnit || '天')
  const method = String(product.expiryCalcMethod || 'method1')
  if (method === 'method2') return ''

  let d = dayjs(productionDate)
  if (!d.isValid()) return ''

  d = addShelfLife(d, shelfValue, unit)
  if (method === 'method1') {
    d = d.subtract(1, 'day')
  }

  return d.format('YYYY-MM-DD')
}

export function getRowProductionDate(row: Record<string, unknown>): string {
  return String(row.productionDate || row.mfgDate || '')
}

export function getRowExpiryValue(row: Record<string, unknown>): string {
  return String(row.expiryDate || row.expireDate || '')
}

export function setRowExpiryValue(row: Record<string, any>, value: string) {
  row.expiryDate = value
  row.expireDate = value
}

export function resolveProductForRow(row: Record<string, unknown>): ProductMaster | undefined {
  const code = String(row.productCode || '').trim()
  return code ? findProductInList(code) : undefined
}

export function getEffectiveBatchNoFormat(
  row: Record<string, any>,
  globalFormat: BatchNoFormat = loadBatchNoFormat()
): BatchNoFormat {
  const rowFormat = row._batchNoFormat as BatchNoFormat | undefined
  if (rowFormat === 'YYYYMMDD' || rowFormat === 'YYMMDD' || rowFormat === 'custom') {
    return rowFormat
  }
  if (globalFormat === 'YYYYMMDD' || globalFormat === 'YYMMDD') {
    return globalFormat
  }
  return 'custom'
}

export function hasConfirmedBatchNoFormat(row: Record<string, any>): boolean {
  const f = row._batchNoFormat as BatchNoFormat | undefined
  return f === 'YYYYMMDD' || f === 'YYMMDD'
}

export function setRowBatchNoFormat(
  row: Record<string, any>,
  format: BatchNoFormat,
  _globalFormat?: BatchNoFormat
) {
  row._batchNoFormat = format
  if (format === 'custom') return
  if (!isBatchNoAutoGenerateEnabled()) return
  if (getRowProductionDate(row) && !row._batchNoManual) {
    row.batchNo = formatProductionDateToBatchNo(getRowProductionDate(row), format)
  }
}

export function clearRowBatchNoFormat(row: Record<string, any>) {
  row._batchNoFormat = 'custom'
}

/** 生产日期变更：默认带出批号与有效期（未手工改过时才覆盖） */
export function applyProductionDateToItemRow(
  row: Record<string, any>,
  product?: ProductMaster | Record<string, unknown> | null,
  format: BatchNoFormat = loadBatchNoFormat()
) {
  const productionDate = getRowProductionDate(row)
  if (!productionDate) return

  const master = (product || resolveProductForRow(row)) as ProductMaster | undefined
  const effectiveFormat = getEffectiveBatchNoFormat(row, format)

  if (
    isBatchNoAutoGenerateEnabled() &&
    !row._batchNoManual &&
    effectiveFormat !== 'custom'
  ) {
    row.batchNo = formatProductionDateToBatchNo(productionDate, effectiveFormat)
  }

  if (!row._expiryManual) {
    const expiry = calcProductExpiryDate(productionDate, master)
    if (expiry) setRowExpiryValue(row, expiry)
  }
}

export function markBatchNoManual(row: Record<string, any>, format: BatchNoFormat = loadBatchNoFormat()) {
  const value = String(row.batchNo || '').trim()
  const effective = getEffectiveBatchNoFormat(row, format)
  const auto = effective === 'custom' || !isBatchNoAutoGenerateEnabled()
    ? ''
    : formatProductionDateToBatchNo(getRowProductionDate(row), effective)
  row._batchNoManual = Boolean(value && value !== auto)
  if (!value) row._batchNoManual = false
}

export function markExpiryManual(row: Record<string, any>) {
  const value = getRowExpiryValue(row)
  const product = resolveProductForRow(row)
  const auto = calcProductExpiryDate(getRowProductionDate(row), product)
  row._expiryManual = Boolean(value && value !== auto)
  if (!value) row._expiryManual = false
}

export function reapplyBatchNoFormatToItems(
  items: Record<string, any>[],
  format: BatchNoFormat
) {
  if (format === 'custom' || !isBatchNoAutoGenerateEnabled()) return
  items.forEach(row => {
    if (row._batchNoFormat) return
    const productionDate = getRowProductionDate(row)
    if (!row._batchNoManual && productionDate) {
      row.batchNo = formatProductionDateToBatchNo(productionDate, format)
    }
  })
}

/** 从订单/库存带入批号时识别 8/6 位格式或标记手输，避免被生产日期变更误覆盖 */
export function syncImportedRowBatchNoState(
  row: Record<string, any>,
  format: BatchNoFormat = loadBatchNoFormat()
) {
  const batchNo = String(row.batchNo || '').trim()
  const productionDate = getRowProductionDate(row)
  row._batchFormatPickerOpen = false

  if (!batchNo) {
    row._batchNoManual = false
    if (
      !hasConfirmedBatchNoFormat(row) &&
      productionDate &&
      format !== 'custom' &&
      isBatchNoAutoGenerateEnabled()
    ) {
      row._batchNoFormat = format === 'YYMMDD' ? 'YYMMDD' : 'YYYYMMDD'
    }
    return
  }

  if (productionDate) {
    const ymd = formatProductionDateToBatchNo(productionDate, 'YYYYMMDD')
    const yymd = formatProductionDateToBatchNo(productionDate, 'YYMMDD')
    if (batchNo === ymd) {
      row._batchNoFormat = 'YYYYMMDD'
      row._batchNoManual = false
      return
    }
    if (batchNo === yymd) {
      row._batchNoFormat = 'YYMMDD'
      row._batchNoManual = false
      return
    }
  }

  row._batchNoManual = true
  clearRowBatchNoFormat(row)
}
