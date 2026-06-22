/**
 * 平台内买卖协同引擎（localStorage 原型实现）
 * 协同开启：双方 trading-partners 均 enable；否则不自动发单、不回写。
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

const KEYS = {
  purchaseOrders: 'purchase-orders',
  salesOrders: 'sales-orders',
  inboundList: 'purchaseInboundList',
  outboundRecords: 'salesOutboundRecords',
  collabLinks: 'inter-company-orders',
  tradingPartners: 'trading-partners'
} as const

export const getCurrentCompanyId = (): number => {
  const v = localStorage.getItem('currentCompanyId')
  return v ? Number(v) || 1 : 1
}

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

const genSalesOrderNo = () => {
  const d = new Date()
  const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `SO-${ds}-${Math.floor(Math.random() * 900 + 100)}`
}

const genInboundNo = () => `PIN${Date.now()}${Math.floor(Math.random() * 100)}`

const updatePurchaseOrder = (orderId: string, patch: Record<string, unknown>) => {
  const orders = getPurchaseOrders()
  const idx = orders.findIndex(o => o.id === orderId)
  if (idx < 0) return null
  orders[idx] = { ...orders[idx], ...patch }
  savePurchaseOrders(orders)
  return orders[idx]
}

const updateSalesOrder = (orderId: string, patch: Record<string, unknown>) => {
  const orders = getSalesOrders()
  const idx = orders.findIndex(o => o.id === orderId)
  if (idx < 0) return null
  orders[idx] = { ...orders[idx], ...patch }
  saveSalesOrders(orders)
  return orders[idx]
}

const findLinkByBuyerOrder = (buyerOrderId: string) =>
  getCollabLinks().find(l => l.buyerOrderId === buyerOrderId)

const findLinkBySellerOrder = (sellerOrderId: string) =>
  getCollabLinks().find(l => l.sellerOrderId === sellerOrderId)

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

const calcQtyProgress = (
  ordered: number,
  done: number
): 'notExecuted' | 'partiallyExecuted' | 'allExecuted' => {
  if (done <= 0) return 'notExecuted'
  if (done >= ordered) return 'allExecuted'
  return 'partiallyExecuted'
}

const getBuyerCompanyName = (): string =>
  localStorage.getItem('currentCompanyName') || '医享云演示机构'

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

/** 采购订单审核通过 → 协同发单 */
export const onPurchaseOrderAudited = (po: Record<string, unknown>): CollabLink | null => {
  if (!isCollaborationEnabledForPurchase(po)) {
    updatePurchaseOrder(String(po.id), {
      sendStatus: '未发单',
      collaborationEnabled: false
    })
    return null
  }

  const buyerCompanyId = getCurrentCompanyId()
  const sellerCompanyId = buyerCompanyId + 1
  const existing = findLinkByBuyerOrder(String(po.id))
  if (existing?.sellerOrderId) return existing

  const soId = genSalesOrderNo()
  const detailItems = (po.detailItems || po.items || []) as Record<string, unknown>[]
  const amountResult = calcPurchaseOrderAmounts({
    lines: detailItems,
    discountRate: po.discountRate,
    discountAmount: po.discountAmount,
    purchaseExpenses: po.purchaseExpenses as { amount?: number | string }[],
    unitPriceIncludesTax: po.unitPriceIncludesTax === true
  })
  const amount = formatDealAmountStr(amountResult.dealAmount)

  const buyerName = getBuyerCompanyName()
  const salesOrder = {
    id: soId,
    orderNo: soId,
    customer: buyerName,
    customerCode: po.supplierCode || '',
    date: po.date || new Date().toISOString().slice(0, 10),
    amount,
    itemCount: detailItems.length,
    items: `${detailItems.length}种`,
    detailItems: mapPoItemsToSo(detailItems),
    auditStatus: 'notAudited',
    executeStatus: 'notExecuted',
    warehouseStatus: 'notOutWarehoused',
    closeStatus: 'notClosed',
    receiveStatus: 'notReceived',
    status: 'pending',
    sourcePurchaseOrderId: po.id,
    sourcePurchaseOrderNo: po.orderNo || po.id,
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
    buyerOrderId: String(po.id),
    buyerOrderNo: String(po.orderNo || po.id),
    sellerOrderId: soId,
    sellerOrderNo: soId,
    supplierName: String(po.supplier || ''),
    customerName: String(salesOrder.customer),
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

  updatePurchaseOrder(String(po.id), {
    sendStatus: '已发单',
    platformOrderNo: link.platformOrderNo,
    sellerOrderId: soId,
    sellerOrderNo: soId,
    collaborationEnabled: true
  })

  return link
}

/** 销售订单审核 → 买方已接单 */
export const onSalesOrderAudited = (so: Record<string, unknown>): CollabLink | null => {
  const link =
    findLinkBySellerOrder(String(so.id)) ||
    getCollabLinks().find(l => l.sellerOrderId === so.sourcePurchaseOrderId)

  const sourcePoId = so.sourcePurchaseOrderId || link?.buyerOrderId
  if (!sourcePoId) return null

  if (!isCustomerCollaborationEnabled(String(so.customer || '')) && !link) return null

  updatePurchaseOrder(String(sourcePoId), {
    receiveStatus: 'received',
    sendStatus: '已接单'
  })

  if (link) {
    link.status = 'received'
    link.updatedAt = new Date().toISOString()
    upsertLink(link)
  }

  updateSalesOrder(String(so.id), { receiveStatus: 'received' })
  return link ?? null
}

/** 按出库明细行生成多张采购入库单 */
export const onSalesOutboundAudited = (
  outbound: Record<string, unknown>
): { inbounds: Record<string, unknown>[]; skipped: boolean } => {
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

  const items = (outbound.items || outbound.outboundItems || []) as Record<string, unknown>[]
  if (!items.length) return { inbounds: [], skipped: false }

  const inboundList = readJson<Record<string, unknown>[]>(KEYS.inboundList, [])
  const created: Record<string, unknown>[] = []

  items.forEach((line, index) => {
    const qty = Number(line.quantity) || 0
    if (qty <= 0) return

    const inboundNo = genInboundNo()
    const inbound = {
      id: Date.now() + index,
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
      operator: '平台协同',
      items: [{ ...line, quantity: qty }],
      totalQuantity: qty,
      status: 'pending',
      auditStatus: 'notAudited',
      autoGenerated: true,
      source: link ? 'collab-outbound' : 'direct-outbound',
      createTime: new Date().toLocaleString('zh-CN')
    }
    inboundList.unshift(inbound)
    created.push(inbound)
    if (link) {
      link.inboundIds.push(inboundNo)
      link.status = 'outbound'
    }
  })

  writeJson(KEYS.inboundList, inboundList)

  if (link) {
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

  return { inbounds: created, skipped: false }
}

/** 采购入库确认/审核 → 回写卖方「对方已入库」 */
export const onPurchaseInboundAudited = (inbound: Record<string, unknown>) => {
  const inboundNo = String(inbound.inboundNo || '')
  const outboundNo = String(inbound.outboundNo || '')
  const link = getCollabLinks().find(
    l => l.inboundIds.includes(inboundNo) || l.buyerOrderId === inbound.purchaseOrderId
  )

  const outboundList = readJson<Record<string, unknown>[]>(KEYS.outboundRecords, [])
  const obIdx = outboundList.findIndex(
    r => r.outboundNo === outboundNo || (link && link.outboundIds.includes(String(r.outboundNo)))
  )
  if (obIdx >= 0) {
    outboundList[obIdx] = {
      ...outboundList[obIdx],
      counterpartyInboundStatus: 'inStock',
      counterpartyInboundStatusLabel: '对方已入库',
      counterpartyInboundAt: new Date().toISOString()
    }
    writeJson(KEYS.outboundRecords, outboundList)
  }

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
