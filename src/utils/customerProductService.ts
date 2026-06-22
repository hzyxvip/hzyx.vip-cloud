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

export type ProductSource = 'local' | 'platformImport' | 'tradeImported'

export const isPlatformOperator = (): boolean => {
  const role = localStorage.getItem('userRole') || ''
  if (role === 'admin' || role === 'platform_admin') return true

  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (isPlatformCompanyRecord(user)) return true
  } catch {
    // ignore malformed user cache
  }

  const companyId = getCurrentCompany()
  return companyId === 1
}

export const isNormalCustomerCompany = (): boolean => !isPlatformOperator()

const mapPlatformToLocal = (platform: PlatformProduct, tradePrice?: number): ProductMaster => ({
  id: Date.now(),
  code: platform.code,
  name: platform.name,
  spec: platform.spec || '',
  manufacturer: platform.manufacturer || '',
  brand: platform.brand || '',
  registerNo: String(platform.registerNo || platform.approval || ''),
  licenseNo: platform.licenseNo || '',
  measureUnit: String(platform.measureUnit || platform.unit || '盒'),
  purchaseUnit: String(platform.purchaseUnit || platform.measureUnit || platform.unit || '盒'),
  unitPrice: tradePrice ?? platform.unitPrice ?? 0,
  lastPrice: tradePrice ?? platform.unitPrice ?? 0,
  taxRate: platform.taxRate ?? 13,
  storageCondition: platform.storageCondition || '',
  status: '正常',
  auditStatus: '待审核',
  source: 'tradeImported',
  platformProductCode: platform.code,
  fromPlatform: true,
  hasTraded: true,
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
  taxRate: 13,
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
        ? mapPlatformToLocal(platform, tradePrice)
        : mapSalesLineToLocal(line)
      list.unshift(record)
      added++
    }
  })

  saveProductList(list)
  return { added, updated }
}

export const productSourceLabel = (source?: string): string => {
  switch (source) {
    case 'platformImport':
      return '平台引入'
    case 'tradeImported':
      return '交易引入'
    default:
      return '本地'
  }
}
