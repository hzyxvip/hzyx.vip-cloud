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

export function focusFieldByKey(key: string, gridSelector = '.basic-info-grid') {
  nextTick(() => {
    const container = document.querySelector(`${gridSelector} [data-field-key="${key}"]`)
    if (!container) return
    const dateInput = container.querySelector('.el-date-editor input:not([disabled])') as HTMLInputElement | null
    if (dateInput) {
      dateInput.focus()
      dateInput.select?.()
      return
    }
    const input = container.querySelector('input:not([disabled]), textarea:not([disabled])') as HTMLInputElement | null
    if (input) {
      input.focus()
      input.select?.()
      return
    }
    const selectWrapper = container.querySelector('.el-select__wrapper') as HTMLElement | null
    selectWrapper?.click()
    const selectInput = container.querySelector('.el-select__wrapper input') as HTMLInputElement | null
    selectInput?.focus()
  })
}

export function focusCellControl(cell: HTMLElement | null | undefined) {
  if (!cell) return
  const dateInput = cell.querySelector('.el-date-editor input:not([disabled])') as HTMLInputElement | null
  if (dateInput) {
    dateInput.focus()
    dateInput.select?.()
    return
  }
  const focusable = cell.querySelector(
    'input:not([disabled]), textarea:not([disabled]), .el-select__wrapper'
  ) as HTMLElement | null
  if (focusable?.classList.contains('el-select__wrapper')) {
    focusable.click()
    const input = focusable.querySelector('input') as HTMLInputElement | null
    input?.focus()
    input?.select?.()
    return
  }
  if (focusable instanceof HTMLInputElement || focusable instanceof HTMLTextAreaElement) {
    focusable.focus()
    focusable.select?.()
  }
}

export function navigateSequentialFields(
  currentKey: string,
  direction: ArrowDirection,
  fields: Array<{ key: string }>,
  options: {
    gridSelector?: string
    onAfterLastDown?: () => void
  } = {}
) {
  const gridSelector = options.gridSelector ?? '.basic-info-grid'
  const currentIndex = fields.findIndex(field => field.key === currentKey)
  if (currentIndex === -1) return

  const focusByIndex = (index: number) => {
    if (index >= 0 && index < fields.length) {
      focusFieldByKey(fields[index].key, gridSelector)
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
