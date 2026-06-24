import { nextTick, ref } from 'vue'
import { createListSearchKeyboardHandlers } from '@/utils/erpFormKeyboard'
import { createEmptyProductSearchForm, type ProductListSearchForm } from '@/utils/productListFilter'

export const PRODUCT_LIST_SEARCH_FIELD_KEYS = [
  'codeName',
  'spec',
  'registrant',
  'auditStatus'
] as const

export const PLATFORM_PRODUCT_LIST_SEARCH_FIELD_KEYS = [
  'codeName',
  'spec',
  'registrant'
] as const

const LIST_SEARCH_FORM_SELECTOR = '.list-search-form'

function createProductListSearchKeyboard(
  fieldKeys: readonly string[],
  onSubmit: () => void
) {
  const suppressSelectAdvance = ref(false)

  const handlers = createListSearchKeyboardHandlers({
    formSelector: LIST_SEARCH_FORM_SELECTOR,
    fieldKeys,
    onSubmit,
    shouldSuppressAdvance: () => suppressSelectAdvance.value
  })

  const resetSearchFormSilently = (form: ProductListSearchForm) => {
    suppressSelectAdvance.value = true
    Object.assign(form, createEmptyProductSearchForm())
    nextTick(() => {
      suppressSelectAdvance.value = false
    })
  }

  return {
    ...handlers,
    resetSearchFormSilently
  }
}

export function useProductListSearchKeyboard(onSubmit: () => void) {
  return createProductListSearchKeyboard(PRODUCT_LIST_SEARCH_FIELD_KEYS, onSubmit)
}

export function usePlatformProductListSearchKeyboard(onSubmit: () => void) {
  return createProductListSearchKeyboard(PLATFORM_PRODUCT_LIST_SEARCH_FIELD_KEYS, onSubmit)
}
