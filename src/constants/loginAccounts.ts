import { PLATFORM_COMPANY_NAME } from '@/constants/platformCompany'

export const DEMO_COMPANY_NAME = '医疗器械经营公司'
export const MANUFACTURER_COMPANY_NAME = '医疗器械生产有限公司'

export const PLATFORM_ADMIN_ACCOUNT = {
  username: 'admin',
  password: 'admin123',
  realName: '平台BOSS',
  role: 'admin',
  companyName: PLATFORM_COMPANY_NAME,
  companyCode: 'ADMIN'
} as const

export const DEMO_TENANT_ACCOUNT = {
  username: 'demo',
  password: 'demo123',
  realName: '演示管理员',
  role: 'company_admin',
  companyName: DEMO_COMPANY_NAME,
  companyCode: 'DEMO'
} as const

export const MANUFACTURER_TENANT_ACCOUNT = {
  username: 'factory',
  password: 'factory123',
  realName: '生产厂家管理员',
  role: 'company_admin',
  companyName: MANUFACTURER_COMPANY_NAME,
  companyCode: 'MFG'
} as const

export type LoginDemoAccount = {
  key: string
  label: string
  username: string
  password: string
  hint: string
  realName?: string
}

export const LOGIN_DEMO_ACCOUNTS: LoginDemoAccount[] = [
  {
    key: 'platform',
    label: '平台账号',
    ...PLATFORM_ADMIN_ACCOUNT,
    hint: `${PLATFORM_COMPANY_NAME} · 平台BOSS`
  },
  {
    key: 'tenant',
    label: '入驻客户',
    ...DEMO_TENANT_ACCOUNT,
    hint: `${DEMO_COMPANY_NAME} · 经营企业`
  },
  {
    key: 'manufacturer',
    label: '生产厂家',
    ...MANUFACTURER_TENANT_ACCOUNT,
    hint: `${MANUFACTURER_COMPANY_NAME} · 生产企业`
  }
] satisfies LoginDemoAccount[]

export const SEED_LOGIN_PASSWORD_BY_USERNAME: Record<string, string> = {
  [PLATFORM_ADMIN_ACCOUNT.username]: PLATFORM_ADMIN_ACCOUNT.password,
  [DEMO_TENANT_ACCOUNT.username]: DEMO_TENANT_ACCOUNT.password,
  [MANUFACTURER_TENANT_ACCOUNT.username]: MANUFACTURER_TENANT_ACCOUNT.password
}

export function getSeedLoginPassword(username: string): string {
  return SEED_LOGIN_PASSWORD_BY_USERNAME[username.trim()] || ''
}

export const REMEMBER_USERNAME_KEY = 'login-remember-username'
