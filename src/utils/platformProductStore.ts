/** 平台商品资料库（供入驻企业引用，与本地 productList 分离） */

import { productApi } from '@/utils/api'
import { isPlatformOperator } from '@/utils/customerProductService'
import { fieldContainsKeyword } from '@/utils/pinyinSearch'
import { getAuthToken } from '@/utils/authSession'
import {
  dedupeProductListByCode,
  enrichProductListFromRemote,
  filterOutDeletedProducts,
  getProductListRecoveryCandidates,
  isProductListUserCleared,
  loadProductList,
  mergeProductListsByCode,
  saveProductList,
  shouldAutoRecoverMissingProducts,
  tryAutoRecoverProductListFromBackup,
  type ProductMaster
} from '@/utils/productStore'

export const PLATFORM_CATALOG_LIST_KEY = 'platformCatalogList'
export const PLATFORM_PRODUCT_LIST_KEY = 'productList'

export type PlatformProduct = ProductMaster

/** 从生产厂家提取品牌名（只保留地方名+企业名） */
function extractBrandFromManufacturer(manufacturer: string): string {
  if (!manufacturer) return ''
  // 去掉省市区县等行政区划前缀
  let name = manufacturer.replace(/^(北京|天津|河北|山西|内蒙古|辽宁|吉林|黑龙江|上海|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|广西|海南|重庆|四川|贵州|云南|西藏|陕西|甘肃|青海|宁夏|新疆|香港|澳门|台湾)(省|市|区|县)/g, '')
  // 去掉所有公司性质和行业性质的词，只保留企业名
  name = name.replace(/(有限公司|集团有限公司|股份有限公司|集团|有限责任公司|公司|事业有限公司|事业|生物工程|医疗用品|医疗器械|医药|制药|化学|化工|生物科技|科技|技术|电子|智能|贸易|商贸|实业|经贸|材料|制品|产品|制作|包装|印务|物流|运输|食品|饮料|环保|光学|仪器|设备|医用|敷料|粘合剂|高分子|保健|净化|消毒|计生|计生用品)/g, '')
  return name.trim()
}

/** 迁移平台默认值：将生产厂家复制到注册人/备案人，提取品牌名 */
function migratePlatformDefaults<T extends ProductMaster>(defaults: T[]): T[] {
  return defaults.map(item => {
    const updated = { ...item }
    // 如果 registrant 为空，用 manufacturer 填充
    if (!updated.registrant && updated.manufacturer) {
      updated.registrant = updated.manufacturer
    }
    // 如果 brand 为空，提取品牌名
    if (!updated.brand && updated.manufacturer) {
      updated.brand = extractBrandFromManufacturer(updated.manufacturer)
    }
    return updated
  })
}

const DEFAULT_PLATFORM_CATALOG: PlatformProduct[] = [
  {
    code: 'PD001',
    name: '一次性医用口罩',
    spec: '10只/包',
    manufacturer: '北京医疗科技有限公司',
    registrant: '北京医疗科技有限公司',
    brand: '北京医疗',
    measureUnit: '包',
    registerNo: '京械注准20200001',
    status: '正常',
    auditStatus: '已审核'
  },
  {
    code: 'PD002',
    name: '医用防护服',
    spec: 'M/L/XL',
    manufacturer: '上海医疗器械有限公司',
    registrant: '上海医疗器械有限公司',
    brand: '上海医疗器械',
    measureUnit: '套',
    registerNo: '沪械注准20200002',
    status: '正常',
    auditStatus: '已审核'
  },
  {
    code: 'PD003',
    name: '医用手套',
    spec: '100只/盒',
    manufacturer: '广州医疗用品有限公司',
    registrant: '广州医疗用品有限公司',
    brand: '广州医疗用品',
    measureUnit: '盒',
    registerNo: '粤械注准20200003',
    status: '正常',
    auditStatus: '已审核'
  }
]

export const loadPlatformProducts = (): PlatformProduct[] => loadPlatformCatalogFromLocal()

export const savePlatformProducts = (list: PlatformProduct[]) => {
  syncPlatformCatalogFromProductList(list)
}

const isCatalogAvailable = (p: ProductMaster): boolean => {
  if (!p.code || !p.name) return false
  if (p.auditStatus && p.auditStatus !== '已审核') return false
  return !['下架', '禁用', '停用'].includes(String(p.status || ''))
}

function readCatalogRaw(): PlatformProduct[] {
  try {
    const raw = localStorage.getItem(PLATFORM_CATALOG_LIST_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCatalogRaw(list: PlatformProduct[]) {
  localStorage.setItem(PLATFORM_CATALOG_LIST_KEY, JSON.stringify(list))
}

/** 平台管理员保存商品时，同步已审核商品到平台资料库缓存 */
export function syncPlatformCatalogFromProductList(list: ProductMaster[]) {
  if (!isPlatformOperator()) return
  const catalog = list.filter(isCatalogAvailable)
  writeCatalogRaw(catalog.length ? catalog : list.filter(p => p.code && p.name))
}

export function loadPlatformCatalogFromLocal(): PlatformProduct[] {
  const stored = readCatalogRaw().filter(isCatalogAvailable)
  if (stored.length) return stored
  const fromProductList = loadProductList().filter(isCatalogAvailable)
  if (fromProductList.length) {
    writeCatalogRaw(fromProductList)
    return fromProductList
  }
  if (localStorage.getItem('productList') !== null) {
    return []
  }
  // 应用数据迁移：将生产厂家填充到注册人/备案人和品牌
  const migratedDefaults = migratePlatformDefaults(DEFAULT_PLATFORM_CATALOG)
  writeCatalogRaw(migratedDefaults)
  return [...migratedDefaults]
}

/** 平台商品资料页：本地优先，空列表时从服务器/备份恢复（排除用户已删编码） */
export function loadPlatformAdminProductList<T extends ProductMaster>(defaults: T[]): T[] {
  tryAutoRecoverProductListFromBackup({ forceIfCurrentBelow: 10 })

  if (isProductListUserCleared()) {
    return dedupeProductListByCode(loadProductList()) as T[]
  }

  const local = dedupeProductListByCode(loadProductList()) as T[]
  if (local.length > 0) {
    syncPlatformCatalogFromProductList(local)
    return local
  }

  if (localStorage.getItem(PRODUCT_LIST_KEY) !== null) {
    return local
  }

  const recovery = filterOutDeletedProducts(getProductListRecoveryCandidates())
  if (shouldAutoRecoverMissingProducts(0, recovery.length)) {
    const restored = dedupeProductListByCode(recovery) as T[]
    saveProductList(restored)
    return restored
  }

  if (localStorage.getItem(PRODUCT_LIST_KEY) === null) {
    // 应用数据迁移：将生产厂家填充到注册人/备案人和品牌
    const migratedDefaults = migratePlatformDefaults(defaults)
    return [...migratedDefaults] as T[]
  }

  return local
}

/** 平台商品资料页：拉取服务器并与本地/备份合并；已删编码不会自动带回 */
export async function hydratePlatformAdminProductList(defaults: ProductMaster[]): Promise<ProductMaster[]> {
  tryAutoRecoverProductListFromBackup({ forceIfCurrentBelow: 10 })

  const userCleared = isProductListUserCleared()
  const local = dedupeProductListByCode(filterOutDeletedProducts(loadProductList()))

  let remote: ProductMaster[] = []
  if (getAuthToken()) {
    try {
      remote = filterOutDeletedProducts((await productApi.getPlatformCatalog()) as ProductMaster[])
    } catch (error) {
      console.warn('[platformProductStore] 拉取平台商品库失败', error)
    }
  }

  if (userCleared && local.length === 0) {
    syncPlatformCatalogFromProductList([])
    if (getAuthToken()) {
      await import('@/utils/productStore').then(({ syncProductListToServer }) =>
        syncProductListToServer([], { replace: true })
      )
    }
    return []
  }

  const recovery = filterOutDeletedProducts(getProductListRecoveryCandidates())
  let best: ProductMaster[]

  if (local.length > 0) {
    best = enrichProductListFromRemote(local, remote)
  } else {
    const candidates = dedupeProductListByCode(mergeProductListsByCode(remote, recovery))
    if (shouldAutoRecoverMissingProducts(0, candidates.length)) {
      best = candidates
    } else if (localStorage.getItem(PRODUCT_LIST_KEY) === null) {
      best = filterOutDeletedProducts(defaults)
    } else {
      best = []
    }
  }

  if (best.length > 0) {
    saveProductList(best)
    syncPlatformCatalogFromProductList(best)
    if (getAuthToken()) {
      const localCodeSet = new Set(local.map(item => String(item.code || '')).filter(Boolean))
      const remoteHasExtra = remote.some(item => !localCodeSet.has(String(item.code || '')))
      const shouldPush =
        local.length === 0 ||
        best.length > remote.length ||
        remoteHasExtra
      if (shouldPush) {
        await import('@/utils/productStore').then(({ syncProductListToServer }) =>
          syncProductListToServer(best, { replace: true })
        )
      }
    }
    return best
  }

  syncPlatformCatalogFromProductList([])
  return loadPlatformAdminProductList(defaults)
}

/** 从服务器拉取平台公司商品资料库 */
export async function hydratePlatformCatalogFromServer(): Promise<PlatformProduct[]> {
  if (!getAuthToken()) {
    return loadPlatformCatalogFromLocal()
  }

  try {
    const remote = await productApi.getPlatformCatalog()
    const list = (Array.isArray(remote) ? remote : []).filter(isCatalogAvailable)
    if (list.length) {
      writeCatalogRaw(list)
      return list
    }
  } catch (error) {
    console.warn('[platformProductStore] 拉取平台商品库失败，使用本地缓存', error)
  }

  return loadPlatformCatalogFromLocal()
}

export type PlatformCatalogSearchForm = {
  codeName: string
  spec: string
  registrant: string
  manufacturer: string
}

export function filterPlatformCatalogProducts(
  products: PlatformProduct[],
  search: PlatformCatalogSearchForm
): PlatformProduct[] {
  return products.filter(item => {
    const codeName = search.codeName.trim()
    if (
      codeName
      && !fieldContainsKeyword(item.code, codeName)
      && !fieldContainsKeyword(item.name, codeName)
    ) {
      return false
    }
    if (search.spec.trim() && !fieldContainsKeyword(item.spec, search.spec)) return false
    if (search.registrant.trim() && !fieldContainsKeyword(item.registrant, search.registrant)) {
      return false
    }
    if (search.manufacturer.trim() && !fieldContainsKeyword(item.manufacturer, search.manufacturer)) {
      return false
    }
    return true
  })
}

/** 销售开单可选商品（兼容旧接口） */
export const getPlatformProductsForSales = (): PlatformProduct[] =>
  loadPlatformCatalogFromLocal().filter(isCatalogAvailable)

export const findPlatformProductByCode = (code: string): PlatformProduct | undefined => {
  const key = code.trim().toLowerCase()
  return loadPlatformCatalogFromLocal().find(p => p.code.toLowerCase() === key)
}

export const searchPlatformProducts = (query: string, limit = 20): PlatformProduct[] => {
  const q = query.trim()
  if (!q) return loadPlatformCatalogFromLocal().slice(0, limit)
  return filterPlatformCatalogProducts(loadPlatformCatalogFromLocal(), {
    codeName: q,
    spec: q,
    registrant: q,
    manufacturer: q
  }).slice(0, limit)
}

export const applyPlatformProductToSalesItem = (
  item: Record<string, unknown>,
  product: PlatformProduct
) => {
  item.productCode = product.code
  item.productName = product.name
  item.spec = product.spec || ''
  item.unit = product.measureUnit || product.purchaseUnit || '盒'
  item.price = String(product.unitPrice ?? 0)
  item.manufacturer = product.manufacturer || ''
  item.registrationNo = product.registerNo || ''
  item.productionLicenseNo = product.licenseNo || ''
  item.storageCondition = product.storageCondition || ''
  item._fromPlatform = true
  item._platformProductCode = product.code
  if (item.quantity && item.price) {
    item.amount = (Number(item.quantity) * Number(item.price)).toFixed(2)
  }
}
