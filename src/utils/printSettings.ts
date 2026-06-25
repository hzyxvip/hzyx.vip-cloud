export type SalesListPaperSize = 'invoice' | 'invoiceWide'
export type GeneralPaperSize = 'A4' | 'A5'
/** @deprecated 兼容旧存储；新配置请用 salesListPaperSize + paperSize */
export type PrintPaperSize = GeneralPaperSize | SalesListPaperSize
export type PrintOrientation = 'portrait' | 'landscape'
export type SalesOutboundPrintStyle = 'list' | 'standard'

/** 销售清单纸规（241mm 宽针式/发票打印机通用） */
export const SALES_LIST_PAPER_OPTIONS = [
  {
    value: 'invoice' as const,
    label: '241×140mm',
    hint: '标准 1/2 等分，市面存量最大，适合常规销货清单'
  },
  {
    value: 'invoiceWide' as const,
    label: '241×280mm',
    hint: '同 A4 宽度加长，可打印 20 行以上商品明细'
  }
] as const

export const SALES_OUTBOUND_PRINT_STYLE_OPTIONS = [
  {
    value: 'list' as const,
    label: '销售清单',
    hint: '241mm 宽销货清单版式，含批号、效期、注册证等明细列'
  },
  {
    value: 'standard' as const,
    label: '标准出库单',
    hint: 'A4 hiprint 模板，适合仓库出库凭证'
  }
] as const

export function isSalesListPaperSize(size: string): size is SalesListPaperSize {
  return size === 'invoice' || size === 'invoiceWide'
}

export type PrintSettings = {
  /** 销售清单专用纸规 */
  salesListPaperSize: SalesListPaperSize
  /** 标准出库单等 hiprint 模板纸张 */
  paperSize: GeneralPaperSize
  orientation: PrintOrientation
  showCompanyHeader: boolean
  showAuditSeal: boolean
  defaultCopies: number
  previewBeforePrint: boolean
  footerRemark: string
  marginMm: number
  /** 销售出库单打印样式：销售清单 / 标准出库单 */
  salesOutboundPrintStyle: SalesOutboundPrintStyle
  printerName: string
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  salesListPaperSize: 'invoice',
  paperSize: 'A4',
  orientation: 'landscape',
  showCompanyHeader: true,
  showAuditSeal: true,
  defaultCopies: 1,
  previewBeforePrint: true,
  footerRemark: '',
  marginMm: 8,
  salesOutboundPrintStyle: 'list',
  printerName: ''
}

const STORAGE_KEY = 'system-print-settings'

function normalizePrintSettings(raw: Partial<PrintSettings> & { paperSize?: string }): PrintSettings {
  const merged: PrintSettings = { ...DEFAULT_PRINT_SETTINGS, ...raw }

  if (isSalesListPaperSize(String(raw.paperSize || ''))) {
    merged.salesListPaperSize = raw.paperSize as SalesListPaperSize
    if (raw.paperSize === 'invoice' || raw.paperSize === 'invoiceWide') {
      merged.paperSize = 'A4'
    }
  }

  if (!isSalesListPaperSize(merged.salesListPaperSize)) {
    merged.salesListPaperSize = 'invoice'
  }

  if (merged.paperSize !== 'A4' && merged.paperSize !== 'A5') {
    merged.paperSize = 'A4'
  }

  return merged
}

export function loadPrintSettings(): PrintSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PRINT_SETTINGS }
    return normalizePrintSettings(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_PRINT_SETTINGS }
  }
}

export function savePrintSettings(settings: PrintSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
