// 公司信息配置
export interface CompanyInfo {
  name: string
  address: string
  phone: string
  fax: string
  email: string
  website: string
  businessLicense: string
  gspCertificate: string
  medicalDeviceLicense: string
  bankName: string
  bankAccount: string
  taxNo: string
}

const COMPANY_INFO_KEY = 'medical_platform_company_info'

const defaultCompanyInfo: CompanyInfo = {
  name: '杭州医享医疗科技有限公司',
  address: '浙江省杭州市滨江区某某路168号',
  phone: '0571-88888888',
  fax: '0571-88888889',
  email: 'info@yixiangyun.com',
  website: 'www.yixiangyun.com',
  businessLicense: '91330100MA2CXXXXXX',
  gspCertificate: '浙GSP证字2024XXXX号',
  medicalDeviceLicense: '浙械经营许2024XXXX号',
  bankName: '中国建设银行杭州滨江支行',
  bankAccount: '3305016XXXXXXXXXXXXXXX',
  taxNo: '91330100MA2CXXXXXX'
}

export const getCompanyInfo = (): CompanyInfo => {
  const stored = localStorage.getItem(COMPANY_INFO_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return { ...defaultCompanyInfo }
    }
  }
  return { ...defaultCompanyInfo }
}

export const setCompanyInfo = (info: Partial<CompanyInfo>): void => {
  const current = getCompanyInfo()
  const updated = { ...current, ...info }
  localStorage.setItem(COMPANY_INFO_KEY, JSON.stringify(updated))
}

export const resetCompanyInfo = (): void => {
  localStorage.setItem(COMPANY_INFO_KEY, JSON.stringify(defaultCompanyInfo))
}

export default {
  getCompanyInfo,
  setCompanyInfo,
  resetCompanyInfo
}
