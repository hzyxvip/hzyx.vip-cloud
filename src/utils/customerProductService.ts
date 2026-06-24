/**
 * 普通客户：平台商品引用、交易后写入本企业商品资料
 */

import { loadProductList, saveProductList, type ProductMaster } from '@/utils/productStore'
import {
  findPlatformProductByCode,
  type PlatformProduct
} from '@/utils/platformProductStore'
import { getCurrentCompany } from '@/utils/dataStore'
import { isPlatformCompanyRecord } from '@/constants/platformCompany'
import { getAuthRole, getAuthUser } from '@/utils/authSession'

export type ProductSource = 'local' | 'platformImport' | 'tradeImported' | 'customerEntry'
export type PlatformReviewStatus = '无需审核' | '待平台审核' | '已通过' | '已驳回'

export const isPlatformOperator = (): boolean => {
  const role = getAuthRole()
  if (role === 'admin' || role === 'platform_admin') return true

  const user = getAuthUser<{ companyId?: number; companyCode?: string; companyName?: string }>()
  if (user && isPlatformCompanyRecord(user)) return true

  const companyId = getCurrentCompany()
  return companyId === 1
}

export const isNormalCustomerCompany = (): boolean => !isPlatformOperator()

const mapPlatformToLocal = (
  platform: PlatformProduct,
  options?: { tradePrice?: number; source?: ProductSource; hasTraded?: boolean }
): ProductMaster => ({
  id: Date.now(),
  code: platform.code,
  name: platform.name,
  spec: platform.spec || '',
  manufacturer: platform.manufacturer || '',
  brand: platform.brand || '',
  registrant: platform.registrant || '',
  registerNo: String(platform.registerNo || platform.approval || ''),
  licenseNo: platform.licenseNo || '',
  measureUnit: String(platform.measureUnit || platform.unit || '盒'),
  purchaseUnit: String(platform.purchaseUnit || platform.measureUnit || platform.unit || '盒'),
  unitPrice: options?.tradePrice ?? platform.unitPrice ?? 0,
  lastPrice: options?.tradePrice ?? platform.unitPrice ?? 0,
  storageCondition: platform.storageCondition || '',
  status: '正常',
  auditStatus: '待审核',
  source: options?.source || 'tradeImported',
  platformProductCode: platform.code,
  fromPlatform: true,
  platformReviewStatus: '无需审核',
  hasTraded: options?.hasTraded !== false,
  lastTradeAt: new Date().toISOString().slice(0, 10)
})

const mapSalesLineToLocal = (line: Record<string, unknown>): ProductMaster => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  code: String(line.productCode || ''),
  name: String(line.productName || ''),
  spec: String(line.spec || ''),
  manufacturer: String(line.manufacturer || ''),
  registerNo: String(line.registrationNo || ''),
  measureUnit: String(line.unit || '盒'),
  purchaseUnit: String(line.unit || '盒'),
  unitPrice: Number(line.price) || 0,
  lastPrice: Number(line.price) || 0,
  storageCondition: String(line.storageCondition || ''),
  status: '正常',
  auditStatus: '待审核',
  source: 'tradeImported',
  fromPlatform: Boolean(line._fromPlatform),
  platformProductCode: String(line._platformProductCode || line.productCode || ''),
  hasTraded: true,
  lastTradeAt: new Date().toISOString().slice(0, 10)
})

/** 销售成交后：将明细商品写入/更新本企业商品资料（可被后续开单引用） */
export const syncSalesOrderItemsToLocalProducts = (
  items: Record<string, unknown>[]
): { added: number; updated: number } => {
  if (isPlatformOperator()) return { added: 0, updated: 0 }

  const list = loadProductList()
  let added = 0
  let updated = 0

  items.forEach(line => {
    const code = String(line.productCode || '').trim()
    if (!code) return

    const tradePrice = Number(line.price) || 0
    const platform = findPlatformProductByCode(code)
    const idx = list.findIndex(
      p =>
        p.code === code ||
        p.platformProductCode === code ||
        (platform && p.platformProductCode === platform.code)
    )

    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        name: String(line.productName || list[idx].name),
        spec: String(line.spec || list[idx].spec),
        manufacturer: String(line.manufacturer || list[idx].manufacturer),
        registerNo: String(line.registrationNo || list[idx].registerNo),
        unitPrice: tradePrice || list[idx].unitPrice,
        lastPrice: tradePrice || list[idx].lastPrice,
        hasTraded: true,
        fromPlatform: list[idx].fromPlatform || Boolean(platform || line._fromPlatform),
        platformProductCode: platform?.code || list[idx].platformProductCode || code,
        source: list[idx].source === 'local' ? 'tradeImported' : (list[idx].source || 'tradeImported'),
        lastTradeAt: new Date().toISOString().slice(0, 10)
      }
      updated++
    } else {
      const record = platform
        ? mapPlatformToLocal(platform, { tradePrice, source: 'tradeImported', hasTraded: true })
        : mapSalesLineToLocal(line)
      list.unshift(record)
      added++
    }
  })

  saveProductList(list)
  return { added, updated }
}

/** 引用平台商品后写入本企业商品库（表单选用、随时调用） */
export const importPlatformProductToLocal = (platform: PlatformProduct): ProductMaster => {
  const list = loadProductList()
  const idx = list.findIndex(
    p => p.code === platform.code || p.platformProductCode === platform.code
  )

  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      ...mapPlatformToLocal(platform, { source: 'platformImport', hasTraded: false }),
      id: list[idx].id,
      code: list[idx].code,
      lastUsedAt: new Date().toISOString()
    }
    saveProductList(list)
    return list[idx]
  }

  const record = {
    ...mapPlatformToLocal(platform, { source: 'platformImport', hasTraded: false }),
    lastUsedAt: new Date().toISOString()
  }
  list.unshift(record)
  saveProductList(list)
  return record
}

export const getCustomerProductsPendingPlatformReview = (): ProductMaster[] =>
  loadProductList().filter(
    p => p.source === 'customerEntry' && p.platformReviewStatus === '待平台审核'
  )

/** 平台审核：客户自行录入商品纳入平台资料 */
export const approveCustomerProductAsPlatform = (productId: number | string): boolean => {
  if (!isPlatformOperator()) return false

  const list = loadProductList()
  const idx = list.findIndex(p => String(p.id) === String(productId))
  if (idx < 0) return false

  list[idx] = {
    ...list[idx],
    auditStatus: '已审核',
    platformReviewStatus: '已通过',
    status: list[idx].status || '正常',
    platformApprovedAt: new Date().toISOString()
  }
  saveProductList(list)
  return true
}

export const rejectCustomerProductPlatformReview = (
  productId: number | string,
  reason?: string
): boolean => {
  if (!isPlatformOperator()) return false

  const list = loadProductList()
  const idx = list.findIndex(p => String(p.id) === String(productId))
  if (idx < 0) return false

  list[idx] = {
    ...list[idx],
    platformReviewStatus: '已驳回',
    platformReviewRemark: reason || '',
    platformReviewedAt: new Date().toISOString()
  }
  saveProductList(list)
  return true
}

export const productSourceLabel = (source?: string): string => {
  switch (source) {
    case 'platformImport':
      return '平台引入'
    case 'tradeImported':
      return '交易引入'
    case 'customerEntry':
      return '客户录入'
    default:
      return '本地'
  }
}

export const platformReviewStatusLabel = (status?: string): string => {
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
