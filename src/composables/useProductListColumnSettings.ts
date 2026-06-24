import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

export type ProductListColumnDef = {
  key: string
  label: string
  prop: string
  align?: 'left' | 'center' | 'right'
  headerAlign?: 'left' | 'center' | 'right'
  sortable?: boolean
  required?: boolean
}

export const PRODUCT_LIST_COLUMN_DEFINITIONS: ProductListColumnDef[] = [
  { key: 'code', label: '商品编码', prop: 'code', align: 'right', headerAlign: 'right', sortable: true, required: true },
  { key: 'name', label: '商品名称', prop: 'name', sortable: true },
  { key: 'spec', label: '规格型号', prop: 'spec', sortable: true },
  { key: 'measureUnit', label: '单位', prop: 'measureUnit', align: 'center', headerAlign: 'center' },
  { key: 'manufacturer', label: '生产厂家', prop: 'manufacturer', sortable: true },
  { key: 'registrant', label: '注册人/备案人', prop: 'registrant', sortable: true },
  { key: 'brand', label: '品牌', prop: 'brand' },
  { key: 'category', label: '商品分类', prop: 'category' },
  { key: 'type', label: '商品类型', prop: 'type' },
  { key: 'licenseNo', label: '生产许可证号', prop: 'licenseNo', align: 'right', headerAlign: 'right' },
  { key: 'registerNo', label: '注册证号', prop: 'registerNo', align: 'right', headerAlign: 'right' },
  { key: 'udiCode', label: 'UDI码', prop: 'udiCode', align: 'right', headerAlign: 'right' },
  { key: 'medicalCode', label: '医保码', prop: 'medicalCode', align: 'right', headerAlign: 'right' },
  { key: 'medicalClass', label: '医保报销分类', prop: 'medicalClass' },
  { key: 'storageCondition', label: '储运条件', prop: 'storageCondition' },
  { key: 'medType', label: '医疗器械分类', prop: 'medType', align: 'center', headerAlign: 'center' },
  { key: 'source', label: '商品来源', prop: 'source', align: 'center', headerAlign: 'center' },
  { key: 'auditStatus', label: '审核状态', prop: 'auditStatus', align: 'center', headerAlign: 'center' },
  { key: 'status', label: '状态', prop: 'status', align: 'center', headerAlign: 'center' },
  { key: 'auditTime', label: '审核时间', prop: 'auditTime', align: 'right', headerAlign: 'right' }
]

export const DEFAULT_PRODUCT_LIST_COLUMN_KEYS = [
  ...new Set(PRODUCT_LIST_COLUMN_DEFINITIONS.map(col => col.key))
]

export const CATEGORY_SORT_EXCLUDED_KEYS = new Set([
  'code',
  'auditTime',
  'auditStatus',
  'status',
  'source'
])

export function isCategorySortEligibleColumn(key: string): boolean {
  return PRODUCT_LIST_COLUMN_DEFINITIONS.some(col => col.key === key)
    && !CATEGORY_SORT_EXCLUDED_KEYS.has(key)
}

export function getCategorySortColumnLabel(key: string): string {
  return PRODUCT_LIST_COLUMN_DEFINITIONS.find(col => col.key === key)?.label ?? key
}

export function getCategorySortColumnDef(key: string): ProductListColumnDef | undefined {
  return PRODUCT_LIST_COLUMN_DEFINITIONS.find(col => col.key === key)
}

export const DEFAULT_PRODUCT_CATEGORY_SORT_TYPES = ['manufacturer', 'brand', 'name', 'type']

export function useProductListColumnSettings(storagePrefix: string) {
  const CONFIG_KEY = `${storagePrefix}-column-config`
  const ORDER_KEY = `${storagePrefix}-column-order`
  const CATEGORY_SORT_KEY = `${storagePrefix}-category-sort-types`

  const showColumnSelector = ref(false)
  const columnOptions = ref<ProductListColumnDef[]>([...PRODUCT_LIST_COLUMN_DEFINITIONS])
  const visibleColumns = ref<Set<string>>(new Set(DEFAULT_PRODUCT_LIST_COLUMN_KEYS))
  const selectedColumns = ref<string[]>([...DEFAULT_PRODUCT_LIST_COLUMN_KEYS])
  const enabledCategorySortTypes = ref<string[]>([...DEFAULT_PRODUCT_CATEGORY_SORT_TYPES])
  const selectedCategorySortTypes = ref<string[]>([...DEFAULT_PRODUCT_CATEGORY_SORT_TYPES])
  const dragIndex = ref(-1)
  const categorySortDragIndex = ref(-1)
  const categorySortDragPanel = ref<'available' | 'selected' | null>(null)

  const sortedVisibleColumns = computed(() =>
    columnOptions.value.filter(col => visibleColumns.value.has(col.key))
  )

  const tableColumnRenderKey = computed(() =>
    sortedVisibleColumns.value.map(col => col.key).join(',')
  )

  const availableCategorySortColumns = computed(() =>
    PRODUCT_LIST_COLUMN_DEFINITIONS.filter(col =>
      isCategorySortEligibleColumn(col.key) && !selectedCategorySortTypes.value.includes(col.key)
    )
  )

  const selectedCategorySortColumnDefs = computed(() =>
    selectedCategorySortTypes.value
      .map(key => getCategorySortColumnDef(key))
      .filter(Boolean) as ProductListColumnDef[]
  )

  const normalizeCategorySortTypes = (values: unknown): string[] => {
    if (!Array.isArray(values)) return [...DEFAULT_PRODUCT_CATEGORY_SORT_TYPES]
    const normalized = values.filter(
      (value): value is string => typeof value === 'string' && isCategorySortEligibleColumn(value)
    )
    return normalized.length ? [...new Set(normalized)] : [...DEFAULT_PRODUCT_CATEGORY_SORT_TYPES]
  }

  const addCategorySortColumn = (key: string) => {
    if (!isCategorySortEligibleColumn(key) || selectedCategorySortTypes.value.includes(key)) return
    selectedCategorySortTypes.value.push(key)
  }

  const removeCategorySortColumn = (key: string) => {
    selectedCategorySortTypes.value = selectedCategorySortTypes.value.filter(item => item !== key)
  }

  const handleCategorySortDragStart = (
    event: DragEvent,
    panel: 'available' | 'selected',
    index: number
  ) => {
    categorySortDragPanel.value = panel
    categorySortDragIndex.value = index
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', `${panel}:${index}`)
    }
  }

  const handleCategorySortDragOver = (event: DragEvent) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  const handleCategorySortDropOnSelected = (event: DragEvent, index: number) => {
    event.preventDefault()
    if (categorySortDragPanel.value === 'available' && categorySortDragIndex.value >= 0) {
      const col = availableCategorySortColumns.value[categorySortDragIndex.value]
      if (col) {
        const items = [...selectedCategorySortTypes.value]
        items.splice(index, 0, col.key)
        selectedCategorySortTypes.value = [...new Set(items)]
      }
    } else if (categorySortDragPanel.value === 'selected' && categorySortDragIndex.value >= 0) {
      const items = [...selectedCategorySortTypes.value]
      const dragKey = items[categorySortDragIndex.value]
      if (dragKey == null) return
      items.splice(categorySortDragIndex.value, 1)
      const targetIndex = categorySortDragIndex.value < index ? index - 1 : index
      items.splice(targetIndex, 0, dragKey)
      selectedCategorySortTypes.value = items
    }
    categorySortDragIndex.value = -1
    categorySortDragPanel.value = null
  }

  const handleCategorySortDropOnSelectedList = (event: DragEvent) => {
    event.preventDefault()
    if (categorySortDragPanel.value === 'available' && categorySortDragIndex.value >= 0) {
      const col = availableCategorySortColumns.value[categorySortDragIndex.value]
      if (col) addCategorySortColumn(col.key)
    } else if (categorySortDragPanel.value === 'selected' && categorySortDragIndex.value >= 0) {
      const items = [...selectedCategorySortTypes.value]
      const dragKey = items.splice(categorySortDragIndex.value, 1)[0]
      if (dragKey) items.push(dragKey)
      selectedCategorySortTypes.value = items
    }
    categorySortDragIndex.value = -1
    categorySortDragPanel.value = null
  }

  const initCategorySortConfig = () => {
    const saved = localStorage.getItem(CATEGORY_SORT_KEY)
    if (!saved) {
      enabledCategorySortTypes.value = [...DEFAULT_PRODUCT_CATEGORY_SORT_TYPES]
      selectedCategorySortTypes.value = [...DEFAULT_PRODUCT_CATEGORY_SORT_TYPES]
      return
    }
    try {
      const parsed = normalizeCategorySortTypes(JSON.parse(saved))
      enabledCategorySortTypes.value = parsed
      selectedCategorySortTypes.value = [...parsed]
    } catch {
      enabledCategorySortTypes.value = [...DEFAULT_PRODUCT_CATEGORY_SORT_TYPES]
      selectedCategorySortTypes.value = [...DEFAULT_PRODUCT_CATEGORY_SORT_TYPES]
    }
  }

  const initColumnConfig = () => {
    let orderKeys = PRODUCT_LIST_COLUMN_DEFINITIONS.map(col => col.key)
    let visibleKeys = [...DEFAULT_PRODUCT_LIST_COLUMN_KEYS]

    const savedOrder = localStorage.getItem(ORDER_KEY)
    if (savedOrder) {
      try {
        orderKeys = JSON.parse(savedOrder) as string[]
      } catch {
        /* ignore */
      }
    }

    const saved = localStorage.getItem(CONFIG_KEY)
    if (saved) {
      try {
        const parsed = (JSON.parse(saved) as string[]).filter(key =>
          PRODUCT_LIST_COLUMN_DEFINITIONS.some(col => col.key === key)
        )
        if (parsed.length) visibleKeys = parsed
      } catch {
        /* ignore */
      }
    }

    orderKeys = [...new Set(orderKeys.filter(key =>
      PRODUCT_LIST_COLUMN_DEFINITIONS.some(col => col.key === key)
    ))]
    visibleKeys = [...new Set(visibleKeys.filter(key =>
      PRODUCT_LIST_COLUMN_DEFINITIONS.some(col => col.key === key)
    ))]

    if (!visibleKeys.includes('measureUnit')) {
      const specIndex = visibleKeys.indexOf('spec')
      visibleKeys.splice(specIndex >= 0 ? specIndex + 1 : visibleKeys.length, 0, 'measureUnit')
    }
    if (!orderKeys.includes('measureUnit')) {
      const specOrderIndex = orderKeys.indexOf('spec')
      orderKeys.splice(specOrderIndex >= 0 ? specOrderIndex + 1 : orderKeys.length, 0, 'measureUnit')
    }

    const insertAfterManufacturer = (keys: string[]) => {
      if (keys.includes('registrant')) return keys
      const manufacturerIndex = keys.indexOf('manufacturer')
      keys.splice(manufacturerIndex >= 0 ? manufacturerIndex + 1 : keys.length, 0, 'registrant')
      return keys
    }
    insertAfterManufacturer(visibleKeys)
    insertAfterManufacturer(orderKeys)

    if (visibleKeys.length <= 1) {
      visibleKeys = [...DEFAULT_PRODUCT_LIST_COLUMN_KEYS]
      localStorage.removeItem(CONFIG_KEY)
      localStorage.removeItem(ORDER_KEY)
    }

    const ordered = orderKeys
      .map(key => PRODUCT_LIST_COLUMN_DEFINITIONS.find(col => col.key === key))
      .filter(Boolean) as ProductListColumnDef[]
    const missing = PRODUCT_LIST_COLUMN_DEFINITIONS.filter(col => !orderKeys.includes(col.key))
    columnOptions.value = [...ordered, ...missing]

    visibleColumns.value = new Set(visibleKeys)
    selectedColumns.value = [...visibleKeys]
  }

  const openColumnSettings = () => {
    selectedColumns.value = sortedVisibleColumns.value.map(col => col.key)
    selectedCategorySortTypes.value = [...enabledCategorySortTypes.value]
    showColumnSelector.value = true
  }

  const handleColumnDragStart = (event: DragEvent, index: number) => {
    dragIndex.value = index
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', String(index))
    }
  }

  const handleColumnDragOver = (event: DragEvent) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  const handleColumnDrop = (event: DragEvent, index: number) => {
    event.preventDefault()
    if (dragIndex.value !== -1 && dragIndex.value !== index) {
      const items = [...columnOptions.value]
      const dragItem = items[dragIndex.value]
      items.splice(dragIndex.value, 1)
      items.splice(index, 0, dragItem)
      columnOptions.value = items
    }
    dragIndex.value = -1
  }

  const confirmColumnSelection = () => {
    PRODUCT_LIST_COLUMN_DEFINITIONS
      .filter(col => col.required)
      .forEach(col => {
        if (!selectedColumns.value.includes(col.key)) {
          selectedColumns.value.push(col.key)
        }
      })

    if (selectedColumns.value.length === 0) {
      ElMessage.warning('请至少选择一列')
      return false
    }

    const normalizedCategorySortTypes = normalizeCategorySortTypes(selectedCategorySortTypes.value)
    if (normalizedCategorySortTypes.length === 0) {
      ElMessage.warning('请至少选择一种商品分类方式')
      return false
    }

    visibleColumns.value = new Set(selectedColumns.value)
    enabledCategorySortTypes.value = normalizedCategorySortTypes
    selectedCategorySortTypes.value = [...normalizedCategorySortTypes]
    localStorage.setItem(CONFIG_KEY, JSON.stringify(selectedColumns.value))
    localStorage.setItem(ORDER_KEY, JSON.stringify(columnOptions.value.map(col => col.key)))
    localStorage.setItem(CATEGORY_SORT_KEY, JSON.stringify(normalizedCategorySortTypes))
    showColumnSelector.value = false
    ElMessage.success('商品资料设置已保存')
    return true
  }

  initColumnConfig()
  initCategorySortConfig()

  return {
    showColumnSelector,
    columnOptions,
    selectedColumns,
    selectedCategorySortTypes,
    enabledCategorySortTypes,
    availableCategorySortColumns,
    selectedCategorySortColumnDefs,
    sortedVisibleColumns,
    tableColumnRenderKey,
    openColumnSettings,
    addCategorySortColumn,
    removeCategorySortColumn,
    handleCategorySortDragStart,
    handleCategorySortDragOver,
    handleCategorySortDropOnSelected,
    handleCategorySortDropOnSelectedList,
    handleColumnDragStart,
    handleColumnDragOver,
    handleColumnDrop,
    confirmColumnSelection
  }
}
