import type { PlatformCustomerDocument } from '@/utils/platformCustomerStore'

export const PLATFORM_CUSTOMER_DRAFT_KEY = 'platformCustomerCreateDraft'

export interface PlatformCustomerDraft {
  form: Record<string, unknown>
  documents: PlatformCustomerDocument[]
  updatedAt: number
}

export function savePlatformCustomerDraft(draft: Omit<PlatformCustomerDraft, 'updatedAt'>) {
  const payload: PlatformCustomerDraft = {
    ...draft,
    updatedAt: Date.now()
  }
  sessionStorage.setItem(PLATFORM_CUSTOMER_DRAFT_KEY, JSON.stringify(payload))
}

export function loadPlatformCustomerDraft(): PlatformCustomerDraft | null {
  const raw = sessionStorage.getItem(PLATFORM_CUSTOMER_DRAFT_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PlatformCustomerDraft
    if (!parsed?.form || !Array.isArray(parsed.documents)) return null
    return parsed
  } catch {
    return null
  }
}

export function clearPlatformCustomerDraft() {
  sessionStorage.removeItem(PLATFORM_CUSTOMER_DRAFT_KEY)
}

export function getPlatformCustomerFormPath(isEdit: boolean, id?: string) {
  return isEdit && id ? `/platform/customer/edit/${id}` : '/platform/customer/create'
}

export function getPlatformCustomerInvestmentPath(isEdit: boolean, id?: string) {
  return isEdit && id
    ? `/platform/customer/edit/${id}/investment`
    : '/platform/customer/create/investment'
}

export function getPlatformCustomerLicensePath(isEdit: boolean, id?: string) {
  return isEdit && id
    ? `/platform/customer/edit/${id}/license`
    : '/platform/customer/create/license'
}
