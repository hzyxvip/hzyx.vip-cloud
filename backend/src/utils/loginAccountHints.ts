import { User } from '../entities/User'
import { PLATFORM_BOSS_ROLES, SEED_LOGIN_PASSWORD_BY_USERNAME } from '../constants/loginAccounts'

const COMPANY_TYPE_LABELS: Record<string, string> = {
  platform: '平台',
  manufacturer: '生产企业',
  distributor: '经营企业',
  hospital: '医院'
}

export function getLoginAccountLabel(user: User): string {
  if (PLATFORM_BOSS_ROLES.includes(user.role as (typeof PLATFORM_BOSS_ROLES)[number])) {
    return '平台账号'
  }
  const companyType = user.company?.companyType || ''
  if (companyType === 'manufacturer') return '生产厂家'
  if (companyType === 'distributor') return '入驻客户'
  if (companyType === 'hospital') return '医院'
  return '企业账号'
}

export function getLoginAccountHint(user: User): string {
  const companyName = user.company?.name || '未知企业'
  const companyType = user.company?.companyType || ''
  const typeLabel = companyType === 'platform'
    ? '平台BOSS'
    : (COMPANY_TYPE_LABELS[companyType] || user.realName)
  return `${companyName} · ${typeLabel}`
}

export function buildLoginAccountEntry(user: User) {
  return {
    key: String(user.id),
    username: user.username,
    password: user.loginHintPassword || SEED_LOGIN_PASSWORD_BY_USERNAME[user.username] || '',
    label: getLoginAccountLabel(user),
    hint: getLoginAccountHint(user),
    realName: user.realName
  }
}
