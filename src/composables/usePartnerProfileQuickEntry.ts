import { ref, type Ref } from 'vue'
import { OfficeBuilding, Briefcase, Postcard } from '@element-plus/icons-vue'

export const PARTNER_PROFILE_QUICK_ENTRY_ITEMS = [
  {
    key: 'intro',
    label: '企业简介',
    desc: '企业简介、主营业务与服务优势',
    icon: OfficeBuilding,
    tone: 'intro'
  },
  {
    key: 'investment',
    label: '招商信息',
    desc: '平台用户、备案与招商备注',
    icon: Briefcase,
    tone: 'investment'
  },
  {
    key: 'license',
    label: '企业证照',
    desc: '证照资料上传与有效期管理',
    icon: Postcard,
    tone: 'license'
  }
] as const

export type PartnerProfileQuickEntryKey = (typeof PARTNER_PROFILE_QUICK_ENTRY_ITEMS)[number]['key']

export function usePartnerProfileQuickEntry() {
  const introSectionRef = ref<HTMLElement | null>(null)
  const investmentSectionRef = ref<HTMLElement | null>(null)
  const licenseSectionRef = ref<HTMLElement | null>(null)

  const sectionRefMap: Record<PartnerProfileQuickEntryKey, Ref<HTMLElement | null>> = {
    intro: introSectionRef,
    investment: investmentSectionRef,
    license: licenseSectionRef
  }

  const scrollToSection = (key: PartnerProfileQuickEntryKey) => {
    sectionRefMap[key].value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return {
    PARTNER_PROFILE_QUICK_ENTRY_ITEMS,
    introSectionRef,
    investmentSectionRef,
    licenseSectionRef,
    scrollToSection
  }
}
