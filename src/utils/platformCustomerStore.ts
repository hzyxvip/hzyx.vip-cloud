import type { PartnerDocument, PartnerProfileExtension } from '@/types/partnerProfile'

export const PLATFORM_CUSTOMER_LIST_KEY = 'platformCustomerList'

export type PlatformCustomerDocument = PartnerDocument

export interface PlatformCustomer extends PartnerProfileExtension {
  id: number
  platformStatus: 'platformAudited' | 'platformNotAudited'
  companyCode: string
  companyName: string
  companyShortName: string
  companyType: string
  companyCategory: string
  pinyin: string
  contact: string
  phone: string
  email: string
  province: string
  city: string
  address: string
  companyIntro: string
  businessScope: string
  legalPerson: string
  registerCapital: string
  establishDate: string
  license: string
  licenseExpire: string
  taxId: string
  bank: string
  bankAccount: string
  documents: PlatformCustomerDocument[]
  platformUser: string
  createDate: string
  creator: string
  editor: string
  editDate: string
  remark: string
  recordStatus: string
  recordDate: string
}

export const companyTypeOptions = [
  { label: '全部', value: 'all', category: '', tripartite: '' },
  { label: '生产企业', value: 'manufacturer', category: '产', tripartite: '产' },
  { label: '经营公司', value: 'distributor', category: '销', tripartite: '销' },
  { label: '医疗机构', value: 'hospital', category: '用', tripartite: '用' }
]

export function getCompanyTripartiteLabel(type: string): string {
  return companyTypeOptions.find(item => item.value === type)?.tripartite || ''
}

export function getCompanyTypeLabel(type: string): string {
  return companyTypeOptions.find(item => item.value === type)?.label || ''
}

export const defaultPlatformCustomers: PlatformCustomer[] = [
  {
    id: 1,
    platformStatus: 'platformAudited',
    companyCode: 'GX00215',
    companyName: '广西梧州制药(集团)股份有限公司',
    companyShortName: '梧州制药',
    companyType: 'manufacturer',
    companyCategory: '产',
    pinyin: 'guangxiwuzhou',
    contact: '陈经理',
    phone: '0774-12345678',
    email: 'contact@gxwuzhou.com',
    province: '广西',
    city: '梧州市',
    address: '广西梧州市万秀区',
    companyIntro: '专业从事药品研发、生产与销售的大型制药企业。',
    businessScope: '药品生产、医疗器械销售',
    legalPerson: '',
    registerCapital: '',
    establishDate: '',
    license: '914504001991345678',
    licenseExpire: '2028-12-31',
    taxId: '450403199134567890',
    bank: '中国工商银行梧州分行',
    bankAccount: '6222022104001234567',
    documents: [],
    platformUser: '小李',
    createDate: '2026-06-15',
    creator: '小周',
    editor: '小周',
    editDate: '2026-06-15',
    remark: '',
    recordStatus: '是',
    recordDate: '2026-06-15'
  },
  {
    id: 2,
    platformStatus: 'platformAudited',
    companyCode: 'GX00216',
    companyName: '广西南宁医疗科技有限公司',
    companyShortName: '南宁医疗',
    companyType: 'distributor',
    companyCategory: '销',
    pinyin: 'nanningyiliao',
    contact: '李经理',
    phone: '0771-23456789',
    email: 'contact@nanningyiliao.com',
    province: '广西',
    city: '南宁市',
    address: '广西南宁市青秀区',
    companyIntro: '',
    businessScope: '',
    legalPerson: '',
    registerCapital: '',
    establishDate: '',
    license: '914501002992456789',
    licenseExpire: '2029-06-30',
    taxId: '450103299245678901',
    bank: '中国建设银行南宁分行',
    bankAccount: '6227003376002345678',
    documents: [],
    platformUser: '小李',
    createDate: '2026-06-14',
    creator: '小周',
    editor: '小周',
    editDate: '2026-06-14',
    remark: '',
    recordStatus: '是',
    recordDate: '2026-06-14'
  },
  {
    id: 3,
    platformStatus: 'platformAudited',
    companyCode: 'GX00217',
    companyName: '广西桂林医疗器械有限公司',
    companyShortName: '桂林医疗',
    companyType: 'distributor',
    companyCategory: '销',
    pinyin: 'guilinyl',
    contact: '王经理',
    phone: '0773-34567890',
    email: 'contact@guilinyiliao.com',
    province: '广西',
    city: '桂林市',
    address: '广西桂林市象山区',
    companyIntro: '',
    businessScope: '',
    legalPerson: '',
    registerCapital: '',
    establishDate: '',
    license: '914503003993567890',
    licenseExpire: '2028-09-30',
    taxId: '450305399356789012',
    bank: '中国银行桂林分行',
    bankAccount: '6217854500003456789',
    documents: [],
    platformUser: '小李',
    createDate: '2026-06-13',
    creator: '小周',
    editor: '小周',
    editDate: '2026-06-13',
    remark: '',
    recordStatus: '是',
    recordDate: '2026-06-13'
  },
  {
    id: 4,
    platformStatus: 'platformNotAudited',
    companyCode: 'GX00218',
    companyName: '浙江杭州医疗器械有限公司',
    companyShortName: '杭州医疗',
    companyType: 'manufacturer',
    companyCategory: '产',
    pinyin: 'hangzhouyl',
    contact: '张经理',
    phone: '0571-45678901',
    email: 'contact@hangzhouyl.com',
    province: '浙江',
    city: '杭州市',
    address: '浙江省杭州市西湖区',
    companyIntro: '',
    businessScope: '',
    legalPerson: '',
    registerCapital: '',
    establishDate: '',
    license: '913301004994678901',
    licenseExpire: '2027-12-31',
    taxId: '330106499467890123',
    bank: '中国农业银行杭州分行',
    bankAccount: '6228480402634567890',
    documents: [],
    platformUser: '小李',
    createDate: '2026-06-12',
    creator: '小周',
    editor: '小周',
    editDate: '2026-06-12',
    remark: '',
    recordStatus: '否',
    recordDate: ''
  },
  {
    id: 5,
    platformStatus: 'platformNotAudited',
    companyCode: 'GX01671',
    companyName: '广西可盟医疗科技有限公司',
    companyShortName: '广西可盟',
    companyType: 'distributor',
    companyCategory: '销',
    pinyin: 'gxkmylkjyxgs',
    taxRate: 0,
    contact: '吴精华',
    phone: '',
    mobile: '',
    email: '',
    country: '中国',
    province: '广西壮族自治区',
    city: '柳州市',
    district: '城中区',
    address: '柳州市桂中大道南端2号阳光壹佰城市广场3栋11-16',
    postalCode: '',
    legalPerson: '吴精华',
    enterpriseLeader: '吴精华',
    license: '桂柳食药监械经营备20210631号',
    taxId: '91450200MA5QFK3G6Y',
    bank: '/',
    bankBranchNo: '/',
    bankAccount: '/',
    platformUser: '否',
    settlementPeriod: 0,
    documents: [],
    createDate: '2026-06-21',
    creator: '小华哥',
    editor: '小华哥',
    editDate: '2026-06-21',
    remark: '',
    recordStatus: '否',
    recordDate: ''
  }
]

function readList(): PlatformCustomer[] {
  const raw = localStorage.getItem(PLATFORM_CUSTOMER_LIST_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeList(list: PlatformCustomer[]): void {
  localStorage.setItem(PLATFORM_CUSTOMER_LIST_KEY, JSON.stringify(list))
}

export function loadPlatformCustomerList(): PlatformCustomer[] {
  const stored = readList()
  const codeSet = new Set(stored.map(item => item.companyCode).filter(Boolean))
  const missing = defaultPlatformCustomers.filter(item => !codeSet.has(item.companyCode))
  const source = stored.length > 0
    ? (missing.length ? [...missing, ...stored] : stored)
    : defaultPlatformCustomers

  const normalized = source.map(item => ({
    ...item,
    companyIntro: item.companyIntro || '',
    businessScope: item.businessScope || '',
    legalPerson: item.legalPerson || '',
    registerCapital: item.registerCapital || '',
    establishDate: item.establishDate || '',
    documents: Array.isArray(item.documents) ? item.documents : []
  }))

  if (stored.length === 0 || missing.length > 0) {
    writeList(normalized)
  }
  return normalized
}

export function savePlatformCustomerList(list: PlatformCustomer[]): void {
  writeList(list)
}

export function findPlatformCustomerById(id: number | string): PlatformCustomer | undefined {
  const key = String(id)
  return loadPlatformCustomerList().find(item => String(item.id) === key)
}

export function getCompanyCategory(type: string): string {
  const option = companyTypeOptions.find(item => item.value === type)
  if (option) return option.category
  if (type === 'research') return '用'
  return ''
}

export function formatToday(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
