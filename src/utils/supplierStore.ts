export const SUPPLIERS_KEY = 'suppliers'

import type { PartnerDocument, PartnerProfileExtension } from '@/types/partnerProfile'
import { getCurrentUserName } from '@/utils/customerStore'

export type SupplierDocument = PartnerDocument

export interface SupplierMaster extends PartnerProfileExtension {
  id: string
  code?: string
  name: string
  contact: string
  phone?: string
  mobile?: string
  email?: string
  type: string
  address?: string
  province?: string
  city?: string
  postalCode?: string
  creditCode?: string
  bankName?: string
  bankAccount?: string
  taxNo?: string
  legalPerson?: string
  registerCapital?: string
  businessScope?: string
  establishDate?: string
  remark?: string
  auditStatus: 'notAudited' | 'audited'
  status: 'normal' | 'disabled'
  createTime: string
  creator: string
  auditTime?: string
  auditor?: string
  documents?: SupplierDocument[]
  collaborationEnabled?: boolean
  [key: string]: unknown
}

export const supplierTypeOptions = [
  { label: '生产企业', value: 'manufacturer' },
  { label: '经营企业', value: 'distributor' },
  { label: '其他', value: 'other' }
]

export const defaultSuppliers: SupplierMaster[] = [
  {
    id: 'SUP001',
    code: 'SUP001',
    name: '北京医疗器械有限公司',
    contact: '张三',
    phone: '010-88888888',
    mobile: '13800138000',
    province: '北京',
    city: '北京市',
    type: 'manufacturer',
    auditStatus: 'audited',
    status: 'normal',
    createTime: '2026-06-15',
    creator: '系统管理员'
  },
  {
    id: 'SUP002',
    code: 'SUP002',
    name: '上海医疗设备有限公司',
    contact: '李四',
    phone: '021-66666666',
    mobile: '13800138001',
    province: '上海',
    city: '上海市',
    type: 'distributor',
    auditStatus: 'audited',
    status: 'normal',
    createTime: '2026-06-14',
    creator: '系统管理员'
  },
  {
    id: 'SUP003',
    code: 'SUP003',
    name: '广州医疗科技有限公司',
    contact: '王五',
    phone: '020-55555555',
    mobile: '13800138002',
    province: '广东',
    city: '广州市',
    type: 'manufacturer',
    auditStatus: 'notAudited',
    status: 'normal',
    createTime: '2026-06-13',
    creator: '系统管理员'
  }
]

function readSupplierListRaw(): SupplierMaster[] {
  const stored = localStorage.getItem(SUPPLIERS_KEY)
  if (!stored || stored === '[]') return []
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function loadSupplierList(): SupplierMaster[] {
  return readSupplierListRaw()
}

export function saveSupplierList(list: SupplierMaster[]): void {
  localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(list))
}

export function loadAndEnsureSupplierList(): SupplierMaster[] {
  const stored = readSupplierListRaw()
  const idSet = new Set(stored.map(item => item.id))
  const codeSet = new Set(stored.map(item => String(item.code || item.id)).filter(Boolean))
  const missing = defaultSuppliers.filter(
    item => !idSet.has(item.id) && !codeSet.has(item.code || item.id)
  )
  const merged = missing.length ? [...missing, ...stored] : stored.length ? stored : [...defaultSuppliers]

  if (stored.length === 0 || missing.length > 0) {
    saveSupplierList(merged)
  }

  return merged
}

export function getSupplierById(id: string): SupplierMaster | undefined {
  return loadSupplierList().find(item => item.id === id)
}

export function upsertSupplier(supplier: SupplierMaster): void {
  const list = loadSupplierList()
  const index = list.findIndex(item => item.id === supplier.id)
  const record: SupplierMaster = {
    ...supplier,
    code: supplier.code || supplier.id
  }
  if (index >= 0) {
    list[index] = { ...list[index], ...record }
  } else {
    list.unshift(record)
  }
  saveSupplierList(list)
}

export function deleteSupplier(id: string): boolean {
  const list = loadSupplierList()
  const next = list.filter(item => item.id !== id)
  if (next.length === list.length) return false
  saveSupplierList(next)
  return true
}

export function setSupplierAuditStatus(
  id: string,
  audited: boolean
): SupplierMaster | undefined {
  const list = loadSupplierList()
  const index = list.findIndex(item => item.id === id)
  if (index < 0) return undefined

  const now = new Date().toLocaleString('zh-CN')
  const auditor = getCurrentUserName()
  list[index] = {
    ...list[index],
    auditStatus: audited ? 'audited' : 'notAudited',
    auditTime: audited ? now : '',
    auditor: audited ? auditor : ''
  }
  saveSupplierList(list)
  return list[index]
}
