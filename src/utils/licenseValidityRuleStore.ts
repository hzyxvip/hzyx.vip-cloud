import {
  DEFAULT_LICENSE_VALIDITY_RULES,
  normalizeLicenseValidityRule,
  normalizeLicenseValidityRules,
  type LicenseValidityRule
} from '@/constants/licenseValidityRules'

const STORAGE_KEY = 'license-validity-rules'
const REMOVED_IDS_STORAGE_KEY = 'license-validity-removed-ids'

function normalizeRemovedRuleId(id: string): string {
  return id.replace(/^(\d+)(?:-.*)?$/, (_, digits: string) => String(Number(digits)).padStart(2, '0'))
}

function cloneRules(rules: LicenseValidityRule[]): LicenseValidityRule[] {
  return JSON.parse(JSON.stringify(rules)) as LicenseValidityRule[]
}

export function loadRemovedLicenseValidityRuleIds(): string[] {
  const raw = localStorage.getItem(REMOVED_IDS_STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter(Boolean).map(normalizeRemovedRuleId))]
      : []
  } catch {
    return []
  }
}

export function saveRemovedLicenseValidityRuleIds(ids: string[]): void {
  localStorage.setItem(REMOVED_IDS_STORAGE_KEY, JSON.stringify([...new Set(ids.filter(Boolean))]))
}

export function markLicenseValidityRulesRemoved(ids: string[]): void {
  if (!ids.length) return
  saveRemovedLicenseValidityRuleIds([...loadRemovedLicenseValidityRuleIds(), ...ids])
}

export function clearRemovedLicenseValidityRuleIds(): void {
  localStorage.removeItem(REMOVED_IDS_STORAGE_KEY)
}

export function loadLicenseValidityRules(): LicenseValidityRule[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return normalizeLicenseValidityRules(cloneRules(DEFAULT_LICENSE_VALIDITY_RULES))

  try {
    const parsed = JSON.parse(raw) as LicenseValidityRule[]
    if (!Array.isArray(parsed) || !parsed.length) {
      return normalizeLicenseValidityRules(cloneRules(DEFAULT_LICENSE_VALIDITY_RULES))
    }
    return mergeLicenseValidityRules(parsed)
  } catch {
    return normalizeLicenseValidityRules(cloneRules(DEFAULT_LICENSE_VALIDITY_RULES))
  }
}

export function mergeLicenseValidityRules(stored: LicenseValidityRule[]): LicenseValidityRule[] {
  const removedIds = new Set(loadRemovedLicenseValidityRuleIds())
  const resultMap = new Map<string, LicenseValidityRule>()

  stored.forEach(item => {
    if (removedIds.has(item.id)) return
    resultMap.set(item.id, normalizeLicenseValidityRule(item))
  })

  cloneRules(DEFAULT_LICENSE_VALIDITY_RULES).forEach(defaultItem => {
    if (removedIds.has(defaultItem.id)) return
    if (!resultMap.has(defaultItem.id)) {
      resultMap.set(defaultItem.id, normalizeLicenseValidityRule(defaultItem))
    }
  })

  return Array.from(resultMap.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)
  )
}

export function saveLicenseValidityRules(rules: LicenseValidityRule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
}

/** 保存用户当前编辑的数据，不做默认表覆盖或强制去重 */
export function persistLicenseValidityRules(rules: LicenseValidityRule[]): LicenseValidityRule[] {
  const nextRules = rules.map(normalizeLicenseValidityRule)
  saveLicenseValidityRules(nextRules)
  return nextRules
}

export function deleteLicenseValidityRules(
  currentRules: LicenseValidityRule[],
  ids: string[]
): LicenseValidityRule[] {
  if (!ids.length) return currentRules

  const idSet = new Set(ids)
  markLicenseValidityRulesRemoved(ids)
  const nextRules = currentRules.filter(item => !idSet.has(item.id))
  saveLicenseValidityRules(nextRules.map(normalizeLicenseValidityRule))
  return nextRules
}

export function loadAndEnsureLicenseValidityRules(): LicenseValidityRule[] {
  return loadLicenseValidityRules()
}

export function getLicenseValidityRuleByDocKey(docKey: string): LicenseValidityRule | undefined {
  return loadLicenseValidityRules().find(
    item => item.docKey === docKey && item.status === '正常'
  )
}

export function getActiveLicenseValidityRules(): LicenseValidityRule[] {
  return loadLicenseValidityRules().filter(item => item.status === '正常')
}
