export const DATA_PRODUCT_CREATE_DRAFT_KEY = 'dataProductCreateDraft'
export const PLATFORM_PRODUCT_CREATE_DRAFT_KEY = 'platformProductCreateDraft'

export interface ProductCreateDraft {
  formData: Record<string, unknown>
  auditStatus: 'pending' | 'approved' | 'rejected'
  fromPlatformPick: boolean
  updatedAt: number
}

export function saveProductCreateDraft(
  key: string,
  draft: Omit<ProductCreateDraft, 'updatedAt'>
): void {
  const payload: ProductCreateDraft = {
    ...draft,
    formData: JSON.parse(JSON.stringify(draft.formData)),
    updatedAt: Date.now()
  }
  sessionStorage.setItem(key, JSON.stringify(payload))
}

export function loadProductCreateDraft(key: string): ProductCreateDraft | null {
  const raw = sessionStorage.getItem(key)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ProductCreateDraft
    if (!parsed?.formData || typeof parsed.formData !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export function clearProductCreateDraft(key: string): void {
  sessionStorage.removeItem(key)
}
