import type { PartnerDocument, PartnerProfileExtension } from '@/types/partnerProfile'
import { customerApi } from '@/utils/api'
import { getAuthToken, getAuthUser } from '@/utils/authSession'
import { loadPlatformCustomerList } from '@/utils/platformCustomerStore'
import {
  ensureStablePlatformPartnerCodes,
  formatPlatformPartnerCode,
  getNextPlatformPartnerCode,
  buildUsedPlatformPartnerCodeSet,
  rememberRetiredPlatformPartnerCodes
} from '@/utils/partnerPlatformCode'

export const CUSTOMERS_KEY = 'customers'
const CUSTOMER_SERVER_SYNCED_KEY = 'customers_serverSyncedAt'
export const CUSTOMER_DELETED_CODES_KEY = 'customerDeletedCodes'
export const CUSTOMER_CODE_PREFIX = 'YY'

let customerSyncTask: Promise<boolean> = Promise.resolve(true)

function hasAuthToken(): boolean {
  return !!getAuthToken()
}

function customerCodeOf(item: CustomerMaster): string {
  return String(item.code || item.id || '').trim()
}

function parseAuditTime(value?: string): number {
  const ts = Date.parse(String(value || ''))
  return Number.isNaN(ts) ? 0 : ts
}

function mergeCustomerRecord(local: CustomerMaster, remote: CustomerMaster): CustomerMaster {
  const code = customerCodeOf(local) || customerCodeOf(remote)
  const localAudited = local.auditStatus === 'audited'
  const remoteAudited = remote.auditStatus === 'audited'

  if (localAudited && !remoteAudited) {
    return { ...remote, ...local, id: String(local.id || remote.id), code }
  }

  if (localAudited && remoteAudited) {
    if (parseAuditTime(local.auditTime) >= parseAuditTime(remote.auditTime)) {
      return { ...remote, ...local, id: String(local.id || remote.id), code }
    }
  }

  return { ...local, ...remote, id: String(remote.id || local.id), code }
}

function mergeCustomerListsByCode(local: CustomerMaster[], remote: CustomerMaster[]): CustomerMaster[] {
  const map = new Map<string, CustomerMaster>()
  for (const item of remote) {
    const code = customerCodeOf(item)
    if (code) map.set(code, item)
  }
  for (const item of local) {
    const code = customerCodeOf(item)
    if (!code) continue
    const existing = map.get(code)
    map.set(code, existing ? mergeCustomerRecord(item, existing) : item)
  }
  return Array.from(map.values())
}

export type CustomerDocument = PartnerDocument

export interface CustomerMaster extends PartnerProfileExtension {
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
  district?: string
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
  documents?: CustomerDocument[]
  collaborationEnabled?: boolean
  [key: string]: unknown
}

export const defaultCustomers: CustomerMaster[] = [
  {
    id: 'GX01671',
    code: 'GX01671',
    name: '广西可盟医疗科技有限公司',
    shortName: '广西可盟',
    pinyin: 'gxkmylkjyxgs',
    contact: '吴精华',
    phone: '',
    mobile: '',
    email: '',
    type: 'deviceCompany',
    address: '柳州市桂中大道南端2号阳光壹佰城市广场3栋11-16',
    province: '广西壮族自治区',
    city: '柳州市',
    district: '城中区',
    country: '中国',
    postalCode: '',
    auditStatus: 'notAudited',
    status: 'normal',
    creditCode: '91450200MA5QFK3G6Y',
    taxNo: '91450200MA5QFK3G6Y',
    taxRate: 0,
    bankName: '/',
    bankBranchNo: '/',
    bankAccount: '/',
    platformUser: '否',
    settlementPeriod: 0,
    enterpriseLeader: '吴精华',
    legalPerson: '吴精华',
    license: '桂柳食药监械经营备20210631号',
    createTime: '2026-06-21',
    creator: '小华哥',
    documents: [
      {
        id: 1,
        docKey: 'md_class2_business_filing',
        docName: '第二类医疗器械经营备案凭证',
        docNo: '桂柳食药监械经营备20210631号',
        issueDate: '',
        expireDate: '',
        status: '有效',
        validityNote: '',
        longTerm: true,
        sectionCode: '2.2',
        sectionTitle: '经营许可类'
      }
    ]
  }
]

/** 已废弃的随意演示客户编码，加载时自动清除 */
const REMOVED_DEMO_CUSTOMER_CODES = new Set([
  'CU202606001',
  'CU202606002',
  'CU202606003',
  'CU202606004',
  'CU202606005',
  'CU202606006',
  'KH001',
  'KH002',
  'KH003',
  'KH004',
  'KH005',
  'KH006'
])

function filterRemovedDemoCustomers(list: CustomerMaster[]): CustomerMaster[] {
  return list.filter(item => !REMOVED_DEMO_CUSTOMER_CODES.has(customerCodeOf(item)))
}

function readDeletedCustomerCodes(): Set<string> {
  const raw = localStorage.getItem(CUSTOMER_DELETED_CODES_KEY)
  if (!raw) return new Set()
  try {
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [])
  } catch {
    return new Set()
  }
}

function rememberDeletedCustomerCodes(codes: string[]): void {
  if (codes.length === 0) return
  const set = readDeletedCustomerCodes()
  codes.forEach(code => {
    if (code) set.add(code)
  })
  localStorage.setItem(CUSTOMER_DELETED_CODES_KEY, JSON.stringify([...set]))
}

function forgetDeletedCustomerCodes(codes: string[]): void {
  if (codes.length === 0) return
  const set = readDeletedCustomerCodes()
  codes.forEach(code => {
    if (code) set.delete(code)
  })
  localStorage.setItem(CUSTOMER_DELETED_CODES_KEY, JSON.stringify([...set]))
}

function filterDeletedCustomers(list: CustomerMaster[]): CustomerMaster[] {
  const deletedCodes = readDeletedCustomerCodes()
  if (deletedCodes.size === 0) return list
  return list.filter(item => !deletedCodes.has(customerCodeOf(item)))
}

function customerMatchesDeleteTarget(item: CustomerMaster, idSet: Set<string>): boolean {
  const code = customerCodeOf(item)
  return idSet.has(String(item.id)) || (code ? idSet.has(code) : false)
}

export function formatCustomerCode(sequence: number): string {
  return formatPlatformPartnerCode(sequence)
}

/** @deprecated 使用 ensureCustomerPlatformCodes，编号与资料绑定后不再整体重排 */
export function assignSequentialCustomerCodes(list: CustomerMaster[]): CustomerMaster[] {
  return ensureCustomerPlatformCodes(list)
}

export function ensureCustomerPlatformCodes(list: CustomerMaster[]): CustomerMaster[] {
  return ensureStablePlatformPartnerCodes(list, {
    getStableId: item => String(item.id),
    getCode: item => customerCodeOf(item),
    setCode: (item, code) => ({ ...item, code })
  })
}

export function getNextCustomerCode(list: CustomerMaster[]): string {
  const used = buildUsedPlatformPartnerCodeSet(list.map(item => customerCodeOf(item)))
  return getNextPlatformPartnerCode(used)
}

function persistCustomerList(list: CustomerMaster[]): CustomerMaster[] {
  const withCodes = ensureCustomerPlatformCodes(list)
  writeCustomerListRaw(withCodes)
  return withCodes
}

function readCustomerListRaw(): CustomerMaster[] {
  const stored = localStorage.getItem(CUSTOMERS_KEY)
  if (!stored || stored === '[]') return []
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCustomerListRaw(list: CustomerMaster[]): void {
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(list))
}

export function loadCustomerList(): CustomerMaster[] {
  return readCustomerListRaw()
}

export function saveCustomerList(list: CustomerMaster[]): void {
  const withCodes = persistCustomerList(list)
  void syncCustomerListToServer(withCodes)
}

export async function syncCustomerListToServer(
  list?: CustomerMaster[],
  options?: { replace?: boolean; background?: boolean }
): Promise<boolean> {
  if (!hasAuthToken()) return false

  const run = async (): Promise<boolean> => {
    try {
      const payload = (list ?? readCustomerListRaw()).map(item => ({
        ...item,
        code: item.code || item.id
      }))
      if (payload.length === 0 && options?.replace !== true) return false
      await customerApi.sync(payload as Record<string, unknown>[], {
        replace: options?.replace === true,
        background: options?.background !== false
      })
      localStorage.setItem(CUSTOMER_SERVER_SYNCED_KEY, new Date().toISOString())
      return true
    } catch (error) {
      console.warn('[customerStore] 同步客户到服务器失败', error)
      return false
    }
  }

  customerSyncTask = customerSyncTask.then(run, run)
  return customerSyncTask
}

/** 登录后从服务器拉取/合并客户资料；服务器为空时回传本地默认数据 */
export async function hydrateCustomerListFromServer(options?: { timeoutMs?: number }): Promise<void> {
  if (!hasAuthToken()) return

  const timeoutMs = options?.timeoutMs ?? 15000
  const hydrateTask = (async () => {
    const remote = filterDeletedCustomers(
      filterRemovedDemoCustomers(
        (await customerApi.getAll({ background: true })) as CustomerMaster[]
      )
    )

    if (remote.length > 0) {
      const local = filterDeletedCustomers(
        filterRemovedDemoCustomers(readCustomerListRaw())
      )
      const merged = filterDeletedCustomers(
        mergeCustomerListsByCode(local.length > 0 ? local : defaultCustomers, remote)
      )
      writeCustomerListRaw(merged)
      localStorage.setItem(CUSTOMER_SERVER_SYNCED_KEY, new Date().toISOString())
    }

    loadAndEnsureCustomerList()
  })()

  try {
    await Promise.race([
      hydrateTask,
      new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('客户数据同步超时')), timeoutMs)
      })
    ])
  } catch (error) {
    console.warn('[customerStore] 从服务器加载客户失败，继续使用本地数据', error)
    loadAndEnsureCustomerList()
  }
}

export function resolveCustomerMaster(nameOrCode?: string): CustomerMaster | undefined {
  const key = String(nameOrCode || '').trim()
  if (!key) return undefined
  return loadCustomerList().find(
    item => item.name === key || item.code === key || item.id === key
  )
}

export function applyCustomerMasterToTarget(
  target: {
    customer?: string
    customerCode?: string
    contact?: string
    phone?: string
    address?: string
  },
  customer: CustomerMaster
): void {
  target.customer = customer.name
  target.customerCode = customer.code || customer.id
  target.contact = customer.contact || ''
  target.phone = customer.phone || customer.mobile || ''
  target.address = customer.address || ''
}

/** 按客户名称或编码，从资料库补全联系人、电话、地址等字段 */
export function enrichCustomerFieldsFromMaster(
  target: {
    customer?: string
    customerCode?: string
    contact?: string
    phone?: string
    address?: string
  }
): void {
  const found =
    resolveCustomerMaster(target.customer) ||
    resolveCustomerMaster(target.customerCode)
  if (found) {
    applyCustomerMasterToTarget(target, found)
  }
}

/** 加载客户列表，空库时写入默认演示数据；清除已废弃的随意演示客户 */
export function loadAndEnsureCustomerList(): CustomerMaster[] {
  const hasStoredList = localStorage.getItem(CUSTOMERS_KEY) !== null
  const deletedCodes = readDeletedCustomerCodes()
  const rawStored = readCustomerListRaw()
  const stored = filterDeletedCustomers(
    rawStored.filter(item => !REMOVED_DEMO_CUSTOMER_CODES.has(customerCodeOf(item)))
  )
  const idSet = new Set(stored.map(item => item.id))
  const codeSet = new Set(stored.map(item => customerCodeOf(item)).filter(Boolean))
  const missing = defaultCustomers.filter(item => {
    const code = customerCodeOf(item)
    return !idSet.has(item.id) && !codeSet.has(code) && !deletedCodes.has(code)
  })
  const merged = missing.length
    ? [...missing, ...stored]
    : stored.length
      ? stored
      : hasStoredList
        ? stored
        : [...defaultCustomers]

  const normalized = merged.map(item => ({
    ...item,
    code: item.code || item.id
  }))
  const withCodes = ensureCustomerPlatformCodes(normalized)
  const shouldWrite =
    !hasStoredList ||
    missing.length > 0 ||
    stored.length !== rawStored.length ||
    withCodes.some((item, index) => item.code !== normalized[index]?.code)

  if (shouldWrite) {
    writeCustomerListRaw(withCodes)
  }
  return withCodes
}

export function getCustomerById(id: string): CustomerMaster | undefined {
  const key = String(id || '').trim()
  return loadCustomerList().find(
    item => item.id === key || customerCodeOf(item) === key
  )
}

export function getCurrentUserName(): string {
  const user = getAuthUser<Record<string, unknown>>()
  if (user) {
    return String(user.realName || user.username || user.name || '系统管理员')
  }
  try {
    const legacy = JSON.parse(localStorage.getItem('user') || '{}')
    return legacy.realName || legacy.username || legacy.name || '系统管理员'
  } catch {
    return '系统管理员'
  }
}

export function upsertCustomer(customer: CustomerMaster): void {
  const list = loadCustomerList()
  const record: CustomerMaster = {
    ...customer,
    code: customer.code || customer.id
  }
  const code = customerCodeOf(record)
  const index = list.findIndex(
    item => item.id === record.id || (code && customerCodeOf(item) === code)
  )
  if (index >= 0) {
    list[index] = { ...list[index], ...record, id: record.id }
  } else {
    list.unshift(record)
  }
  saveCustomerList(list)
}

export async function saveCustomerRecord(customer: CustomerMaster): Promise<boolean> {
  const list = loadAndEnsureCustomerList()
  const record: CustomerMaster = {
    ...customer,
    code: customer.code || customer.id
  }
  const code = customerCodeOf(record)
  const index = list.findIndex(
    item => item.id === record.id || (code && customerCodeOf(item) === code)
  )
  if (index >= 0) {
    list[index] = { ...list[index], ...record, id: record.id }
  } else {
    list.unshift(record)
  }
  forgetDeletedCustomerCodes([code])
  const next = persistCustomerList(list)
  if (!hasAuthToken()) return true
  return syncCustomerListToServer(next, { background: true, replace: false })
}

export function deleteCustomer(id: string): boolean {
  const idSet = new Set([String(id)])
  const existed = loadCustomerList().some(item => customerMatchesDeleteTarget(item, idSet))
  if (!existed) return false
  batchDeleteCustomers([id])
  return true
}

export function batchDeleteCustomers(ids: string[]): CustomerMaster[] {
  const idSet = new Set(ids.map(String).filter(Boolean))
  if (idSet.size === 0) return loadAndEnsureCustomerList()

  const list = loadAndEnsureCustomerList()
  const removedCodes = list
    .filter(item => customerMatchesDeleteTarget(item, idSet))
    .map(item => customerCodeOf(item))
    .filter(Boolean)
  rememberDeletedCustomerCodes(removedCodes)
  rememberRetiredPlatformPartnerCodes(removedCodes)

  const next = list.filter(item => !customerMatchesDeleteTarget(item, idSet))
  const saved = persistCustomerList(next)
  void syncCustomerListToServer(saved, { background: true, replace: true })
  return loadAndEnsureCustomerList()
}

export function setCustomerStatus(
  id: string,
  status: 'normal' | 'disabled'
): CustomerMaster | undefined {
  const list = loadCustomerList()
  const index = list.findIndex(item => item.id === id)
  if (index < 0) return undefined

  list[index] = { ...list[index], status }
  saveCustomerList(list)
  return list[index]
}

export function batchSetCustomerStatus(
  ids: string[],
  status: 'normal' | 'disabled'
): CustomerMaster[] {
  const idSet = new Set(ids.map(String).filter(Boolean))
  if (idSet.size === 0) return loadCustomerList()

  const next = loadCustomerList().map(item =>
    idSet.has(item.id) ? { ...item, status } : item
  )
  saveCustomerList(next)
  return next
}

/** 业务单据下拉用：正常且已审核的客户 */
export function loadActiveCustomerList(): CustomerMaster[] {
  return loadCustomerList().filter(
    item => item.status !== 'disabled' && item.auditStatus === 'audited'
  )
}

export function setCustomerAuditStatus(
  id: string,
  audited: boolean
): CustomerMaster | undefined {
  const list = loadCustomerList()
  const index = list.findIndex(c => c.id === id)
  if (index < 0) return undefined

  const now = new Date().toLocaleString('zh-CN')
  const auditor = getCurrentUserName()
  list[index] = {
    ...list[index],
    auditStatus: audited ? 'audited' : 'notAudited',
    auditTime: audited ? now : '',
    auditor: audited ? auditor : ''
  }
  saveCustomerList(list)
  return list[index]
}

export function batchSetCustomerAuditStatus(
  ids: string[],
  audited: boolean
): CustomerMaster[] {
  const idSet = new Set(ids.map(String).filter(Boolean))
  if (idSet.size === 0) return loadCustomerList()

  const now = new Date().toLocaleString('zh-CN')
  const auditor = getCurrentUserName()
  const next = loadCustomerList().map(item => {
    if (!idSet.has(item.id)) return item
    return {
      ...item,
      auditStatus: audited ? 'audited' as const : 'notAudited' as const,
      auditTime: audited ? now : '',
      auditor: audited ? auditor : ''
    }
  })
  saveCustomerList(next)
  return next
}

/** 是否平台关联客户（展示 VIP 标识） */
export function isPlatformVipCustomer(customer: Partial<CustomerMaster>): boolean {
  const platformUser = String(customer.platformUser ?? '否').trim()
  if (platformUser && platformUser !== '否') return true
  if (String(customer.recordStatus ?? '否').trim() === '是') return true

  const code = customerCodeOf(customer as CustomerMaster)
  if (!code) return false
  return loadPlatformCustomerList().some(item => item.companyCode === code)
}
