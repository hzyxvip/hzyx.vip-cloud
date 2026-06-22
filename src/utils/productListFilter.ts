export const CATEGORY_ALL_ID = 0

export const isAllCategorySelected = (selectedCategoryId: number | null | undefined): boolean =>
  selectedCategoryId == null || selectedCategoryId === CATEGORY_ALL_ID

export const PRODUCT_TYPE_CATEGORY_MAP: Record<number, string[]> = {
  1: [
    '外科手术器械', '神经外科手术器械', '显微外科手术器械', '眼科手术器械',
    '耳鼻喉科手术器械', '口腔科手术器械', '胸腔心血管外科手术器械', '腹部外科手术器械',
    '泌尿肛肠外科手术器械', '骨科手术器械', '妇产科手术器械', '儿科手术器械'
  ],
  11: ['外科手术器械'],
  12: ['神经外科手术器械'],
  13: ['显微外科手术器械'],
  14: ['眼科手术器械'],
  15: ['耳鼻喉科手术器械'],
  16: ['口腔科手术器械'],
  17: ['胸腔心血管外科手术器械'],
  18: ['腹部外科手术器械'],
  19: ['泌尿肛肠外科手术器械'],
  110: ['骨科手术器械'],
  111: ['妇产科手术器械'],
  112: ['儿科手术器械'],
  2: ['消毒灭菌设备及器具'],
  21: ['消毒灭菌设备及器具'],
  3: ['医用卫生材料及敷料', '医用缝合材料和粘合剂', '医用高分子材料及制品'],
  31: ['医用卫生材料及敷料'],
  32: ['医用缝合材料和粘合剂'],
  33: ['医用高分子材料及制品'],
  4: ['介入器械'],
  41: ['介入器械'],
  5: ['手术室急救室诊疗室设备及器具'],
  51: ['手术室急救室诊疗室设备及器具'],
  6: ['医用电子仪器设备'],
  61: ['医用电子仪器设备'],
  7: ['医用光学器具仪器及内窥镜设备'],
  71: ['医用光学器具仪器及内窥镜设备'],
  8: ['医用超声仪器及有关设备'],
  81: ['医用超声仪器及有关设备'],
  9: ['体外诊断试剂'],
  91: ['体外诊断试剂']
}

export type SavedCategorySelection = {
  sortType: string
  id?: number
  name?: string
}

export function parseSavedCategorySelection(raw: string | null): SavedCategorySelection | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SavedCategorySelection
    if (parsed && typeof parsed.sortType === 'string') return parsed
  } catch {
    const legacyId = parseInt(raw, 10)
    if (!Number.isNaN(legacyId)) {
      return { sortType: 'type', id: legacyId }
    }
  }
  return null
}

export function findCategoryNameById(
  id: number,
  categories: Array<{ id: number; name: string; children?: Array<{ id: number; name: string }> }>
): string | null {
  for (const category of categories) {
    if (category.id === id) return category.name
    const child = category.children?.find(item => item.id === id)
    if (child) return child.name
  }
  return null
}

export function restoreSelectedCategoryId(
  sortType: string,
  categories: Array<{ id: number; name: string; children?: Array<{ id: number; name: string }> }>,
  savedRaw: string | null
): number | null {
  const saved = parseSavedCategorySelection(savedRaw)
  if (!saved || saved.sortType !== sortType) return null

  if (sortType === 'type') {
    if (saved.id != null && PRODUCT_TYPE_CATEGORY_MAP[saved.id]) {
      return saved.id
    }
    return null
  }

  if (saved.name) {
    const matched = categories.find(category => category.name === saved.name)
    if (matched) return matched.id
  }

  if (saved.id != null) {
    const exists = categories.some(category => category.id === saved.id)
    if (exists) return saved.id
  }

  return null
}

export function isValidCategorySelection(
  selectedCategoryId: number | null,
  sortType: string,
  categories: Array<{ id: number; name: string }>
): boolean {
  if (isAllCategorySelected(selectedCategoryId) || sortType === 'all') return true
  if (sortType === 'type') {
    return Boolean(PRODUCT_TYPE_CATEGORY_MAP[selectedCategoryId])
  }
  return categories.some(category => category.id === selectedCategoryId)
}

export type ProductListSearchForm = {
  codeName: string
  spec: string
  manufacturer: string
  brand: string
  type: string
  auditStatus: string
  status: string
}

const fieldContains = (value: unknown, keyword: string) => {
  const query = keyword.trim()
  if (!query) return true
  return String(value ?? '').toLowerCase().includes(query.toLowerCase())
}

/** 任一条件不满足则排除（排除法） */
export function matchesProductListSearch(
  item: Record<string, unknown>,
  searchForm: ProductListSearchForm
): boolean {
  const codeName = searchForm.codeName.trim()
  if (codeName && !fieldContains(item.code, codeName) && !fieldContains(item.name, codeName)) {
    return false
  }
  if (searchForm.spec.trim() && !fieldContains(item.spec, searchForm.spec)) return false
  if (searchForm.manufacturer.trim() && !fieldContains(item.manufacturer, searchForm.manufacturer)) return false
  if (searchForm.brand.trim() && !fieldContains(item.brand, searchForm.brand)) return false
  if (searchForm.type.trim() && !fieldContains(item.type, searchForm.type)) return false
  if (searchForm.auditStatus && String(item.auditStatus ?? '') !== searchForm.auditStatus) return false
  if (searchForm.status && String(item.status ?? '') !== searchForm.status) return false
  return true
}

export function filterProductsByCategorySelection(
  products: Record<string, unknown>[],
  options: {
    sortType: string
    selectedCategoryId: number | null
    categories: Array<{ id: number; name: string }>
  }
): Record<string, unknown>[] {
  const { sortType, selectedCategoryId, categories } = options
  if (sortType === 'all' || isAllCategorySelected(selectedCategoryId)) return products

  if (sortType === 'type') {
    const categoryNames = PRODUCT_TYPE_CATEGORY_MAP[selectedCategoryId]
    if (!categoryNames) return products
    const categoryItem = categories.find(category => category.id === selectedCategoryId)
    const parentName = categoryItem?.name
    return products.filter(item => {
      const productType = String(item.type ?? '')
      const productCategory = String(item.category ?? '')
      if (categoryNames.includes(productType) || categoryNames.includes(productCategory)) {
        return true
      }
      if (parentName && (productCategory.includes(parentName) || productType.includes(parentName))) {
        return true
      }
      return false
    })
  }

  const categoryField = sortType as 'manufacturer' | 'brand' | 'name'
  const categoryItem = categories.find(category => category.id === selectedCategoryId)
  if (!categoryItem) return products
  return products.filter(item => String(item[categoryField] ?? '') === categoryItem.name)
}

export function sortProductsByCategoryType(
  products: Record<string, unknown>[],
  sortType: string
): Record<string, unknown>[] {
  return [...products].sort((a, b) => {
    switch (sortType) {
      case 'all':
        return 0
      case 'type':
        return String(a.type ?? '').localeCompare(String(b.type ?? ''), 'zh-CN')
      case 'manufacturer':
        return String(a.manufacturer ?? '').localeCompare(String(b.manufacturer ?? ''), 'zh-CN')
      case 'brand':
        return String(a.brand ?? '').localeCompare(String(b.brand ?? ''), 'zh-CN')
      case 'name':
        return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'zh-CN')
      default:
        return 0
    }
  })
}

export function createEmptyProductSearchForm(): ProductListSearchForm {
  return {
    codeName: '',
    spec: '',
    manufacturer: '',
    brand: '',
    type: '',
    auditStatus: '',
    status: ''
  }
}

export function hasActiveProductSearch(searchForm: ProductListSearchForm): boolean {
  return Object.values(searchForm).some(value => String(value).trim())
}

export function mergeProductListWithDefaults<T extends { code?: string }>(
  stored: T[],
  defaults: T[]
): T[] {
  const codes = new Set(stored.map(item => String(item.code ?? '')).filter(Boolean))
  const missing = defaults.filter(item => item.code && !codes.has(String(item.code)))
  return missing.length ? [...stored, ...missing] : [...stored]
}

export type ProductColumnSortOrder = '' | 'ascending' | 'descending'

export function sortProductsByColumn(
  products: Record<string, unknown>[],
  prop: string,
  order: ProductColumnSortOrder
): Record<string, unknown>[] {
  if (!order) return [...products]

  return [...products].sort((a, b) => {
    const aVal = a[prop] ?? ''
    const bVal = b[prop] ?? ''
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return order === 'ascending'
        ? aVal.localeCompare(bVal, 'zh-CN')
        : bVal.localeCompare(aVal, 'zh-CN')
    }
    return order === 'ascending' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1)
  })
}

export function applyProductListFilters(
  allProducts: Record<string, unknown>[],
  searchForm: ProductListSearchForm,
  options: {
    sortType: string
    selectedCategoryId: number | null
    categories: Array<{ id: number; name: string }>
  }
): Record<string, unknown>[] {
  const byCategory = filterProductsByCategorySelection(allProducts, options)
  const matched = byCategory.filter(item => matchesProductListSearch(item, searchForm))
  return sortProductsByCategoryType(matched, options.sortType)
}
