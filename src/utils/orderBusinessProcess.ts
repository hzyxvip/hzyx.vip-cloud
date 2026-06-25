/**
 * 订单业务流程：标准 vs 协同
 * - 各公司登录仅查看本公司单据
 * - 平台公司与入驻企业一样，只做自身买卖，不参与其他公司间业务查看
 */
import { getCurrentCompany, companies } from '@/utils/dataStore'
import { getAuthUser } from '@/utils/authSession'
import { getCollabLinks, type CollabLink } from '@/utils/platformCollaborationService'

export type BusinessProcessType = 'standard' | 'collaborative'

export type BusinessProcessFilter = '' | BusinessProcessType | 'crossCompany' | 'platform'

export const PURCHASE_BUSINESS_PROCESS_OPTIONS = [
  { label: '全部流程', value: '' as const },
  { label: '标准采购', value: 'standard' as const },
  { label: '协同采购', value: 'collaborative' as const }
]

export const SALES_BUSINESS_PROCESS_OPTIONS = [
  { label: '全部流程', value: '' as const },
  { label: '标准销售', value: 'standard' as const },
  { label: '协同销售', value: 'collaborative' as const }
]

/** 演示样例数据归属 demo 账号对应公司 */
export const DEMO_TENANT_COMPANY_CODE = 'DEMO'

export function getCurrentCompanyId(): number | null {
  return getCurrentCompany()
}

export function getCurrentCompanyCode(): string {
  const id = getCurrentCompany()
  if (!id) return String(getAuthUser()?.companyCode || '')
  const company = companies.value.find(c => c.id === id)
  if (company?.code) return String(company.code)
  try {
    return String(getAuthUser()?.companyCode || '')
  } catch {
    return ''
  }
}

export function shouldIncludeDemoOrders(): boolean {
  return getCurrentCompanyCode() === DEMO_TENANT_COMPANY_CODE
}

export function belongsToCompany(
  row: Record<string, unknown>,
  companyId: number | null = getCurrentCompanyId()
): boolean {
  if (!companyId || companyId <= 0) return false
  const rowCompanyId = Number(row.companyId)
  if (Number.isFinite(rowCompanyId) && rowCompanyId > 0) {
    return rowCompanyId === companyId
  }
  // 历史无 companyId 的数据：仅 demo 经营公司可见，避免串公司
  return shouldIncludeDemoOrders()
}

export function stampOrderCompanyId(
  row: Record<string, unknown>,
  companyId: number | null = getCurrentCompanyId()
): Record<string, unknown> {
  if (!companyId || companyId <= 0) return row
  const existing = Number(row.companyId)
  if (Number.isFinite(existing) && existing > 0) return row
  return { ...row, companyId }
}

export function normalizeBusinessProcessFilter(value: unknown): BusinessProcessFilter {
  const text = String(value ?? '')
  if (text === 'crossCompany' || text === 'platform') return 'collaborative'
  if (text === 'standard' || text === 'collaborative') return text
  return ''
}

export type CollabIndex = {
  buyerOrderIds: Set<string>
  sellerOrderIds: Set<string>
}

export function buildCollabIndexForCompany(companyId = getCurrentCompanyId()): CollabIndex {
  const buyerOrderIds = new Set<string>()
  const sellerOrderIds = new Set<string>()
  getCollabLinks().forEach((link: CollabLink) => {
    if (link.buyerCompanyId === companyId && link.buyerOrderId) {
      buyerOrderIds.add(String(link.buyerOrderId))
    }
    if (link.sellerCompanyId === companyId && link.sellerOrderId) {
      sellerOrderIds.add(String(link.sellerOrderId))
    }
  })
  return { buyerOrderIds, sellerOrderIds }
}

export function resolvePurchaseOrderBusinessProcess(
  row: Record<string, unknown>,
  index: CollabIndex = buildCollabIndexForCompany()
): BusinessProcessType {
  const explicit = normalizeBusinessProcessFilter(row.businessProcess)
  if (explicit === 'collaborative') return 'collaborative'
  if (explicit === 'standard') return 'standard'

  const orderKey = String(row.id || row.orderNo || '')
  if (orderKey && index.buyerOrderIds.has(orderKey)) return 'collaborative'
  if (row.sellerOrderId || row.platformOrderNo) return 'collaborative'
  if (row.sendStatus === '已发单' || row.sendStatus === '已接单') return 'collaborative'
  if (row.collaborationEnabled === true) return 'collaborative'
  return 'standard'
}

export function resolveSalesOrderBusinessProcess(
  row: Record<string, unknown>,
  index: CollabIndex = buildCollabIndexForCompany()
): BusinessProcessType {
  const explicit = normalizeBusinessProcessFilter(row.businessProcess)
  if (explicit === 'collaborative') return 'collaborative'
  if (explicit === 'standard') return 'standard'

  const orderKey = String(row.id || row.orderNo || '')
  if (orderKey && index.sellerOrderIds.has(orderKey)) return 'collaborative'
  if (row.sourcePurchaseOrderId || row.sourcePurchaseOrderNo) return 'collaborative'
  if (String(row.docSource || '') === '平台协同') return 'collaborative'
  return 'standard'
}

export function matchesBusinessProcessFilter(
  row: Record<string, unknown>,
  filter: BusinessProcessFilter,
  resolve: (row: Record<string, unknown>, index: CollabIndex) => BusinessProcessType,
  index?: CollabIndex
): boolean {
  const normalized = normalizeBusinessProcessFilter(filter)
  if (!normalized) return true
  const collabIndex = index ?? buildCollabIndexForCompany()
  return resolve(row, collabIndex) === normalized
}
