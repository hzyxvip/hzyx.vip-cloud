import { orderApi } from '@/utils/api'
import { getAuthToken } from '@/utils/authSession'
import { belongsToCompany } from '@/utils/orderBusinessProcess'
import { requireTenantCompanyId, resolveTenantCompanyId } from '@/utils/tenantGuard'

export const PURCHASE_ORDERS_KEY = 'purchase-orders'
export const SALES_ORDERS_KEY = 'sales-orders'
const PURCHASE_SYNCED_KEY = 'purchase-orders_serverSyncedAt'
const SALES_SYNCED_KEY = 'sales-orders_serverSyncedAt'

function hasAuthToken(): boolean {
  return !!getAuthToken()
}

function readOrders(key: string): Record<string, unknown>[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeOrders(key: string, orders: Record<string, unknown>[]) {
  localStorage.setItem(key, JSON.stringify(orders))
}

function filterOrdersForCurrentTenant(orders: Record<string, unknown>[]): Record<string, unknown>[] {
  const companyId = resolveTenantCompanyId()
  if (!companyId) return []
  return orders.filter(row => belongsToCompany(row, companyId))
}

function mergeRemoteOrders(
  local: Record<string, unknown>[],
  remote: Record<string, unknown>[],
  companyId: number
): Record<string, unknown>[] {
  const others = local.filter(row => !belongsToCompany(row, companyId))
  const scopedRemote = remote.map(row => ({ ...row, companyId } as Record<string, unknown>))
  const tenantLocal = local.filter(row => belongsToCompany(row, companyId))
  const byKey = new Map<string, Record<string, unknown>>()
  tenantLocal.forEach(row => {
    const key = String(row.id || row.orderNo || '')
    if (key) byKey.set(key, row)
  })
  scopedRemote.forEach(row => {
    const key = String(row.id || row.orderNo || '')
    if (!key) return
    const existing = byKey.get(key) || {}
    byKey.set(key, { ...existing, ...row, companyId })
  })
  return [...others, ...byKey.values()]
}

let purchaseSyncTask: Promise<boolean> = Promise.resolve(true)
let salesSyncTask: Promise<boolean> = Promise.resolve(true)

export async function syncPurchaseOrdersToServer(background = true): Promise<boolean> {
  if (!hasAuthToken()) return false
  if (!background) {
    purchaseSyncTask = purchaseSyncTask.then(async () => {
      try {
        const companyId = requireTenantCompanyId(false)
        if (!companyId) return false
        const items = filterOrdersForCurrentTenant(readOrders(PURCHASE_ORDERS_KEY))
        await orderApi.syncPurchase(items, { background: true })
        localStorage.setItem(PURCHASE_SYNCED_KEY, new Date().toISOString())
        return true
      } catch {
        return false
      }
    })
    return purchaseSyncTask
  }
  void syncPurchaseOrdersToServer(false)
  return true
}

export async function hydratePurchaseOrdersFromServer(): Promise<void> {
  if (!hasAuthToken()) return
  const companyId = resolveTenantCompanyId()
  if (!companyId) return
  try {
    const remote = await orderApi.getPurchase({ background: true })
    if (Array.isArray(remote) && remote.length > 0) {
      const local = readOrders(PURCHASE_ORDERS_KEY)
      if (local.length === 0 || !localStorage.getItem(PURCHASE_SYNCED_KEY)) {
        writeOrders(PURCHASE_ORDERS_KEY, mergeRemoteOrders(local, remote, companyId))
      }
    }
  } catch {
    /* offline */
  }
}

export async function syncSalesOrdersToServer(background = true): Promise<boolean> {
  if (!hasAuthToken()) return false
  if (!background) {
    salesSyncTask = salesSyncTask.then(async () => {
      try {
        const companyId = requireTenantCompanyId(false)
        if (!companyId) return false
        const items = filterOrdersForCurrentTenant(readOrders(SALES_ORDERS_KEY))
        await orderApi.syncSales(items, { background: true })
        localStorage.setItem(SALES_SYNCED_KEY, new Date().toISOString())
        return true
      } catch {
        return false
      }
    })
    return salesSyncTask
  }
  void syncSalesOrdersToServer(false)
  return true
}

export async function hydrateSalesOrdersFromServer(): Promise<void> {
  if (!hasAuthToken()) return
  const companyId = resolveTenantCompanyId()
  if (!companyId) return
  try {
    const remote = await orderApi.getSales({ background: true })
    if (Array.isArray(remote) && remote.length > 0) {
      const local = readOrders(SALES_ORDERS_KEY)
      if (local.length === 0 || !localStorage.getItem(SALES_SYNCED_KEY)) {
        writeOrders(SALES_ORDERS_KEY, mergeRemoteOrders(local, remote, companyId))
      }
    }
  } catch {
    /* offline */
  }
}

export function persistPurchaseOrders(orders: Record<string, unknown>[]) {
  if (!requireTenantCompanyId()) return
  writeOrders(PURCHASE_ORDERS_KEY, orders)
  void syncPurchaseOrdersToServer()
}

export function persistSalesOrders(orders: Record<string, unknown>[]) {
  if (!requireTenantCompanyId()) return
  writeOrders(SALES_ORDERS_KEY, orders)
  void syncSalesOrdersToServer()
}
