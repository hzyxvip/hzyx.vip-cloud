/** 销售订单列表演示数据 + 与 localStorage 合并（列表页 / 单据导航共用） */

import { getCurrentCompany } from '@/utils/dataStore'
import {
  belongsToCompany,
  shouldIncludeDemoOrders,
  stampOrderCompanyId
} from '@/utils/orderBusinessProcess'

export const DEMO_SALES_ORDERS = [
  { id: 'SO20260620001', orderNo: 'SO-20260620-0001', customer: '广西可盟医疗科技有限公司', customerCode: 'GX01671', warehouse: '公司库', date: '2026-06-20', amount: '¥12,500.00', itemCount: 5, auditStatus: 'notAudited', executeStatus: 'notExecuted', closeStatus: 'notClosed', prepaymentStatus: '', receiveStatus: 'notReceived', status: 'pending', creator: '系统管理员', salesman: '张三', auditor: '' },
  { id: 'SO20260619002', orderNo: 'SO-20260619-0002', customer: '广西可盟医疗科技有限公司', customerCode: 'GX01671', warehouse: '公司库', date: '2026-06-19', amount: '¥28,800.00', itemCount: 8, auditStatus: 'audited', executeStatus: 'allExecuted', closeStatus: 'closed', prepaymentStatus: 'prepaidAudited', receiveStatus: 'received', status: 'completed', creator: '系统管理员', salesman: '李四', auditor: '系统管理员' },
  { id: 'SO20260618003', orderNo: 'SO-20260618-0003', customer: '广西可盟医疗科技有限公司', customerCode: 'GX01671', warehouse: '公司库', date: '2026-06-18', amount: '¥15,200.00', itemCount: 3, auditStatus: 'audited', executeStatus: 'allExecuted', closeStatus: 'notClosed', prepaymentStatus: 'prepaidPartiallyAudited', receiveStatus: 'received', status: 'processing', creator: '系统管理员', salesman: '王五', auditor: '系统管理员' },
  { id: 'SO20260617004', orderNo: 'SO-20260617-0004', customer: '广西可盟医疗科技有限公司', customerCode: 'GX01671', warehouse: '公司库', date: '2026-06-17', amount: '¥45,600.00', itemCount: 12, auditStatus: 'notAudited', executeStatus: 'partiallyExecuted', closeStatus: 'manualClosed', prepaymentStatus: '', receiveStatus: 'notReceived', status: 'pending', creator: '系统管理员', salesman: '赵六', auditor: '' },
  { id: 'SO20260616005', orderNo: 'SO-20260616-0005', customer: '广西可盟医疗科技有限公司', customerCode: 'GX01671', warehouse: '公司库', date: '2026-06-16', amount: '¥8,900.00', itemCount: 2, auditStatus: 'audited', executeStatus: 'notExecuted', closeStatus: 'notClosed', prepaymentStatus: 'prepaidAudited', receiveStatus: 'received', status: 'processing', creator: '系统管理员', salesman: '张三', auditor: '系统管理员' },
  { id: 'SO20260615006', orderNo: 'SO-20260615-0006', customer: '广西可盟医疗科技有限公司', customerCode: 'GX01671', warehouse: '公司库', date: '2026-06-15', amount: '¥35,000.00', itemCount: 6, auditStatus: 'audited', executeStatus: 'partiallyExecuted', closeStatus: 'closed', prepaymentStatus: 'prepaidPartiallyAudited', receiveStatus: 'notReceived', status: 'processing', creator: '系统管理员', salesman: '李四', auditor: '系统管理员' },
  { id: 'SO20260614007', orderNo: 'SO-20260614-0007', customer: '广西可盟医疗科技有限公司', customerCode: 'GX01671', warehouse: '公司库', date: '2026-06-14', amount: '¥9,500.00', itemCount: 3, auditStatus: 'notAudited', executeStatus: 'notExecuted', closeStatus: 'manualClosed', prepaymentStatus: '', receiveStatus: 'notReceived', status: 'cancelled', creator: '系统管理员', salesman: '王五', auditor: '' },
  { id: 'SO20260613008', orderNo: 'SO-20260613-0008', customer: '广西可盟医疗科技有限公司', customerCode: 'GX01671', warehouse: '公司库', date: '2026-06-13', amount: '¥18,900.00', itemCount: 6, auditStatus: 'audited', executeStatus: 'allExecuted', closeStatus: 'closed', prepaymentStatus: '', receiveStatus: 'received', status: 'completed', creator: '系统管理员', salesman: '赵六', auditor: '系统管理员' }
] as const

const STORAGE_KEY = 'sales-orders'

export const loadRawSalesOrdersFromStorage = (): Record<string, unknown>[] =>
  JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')

export const mergeSalesOrderListRows = (
  savedOrders: Record<string, unknown>[] = loadRawSalesOrdersFromStorage(),
  companyId = getCurrentCompany()
): Record<string, unknown>[] => {
  const scopedSaved = savedOrders
    .map(row => stampOrderCompanyId(row, companyId))
    .filter(row => belongsToCompany(row, companyId))

  if (!shouldIncludeDemoOrders()) {
    return scopedSaved
  }

  const existingIds = new Set(DEMO_SALES_ORDERS.map(item => item.id))
  const newOrders = scopedSaved.filter(o => !existingIds.has(String(o.id)))
  return [
    ...newOrders,
    ...DEMO_SALES_ORDERS.map(row => {
      const saved = scopedSaved.find(o => o.id === row.id)
      const merged = saved ? { ...row, ...saved } : { ...row }
      return stampOrderCompanyId(merged, companyId)
    })
  ]
}

export const loadSalesOrderNavIds = (): string[] =>
  mergeSalesOrderListRows()
    .map(row => ({ id: String(row.id), date: String(row.date || '') }))
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return b.id.localeCompare(a.id)
    })
    .map(row => row.id)
