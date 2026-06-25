import { nextTick } from 'vue'

export type ArrowDirection = 'up' | 'down' | 'left' | 'right'

export type ErpKeyboardScope = {
  formGridSelector?: string
  itemsTableSelector?: string
}

const DEFAULT_SCOPE: Required<ErpKeyboardScope> = {
  formGridSelector: '.basic-info-grid, .amount-grid, .delivery-grid',
  itemsTableSelector: '.items-detail-table'
}

const resolveScope = (scope?: ErpKeyboardScope) => ({
  formGridSelector: scope?.formGridSelector ?? DEFAULT_SCOPE.formGridSelector,
  itemsTableSelector: scope?.itemsTableSelector ?? DEFAULT_SCOPE.itemsTableSelector
})

export function arrowKeyToDirection(key: string): ArrowDirection | null {
  if (key === 'ArrowUp') return 'up'
  if (key === 'ArrowDown') return 'down'
  if (key === 'ArrowLeft') return 'left'
  if (key === 'ArrowRight') return 'right'
  return null
}

export function isSelectDropdownOpen(): boolean {
  const poppers = document.querySelectorAll('.el-select-dropdown')
  for (const popper of poppers) {
    const style = window.getComputedStyle(popper)
    if (style.display === 'none' || style.visibility === 'hidden') continue
    if (popper.getAttribute('aria-hidden') === 'true') continue
    const rect = popper.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) continue
    return true
  }
  return false
}

export function scheduleAfterSelectClose(callback: () => void) {
  let attempts = 0
  const tick = () => {
    if (!isSelectDropdownOpen() || attempts >= 12) {
      callback()
      return
    }
    attempts += 1
    setTimeout(tick, 30)
  }
  setTimeout(tick, 0)
}

export function isDatePickerPanelOpen(): boolean {
  const panels = document.querySelectorAll('.el-picker__popper')
  for (const panel of panels) {
    const style = window.getComputedStyle(panel)
    if (style.display === 'none' || style.visibility === 'hidden') continue
    if (panel.getAttribute('aria-hidden') === 'true') continue
    const rect = panel.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) continue
    const datePanel = panel.querySelector('.el-date-picker-panel, .el-picker-panel') as HTMLElement | null
    if (datePanel) {
      const panelStyle = window.getComputedStyle(datePanel)
      if (panelStyle.display === 'none' || panelStyle.visibility === 'hidden') continue
      const panelRect = datePanel.getBoundingClientRect()
      if (panelRect.width <= 0 || panelRect.height <= 0) continue
    }
    return true
  }
  return false
}

export function scheduleAfterDatePickerClose(callback: () => void) {
  let attempts = 0
  const tick = () => {
    if (!isDatePickerPanelOpen() || attempts >= 12) {
      callback()
      return
    }
    attempts += 1
    setTimeout(tick, 30)
  }
  setTimeout(tick, 0)
}

/** 关闭下拉/日期等浮层，避免遮挡页面操作（如返回列表） */
export function dismissErpFloatingPanels() {
  const active = document.activeElement as HTMLElement | null
  if (active && active !== document.body) {
    active.blur()
  }
  if (isSelectDropdownOpen() || isDatePickerPanelOpen()) {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true })
    )
  }
}

const CN_MONTH_NAMES = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
]

function getVisibleDatePickerPanel(): HTMLElement | null {
  const poppers = document.querySelectorAll('.el-picker__popper')
  for (const popper of poppers) {
    const style = window.getComputedStyle(popper)
    if (style.display === 'none' || style.visibility === 'hidden') continue
    if (popper.getAttribute('aria-hidden') === 'true') continue
    const rect = popper.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) continue
    const datePanel = popper.querySelector('.el-date-picker-panel, .el-picker-panel') as HTMLElement | null
    if (!datePanel) continue
    const panelStyle = window.getComputedStyle(datePanel)
    if (panelStyle.display === 'none' || panelStyle.visibility === 'hidden') continue
    const panelRect = datePanel.getBoundingClientRect()
    if (panelRect.width <= 0 || panelRect.height <= 0) continue
    return datePanel
  }
  return null
}

function readPanelYearMonth(panel: HTMLElement): { year: number; month: number } | null {
  const labels = panel.querySelectorAll('.el-date-picker__header-label')
  if (labels.length < 2) return null
  const yearMatch = (labels[0].textContent || '').match(/\d{4}/)
  if (!yearMatch) return null
  const year = parseInt(yearMatch[0], 10)
  const monthText = (labels[1].textContent || '').trim()
  for (let i = 0; i < CN_MONTH_NAMES.length; i++) {
    if (monthText.includes(CN_MONTH_NAMES[i]) || monthText.includes(`${i + 1}月`)) {
      return { year, month: i }
    }
  }
  return null
}

function clickMonthNav(panel: HTMLElement, selector: string) {
  const btn = panel.querySelector(selector) as HTMLElement | null
  btn?.click()
}

function readDateCellDay(td: HTMLElement): number {
  const text = td.querySelector('.el-date-table-cell__text')?.textContent?.trim() || ''
  const day = parseInt(text, 10)
  return Number.isFinite(day) ? day : -1
}

function dispatchPanelKey(panel: HTMLElement, key: string) {
  const code = key === 'ArrowRight' ? 'ArrowRight' : key === 'ArrowLeft' ? 'ArrowLeft' : key
  const event = new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true })
  panel.dispatchEvent(event)
  panel.querySelector('.el-date-picker-panel, .el-picker-panel')?.dispatchEvent(
    new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true })
  )
}

function waitFrames(count = 1): Promise<void> {
  return new Promise(resolve => {
    let left = count
    const step = () => {
      left -= 1
      if (left <= 0) resolve()
      else requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
}

function isDatePickerTableReady(): boolean {
  const panel = getVisibleDatePickerPanel()
  return !!(panel?.querySelector('.el-date-table td .el-date-table-cell'))
}

function isTodayCellFocused(): boolean {
  return !!document.activeElement?.closest('.el-date-table td.today')
}

function focusDateTableCell(td: HTMLElement) {
  const cell = td.querySelector('.el-date-table-cell') as HTMLElement | null
  const target = cell || td
  if (cell && !cell.hasAttribute('tabindex')) cell.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: true })
}

async function ensureTodayVisibleInPanel(panel: HTMLElement) {
  for (let guard = 0; guard < 24; guard++) {
    if (panel.querySelector('.el-date-table td.today')) return
    const displayed = readPanelYearMonth(panel)
    const now = new Date()
    if (!displayed) {
      clickMonthNav(panel, '.el-date-picker__prev-btn')
    } else {
      const displayedIndex = displayed.year * 12 + displayed.month
      const todayIndex = now.getFullYear() * 12 + now.getMonth()
      clickMonthNav(
        panel,
        displayedIndex > todayIndex ? '.el-date-picker__prev-btn' : '.el-date-picker__next-btn'
      )
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
}

async function syncPickerHighlightToToday(panel: HTMLElement) {
  const todayTd = panel.querySelector('.el-date-table td.today:not(.disabled)') as HTMLElement | null
  if (!todayTd) return

  const panelRoot = (panel.closest('.el-picker-panel') as HTMLElement) || panel
  const todayDay = readDateCellDay(todayTd)
  if (todayDay <= 0) return

  if (todayTd.classList.contains('current')) {
    await nextTick()
    await waitFrames(1)
    focusDateTableCell(todayTd)
    return
  }

  const currentTd = panel.querySelector('.el-date-table td.current') as HTMLElement | null
  const inCurrentMonth =
    currentTd &&
    !currentTd.classList.contains('prev-month') &&
    !currentTd.classList.contains('next-month')
  const startDay = inCurrentMonth ? readDateCellDay(currentTd!) : 1
  const diff = todayDay - (startDay > 0 ? startDay : 1)
  if (diff !== 0) {
    const key = diff > 0 ? 'ArrowRight' : 'ArrowLeft'
    for (let i = 0; i < Math.abs(diff); i++) {
      dispatchPanelKey(panelRoot, key)
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
  }

  await nextTick()
  await waitFrames(1)
  const highlighted = panel.querySelector('.el-date-table td.today.current') as HTMLElement | null
  focusDateTableCell(highlighted || todayTd)
}

/** 日历打开后将焦点移到“今天”日期格（非输入框） */
export async function focusDatePickerTodayCell(retry = 0): Promise<void> {
  const panel = getVisibleDatePickerPanel()
  if (!panel) {
    if (retry < 8) {
      await new Promise<void>(resolve => setTimeout(resolve, 20))
      return focusDatePickerTodayCell(retry + 1)
    }
    return
  }
  if (!panel.querySelector('.el-date-table td.today')) {
    await ensureTodayVisibleInPanel(panel)
    await nextTick()
  }
  await syncPickerHighlightToToday(panel)

  if (!isTodayCellFocused() && retry < 8) {
    await new Promise<void>(resolve => setTimeout(resolve, 20))
    return focusDatePickerTodayCell(retry + 1)
  }
}

function scheduleWhenDatePickerReady(callback: () => void | Promise<void>) {
  let attempts = 0
  const tick = () => {
    if (isDatePickerPanelOpen() && isDatePickerTableReady()) {
      void Promise.resolve(callback())
      return
    }
    if (attempts >= 40) {
      void Promise.resolve(callback())
      return
    }
    attempts += 1
    setTimeout(tick, 16)
  }
  requestAnimationFrame(tick)
}

export function isFormGridSelectTarget(target: EventTarget | null, scope?: ErpKeyboardScope): boolean {
  const { formGridSelector, itemsTableSelector } = resolveScope(scope)
  const selectEl = (target as HTMLElement)?.closest(`${formGridSelector} .el-select`) as HTMLElement | null
  if (!selectEl) return false
  return !selectEl.closest(itemsTableSelector)
}

export function isItemSelectTarget(target: EventTarget | null, scope?: ErpKeyboardScope): boolean {
  const { itemsTableSelector } = resolveScope(scope)
  return !!(target as HTMLElement)?.closest(`${itemsTableSelector} .el-select`)
}

export function isItemDatePickerTarget(target: EventTarget | null, scope?: ErpKeyboardScope): boolean {
  const { itemsTableSelector } = resolveScope(scope)
  return !!(target as HTMLElement)?.closest(`${itemsTableSelector} .cell-date-wrap`)
}

/** 基本信息区日期控件（避免方向键与日历打开冲突） */
export function isHeaderDatePickerTarget(
  target: EventTarget | null,
  gridSelector = '.basic-info-grid'
): boolean {
  return !!(target as HTMLElement)?.closest(`${gridSelector} .el-date-editor`)
}

export function handleFormGridSelectKeyboard(e: KeyboardEvent, scope?: ErpKeyboardScope): boolean {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return false
  if (!isFormGridSelectTarget(e.target, scope)) return false
  if (isSelectDropdownOpen()) return false

  const { formGridSelector } = resolveScope(scope)
  const selectEl = (e.target as HTMLElement)?.closest(`${formGridSelector} .el-select`) as HTMLElement | null
  const wrapper = selectEl?.querySelector('.el-select__wrapper') as HTMLElement | null
  wrapper?.click()
  e.preventDefault()
  e.stopPropagation()
  return true
}

export function handleItemSelectKeyboard(e: KeyboardEvent, scope?: ErpKeyboardScope): boolean {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return false
  if (!isItemSelectTarget(e.target, scope)) return false
  if (isSelectDropdownOpen()) return false

  const { itemsTableSelector } = resolveScope(scope)
  const selectEl = (e.target as HTMLElement)?.closest(`${itemsTableSelector} .el-select`) as HTMLElement | null
  const wrapper = selectEl?.querySelector('.el-select__wrapper') as HTMLElement | null
  wrapper?.click()
  e.preventDefault()
  e.stopPropagation()
  return true
}

export function handleItemSelectEnter(
  e: KeyboardEvent,
  advance: () => void
) {
  if (e.key !== 'Enter') return
  if (isSelectDropdownOpen()) {
    scheduleAfterSelectClose(advance)
    return
  }
  e.preventDefault()
  e.stopPropagation()
  advance()
}

export function shouldNavigateOnArrow(
  e: KeyboardEvent,
  options: {
    scope?: ErpKeyboardScope
    productSuggestOpen?: () => boolean
    isProductAutocompleteTarget?: (target: EventTarget | null) => boolean
    isItemDatePickerTarget?: (target: EventTarget | null) => boolean
  } = {}
): boolean {
  const target = e.target as HTMLElement
  if (target.closest('.el-date-picker-panel, .el-picker-panel')) return false
  if (options.productSuggestOpen?.() || isSelectDropdownOpen()) return false
  if (isDatePickerPanelOpen()) return false

  const itemDateTarget = options.isItemDatePickerTarget ?? ((t: EventTarget | null) => isItemDatePickerTarget(t, options.scope))
  if (itemDateTarget(e.target)) {
    return e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight'
  }

  const productAcTarget = options.isProductAutocompleteTarget
  if (productAcTarget && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && productAcTarget(e.target)) {
    return false
  }

  if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && isItemSelectTarget(e.target, options.scope)) return false
  if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && isFormGridSelectTarget(e.target, options.scope)) return false

  const inputEl = target as HTMLInputElement | HTMLTextAreaElement
  if (inputEl.tagName === 'TEXTAREA') return true
  if (inputEl.tagName !== 'INPUT') return true
  if (inputEl.type === 'number' || inputEl.closest('.el-input-number')) return true

  const len = inputEl.value?.length ?? 0
  const start = inputEl.selectionStart ?? 0
  const end = inputEl.selectionEnd ?? 0
  if (e.key === 'ArrowLeft' && start === 0 && end === 0) return true
  if (e.key === 'ArrowRight' && start === len && end === len) return true
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') return true
  return false
}

export function findFieldKeyFromElement(el: HTMLElement | null): string | null {
  const container = el?.closest('[data-field-key]') as HTMLElement | null
  return container?.dataset.fieldKey || null
}

export type FocusFieldOptions = {
  /** 日期字段：打开日历并定位到今天 */
  openDatePanel?: boolean
  /** 下拉字段：展开选项列表并聚焦可输入区域 */
  openSelectDropdown?: boolean
}

function openSelectDropdown(container: HTMLElement) {
  const wrapper = container.querySelector('.el-select__wrapper') as HTMLElement | null
  wrapper?.click()
  const selectInput = container.querySelector('.el-select__wrapper input') as HTMLInputElement | null
  selectInput?.focus()
  selectInput?.select?.()
}

export function focusFieldByKey(
  key: string,
  gridSelector = '.basic-info-grid',
  options?: FocusFieldOptions
) {
  nextTick(() => {
    requestAnimationFrame(() => {
      const container = document.querySelector(`${gridSelector} [data-field-key="${key}"]`)
      if (!container) return
      focusContainerControl(container as HTMLElement, options)
    })
  })
}

function focusContainerControl(container: HTMLElement, options?: FocusFieldOptions) {
  const dateInput = container.querySelector('.el-date-editor input:not([disabled])') as HTMLInputElement | null
  if (dateInput) {
    if (options?.openDatePanel) {
      openDatePickerPanel(dateInput)
      return
    }
    dateInput.focus()
    dateInput.select?.()
    return
  }

  if (options?.openSelectDropdown) {
    openSelectDropdown(container)
    return
  }

  const input = container.querySelector('input:not([disabled]), textarea:not([disabled])') as HTMLInputElement | null
  if (input) {
    input.focus()
    input.select?.()
    return
  }
  openSelectDropdown(container)
}

/** 列表页查询栏：聚焦指定字段（data-search-key），不自动展开下拉 */
export function focusListSearchField(formSelector: string, key: string) {
  nextTick(() => {
    const container = document.querySelector(`${formSelector} [data-search-key="${key}"]`)
    if (!container) return
    const input = container.querySelector('input:not([disabled]), textarea:not([disabled])') as HTMLInputElement | null
    if (input) {
      input.focus()
      input.select?.()
    }
  })
}

export type ListSearchKeyboardHandlers = {
  onInputEnter: (key: string, e: KeyboardEvent) => void
  onSelectEnter: (key: string, e: KeyboardEvent) => void
  /** 下拉用鼠标选值后可选调用；需配合 shouldSuppressAdvance 避免重置表单时循环触发 */
  onSelectChange: (key: string) => void
}

/** 列表查询栏 Enter：下一项；末项 Enter / 下拉回车确认后 → 执行查询 */
export function createListSearchKeyboardHandlers(options: {
  formSelector: string
  fieldKeys: readonly string[]
  onSubmit: () => void
  shouldSuppressAdvance?: () => boolean
}): ListSearchKeyboardHandlers {
  const { formSelector, fieldKeys, onSubmit, shouldSuppressAdvance } = options
  let submitting = false

  const safeSubmit = () => {
    if (submitting || shouldSuppressAdvance?.()) return
    submitting = true
    try {
      onSubmit()
    } finally {
      window.setTimeout(() => {
        submitting = false
      }, 200)
    }
  }

  const advanceFrom = (currentKey: string) => {
    if (shouldSuppressAdvance?.()) return
    const index = fieldKeys.indexOf(currentKey)
    if (index >= 0 && index < fieldKeys.length - 1) {
      focusListSearchField(formSelector, fieldKeys[index + 1])
      return
    }
    safeSubmit()
  }

  const onInputEnter = (key: string, e: KeyboardEvent) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    advanceFrom(key)
  }

  const onSelectEnter = (key: string, e: KeyboardEvent) => {
    if (e.key !== 'Enter') return
    if (isSelectDropdownOpen()) {
      scheduleAfterSelectClose(() => advanceFrom(key))
      return
    }
    e.preventDefault()
    advanceFrom(key)
  }

  const onSelectChange = (key: string) => {
    if (shouldSuppressAdvance?.()) return
    scheduleAfterSelectClose(() => advanceFrom(key))
  }

  return { onInputEnter, onSelectEnter, onSelectChange }
}

/** 打开 el-date-picker 日历面板，并将焦点移到“今天” */
export function openDatePickerPanel(dateInput: HTMLInputElement) {
  const editor = dateInput.closest('.el-date-editor') as HTMLElement | null
  editor?.click()
  if (!isDatePickerPanelOpen()) {
    dateInput.focus()
    editor?.click()
  }
  scheduleWhenDatePickerReady(async () => {
    await waitFrames(2)
    await focusDatePickerTodayCell()
    if (!isTodayCellFocused()) {
      dateInput.blur()
      await waitFrames(1)
      await focusDatePickerTodayCell()
    }
  })
}

/** 聚焦明细表日期单元格，可选自动弹出日历并定位到今天 */
export function focusItemDateCell(cell: HTMLElement | null | undefined, openPanel = false) {
  if (!cell) return
  const dateInput = cell.querySelector('.el-date-editor input:not([disabled])') as HTMLInputElement | null
  if (!dateInput) return
  if (openPanel) {
    openDatePickerPanel(dateInput)
    return
  }
  dateInput.focus()
  dateInput.select?.()
}

export function focusCellControl(cell: HTMLElement | null | undefined) {
  if (!cell) return

  const tryFocus = (): boolean => {
    const dateInput = cell.querySelector('.el-date-editor input:not([disabled])') as HTMLInputElement | null
    if (dateInput) {
      dateInput.focus()
      dateInput.select?.()
      return document.activeElement === dateInput
    }
    const input = cell.querySelector('input:not([disabled]), textarea:not([disabled])') as HTMLInputElement | null
    if (input) {
      input.focus()
      input.select?.()
      return document.activeElement === input
    }
    const selectWrapper = cell.querySelector('.el-select__wrapper') as HTMLElement | null
    if (selectWrapper) {
      selectWrapper.click()
      const selectInput = selectWrapper.querySelector('input') as HTMLInputElement | null
      selectInput?.focus()
      selectInput?.select?.()
      return document.activeElement === selectInput
    }
    return false
  }

  if (!tryFocus()) {
    nextTick(() => {
      if (!tryFocus()) requestAnimationFrame(() => tryFocus())
    })
  }
}

export function navigateSequentialFields(
  currentKey: string,
  direction: ArrowDirection,
  fields: Array<{ key: string }>,
  options: {
    gridSelector?: string
    onAfterLastDown?: () => void
    focusField?: (key: string) => void
  } = {}
) {
  const gridSelector = options.gridSelector ?? '.basic-info-grid'
  const currentIndex = fields.findIndex(field => field.key === currentKey)
  if (currentIndex === -1) return

  const focusByKey = options.focusField ?? ((key: string) => focusFieldByKey(key, gridSelector))

  const focusByIndex = (index: number) => {
    if (index >= 0 && index < fields.length) {
      focusByKey(fields[index].key)
    }
  }

  if (direction === 'left' || direction === 'up') {
    focusByIndex(currentIndex - 1)
    return
  }
  if (direction === 'right' || direction === 'down') {
    if (currentIndex < fields.length - 1) {
      focusByIndex(currentIndex + 1)
      return
    }
    if (direction === 'down') {
      options.onAfterLastDown?.()
    }
  }
}
