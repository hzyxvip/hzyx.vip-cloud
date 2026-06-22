/** 平台运营主体（非平台上的入驻客户） */
export const PLATFORM_COMPANY_CODE = 'ADMIN'
export const PLATFORM_COMPANY_NAME = '杭州医享医疗科技有限公司'

export const isPlatformCompanyRecord = (company?: {
  code?: string
  companyType?: string
  id?: number
} | null): boolean => {
  if (!company) return false
  if (company.code === PLATFORM_COMPANY_CODE) return true
  if (company.companyType === 'platform') return true
  return company.id === 1
}
