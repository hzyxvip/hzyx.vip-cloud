import type { Company } from '@/utils/dataStore'
import { companies } from '@/utils/dataStore'
import { TENANT_PLATFORM_CUSTOMER_SEED } from '@/constants/platformTenantCustomerSeed'
import { resolvePartnerNameByPlatformCode } from '@/utils/orderListPartnerCodes'
import { loadPlatformCustomerList } from '@/utils/platformCustomerStore'
import { isPlatformPartnerCode } from '@/utils/partnerPlatformCode'

const CACHE_KEY = 'tenant-company-directory'

type DirectoryEntry = { id: number; code: string; name: string }

export function cacheTenantCompanyDirectory(list: Company[]): void {
  if (!list.length) return
  const slim: DirectoryEntry[] = list.map(c => ({
    id: c.id,
    code: String(c.code || ''),
    name: String(c.name || '').trim()
  }))
  localStorage.setItem(CACHE_KEY, JSON.stringify(slim))
}

const readCachedDirectory = (): DirectoryEntry[] => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as DirectoryEntry[]) : []
  } catch {
    return []
  }
}

const listDirectoryEntries = (): DirectoryEntry[] => {
  const merged = new Map<number, DirectoryEntry>()
  for (const c of companies.value) {
    merged.set(c.id, {
      id: c.id,
      code: String(c.code || ''),
      name: String(c.name || '').trim()
    })
  }
  for (const c of readCachedDirectory()) {
    if (!merged.has(c.id)) merged.set(c.id, c)
  }
  return [...merged.values()]
}

const findInDirectory = (opts: { name?: string; code?: string }): number => {
  const name = String(opts.name || '').trim()
  const code = String(opts.code || '').trim()
  for (const item of listDirectoryEntries()) {
    if (code && item.code === code) return item.id
    if (name && item.name === name) return item.id
  }
  return 0
}

const resolveBusinessCodeByNameOrPartnerCode = (name: string, partnerCode: string): string => {
  if (partnerCode && !isPlatformPartnerCode(partnerCode)) return partnerCode

  const resolvedName = isPlatformPartnerCode(partnerCode)
    ? resolvePartnerNameByPlatformCode(partnerCode)
    : name

  const platform = loadPlatformCustomerList().find(
    p => p.companyName === resolvedName || p.companyName === name
  )
  if (platform?.companyCode) return platform.companyCode

  const seed = TENANT_PLATFORM_CUSTOMER_SEED.find(
    s => s.companyName === resolvedName || s.companyName === name
  )
  return seed?.companyCode || ''
}

/** 按公司名称、业务编号(DEMO/MFG)或医享平台编号(YY)解析租户 companyId */
export function resolveTenantCompanyId(name: string, partnerCode = ''): number {
  const trimmedName = name.trim()
  const trimmedCode = partnerCode.trim()

  let id = findInDirectory({ name: trimmedName, code: trimmedCode })
  if (id) return id

  if (isPlatformPartnerCode(trimmedCode)) {
    const resolvedName = resolvePartnerNameByPlatformCode(trimmedCode)
    id = findInDirectory({ name: resolvedName })
    if (id) return id
  }

  const bizCode = resolveBusinessCodeByNameOrPartnerCode(trimmedName, trimmedCode)
  if (bizCode) {
    id = findInDirectory({ code: bizCode })
    if (id) return id
  }

  return 0
}

/** 平台客户种子 id(101/102…) → 后端 companyId */
export function resolveTenantCompanyIdFromPlatformSeedId(platformSeedId: number): number {
  if (!Number.isFinite(platformSeedId) || platformSeedId <= 0) return 0
  const seed = TENANT_PLATFORM_CUSTOMER_SEED.find(s => s.id === platformSeedId)
  if (!seed) return 0
  return findInDirectory({ code: seed.companyCode, name: seed.companyName })
}

export function isKnownTenantCompanyId(companyId: number): boolean {
  if (!Number.isFinite(companyId) || companyId <= 0) return false
  return listDirectoryEntries().some(item => item.id === companyId)
}
