import type { Company } from '@/utils/dataStore'
import { resolvePartnerQualificationProfile } from '@/constants/partnerCompanyQualification'
import {
  createDefaultPartnerDocuments,
  getPartnerDocFullName
} from '@/utils/partnerLicenseDocuments'
import {
  getPurchaseOrders,
  getSalesOrders,
  getTradingPartners,
  isCustomerCollaborationEnabled,
  isSupplierCollaborationEnabled
} from '@/utils/platformCollaborationService'

export interface TradedProductSummary {
  productCode: string
  productName: string
  partnerName: string
}

export interface QualificationPublicItem {
  docKey: string
  docName: string
  sectionTitle: string
  publicVisible: boolean
  autoEnabled: boolean
  relatedProductNames: string[]
}

/** 有协同交易往来时，随交易自动公示的基础资质 */
const BASE_QUALIFICATION_ON_TRADE = new Set([
  'business_license',
  'bank_account_license',
  'md_business_license',
  'md_class2_business_filing',
  'md_production_license',
  'md_class1_production_filing'
])

/** 有对应产品交易时，随交易自动公示的产品/专业资质 */
const PRODUCT_QUALIFICATION_ON_TRADE = new Set([
  'md_class1_product_filing',
  'md_class2_registration_cert',
  'md_class3_registration_cert',
  'disinfection_health_license',
  'disinfection_safety_report_class1',
  'disinfection_safety_report_class2'
])

const companyTypeToProfile = (companyType?: string) => {
  const map: Record<string, ReturnType<typeof resolvePartnerQualificationProfile>> = {
    manufacturer: 'manufacturer',
    distributor: 'distributor',
    hospital: 'hospital',
    research: 'research',
    platform: 'distributor'
  }
  return resolvePartnerQualificationProfile(map[companyType || ''] || companyType || 'other')
}

export const hasActiveCollaborationPartners = (): boolean => {
  const partners = getTradingPartners()
  if (partners.some(item => item.collaborationEnabled !== false)) return true
  return false
}

const pushTradedItem = (
  bucket: TradedProductSummary[],
  seen: Set<string>,
  partnerName: string,
  item: Record<string, unknown>
) => {
  const productCode = String(item.productCode || '').trim()
  if (!productCode) return
  const key = `${partnerName}::${productCode}`
  if (seen.has(key)) return
  seen.add(key)
  bucket.push({
    productCode,
    productName: String(item.productName || productCode),
    partnerName
  })
}

/** 与已开启协同的客户/供应商之间存在交易的产品 */
export const getTradedProductsWithCollaborationPartners = (): TradedProductSummary[] => {
  const result: TradedProductSummary[] = []
  const seen = new Set<string>()

  getPurchaseOrders().forEach(order => {
    const supplier = String(order.supplier || '').trim()
    if (!supplier || !isSupplierCollaborationEnabled(supplier)) return
    const items = (order.detailItems || order.items || []) as Record<string, unknown>[]
    items.forEach(item => pushTradedItem(result, seen, supplier, item))
  })

  getSalesOrders().forEach(order => {
    const customer = String(order.customer || '').trim()
    if (!customer || !isCustomerCollaborationEnabled(customer)) return
    const items = (order.detailItems || order.items || []) as Record<string, unknown>[]
    items.forEach(item => pushTradedItem(result, seen, customer, item))
  })

  return result
}

export const shouldAutoEnableQualification = (
  docKey: string,
  tradedProducts: TradedProductSummary[]
): boolean => {
  if (!tradedProducts.length) return false
  if (BASE_QUALIFICATION_ON_TRADE.has(docKey)) return true
  if (PRODUCT_QUALIFICATION_ON_TRADE.has(docKey)) return true
  return false
}

export const getCollaborationPartnerNames = (): string[] => {
  return getTradingPartners()
    .filter(item => item.collaborationEnabled !== false)
    .map(item => String(item.name || item.partnerName || '').trim())
    .filter(Boolean)
}

export const getQualificationTradeConflicts = (
  docKey: string,
  tradedProducts?: TradedProductSummary[]
): string[] => {
  const products = tradedProducts ?? getTradedProductsWithCollaborationPartners()
  if (!shouldAutoEnableQualification(docKey, products)) return []
  return [...new Set(products.map(item => item.productName).filter(Boolean))]
}

const resolveQualificationVisible = (
  docKey: string,
  savedMap: Record<string, boolean>,
  tradedProducts: TradedProductSummary[]
): { visible: boolean; autoEnabled: boolean } => {
  const autoEnabled = shouldAutoEnableQualification(docKey, tradedProducts)
  if (savedMap[docKey] === false) {
    return { visible: false, autoEnabled }
  }
  if (savedMap[docKey] === true) {
    return { visible: true, autoEnabled }
  }
  if (autoEnabled) {
    return { visible: true, autoEnabled: true }
  }
  return { visible: false, autoEnabled: false }
}

export const buildQualificationPublicItems = (
  companyType: string | undefined,
  savedMap: Record<string, boolean>,
  tradedProducts?: TradedProductSummary[]
): QualificationPublicItem[] => {
  const products = tradedProducts ?? getTradedProductsWithCollaborationPartners()
  const profile = companyTypeToProfile(companyType)
  const docs = createDefaultPartnerDocuments(profile)
  const unique = new Map<string, QualificationPublicItem>()

  docs.forEach(doc => {
    const docKey = String(doc.docKey || '')
    if (!docKey || unique.has(docKey)) return
    const { visible, autoEnabled } = resolveQualificationVisible(docKey, savedMap, products)
    unique.set(docKey, {
      docKey,
      docName: getPartnerDocFullName(doc),
      sectionTitle: String(doc.sectionTitle || ''),
      publicVisible: visible,
      autoEnabled,
      relatedProductNames: autoEnabled ? getQualificationTradeConflicts(docKey, products) : []
    })
  })

  return Array.from(unique.values())
}

/** 协同客户场景：企业介绍默认公示；资质随交易自动开启 */
export const applyPublicDisplayDefaults = (profile: Company): Company => {
  const tradedProducts = getTradedProductsWithCollaborationPartners()
  const savedMap = { ...(profile.qualificationPublicMap || {}) }
  const items = buildQualificationPublicItems(profile.companyType, savedMap, tradedProducts)

  items.forEach(item => {
    if (item.autoEnabled && savedMap[item.docKey] !== false) {
      savedMap[item.docKey] = true
    }
  })

  return {
    ...profile,
    allowPublicDisplay: profile.allowPublicDisplay ?? true,
    qualificationPublicMap: savedMap
  }
}

export const shouldWarnOnCloseIntro = (): {
  shouldWarn: boolean
  partnerNames: string[]
  tradedProductNames: string[]
} => {
  const partnerNames = getCollaborationPartnerNames()
  const tradedProducts = getTradedProductsWithCollaborationPartners()
  const tradedProductNames = [...new Set(tradedProducts.map(item => item.productName).filter(Boolean))]
  return {
    shouldWarn: partnerNames.length > 0 || tradedProductNames.length > 0,
    partnerNames,
    tradedProductNames
  }
}
