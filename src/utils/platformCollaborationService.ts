/**
 * 平台内买卖协同引擎（localStorage 原型实现）
 * 协同开启：双方 trading-partners 均 enable；否则不自动发单、不回写。
 *
 * 双线协同：
 * - 路径 A（采购先发）：买方审采购单 → 自动生成销售单 → 卖方审销售单 → 回写买方「已接单」
 * - 路径 B（销售先发）：卖方审销售单 → 自动推送买方待审采购单 → 买方审采购单核对 → 双方「已接单」
 */

export type ModifyRequestStatus = 'none' | 'pending' | 'approved' | 'rejected'

export interface CollabLink {
  id: string
  platformOrderNo: string
  buyerOrderId: string
  buyerOrderNo: string
  sellerOrderId?: string
  sellerOrderNo?: string
  supplierName: string
  customerName: string
  buyerCompanyName?: string
  buyerCompanyId: number
  sellerCompanyId: number
  /** sent | received | outbound | inbound | completed | cancelled */
  status: string
  modifyRequestStatus: ModifyRequestStatus
  modifyRequestItems: Record<string, unknown>[]
  modifyRequestAt?: string
  buyerManualCompleted: boolean
  pushInboundDisabled: boolean
  outboundIds: string[]
  inboundIds: string[]
  createdAt: string
  updatedAt: string
}

export interface TradingPartner {
  partnerKey: string
  partnerType: 'supplier' | 'customer'
  partnerName: string
  partnerCode?: string
  platformCompanyId: number
  collaborationEnabled: boolean
}

import {
  calcPurchaseOrderAmounts,
  formatDealAmountStr
} from '@/utils/purchaseOrderAmount'
import { generateDocumentNo } from '@/utils/documentNumberSettings'
import { getAuthUser } from '@/utils/authSession'
import {
  resolvePartnerNameByPlatformCode,
  resolvePartnerPlatformCodeByName
} from '@/utils/orderListPartnerCodes'
import { isPlatformPartnerCode } from '@/utils/partnerPlatformCode'
import { syncSalesOrderExecuteStatusFromOutbound } from '@/utils/salesOrderExecution'
import { companies, getCurrentCompany } from '@/utils/dataStore'
import {
  resolveTenantCompanyId,
  resolveTenantCompanyIdFromPlatformSeedId,
  isKnownTenantCompanyId
} from '@/utils/tenantCompanyDirectory'

const KEYS = {
  purchaseOrders: 'purchase-orders',
  salesOrders: 'sales-orders',
  inboundList: 'purchaseInboundList',
  outboundRecords: 'salesOutboundRecords',
  collabLinks: 'inter-company-orders',
  tradingPartners: 'trading-partners'
} as const

export const getCurrentCompanyId = (): number | null => getCurrentCompany()

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const writeJson = (key: string, data: unknown) => {
  localStorage.setItem(key, JSON.stringify(data))
}

export const getPurchaseOrders = (): Record<string, unknown>[] =>
  readJson(KEYS.purchaseOrders, [])

export const savePurchaseOrders = (orders: Record<string, unknown>[]) => {
  writeJson(KEYS.purchaseOrders, orders)
}

export const getSalesOrders = (): Record<string, unknown>[] =>
  readJson(KEYS.salesOrders, [])

export const saveSalesOrders = (orders: Record<string, unknown>[]) => {
  writeJson(KEYS.salesOrders, orders)
}

export const getCollabLinks = (): CollabLink[] => readJson(KEYS.collabLinks, [])

export const saveCollabLinks = (links: CollabLink[]) => {
  writeJson(KEYS.collabLinks, links)
}

export const getTradingPartners = (): TradingPartner[] =>
  readJson(KEYS.tradingPartners, [])

export const upsertTradingPartner = (partner: TradingPartner) => {
  const list = getTradingPartners()
  const idx = list.findIndex(p => p.partnerKey === partner.partnerKey)
  if (idx >= 0) list[idx] = { ...list[idx], ...partner }
  else list.push(partner)
  writeJson(KEYS.tradingPartners, list)
}

/** 默认：未配置时视为开启（便于演示）；显式 false 则关闭 */
export const isSupplierCollaborationEnabled = (supplierName: string): boolean => {
  const partners = getTradingPartners()
  const p = partners.find(
    x => x.partnerType === 'supplier' && x.partnerName === supplierName
  )
  if (!p) return true
  return p.collaborationEnabled !== false
}

export const isCustomerCollaborationEnabled = (customerName: string): boolean => {
  const partners = getTradingPartners()
  const p = partners.find(
    x => x.partnerType === 'customer' && x.partnerName === customerName
  )
  if (!p) return true
  return p.collaborationEnabled !== false
}

export const isCollaborationEnabledForPurchase = (po: Record<string, unknown>): boolean => {
  const supplier = String(po.supplier || '')
  if (!supplier) return false
  if (po.collaborationEnabled === false) return false
  return isSupplierCollaborationEnabled(supplier)
}

export const canDeletePurchaseOrder = (row: Record<string, unknown>): boolean =>
  row.auditStatus === 'notAudited' && row.closeStatus === 'notClosed'

export const canUnAuditPurchaseOrder = (row: Record<string, unknown>): boolean =>
  row.auditStatus === 'audited' &&
  row.receiveStatus !== 'received' &&
  row.warehouseStatus === 'notInWarehoused'

const genPlatformNo = () => `ICO${Date.now()}${Math.floor(Math.random() * 1000)}`

export interface SalesOrderAuditedCollabResult {
  link: CollabLink | null
  poUpdated: boolean
  poPushed?: boolean
  buyerOrderNo?: string
  message?: string
}

export type CollabFlowMode = 'po_first' | 'so_first' | 'disabled' | 'already_linked'

export interface PurchaseOrderAuditedCollabResult {
  link: CollabLink | null
  mode: CollabFlowMode
  message?: string
  sellerOrderNo?: string
}

export const COLLAB_PO_FIRST_HINT =
  '路径A：审核采购单后将自动生成对方销售订单；待对方审核销售单后，本单接单状态变为「已接单」。'

export const COLLAB_SO_FIRST_HINT =
  '路径B：对方已先开/审销售单时，系统将推送待审采购单；请核对「对方销售订单号」后审核，审核即反馈接单。'

const salesOrderKey = (so: Record<string, unknown>): string =>
  String(so.id || so.orderNo || '').trim()

const findPurchaseOrderByKey = (key: string): Record<string, unknown> | undefined => {
  const trimmed = String(key || '').trim()
  if (!trimmed) return undefined
  return getPurchaseOrders().find(
    o => String(o.id || '') === trimmed || String(o.orderNo || '') === trimmed
  )
}

const findCollabLinkForSalesOrder = (so: Record<string, unknown>): CollabLink | undefined => {
  const soKeys = new Set<string>()
  const addKey = (v: unknown) => {
    const s = String(v || '').trim()
    if (s) soKeys.add(s)
  }
  addKey(so.id)
  addKey(so.orderNo)
  addKey(so.sourcePurchaseOrderId)

  const links = getCollabLinks()
  for (const link of links) {
    if (soKeys.has(String(link.sellerOrderId || '')) || soKeys.has(String(link.sellerOrderNo || ''))) {
      return link
    }
  }

  const externalNo = String(so.externalNo || so.sourcePurchaseOrderNo || '').trim()
  if (externalNo) {
    const byBuyer = links.find(l => l.buyerOrderId === externalNo || l.buyerOrderNo === externalNo)
    if (byBuyer) return byBuyer
  }

  const platformNo = String(so.platformOrderNo || '').trim()
  if (platformNo) {
    const byPlatform = links.find(l => l.platformOrderNo === platformNo)
    if (byPlatform) return byPlatform
  }

  return undefined
}

const resolveBuyerPurchaseOrder = (
  so: Record<string, unknown>,
  link?: CollabLink
): Record<string, unknown> | undefined => {
  const candidateKeys = [
    so.sourcePurchaseOrderId,
    so.sourcePurchaseOrderNo,
    link?.buyerOrderId,
    link?.buyerOrderNo,
    so.externalNo
  ]
    .map(v => String(v || '').trim())
    .filter(Boolean)

  for (const key of candidateKeys) {
    const found = findPurchaseOrderByKey(key)
    if (found) return found
  }

  const soKey = salesOrderKey(so)
  if (!soKey) return undefined

  return getPurchaseOrders().find(po => {
    const sellerKeys = [po.sellerOrderId, po.sellerOrderNo].map(v => String(v || '').trim())
    return sellerKeys.includes(soKey)
  })
}

const genCollabSalesOrderNo = (po: Record<string, unknown>): string => {
  const dateText = String(po.date || '')
  const parsed = dateText ? new Date(dateText) : new Date()
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed
  return generateDocumentNo('sales_order', date)
}

const findSalesOrderByKey = (key: string): Record<string, unknown> | undefined => {
  const trimmed = String(key || '').trim()
  if (!trimmed) return undefined
  return getSalesOrders().find(
    o => String(o.id || '') === trimmed || String(o.orderNo || '') === trimmed
  )
}

/** 路径 B：采购单是否已关联对方预先存在的销售单 */
const resolveExistingSellerOrderForPurchase = (
  po: Record<string, unknown>
): Record<string, unknown> | undefined => {
  const candidateKeys = [po.sellerOrderId, po.sellerOrderNo]
    .map(v => String(v || '').trim())
    .filter(Boolean)

  for (const key of candidateKeys) {
    const so = findSalesOrderByKey(key)
    if (so) return so
  }

  return undefined
}

const linkPurchaseOrderToExistingSalesOrder = (
  po: Record<string, unknown>,
  so: Record<string, unknown>
): PurchaseOrderAuditedCollabResult => {
  const buyerCompanyId = getCurrentCompanyId()
  if (!buyerCompanyId) {
    return { link: null, mode: 'so_first', message: '无法识别当前企业，请重新登录' }
  }
  const buyerName = getBuyerCompanyName()
  const buyerOrderNo = String(po.orderNo || po.id || '')
  const soKey = salesOrderKey(so)
  const platformNo = String(po.platformOrderNo || so.platformOrderNo || genPlatformNo())
  const existingLink = findLinkByBuyerOrder(buyerOrderNo) || findCollabLinkForSalesOrder(so)

  const linkedToOtherPo =
    existingLink &&
    existingLink.buyerOrderId &&
    existingLink.buyerOrderId !== buyerOrderNo &&
    existingLink.buyerOrderId !== String(po.id || '')

  if (linkedToOtherPo) {
    return {
      link: existingLink,
      mode: 'so_first',
      sellerOrderNo: soKey,
      message: `销售订单 ${soKey} 已关联其他采购单，无法重复接单`
    }
  }

  const link: CollabLink = {
    id: existingLink?.id || `link-${Date.now()}`,
    platformOrderNo: platformNo,
    buyerOrderId: String(po.id || buyerOrderNo),
    buyerOrderNo,
    sellerOrderId: soKey,
    sellerOrderNo: soKey,
    supplierName: String(po.supplier || existingLink?.supplierName || ''),
    customerName: String(so.customer || buyerName || existingLink?.customerName || ''),
    buyerCompanyName: buyerName,
    buyerCompanyId,
    sellerCompanyId: Number(so.companyId) || buyerCompanyId + 1,
    status: 'received',
    modifyRequestStatus: existingLink?.modifyRequestStatus || 'none',
    modifyRequestItems: existingLink?.modifyRequestItems || [],
    buyerManualCompleted: existingLink?.buyerManualCompleted || false,
    pushInboundDisabled: existingLink?.pushInboundDisabled || false,
    outboundIds: existingLink?.outboundIds || [],
    inboundIds: existingLink?.inboundIds || [],
    createdAt: existingLink?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  upsertLink(link)

  updateSalesOrder(soKey, {
    sourcePurchaseOrderId: po.id,
    sourcePurchaseOrderNo: buyerOrderNo,
    externalNo: buyerOrderNo,
    docSource: String(so.docSource || '平台协同'),
    businessProcess: 'collaborative',
    platformOrderNo: platformNo,
    receiveStatus: 'received'
  })

  updatePurchaseOrder(String(po.id || buyerOrderNo), {
    sendStatus: '已接单',
    receiveStatus: 'received',
    sellerOrderId: soKey,
    sellerOrderNo: soKey,
    platformOrderNo: platformNo,
    collaborationEnabled: true,
    businessProcess: 'collaborative'
  })

  return {
    link,
    mode: 'so_first',
    sellerOrderNo: soKey,
    message: `已核对销售订单 ${soKey}，本单已反馈接单`
  }
}

const genInboundNo = () => `PIN${Date.now()}${Math.floor(Math.random() * 100)}`

/** 计算入库明细行金额 */
export const calcInboundLineAmount = (line: Record<string, unknown>): number => {
  const qty = Number(line.quantity) || 0
  const explicit = Number(line.amount)
  if (Number.isFinite(explicit) && explicit > 0) return explicit
  const price = Number(line.price ?? line.unitPrice ?? 0)
  return Number((qty * price).toFixed(2))
}

/** 计算入库单合计金额 */
export const calcInboundItemsAmount = (items: Record<string, unknown>[]): number =>
  Number(items.reduce((sum, line) => sum + calcInboundLineAmount(line), 0).toFixed(2))

/** 补全入库单金额、种类等展示字段 */
export const enrichInboundRecord = (inbound: Record<string, unknown>): Record<string, unknown> => {
  const items = ((inbound.items || []) as Record<string, unknown>[]).map(line => {
    const qty = Number(line.quantity) || 0
    const price = Number(line.price ?? line.unitPrice ?? 0)
    const amount = calcInboundLineAmount({ ...line, quantity: qty, price, unitPrice: price })
    return { ...line, quantity: qty, price, unitPrice: price, amount }
  })
  const computedAmount = calcInboundItemsAmount(items)
  const existingAmount = Number(inbound.amount)
  const amount = existingAmount > 0 ? existingAmount : computedAmount
  const itemCount =
    inbound.itemCount || (items.length ? `${items.length}种` : '')
  const totalQty =
    inbound.totalQuantity ??
    items.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0)
  const inboundNo = String(inbound.inboundNo || inbound.id || '')
  return {
    ...inbound,
    id: inbound.id ?? inboundNo,
    inboundNo,
    items,
    amount: amount > 0 ? amount.toFixed(2) : inbound.amount,
    itemCount,
    totalQuantity: totalQty
  }
}

/** 回填历史入库单缺失的入库金额；协同单清除「平台协同」占位操作员 */
export const backfillInboundAmounts = (): number => {
  const list = readJson<Record<string, unknown>[]>(KEYS.inboundList, [])
  let changed = 0
  const normalizeAmountText = (value: unknown) => {
    const num = Number(value)
    return Number.isFinite(num) && num > 0 ? num.toFixed(2) : String(value ?? '')
  }
  const next = list.map(row => {
    const enriched = enrichInboundRecord(row)
    let nextRow = { ...enriched }
    let rowChanged = false

    if (String(row.operator || '') === '平台协同') {
      nextRow.operator = ''
      rowChanged = true
    }
    const isCollab =
      row.autoGenerated === true ||
      String(row.source || '').includes('collab') ||
      String(row.docSource || '') === '平台协同'
    if (isCollab && !row.docSource) {
      nextRow.docSource = '平台协同'
      rowChanged = true
    }

    const before = JSON.stringify({
      amount: normalizeAmountText(row.amount),
      itemCount: row.itemCount,
      totalQuantity: row.totalQuantity,
      operator: row.operator,
      docSource: row.docSource
    })
    const after = JSON.stringify({
      amount: normalizeAmountText(enriched.amount),
      itemCount: enriched.itemCount,
      totalQuantity: enriched.totalQuantity,
      operator: nextRow.operator,
      docSource: nextRow.docSource
    })
    if (before !== after || rowChanged) {
      changed += 1
      return nextRow
    }
    return row
  })
  if (changed > 0) writeJson(KEYS.inboundList, next)
  return changed
}

const updatePurchaseOrder = (orderId: string, patch: Record<string, unknown>) => {
  const orders = getPurchaseOrders()
  const key = String(orderId || '').trim()
  const idx = orders.findIndex(
    o => String(o.id || '') === key || String(o.orderNo || '') === key
  )
  if (idx < 0) return null
  orders[idx] = { ...orders[idx], ...patch }
  savePurchaseOrders(orders)
  return orders[idx]
}

const updateSalesOrder = (orderId: string, patch: Record<string, unknown>) => {
  const orders = getSalesOrders()
  const key = String(orderId || '').trim()
  const idx = orders.findIndex(
    o => String(o.id || '') === key || String(o.orderNo || '') === key
  )
  if (idx < 0) return null
  orders[idx] = { ...orders[idx], ...patch }
  saveSalesOrders(orders)
  return orders[idx]
}

const findLinkByBuyerOrder = (buyerOrderId: string) => {
  const key = String(buyerOrderId || '').trim()
  return getCollabLinks().find(
    l => l.buyerOrderId === key || l.buyerOrderNo === key
  )
}

const findLinkBySellerOrder = (sellerOrderId: string) => {
  const key = String(sellerOrderId || '').trim()
  return getCollabLinks().find(
    l => l.sellerOrderId === key || l.sellerOrderNo === key
  )
}

/** 销售订单外部单号 = 采购方采购订单号 */
export const resolveSalesOrderExternalNo = (so: Record<string, unknown>): string => {
  const direct = String(so.externalNo || '').trim()
  if (direct) return direct
  const fromSource = String(so.sourcePurchaseOrderNo || so.sourcePurchaseOrderId || '').trim()
  if (fromSource) return fromSource
  const orderId = String(so.id || so.orderNo || '').trim()
  if (!orderId) return ''
  const link = findLinkBySellerOrder(orderId)
  return String(link?.buyerOrderNo || '').trim()
}

const WRONG_COLLAB_CUSTOMER_NAMES = new Set(['', '平台协同', '医享云演示机构'])

/** 解析销售订单客户名称与医享平台编号（协同单优先按编号反查公司名称） */
export const resolveSalesOrderCustomerFields = (
  so: Record<string, unknown>
): { customer: string; customerPlatformCode: string } => {
  let customer = String(so.customer || '').trim()
  let platformCode = String(so.customerPlatformCode || so.customerCode || '').trim()
  const isCollab =
    String(so.docSource || '') === '平台协同' || !!so.sourcePurchaseOrderId

  if (isCollab) {
    const link = findLinkBySellerOrder(String(so.id || so.orderNo || ''))
    const buyerCompanyName = String(link?.buyerCompanyName || link?.customerName || '').trim()

    if (platformCode && !isPlatformPartnerCode(platformCode)) {
      platformCode = ''
    }

    if (WRONG_COLLAB_CUSTOMER_NAMES.has(customer) && buyerCompanyName) {
      customer = buyerCompanyName
    }

    if (isPlatformPartnerCode(platformCode)) {
      const nameFromCode = resolvePartnerNameByPlatformCode(platformCode)
      if (nameFromCode) customer = nameFromCode
    }

    if (!platformCode && customer) {
      platformCode = resolvePartnerPlatformCodeByName(customer)
    }

    if (WRONG_COLLAB_CUSTOMER_NAMES.has(customer) && isPlatformPartnerCode(platformCode)) {
      const nameFromCode = resolvePartnerNameByPlatformCode(platformCode)
      if (nameFromCode) customer = nameFromCode
    }
  } else if (isPlatformPartnerCode(platformCode)) {
    const nameFromCode = resolvePartnerNameByPlatformCode(platformCode)
    if (nameFromCode) customer = nameFromCode
  }

  return {
    customer,
    customerPlatformCode: isPlatformPartnerCode(platformCode) ? platformCode : ''
  }
}

/** 回填历史协同销售订单的外部单号 */
export const backfillSalesOrderExternalNos = (): number => {
  const orders = getSalesOrders()
  let changed = 0
  const next = orders.map(order => {
    const externalNo = resolveSalesOrderExternalNo(order)
    if (!externalNo || externalNo === String(order.externalNo || '').trim()) return order
    changed += 1
    return { ...order, externalNo }
  })
  if (changed > 0) saveSalesOrders(next)
  return changed
}

/** 回填历史协同销售订单的客户名称与医享平台编号 */
export const backfillCollabSalesOrderCustomers = (): number => {
  const orders = getSalesOrders()
  let changed = 0
  const next = orders.map(order => {
    const resolved = resolveSalesOrderCustomerFields(order)
    const beforeCustomer = String(order.customer || '').trim()
    const beforeCode = String(order.customerPlatformCode || order.customerCode || '').trim()
    const afterCustomer = resolved.customer
    const afterCode = resolved.customerPlatformCode

    if (beforeCustomer === afterCustomer && beforeCode === afterCode) return order
    changed += 1
    return {
      ...order,
      customer: afterCustomer,
      customerCode: afterCode || order.customerCode,
      customerPlatformCode: afterCode
    }
  })
  if (changed > 0) saveSalesOrders(next)

  const links = getCollabLinks()
  let linkChanged = 0
  const nextLinks = links.map(link => {
    if (!link.sellerOrderId) return link
    const order = next.find(item => String(item.id || item.orderNo) === link.sellerOrderId)
    if (!order) return link
    const customerName = String(order.customer || '').trim()
    const buyerCompanyName = String(link.buyerCompanyName || '').trim()
    if (
      link.customerName === customerName &&
      (buyerCompanyName === customerName || (!buyerCompanyName && customerName))
    ) {
      return link
    }
    linkChanged += 1
    return {
      ...link,
      customerName,
      buyerCompanyName: buyerCompanyName || customerName
    }
  })
  if (linkChanged > 0) saveCollabLinks(nextLinks)

  return changed + linkChanged
}

const upsertLink = (link: CollabLink) => {
  const links = getCollabLinks()
  const idx = links.findIndex(l => l.id === link.id)
  if (idx >= 0) links[idx] = link
  else links.unshift(link)
  saveCollabLinks(links)
  return link
}

const mapPoItemsToSo = (items: Record<string, unknown>[]) =>
  items.map(it => ({
    productCode: it.productCode || '',
    productName: it.productName || '',
    spec: it.spec || '',
    unit: it.unit || '',
    quantity: String(it.quantity ?? 1),
    price: String(it.unitPrice ?? 0),
    amount: String(it.amount ?? 0),
    manufacturer: it.manufacturer || '',
    batchNo: it.batchNo || '',
    productionDate: it.productionDate || '',
    expiryDate: it.expiryDate || '',
    registrationNo: it.registrationNo || ''
  }))

const mapSoItemsToPo = (items: Record<string, unknown>[]) =>
  items.map(it => ({
    productCode: it.productCode || '',
    productName: it.productName || '',
    spec: it.spec || '',
    unit: it.unit || '',
    quantity: Number(it.quantity) || 1,
    unitPrice: Number(it.price ?? it.unitPrice ?? 0),
    amount: Number(it.amount ?? 0),
    manufacturer: it.manufacturer || '',
    batchNo: it.batchNo || '',
    productionDate: it.productionDate || '',
    expiryDate: it.expiryDate || '',
    registrationNo: it.registrationNo || ''
  }))

const getSellerCompanyId = (): number => {
  const user = getAuthUser<{ companyId?: number }>()
  const fromAuth = Number(user?.companyId)
  if (Number.isFinite(fromAuth) && fromAuth > 0) return fromAuth
  return getCurrentCompanyId() || getCurrentCompany() || 0
}

const getSellerCompanyName = (): string => {
  const user = getAuthUser<{ companyName?: string }>()
  const fromAuth = String(user?.companyName || '').trim()
  if (fromAuth) return fromAuth
  const sellerId = getSellerCompanyId()
  const company = companies.value.find(c => c.id === sellerId)
  if (company?.name) return String(company.name).trim()
  const cached = String(localStorage.getItem('currentCompanyName') || '').trim()
  return cached || '医享云演示机构'
}

const resolveBuyerCompanyId = (buyerName: string, buyerCode: string): number => {
  const id = resolveTenantCompanyId(buyerName, buyerCode)
  if (id) return id

  const name = buyerName.trim()
  const partner = getTradingPartners().find(
    p => p.partnerType === 'customer' && p.partnerName === name
  )
  if (partner?.platformCompanyId) {
    const mapped = resolveTenantCompanyIdFromPlatformSeedId(partner.platformCompanyId)
    if (mapped) return mapped
    if (isKnownTenantCompanyId(partner.platformCompanyId)) {
      return partner.platformCompanyId
    }
  }
  return 0
}

/** 路径 B：销售单已审且无采购单时，向买方推送待审采购单 */
const pushBuyerPurchaseOrderFromSalesOrder = (
  so: Record<string, unknown>
): { po: Record<string, unknown>; created: boolean } | null => {
  const soKey = salesOrderKey(so)
  if (!soKey) return null

  const existingLink = findCollabLinkForSalesOrder(so)
  const existingPo = resolveBuyerPurchaseOrder(so, existingLink)
  if (existingPo) return { po: existingPo, created: false }

  const { customer, customerPlatformCode } = resolveSalesOrderCustomerFields(so)
  if (!customer || WRONG_COLLAB_CUSTOMER_NAMES.has(customer)) return null
  if (!isCustomerCollaborationEnabled(customer)) return null

  const buyerCompanyId = resolveBuyerCompanyId(customer, customerPlatformCode)
  if (!buyerCompanyId) return null

  const sellerCompanyId = Number(so.companyId) || getSellerCompanyId()
  const sellerName = getSellerCompanyName()
  const detailItems = mapSoItemsToPo((so.detailItems || []) as Record<string, unknown>[])
  const dateText = String(so.date || '')
  const parsedDate = dateText ? new Date(dateText) : new Date()
  const poId = generateDocumentNo(
    'purchase_order',
    Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate
  )
  const platformNo = String(so.platformOrderNo || existingLink?.platformOrderNo || genPlatformNo())

  const po: Record<string, unknown> = {
    id: poId,
    orderNo: poId,
    companyId: buyerCompanyId,
    businessProcess: 'collaborative',
    supplier: sellerName,
    supplierCode: resolvePartnerPlatformCodeByName(sellerName),
    supplierPlatformCode: resolvePartnerPlatformCodeByName(sellerName),
    date: so.date || new Date().toISOString().slice(0, 10),
    amount: so.amount || '',
    itemCount: detailItems.length,
    detailItems,
    auditStatus: 'notAudited',
    executeStatus: 'notExecuted',
    warehouseStatus: 'notInWarehoused',
    closeStatus: 'notClosed',
    receiveStatus: 'notReceived',
    sendStatus: '对方已发单',
    status: 'pending',
    sellerOrderId: soKey,
    sellerOrderNo: soKey,
    platformOrderNo: platformNo,
    docSource: '平台协同',
    collaborationEnabled: true,
    creator: '平台协同',
    createTime: new Date().toTimeString().slice(0, 8)
  }

  const orders = getPurchaseOrders()
  orders.unshift(po)
  savePurchaseOrders(orders)

  const link: CollabLink = {
    id: existingLink?.id || `link-${Date.now()}`,
    platformOrderNo: platformNo,
    buyerOrderId: String(po.id),
    buyerOrderNo: String(po.orderNo || po.id),
    sellerOrderId: soKey,
    sellerOrderNo: soKey,
    supplierName: sellerName,
    customerName: customer,
    buyerCompanyName: customer,
    buyerCompanyId,
    sellerCompanyId,
    status: 'sent',
    modifyRequestStatus: existingLink?.modifyRequestStatus || 'none',
    modifyRequestItems: existingLink?.modifyRequestItems || [],
    buyerManualCompleted: existingLink?.buyerManualCompleted || false,
    pushInboundDisabled: existingLink?.pushInboundDisabled || false,
    outboundIds: existingLink?.outboundIds || [],
    inboundIds: existingLink?.inboundIds || [],
    createdAt: existingLink?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  upsertLink(link)

  updateSalesOrder(soKey, {
    docSource: String(so.docSource || '平台协同'),
    businessProcess: 'collaborative',
    platformOrderNo: platformNo,
    sourcePurchaseOrderId: po.id,
    sourcePurchaseOrderNo: String(po.orderNo || po.id),
    externalNo: String(po.orderNo || po.id)
  })

  return { po, created: true }
}

export const backfillBuyerPurchaseOrdersFromSellerFirstSalesOrders = (options?: {
  offset?: number
  limit?: number
}): number => {
  let count = 0
  const all = getSalesOrders()
  const start = options?.offset ?? 0
  const limit = options?.limit ?? all.length
  for (const so of all.slice(start, start + limit)) {
    if (String(so.auditStatus || '') !== 'audited') continue
    if (resolveBuyerPurchaseOrder(so, findCollabLinkForSalesOrder(so))) continue
    const { customer } = resolveSalesOrderCustomerFields(so)
    if (!isCustomerCollaborationEnabled(customer)) continue
    const result = pushBuyerPurchaseOrderFromSalesOrder(so)
    if (result?.created) count += 1
  }
  return count
}

const COLLAB_BACKFILL_BATCH = 25
const COLLAB_MAINTENANCE_MAX_RETRIES = 3

function yieldToMainThread(): Promise<void> {
  return new Promise(resolve => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => resolve(), { timeout: 800 })
    } else {
      setTimeout(resolve, 0)
    }
  })
}

async function runBuyerPoBackfillBatched(): Promise<number> {
  const all = getSalesOrders()
  let total = 0
  for (let offset = 0; offset < all.length; offset += COLLAB_BACKFILL_BATCH) {
    total += backfillBuyerPurchaseOrdersFromSellerFirstSalesOrders({
      offset,
      limit: COLLAB_BACKFILL_BATCH
    })
    await yieldToMainThread()
  }
  return total
}

let collaborationMaintenanceScheduled = false
let collaborationMaintenanceDone = false

/** 登录后异步执行一次协同/入库数据补全，避免阻塞 UI */
export function scheduleCollaborationMaintenance(): void {
  if (collaborationMaintenanceScheduled) return
  collaborationMaintenanceScheduled = true

  const tasks: Array<() => void | Promise<void>> = [
    () => { backfillSalesOrderExternalNos() },
    () => { backfillCollabSalesOrderCustomers() },
    () => runBuyerPoBackfillBatched(),
    () => { backfillCollabSalesOrderReceiveStatus() },
    () => { backfillInboundAmounts() }
  ]

  let retryCount = 0

  const runQueue = async (index: number): Promise<void> => {
    if (collaborationMaintenanceDone) return
    if (index >= tasks.length) {
      collaborationMaintenanceDone = true
      return
    }
    try {
      await tasks[index]()
      await yieldToMainThread()
      await runQueue(index + 1)
    } catch (error) {
      if (retryCount < COLLAB_MAINTENANCE_MAX_RETRIES) {
        retryCount += 1
        collaborationMaintenanceDone = false
        console.warn(`[collab] maintenance retry ${retryCount}`, error)
        await new Promise(resolve => setTimeout(resolve, 1500 * retryCount))
        await runQueue(index)
      } else {
        console.warn('[collab] maintenance failed', error)
      }
    }
  }

  const kickoff = () => {
    void runQueue(0)
  }

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => kickoff(), { timeout: 3000 })
  } else {
    setTimeout(kickoff, 0)
  }
}

/** 从协同链路或买方采购单回写销售订单「接单状态」 */
export const backfillCollabSalesOrderReceiveStatus = (): number => {
  let count = 0
  for (const so of getSalesOrders()) {
    if (String(so.receiveStatus || '') === 'received') continue

    const link = findCollabLinkForSalesOrder(so)
    const buyerPo = resolveBuyerPurchaseOrder(so, link)
    const buyerAccepted =
      buyerPo?.receiveStatus === 'received' &&
      ['已接单', 'received'].includes(String(buyerPo?.sendStatus || ''))
    const collabReceived = link?.status === 'received' || buyerAccepted

    if (!collabReceived) continue

    const key = salesOrderKey(so)
    if (!key) continue
    updateSalesOrder(key, { receiveStatus: 'received' })
    count += 1
  }
  return count
}

const calcQtyProgress = (
  ordered: number,
  done: number
): 'notExecuted' | 'partiallyExecuted' | 'allExecuted' => {
  if (done <= 0) return 'notExecuted'
  if (done >= ordered) return 'allExecuted'
  return 'partiallyExecuted'
}

const getBuyerCompanyName = (): string => {
  const user = getAuthUser<{ companyName?: string }>()
  const fromAuth = String(user?.companyName || '').trim()
  if (fromAuth) return fromAuth
  const cached = String(localStorage.getItem('currentCompanyName') || '').trim()
  if (cached) return cached
  return '医享云演示机构'
}

const sumOutboundQtyForLink = (link: CollabLink): number => {
  const outboundList = readJson<Record<string, unknown>[]>(KEYS.outboundRecords, [])
  return link.outboundIds.reduce((sum, obNo) => {
    const ob = outboundList.find(r => String(r.outboundNo) === obNo)
    if (!ob) return sum
    const lines = (ob.items || ob.outboundItems || []) as Record<string, unknown>[]
    return sum + lines.reduce((ls, l) => ls + (Number(l.quantity) || 0), 0)
  }, 0)
}

const calcWarehouseInProgress = (
  ordered: number,
  inQty: number
): 'notInWarehoused' | 'partiallyInWarehoused' | 'allInWarehoused' => {
  if (inQty <= 0) return 'notInWarehoused'
  if (inQty >= ordered) return 'allInWarehoused'
  return 'partiallyInWarehoused'
}

/** 采购订单审核通过 → 协同发单（路径 A）或核对接单（路径 B） */
export const onPurchaseOrderAudited = (
  po: Record<string, unknown>
): PurchaseOrderAuditedCollabResult => {
  const buyerOrderKey = String(po.id || po.orderNo || '').trim()

  if (!isCollaborationEnabledForPurchase(po)) {
    if (buyerOrderKey) {
      updatePurchaseOrder(buyerOrderKey, {
        sendStatus: '未发单',
        collaborationEnabled: false
      })
    }
    return { link: null, mode: 'disabled' }
  }

  const existing =
    findLinkByBuyerOrder(buyerOrderKey) ||
    findLinkByBuyerOrder(String(po.orderNo || ''))

  if (existing?.sellerOrderId && (existing.status === 'received' || po.receiveStatus === 'received')) {
    return {
      link: existing,
      mode: 'already_linked',
      sellerOrderNo: existing.sellerOrderNo || existing.sellerOrderId,
      message: '本单已协同接单'
    }
  }

  if (existing?.sellerOrderId && existing.status === 'sent') {
    return {
      link: existing,
      mode: 'already_linked',
      sellerOrderNo: existing.sellerOrderNo || existing.sellerOrderId,
      message: `已发单，销售订单 ${existing.sellerOrderNo || existing.sellerOrderId}`
    }
  }

  const sellerOrderNoInput = String(po.sellerOrderNo || po.sellerOrderId || '').trim()
  if (sellerOrderNoInput) {
    const existingSo = resolveExistingSellerOrderForPurchase(po)
    if (existingSo) {
      return linkPurchaseOrderToExistingSalesOrder(po, existingSo)
    }
    return {
      link: null,
      mode: 'so_first',
      sellerOrderNo: sellerOrderNoInput,
      message: `未找到销售订单 ${sellerOrderNoInput}，请核对单号后重试`
    }
  }

  const buyerCompanyId = getCurrentCompanyId()
  if (!buyerCompanyId) {
    return {
      link: null,
      mode: 'po_first',
      message: '无法识别当前企业，请重新登录'
    }
  }
  const sellerCompanyId = buyerCompanyId + 1
  const soId = genCollabSalesOrderNo(po)
  const detailItems = (po.detailItems || po.items || []) as Record<string, unknown>[]
  const amountResult = calcPurchaseOrderAmounts({
    lines: detailItems,
    discountRate: po.discountRate,
    discountAmount: po.discountAmount,
    purchaseExpenses: po.purchaseExpenses as { amount?: number | string }[]
  })
  const amount = formatDealAmountStr(amountResult.dealAmount)

  const buyerName = getBuyerCompanyName()
  const buyerOrderNo = String(po.orderNo || po.id || '')
  const buyerPlatformCode = resolvePartnerPlatformCodeByName(buyerName)
  const salesOrder = {
    id: soId,
    orderNo: soId,
    companyId: sellerCompanyId,
    businessProcess: 'collaborative',
    customer: buyerName,
    customerCode: buyerPlatformCode,
    customerPlatformCode: buyerPlatformCode,
    date: po.date || new Date().toISOString().slice(0, 10),
    amount,
    itemCount: detailItems.length,
    items: `${detailItems.length}种`,
    detailItems: mapPoItemsToSo(detailItems),
    auditStatus: 'notAudited',
    executeStatus: 'notExecuted',
    closeStatus: 'notClosed',
    receiveStatus: 'notReceived',
    status: 'pending',
    sourcePurchaseOrderId: po.id,
    sourcePurchaseOrderNo: buyerOrderNo,
    externalNo: buyerOrderNo,
    docSource: '平台协同',
    platformOrderNo: existing?.platformOrderNo || genPlatformNo(),
    modifyRequestStatus: 'none',
    creator: '平台协同',
    createTime: new Date().toTimeString().slice(0, 8)
  }

  const salesOrders = getSalesOrders()
  salesOrders.unshift(salesOrder)
  saveSalesOrders(salesOrders)

  const link: CollabLink = {
    id: existing?.id || `link-${Date.now()}`,
    platformOrderNo: String(salesOrder.platformOrderNo),
    buyerOrderId: String(po.id || buyerOrderNo),
    buyerOrderNo,
    sellerOrderId: soId,
    sellerOrderNo: soId,
    supplierName: String(po.supplier || ''),
    customerName: buyerName,
    buyerCompanyName: buyerName,
    buyerCompanyId,
    sellerCompanyId,
    status: 'sent',
    modifyRequestStatus: 'none',
    modifyRequestItems: [],
    buyerManualCompleted: false,
    pushInboundDisabled: false,
    outboundIds: [],
    inboundIds: [],
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  upsertLink(link)

  updatePurchaseOrder(buyerOrderKey, {
    sendStatus: '已发单',
    platformOrderNo: link.platformOrderNo,
    sellerOrderId: soId,
    sellerOrderNo: soId,
    collaborationEnabled: true,
    businessProcess: 'collaborative'
  })

  return {
    link,
    mode: 'po_first',
    sellerOrderNo: soId,
    message: `已自动生成销售订单 ${soId}，待对方审核后接单`
  }
}

/** 销售订单审核 → 路径 A 回写买方已接单；路径 B 推送买方待审采购单 */
export const onSalesOrderAudited = (so: Record<string, unknown>): SalesOrderAuditedCollabResult => {
  const link = findCollabLinkForSalesOrder(so)
  let buyerPo = resolveBuyerPurchaseOrder(so, link)
  const { customer } = resolveSalesOrderCustomerFields(so)

  const isCollabOrder =
    String(so.docSource || '') === '平台协同' ||
    String(so.businessProcess || '') === 'collaborative' ||
    Boolean(so.sourcePurchaseOrderId || so.sourcePurchaseOrderNo || so.externalNo || link)

  if (!buyerPo && isCustomerCollaborationEnabled(customer)) {
    const pushed = pushBuyerPurchaseOrderFromSalesOrder(so)
    if (pushed) {
      buyerPo = pushed.po
      if (pushed.created) {
        const buyerOrderNo = String(buyerPo.orderNo || buyerPo.id || '')
        return {
          link: findCollabLinkForSalesOrder(so) ?? link ?? null,
          poUpdated: false,
          poPushed: true,
          buyerOrderNo
        }
      }
    }
  }

  const sourcePoId = String(buyerPo?.id || buyerPo?.orderNo || link?.buyerOrderId || '').trim()

  if (!sourcePoId) {
    return {
      link: link ?? null,
      poUpdated: false,
      message:
        isCollabOrder || isCustomerCollaborationEnabled(customer)
          ? '未找到买方采购订单且无法推送，请核对客户名称/医享平台编号与协同开关'
          : undefined
    }
  }

  if (buyerPo?.auditStatus !== 'audited') {
    return {
      link: link ?? null,
      poUpdated: false,
      buyerOrderNo: String(buyerPo?.orderNo || buyerPo?.id || sourcePoId),
      message: `采购订单 ${buyerPo?.orderNo || buyerPo?.id || sourcePoId} 待买方审核核对后接单`
    }
  }

  if (
    buyerPo?.receiveStatus === 'received' &&
    String(buyerPo?.sendStatus || '') === '已接单'
  ) {
    updateSalesOrder(salesOrderKey(so), { receiveStatus: 'received' })
    return {
      link: link ?? null,
      poUpdated: true,
      buyerOrderNo: String(buyerPo?.orderNo || buyerPo?.id || sourcePoId)
    }
  }

  if (!link && !isCustomerCollaborationEnabled(String(so.customer || ''))) {
    return {
      link: null,
      poUpdated: false,
      buyerOrderNo: String(buyerPo?.orderNo || buyerPo?.id || sourcePoId),
      message: '客户协同未开启，买方接单状态未更新'
    }
  }

  const updated = updatePurchaseOrder(sourcePoId, {
    receiveStatus: 'received',
    sendStatus: '已接单',
    sellerOrderId: salesOrderKey(so) || buyerPo?.sellerOrderId,
    sellerOrderNo: salesOrderKey(so) || buyerPo?.sellerOrderNo
  })

  if (!updated) {
    return {
      link: link ?? null,
      poUpdated: false,
      buyerOrderNo: String(buyerPo?.orderNo || buyerPo?.id || sourcePoId),
      message: `采购订单 ${sourcePoId} 不在当前环境，无法回写接单状态（请买方企业登录后刷新）`
    }
  }

  let nextLink = link
  if (nextLink) {
    nextLink = {
      ...nextLink,
      sellerOrderId: salesOrderKey(so) || nextLink.sellerOrderId,
      sellerOrderNo: salesOrderKey(so) || nextLink.sellerOrderNo,
      status: 'received',
      updatedAt: new Date().toISOString()
    }
    upsertLink(nextLink)
  } else if (isCollabOrder) {
    nextLink = {
      id: `link-${Date.now()}`,
      platformOrderNo: String(so.platformOrderNo || genPlatformNo()),
      buyerOrderId: sourcePoId,
      buyerOrderNo: String(updated.orderNo || updated.id || sourcePoId),
      sellerOrderId: salesOrderKey(so),
      sellerOrderNo: salesOrderKey(so),
      supplierName: String(updated.supplier || ''),
      customerName: String(so.customer || updated.supplier || ''),
      buyerCompanyName: String(updated.companyName || so.customer || ''),
      buyerCompanyId: Number(updated.companyId) || Number(buyerPo?.companyId) || getCurrentCompanyId() || 0,
      sellerCompanyId: Number(so.companyId) || getSellerCompanyId(),
      status: 'received',
      modifyRequestStatus: 'none',
      modifyRequestItems: [],
      buyerManualCompleted: false,
      pushInboundDisabled: false,
      outboundIds: [],
      inboundIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    upsertLink(nextLink)
  }

  updateSalesOrder(salesOrderKey(so), { receiveStatus: 'received' })

  return {
    link: nextLink ?? null,
    poUpdated: true,
    buyerOrderNo: String(updated.orderNo || updated.id || sourcePoId)
  }
}

/** 一张销售出库单 → 一张采购入库单；分次出库（货不齐）时再分别转单 */
export const onSalesOutboundAudited = (
  outbound: Record<string, unknown>
): { inbounds: Record<string, unknown>[]; skipped: boolean } => {
  syncSalesOrderExecuteStatusFromOutbound(outbound)

  const outboundNo = String(outbound.outboundNo || '')
  const salesOrderNo = String(outbound.salesOrderNo || '')
  const link = getCollabLinks().find(
    l =>
      l.sellerOrderId === salesOrderNo ||
      l.outboundIds.includes(outboundNo)
  )

  if (link?.pushInboundDisabled || link?.buyerManualCompleted) {
    return { inbounds: [], skipped: true }
  }

  const collabOn =
    !salesOrderNo ||
    isCustomerCollaborationEnabled(String(outbound.customer || ''))

  if (!collabOn && salesOrderNo) {
    return { inbounds: [], skipped: true }
  }

  const rawItems = (outbound.items || outbound.outboundItems || []) as Record<string, unknown>[]
  const items = rawItems
    .map(line => {
      const qty = Number(line.quantity) || 0
      const price = Number(line.price ?? line.unitPrice ?? 0)
      const amount = calcInboundLineAmount({ ...line, quantity: qty, price, unitPrice: price })
      return { ...line, quantity: qty, price, unitPrice: price, amount }
    })
    .filter(line => line.quantity > 0)
  if (!items.length) return { inbounds: [], skipped: false }

  const inboundList = readJson<Record<string, unknown>[]>(KEYS.inboundList, [])

  if (outboundNo) {
    const existing = inboundList.find(
      ib =>
        String(ib.outboundNo || '') === outboundNo &&
        (ib.autoGenerated === true || String(ib.source || '').includes('outbound'))
    )
    if (existing) {
      return { inbounds: [], skipped: true }
    }
  }

  const totalQuantity = items.reduce((sum, line) => sum + line.quantity, 0)
  const amount = calcInboundItemsAmount(items)
  const inboundNo = genInboundNo()
  const deliveryStatus = String(outbound.deliveryStatus || '未发货')
  const outboundLogisticsStatus = String(outbound.logisticsStatus || '')
  const logisticsStatus =
    outboundLogisticsStatus ||
    (deliveryStatus === '已发货'
      ? outbound.signStatus === '已签收' || outbound.signPerson
        ? 'signed'
        : 'inTransit'
      : 'noLogistics')

  const inbound = enrichInboundRecord({
    id: Date.now(),
    inboundNo,
    orderNo: link?.buyerOrderNo || salesOrderNo || '',
    purchaseOrderId: link?.buyerOrderId || '',
    salesOrderNo,
    outboundNo,
    platformOrderNo: link?.platformOrderNo || outbound.platformOrderNo || '',
    supplier: outbound.customer || link?.supplierName || '',
    supplierCode: outbound.customerCode || '',
    warehouse: outbound.warehouse || '公司库',
    date: new Date().toISOString().slice(0, 10),
    operator: '',
    docSource: '平台协同',
    items,
    totalQuantity,
    amount: amount.toFixed(2),
    itemCount: `${items.length}种`,
    status: 'pending',
    auditStatus: 'notAudited',
    autoGenerated: true,
    source: link ? 'collab-outbound' : 'direct-outbound',
    createTime: new Date().toLocaleString('zh-CN'),
    logisticsCompany: outbound.logisticsCompany || '',
    logisticsNo: outbound.logisticsNo || '',
    deliveryStatus,
    deliveryDate: outbound.deliveryDate || '',
    logisticsStatus,
    signStatus: '未签收',
    signPerson: '',
    signDate: ''
  })
  inboundList.unshift(inbound)
  writeJson(KEYS.inboundList, inboundList)

  if (link) {
    link.inboundIds.push(inboundNo)
    link.status = 'outbound'
    if (outboundNo && !link.outboundIds.includes(outboundNo)) {
      link.outboundIds.push(outboundNo)
    }
    link.updatedAt = new Date().toISOString()
    upsertLink(link)
  }

  if (link?.buyerOrderId) {
    const po = getPurchaseOrders().find(o => o.id === link.buyerOrderId)
    if (po) {
      const orderedQty = ((po.detailItems || []) as Record<string, unknown>[]).reduce(
        (s, r) => s + (Number(r.quantity) || 0),
        0
      )
      const doneQty = sumOutboundQtyForLink(link)
      updatePurchaseOrder(link.buyerOrderId, {
        executeStatus: calcQtyProgress(orderedQty, doneQty),
        warehouseStatus: po.warehouseStatus || 'notInWarehoused'
      })
    }
  }

  return { inbounds: [inbound], skipped: false }
}

const findOutboundIndexForInbound = (
  outboundList: Record<string, unknown>[],
  inbound: Record<string, unknown>,
  link?: CollabLink | null
) => {
  const outboundNo = String(inbound.outboundNo || '')
  return outboundList.findIndex(
    r =>
      String(r.outboundNo || r.id) === outboundNo ||
      (link && link.outboundIds.includes(String(r.outboundNo || r.id)))
  )
}

/** 买方签收/入库 → 回写卖方出库单物流签收与对方入库状态 */
export const writeBackSellerOutboundFromBuyerInbound = (
  inbound: Record<string, unknown>,
  options: {
    markCounterpartyInStock?: boolean
    signPerson?: string
    signDate?: string
  } = {}
) => {
  const inboundNo = String(inbound.inboundNo || '')
  const link = getCollabLinks().find(
    l => l.inboundIds.includes(inboundNo) || l.buyerOrderId === inbound.purchaseOrderId
  )

  const outboundList = readJson<Record<string, unknown>[]>(KEYS.outboundRecords, [])
  const obIdx = findOutboundIndexForInbound(outboundList, inbound, link)
  if (obIdx < 0) return

  const signPerson =
    options.signPerson ||
    String(inbound.signPerson || '') ||
    String(outboundList[obIdx].signPerson || '')
  const signDate =
    options.signDate ||
    String(inbound.signDate || '') ||
    new Date().toISOString().slice(0, 10)
  const shouldMarkSigned =
    Boolean(signPerson) ||
    inbound.signStatus === '已签收' ||
    options.markCounterpartyInStock

  const patch: Record<string, unknown> = {}
  if (shouldMarkSigned) {
    patch.signStatus = '已签收'
    patch.logisticsStatus = 'signed'
    patch.signPerson = signPerson
    patch.signDate = signDate
  }
  if (options.markCounterpartyInStock) {
    patch.counterpartyInboundStatus = 'inStock'
    patch.counterpartyInboundStatusLabel = '对方已入库'
    patch.counterpartyInboundAt = new Date().toISOString()
  }

  outboundList[obIdx] = { ...outboundList[obIdx], ...patch }
  writeJson(KEYS.outboundRecords, outboundList)
}

/** 买方物流签收 → 回写卖方出库单为「客户已签收」 */
export const onPurchaseInboundSigned = (inbound: Record<string, unknown>) => {
  writeBackSellerOutboundFromBuyerInbound(inbound, {
    signPerson: String(inbound.signPerson || ''),
    signDate: String(inbound.signDate || '')
  })
}

/** 采购入库确认/审核 → 回写卖方「对方已入库」及签收状态 */
export const onPurchaseInboundAudited = (inbound: Record<string, unknown>) => {
  const inboundNo = String(inbound.inboundNo || '')
  const link = getCollabLinks().find(
    l => l.inboundIds.includes(inboundNo) || l.buyerOrderId === inbound.purchaseOrderId
  )

  writeBackSellerOutboundFromBuyerInbound(inbound, {
    markCounterpartyInStock: true,
    signPerson: String(inbound.signPerson || ''),
    signDate: String(inbound.signDate || '')
  })

  if (link) {
    link.status = 'inbound'
    link.updatedAt = new Date().toISOString()
    upsertLink(link)

    const po = getPurchaseOrders().find(o => o.id === link.buyerOrderId)
    if (po) {
      const items = (po.detailItems || []) as Record<string, unknown>[]
      const orderedQty = items.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
      const inbounds = readJson<Record<string, unknown>[]>(KEYS.inboundList, []).filter(
        ib =>
          link.inboundIds.includes(String(ib.inboundNo)) &&
          (ib.status === 'completed' || ib.status === 'pending')
      )
      const inQty = inbounds.reduce((s, ib) => {
        const lines = (ib.items || []) as Record<string, unknown>[]
        return s + lines.reduce((ls, l) => ls + (Number(l.quantity) || 0), 0)
      }, 0)
      updatePurchaseOrder(link.buyerOrderId, {
        warehouseStatus: calcWarehouseInProgress(orderedQty, inQty),
        executeStatus: calcQtyProgress(orderedQty, inQty)
      })
    }
  }
}

/** 删除入库单（拒收）→ 不回写卖方 */
export const onPurchaseInboundDeleted = (inbound: Record<string, unknown>) => {
  const inboundNo = String(inbound.inboundNo || '')
  const links = getCollabLinks()
  const link = links.find(l => l.inboundIds.includes(inboundNo))
  if (!link) return
  link.inboundIds = link.inboundIds.filter(id => id !== inboundNo)
  link.updatedAt = new Date().toISOString()
  upsertLink(link)
}

/** 买方手工完成采购订单 → 禁止再推入库单 */
export const onPurchaseOrderManualCompleted = (poId: string) => {
  const link = findLinkByBuyerOrder(poId)
  if (!link) return
  link.buyerManualCompleted = true
  link.pushInboundDisabled = true
  link.status = 'completed'
  link.updatedAt = new Date().toISOString()
  upsertLink(link)
  updatePurchaseOrder(poId, {
    executeStatus: 'allExecuted',
    warehouseStatus: 'allInWarehoused'
  })
}

/** 申请修改：追加负数对冲行 */
export const submitModificationRequest = (
  poId: string,
  offsetLines: Record<string, unknown>[]
): CollabLink | null => {
  const link = findLinkByBuyerOrder(poId)
  if (!link) return null
  link.modifyRequestStatus = 'pending'
  link.modifyRequestItems = offsetLines
  link.modifyRequestAt = new Date().toISOString()
  link.updatedAt = new Date().toISOString()
  upsertLink(link)
  updatePurchaseOrder(poId, { modifyRequestStatus: 'pending' })
  if (link.sellerOrderId) {
    updateSalesOrder(link.sellerOrderId, { modifyRequestStatus: 'pending' })
  }
  return link
}

/** 卖方同意修改申请 → 合并计算实际数量 */
export const approveModificationRequest = (sellerOrderId: string): CollabLink | null => {
  const link = findLinkBySellerOrder(sellerOrderId)
  if (!link || link.modifyRequestStatus !== 'pending') return null

  const po = getPurchaseOrders().find(o => o.id === link.buyerOrderId)
  if (!po) return null

  const baseItems = [...((po.detailItems || []) as Record<string, unknown>[])]
  const offsets = link.modifyRequestItems || []
  const merged = [...baseItems, ...offsets]

  const effectiveMap = new Map<string, number>()
  merged.forEach(row => {
    const key = String(row.productCode || row.productName)
    const q = Number(row.quantity) || 0
    effectiveMap.set(key, (effectiveMap.get(key) || 0) + q)
  })

  const effectiveItems = baseItems
    .map(row => {
      const key = String(row.productCode || row.productName)
      const eff = Math.max(0, effectiveMap.get(key) ?? (Number(row.quantity) || 0))
      effectiveMap.delete(key)
      return { ...row, quantity: eff, _effectiveQty: eff }
    })
    .filter(row => Number(row.quantity) > 0)

  updatePurchaseOrder(link.buyerOrderId, {
    detailItems: effectiveItems,
    modifyRequestStatus: 'approved',
    modifyRequestItems: offsets
  })

  if (link.sellerOrderId) {
    updateSalesOrder(link.sellerOrderId, {
      detailItems: mapPoItemsToSo(effectiveItems),
      modifyRequestStatus: 'approved'
    })
  }

  link.modifyRequestStatus = 'approved'
  link.modifyRequestItems = []
  link.updatedAt = new Date().toISOString()
  upsertLink(link)
  return link
}

export const hasPendingModification = (sellerOrderId: string): boolean => {
  const link = findLinkBySellerOrder(sellerOrderId)
  return link?.modifyRequestStatus === 'pending'
}
