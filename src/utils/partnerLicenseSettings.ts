import {
  PARTNER_LICENSE_SECTIONS,
  migrateLegacyLicenseSectionCode,
  type LicenseSection,
  type LicenseTemplate
} from '@/constants/partnerLicenseSections'

export interface CustomLicenseTemplate extends LicenseTemplate {
  sectionCode: string
  isCustom: true
  createdAt: number
}

const CUSTOM_STORAGE_KEY = 'partner-license-custom-templates'
const OVERRIDE_STORAGE_KEY = 'partner-license-template-overrides'
const REMOVED_BUILTIN_STORAGE_KEY = 'partner-license-removed-builtin-keys'
const ITEM_ORDER_STORAGE_KEY = 'partner-license-item-order'

export type LicenseItemOrderConfig = Record<string, string[]>

function migrateLicenseItemOrder(order: LicenseItemOrderConfig): LicenseItemOrderConfig {
  let next = { ...order }

  if (next['3.1']?.length) {
    const legacy31 = next['3.1'] || []
    delete next['3.1']
    const target = [...(next['2.1'] || [])]
    legacy31.forEach(key => {
      if (!target.includes(key)) target.push(key)
    })
    next['2.1'] = target
  }

  if (next['3.2']?.length) {
    const legacy32 = next['3.2'] || []
    delete next['3.2']
    const target = [...(next['2.1'] || [])]
    legacy32.forEach(key => {
      if (!target.includes(key)) target.push(key)
    })
    next['2.1'] = target
  }

  if (next['4']?.length) {
    const legacy4 = next['4'] || []
    delete next['4']
    const target = [...(next['2.3'] || [])]
    legacy4.forEach(key => {
      if (!target.includes(key)) target.push(key)
    })
    next['2.3'] = target
  }

  if (!next['2.3']?.length) return next

  const hospitalKeys = new Set([
    'medical_institution_practice_license',
    'institution_legal_person_cert',
    'purchase_authorization',
    'receiving_authorization'
  ])
  const legacyKeys = next['2.3'] || []
  const hospitalItems = legacyKeys.filter(key => hospitalKeys.has(key))
  const disinfectionItems = legacyKeys.filter(key => !hospitalKeys.has(key))

  if (!disinfectionItems.length) return next

  delete next['2.3']
  const target = [...(next['2.1'] || [])]
  disinfectionItems.forEach(key => {
    if (!target.includes(key)) target.push(key)
  })
  next['2.1'] = target
  if (hospitalItems.length) next['2.3'] = hospitalItems
  return next
}

export function loadLicenseItemOrder(): LicenseItemOrderConfig {
  const raw = localStorage.getItem(ITEM_ORDER_STORAGE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as LicenseItemOrderConfig
    if (!parsed || typeof parsed !== 'object') return {}
    const normalized = Object.fromEntries(
      Object.entries(parsed).map(([sectionCode, keys]) => [
        sectionCode,
        Array.isArray(keys) ? keys.filter(Boolean) : []
      ])
    )
    return migrateLicenseItemOrder(normalized)
  } catch {
    return {}
  }
}

export function saveLicenseItemOrder(order: LicenseItemOrderConfig): void {
  localStorage.setItem(ITEM_ORDER_STORAGE_KEY, JSON.stringify(order))
}

export function setLicenseSectionItemOrder(sectionCode: string, keys: string[]): void {
  const order = loadLicenseItemOrder()
  order[sectionCode] = keys.filter(Boolean)
  saveLicenseItemOrder(order)
}

export function appendLicenseItemToOrder(sectionCode: string, key: string): void {
  if (!key) return
  const order = loadLicenseItemOrder()
  const sectionOrder = order[sectionCode] || []
  if (!sectionOrder.includes(key)) {
    sectionOrder.push(key)
    order[sectionCode] = sectionOrder
    saveLicenseItemOrder(order)
  }
}

export function removeLicenseItemFromOrder(key: string): void {
  if (!key) return
  const order = loadLicenseItemOrder()
  let changed = false
  Object.keys(order).forEach(sectionCode => {
    const next = order[sectionCode].filter(itemKey => itemKey !== key)
    if (next.length !== order[sectionCode].length) {
      order[sectionCode] = next
      changed = true
    }
  })
  if (changed) {
    saveLicenseItemOrder(order)
  }
}

export function moveLicenseItemInOrder(key: string, fromSection: string, toSection: string): void {
  if (!key || fromSection === toSection) return
  const order = loadLicenseItemOrder()
  if (order[fromSection]) {
    order[fromSection] = order[fromSection].filter(itemKey => itemKey !== key)
  }
  const target = order[toSection] || []
  if (!target.includes(key)) {
    target.push(key)
  }
  order[toSection] = target
  saveLicenseItemOrder(order)
}

function applyItemOrderToSection(sectionCode: string, items: LicenseTemplate[]): LicenseTemplate[] {
  const sectionOrder = loadLicenseItemOrder()[sectionCode]
  if (!sectionOrder?.length) return items

  const itemMap = new Map(items.map(item => [item.key, item]))
  const ordered: LicenseTemplate[] = []
  sectionOrder.forEach(key => {
    const item = itemMap.get(key)
    if (!item) return
    ordered.push(item)
    itemMap.delete(key)
  })
  itemMap.forEach(item => ordered.push(item))
  return ordered
}

export interface LicenseTemplateOverride {
  docName?: string
  docNameSub?: string
  validityNote?: string
  longTerm?: boolean
  docNoLabel?: string
  sectionCode?: string
}

export function loadLicenseTemplateOverrides(): Record<string, LicenseTemplateOverride> {
  const raw = localStorage.getItem(OVERRIDE_STORAGE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, LicenseTemplateOverride>
    if (!parsed || typeof parsed !== 'object') return {}
    return Object.fromEntries(
      Object.entries(parsed).map(([key, override]) => [
        key,
        {
          ...override,
          sectionCode: override.sectionCode
            ? migrateLegacyLicenseSectionCode(override.sectionCode)
            : override.sectionCode
        }
      ])
    )
  } catch {
    return {}
  }
}

export function saveLicenseTemplateOverrides(overrides: Record<string, LicenseTemplateOverride>): void {
  localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(overrides))
}

export function loadRemovedBuiltinLicenseKeys(): string[] {
  const raw = localStorage.getItem(REMOVED_BUILTIN_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

export function saveRemovedBuiltinLicenseKeys(keys: string[]): void {
  localStorage.setItem(REMOVED_BUILTIN_STORAGE_KEY, JSON.stringify(keys))
}

function findBuiltinLicenseItem(key: string): { item: LicenseTemplate; sectionCode: string } | null {
  for (const section of PARTNER_LICENSE_SECTIONS) {
    const item = section.items.find(entry => entry.key === key)
    if (item) return { item, sectionCode: section.code }
  }
  return null
}

function applyTemplateOverride(item: LicenseTemplate, override?: LicenseTemplateOverride): LicenseTemplate {
  if (!override) return item
  return {
    ...item,
    docName: override.docName ?? item.docName,
    docNameSub: override.docNameSub ?? item.docNameSub,
    validityNote: override.validityNote ?? item.validityNote,
    longTerm: override.longTerm ?? item.longTerm,
    docNoLabel: override.docNoLabel ?? item.docNoLabel
  }
}

export function loadCustomLicenseTemplates(): CustomLicenseTemplate[] {
  const raw = localStorage.getItem(CUSTOM_STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as CustomLicenseTemplate[]
    return Array.isArray(parsed)
      ? parsed
        .filter(item => item?.key && item?.docName)
        .map(item => ({
          ...item,
          sectionCode: migrateLegacyLicenseSectionCode(item.sectionCode)
        }))
      : []
  } catch {
    return []
  }
}

export function saveCustomLicenseTemplates(templates: CustomLicenseTemplate[]): void {
  localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(templates))
}

export function isCustomLicenseKey(key: string): boolean {
  return key.startsWith('custom_')
}

export function addCustomLicenseTemplate(input: {
  docName: string
  sectionCode: string
  validityNote?: string
  longTerm?: boolean
  docNoLabel?: string
}): CustomLicenseTemplate {
  const docName = input.docName.trim()
  if (!docName) {
    throw new Error('证照名称不能为空')
  }

  const section = PARTNER_LICENSE_SECTIONS.find(item => item.code === input.sectionCode)
  if (!section) {
    throw new Error('请选择所属分类')
  }

  const template: CustomLicenseTemplate = {
    key: `custom_${Date.now()}`,
    docName,
    sectionCode: input.sectionCode,
    validityNote: input.longTerm ? '' : (input.validityNote?.trim() || ''),
    longTerm: input.longTerm === true,
    docNoLabel: input.docNoLabel?.trim() || '证照编号',
    layout: 'card',
    isCustom: true,
    createdAt: Date.now()
  }

  const templates = loadCustomLicenseTemplates()
  templates.push(template)
  saveCustomLicenseTemplates(templates)
  appendLicenseItemToOrder(input.sectionCode, template.key)
  return template
}

export function removeCustomLicenseTemplate(key: string): boolean {
  if (!isCustomLicenseKey(key)) return false
  const templates = loadCustomLicenseTemplates().filter(item => item.key !== key)
  saveCustomLicenseTemplates(templates)
  removeLicenseItemFromOrder(key)
  return true
}

export function getCustomLicenseTemplate(key: string): CustomLicenseTemplate | undefined {
  return loadCustomLicenseTemplates().find(item => item.key === key)
}

export function updateCustomLicenseTemplate(
  key: string,
  input: {
    docName: string
    sectionCode: string
    validityNote?: string
    longTerm?: boolean
    docNoLabel?: string
    docNameSub?: string
  }
): CustomLicenseTemplate | null {
  if (!isCustomLicenseKey(key)) return null

  const docName = input.docName.trim()
  if (!docName) {
    throw new Error('证照名称不能为空')
  }

  const section = PARTNER_LICENSE_SECTIONS.find(item => item.code === input.sectionCode)
  if (!section) {
    throw new Error('请选择所属分类')
  }

  const templates = loadCustomLicenseTemplates()
  const index = templates.findIndex(item => item.key === key)
  if (index < 0) return null

  const updated: CustomLicenseTemplate = {
    ...templates[index],
    docName,
    docNameSub: input.docNameSub?.trim() || undefined,
    sectionCode: input.sectionCode,
    validityNote: input.longTerm ? '' : (input.validityNote?.trim() || ''),
    longTerm: input.longTerm === true,
    docNoLabel: input.docNoLabel?.trim() || '证照编号'
  }

  const previousSectionCode = templates[index].sectionCode
  templates[index] = updated
  saveCustomLicenseTemplates(templates)
  if (previousSectionCode !== input.sectionCode) {
    moveLicenseItemInOrder(key, previousSectionCode, input.sectionCode)
  }
  return updated
}

export interface EditableLicenseTemplate {
  key: string
  sectionCode: string
  docName: string
  docNameSub?: string
  validityNote: string
  longTerm?: boolean
  docNoLabel?: string
}

export function getEditableLicenseTemplate(key: string): EditableLicenseTemplate | null {
  const custom = getCustomLicenseTemplate(key)
  if (custom) {
    return {
      key: custom.key,
      sectionCode: custom.sectionCode,
      docName: custom.docName,
      docNameSub: custom.docNameSub,
      validityNote: custom.validityNote || '',
      longTerm: custom.longTerm,
      docNoLabel: custom.docNoLabel || '证照编号'
    }
  }

  const builtin = findBuiltinLicenseItem(key)
  if (!builtin) return null

  const override = loadLicenseTemplateOverrides()[key]
  return {
    key,
    sectionCode: override?.sectionCode || builtin.sectionCode,
    docName: override?.docName ?? builtin.item.docName,
    docNameSub: override?.docNameSub ?? builtin.item.docNameSub,
    validityNote: override?.validityNote ?? builtin.item.validityNote ?? '',
    longTerm: override?.longTerm ?? builtin.item.longTerm,
    docNoLabel: override?.docNoLabel ?? builtin.item.docNoLabel ?? '证照编号'
  }
}

export function updateLicenseTemplate(
  key: string,
  input: {
    docName: string
    sectionCode: string
    validityNote?: string
    longTerm?: boolean
    docNoLabel?: string
    docNameSub?: string
  }
): boolean {
  if (isCustomLicenseKey(key)) {
    return updateCustomLicenseTemplate(key, input) !== null
  }

  const builtin = findBuiltinLicenseItem(key)
  if (!builtin) return false

  const docName = input.docName.trim()
  if (!docName) {
    throw new Error('证照名称不能为空')
  }

  const section = PARTNER_LICENSE_SECTIONS.find(item => item.code === input.sectionCode)
  if (!section) {
    throw new Error('请选择所属分类')
  }

  const overrides = loadLicenseTemplateOverrides()
  const previousSectionCode = overrides[key]?.sectionCode || builtin.sectionCode
  overrides[key] = {
    docName,
    docNameSub: input.docNameSub?.trim() || undefined,
    sectionCode: input.sectionCode,
    validityNote: input.longTerm ? '' : (input.validityNote?.trim() || ''),
    longTerm: input.longTerm === true,
    docNoLabel: input.docNoLabel?.trim() || '证照编号'
  }
  saveLicenseTemplateOverrides(overrides)
  if (previousSectionCode !== input.sectionCode) {
    moveLicenseItemInOrder(key, previousSectionCode, input.sectionCode)
  }
  return true
}

export type BatchLicenseTemplateField = 'sectionCode' | 'docNoLabel' | 'longTerm' | 'validityNote'

export interface BatchLicenseTemplateInput {
  sectionCode?: string
  docNoLabel?: string
  longTerm?: boolean
  validityNote?: string
}

export function batchUpdateLicenseTemplates(
  keys: string[],
  fields: BatchLicenseTemplateField[],
  patch: BatchLicenseTemplateInput
): { updated: number; failed: string[] } {
  const failed: string[] = []
  let updated = 0

  keys.forEach(key => {
    const current = getEditableLicenseTemplate(key)
    if (!current) {
      failed.push(key)
      return
    }

    const longTerm = fields.includes('longTerm') && patch.longTerm !== undefined
      ? patch.longTerm === true
      : current.longTerm === true

    const input = {
      docName: current.docName,
      docNameSub: current.docNameSub,
      sectionCode: fields.includes('sectionCode') && patch.sectionCode
        ? patch.sectionCode
        : current.sectionCode,
      docNoLabel: fields.includes('docNoLabel') && patch.docNoLabel !== undefined
        ? patch.docNoLabel.trim() || '证照编号'
        : current.docNoLabel || '证照编号',
      longTerm,
      validityNote: longTerm
        ? ''
        : fields.includes('validityNote')
          ? (patch.validityNote?.trim() || '')
          : current.validityNote
    }

    try {
      if (updateLicenseTemplate(key, input)) {
        updated += 1
      } else {
        failed.push(key)
      }
    } catch {
      failed.push(key)
    }
  })

  return { updated, failed }
}

export function removeLicenseTemplate(key: string): boolean {
  if (isCustomLicenseKey(key)) {
    return removeCustomLicenseTemplate(key)
  }

  if (!findBuiltinLicenseItem(key)) return false

  const removed = loadRemovedBuiltinLicenseKeys()
  if (!removed.includes(key)) {
    removed.push(key)
    saveRemovedBuiltinLicenseKeys(removed)
  }

  const overrides = loadLicenseTemplateOverrides()
  if (overrides[key]) {
    delete overrides[key]
    saveLicenseTemplateOverrides(overrides)
  }
  removeLicenseItemFromOrder(key)
  return true
}

export function getLicenseTemplateLabel(key: string, fallback = ''): string {
  return getEditableLicenseTemplate(key)?.docName || fallback
}

export function getEffectiveLicenseSections(): LicenseSection[] {
  const customTemplates = loadCustomLicenseTemplates()
  const overrides = loadLicenseTemplateOverrides()
  const removedKeys = new Set(loadRemovedBuiltinLicenseKeys())

  const sections = PARTNER_LICENSE_SECTIONS.map(section => ({
    ...section,
    items: [] as LicenseTemplate[]
  }))
  const sectionMap = new Map(sections.map(section => [section.code, section]))

  PARTNER_LICENSE_SECTIONS.forEach(section => {
    section.items.forEach(item => {
      if (removedKeys.has(item.key)) return
      const override = overrides[item.key]
      const targetCode = migrateLegacyLicenseSectionCode(override?.sectionCode || section.code)
      const targetSection = sectionMap.get(targetCode)
      if (!targetSection) return
      if (targetSection.items.some(entry => entry.key === item.key)) return
      targetSection.items.push(applyTemplateOverride(item, override))
    })
  })

  customTemplates.forEach(template => {
    const targetSection = sectionMap.get(template.sectionCode)
    if (!targetSection) return
    const { sectionCode: _sectionCode, isCustom: _isCustom, createdAt: _createdAt, ...item } = template
    targetSection.items.push(item)
  })

  sections.forEach(section => {
    section.items = applyItemOrderToSection(section.code, section.items)
  })

  return sections
}

export function buildPartnerLicenseTemplateMap() {
  return new Map(
    getEffectiveLicenseSections().flatMap(section =>
      section.items.map(item => [item.key, { ...item, sectionCode: section.code, sectionTitle: section.title }])
    )
  )
}
