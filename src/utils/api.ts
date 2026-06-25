import type { Company, Warehouse, Location, User } from './dataStore'
import type { LoginDemoAccount } from '@/constants/loginAccounts'
import { clearAuthSession, getAuthToken, migrateLegacyAuthToSession } from './authSession'

migrateLegacyAuthToSession()

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

type ApiRequestOptions = RequestInit & {
  /** 后台请求失败时不强制退出登录（避免刚进入系统就被踢回登录页） */
  skipAuthRedirect?: boolean
  timeoutMs?: number
}

const getToken = () => getAuthToken()

const request = async <T>(url: string, options: ApiRequestOptions = {}): Promise<T> => {
  const { skipAuthRedirect = false, timeoutMs = 30000, ...fetchOptions } = options
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>)
  }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${url}`, {
      ...fetchOptions,
      headers,
      signal: controller.signal
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('请求超时，请确认后端服务已启动（端口 3006）')
    }
    throw new Error('无法连接后端服务，请在项目根目录运行 npm run dev:all')
  } finally {
    window.clearTimeout(timer)
  }

  if (response.status === 401) {
    if (!skipAuthRedirect) {
      clearAuthSession()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    throw new Error('登录已过期，请重新登录')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || '请求失败')
  }

  return response.json()
}

/** 检测后端是否在线（登录页展示状态用） */
export async function checkBackendHealth(timeoutMs = 4000): Promise<boolean> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const health = await fetch(`${BASE_URL}/health`, { signal: controller.signal })
    if (health.ok) return true

    const probe = await fetch(`${BASE_URL}/companies`, { signal: controller.signal })
    return probe.ok || probe.status === 401
  } catch {
    return false
  } finally {
    window.clearTimeout(timer)
  }
}

export const authApi = {
  getLoginAccounts: async () => {
    const res = await request<{ success: boolean; data: LoginDemoAccount[] }>('/auth/login-accounts', {
      skipAuthRedirect: true,
      timeoutMs: 8000
    })
    return Array.isArray(res?.data) ? res.data : []
  },

  login: (data: { username: string; password: string }) =>
    request<{ success: boolean; token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      timeoutMs: 12000
    }),
  
  changePassword: (data: { userId: number; oldPassword: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data)
    })
}

export const companyApi = {
  getAll: () => request<Company[]>('/companies'),
  getById: (id: number) => request<Company>(`/companies/${id}`),
  create: (data: Omit<Company, 'id'>) => 
    request<{ success: boolean; data: Company }>('/companies', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  update: (id: number, data: Partial<Company>) =>
    request<{ success: boolean; message: string }>(`/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  delete: (id: number) =>
    request<{ success: boolean; message: string }>(`/companies/${id}`, {
      method: 'DELETE'
    })
}

export const warehouseApi = {
  getAll: () => request<Warehouse[]>('/warehouses'),
  getById: (id: number) => request<Warehouse>(`/warehouses/${id}`),
  create: (data: Omit<Warehouse, 'id'>) =>
    request<{ success: boolean; data: Warehouse }>('/warehouses', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  update: (id: number, data: Partial<Warehouse>) =>
    request<{ success: boolean; message: string }>(`/warehouses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  delete: (id: number) =>
    request<{ success: boolean; message: string }>(`/warehouses/${id}`, {
      method: 'DELETE'
    })
}

export const locationApi = {
  getAll: () => request<Location[]>('/locations'),
  getById: (id: number) => request<Location>(`/locations/${id}`),
  create: (data: Omit<Location, 'id'>) =>
    request<{ success: boolean; data: Location }>('/locations', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  update: (id: number, data: Partial<Location>) =>
    request<{ success: boolean; message: string }>(`/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  delete: (id: number) =>
    request<{ success: boolean; message: string }>(`/locations/${id}`, {
      method: 'DELETE'
    })
}

export const userApi = {
  getAll: async () => {
    const res = await request<{ success?: boolean; data?: User[] } | User[]>('/users')
    if (Array.isArray(res)) return res
    return Array.isArray(res?.data) ? res.data : []
  },
  getById: async (id: number) => {
    const res = await request<{ success: boolean; data: User }>(`/users/${id}`)
    return res.data
  },
  create: (data: {
    username: string
    password: string
    realName: string
    companyId: number
    role?: string
    status?: string
    showOnLogin?: boolean
    loginHintPassword?: string | null
    enabledAt?: string
    validityYears?: number
    expiresAt?: string
  }) =>
    request<{ success: boolean; data: User }>('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  update: (id: number, data: Partial<User> & { password?: string }) =>
    request<{ success: boolean; data: User }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  delete: (id: number) =>
    request<{ success: boolean; message: string }>(`/users/${id}`, {
      method: 'DELETE'
    })
}

export type ApiProduct = Record<string, unknown>

export const customerApi = {
  getAll: async (options?: { background?: boolean }) => {
    const res = await request<{ success: boolean; data: ApiCustomer[] }>('/customers', {
      skipAuthRedirect: options?.background === true,
      timeoutMs: options?.background ? 8000 : 30000
    })
    return Array.isArray(res?.data) ? res.data : []
  },
  sync: (items: ApiCustomer[], options?: { replace?: boolean; background?: boolean }) =>
    request<{ success: boolean; data: ApiCustomer[]; message?: string }>('/customers/sync', {
      method: 'POST',
      body: JSON.stringify({ items, replace: options?.replace === true }),
      skipAuthRedirect: options?.background === true,
      timeoutMs: options?.background ? 60000 : 120000
    }),
  delete: (id: number) =>
    request<{ success: boolean; message: string }>(`/customers/${id}`, {
      method: 'DELETE'
    })
}

export type ApiSupplier = Record<string, unknown>

export const supplierApi = {
  getAll: async (options?: { background?: boolean }) => {
    const res = await request<{ success: boolean; data: ApiSupplier[] }>('/suppliers', {
      skipAuthRedirect: options?.background === true,
      timeoutMs: options?.background ? 8000 : 30000
    })
    return Array.isArray(res?.data) ? res.data : []
  },
  sync: (items: ApiSupplier[], options?: { replace?: boolean; background?: boolean }) =>
    request<{ success: boolean; data: ApiSupplier[]; message?: string }>('/suppliers/sync', {
      method: 'POST',
      body: JSON.stringify({ items, replace: options?.replace === true }),
      skipAuthRedirect: options?.background === true,
      timeoutMs: options?.background ? 60000 : 120000
    }),
  delete: (id: number) =>
    request<{ success: boolean; message: string }>(`/suppliers/${id}`, {
      method: 'DELETE'
    })
}

export type ApiOrder = Record<string, unknown>

export const orderApi = {
  getPurchase: async (options?: { background?: boolean }) => {
    const res = await request<{ success: boolean; data: ApiOrder[] }>('/orders/purchase', {
      skipAuthRedirect: options?.background === true,
      timeoutMs: options?.background ? 8000 : 30000
    })
    return Array.isArray(res?.data) ? res.data : []
  },
  getSales: async (options?: { background?: boolean }) => {
    const res = await request<{ success: boolean; data: ApiOrder[] }>('/orders/sales', {
      skipAuthRedirect: options?.background === true,
      timeoutMs: options?.background ? 8000 : 30000
    })
    return Array.isArray(res?.data) ? res.data : []
  },
  syncPurchase: (items: ApiOrder[], options?: { replace?: boolean; background?: boolean }) =>
    request<{ success: boolean; data: ApiOrder[]; message?: string }>('/orders/purchase/sync', {
      method: 'POST',
      body: JSON.stringify({ items, replace: options?.replace === true }),
      skipAuthRedirect: options?.background === true,
      timeoutMs: options?.background ? 60000 : 120000
    }),
  syncSales: (items: ApiOrder[], options?: { replace?: boolean; background?: boolean }) =>
    request<{ success: boolean; data: ApiOrder[]; message?: string }>('/orders/sales/sync', {
      method: 'POST',
      body: JSON.stringify({ items, replace: options?.replace === true }),
      skipAuthRedirect: options?.background === true,
      timeoutMs: options?.background ? 60000 : 120000
    })
}

export const productApi = {
  getAll: async (options?: { background?: boolean }) => {
    const res = await request<{ success: boolean; data: ApiProduct[] }>('/products', {
      skipAuthRedirect: options?.background === true,
      timeoutMs: options?.background ? 8000 : 30000
    })
    return Array.isArray(res?.data) ? res.data : []
  },
  getPlatformCatalog: async (options?: { background?: boolean }) => {
    const res = await request<{ success: boolean; data: ApiProduct[] }>('/products/platform-catalog', {
      skipAuthRedirect: options?.background === true
    })
    return Array.isArray(res?.data) ? res.data : []
  },
  sync: (items: ApiProduct[], options?: { replace?: boolean; background?: boolean }) =>
    request<{ success: boolean; data: ApiProduct[]; message?: string }>('/products/sync', {
      method: 'POST',
      body: JSON.stringify({ items, replace: options?.replace === true }),
      skipAuthRedirect: options?.background === true,
      timeoutMs: options?.background ? 60000 : 120000
    }),
  delete: (id: number) =>
    request<{ success: boolean; message: string }>(`/products/${id}`, {
      method: 'DELETE'
    })
}

export const complianceApi = {
  getRetentionPolicy: () =>
    request<{ success: boolean; data: { minRetentionYears: number; minRetentionDays: number } }>(
      '/compliance/retention-policy'
    ),
  validatePartner: (partnerType: string, partnerId: number) =>
    request<{ success: boolean; data: { valid: boolean; errors: string[]; warnings: string[] } }>(
      `/compliance/validate-partner?partnerType=${partnerType}&partnerId=${partnerId}`
    ),
  getUdiTrace: (params: { udiCode?: string; batchNo?: string }) => {
    const query = new URLSearchParams()
    if (params.udiCode) query.set('udiCode', params.udiCode)
    if (params.batchNo) query.set('batchNo', params.batchNo)
    return request<{ success: boolean; data: unknown[] }>(`/compliance/udi-trace?${query}`)
  },
  appendUdiTrace: (data: Record<string, unknown>) =>
    request<{ success: boolean; data: unknown }>('/compliance/udi-trace', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  recordColdChain: (data: Record<string, unknown>) =>
    request<{ success: boolean; data: unknown }>('/compliance/cold-chain', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  listNonConforming: () =>
    request<{ success: boolean; data: unknown[] }>('/compliance/non-conforming'),
  isolateNonConforming: (data: Record<string, unknown>) =>
    request<{ success: boolean; data: unknown }>('/compliance/non-conforming/isolate', {
      method: 'POST',
      body: JSON.stringify(data)
    })
}