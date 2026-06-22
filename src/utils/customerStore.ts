import type { PartnerDocument, PartnerProfileExtension } from '@/types/partnerProfile'

export const CUSTOMERS_KEY = 'customers'

export type CustomerDocument = PartnerDocument

export interface CustomerMaster extends PartnerProfileExtension {
  id: string
  code?: string
  name: string
  contact: string
  phone?: string
  mobile?: string
  email?: string
  type: string
  address?: string
  province?: string
  city?: string
  district?: string
  postalCode?: string
  creditCode?: string
  bankName?: string
  bankAccount?: string
  taxNo?: string
  legalPerson?: string
  registerCapital?: string
  businessScope?: string
  establishDate?: string
  remark?: string
  auditStatus: 'notAudited' | 'audited'
  status: 'normal' | 'disabled'
  createTime: string
  creator: string
  auditTime?: string
  auditor?: string
  documents?: CustomerDocument[]
  collaborationEnabled?: boolean
  [key: string]: unknown
}

export const defaultCustomers: CustomerMaster[] = [
  {
    id: 'CU202606001',
    code: 'CU202606001',
    name: '北京协和医院',
    contact: '张三',
    phone: '13900139000',
    mobile: '13800138000',
    email: 'zhang@xiehe.com',
    type: 'hospital',
    address: '北京市东城区东单北大街1号',
    province: '北京市',
    city: '东城区',
    postalCode: '100005',
    auditStatus: 'audited',
    status: 'normal',
    creditCode: '91110000101105375R',
    bankName: '工商银行北京分行',
    bankAccount: '6222020200012345678',
    taxNo: '110101101105375',
    createTime: '2026-06-15',
    creator: '系统管理员'
  },
  {
    id: 'CU202606002',
    code: 'CU202606002',
    name: '上海瑞金医院',
    contact: '李四',
    phone: '13900219000',
    mobile: '13800218000',
    email: 'li@ruijin.com',
    type: 'hospital',
    address: '上海市黄浦区瑞金二路197号',
    province: '上海市',
    city: '黄浦区',
    postalCode: '200025',
    auditStatus: 'audited',
    status: 'normal',
    creditCode: '91310000425011781Q',
    bankName: '建设银行上海分行',
    bankAccount: '6227002581234567890',
    taxNo: '310101425011781',
    createTime: '2026-06-14',
    creator: '系统管理员'
  },
  {
    id: 'CU202606003',
    code: 'CU202606003',
    name: '广州中山医院',
    contact: '王五',
    phone: '13900319000',
    mobile: '13800318000',
    email: 'wang@zsyy.com',
    type: 'hospital',
    address: '广州市越秀区中山二路58号',
    province: '广东省',
    city: '广州市',
    postalCode: '510080',
    auditStatus: 'notAudited',
    status: 'normal',
    creditCode: '91440000456067556J',
    bankName: '农业银行广州分行',
    bankAccount: '6228480080123456789',
    taxNo: '440101456067556',
    createTime: '2026-06-13',
    creator: '张三'
  },
  {
    id: 'CU202606004',
    code: 'CU202606004',
    name: '深圳医疗器械有限公司',
    contact: '赵六',
    phone: '13900419000',
    mobile: '13800418000',
    email: 'zhao@szdevice.com',
    type: 'deviceCompany',
    address: '深圳市南山区科技园路8号',
    province: '广东省',
    city: '深圳市',
    postalCode: '518057',
    auditStatus: 'audited',
    status: 'disabled',
    creditCode: '91440300724729974T',
    bankName: '招商银行深圳分行',
    bankAccount: '6225887890123456789',
    taxNo: '440301724729974',
    createTime: '2026-06-12',
    creator: '李四'
  },
  {
    id: 'CU202606005',
    code: 'CU202606005',
    name: '杭州大药房',
    contact: '钱七',
    phone: '13900519000',
    mobile: '13800518000',
    email: 'qian@hzdyf.com',
    type: 'pharmacy',
    address: '杭州市西湖区延安路500号',
    province: '浙江省',
    city: '杭州市',
    postalCode: '310006',
    auditStatus: 'audited',
    status: 'normal',
    creditCode: '91330100736028591X',
    bankName: '交通银行杭州分行',
    bankAccount: '6222620123456789012',
    taxNo: '330101736028591',
    createTime: '2026-06-11',
    creator: '王五'
  },
  {
    id: 'CU202606006',
    code: 'CU202606006',
    name: '成都华西诊所',
    contact: '孙八',
    phone: '13900619000',
    mobile: '13800618000',
    email: 'sun@huaxi.com',
    type: 'clinic',
    address: '成都市武侯区玉林路100号',
    province: '四川省',
    city: '成都市',
    postalCode: '610041',
    auditStatus: 'notAudited',
    status: 'normal',
    creditCode: '91510100MA61T2X61N',
    bankName: '中国银行成都分行',
    bankAccount: '6217850000123456789',
    taxNo: '510107MA61T2X61N',
    createTime: '2026-06-10',
    creator: '赵六'
  },
  {
    id: 'GX01671',
    code: 'GX01671',
    name: '广西可盟医疗科技有限公司',
    shortName: '广西可盟',
    pinyin: 'gxkmylkjyxgs',
    contact: '吴精华',
    phone: '',
    mobile: '',
    email: '',
    type: 'deviceCompany',
    address: '柳州市桂中大道南端2号阳光壹佰城市广场3栋11-16',
    province: '广西壮族自治区',
    city: '柳州市',
    district: '城中区',
    country: '中国',
    postalCode: '',
    auditStatus: 'notAudited',
    status: 'normal',
    creditCode: '91450200MA5QFK3G6Y',
    taxNo: '91450200MA5QFK3G6Y',
    taxRate: 0,
    bankName: '/',
    bankBranchNo: '/',
    bankAccount: '/',
    platformUser: '否',
    settlementPeriod: 0,
    enterpriseLeader: '吴精华',
    legalPerson: '吴精华',
    license: '桂柳食药监械经营备20210631号',
    createTime: '2026-06-21',
    creator: '小华哥',
    documents: [
      {
        id: 1,
        docKey: 'md_class2_business_filing',
        docName: '第二类医疗器械经营备案凭证',
        docNo: '桂柳食药监械经营备20210631号',
        issueDate: '',
        expireDate: '',
        status: '有效',
        validityNote: '',
        longTerm: true,
        sectionCode: '2.2',
        sectionTitle: '经营许可类'
      }
    ]
  }
]

function readCustomerListRaw(): CustomerMaster[] {
  const stored = localStorage.getItem(CUSTOMERS_KEY)
  if (!stored || stored === '[]') return []
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function loadCustomerList(): CustomerMaster[] {
  return readCustomerListRaw()
}

export function saveCustomerList(list: CustomerMaster[]): void {
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(list))
}

/** 加载客户列表，空库时写入默认演示数据；按编号补全缺失的默认客户 */
export function loadAndEnsureCustomerList(): CustomerMaster[] {
  const stored = readCustomerListRaw()
  const idSet = new Set(stored.map(item => item.id))
  const codeSet = new Set(stored.map(item => String(item.code || item.id)).filter(Boolean))
  const missing = defaultCustomers.filter(
    item => !idSet.has(item.id) && !codeSet.has(item.code || item.id)
  )
  const merged = missing.length ? [...missing, ...stored] : stored.length ? stored : [...defaultCustomers]

  if (stored.length === 0 || missing.length > 0) {
    saveCustomerList(merged)
  }

  return merged
}

export function getCustomerById(id: string): CustomerMaster | undefined {
  return loadCustomerList().find(c => c.id === id)
}

export function getCurrentUserName(): string {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return user.realName || user.username || user.name || '系统管理员'
  } catch {
    return '系统管理员'
  }
}

export function upsertCustomer(customer: CustomerMaster): void {
  const list = loadCustomerList()
  const index = list.findIndex(c => c.id === customer.id)
  const record: CustomerMaster = {
    ...customer,
    code: customer.code || customer.id
  }
  if (index >= 0) {
    list[index] = { ...list[index], ...record }
  } else {
    list.unshift(record)
  }
  saveCustomerList(list)
}

export function deleteCustomer(id: string): boolean {
  const list = loadCustomerList()
  const next = list.filter(c => c.id !== id)
  if (next.length === list.length) return false
  saveCustomerList(next)
  return true
}

export function setCustomerAuditStatus(
  id: string,
  audited: boolean
): CustomerMaster | undefined {
  const list = loadCustomerList()
  const index = list.findIndex(c => c.id === id)
  if (index < 0) return undefined

  const now = new Date().toLocaleString('zh-CN')
  const auditor = getCurrentUserName()
  list[index] = {
    ...list[index],
    auditStatus: audited ? 'audited' : 'notAudited',
    auditTime: audited ? now : '',
    auditor: audited ? auditor : ''
  }
  saveCustomerList(list)
  return list[index]
}

export function batchSetCustomerAuditStatus(
  ids: string[],
  audited: boolean
): CustomerMaster[] {
  const idSet = new Set(ids.map(String).filter(Boolean))
  if (idSet.size === 0) return loadCustomerList()

  const now = new Date().toLocaleString('zh-CN')
  const auditor = getCurrentUserName()
  const next = loadCustomerList().map(item => {
    if (!idSet.has(item.id)) return item
    return {
      ...item,
      auditStatus: audited ? 'audited' as const : 'notAudited' as const,
      auditTime: audited ? now : '',
      auditor: audited ? auditor : ''
    }
  })
  saveCustomerList(next)
  return next
}
