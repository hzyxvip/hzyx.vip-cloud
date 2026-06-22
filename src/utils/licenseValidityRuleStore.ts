import {
  DEFAULT_LICENSE_VALIDITY_RULES,
  type LicenseValidityRule
} from '@/constants/licenseValidityRules'

const STORAGE_KEY = 'license-validity-rules'

function cloneRules(rules: LicenseValidityRule[]): LicenseValidityRule[] {
  return JSON.parse(JSON.stringify(rules)) as LicenseValidityRule[]
}

export function loadLicenseValidityRules(): LicenseValidityRule[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return cloneRules(DEFAULT_LICENSE_VALIDITY_RULES)

  try {
    const parsed = JSON.parse(raw) as LicenseValidityRule[]
    if (!Array.isArray(parsed) || !parsed.length) {
      return cloneRules(DEFAULT_LICENSE_VALIDITY_RULES)
    }
    return mergeLicenseValidityRules(parsed)
  } catch {
    return cloneRules(DEFAULT_LICENSE_VALIDITY_RULES)
  }
}

export function mergeLicenseValidityRules(stored: LicenseValidityRule[]): LicenseValidityRule[] {
  const defaults = cloneRules(DEFAULT_LICENSE_VALIDITY_RULES)
  const storedById = new Map(stored.map(item => [item.id, item]))

  const merged = defaults.map(item => ({
    ...item,
    ...(storedById.get(item.id) || {})
  }))

  stored.forEach(item => {
    if (!defaults.some(defaultItem => defaultItem.id === item.id)) {
      merged.push(item)
    }
  })

  return merged.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
}

export function saveLicenseValidityRules(rules: LicenseValidityRule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
}

export function loadAndEnsureLicenseValidityRules(): LicenseValidityRule[] {
  const rules = loadLicenseValidityRules()
  saveLicenseValidityRules(rules)
  return rules
}

export function getLicenseValidityRuleByDocKey(docKey: string): LicenseValidityRule | undefined {
  return loadLicenseValidityRules().find(
    item => item.docKey === docKey && item.status === '正常'
  )
}

export function getActiveLicenseValidityRules(): LicenseValidityRule[] {
  return loadLicenseValidityRules().filter(item => item.status === '正常')
}
