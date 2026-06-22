export const PARTNER_PROFILE_TABS = [
  { label: '企业介绍', value: 'intro' },
  { label: '基本信息', value: 'basic' },
  { label: '招商信息', value: 'investment' },
  { label: '企业证照', value: 'license' }
] as const

export type PartnerProfileTab = (typeof PARTNER_PROFILE_TABS)[number]['value']

export const DEFAULT_PARTNER_PROFILE_TAB: PartnerProfileTab = 'intro'
