export const PLATFORM_COMPANY_SEED = {
  code: 'ADMIN',
  name: '杭州医享医疗科技有限公司',
  companyType: 'platform',
  address: '浙江省杭州市滨江区某某路168号',
  phone: '0571-88888888',
  taxNo: '91330100MA2CXXXXXX',
  status: '启用'
} as const

export const DEMO_COMPANY_SEED = {
  code: 'DEMO',
  name: '医疗器械经营公司',
  companyType: 'distributor',
  address: '江苏省南京市鼓楼区中山北路100号',
  phone: '025-88888888',
  taxNo: '91320000MA1FL6XQ8R',
  status: '启用'
} as const

export const MANUFACTURER_COMPANY_SEED = {
  code: 'MFG',
  name: '医疗器械生产有限公司',
  companyType: 'manufacturer',
  address: '浙江省宁波市鄞州区创新大道88号',
  phone: '0574-66668888',
  taxNo: '91330200MA2HXXXXXX',
  status: '启用'
} as const

export const PLATFORM_ADMIN_ACCOUNT = {
  username: 'admin',
  password: 'admin123',
  realName: '平台BOSS',
  role: 'admin'
} as const

export const DEMO_TENANT_ACCOUNT = {
  username: 'demo',
  password: 'demo123',
  realName: '演示管理员',
  role: 'company_admin'
} as const

export const MANUFACTURER_TENANT_ACCOUNT = {
  username: 'factory',
  password: 'factory123',
  realName: '生产厂家管理员',
  role: 'company_admin'
} as const

export type SeedLoginAccount =
  | typeof PLATFORM_ADMIN_ACCOUNT
  | typeof DEMO_TENANT_ACCOUNT
  | typeof MANUFACTURER_TENANT_ACCOUNT

/** 种子账号用户名 → 演示密码（登录页快捷填入、后台展示用） */
export const SEED_LOGIN_PASSWORD_BY_USERNAME: Record<string, string> = {
  [PLATFORM_ADMIN_ACCOUNT.username]: PLATFORM_ADMIN_ACCOUNT.password,
  [DEMO_TENANT_ACCOUNT.username]: DEMO_TENANT_ACCOUNT.password,
  [MANUFACTURER_TENANT_ACCOUNT.username]: MANUFACTURER_TENANT_ACCOUNT.password
}

export const PLATFORM_BOSS_ROLES = ['admin', 'platform_admin'] as const
