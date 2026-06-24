import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

export type SalesOrderListColumnDef = {
  key: string
  label: string
  prop?: string
  align?: 'left' | 'center' | 'right'
  headerAlign?: 'left' | 'center' | 'right'
  required?: boolean
}

export const SALES_ORDER_LIST_COLUMN_DEFINITIONS: SalesOrderListColumnDef[] = [
  { key: 'orderNo', label: '订单号', required: true },
  { key: 'externalNo', label: '外部单号', prop: 'externalNo' },
  { key: 'customer', label: '客户', prop: 'customer' },
  { key: 'customerPlatformCode', label: '客户医享平台编号', prop: 'customerPlatformCode' },
  { key: 'warehouse', label: '仓库', prop: 'warehouse' },
  { key: 'date', label: '下单日期', prop: 'date' },
  { key: 'itemCount', label: '商品种类', prop: 'itemCount', align: 'center', headerAlign: 'center' },
  { key: 'amount', label: '成交金额', prop: 'amount', align: 'right', headerAlign: 'right' },
  { key: 'auditStatus', label: '审核状态', align: 'center', headerAlign: 'center' },
  { key: 'confirmStatus', label: '确定状态', align: 'center', headerAlign: 'center' },
  { key: 'executeStatus', label: '执行状态', align: 'center', headerAlign: 'center' },
  { key: 'warehouseStatus', label: '出库状态', align: 'center', headerAlign: 'center' },
  { key: 'closeStatus', label: '关闭状态', align: 'center', headerAlign: 'center' },
  { key: 'prepaymentStatus', label: '预收单据', align: 'center', headerAlign: 'center' },
  { key: 'receiveStatus', label: '接单状态', align: 'center', headerAlign: 'center' },
  { key: 'status', label: '状态', align: 'center', headerAlign: 'center' }
]

export const DEFAULT_SALES_ORDER_LIST_COLUMN_KEYS =
  SALES_ORDER_LIST_COLUMN_DEFINITIONS.map(col => col.key)

const NEW_LIST_COLUMNS: { key: string; after?: string }[] = [
  { key: 'externalNo', after: 'orderNo' },
  { key: 'customerPlatformCode', after: 'customer' },
  { key: 'confirmStatus', after: 'auditStatus' }
]

function insertColumnKey(keys: string[], key: string, after?: string) {
  if (keys.includes(key)) return
  if (after) {
    const index = keys.indexOf(after)
    if (index >= 0) {
      keys.splice(index + 1, 0, key)
      return
    }
  }
  keys.push(key)
}

function migrateColumnKeys(keys: string[]) {
  const merged = [...keys]
  let changed = false
  NEW_LIST_COLUMNS.forEach(({ key, after }) => {
    if (!merged.includes(key)) {
      insertColumnKey(merged, key, after)
      changed = true
    }
  })
  return { merged, changed }
}

export function useSalesOrderListColumnSettings(storagePrefix = 'sales-order-list') {
  const CONFIG_KEY = `${storagePrefix}-column-config`
  const ORDER_KEY = `${storagePrefix}-column-order`

  const showColumnSelector = ref(false)
  const columnOptions = ref<SalesOrderListColumnDef[]>([...SALES_ORDER_LIST_COLUMN_DEFINITIONS])
  const visibleColumns = ref<Set<string>>(new Set(DEFAULT_SALES_ORDER_LIST_COLUMN_KEYS))
  const selectedColumns = ref<string[]>([...DEFAULT_SALES_ORDER_LIST_COLUMN_KEYS])
  const dragIndex = ref(-1)

  const sortedVisibleColumns = computed(() =>
    columnOptions.value.filter(col => visibleColumns.value.has(col.key))
  )

  const tableColumnRenderKey = computed(() =>
    sortedVisibleColumns.value.map(col => col.key).join(',')
  )

  const initColumnConfig = () => {
    let orderKeys = SALES_ORDER_LIST_COLUMN_DEFINITIONS.map(col => col.key)
    let visibleKeys = [...DEFAULT_SALES_ORDER_LIST_COLUMN_KEYS]
    let configChanged = false

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
          SALES_ORDER_LIST_COLUMN_DEFINITIONS.some(col => col.key === key)
        )
        if (parsed.length) visibleKeys = parsed
      } catch {
        /* ignore */
      }
    }

    const orderMigration = migrateColumnKeys(
      orderKeys.filter(key => SALES_ORDER_LIST_COLUMN_DEFINITIONS.some(col => col.key === key))
    )
    const visibleMigration = migrateColumnKeys(
      visibleKeys.filter(key => SALES_ORDER_LIST_COLUMN_DEFINITIONS.some(col => col.key === key))
    )

    orderKeys = orderMigration.merged
    visibleKeys = visibleMigration.merged
    configChanged = orderMigration.changed || visibleMigration.changed

    if (visibleKeys.length <= 1) {
      visibleKeys = [...DEFAULT_SALES_ORDER_LIST_COLUMN_KEYS]
      localStorage.removeItem(CONFIG_KEY)
      localStorage.removeItem(ORDER_KEY)
    }

    const ordered = orderKeys
      .map(key => SALES_ORDER_LIST_COLUMN_DEFINITIONS.find(col => col.key === key))
      .filter(Boolean) as SalesOrderListColumnDef[]
    const missing = SALES_ORDER_LIST_COLUMN_DEFINITIONS.filter(col => !orderKeys.includes(col.key))
    columnOptions.value = [...ordered, ...missing]

    visibleColumns.value = new Set(visibleKeys)
    selectedColumns.value = [...visibleKeys]

    if (configChanged) {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(visibleKeys))
      localStorage.setItem(ORDER_KEY, JSON.stringify(columnOptions.value.map(col => col.key)))
    }
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
    SALES_ORDER_LIST_COLUMN_DEFINITIONS.filter(col => col.required).forEach(col => {
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
