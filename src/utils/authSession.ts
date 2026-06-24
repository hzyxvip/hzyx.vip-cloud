const AUTH_KEYS = ['token', 'user', 'userRole', 'userPermissions', 'currentCompanyId'] as const

type AuthKey = (typeof AUTH_KEYS)[number]

/** 登录态按浏览器标签页隔离，同一浏览器可开 admin / demo 两个标签互不影响 */
function readAuthStorage(key: AuthKey): string | null {
  return sessionStorage.getItem(key) ?? localStorage.getItem(key)
}

function writeAuthStorage(key: AuthKey, value: string) {
  sessionStorage.setItem(key, value)
  localStorage.removeItem(key)
}

function removeAuthStorage(key: AuthKey) {
  sessionStorage.removeItem(key)
  localStorage.removeItem(key)
}

export function getAuthToken(): string | null {
  return readAuthStorage('token')
}

export function isLoggedIn(): boolean {
  return !!getAuthToken()
}

export function getAuthUser<T = Record<string, unknown>>(): T | null {
  const raw = readAuthStorage('user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function getAuthRole(): string {
  return readAuthStorage('userRole') || ''
}

export function getAuthCompanyId(): number | null {
  const raw = readAuthStorage('currentCompanyId')
  if (!raw) return null
  const id = Number(raw)
  return Number.isFinite(id) ? id : null
}

export function saveAuthSession(payload: {
  token: string
  user: Record<string, unknown>
  role: string
  permissions: string[]
  companyId: number
}) {
  writeAuthStorage('token', payload.token)
  writeAuthStorage('user', JSON.stringify(payload.user))
  writeAuthStorage('userRole', payload.role)
  writeAuthStorage('userPermissions', JSON.stringify(payload.permissions))
  writeAuthStorage('currentCompanyId', String(payload.companyId))
}

export function clearAuthSession() {
  AUTH_KEYS.forEach(removeAuthStorage)
}

/** 将旧版 localStorage 登录态迁移到 sessionStorage（仅当前标签） */
export function migrateLegacyAuthToSession() {
  AUTH_KEYS.forEach(key => {
    const legacy = localStorage.getItem(key)
    if (legacy != null && sessionStorage.getItem(key) == null) {
      sessionStorage.setItem(key, legacy)
    }
    localStorage.removeItem(key)
  })
}

export function getAuthPermissions(): string[] {
  const raw = readAuthStorage('userPermissions')
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}
