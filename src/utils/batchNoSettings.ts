export type BatchNoFormat = 'YYYYMMDD' | 'YYMMDD' | 'custom'

export interface BatchNoSettings {
  /** 默认批号格式，custom 表示手输批号 */
  defaultFormat: BatchNoFormat
  /** 已选 8 位/6 位格式时，填写生产日期是否自动生成批号 */
  autoGenerateFromProductionDate: boolean
}

export const DEFAULT_BATCH_NO_SETTINGS: BatchNoSettings = {
  defaultFormat: 'custom',
  autoGenerateFromProductionDate: true
}

const SETTINGS_STORAGE_KEY = 'system-batch-no-settings'
const LEGACY_FORMAT_STORAGE_KEY = 'purchase-batch-no-format'

export const BATCH_NO_FORMAT_OPTIONS: { label: string; value: BatchNoFormat; desc?: string }[] = [
  { label: '20260624', value: 'YYYYMMDD', desc: '8 位：年月日' },
  { label: '260624', value: 'YYMMDD', desc: '6 位：年月日' },
  { label: '手输批号', value: 'custom', desc: '不自动生成，直接录入实际批号' }
]

export const BATCH_NO_APPLICABLE_DOCS = [
  '采购订单',
  '采购入库单',
  '销售订单',
  '销售出库单',
  '生产入库单'
]

/** 各单据批号录入方式（与页面实现一致） */
export const BATCH_NO_DOC_INPUT_MODES: {
  doc: string
  mode: 'cell-keyboard' | 'toolbar-cell'
  hint: string
}[] = [
  { doc: '采购订单', mode: 'cell-keyboard', hint: '生产批号列内键盘选择 8/6 位或手输' },
  { doc: '销售订单', mode: 'cell-keyboard', hint: '生产批号列内键盘选择 8/6 位或手输' },
  { doc: '采购入库单', mode: 'toolbar-cell', hint: '工具栏默认格式 + 列内格式确认' },
  { doc: '销售出库单', mode: 'toolbar-cell', hint: '工具栏默认格式 + 列内格式确认' },
  { doc: '生产入库单', mode: 'toolbar-cell', hint: '工具栏默认格式 + 列内格式确认' }
]

/** 生产批号业务规则（系统设定页展示） */
export const BATCH_NO_BUSINESS_RULES = [
  {
    title: '格式说明',
    items: [
      '20260624：8 位年月日，例：生产日期 2026-06-24 → 批号 20260624',
      '260624：6 位年月日，例：生产日期 2026-06-24 → 批号 260624',
      '手输批号：不按日期自动生成，直接录入厂家实际批号'
    ]
  },
  {
    title: '明细录入顺序',
    items: [
      '先填写生产日期，再进入生产批号列',
      '采购/销售订单：批号列显示两行格式预览（按当前生产日期计算），Enter 确认格式并生成批号',
      '进入批号列时，键盘默认聚焦系统设定的默认格式（8 位或 6 位；手输默认时聚焦 8 位）',
      '在格式行直接输入字符 → 跳过格式选择，进入手输批号',
      '确认后显示批号输入框，可继续修改；Enter 进入下一列'
    ]
  },
  {
    title: '自动生成与手工修改',
    items: [
      '「自动生成批号」开启：确认 8/6 位格式后，按生产日期写入批号；改生产日期时，未手改批号的行会同步更新',
      '「自动生成批号」关闭：仅记录格式选择，批号须手工录入',
      '默认格式为手输批号时，新行填生产日期不会预填批号，须在批号列逐行确认',
      '默认格式为 8/6 位时，未逐行确认前填生产日期可预填批号；进入批号列仍会弹出格式确认',
      '批号、有效期至手工修改后，不再被生产日期变更覆盖'
    ]
  },
  {
    title: '有效期至',
    items: [
      '默认按商品资料保质期自动计算（需开启效期管理，计算方法为「生产日期+保质期-1天」）',
      '计算方法为「允许自定义到期日」时不自动填有效期',
      '有效期至支持手工修改，修改后不再自动覆盖'
    ]
  }
] as const

function normalizeFormat(value: unknown): BatchNoFormat {
  if (value === 'YYYYMMDD' || value === 'YYMMDD' || value === 'custom') return value
  return 'custom'
}

function normalizeSettings(raw: Partial<BatchNoSettings> | null | undefined): BatchNoSettings {
  return {
    defaultFormat: normalizeFormat(raw?.defaultFormat),
    autoGenerateFromProductionDate: raw?.autoGenerateFromProductionDate !== false
  }
}

export function getBatchNoFormatLabel(format: BatchNoFormat): string | null {
  if (format === 'YYYYMMDD') return '20260624'
  if (format === 'YYMMDD') return '260624'
  return null
}

export function loadBatchNoSettings(): BatchNoSettings {
  const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
  if (saved) {
    try {
      return normalizeSettings(JSON.parse(saved) as Partial<BatchNoSettings>)
    } catch {
      /* ignore */
    }
  }

  const legacy = localStorage.getItem(LEGACY_FORMAT_STORAGE_KEY)
  if (legacy === 'YYYYMMDD' || legacy === 'YYMMDD' || legacy === 'custom') {
    return { ...DEFAULT_BATCH_NO_SETTINGS, defaultFormat: legacy }
  }

  return { ...DEFAULT_BATCH_NO_SETTINGS }
}

export function saveBatchNoSettings(settings: BatchNoSettings) {
  const normalized = normalizeSettings(settings)
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized))
  localStorage.setItem(LEGACY_FORMAT_STORAGE_KEY, normalized.defaultFormat)
}

export function resetBatchNoSettings(): BatchNoSettings {
  const defaults = { ...DEFAULT_BATCH_NO_SETTINGS }
  saveBatchNoSettings(defaults)
  return defaults
}

export function loadBatchNoFormat(): BatchNoFormat {
  return loadBatchNoSettings().defaultFormat
}

/** 批号列键盘操作时默认聚焦的格式键（手输默认时仍聚焦 8 位选项） */
export function getDefaultBatchFormatFocusKey(): 'YYYYMMDD' | 'YYMMDD' {
  const format = loadBatchNoFormat()
  return format === 'YYMMDD' ? 'YYMMDD' : 'YYYYMMDD'
}

export function saveBatchNoFormat(format: BatchNoFormat) {
  const settings = loadBatchNoSettings()
  settings.defaultFormat = normalizeFormat(format)
  saveBatchNoSettings(settings)
}

export function isBatchNoAutoGenerateEnabled(): boolean {
  return loadBatchNoSettings().autoGenerateFromProductionDate
}
