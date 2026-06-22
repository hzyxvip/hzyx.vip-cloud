import { getEffectiveLicenseSections } from '@/utils/partnerLicenseSettings'

export interface LicenseVisibilityConfig {
  sections: Record<string, boolean>
  items: Record<string, boolean>
}

const VISIBILITY_STORAGE_KEY = 'partner-license-visibility'

export function createDefaultLicenseVisibility(): LicenseVisibilityConfig {
  const sections: Record<string, boolean> = {}
  const items: Record<string, boolean> = {}

  getEffectiveLicenseSections().forEach(section => {
    sections[section.code] = true
    section.items.forEach(item => {
      items[item.key] = true
    })
  })

  return { sections, items }
}

export function loadLicenseVisibility(): LicenseVisibilityConfig {
  const defaults = createDefaultLicenseVisibility()
  const raw = localStorage.getItem(VISIBILITY_STORAGE_KEY)
  if (!raw) return defaults

  try {
    const parsed = JSON.parse(raw) as Partial<LicenseVisibilityConfig>
    return {
      sections: { ...defaults.sections, ...(parsed.sections || {}) },
      items: { ...defaults.items, ...(parsed.items || {}) }
    }
  } catch {
    return defaults
  }
}

export function saveLicenseVisibility(config: LicenseVisibilityConfig): void {
  localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(config))
}

export function isLicenseSectionVisible(
  config: LicenseVisibilityConfig,
  sectionCode: string
): boolean {
  return config.sections[sectionCode] !== false
}

export function isLicenseItemVisible(
  config: LicenseVisibilityConfig,
  itemKey: string,
  sectionCode?: string
): boolean {
  if (sectionCode && !isLicenseSectionVisible(config, sectionCode)) return false
  return config.items[itemKey] !== false
}

export function setLicenseSectionVisible(
  config: LicenseVisibilityConfig,
  sectionCode: string,
  visible: boolean
): LicenseVisibilityConfig {
  const section = getEffectiveLicenseSections().find(item => item.code === sectionCode)
  const nextSections = { ...config.sections, [sectionCode]: visible }
  const nextItems = { ...config.items }

  section?.items.forEach(item => {
    nextItems[item.key] = visible
  })

  return { sections: nextSections, items: nextItems }
}

export function setLicenseItemVisible(
  config: LicenseVisibilityConfig,
  sectionCode: string,
  itemKey: string,
  visible: boolean
): LicenseVisibilityConfig {
  const nextItems = { ...config.items, [itemKey]: visible }
  const section = getEffectiveLicenseSections().find(item => item.code === sectionCode)
  const sectionVisible = section?.items.some(item => nextItems[item.key] !== false) ?? visible

  return {
    sections: { ...config.sections, [sectionCode]: sectionVisible },
    items: nextItems
  }
}

export function removeLicenseItemVisibility(
  config: LicenseVisibilityConfig,
  itemKey: string
): LicenseVisibilityConfig {
  const nextItems = { ...config.items }
  delete nextItems[itemKey]
  return { ...config, items: nextItems }
}

export function setAllLicenseVisibility(visible: boolean): LicenseVisibilityConfig {
  const config = createDefaultLicenseVisibility()
  Object.keys(config.sections).forEach(key => {
    config.sections[key] = visible
  })
  Object.keys(config.items).forEach(key => {
    config.items[key] = visible
  })
  return config
}
