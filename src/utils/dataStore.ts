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

export const setCurrentCompany = (companyId: number) => {
  currentCompanyId.value = companyId
  localStorage.setItem('currentCompanyId', String(companyId))
}

export const getCurrentCompany = () => {
  if (currentCompanyId.value === null) {
    const stored = localStorage.getItem('currentCompanyId')
    currentCompanyId.value = stored ? Number(stored) : 1
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
  add: (warehouse: Omit<Warehouse, 'id'>) => {
    const newId = warehouses.value.length > 0 ? Math.max(...warehouses.value.map(w => w.id)) + 1 : 1
    warehouses.value.push({ ...warehouse, id: newId })
    return newId
  },
  update: (id: number, updates: Partial<Warehouse>) => {
    const index = warehouses.value.findIndex(w => w.id === id)
    if (index > -1) warehouses.value[index] = { ...warehouses.value[index], ...updates }
  },
  delete: (id: number) => {
    const index = warehouses.value.findIndex(w => w.id === id)
    if (index > -1) warehouses.value.splice(index, 1)
  }
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

export const refreshData = () => {}