/** 演示租户默认客户资料（与前端 customerStore.defaultCustomers 保持一致） */
export const DEMO_CUSTOMER_SEED = [
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
] as const
