import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

export type PurchaseInboundRecordColumnDef = {
  key: string
  label: string
  prop?: string
  align?: 'left' | 'center' | 'right'
  headerAlign?: 'left' | 'center' | 'right'
  required?: boolean
}

export const PURCHASE_INBOUND_RECORD_COLUMN_DEFINITIONS: PurchaseInboundRecordColumnDef[] = [
  { key: 'inboundNo', label: '入库单号', required: true },
  { key: 'orderNo', label: '采购订单号', prop: 'orderNo' },
  { key: 'supplier', label: '供应商', prop: 'supplier' },
  { key: 'warehouse', label: '仓库', prop: 'warehouse' },
  { key: 'date', label: '入库日期', prop: 'date' },
  { key: 'operator', label: '审核入库人员', prop: 'operator' },
  { key: 'itemCount', label: '商品种类', prop: 'itemCount', align: 'center', headerAlign: 'center' },
  { key: 'totalQuantity', label: '总数量', prop: 'totalQuantity', align: 'center', headerAlign: 'center' },
  { key: 'amount', label: '入库金额', align: 'right', headerAlign: 'right' },
  { key: 'auditStatus', label: '审核状态', align: 'center', headerAlign: 'center' },
  { key: 'inboundStatus', label: '入库状态', align: 'center', headerAlign: 'center' },
  { key: 'paymentStatus', label: '付款状态', align: 'center', headerAlign: 'center' },
  { key: 'logisticsStatus', label: '物流状态', align: 'center', headerAlign: 'center' },
  { key: 'logisticsCompany', label: '物流公司', align: 'center', headerAlign: 'center' },
  { key: 'logisticsNo', label: '物流单号' },
  { key: 'closeStatus', label: '关闭状态', align: 'center', headerAlign: 'center' },
  { key: 'status', label: '状态', align: 'center', headerAlign: 'center' },
  { key: 'remark', label: '备注', prop: 'remark' }
]

export const DEFAULT_PURCHASE_INBOUND_RECORD_COLUMN_KEYS =
  PURCHASE_INBOUND_RECORD_COLUMN_DEFINITIONS.map(col => col.key)

export function usePurchaseInboundRecordColumnSettings(storagePrefix = 'purchase-inbound-record-list') {
  const CONFIG_KEY = `${storagePrefix}-column-config`
  const ORDER_KEY = `${storagePrefix}-column-order`

  const showColumnSelector = ref(false)
  const columnOptions = ref<PurchaseInboundRecordColumnDef[]>([...PURCHASE_INBOUND_RECORD_COLUMN_DEFINITIONS])
  const visibleColumns = ref<Set<string>>(new Set(DEFAULT_PURCHASE_INBOUND_RECORD_COLUMN_KEYS))
  const selectedColumns = ref<string[]>([...DEFAULT_PURCHASE_INBOUND_RECORD_COLUMN_KEYS])
  const dragIndex = ref(-1)

  const sortedVisibleColumns = computed(() =>
    columnOptions.value.filter(col => visibleColumns.value.has(col.key))
  )

  const tableColumnRenderKey = computed(() =>
    sortedVisibleColumns.value.map(col => col.key).join(',')
  )

  const initColumnConfig = () => {
    let orderKeys = PURCHASE_INBOUND_RECORD_COLUMN_DEFINITIONS.map(col => col.key)
    let visibleKeys = [...DEFAULT_PURCHASE_INBOUND_RECORD_COLUMN_KEYS]

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
          PURCHASE_INBOUND_RECORD_COLUMN_DEFINITIONS.some(col => col.key === key)
        )
        if (parsed.length) visibleKeys = parsed
      } catch {
        /* ignore */
      }
    }

    orderKeys = orderKeys.filter(key =>
      PURCHASE_INBOUND_RECORD_COLUMN_DEFINITIONS.some(col => col.key === key)
    )
    visibleKeys = visibleKeys.filter(key =>
      PURCHASE_INBOUND_RECORD_COLUMN_DEFINITIONS.some(col => col.key === key)
    )

    if (visibleKeys.length <= 1) {
      visibleKeys = [...DEFAULT_PURCHASE_INBOUND_RECORD_COLUMN_KEYS]
      localStorage.removeItem(CONFIG_KEY)
      localStorage.removeItem(ORDER_KEY)
    }

    const ordered = orderKeys
      .map(key => PURCHASE_INBOUND_RECORD_COLUMN_DEFINITIONS.find(col => col.key === key))
      .filter(Boolean) as PurchaseInboundRecordColumnDef[]
    const missing = PURCHASE_INBOUND_RECORD_COLUMN_DEFINITIONS.filter(col => !orderKeys.includes(col.key))
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
    PURCHASE_INBOUND_RECORD_COLUMN_DEFINITIONS.filter(col => col.required).forEach(col => {
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
