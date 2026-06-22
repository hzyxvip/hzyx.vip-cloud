export const PARTNER_PROFILE_TABS = [
  { label: '企业介绍', value: 'intro' },
  { label: '基本信息', value: 'basic' },
  { label: '招商信息', value: 'investment' },
  { label: '企业证照', value: 'license' }
] as const

export type PartnerProfileTab = (typeof PARTNER_PROFILE_TABS)[number]['value']

export const DEFAULT_PARTNER_PROFILE_TAB: PartnerProfileTab = 'intro'

/** 平台客户资料：企业简介 + 招商 + 证照 */
export const PLATFORM_CUSTOMER_PROFILE_TABS = [
  { label: '企业简介', value: 'profile' },
  { label: '招商信息', value: 'investment' },
  { label: '企业证照', value: 'license' }
] as const

export type PlatformCustomerProfileTab = (typeof PLATFORM_CUSTOMER_PROFILE_TABS)[number]['value']

export const DEFAULT_PLATFORM_CUSTOMER_PROFILE_TAB: PlatformCustomerProfileTab = 'profile'
