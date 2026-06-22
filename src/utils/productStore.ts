export const PRODUCT_LIST_KEY = 'productList'
const PRODUCT_LIST_BACKUP_KEY = 'productList_backup'
const LEGACY_PLATFORM_PRODUCT_LIST_KEY = 'platformProductList'

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
  taxRate?: number | string
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
        taxRate: Number(item.taxRate) || 13,
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
  if (!stored || stored === '[]') {
    const backup = localStorage.getItem(PRODUCT_LIST_BACKUP_KEY)
    if (backup && backup !== '[]') {
      try {
        const parsed = JSON.parse(backup)
        if (Array.isArray(parsed) && parsed.length > 0) {
          writeProductListRaw(parsed, { skipBackup: true })
          return parsed
        }
      } catch {
        // ignore invalid backup
      }
    }
    return []
  }
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeProductListRaw(
  list: ProductMaster[],
  options?: { skipBackup?: boolean; clearBackup?: boolean }
): void {
  if (options?.clearBackup) {
    localStorage.removeItem(PRODUCT_LIST_BACKUP_KEY)
  } else if (!options?.skipBackup && list.length > 0) {
    const current = localStorage.getItem(PRODUCT_LIST_KEY)
    if (current && current !== '[]') {
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
  localStorage.setItem(PRODUCT_LIST_KEY, JSON.stringify(list))
}

/** 统一读取商品名称（兼容历史字段别名） */
export function getProductDisplayName(product: ProductMaster | Record<string, unknown>): string {
  const raw = product as Record<string, unknown>
  return String(raw.name || raw.productName || raw.goodsName || '').trim()
}

/** 规范化商品资料字段，确保开单/列表展示与商品资料一致 */
export function normalizeProductMaster(product: ProductMaster): ProductMaster {
  const code = String(product.code || '').trim()
  const name = getProductDisplayName(product)
  if (code === product.code && name === product.name) return product
  return { ...product, code, name }
}

export function loadProductList(): ProductMaster[] {
  migrateLegacyPlatformProducts()
  return readProductListRaw().map(normalizeProductMaster)
}

export function saveProductList(list: ProductMaster[]): void {
  writeProductListRaw(list)
}

/** 加载商品库并与默认演示数据合并，缺失时自动补全并写回 */
export function loadAndEnsureProductList<T extends ProductMaster>(
  defaults: T[]
): T[] {
  migrateLegacyPlatformProducts()
  const stored = readProductListRaw() as T[]
  const codeSet = new Set(stored.map(item => String(item.code ?? '')).filter(Boolean))
  const missing = defaults.filter(item => item.code && !codeSet.has(String(item.code)))
  const merged = missing.length ? [...stored, ...missing] : [...stored]

  if (stored.length === 0 && merged.length > 0) {
    writeProductListRaw(merged as ProductMaster[])
  } else if (missing.length > 0) {
    writeProductListRaw(merged as ProductMaster[])
  }

  return merged.length > 0 ? merged : ([...defaults] as T[])
}

/** 清空全部商品资料（平台商品与数据商品共用） */
export function clearProductList(): void {
  writeProductListRaw([], { skipBackup: true, clearBackup: true })
  localStorage.removeItem(LEGACY_PLATFORM_PRODUCT_LIST_KEY)
}

export function isProductAudited(product: ProductMaster): boolean {
  return product.auditStatus === '已审核'
}

export function findProductInList(code: string): ProductMaster | undefined {
  const key = code.trim()
  if (!key) return undefined
  const product = loadProductList().find(
    p => p.code === key || p.platformProductCode === key
  )
  return product ? normalizeProductMaster(product) : undefined
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
  item.taxRate = Number(master.taxRate) || 13
  item.retailPrice = Number(master.retailPrice) || 0
  item.storageCondition = master.storageCondition || ''
  if (!item.warehouse) {
    item.warehouse = master.defaultWarehouse || defaultWarehouse || '公司库'
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
    taxRate: Number(master.taxRate) || 13,
    retailPrice: Number(master.retailPrice) || 0,
    stockQty: Math.floor(Math.random() * 500) + 50,
    warehouse: master.defaultWarehouse || '主仓库'
  }
}

export function toStockProductRow(product: ProductMaster) {
  return {
    ...toBatchProductRow(product),
    availableQty: Math.floor(Math.random() * 400) + 30,
    warehouse: product.defaultWarehouse || ['主仓库', '分仓库', '冷链仓库'][Math.floor(Math.random() * 3)],
    location: ['A区-01', 'B区-02', 'C区-03'][Math.floor(Math.random() * 3)],
    batchNo: 'PH' + Math.floor(Math.random() * 9000 + 1000),
    productionDate: '2024-01-15',
    expiryDate: '2026-01-14'
  }
}
