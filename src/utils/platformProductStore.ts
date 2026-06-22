/** 平台商品与资料管理商品共用 productList 统一数据源 */

import {
  loadProductList,
  saveProductList,
  PRODUCT_LIST_KEY,
  type ProductMaster
} from '@/utils/productStore'

export const PLATFORM_PRODUCT_LIST_KEY = PRODUCT_LIST_KEY

export type PlatformProduct = ProductMaster

export const loadPlatformProducts = (): PlatformProduct[] => loadProductList()

export const savePlatformProducts = (list: PlatformProduct[]) => {
  saveProductList(list)
}

const isAvailableForSales = (p: ProductMaster): boolean => {
  if (!p.code || !p.name) return false
  if (p.auditStatus && p.auditStatus !== '已审核') return false
  return !['下架', '禁用', '停用'].includes(String(p.status || ''))
}

/** 销售开单可选商品 */
export const getPlatformProductsForSales = (): PlatformProduct[] =>
  loadPlatformProducts().filter(isAvailableForSales)

export const findPlatformProductByCode = (code: string): PlatformProduct | undefined => {
  const key = code.trim().toLowerCase()
  return getPlatformProductsForSales().find(p => p.code.toLowerCase() === key)
}

export const searchPlatformProducts = (query: string, limit = 20): PlatformProduct[] => {
  const q = query.trim().toLowerCase()
  if (!q) return getPlatformProductsForSales().slice(0, limit)
  return getPlatformProductsForSales()
    .filter(
      p =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.spec || '').toLowerCase().includes(q) ||
        (p.manufacturer || '').toLowerCase().includes(q)
    )
    .slice(0, limit)
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
