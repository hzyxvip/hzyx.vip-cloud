export type PrintPaperSize = 'A4' | 'A5'
export type PrintOrientation = 'portrait' | 'landscape'
export type SalesOutboundPrintStyle = 'list' | 'standard'

export type PrintSettings = {
  paperSize: PrintPaperSize
  orientation: PrintOrientation
  showCompanyHeader: boolean
  showAuditSeal: boolean
  defaultCopies: number
  previewBeforePrint: boolean
  footerRemark: string
  marginMm: number
  /** 销售出库单打印样式：销售清单 / 标准出库单 */
  salesOutboundPrintStyle: SalesOutboundPrintStyle
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperSize: 'A4',
  orientation: 'landscape',
  showCompanyHeader: true,
  showAuditSeal: true,
  defaultCopies: 1,
  previewBeforePrint: true,
  footerRemark: '',
  marginMm: 10,
  salesOutboundPrintStyle: 'list'
}

const STORAGE_KEY = 'system-print-settings'

export function loadPrintSettings(): PrintSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PRINT_SETTINGS }
    return { ...DEFAULT_PRINT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PRINT_SETTINGS }
  }
}

export function savePrintSettings(settings: PrintSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
