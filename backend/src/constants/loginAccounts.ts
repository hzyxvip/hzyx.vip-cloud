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

export const PLATFORM_BOSS_ROLES = ['admin', 'platform_admin'] as const
