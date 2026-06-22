import type { Company, Warehouse, Location, User } from './dataStore'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const getToken = () => localStorage.getItem('token')

const request = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  }
  
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers
  })

  if (response.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userPermissions')
    localStorage.removeItem('currentCompanyId')
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
    throw new Error('登录已过期，请重新登录')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || '请求失败')
  }

  return response.json()
}

export const authApi = {
  login: (data: { username: string; password: string }) => 
    request<{ success: boolean; token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
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