export type TableAppearanceSettings = {
  /** 列表页表格行高（px） */
  listRowHeight: number
  /** 单据明细表行高（px） */
  detailRowHeight: number
  /** 明细表内输入框高度（px） */
  detailInputHeight: number
  /** 单元格上下内边距（px） */
  cellPaddingY: number
  lineColor: string
  headerBg: string
  rowOddBg: string
  rowEvenBg: string
  rowHoverBg: string
}

export const DEFAULT_TABLE_APPEARANCE: TableAppearanceSettings = {
  listRowHeight: 36,
  detailRowHeight: 32,
  detailInputHeight: 28,
  cellPaddingY: 4,
  lineColor: '#d9d9d9',
  headerBg: '#f5f5f5',
  rowOddBg: '#f0f7ff',
  rowEvenBg: '#f5f5f5',
  rowHoverBg: '#fff3cd'
}

const STORAGE_KEY = 'system-table-appearance'

export function loadTableAppearanceSettings(): TableAppearanceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_TABLE_APPEARANCE }
    return { ...DEFAULT_TABLE_APPEARANCE, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_TABLE_APPEARANCE }
  }
}

export function saveTableAppearanceSettings(settings: TableAppearanceSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  applyTableAppearanceSettings(settings)
}

export function resetTableAppearanceSettings() {
  localStorage.removeItem(STORAGE_KEY)
  applyTableAppearanceSettings({ ...DEFAULT_TABLE_APPEARANCE })
}

/** 将表格外观写入 :root，供全局 SCSS 使用 */
export function applyTableAppearanceSettings(settings: TableAppearanceSettings = loadTableAppearanceSettings()) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--yx-table-line-color', settings.lineColor)
  root.style.setProperty('--yx-table-header-bg', settings.headerBg)
  root.style.setProperty('--yx-table-row-odd-bg', settings.rowOddBg)
  root.style.setProperty('--yx-table-row-even-bg', settings.rowEvenBg)
  root.style.setProperty('--yx-table-row-hover-bg', settings.rowHoverBg)
  root.style.setProperty('--yx-table-list-row-height', `${settings.listRowHeight}px`)
  root.style.setProperty('--yx-table-detail-row-height', `${settings.detailRowHeight}px`)
  root.style.setProperty('--yx-table-detail-input-height', `${settings.detailInputHeight}px`)
  root.style.setProperty('--yx-table-cell-padding-y', `${settings.cellPaddingY}px`)
  // 同步 Element Plus 表格变量
  root.style.setProperty('--el-table-border-color', settings.lineColor)
  root.style.setProperty('--el-table-header-bg-color', settings.headerBg)
  root.style.setProperty('--el-table-row-hover-bg-color', settings.rowHoverBg)
}
