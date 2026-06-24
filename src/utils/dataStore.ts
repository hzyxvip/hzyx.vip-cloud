import { ref } from 'vue'
import type { PartnerDocument } from '@/types/partnerProfile'
import type { LicenseVisibilityConfig } from '@/utils/partnerLicenseVisibility'

export interface Company {
  id: number
  code: string
  name: string
  companyType?: string
  address: string
  phone: string
  taxNo: string
  status: string
  fax?: string
  email?: string
  website?: string
  businessLicense?: string
  gspCertificate?: string
  medicalDeviceLicense?: string
  bankName?: string
  bankAccount?: string
  legalPerson?: string
  syncFromPlatform?: boolean
  companyIntro?: string
  allowPublicDisplay?: boolean
  qualificationPublicMap?: Record<string, boolean>
  platformUser?: string
  settlementPeriod?: number
  recordStatus?: string
  recordDate?: string
  remark2?: string
  remark3?: string
  remark4?: string
  remark5?: string
  documents?: PartnerDocument[]
  licenseSectionOrder?: Record<string, string[]>
  licenseVisibility?: LicenseVisibilityConfig
  customFields?: Record<string, string>
}

export interface User {
  id: number
  username: string
  password?: string
  realName: string
  companyId: number
  role: string
  status: string
  showOnLogin?: boolean
  loginHintPassword?: string | null
  enabledAt?: string
  validityYears?: number
  expiresAt?: string
  company?: Company
}

export interface Location {
  id: number
  companyId: number
  code: string
  name: string
  warehouse: string
  area: string
  status: string
}

export interface Warehouse {
  id: number
  companyId: number
  code: string
  name: string
  address: string
  manager: string
  phone: string
  status: string
  allowNegativeStock: boolean
  isDefault: boolean
}

const currentCompanyId = ref<number | null>(null)

import { getAuthCompanyId } from './authSession'
import {
  SYSTEM_DEFAULT_WAREHOUSE_CODE,
  SYSTEM_DEFAULT_WAREHOUSE_NAME,
  buildSystemDefaultWarehouseRecord
} from './warehouseDefaults'

export const setCurrentCompany = (companyId: number) => {
  currentCompanyId.value = companyId
  sessionStorage.setItem('currentCompanyId', String(companyId))
}

export const getCurrentCompany = () => {
  if (currentCompanyId.value === null) {
    const stored = getAuthCompanyId()
    currentCompanyId.value = stored ?? 1
  }
  return currentCompanyId.value
}

export interface Department {
  id: number
  companyId: number
  code: string
  name: string
  parent: string
  manager: string
  phone: string
}

export interface Position {
  id: number
  companyId: number
  code: string
  name: string
  department: string
  level: string
  salary: string
}

export const companies = ref<Company[]>([])
export const users = ref<User[]>([])
export const locations = ref<Location[]>([])
export const warehouses = ref<Warehouse[]>([])
export const departments = ref<Department[]>([])
export const positions = ref<Position[]>([])

export const companyStore = {
  getAll: () => companies.value,
  getById: (id: number) => companies.value.find(c => c.id === id),
  add: (company: Omit<Company, 'id'>) => {
    const newId = companies.value.length > 0 ? Math.max(...companies.value.map(c => c.id)) + 1 : 1
    companies.value.push({ ...company, id: newId })
    return newId
  },
  update: (id: number, updates: Partial<Company>) => {
    const index = companies.value.findIndex(c => c.id === id)
    if (index > -1) companies.value[index] = { ...companies.value[index], ...updates }
  },
  delete: (id: number) => {
    const index = companies.value.findIndex(c => c.id === id)
    if (index > -1) companies.value.splice(index, 1)
  }
}

export const departmentStore = {
  getAll: () => departments.value,
  getById: (id: number) => departments.value.find(d => d.id === id),
  add: (dept: Omit<Department, 'id'>) => {
    const newId = departments.value.length > 0 ? Math.max(...departments.value.map(d => d.id)) + 1 : 1
    departments.value.push({ ...dept, id: newId })
    return newId
  },
  update: (id: number, updates: Partial<Department>) => {
    const index = departments.value.findIndex(d => d.id === id)
    if (index > -1) departments.value[index] = { ...departments.value[index], ...updates }
  },
  delete: (id: number) => {
    const index = departments.value.findIndex(d => d.id === id)
    if (index > -1) departments.value.splice(index, 1)
  }
}

export const userStore = {
  getAll: () => users.value,
  getById: (id: number) => users.value.find(u => u.id === id),
  getByUsername: (username: string) => users.value.find(u => u.username === username),
  add: (user: Omit<User, 'id'>) => {
    const newId = users.value.length > 0 ? Math.max(...users.value.map(u => u.id)) + 1 : 1
    users.value.push({ ...user, id: newId })
    return newId
  }
}

export const warehouseStore = {
  getAll: () => warehouses.value,
  getById: (id: number) => warehouses.value.find(w => w.id === id),
  getDefault: (companyId: number) => warehouses.value.find(w => w.companyId === companyId && w.isDefault),
  add: (warehouse: Omit<Warehouse, 'id'>) => {
    const newId = warehouses.value.length > 0 ? Math.max(...warehouses.value.map(w => w.id)) + 1 : 1
    const record = { ...warehouse, id: newId, isDefault: warehouse.isDefault ?? false }
    warehouses.value.push(record)
    if (record.isDefault) {
      warehouseStore.setDefault(newId)
    }
    return newId
  },
  update: (id: number, updates: Partial<Warehouse>) => {
    const index = warehouses.value.findIndex(w => w.id === id)
    if (index > -1) warehouses.value[index] = { ...warehouses.value[index], ...updates }
  },
  setDefault: (id: number) => {
    const target = warehouses.value.find(w => w.id === id)
    if (!target) return
    warehouses.value.forEach(w => {
      if (w.companyId === target.companyId) {
        w.isDefault = w.id === id
      }
    })
  },
  clearDefault: (id: number) => {
    const target = warehouses.value.find(w => w.id === id)
    if (target) target.isDefault = false
  },
  delete: (id: number) => {
    const index = warehouses.value.findIndex(w => w.id === id)
    if (index > -1) warehouses.value.splice(index, 1)
  }
}

export function mapWarehouseFromApi(item: Warehouse): Warehouse {
  return {
    id: item.id,
    companyId: item.companyId,
    code: item.code,
    name: item.name,
    address: item.address || '',
    manager: item.manager || '',
    phone: item.phone || '',
    status: item.status || '启用',
    allowNegativeStock: Boolean(item.allowNegativeStock),
    isDefault: Boolean(item.isDefault)
  }
}

export async function saveWarehouseRecord(
  data: Omit<Warehouse, 'id'>,
  id?: number | null
): Promise<void> {
  const { warehouseApi } = await import('./api')
  const payload = {
    code: data.code,
    name: data.name,
    manager: data.manager,
    phone: data.phone,
    address: data.address,
    status: data.status,
    allowNegativeStock: data.allowNegativeStock,
    isDefault: data.isDefault
  }

  if (id) {
    try {
      await warehouseApi.update(id, payload)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.includes('不存在')) {
        await warehouseApi.create({ ...payload, companyId: data.companyId })
      } else {
        throw error
      }
    }
  } else {
    await warehouseApi.create({ ...payload, companyId: data.companyId })
  }
  await loadWarehousesFromApi()
}

export async function patchWarehouseRecord(id: number, updates: Partial<Warehouse>): Promise<void> {
  const { warehouseApi } = await import('./api')
  const payload: Partial<Warehouse> = { ...updates }
  delete payload.id
  delete payload.companyId

  const existing = warehouses.value.find(w => w.id === id)
  try {
    await warehouseApi.update(id, payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (existing && message.includes('不存在')) {
      await saveWarehouseRecord(
        {
          companyId: existing.companyId,
          code: existing.code,
          name: existing.name,
          manager: existing.manager,
          phone: existing.phone,
          address: existing.address,
          status: existing.status,
          allowNegativeStock: existing.allowNegativeStock,
          isDefault: existing.isDefault,
          ...payload
        },
        null
      )
      return
    }
    throw error
  }
  await loadWarehousesFromApi()
}

export async function removeWarehouseRecord(id: number): Promise<void> {
  const { warehouseApi } = await import('./api')
  await warehouseApi.delete(id)
  warehouseStore.delete(id)
}

export const locationStore = {
  getAll: () => locations.value,
  getByWarehouse: (warehouseName: string) => locations.value.filter(l => l.warehouse === warehouseName && l.status === '启用'),
  add: (location: Omit<Location, 'id'>) => {
    const newId = locations.value.length > 0 ? Math.max(...locations.value.map(l => l.id)) + 1 : 1
    locations.value.push({ ...location, id: newId })
    return newId
  },
  update: (id: number, updates: Partial<Location>) => {
    const index = locations.value.findIndex(l => l.id === id)
    if (index > -1) locations.value[index] = { ...locations.value[index], ...updates }
  },
  delete: (id: number) => {
    const index = locations.value.findIndex(l => l.id === id)
    if (index > -1) locations.value.splice(index, 1)
  }
}

export const positionStore = {
  getAll: () => positions.value,
  getById: (id: number) => positions.value.find(p => p.id === id),
  add: (position: Omit<Position, 'id'>) => {
    const newId = positions.value.length > 0 ? Math.max(...positions.value.map(p => p.id)) + 1 : 1
    positions.value.push({ ...position, id: newId })
    return newId
  },
  update: (id: number, updates: Partial<Position>) => {
    const index = positions.value.findIndex(p => p.id === id)
    if (index > -1) positions.value[index] = { ...positions.value[index], ...updates }
  },
  delete: (id: number) => {
    const index = positions.value.findIndex(p => p.id === id)
    if (index > -1) positions.value.splice(index, 1)
  }
}

export const refreshData = async () => {
  await Promise.all([loadWarehousesFromApi(), loadLocationsFromApi()])
}

function unwrapApiList<T>(res: unknown): T[] | null {
  if (Array.isArray(res)) return res as T[]
  if (res && typeof res === 'object' && Array.isArray((res as { data?: T[] }).data)) {
    return (res as { data: T[] }).data
  }
  return null
}

export async function loadWarehousesFromApi() {
  try {
    const { warehouseApi } = await import('./api')
    const list = unwrapApiList<Warehouse>(await warehouseApi.getAll())
    if (!list) {
      ensureLocalSystemDefaultWarehouse(getCurrentCompany())
      return
    }
    warehouses.value = list.map(mapWarehouseFromApi)
  } catch {
    ensureLocalSystemDefaultWarehouse(getCurrentCompany())
  }
}

/** 后端不可用时，本地补一条系统默认仓库 ck01 */
export function ensureLocalSystemDefaultWarehouse(companyId: number) {
  const companyWarehouses = warehouses.value.filter(w => w.companyId === companyId)
  if (companyWarehouses.length > 0) return

  warehouseStore.add(buildSystemDefaultWarehouseRecord(companyId))
}

export async function loadLocationsFromApi() {
  try {
    const { locationApi } = await import('./api')
    const list = unwrapApiList<Location>(await locationApi.getAll())
    if (!list) return
    locations.value = list.map(item => ({
      id: item.id,
      companyId: item.companyId,
      code: item.code,
      name: item.name,
      warehouse: item.warehouse,
      area: item.area || '',
      status: item.status || '启用'
    }))
  } catch {
    // 保留本地数据
  }
}