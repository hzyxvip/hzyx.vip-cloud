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
  { key: 'manufacturer', label: '生产厂家', prop: 'manufacturer', sortable: true },
  { key: 'brand', label: '品牌', prop: 'brand' },
  { key: 'category', label: '商品分类', prop: 'category' },
  { key: 'type', label: '商品类型', prop: 'type' },
  { key: 'licenseNo', label: '生产许可证号', prop: 'licenseNo', align: 'right', headerAlign: 'right' },
  { key: 'registerNo', label: '注册证号', prop: 'registerNo', align: 'right', headerAlign: 'right' },
  { key: 'udiCode', label: 'UDI码', prop: 'udiCode', align: 'right', headerAlign: 'right' },
  { key: 'medicalCode', label: '医保码', prop: 'medicalCode', align: 'right', headerAlign: 'right' },
  { key: 'medicalClass', label: '医保报销分类', prop: 'medicalClass' },
  { key: 'measureUnit', label: '计量单位', prop: 'measureUnit' },
  { key: 'storageCondition', label: '储运条件', prop: 'storageCondition' },
  { key: 'medType', label: '医疗器械分类', prop: 'medType', align: 'center', headerAlign: 'center' },
  { key: 'source', label: '商品来源', prop: 'source', align: 'center', headerAlign: 'center' },
  { key: 'auditStatus', label: '审核状态', prop: 'auditStatus', align: 'center', headerAlign: 'center' },
  { key: 'status', label: '状态', prop: 'status', align: 'center', headerAlign: 'center' },
  { key: 'auditTime', label: '审核时间', prop: 'auditTime', align: 'right', headerAlign: 'right' }
]

export const DEFAULT_PRODUCT_LIST_COLUMN_KEYS = PRODUCT_LIST_COLUMN_DEFINITIONS.map(col => col.key)

export function useProductListColumnSettings(storagePrefix: string) {
  const CONFIG_KEY = `${storagePrefix}-column-config`
  const ORDER_KEY = `${storagePrefix}-column-order`

  const showColumnSelector = ref(false)
  const columnOptions = ref<ProductListColumnDef[]>([...PRODUCT_LIST_COLUMN_DEFINITIONS])
  const visibleColumns = ref<Set<string>>(new Set(DEFAULT_PRODUCT_LIST_COLUMN_KEYS))
  const selectedColumns = ref<string[]>([...DEFAULT_PRODUCT_LIST_COLUMN_KEYS])
  const dragIndex = ref(-1)

  const sortedVisibleColumns = computed(() =>
    columnOptions.value.filter(col => visibleColumns.value.has(col.key))
  )

  const tableColumnRenderKey = computed(() =>
    sortedVisibleColumns.value.map(col => col.key).join(',')
  )

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

    orderKeys = orderKeys.filter(key =>
      PRODUCT_LIST_COLUMN_DEFINITIONS.some(col => col.key === key)
    )
    visibleKeys = visibleKeys.filter(key =>
      PRODUCT_LIST_COLUMN_DEFINITIONS.some(col => col.key === key)
    )

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
      return
    }
    visibleColumns.value = new Set(selectedColumns.value)
    localStorage.setItem(CONFIG_KEY, JSON.stringify(selectedColumns.value))
    localStorage.setItem(ORDER_KEY, JSON.stringify(columnOptions.value.map(col => col.key)))
    showColumnSelector.value = false
    ElMessage.success('商品资料设置已保存')
  }

  initColumnConfig()

  return {
    showColumnSelector,
    columnOptions,
    selectedColumns,
    sortedVisibleColumns,
    tableColumnRenderKey,
    openColumnSettings,
    handleColumnDragStart,
    handleColumnDragOver,
    handleColumnDrop,
    confirmColumnSelection
  }
}
