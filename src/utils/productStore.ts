import { productApi } from '@/utils/api'
import { getAuthToken } from '@/utils/authSession'
import { SYSTEM_DEFAULT_WAREHOUSE_NAME } from '@/utils/warehouseDefaults'

export const PRODUCT_LIST_KEY = 'productList'
const PRODUCT_LIST_BACKUP_KEY = 'productList_backup'
const LEGACY_PLATFORM_PRODUCT_LIST_KEY = 'platformProductList'
const PRODUCT_SERVER_SYNCED_KEY = 'productList_serverSyncedAt'
/** 服务器覆盖前自动快照，用于误覆盖后恢复 */
const PRODUCT_LIST_SNAPSHOT_KEY = 'productList_snapshot_before_server'
/** 用户主动清空后不再自动补演示商品 */
const PRODUCT_LIST_USER_CLEARED_KEY = 'productList_userCleared'
/** 用户已删除的商品编码，合并服务器/备份时不再自动带回 */
const PRODUCT_LIST_DELETED_CODES_KEY = 'productList_deletedCodes'

export function isProductListUserCleared(): boolean {
  return localStorage.getItem(PRODUCT_LIST_USER_CLEARED_KEY) === '1'
}

export function markProductListAsUserCleared(): void {
  localStorage.setItem(PRODUCT_LIST_USER_CLEARED_KEY, '1')
}

export function markProductListAsActive(): void {
  localStorage.removeItem(PRODUCT_LIST_USER_CLEARED_KEY)
}

export function getDeletedProductCodes(): Set<string> {
  try {
    const raw = localStorage.getItem(PRODUCT_LIST_DELETED_CODES_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.map((c: unknown) => String(c ?? '').trim()).filter(Boolean))
  } catch {
    return new Set()
  }
}

export function addDeletedProductCodes(codes: Iterable<string>): void {
  const set = getDeletedProductCodes()
  for (const code of codes) {
    const key = String(code ?? '').trim()
    if (key) set.add(key)
  }
  localStorage.setItem(PRODUCT_LIST_DELETED_CODES_KEY, JSON.stringify([...set]))
}

export function removeDeletedProductCodes(codes: Iterable<string>): void {
  const set = getDeletedProductCodes()
  for (const code of codes) {
    set.delete(String(code ?? '').trim())
  }
  if (set.size === 0) {
    localStorage.removeItem(PRODUCT_LIST_DELETED_CODES_KEY)
  } else {
    localStorage.setItem(PRODUCT_LIST_DELETED_CODES_KEY, JSON.stringify([...set]))
  }
}

export function clearDeletedProductCodes(): void {
  localStorage.removeItem(PRODUCT_LIST_DELETED_CODES_KEY)
}

export function filterOutDeletedProducts(list: ProductMaster[]): ProductMaster[] {
  const deleted = getDeletedProductCodes()
  if (deleted.size === 0) return list
  return list.filter(item => !deleted.has(String(item.code ?? '').trim()))
}

/** 用户主动新增/导入时，从「已删编码」中移除，允许该编码再次入库 */
export function acknowledgeRestoredProductCodes(codes: Iterable<string>): void {
  removeDeletedProductCodes(codes)
}

export const LARGE_PRODUCT_RECOVERY_THRESHOLD = 20

/** 仅用远端数据补全本地已有编码的字段，不增加新编码 */
export function enrichProductListFromRemote(
  local: ProductMaster[],
  remote: ProductMaster[]
): ProductMaster[] {
  if (!local.length) return []
  if (!remote.length) return dedupeProductListByCode(local)

  const remoteMap = new Map(
    remote.map(item => [String(item.code ?? '').trim(), item]).filter(([code]) => Boolean(code))
  )
  return dedupeProductListByCode(
    local.map(item => {
      const code = String(item.code ?? '').trim()
      const remoteItem = remoteMap.get(code)
      if (!remoteItem) return item
      return mergeProductListsByCode([item], [remoteItem])[0]
    })
  )
}

/** 本地明显偏少时，才允许从服务器/备份自动补回新编码 */
export function shouldAutoRecoverMissingProducts(
  currentCount: number,
  candidateCount: number
): boolean {
  if (isProductListUserCleared() && currentCount === 0) return false
  if (candidateCount >= LARGE_PRODUCT_RECOVERY_THRESHOLD) return true
  return localStorage.getItem(PRODUCT_LIST_KEY) === null && candidateCount > 0
}

export interface ProductMaster {
  id?: number
  code: string
  name: string
  spec?: string
  origin?: string
  manufacturer?: string
  brand?: string
  registrant?: string
  licenseNo?: string
  registerNo?: string
  measureUnit?: string
  purchaseUnit?: string
  storageCondition?: string
  defaultWarehouse?: string
  udiCode?: string
  auditStatus?: string
  status?: string
  unitPrice?: number
  lastPrice?: number
  retailPrice?: number
  auxUnit?: string
  auxUnitRatio?: number
  stockQty?: number
  safetyStock?: number | string
  saleUnit?: string
  stockUnit?: string
  [key: string]: unknown
}

export function safeDecodeProductCode(value: string): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

let legacyPlatformMigrated = false

/** 将历史 platformProductList 合并进统一商品库（按编码去重） */
function migrateLegacyPlatformProducts(): void {
  if (legacyPlatformMigrated) return
  legacyPlatformMigrated = true

  const legacyRaw = localStorage.getItem(LEGACY_PLATFORM_PRODUCT_LIST_KEY)
  if (!legacyRaw) return

  try {
    const legacyItems = JSON.parse(legacyRaw)
    if (!Array.isArray(legacyItems) || legacyItems.length === 0) {
      localStorage.removeItem(LEGACY_PLATFORM_PRODUCT_LIST_KEY)
      return
    }

    const list = readProductListRaw()
    const codeSet = new Set(list.map(p => p.code).filter(Boolean))

    legacyItems.forEach((item: Record<string, unknown>) => {
      const code = String(item.code || '').trim()
      if (!code || codeSet.has(code)) return

      list.push({
        id: item.id as number | string,
        code,
        name: String(item.name || ''),
        spec: String(item.spec || ''),
        manufacturer: String(item.manufacturer || ''),
        brand: String(item.brand || ''),
        registerNo: String(item.approval || item.registerNo || ''),
        licenseNo: String(item.licenseNo || ''),
        measureUnit: String(item.unit || item.measureUnit || '盒'),
        purchaseUnit: String(item.unit || item.measureUnit || '盒'),
        unitPrice: Number(item.unitPrice) || 0,
        storageCondition: String(item.storageCondition || ''),
        status: item.status === '上架' ? '正常' : String(item.status || '正常'),
        auditStatus: '已审核'
      })
      codeSet.add(code)
    })

    writeProductListRaw(list)
  } catch {
    // ignore invalid legacy data
  } finally {
    localStorage.removeItem(LEGACY_PLATFORM_PRODUCT_LIST_KEY)
  }
}

function readProductListRaw(): ProductMaster[] {
  const stored = localStorage.getItem(PRODUCT_LIST_KEY)
  const userCleared = isProductListUserCleared()

  if (stored && stored !== '[]') {
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return filterOutDeletedProducts(parsed)
      }
    } catch {
      // fall through
    }
  }

  if (stored === '[]' && userCleared) {
    return []
  }

  const backup = localStorage.getItem(PRODUCT_LIST_BACKUP_KEY)
  if (backup && backup !== '[]') {
    try {
      const parsed = JSON.parse(backup)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = filterOutDeletedProducts(parsed)
        if (filtered.length > 0 && stored !== '[]') {
          writeProductListRaw(filtered, { skipBackup: true })
        }
        return filtered
      }
    } catch {
      // ignore invalid backup
    }
  }

  return stored === '[]' ? [] : []
}

/** 删除/缩表后同步备份、快照与平台资料库，避免「恢复备份」把已删商品找回 */
function alignProductRecoveryStorage(list: ProductMaster[]): void {
  const serialized = JSON.stringify(list)
  localStorage.setItem(PRODUCT_LIST_BACKUP_KEY, serialized)
  localStorage.setItem(
    PRODUCT_LIST_SNAPSHOT_KEY,
    JSON.stringify({ savedAt: new Date().toISOString(), count: list.length, items: list })
  )
  void import('@/utils/platformProductStore').then(({ syncPlatformCatalogFromProductList }) => {
    syncPlatformCatalogFromProductList(list)
  })
}

function readProductListStoredCount(): number {
  const stored = localStorage.getItem(PRODUCT_LIST_KEY)
  if (!stored || stored === '[]') return stored === '[]' ? 0 : -1
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed.length : -1
  } catch {
    return -1
  }
}

function writeProductListRaw(
  list: ProductMaster[],
  options?: { skipBackup?: boolean; clearBackup?: boolean }
): void {
  if (options?.clearBackup) {
    localStorage.removeItem(PRODUCT_LIST_BACKUP_KEY)
  } else if (!options?.skipBackup) {
    const current = localStorage.getItem(PRODUCT_LIST_KEY)
    let prevLen = -1
    if (current !== null) {
      if (current === '[]') {
        prevLen = 0
      } else {
        try {
          const parsed = JSON.parse(current)
          if (Array.isArray(parsed)) prevLen = parsed.length
        } catch {
          prevLen = -1
        }
      }
    }
    if (prevLen >= 0 && list.length <= prevLen) {
      const userCleared = isProductListUserCleared()
      if (list.length > 0 || userCleared) {
        alignProductRecoveryStorage(list)
      }
    } else if (list.length > 0 && current && current !== '[]') {
      try {
        const parsed = JSON.parse(current)
        if (Array.isArray(parsed) && parsed.length > 0) {
          localStorage.setItem(PRODUCT_LIST_BACKUP_KEY, current)
        }
      } catch {
        localStorage.setItem(PRODUCT_LIST_BACKUP_KEY, current)
      }
    }
  }
  try {
    localStorage.setItem(PRODUCT_LIST_KEY, JSON.stringify(list))
  } catch (error) {
    console.warn('[productStore] 写入本地商品库失败，可能超出浏览器存储上限', error)
  }
}

/** 统一读取商品名称（兼容历史字段别名） */
export function getProductDisplayName(product: ProductMaster | Record<string, unknown>): string {
  const raw = product as Record<string, unknown>
  return String(raw.name || raw.productName || raw.goodsName || '').trim()
}

/** 商品名称 + 规格型号 + 生产厂家 一致则视为同一商品 */
export function getProductIdentityKey(
  product: Pick<ProductMaster, 'name' | 'spec' | 'manufacturer'> | Record<string, unknown>
): string {
  const name = getProductDisplayName(product).toLowerCase()
  const spec = String(product.spec ?? '').trim().toLowerCase()
  const manufacturer = String(product.manufacturer ?? '').trim().toLowerCase()
  return `${name}\u0001${spec}\u0001${manufacturer}`
}

export function findProductByIdentity(
  list: ProductMaster[],
  product: Pick<ProductMaster, 'name' | 'spec' | 'manufacturer' | 'code'>,
  excludeCode?: string
): ProductMaster | undefined {
  const name = getProductDisplayName(product)
  if (!name) return undefined

  const key = getProductIdentityKey(product)
  const exclude = String(excludeCode ?? product.code ?? '').trim()

  return list.find(item => {
    const code = String(item.code ?? '').trim()
    if (exclude && code === exclude) return false
    return getProductIdentityKey(item) === key
  })
}

export function validateProductIdentityUnique(
  list: ProductMaster[],
  product: Pick<ProductMaster, 'name' | 'spec' | 'manufacturer' | 'code'>,
  options?: { excludeCode?: string }
): { ok: true } | { ok: false; existing: ProductMaster } {
  const existing = findProductByIdentity(list, product, options?.excludeCode)
  if (existing) return { ok: false, existing }
  return { ok: true }
}

export function formatProductIdentityConflictMessage(existing: ProductMaster): string {
  const name = getProductDisplayName(existing)
  const spec = String(existing.spec ?? '').trim() || '—'
  const manufacturer = String(existing.manufacturer ?? '').trim() || '—'
  return `已存在相同商品（名称「${name}」、规格「${spec}」、厂家「${manufacturer}」），商品编码：${existing.code}`
}

/** 规范化商品资料字段，确保开单/列表展示与商品资料一致 */
export function normalizeProductMaster(product: ProductMaster): ProductMaster {
  const code = String(product.code || '').trim()
  const name = getProductDisplayName(product)
  if (code === product.code && name === product.name) return product
  return { ...product, code, name }
}

/** 按商品编码去重（同编码保留最后一条）；仅在有重复编码或无编码时重排 id */
export function dedupeProductListByCode(list: ProductMaster[]): ProductMaster[] {
  const merged = mergeProductListsByCode(list)
  const codeCounts = new Map<string, number>()
  list.forEach(item => {
    const code = String(item.code || '').trim()
    if (code) codeCounts.set(code, (codeCounts.get(code) || 0) + 1)
  })
  const hasDuplicateCodes = [...codeCounts.values()].some(count => count > 1)
  const hasMissingCode = list.some(item => !String(item.code || '').trim())
  const needsIdReset = hasDuplicateCodes || hasMissingCode || merged.length !== list.length

  if (!needsIdReset) {
    return merged.map(normalizeProductMaster)
  }

  let nextId = 0
  return merged.map(item => {
    nextId += 1
    return normalizeProductMaster({ ...item, id: nextId })
  })
}

/** 按商品编码合并多份列表，先出现的记录优先，后者补全字段 */
export function mergeProductListsByCode(...lists: ProductMaster[][]): ProductMaster[] {
  const map = new Map<string, ProductMaster>()

  lists.forEach(list => {
    list.forEach(raw => {
      const code = String(raw.code || '').trim()
      if (!code) return
      const prev = map.get(code)
      map.set(code, normalizeProductMaster({ ...(prev || {}), ...raw, code }))
    })
  })

  return Array.from(map.values())
}

function parseStoredProductList(raw: string | null): ProductMaster[] {
  if (!raw || raw === '[]') return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function snapshotProductListBeforeServerOverwrite(local: ProductMaster[]): void {
  if (local.length === 0) return
  localStorage.setItem(PRODUCT_LIST_BACKUP_KEY, JSON.stringify(local))
  localStorage.setItem(
    PRODUCT_LIST_SNAPSHOT_KEY,
    JSON.stringify({ savedAt: new Date().toISOString(), count: local.length, items: local })
  )
}

export function getProductListBackupInfo(): {
  backupCount: number
  snapshotCount: number
  catalogCount: number
  canRestore: boolean
  bestRecoveryCount: number
} {
  const currentCount = readProductListStoredCount()
  const current = currentCount >= 0 ? parseStoredProductList(localStorage.getItem(PRODUCT_LIST_KEY)) : []
  const backup = parseStoredProductList(localStorage.getItem(PRODUCT_LIST_BACKUP_KEY))
  let snapshotCount = 0
  let snapshotItems: ProductMaster[] = []
  try {
    const snapshotRaw = localStorage.getItem(PRODUCT_LIST_SNAPSHOT_KEY)
    if (snapshotRaw) {
      const snapshot = JSON.parse(snapshotRaw)
      if (Array.isArray(snapshot?.items)) {
        snapshotItems = snapshot.items
        snapshotCount = snapshot.items.length
      }
    }
  } catch {
    snapshotCount = 0
  }
  const catalog = parseStoredProductList(localStorage.getItem('platformCatalogList'))
  const recoveryCandidates = filterOutDeletedProducts(
    mergeProductListsByCode(snapshotItems, backup, catalog)
  )
  const bestRecoveryCount = recoveryCandidates.length
  const restoreCount = Math.max(backup.length, snapshotCount, bestRecoveryCount)
  const minRecoveryThreshold = 20
  const userClearedEmpty = isProductListUserCleared() && currentCount === 0
  const canRestore =
    !userClearedEmpty &&
    restoreCount > current.length &&
    bestRecoveryCount > current.length &&
    bestRecoveryCount >= minRecoveryThreshold
  return {
    backupCount: backup.length,
    snapshotCount,
    catalogCount: catalog.length,
    canRestore,
    bestRecoveryCount
  }
}

/** 合并备份、快照、平台资料库中可恢复的商品（排除用户已删编码） */
export function getProductListRecoveryCandidates(): ProductMaster[] {
  const backup = parseStoredProductList(localStorage.getItem(PRODUCT_LIST_BACKUP_KEY))
  let snapshotItems: ProductMaster[] = []
  try {
    const snapshotRaw = localStorage.getItem(PRODUCT_LIST_SNAPSHOT_KEY)
    if (snapshotRaw) {
      const snapshot = JSON.parse(snapshotRaw)
      if (Array.isArray(snapshot?.items)) snapshotItems = snapshot.items
    }
  } catch {
    snapshotItems = []
  }
  const catalog = parseStoredProductList(localStorage.getItem('platformCatalogList'))
  return filterOutDeletedProducts(mergeProductListsByCode(snapshotItems, backup, catalog))
}

/**
 * 本地商品明显少于备份时自动恢复（登录/刷新/进入列表时调用）
 * @returns 恢复后的条数；0 表示未恢复
 */
export function tryAutoRecoverProductListFromBackup(options?: {
  minBackupCount?: number
  forceIfCurrentBelow?: number
}): number {
  const minBackupCount = options?.minBackupCount ?? 20
  const forceIfCurrentBelow = options?.forceIfCurrentBelow ?? 20
  if (localStorage.getItem(PRODUCT_LIST_KEY) === '[]' && isProductListUserCleared()) return 0

  const current = filterOutDeletedProducts(readProductListRaw())
  const recovery = getProductListRecoveryCandidates()

  if (recovery.length < minBackupCount) return 0
  if (current.length >= recovery.length) return 0
  if (current.length >= forceIfCurrentBelow && current.length >= recovery.length * 0.9) return 0

  const restored = dedupeProductListByCode(mergeProductListsByCode(recovery, current))
  writeProductListRaw(restored)
  localStorage.removeItem(PRODUCT_LIST_USER_CLEARED_KEY)
  void import('@/utils/platformProductStore').then(({ syncPlatformCatalogFromProductList }) => {
    syncPlatformCatalogFromProductList(restored)
  })
  void syncProductListToServer(restored, { replace: true })
  console.warn(
    `[productStore] 自动恢复商品：当前 ${current.length} 条 → 恢复为 ${restored.length} 条`
  )
  return restored.length
}

/** 从本地备份/快照恢复商品列表，并回传服务器 */
export async function restoreProductListFromBackup(): Promise<{
  ok: boolean
  count: number
  message: string
}> {
  const current = readProductListRaw()
  const source = getProductListRecoveryCandidates()
  if (source.length === 0) {
    return { ok: false, count: 0, message: '未找到可恢复的商品备份' }
  }

  const restored = dedupeProductListByCode(mergeProductListsByCode(source, current))
  writeProductListRaw(restored)
  localStorage.removeItem(PRODUCT_LIST_USER_CLEARED_KEY)
  void import('@/utils/platformProductStore').then(({ syncPlatformCatalogFromProductList }) => {
    syncPlatformCatalogFromProductList(restored)
  })
  await syncProductListToServer(restored, { replace: true })

  return {
    ok: true,
    count: restored.length,
    message: `已从备份恢复 ${restored.length} 条商品资料`
  }
}

/** 从生产厂家提取品牌名（只保留地方名+企业名） */
function extractBrandFromManufacturer(manufacturer: string): string {
  if (!manufacturer) return ''
  // 去掉省市区县等行政区划前缀
  let name = manufacturer.replace(/^(北京|天津|河北|山西|内蒙古|辽宁|吉林|黑龙江|上海|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|广西|海南|重庆|四川|贵州|云南|西藏|陕西|甘肃|青海|宁夏|新疆|香港|澳门|台湾)(省|市|区|县)/g, '')
  // 去掉所有公司性质和行业性质的词，只保留企业名
  name = name.replace(/(有限公司|集团有限公司|股份有限公司|集团|有限责任公司|公司|事业有限公司|事业|生物工程|医疗用品|医疗器械|医药|制药|化学|化工|生物科技|科技|技术|电子|智能|贸易|商贸|实业|经贸|材料|制品|产品|制作|包装|印务|物流|运输|食品|饮料|环保|光学|仪器|设备|医用|敷料|粘合剂|高分子|保健|净化|消毒|计生|计生用品)/g, '')
  return name.trim()
}

/** 迁移数据：将生产厂家复制到注册人/备案人，提取品牌名 */
function migrateManufacturerToRegistrantAndBrand(list: ProductMaster[]): { list: ProductMaster[]; migrated: boolean } {
  let migrated = false
  const migratedList = list.map(item => {
    const updated = { ...item }
    // 如果 registrant 为空，用 manufacturer 填充
    if (!updated.registrant && updated.manufacturer) {
      updated.registrant = updated.manufacturer
      migrated = true
    }
    // 如果 brand 为空，提取品牌名
    if (!updated.brand && updated.manufacturer) {
      updated.brand = extractBrandFromManufacturer(updated.manufacturer)
      if (updated.brand) migrated = true
    }
    return updated
  })
  return { list: migratedList, migrated }
}

export function loadProductList(): ProductMaster[] {
  migrateLegacyPlatformProducts()
  let raw = readProductListRaw()
  // 迁移生产厂家到注册人/备案人和品牌
  const { list: migratedRaw, migrated } = migrateManufacturerToRegistrantAndBrand(raw)
  if (migrated) {
    raw = migratedRaw
    writeProductListRaw(raw, { skipBackup: true })
  }
  const list = dedupeProductListByCode(raw)
  if (list.length !== raw.length) {
    writeProductListRaw(list, { skipBackup: true })
  }
  return list
}

/** 将备份/快照/catalog 与当前商品列表对齐（仅在有数据或用户主动清空时） */
export function reconcileProductRecoveryWithCurrentList(): void {
  if (localStorage.getItem(PRODUCT_LIST_KEY) === null) return
  const list = readProductListRaw()
  if (list.length === 0 && !isProductListUserCleared()) return
  alignProductRecoveryStorage(list)
}

export function saveProductList(
  list: ProductMaster[],
  options?: { skipServerSync?: boolean }
): void {
  const normalized = dedupeProductListByCode(list)
  if (normalized.length > 0) {
    markProductListAsActive()
  }
  writeProductListRaw(normalized)
  void import('@/utils/platformProductStore').then(({ syncPlatformCatalogFromProductList }) => {
    syncPlatformCatalogFromProductList(normalized)
  })
  if (!options?.skipServerSync) {
    queueProductServerSync(normalized)
  }
}

let productSyncTimer: ReturnType<typeof setTimeout> | null = null
let productSyncInFlight = false

function hasAuthToken(): boolean {
  return !!getAuthToken()
}

/** 取消待执行的自动同步，避免与带 replace 的手动同步冲突 */
export function cancelProductServerSyncQueue(): void {
  if (productSyncTimer) {
    clearTimeout(productSyncTimer)
    productSyncTimer = null
  }
}

function queueProductServerSync(list: ProductMaster[]): void {
  if (!hasAuthToken()) return
  if (productSyncTimer) clearTimeout(productSyncTimer)
  productSyncTimer = setTimeout(() => {
    void syncProductListToServer(list)
  }, 400)
}

export async function syncProductListToServer(
  list?: ProductMaster[],
  options?: { replace?: boolean; background?: boolean; waitForInFlight?: boolean }
): Promise<boolean> {
  if (!hasAuthToken()) return false

  if (productSyncInFlight && options?.waitForInFlight !== false) {
    for (let i = 0; i < 30; i += 1) {
      if (!productSyncInFlight) break
      await new Promise<void>(resolve => setTimeout(resolve, 200))
    }
  }
  if (productSyncInFlight) return false

  cancelProductServerSyncQueue()
  productSyncInFlight = true
  try {
    const payload = (list ?? readProductListRaw()).map(normalizeProductMaster)
    if (payload.length === 0 && options?.replace === true && !isProductListUserCleared()) {
      console.warn('[productStore] 跳过向服务器同步空列表（非用户主动清空）')
      return false
    }
    await productApi.sync(payload as Record<string, unknown>[], {
      replace: options?.replace === true,
      background: options?.background !== false
    })
    localStorage.setItem(PRODUCT_SERVER_SYNCED_KEY, new Date().toISOString())
    return true
  } catch (error) {
    console.warn('[productStore] 同步商品到服务器失败', error)
    return false
  } finally {
    productSyncInFlight = false
  }
}

/** 进入系统后拉取/合并服务器商品；本地明显更多时回传服务器，避免再次丢失 */
export async function hydrateProductListFromServer(options?: { timeoutMs?: number }): Promise<void> {
  if (!hasAuthToken()) return

  tryAutoRecoverProductListFromBackup()

  const timeoutMs = options?.timeoutMs ?? 15000
  const hydrateTask = (async () => {
    const { isPlatformOperator } = await import('@/utils/customerProductService')
    const remote = filterOutDeletedProducts(
      (isPlatformOperator()
        ? await productApi.getPlatformCatalog({ background: true })
        : await productApi.getAll({ background: true })) as ProductMaster[]
    )
    let local = filterOutDeletedProducts(readProductListRaw())

    if (remote.length === 0) {
      if (local.length > 0) {
        await syncProductListToServer(local, { replace: true })
      }
      return
    }

    if (local.length > 0) {
      snapshotProductListBeforeServerOverwrite(local)
    }

    let best: ProductMaster[]
    if (local.length > 0) {
      best = enrichProductListFromRemote(local, remote)
      const localCodeSet = new Set(local.map(item => String(item.code || '')).filter(Boolean))
      const remoteHasExtra = remote.some(item => !localCodeSet.has(String(item.code || '')))
      if (remoteHasExtra || remote.length > local.length) {
        await syncProductListToServer(best, { replace: true })
      }
    } else if (isProductListUserCleared()) {
      return
    } else {
      const recovery = getProductListRecoveryCandidates()
      const candidates = dedupeProductListByCode(mergeProductListsByCode(remote, recovery))
      if (shouldAutoRecoverMissingProducts(0, candidates.length)) {
        best = candidates
      } else {
        best = []
      }
    }

    writeProductListRaw(dedupeProductListByCode(best))
    if (best.length > 0) {
      markProductListAsActive()
    }
    localStorage.setItem(PRODUCT_SERVER_SYNCED_KEY, new Date().toISOString())

    void import('@/utils/platformProductStore').then(({ syncPlatformCatalogFromProductList }) => {
      syncPlatformCatalogFromProductList(best)
    })

    if (best.length > remote.length) {
      await syncProductListToServer(best, { replace: true })
    }
  })()

  try {
    await Promise.race([
      hydrateTask,
      new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('商品数据同步超时')), timeoutMs)
      })
    ])
  } catch (error) {
    console.warn('[productStore] 从服务器加载商品失败，继续使用本地数据', error)
    tryAutoRecoverProductListFromBackup()
  }
}

/** 加载商品库；用户主动清空后保持空列表，否则在无数据时补演示商品 */
export function loadAndEnsureProductList<T extends ProductMaster>(
  defaults: T[]
): T[] {
  migrateLegacyPlatformProducts()

  if (isProductListUserCleared()) {
    return dedupeProductListByCode(readProductListRaw() as T[])
  }

  tryAutoRecoverProductListFromBackup({ forceIfCurrentBelow: 10 })

  const storedRaw = localStorage.getItem(PRODUCT_LIST_KEY)
  const stored = dedupeProductListByCode(readProductListRaw() as T[])

  if (stored.length > 0) {
    return stored
  }

  if (storedRaw === null) {
    return [...defaults] as T[]
  }

  const recovery = getProductListRecoveryCandidates()
  if (shouldAutoRecoverMissingProducts(stored.length, recovery.length)) {
    const restored = dedupeProductListByCode(recovery) as T[]
    writeProductListRaw(restored as ProductMaster[])
    return restored
  }

  return stored
}

/** 清空全部商品资料（平台商品与数据商品共用）；清空后可重新导入，以商品编码为唯一标识 */
export function clearProductList(): void {
  writeProductListRaw([], { skipBackup: true, clearBackup: true })
  alignProductRecoveryStorage([])
  clearDeletedProductCodes()
  localStorage.removeItem(LEGACY_PLATFORM_PRODUCT_LIST_KEY)
  markProductListAsUserCleared()
  void syncProductListToServer([], { replace: true })
}

/** 清空本地与服务器商品库，等待完成后返回 */
export async function clearProductListFully(): Promise<boolean> {
  clearProductList()
  return syncProductListToServer([], { replace: true })
}

export function isProductAudited(product: ProductMaster): boolean {
  return product.auditStatus === '已审核'
}

export function findProductInList(code: string): ProductMaster | undefined {
  return findProductByCode(code)
}

/** 按商品编码查找（商品编码为唯一标识） */
export function findProductByCode(code: string): ProductMaster | undefined {
  const key = safeDecodeProductCode(code)
  if (!key) return undefined
  const product = loadProductList().find(
    item =>
      String(item.code ?? '').trim() === key ||
      String(item.platformProductCode ?? '').trim() === key
  )
  return product ? normalizeProductMaster(product) : undefined
}

/** 编辑页定位商品：以商品编码为准 */
export function findProductByRecordKey(
  idOrCode: string | number,
  code?: string
): ProductMaster | undefined {
  const codeKey = safeDecodeProductCode(String(code ?? idOrCode ?? ''))
  if (codeKey) {
    const byCode = findProductByCode(codeKey)
    if (byCode) return byCode
  }

  const idStr = String(idOrCode)
  const list = loadProductList()
  const matches = list.filter(item => String(item.id ?? '') === idStr)
  if (matches.length === 1) return normalizeProductMaster(matches[0])
  return undefined
}

export function findProductIndexInList(
  list: ProductMaster[],
  idOrCode: string | number,
  code?: string
): number {
  const codeKey = safeDecodeProductCode(String(code ?? idOrCode ?? ''))
  if (codeKey) {
    const byCode = list.findIndex(item => String(item.code ?? '').trim() === codeKey)
    if (byCode !== -1) return byCode
  }

  const idStr = String(idOrCode)
  return list.findIndex(item => String(item.id ?? '') === idStr)
}

function getMaxProductId(list: ProductMaster[]): number {
  return list.reduce((max, item) => {
    const n = Number(item.id)
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
}

export function allocateProductId(list: ProductMaster[], preferred?: number | string): number {
  const numericPreferred = Number(preferred)
  if (
    Number.isFinite(numericPreferred) &&
    numericPreferred > 0 &&
    !list.some(item => String(item.id) === String(numericPreferred))
  ) {
    return numericPreferred
  }

  let nextId = getMaxProductId(list) + 1
  while (list.some(item => String(item.id) === String(nextId))) {
    nextId += 1
  }
  return nextId
}

export interface UnapprovedProductLine {
  code: string
  name: string
  auditStatus: string
}

/** 采购订单审核前：订单明细商品须已在商品资料中且审核通过 */
export function checkPurchaseOrderProductsAudited(
  detailItems: Array<{ productCode?: string; productName?: string }> | undefined
): { ok: boolean; unapprovedProducts: UnapprovedProductLine[] } {
  const unapprovedProducts: UnapprovedProductLine[] = []
  const seen = new Set<string>()

  ;(detailItems || []).forEach(line => {
    const code = String(line.productCode || '').trim()
    if (!code || seen.has(code)) return
    seen.add(code)

    const product = findProductInList(code)
    if (!product) {
      unapprovedProducts.push({
        code,
        name: String(line.productName || code),
        auditStatus: '未建档'
      })
      return
    }
    if (!isProductAudited(product)) {
      unapprovedProducts.push({
        code: product.code,
        name: product.name,
        auditStatus: product.auditStatus || '待审核'
      })
    }
  })

  return { ok: unapprovedProducts.length === 0, unapprovedProducts }
}

export function formatUnapprovedProductsMessage(
  unapprovedProducts: UnapprovedProductLine[]
): string {
  return unapprovedProducts
    .map(p => `${p.code} ${p.name}（${p.auditStatus}）`)
    .join('；')
}

export function isProductAvailableForPurchase(product: ProductMaster): boolean {
  if (!isProductAudited(product)) return false
  if (product.status && ['停用', '禁用'].includes(String(product.status))) return false
  return Boolean(String(product.code || '').trim() && getProductDisplayName(product))
}

/** 采购开单可选商品：已审核且未停用的商品资料 */
export function getPurchaseableProducts(): ProductMaster[] {
  return loadProductList().filter(isProductAvailableForPurchase)
}

export function getProductUnit(product: ProductMaster): string {
  return product.purchaseUnit || product.measureUnit || ''
}

export function getProductLastPrice(product: ProductMaster): number {
  return Number(product.lastPrice ?? product.unitPrice) || 0
}

export function getProductStockQty(product: ProductMaster): number {
  const direct = product.stockQty ?? product.safetyStock
  if (direct != null && direct !== '') return Number(direct) || 0
  let hash = 0
  for (let i = 0; i < product.code.length; i++) {
    hash = (hash * 31 + product.code.charCodeAt(i)) >>> 0
  }
  return (hash % 450) + 50
}

export function getProductAuxUnit(product: ProductMaster): string {
  return product.auxUnit || product.saleUnit || product.stockUnit || '-'
}

function tokenMatchesProductField(product: ProductMaster, token: string): boolean {
  const t = token.toLowerCase()
  const name = getProductDisplayName(product)
  return (
    (product.code?.toLowerCase().includes(t) ?? false) ||
    (name.toLowerCase().includes(t) ?? false) ||
    (product.spec?.toLowerCase().includes(t) ?? false) ||
    (product.manufacturer?.toLowerCase().includes(t) ?? false)
  )
}

/** 商品编码 + 名称 + 规格型号 + 生产厂家综合查询，空格分隔，顺序不限 */
export function findProductsByCompositeQuery(
  query: string,
  products?: ProductMaster[]
): ProductMaster[] {
  const trimmed = query?.trim()
  if (!trimmed) return []

  const list = products ?? getPurchaseableProducts()
  const tokens = trimmed.split(/\s+/).filter(Boolean)
  if (!tokens.length) return []

  if (tokens.length === 1) {
    const token = tokens[0]
    const lower = token.toLowerCase()
    const exact = list.find(
      p =>
        p.code?.toLowerCase() === lower ||
        p.udiCode?.toLowerCase() === lower ||
        p.name?.toLowerCase() === lower
    )
    if (exact) return [exact]
    return list.filter(p => tokenMatchesProductField(p, token))
  }

  return list.filter(p => tokens.every(token => tokenMatchesProductField(p, token)))
}

export function findProductByCompositeQuery(
  query: string,
  products?: ProductMaster[]
): ProductMaster | undefined {
  const matches = findProductsByCompositeQuery(query, products)
  if (matches.length === 1) return matches[0]
  if (matches.length <= 1) return undefined

  const tokens = query.trim().split(/\s+/).filter(Boolean)
  for (const token of tokens) {
    const lower = token.toLowerCase()
    const byExactCode = matches.filter(p => p.code?.toLowerCase() === lower)
    if (byExactCode.length === 1) return byExactCode[0]
  }
  return undefined
}

export function findProductByQuery(query: string, products?: ProductMaster[]): ProductMaster | undefined {
  const trimmed = query?.trim()
  if (!trimmed) return undefined

  if (trimmed.includes(' ')) {
    return findProductByCompositeQuery(trimmed, products)
  }

  const list = products ?? getPurchaseableProducts()
  const lower = trimmed.toLowerCase()

  return (
    list.find(p => p.code?.toLowerCase() === lower) ||
    list.find(p => p.udiCode?.toLowerCase() === lower) ||
    list.find(p => getProductDisplayName(p).toLowerCase() === lower) ||
    list.find(p => getProductDisplayName(p).toLowerCase().includes(lower)) ||
    findProductByCompositeQuery(trimmed, products)
  )
}

export function applyProductToOrderItem(
  item: Record<string, any>,
  product: ProductMaster,
  defaultWarehouse?: string
): void {
  const master = normalizeProductMaster(product)
  item.productCode = master.code
  item.productName = getProductDisplayName(master)
  item.spec = master.spec || ''
  item.origin = master.origin || ''
  item.manufacturer = master.manufacturer || ''
  item.brand = master.brand || ''
  item.productionLicense = master.licenseNo || ''
  item.registrationNo = master.registerNo || ''
  item.registrant = master.registrant || ''
  item.unit = getProductUnit(master)
  item.auxUnit = master.auxUnit || ''
  item.auxUnitRatio = master.auxUnitRatio || 1
  item.unitPrice = Number(master.unitPrice) || 0
  item.lastPrice = Number(master.lastPrice ?? master.unitPrice) || 0
  item.retailPrice = Number(master.retailPrice) || 0
  item.storageCondition = master.storageCondition || ''
  if (!item.warehouse) {
    item.warehouse = master.defaultWarehouse || defaultWarehouse || SYSTEM_DEFAULT_WAREHOUSE_NAME
  }
}

export function toBatchProductRow(product: ProductMaster) {
  const master = normalizeProductMaster(product)
  return {
    ...master,
    name: getProductDisplayName(master),
    unit: getProductUnit(master),
    productionLicense: master.licenseNo || '',
    registrationNo: master.registerNo || '',
    registrant: master.registrant || '',
    unitPrice: Number(master.unitPrice) || 0,
    lastPrice: Number(master.lastPrice ?? master.unitPrice) || 0,
    retailPrice: Number(master.retailPrice) || 0,
    stockQty: Math.floor(Math.random() * 500) + 50,
    warehouse: master.defaultWarehouse || SYSTEM_DEFAULT_WAREHOUSE_NAME,
  }
}

export function toStockProductRow(product: ProductMaster) {
  return {
    ...toBatchProductRow(product),
    availableQty: Math.floor(Math.random() * 400) + 30,
    warehouse: product.defaultWarehouse || SYSTEM_DEFAULT_WAREHOUSE_NAME,
    location: ['A区-01', 'B区-02', 'C区-03'][Math.floor(Math.random() * 3)],
    batchNo: 'PH' + Math.floor(Math.random() * 9000 + 1000),
    productionDate: '2024-01-15',
    expiryDate: '2026-01-14'
  }
}
