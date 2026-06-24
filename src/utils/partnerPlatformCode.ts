/**
 * 医享平台编号（客户 / 供应商 / 平台客户统一格式）
 *
 * 【测试阶段】当前逻辑：编号与资料绑定后不再整体重排；界面不可手改。
 *
 * 【正式上线 — 务必遵守】
 * 一旦某 YY 编号曾分配给某客户/供应商/平台客户（含已删除档案），
 * 该号段永久退役，不得再分配给其它对象，避免张冠李戴引发业务纠纷。
 * 删除资料时需写入 RETIRED_PLATFORM_PARTNER_CODES_KEY；发号时必须跳过已退役号段。
 */
export const PLATFORM_PARTNER_CODE_PREFIX = 'YY'
export const PLATFORM_PARTNER_CODE_PATTERN = /^YY\d{5}$/

/** 全系统已退役编号（测试期起写入，上线后由服务端持久化并强校验） */
export const RETIRED_PLATFORM_PARTNER_CODES_KEY = 'retiredPlatformPartnerCodes'

export function readRetiredPlatformPartnerCodes(): Set<string> {
  const raw = localStorage.getItem(RETIRED_PLATFORM_PARTNER_CODES_KEY)
  if (!raw) return new Set()
  try {
    const parsed = JSON.parse(raw)
    return new Set(
      Array.isArray(parsed)
        ? parsed.map(String).filter(code => isPlatformPartnerCode(code))
        : []
    )
  } catch {
    return new Set()
  }
}

/** 记录已用过的编号，后续发号不得复用（正式上线硬性要求） */
export function rememberRetiredPlatformPartnerCodes(codes: string[]): void {
  const normalized = codes.map(code => String(code || '').trim()).filter(isPlatformPartnerCode)
  if (normalized.length === 0) return
  const set = readRetiredPlatformPartnerCodes()
  normalized.forEach(code => set.add(code))
  localStorage.setItem(RETIRED_PLATFORM_PARTNER_CODES_KEY, JSON.stringify([...set]))
}

export function buildUsedPlatformPartnerCodeSet(codes: Iterable<string>): Set<string> {
  const used = collectUsedPlatformPartnerCodes([...codes])
  readRetiredPlatformPartnerCodes().forEach(code => used.add(code))
  return used
}

export function isPlatformPartnerCode(code: unknown): boolean {
  return PLATFORM_PARTNER_CODE_PATTERN.test(String(code ?? '').trim())
}

export function formatPlatformPartnerCode(sequence: number): string {
  return `${PLATFORM_PARTNER_CODE_PREFIX}${String(Math.max(0, sequence)).padStart(5, '0')}`
}

export function collectUsedPlatformPartnerCodes(codes: unknown[]): Set<string> {
  const used = new Set<string>()
  codes.forEach(code => {
    const normalized = String(code ?? '').trim()
    if (isPlatformPartnerCode(normalized)) {
      used.add(normalized)
    }
  })
  return used
}

export function getNextPlatformPartnerCode(used: Set<string>): string {
  let max = -1
  used.forEach(code => {
    const sequence = Number(code.slice(PLATFORM_PARTNER_CODE_PREFIX.length))
    if (Number.isFinite(sequence) && sequence > max) {
      max = sequence
    }
  })
  let next = formatPlatformPartnerCode(max + 1)
  while (used.has(next)) {
    max += 1
    next = formatPlatformPartnerCode(max + 1)
  }
  return next
}

type EnsureStablePlatformCodeOptions<T> = {
  getStableId: (item: T) => string
  getCode: (item: T) => string
  setCode: (item: T, code: string) => T
}

/** 保留已有 YY 编号；仅为缺失编号的记录分配新号，编号与记录 id 永久绑定 */
export function ensureStablePlatformPartnerCodes<T>(
  list: T[],
  options: EnsureStablePlatformCodeOptions<T>
): T[] {
  const used = new Map<string, string>()
  const normalized = list.map(item => {
    const stableId = options.getStableId(item)
    const code = String(options.getCode(item) || '').trim()
    if (!isPlatformPartnerCode(code)) {
      return item
    }
    if (!used.has(code)) {
      used.set(code, stableId)
      return item
    }
    if (used.get(code) === stableId) {
      return item
    }
    return options.setCode(item, '')
  })

  const assigned = new Set(used.keys())
  readRetiredPlatformPartnerCodes().forEach(code => assigned.add(code))
  return normalized.map(item => {
    const stableId = options.getStableId(item)
    const code = String(options.getCode(item) || '').trim()
    if (isPlatformPartnerCode(code) && used.get(code) === stableId) {
      return item
    }
    const next = getNextPlatformPartnerCode(assigned)
    assigned.add(next)
    used.set(next, stableId)
    return options.setCode(item, next)
  })
}

export function resolveLockedPartnerPlatformCode(options: {
  existingCode?: string
  platformCustomerId?: unknown
  draftCode?: string
  usedCodes?: Iterable<string>
  lookupPlatformCode?: (platformCustomerId: number) => string | undefined
}): string {
  const existing = String(options.existingCode || '').trim()
  if (isPlatformPartnerCode(existing)) {
    return existing
  }

  const platformId = Number(options.platformCustomerId)
  if (Number.isFinite(platformId) && platformId > 0 && options.lookupPlatformCode) {
    const platformCode = String(options.lookupPlatformCode(platformId) || '').trim()
    if (isPlatformPartnerCode(platformCode)) {
      return platformCode
    }
  }

  const draft = String(options.draftCode || '').trim()
  if (isPlatformPartnerCode(draft)) {
    return draft
  }

  const used = buildUsedPlatformPartnerCodeSet([
    ...(options.usedCodes ? [...options.usedCodes] : []),
    existing,
    draft
  ])
  return getNextPlatformPartnerCode(used)
}
