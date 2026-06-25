/** 审核制度：全系统统一采用一级审核或双重审核 */

export type AuditSystemMode = 'single' | 'dual'

export const AUDIT_SYSTEM_MODE_LABELS: Record<AuditSystemMode, string> = {
  single: '一级审核',
  dual: '双重审核'
}

export const AUDIT_SYSTEM_MODE_DESCRIPTIONS: Record<AuditSystemMode, string> = {
  single: '保存后可直接审核，不再单独执行「确定」步骤。',
  dual: '须先「确定」、再「审核」，两级审批；确定与审核权限在角色/权限设定中分别配置。'
}

const STORAGE_KEY = 'system-audit-policy-settings'

const DEFAULT_MODE: AuditSystemMode = 'dual'

export type AuditSystemSettings = {
  mode: AuditSystemMode
}

const DEFAULT_SETTINGS: AuditSystemSettings = {
  mode: DEFAULT_MODE
}

export function loadAuditSystemSettings(): AuditSystemSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }

    const parsed = JSON.parse(raw) as Partial<AuditSystemSettings> & {
      global?: unknown
      documentAuditEnabled?: unknown
    }

    // 兼容旧版复杂配置
    if (parsed.mode === 'single' || parsed.mode === 'dual') {
      return { mode: parsed.mode }
    }

    return { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveAuditSystemSettings(settings: AuditSystemSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function resetAuditSystemSettings(): AuditSystemSettings {
  const settings = { ...DEFAULT_SETTINGS }
  saveAuditSystemSettings(settings)
  return settings
}

export function getAuditSystemMode(): AuditSystemMode {
  return loadAuditSystemSettings().mode
}

/** 双重审核：确定 → 审核 */
export function isDualAuditMode(): boolean {
  return getAuditSystemMode() === 'dual'
}

/** 一级审核：直接审核，无确定步骤 */
export function isSingleAuditMode(): boolean {
  return getAuditSystemMode() === 'single'
}

/** 是否需要在审核前先完成「确定」 */
export function requiresConfirmBeforeAudit(): boolean {
  return isDualAuditMode()
}
