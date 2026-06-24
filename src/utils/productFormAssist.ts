import {
  findProductsByCompositeQuery,
  getProductDisplayName,
  loadProductList,
  saveProductList,
  type ProductMaster
} from '@/utils/productStore'
import { searchPlatformProducts } from '@/utils/platformProductStore'
import {
  importPlatformProductToLocal,
  isNormalCustomerCompany,
  type ProductSource
} from '@/utils/customerProductService'

export type PlatformReviewStatus = '无需审核' | '待平台审核' | '已通过' | '已驳回'

export interface ProductFormSuggestion {
  value: string
  code: string
  name: string
  spec: string
  registrant: string
  manufacturer: string
  registerNo: string
  sourceLabel: string
  product: ProductMaster
}

export interface RegistrantSuggestion {
  value: string
  count: number
  exact: boolean
}

export interface SimilarRegistrantMatch {
  name: string
  normalized: string
  score: number
  productCount: number
}

const RECENT_PLATFORM_PRODUCTS_KEY = 'productRecentPlatformUsage'
const SUGGEST_LIMIT = 15

/** 规范化企业/注册人名称，便于去重比对 */
export function normalizeEntityName(name: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s·•\-—_（）()【】\[\]《》"'“”‘’]/g, '')
    .replace(/(有限责任公司|股份有限公司|有限公司|责任公司|集团公司|集团|公司)$/g, '')
}

function levenshteinRatio(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  const m = a.length
  const n = b.length
  if (m === 0 || n === 0) return 0

  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }

  const distance = dp[m][n]
  return 1 - distance / Math.max(m, n)
}

function productSourceLabel(product: ProductMaster): string {
  if (product.fromPlatform || product.source === 'platformImport') return '平台'
  if (product.source === 'tradeImported') return '交易'
  if (product.source === 'customerEntry') return '客户录入'
  return '本地'
}

function toFormSuggestion(product: ProductMaster, value: string): ProductFormSuggestion {
  return {
    value,
    code: product.code,
    name: getProductDisplayName(product),
    spec: String(product.spec || ''),
    registrant: String(product.registrant || ''),
    manufacturer: String(product.manufacturer || ''),
    registerNo: String(product.registerNo || ''),
    sourceLabel: productSourceLabel(product),
    product
  }
}

function getSearchableProducts(includeAll = true): ProductMaster[] {
  const list = loadProductList()
  if (includeAll) return list
  return list.filter(p => p.auditStatus === '已审核' || !p.auditStatus)
}

/** 商品名称联想：匹配已有商品列表 */
export function searchProductNameSuggestions(
  query: string,
  options?: { excludeCode?: string; limit?: number }
): ProductFormSuggestion[] {
  const q = query.trim()
  if (!q) return []

  const limit = options?.limit ?? SUGGEST_LIMIT
  const excludeCode = options?.excludeCode
  const matches = findProductsByCompositeQuery(q, getSearchableProducts())
    .filter(p => !excludeCode || p.code !== excludeCode)

  const seen = new Set<string>()
  const results: ProductFormSuggestion[] = []

  matches.forEach(product => {
    const name = getProductDisplayName(product)
    const key = name.toLowerCase()
    if (!name || seen.has(key)) return
    seen.add(key)
    results.push(toFormSuggestion(product, name))
  })

  return results.slice(0, limit)
}

/** 规格型号联想：可按已选商品名称收窄 */
export function searchProductSpecSuggestions(
  query: string,
  options?: { productName?: string; excludeCode?: string; limit?: number }
): ProductFormSuggestion[] {
  const q = query.trim()
  const productName = options?.productName?.trim()
  const limit = options?.limit ?? SUGGEST_LIMIT
  const excludeCode = options?.excludeCode

  let pool = getSearchableProducts()
  if (productName) {
    const nameLower = productName.toLowerCase()
    pool = pool.filter(p => getProductDisplayName(p).toLowerCase().includes(nameLower))
  }

  if (!q && productName) {
    const seen = new Set<string>()
    return pool
      .filter(p => {
        const spec = String(p.spec || '').trim()
        if (!spec || seen.has(spec)) return false
        if (excludeCode && p.code === excludeCode) return false
        seen.add(spec)
        return true
      })
      .slice(0, limit)
      .map(p => toFormSuggestion(p, String(p.spec || '')))
  }

  if (!q) return []

  const matches = pool.filter(p => {
    if (excludeCode && p.code === excludeCode) return false
    return String(p.spec || '').toLowerCase().includes(q.toLowerCase())
      || getProductDisplayName(p).toLowerCase().includes(q.toLowerCase())
  })

  const seen = new Set<string>()
  const results: ProductFormSuggestion[] = []
  matches.forEach(product => {
    const spec = String(product.spec || '').trim()
    if (!spec || seen.has(spec)) return
    seen.add(spec)
    results.push(toFormSuggestion(product, spec))
  })

  return results.slice(0, limit)
}

/** 注册人/备案人去重索引 */
export function buildRegistrantIndex(products?: ProductMaster[]): Map<string, { name: string; count: number }> {
  const map = new Map<string, { name: string; count: number }>()
  ;(products ?? loadProductList()).forEach(product => {
    const name = String(product.registrant || '').trim()
    if (!name) return
    const key = normalizeEntityName(name)
    if (!key) return
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
    } else {
      map.set(key, { name, count: 1 })
    }
  })
  return map
}

export function searchRegistrantSuggestions(query: string, limit = 12): RegistrantSuggestion[] {
  const q = query.trim()
  if (!q) return []

  const index = buildRegistrantIndex()
  const normalizedInput = normalizeEntityName(q)
  const lower = q.toLowerCase()
  const results: RegistrantSuggestion[] = []

  index.forEach(({ name, count }, key) => {
    if (name.toLowerCase().includes(lower) || key.includes(normalizedInput) || normalizedInput.includes(key)) {
      results.push({ value: name, count, exact: key === normalizedInput })
    }
  })

  results.sort((a, b) => {
    if (a.exact !== b.exact) return a.exact ? -1 : 1
    return b.count - a.count
  })

  return results.slice(0, limit)
}

/** 注册人名称相似度检测 */
export function findSimilarRegistrants(
  input: string,
  options?: { excludeNormalized?: string; threshold?: number }
): SimilarRegistrantMatch[] {
  const name = input.trim()
  if (!name) return []

  const threshold = options?.threshold ?? 0.82
  const inputNorm = normalizeEntityName(name)
  if (!inputNorm) return []

  const index = buildRegistrantIndex()
  const matches: SimilarRegistrantMatch[] = []

  index.forEach(({ name: existingName, count }, key) => {
    if (options?.excludeNormalized && key === options.excludeNormalized) return
    if (key === inputNorm) return

    let score = 0
    if (existingName === name) {
      score = 1
    } else if (key.includes(inputNorm) || inputNorm.includes(key)) {
      score = Math.max(key.length, inputNorm.length) / Math.min(key.length, inputNorm.length)
      score = Math.min(0.95, score * 0.5 + 0.45)
    } else {
      score = levenshteinRatio(key, inputNorm)
    }

    if (score >= threshold) {
      matches.push({ name: existingName, normalized: key, score, productCount: count })
    }
  })

  return matches.sort((a, b) => b.score - a.score).slice(0, 5)
}

/** 名称+规格完全重复检测 */
export function findDuplicateProductByNameSpec(
  name: string,
  spec: string,
  excludeCode?: string
): ProductMaster | undefined {
  const nameNorm = getProductDisplayName({ name } as ProductMaster).toLowerCase()
  const specNorm = String(spec || '').trim().toLowerCase()
  if (!nameNorm) return undefined

  return loadProductList().find(product => {
    if (excludeCode && product.code === excludeCode) return false
    const sameName = getProductDisplayName(product).toLowerCase() === nameNorm
    const sameSpec = String(product.spec || '').trim().toLowerCase() === specNorm
    return sameName && sameSpec
  })
}

/** 平台商品列表（已审核）供随时调用 */
export function searchPlatformProductsForForm(query: string, limit = 20): ProductMaster[] {
  return searchPlatformProducts(query, limit)
}

export function getPlatformProductPickerOptions(limit = 200): ProductMaster[] {
  const recent = loadRecentPlatformProductCodes()
  const all = searchPlatformProducts('', limit)
  const map = new Map<string, ProductMaster>()
  recent.forEach(code => {
    const item = all.find(p => p.code === code)
    if (item) map.set(code, item)
  })
  all.forEach(item => map.set(item.code, item))
  return Array.from(map.values())
}

function loadRecentPlatformProductCodes(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_PLATFORM_PRODUCTS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

export function recordPlatformProductUsage(code: string): void {
  const key = code.trim()
  if (!key) return
  const recent = loadRecentPlatformProductCodes().filter(item => item !== key)
  recent.unshift(key)
  localStorage.setItem(RECENT_PLATFORM_PRODUCTS_KEY, JSON.stringify(recent.slice(0, 30)))
}

/** 将商品资料写入表单（新增时清空编码） */
export function applyProductMasterToForm(
  formData: Record<string, unknown>,
  product: ProductMaster,
  options?: { keepCode?: boolean; clearCodeOnNew?: boolean }
): void {
  const keepCode = options?.keepCode === true
  const clearCode = options?.clearCodeOnNew !== false

  Object.assign(formData, {
    ...(keepCode ? {} : clearCode ? { code: '' } : {}),
    name: getProductDisplayName(product),
    spec: product.spec || '',
    measureUnit: product.measureUnit || formData.measureUnit,
    manufacturer: product.manufacturer || '',
    registrant: product.registrant || '',
    brand: product.brand || '',
    category: product.category || formData.category,
    type: product.type || formData.type,
    licenseNo: product.licenseNo || '',
    registerNo: product.registerNo || '',
    udiCode: product.udiCode || '',
    barcode: product.barcode || '',
    medType: product.medType || formData.medType,
    storageCondition: product.storageCondition || formData.storageCondition,
    purchaseUnit: product.purchaseUnit || product.measureUnit || formData.purchaseUnit,
    saleUnit: product.saleUnit || product.measureUnit || formData.saleUnit,
    stockUnit: product.stockUnit || product.measureUnit || formData.stockUnit,
    reportUnit: product.reportUnit || product.measureUnit || formData.reportUnit,
    platformProductCode: product.code,
    fromPlatform: true
  })
}

/** 选择平台商品后自动保存到本企业商品库（客户） */
export function autoSavePlatformProductUsage(product: ProductMaster): ProductMaster | null {
  recordPlatformProductUsage(product.code)
  if (isNormalCustomerCompany()) {
    return importPlatformProductToLocal(product)
  }
  return product
}

/** 新建商品保存时的来源与平台审核状态 */
export function resolveNewProductMeta(options: {
  fromPlatform?: boolean
  isPlatformOperator?: boolean
}): { source: ProductSource; platformReviewStatus: PlatformReviewStatus } {
  if (options.fromPlatform) {
    return {
      source: 'platformImport',
      platformReviewStatus: options.isPlatformOperator ? '无需审核' : '无需审核'
    }
  }
  if (options.isPlatformOperator) {
    return { source: 'local', platformReviewStatus: '无需审核' }
  }
  return { source: 'customerEntry', platformReviewStatus: '待平台审核' }
}

export function platformReviewStatusLabel(status?: string): string {
  switch (status) {
    case '待平台审核':
      return '待平台审核'
    case '已通过':
      return '平台已通过'
    case '已驳回':
      return '平台已驳回'
    default:
      return '无需审核'
  }
}
