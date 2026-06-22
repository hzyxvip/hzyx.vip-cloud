import { PLATFORM_COMPANY_NAME } from '@/constants/platformCompany'

export const DEMO_COMPANY_NAME = '医疗器械经营公司'

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

export const LOGIN_DEMO_ACCOUNTS = [
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
    hint: `${DEMO_COMPANY_NAME} · 企业管理员`
  }
] as const

export const REMEMBER_USERNAME_KEY = 'login-remember-username'
