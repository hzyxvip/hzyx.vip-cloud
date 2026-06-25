/** 采购订单列表演示数据 + 与 localStorage 合并（列表页 / 单据导航共用） */

import { getCurrentCompany } from '@/utils/dataStore'
import {
  belongsToCompany,
  shouldIncludeDemoOrders,
  stampOrderCompanyId
} from '@/utils/orderBusinessProcess'

export const DEMO_PURCHASE_ORDERS = [
  { id: 'PO20260620001', orderNo: 'PO-20260620-0001', supplier: '北京医疗器械有限公司', date: '2026-06-20', amount: '¥12,500.00', itemCount: 5, auditStatus: 'notAudited', executeStatus: 'notExecuted', warehouseStatus: 'notInWarehoused', closeStatus: 'notClosed', prepaymentStatus: '', receiveStatus: 'notReceived', status: 'pending', creator: '系统管理员' },
  { id: 'PO20260619002', orderNo: 'PO-20260619-0002', supplier: '上海医疗设备有限公司', date: '2026-06-19', amount: '¥8,800.00', itemCount: 3, auditStatus: 'audited', executeStatus: 'partiallyExecuted', warehouseStatus: 'partiallyInWarehoused', closeStatus: 'notClosed', prepaymentStatus: 'prepaidAudited', receiveStatus: 'notReceived', status: 'processing', creator: '系统管理员' },
  { id: 'PO20260618003', orderNo: 'PO-20260618-0003', supplier: '广州医疗科技有限公司', date: '2026-06-18', amount: '¥25,600.00', itemCount: 8, auditStatus: 'audited', executeStatus: 'allExecuted', warehouseStatus: 'allInWarehoused', closeStatus: 'closed', prepaymentStatus: '', receiveStatus: 'received', status: 'completed', creator: '系统管理员' },
  { id: 'PO20260617004', orderNo: 'PO-20260617-0004', supplier: '北京医疗器械有限公司', date: '2026-06-17', amount: '¥15,200.00', itemCount: 4, auditStatus: 'notAudited', executeStatus: 'notExecuted', warehouseStatus: 'notInWarehoused', closeStatus: 'notClosed', prepaymentStatus: 'prepaidNotAudited', receiveStatus: 'notReceived', status: 'pending', creator: '系统管理员' },
  { id: 'PO20260616005', orderNo: 'PO-20260616-0005', supplier: '上海医疗设备有限公司', date: '2026-06-16', amount: '¥6,800.00', itemCount: 2, auditStatus: 'audited', executeStatus: 'allExecuted', warehouseStatus: 'allInWarehoused', closeStatus: 'closed', prepaymentStatus: '', receiveStatus: 'received', status: 'completed', creator: '系统管理员' },
  { id: 'PO20260615006', orderNo: 'PO-20260615-0006', supplier: '广州医疗科技有限公司', date: '2026-06-15', amount: '¥32,000.00', itemCount: 10, auditStatus: 'audited', executeStatus: 'partiallyExecuted', warehouseStatus: 'partiallyInWarehoused', closeStatus: 'notClosed', prepaymentStatus: 'prepaidPartiallyAudited', receiveStatus: 'notReceived', status: 'processing', creator: '系统管理员' },
  { id: 'PO20260614007', orderNo: 'PO-20260614-0007', supplier: '北京医疗器械有限公司', date: '2026-06-14', amount: '¥9,500.00', itemCount: 3, auditStatus: 'notAudited', executeStatus: 'notExecuted', warehouseStatus: 'notInWarehoused', closeStatus: 'manualClosed', prepaymentStatus: '', receiveStatus: 'notReceived', status: 'cancelled', creator: '系统管理员' },
  { id: 'PO20260613008', orderNo: 'PO-20260613-0008', supplier: '上海医疗设备有限公司', date: '2026-06-13', amount: '¥18,900.00', itemCount: 6, auditStatus: 'audited', executeStatus: 'allExecuted', warehouseStatus: 'allInWarehoused', closeStatus: 'closed', prepaymentStatus: '', receiveStatus: 'received', status: 'completed', creator: '系统管理员' }
] as const

export type PurchaseOrderListRow = (typeof DEMO_PURCHASE_ORDERS)[number] & Record<string, unknown>

const STORAGE_KEY = 'purchase-orders'

export const loadRawPurchaseOrdersFromStorage = (): Record<string, unknown>[] =>
  JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')

export const mergePurchaseOrderListRows = (
  savedOrders: Record<string, unknown>[] = loadRawPurchaseOrdersFromStorage(),
  companyId = getCurrentCompany()
): PurchaseOrderListRow[] => {
  const scopedSaved = savedOrders
    .map(row => stampOrderCompanyId(row, companyId))
    .filter(row => belongsToCompany(row, companyId))

  if (!shouldIncludeDemoOrders()) {
    return scopedSaved as PurchaseOrderListRow[]
  }

  const existingIds = new Set(DEMO_PURCHASE_ORDERS.map(item => item.id))
  const newOrders = scopedSaved.filter(o => !existingIds.has(String(o.id)))
  return [
    ...newOrders,
    ...DEMO_PURCHASE_ORDERS.map(row => {
      const saved = scopedSaved.find(o => o.id === row.id)
      const merged = saved ? { ...row, ...saved } : { ...row }
      return stampOrderCompanyId(merged, companyId) as PurchaseOrderListRow
    })
  ]
}

/** 单据导航：按日期倒序的订单 id 列表（仅当前公司） */
export const loadPurchaseOrderNavIds = (): string[] =>
  mergePurchaseOrderListRows()
    .map(row => ({ id: String(row.id), date: String(row.date || '') }))
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return b.id.localeCompare(a.id)
    })
    .map(row => row.id)

export type PurchaseOrderColumnSortOrder = import('@/utils/documentTableSort').DocumentColumnSortOrder

export { sortRowsByColumn as sortPurchaseOrderListRows } from '@/utils/documentTableSort'
