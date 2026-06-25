export const SUPPLIERS_KEY = 'suppliers'
export const SUPPLIER_DELETED_CODES_KEY = 'supplierDeletedCodes'
export const SUPPLIER_CODE_PREFIX = 'YY'

import type { PartnerDocument, PartnerProfileExtension } from '@/types/partnerProfile'
import { DEMO_TENANT_ACCOUNT } from '@/constants/loginAccounts'
import { getCurrentUserName } from '@/utils/customerStore'
import { supplierApi } from '@/utils/api'
import { getAuthToken, getAuthCompanyId } from '@/utils/authSession'
import { getCurrentCompany } from '@/utils/dataStore'
import { getCurrentTenantIdentity, isOwnCompanyPartnerRecord } from '@/utils/tenantIdentity'
import {
  ensureStablePlatformPartnerCodes,
  formatPlatformPartnerCode,
  getNextPlatformPartnerCode,
  buildUsedPlatformPartnerCodeSet,
  rememberRetiredPlatformPartnerCodes
} from '@/utils/partnerPlatformCode'

const SUPPLIER_SERVER_SYNCED_KEY = 'suppliers_serverSyncedAt'
let supplierSyncTask: Promise<boolean> = Promise.resolve(true)

function resolveSupplierCompanyId(): number {
  return getAuthCompanyId() ?? getCurrentCompany() ?? 0
}

function suppliersStorageKey(companyId = resolveSupplierCompanyId()): string {
  return companyId > 0 ? `${SUPPLIERS_KEY}_${companyId}` : SUPPLIERS_KEY
}

function deletedSupplierCodesStorageKey(companyId = resolveSupplierCompanyId()): string {
  return companyId > 0 ? `${SUPPLIER_DELETED_CODES_KEY}_${companyId}` : SUPPLIER_DELETED_CODES_KEY
}

function serverSyncedStorageKey(companyId = resolveSupplierCompanyId()): string {
  return companyId > 0 ? `${SUPPLIER_SERVER_SYNCED_KEY}_${companyId}` : SUPPLIER_SERVER_SYNCED_KEY
}

function shouldSeedDefaultSuppliers(): boolean {
  const { companyCode } = getCurrentTenantIdentity()
  return companyCode === DEMO_TENANT_ACCOUNT.companyCode
}

function sanitizeSupplierList(list: SupplierMaster[]): SupplierMaster[] {
  return list.filter(item => !isOwnCompanyPartnerRecord(item))
}

function hasAuthToken(): boolean {
  return !!getAuthToken()
}

export type SupplierDocument = PartnerDocument

export interface SupplierMaster extends PartnerProfileExtension {
  id: string
  code?: string
  name: string
  contact: string
  phone?: string
  mobile?: string
  email?: string
  type: string
  address?: string
  province?: string
  city?: string
  postalCode?: string
  creditCode?: string
  bankName?: string
  bankAccount?: string
  taxNo?: string
  legalPerson?: string
  registerCapital?: string
  businessScope?: string
  establishDate?: string
  remark?: string
  auditStatus: 'notAudited' | 'audited'
  status: 'normal' | 'disabled'
  createTime: string
  creator: string
  auditTime?: string
  auditor?: string
  documents?: SupplierDocument[]
  collaborationEnabled?: boolean
  [key: string]: unknown
}

export const supplierTypeOptions = [
  { label: '生产企业', value: 'manufacturer' },
  { label: '经营企业', value: 'distributor' },
  { label: '其他', value: 'other' }
]

export const defaultSuppliers: SupplierMaster[] = [
  {
    id: 'SUP001',
    code: 'SUP001',
    name: '北京医疗器械有限公司',
    contact: '张三',
    phone: '010-88888888',
    mobile: '13800138000',
    province: '北京',
    city: '北京市',
    type: 'manufacturer',
    auditStatus: 'audited',
    status: 'normal',
    createTime: '2026-06-15',
    creator: '系统管理员'
  },
  {
    id: 'SUP002',
    code: 'SUP002',
    name: '上海医疗设备有限公司',
    contact: '李四',
    phone: '021-66666666',
    mobile: '13800138001',
    province: '上海',
    city: '上海市',
    type: 'distributor',
    auditStatus: 'audited',
    status: 'normal',
    createTime: '2026-06-14',
    creator: '系统管理员'
  },
  {
    id: 'SUP003',
    code: 'SUP003',
    name: '广州医疗科技有限公司',
    contact: '王五',
    phone: '020-55555555',
    mobile: '13800138002',
    province: '广东',
    city: '广州市',
    type: 'manufacturer',
    auditStatus: 'notAudited',
    status: 'normal',
    createTime: '2026-06-13',
    creator: '系统管理员'
  }
]

function readDeletedSupplierCodes(): Set<string> {
  const raw = localStorage.getItem(deletedSupplierCodesStorageKey())
  if (!raw) return new Set()
  try {
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [])
  } catch {
    return new Set()
  }
}

function rememberDeletedSupplierCodes(codes: string[]): void {
  if (codes.length === 0) return
  const set = readDeletedSupplierCodes()
  codes.forEach(code => {
    if (code) set.add(code)
  })
  localStorage.setItem(deletedSupplierCodesStorageKey(), JSON.stringify([...set]))
}

function normalizeSupplierId(id: string | number): string {
  return String(id ?? '').trim()
}

function supplierCodeOf(item: Pick<SupplierMaster, 'id' | 'code'>): string {
  return String(item.code || item.id)
}

function readSupplierListRaw(): SupplierMaster[] {
  const companyId = resolveSupplierCompanyId()
  const scopedKey = suppliersStorageKey(companyId)
  const stored = localStorage.getItem(scopedKey)
  if (!stored || stored === '[]') {
    return []
  }
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function loadSupplierList(): SupplierMaster[] {
  return readSupplierListRaw()
}

export function saveSupplierList(list: SupplierMaster[]): void {
  const cleaned = sanitizeSupplierList(list)
  const withCodes = ensureSupplierPlatformCodes(cleaned)
  localStorage.setItem(suppliersStorageKey(), JSON.stringify(withCodes))
  void syncSupplierListToServer(withCodes)
}

export async function syncSupplierListToServer(
  list?: SupplierMaster[],
  options?: { replace?: boolean; background?: boolean }
): Promise<boolean> {
  if (!hasAuthToken()) return false

  const run = async (): Promise<boolean> => {
    try {
      const payload = (list ?? readSupplierListRaw()).map(item => ({
        ...item,
        code: item.code || item.id
      }))
      if (payload.length === 0 && options?.replace !== true) return false
      await supplierApi.sync(payload as Record<string, unknown>[], {
        replace: options?.replace === true,
        background: options?.background !== false
      })
      localStorage.setItem(serverSyncedStorageKey(), new Date().toISOString())
      return true
    } catch (error) {
      console.warn('[supplierStore] 同步供应商到服务器失败', error)
      return false
    }
  }

  supplierSyncTask = supplierSyncTask.then(run, run)
  return supplierSyncTask
}

export async function hydrateSupplierListFromServer(options?: { timeoutMs?: number }): Promise<void> {
  if (!hasAuthToken()) return

  const timeoutMs = options?.timeoutMs ?? 15000
  const hydrateTask = (async () => {
    const remote = sanitizeSupplierList(
      (await supplierApi.getAll({ background: true })) as SupplierMaster[]
    )
    const local = readSupplierListRaw()
    const merged = remote.length > 0
      ? sanitizeSupplierList(mergeSupplierListsByCode(local, remote))
      : sanitizeSupplierList(local)
    localStorage.setItem(
      suppliersStorageKey(),
      JSON.stringify(ensureSupplierPlatformCodes(merged))
    )
    localStorage.setItem(serverSyncedStorageKey(), new Date().toISOString())
  })()

  try {
    await Promise.race([
      hydrateTask,
      new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('供应商数据同步超时')), timeoutMs)
      })
    ])
  } catch (error) {
    console.warn('[supplierStore] 从服务器加载供应商失败，继续使用本地数据', error)
  }
}

function mergeSupplierListsByCode(local: SupplierMaster[], remote: SupplierMaster[]): SupplierMaster[] {
  const map = new Map<string, SupplierMaster>()
  local.forEach(item => map.set(String(item.code || item.id), item))
  remote.forEach(item => {
    const code = String(item.code || item.id)
    const existing = map.get(code)
    map.set(code, existing ? { ...existing, ...item, code } : { ...item, code })
  })
  return Array.from(map.values())
}

export function ensureSupplierPlatformCodes(list: SupplierMaster[]): SupplierMaster[] {
  return ensureStablePlatformPartnerCodes(list, {
    getStableId: item => normalizeSupplierId(item.id),
    getCode: item => supplierCodeOf(item),
    setCode: (item, code) => ({ ...item, code })
  })
}

export function formatSupplierCode(sequence: number): string {
  return formatPlatformPartnerCode(sequence)
}

export function getNextSupplierCode(list: SupplierMaster[] = loadSupplierList()): string {
  const used = buildUsedPlatformPartnerCodeSet(list.map(item => supplierCodeOf(item)))
  return getNextPlatformPartnerCode(used)
}

export function loadAndEnsureSupplierList(): SupplierMaster[] {
  const companyId = resolveSupplierCompanyId()
  const scopedKey = suppliersStorageKey(companyId)
  const hasStoredList = localStorage.getItem(scopedKey) !== null
  const deletedCodes = readDeletedSupplierCodes()
  const stored = sanitizeSupplierList(readSupplierListRaw())
  const idSet = new Set(stored.map(item => normalizeSupplierId(item.id)))
  const codeSet = new Set(stored.map(item => supplierCodeOf(item)).filter(Boolean))
  const missing = shouldSeedDefaultSuppliers()
    ? defaultSuppliers.filter(item => {
        const code = supplierCodeOf(item)
        return !idSet.has(normalizeSupplierId(item.id)) && !codeSet.has(code) && !deletedCodes.has(code)
      })
    : []
  const merged = sanitizeSupplierList(
    missing.length
      ? [...missing, ...stored]
      : stored.length
        ? stored
        : hasStoredList
          ? stored
          : shouldSeedDefaultSuppliers()
            ? [...defaultSuppliers]
            : []
  )

  if (!hasStoredList || missing.length > 0 || merged.length !== stored.length) {
    saveSupplierList(merged)
  }

  return merged
}

export function getSupplierById(id: string): SupplierMaster | undefined {
  const normalizedId = normalizeSupplierId(id)
  return loadSupplierList().find(item => {
    const itemId = normalizeSupplierId(item.id)
    const itemCode = supplierCodeOf(item)
    return itemId === normalizedId || itemCode === normalizedId
  })
}

export function upsertSupplier(supplier: SupplierMaster): boolean {
  if (isOwnCompanyPartnerRecord(supplier)) {
    console.warn('[supplierStore] 不能将本企业保存为供应商')
    return false
  }
  const list = loadSupplierList()
  const code = supplierCodeOf(supplier)
  const index = list.findIndex(
    item => item.id === supplier.id || (code && supplierCodeOf(item) === code)
  )
  const record: SupplierMaster = {
    ...supplier,
    code: supplier.code || supplier.id
  }
  if (index >= 0) {
    list[index] = { ...list[index], ...record }
  } else {
    list.unshift(record)
  }
  saveSupplierList(list)
  return true
}

export function deleteSupplier(id: string | number): boolean {
  const normalizedId = normalizeSupplierId(id)
  const list = loadSupplierList()
  const target = list.find(item => normalizeSupplierId(item.id) === normalizedId)
  if (!target) return false

  rememberDeletedSupplierCodes([supplierCodeOf(target)])
  rememberRetiredPlatformPartnerCodes([supplierCodeOf(target)])
  const next = list.filter(item => normalizeSupplierId(item.id) !== normalizedId)
  saveSupplierList(next)
  return true
}

export function batchDeleteSuppliers(ids: Array<string | number>): SupplierMaster[] {
  const idSet = new Set(ids.map(normalizeSupplierId).filter(Boolean))
  if (idSet.size === 0) return loadSupplierList()

  const list = loadSupplierList()
  const removedCodes = list
    .filter(item => idSet.has(normalizeSupplierId(item.id)))
    .map(item => supplierCodeOf(item))
    .filter(Boolean)
  rememberDeletedSupplierCodes(removedCodes)
  rememberRetiredPlatformPartnerCodes(removedCodes)

  const next = list.filter(item => !idSet.has(normalizeSupplierId(item.id)))
  saveSupplierList(next)
  return next
}

export function setSupplierAuditStatus(
  id: string,
  audited: boolean
): SupplierMaster | undefined {
  const list = loadSupplierList()
  const index = list.findIndex(item => item.id === id)
  if (index < 0) return undefined

  const now = new Date().toLocaleString('zh-CN')
  const auditor = getCurrentUserName()
  list[index] = {
    ...list[index],
    auditStatus: audited ? 'audited' : 'notAudited',
    auditTime: audited ? now : '',
    auditor: audited ? auditor : ''
  }
  saveSupplierList(list)
  return list[index]
}

export function batchSetSupplierAuditStatus(
  ids: string[],
  audited: boolean
): SupplierMaster[] {
  const idSet = new Set(ids.map(String).filter(Boolean))
  if (idSet.size === 0) return loadSupplierList()

  const now = new Date().toLocaleString('zh-CN')
  const auditor = getCurrentUserName()
  const next = loadSupplierList().map(item => {
    if (!idSet.has(item.id)) return item
    return {
      ...item,
      auditStatus: audited ? 'audited' as const : 'notAudited' as const,
      auditTime: audited ? now : '',
      auditor: audited ? auditor : ''
    }
  })
  saveSupplierList(next)
  return next
}

export type SupplierSelectOption = {
  label: string
  value: string
  code: string
  address: string
  id: string
}

function formatSupplierAddress(item: Pick<SupplierMaster, 'address' | 'province' | 'city'>): string {
  if (item.address) return item.address
  return [item.province, item.city].filter(Boolean).join('')
}

export function toSupplierSelectOption(item: SupplierMaster): SupplierSelectOption {
  const code = supplierCodeOf(item)
  return {
    label: item.name,
    value: code,
    code,
    address: formatSupplierAddress(item),
    id: item.id
  }
}

/** 按名称或编码解析供应商主数据 */
export function resolveSupplierMaster(nameOrCode?: string): SupplierMaster | undefined {
  const key = String(nameOrCode || '').trim()
  if (!key) return undefined
  const list = loadAndEnsureSupplierList()
  const byCode = list.find(item => supplierCodeOf(item) === key || normalizeSupplierId(item.id) === key)
  if (byCode) return byCode
  const matches = list.filter(item => String(item.name || '').trim() === key)
  if (matches.length === 0) return undefined
  if (matches.length === 1) return matches[0]
  return (
    matches.find(item => item.auditStatus === 'audited') ||
    matches.find(item => item.status === 'normal') ||
    matches[0]
  )
}

/** 采购等业务下拉：来自供应商资料，暂不过滤审核/停用状态 */
export function loadSupplierSelectOptions(): SupplierSelectOption[] {
  const seen = new Set<string>()
  return loadAndEnsureSupplierList()
    .map(toSupplierSelectOption)
    .filter(opt => {
      if (!opt.code || seen.has(opt.code)) return false
      seen.add(opt.code)
      return true
    })
}
