import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

export type LicenseValidityColumnDef = {
  key: string
  label: string
  required?: boolean
}

export const LICENSE_VALIDITY_COLUMN_DEFINITIONS: LicenseValidityColumnDef[] = [
  { key: 'id', label: '序号', required: true },
  { key: 'module', label: '企业类型', required: true },
  { key: 'docName', label: '证件名称', required: true },
  { key: 'category', label: '分类' },
  { key: 'scope', label: '适用范围' },
  { key: 'validityLabel', label: '有效期' },
  { key: 'renewalRequirement', label: '到期延续要求' },
  { key: 'docKey', label: '关联证照Key' },
  { key: 'status', label: '状态' }
]

export const DEFAULT_LICENSE_VALIDITY_COLUMN_KEYS = [
  'id',
  'module',
  'docName',
  'validityLabel',
  'renewalRequirement',
  'docKey',
  'status'
]

export function useLicenseValidityColumnSettings(storagePrefix = 'license-validity-list') {
  const CONFIG_KEY = `${storagePrefix}-column-config`
  const ORDER_KEY = `${storagePrefix}-column-order`

  const showColumnSelector = ref(false)
  const columnOptions = ref<LicenseValidityColumnDef[]>([...LICENSE_VALIDITY_COLUMN_DEFINITIONS])
  const visibleColumns = ref<Set<string>>(new Set(DEFAULT_LICENSE_VALIDITY_COLUMN_KEYS))
  const selectedColumns = ref<string[]>([...DEFAULT_LICENSE_VALIDITY_COLUMN_KEYS])
  const dragIndex = ref(-1)

  const sortedVisibleColumns = computed(() =>
    columnOptions.value.filter(col => visibleColumns.value.has(col.key))
  )

  const tableColumnRenderKey = computed(() =>
    sortedVisibleColumns.value.map(col => col.key).join(',')
  )

  const initColumnConfig = () => {
    let orderKeys = LICENSE_VALIDITY_COLUMN_DEFINITIONS.map(col => col.key)
    let visibleKeys = [...DEFAULT_LICENSE_VALIDITY_COLUMN_KEYS]

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
          LICENSE_VALIDITY_COLUMN_DEFINITIONS.some(col => col.key === key)
        )
        if (parsed.length) visibleKeys = parsed
      } catch {
        /* ignore */
      }
    }

    orderKeys = orderKeys.filter(key =>
      LICENSE_VALIDITY_COLUMN_DEFINITIONS.some(col => col.key === key)
    )
    visibleKeys = visibleKeys.filter(key =>
      LICENSE_VALIDITY_COLUMN_DEFINITIONS.some(col => col.key === key)
    )

    LICENSE_VALIDITY_COLUMN_DEFINITIONS.filter(col => col.required).forEach(col => {
      if (!visibleKeys.includes(col.key)) visibleKeys.push(col.key)
    })

    if (visibleKeys.length <= 1) {
      visibleKeys = [...DEFAULT_LICENSE_VALIDITY_COLUMN_KEYS]
      localStorage.removeItem(CONFIG_KEY)
      localStorage.removeItem(ORDER_KEY)
    }

    const ordered = orderKeys
      .map(key => LICENSE_VALIDITY_COLUMN_DEFINITIONS.find(col => col.key === key))
      .filter(Boolean) as LicenseValidityColumnDef[]
    const missing = LICENSE_VALIDITY_COLUMN_DEFINITIONS.filter(col => !orderKeys.includes(col.key))
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
    LICENSE_VALIDITY_COLUMN_DEFINITIONS.filter(col => col.required).forEach(col => {
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
    ElMessage.success('列表设置已保存')
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
