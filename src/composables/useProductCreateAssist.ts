import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  applyProductMasterToForm,
  autoSavePlatformProductUsage,
  findDuplicateProductByNameSpec,
  findSimilarRegistrants,
  getPlatformProductPickerOptions,
  normalizeEntityName,
  searchProductNameSuggestions,
  searchProductSpecSuggestions,
  searchRegistrantSuggestions,
  type ProductFormSuggestion
} from '@/utils/productFormAssist'
import { findPlatformProductByCode } from '@/utils/platformProductStore'
import { isPlatformOperator } from '@/utils/customerProductService'
import type { ProductMaster } from '@/utils/productStore'

export function useProductCreateAssist(
  formData: Record<string, unknown>,
  options: {
    isEditMode: () => boolean
    isAudited: () => boolean
    editCode?: () => string
  }
) {
  const selectedProductCode = ref('')
  const fromPlatformPick = ref(false)
  const duplicateProductWarning = ref('')
  const registrantWarning = ref('')
  const platformProductOptions = ref(getPlatformProductPickerOptions())

  const refreshPlatformOptions = () => {
    platformProductOptions.value = getPlatformProductPickerOptions()
  }

  onMounted(refreshPlatformOptions)

  const excludeCode = computed(() => (options.isEditMode() ? options.editCode?.() || '' : ''))

  const fetchNameSuggestions = (query: string, cb: (items: ProductFormSuggestion[]) => void) => {
    cb(searchProductNameSuggestions(query, { excludeCode: excludeCode.value }))
  }

  const fetchSpecSuggestions = (query: string, cb: (items: ProductFormSuggestion[]) => void) => {
    cb(
      searchProductSpecSuggestions(query, {
        productName: String(formData.name || ''),
        excludeCode: excludeCode.value
      })
    )
  }

  const fetchRegistrantSuggestions = (
    query: string,
    cb: (items: Array<{ value: string }>) => void
  ) => {
    cb(searchRegistrantSuggestions(query).map(item => ({ value: item.value })))
  }

  const applySuggestionToForm = (suggestion: ProductFormSuggestion, fillSpec = true) => {
    applyProductMasterToForm(formData, suggestion.product, {
      keepCode: options.isEditMode(),
      clearCodeOnNew: !options.isEditMode()
    })
    if (!fillSpec && suggestion.product.spec) {
      formData.spec = suggestion.product.spec
    }
    fromPlatformPick.value = false
    checkDuplicateProduct()
  }

  const handleNameSelect = (item: Record<string, unknown>) => {
    applySuggestionToForm(item as ProductFormSuggestion)
    ElMessage.success('已带出商品信息，可继续修改后保存')
  }

  const handleSpecSelect = (item: Record<string, unknown>) => {
    applySuggestionToForm(item as ProductFormSuggestion)
    ElMessage.success('已选择规格型号并带出关联信息')
  }

  const handleRegistrantSelect = (item: Record<string, unknown>) => {
    formData.registrant = String(item.value || '')
    registrantWarning.value = ''
  }

  const checkDuplicateProduct = () => {
    if (options.isEditMode()) {
      duplicateProductWarning.value = ''
      return
    }
    const duplicate = findDuplicateProductByNameSpec(
      String(formData.name || ''),
      String(formData.spec || ''),
      excludeCode.value
    )
    duplicateProductWarning.value = duplicate
      ? `商品列表中已存在相同名称与规格：${duplicate.code} ${duplicate.name}`
      : ''
  }

  const checkRegistrantSimilarity = async () => {
    if (options.isAudited()) return
    const input = String(formData.registrant || '').trim()
    if (!input) {
      registrantWarning.value = ''
      return
    }

    const exactMatches = searchRegistrantSuggestions(input).filter(item => item.exact)
    if (exactMatches.length) {
      formData.registrant = exactMatches[0].value
      registrantWarning.value = ''
      return
    }

    const similar = findSimilarRegistrants(input, {
      excludeNormalized: normalizeEntityName(input)
    })

    if (!similar.length) {
      registrantWarning.value = ''
      return
    }

    const names = similar.map(item => `「${item.name}」`).join('、')
    registrantWarning.value = `注册人/备案人名称与已有记录相似，可能重复：${names}`

    try {
      await ElMessageBox.confirm(
        `检测到与已有注册人/备案人相似的名称：${names}。是否改用已有名称？`,
        '可能重复',
        {
          confirmButtonText: '改用已有',
          cancelButtonText: '继续录入',
          type: 'warning'
        }
      )
      formData.registrant = similar[0].name
      registrantWarning.value = ''
    } catch {
      // 用户选择继续录入
    }
  }

  const handleSelectPlatformProduct = (code: string | null | undefined) => {
    if (!code) return
    applyPlatformProductSelection(code)
  }

  const applyPlatformProductRecord = (product: ProductMaster) => {
    applyProductMasterToForm(formData, product, { clearCodeOnNew: !options.isEditMode() })
    selectedProductCode.value = product.code
    fromPlatformPick.value = true
    autoSavePlatformProductUsage(product)
    refreshPlatformOptions()
    checkDuplicateProduct()
    registrantWarning.value = ''
    ElMessage.success('已引用平台商品，请核对后保存')
  }

  const applyPlatformProductSelection = (code: string) => {
    const product = findPlatformProductByCode(code) || platformProductOptions.value.find(p => p.code === code)
    if (!product) {
      ElMessage.warning('未找到该平台商品')
      return
    }
    applyPlatformProductRecord(product)
  }

  return {
    selectedProductCode,
    fromPlatformPick,
    duplicateProductWarning,
    registrantWarning,
    platformProductOptions,
    refreshPlatformOptions,
    fetchNameSuggestions,
    fetchSpecSuggestions,
    fetchRegistrantSuggestions,
    handleNameSelect,
    handleSpecSelect,
    handleRegistrantSelect,
    checkDuplicateProduct,
    checkRegistrantSimilarity,
    handleSelectPlatformProduct,
    applyPlatformProductSelection,
    applyPlatformProductRecord,
    isPlatformOperator
  }
}
