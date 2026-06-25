import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

export type CustomerListColumnDef = {
  key: string
  label: string
  prop: string
  align?: 'left' | 'center' | 'right'
  headerAlign?: 'left' | 'center' | 'right'
  defaultWidth?: number
  required?: boolean
}

export const CUSTOMER_LIST_COLUMN_DEFINITIONS: CustomerListColumnDef[] = [
  { key: 'name', label: '客户名称', prop: 'name', defaultWidth: 280, required: true },
  { key: 'onlineCustomer', label: '在线客户', prop: 'onlineCustomer', defaultWidth: 88, align: 'center', headerAlign: 'center' },
  { key: 'code', label: '医享平台编号', prop: 'code', defaultWidth: 120, required: true },
  { key: 'shortName', label: '客户简称', prop: 'shortName', defaultWidth: 120 },
  { key: 'contact', label: '联系人', prop: 'contact', defaultWidth: 100 },
  { key: 'phone', label: '联系电话', prop: 'phone', defaultWidth: 120 },
  { key: 'mobile', label: '手机', prop: 'mobile', defaultWidth: 120 },
  { key: 'email', label: '邮箱', prop: 'email', defaultWidth: 160 },
  { key: 'type', label: '客户类型', prop: 'type', defaultWidth: 120, align: 'center', headerAlign: 'center' },
  { key: 'province', label: '省份', prop: 'province', defaultWidth: 100 },
  { key: 'city', label: '城市', prop: 'city', defaultWidth: 100 },
  { key: 'district', label: '区县', prop: 'district', defaultWidth: 100 },
  { key: 'address', label: '地址', prop: 'address', defaultWidth: 200 },
  { key: 'creditCode', label: '统一社会信用代码', prop: 'creditCode', defaultWidth: 180 },
  { key: 'taxNo', label: '税号', prop: 'taxNo', defaultWidth: 160 },
  { key: 'bankName', label: '开户银行', prop: 'bankName', defaultWidth: 160 },
  { key: 'bankAccount', label: '银行账号', prop: 'bankAccount', defaultWidth: 160 },
  { key: 'legalPerson', label: '法人代表', prop: 'legalPerson', defaultWidth: 100 },
  { key: 'auditStatus', label: '审核状态', prop: 'auditStatus', defaultWidth: 150, align: 'center', headerAlign: 'center' },
  { key: 'status', label: '状态', prop: 'status', defaultWidth: 100, align: 'center', headerAlign: 'center' },
  { key: 'collaboration', label: '平台协同', prop: 'collaborationEnabled', defaultWidth: 100, align: 'center', headerAlign: 'center' },
  { key: 'createTime', label: '建档日期', prop: 'createTime', defaultWidth: 110 },
  { key: 'creator', label: '建档人', prop: 'creator', defaultWidth: 100 },
  { key: 'auditTime', label: '审核时间', prop: 'auditTime', defaultWidth: 160 },
  { key: 'auditor', label: '审核人', prop: 'auditor', defaultWidth: 100 },
  { key: 'remark', label: '备注', prop: 'remark', defaultWidth: 160 }
]

export const DEFAULT_CUSTOMER_LIST_COLUMN_KEYS = [
  'name',
  'onlineCustomer',
  'code',
  'contact',
  'phone',
  'mobile',
  'type',
  'province',
  'city',
  'auditStatus',
  'status',
  'collaboration'
]

export function useCustomerListColumnSettings(storagePrefix: string) {
  const CONFIG_KEY = `${storagePrefix}-column-config`
  const ORDER_KEY = `${storagePrefix}-column-order`

  const showColumnSelector = ref(false)
  const columnOptions = ref<CustomerListColumnDef[]>([...CUSTOMER_LIST_COLUMN_DEFINITIONS])
  const visibleColumns = ref<Set<string>>(new Set(DEFAULT_CUSTOMER_LIST_COLUMN_KEYS))
  const selectedColumns = ref<string[]>([...DEFAULT_CUSTOMER_LIST_COLUMN_KEYS])
  const dragIndex = ref(-1)

  const sortedVisibleColumns = computed(() =>
    columnOptions.value.filter(col => visibleColumns.value.has(col.key))
  )

  const tableColumnRenderKey = computed(() =>
    sortedVisibleColumns.value.map(col => col.key).join(',')
  )

  const initColumnConfig = () => {
    let orderKeys = CUSTOMER_LIST_COLUMN_DEFINITIONS.map(col => col.key)
    let visibleKeys = [...DEFAULT_CUSTOMER_LIST_COLUMN_KEYS]

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
          CUSTOMER_LIST_COLUMN_DEFINITIONS.some(col => col.key === key)
        )
        if (parsed.length) visibleKeys = parsed
      } catch {
        /* ignore */
      }
    }

    orderKeys = orderKeys.filter(key =>
      CUSTOMER_LIST_COLUMN_DEFINITIONS.some(col => col.key === key)
    )
    visibleKeys = visibleKeys.filter(key =>
      CUSTOMER_LIST_COLUMN_DEFINITIONS.some(col => col.key === key)
    )

    if (visibleKeys.length <= 1) {
      visibleKeys = [...DEFAULT_CUSTOMER_LIST_COLUMN_KEYS]
      localStorage.removeItem(CONFIG_KEY)
      localStorage.removeItem(ORDER_KEY)
    }

    const ordered = orderKeys
      .map(key => CUSTOMER_LIST_COLUMN_DEFINITIONS.find(col => col.key === key))
      .filter(Boolean) as CustomerListColumnDef[]
    const missing = CUSTOMER_LIST_COLUMN_DEFINITIONS.filter(
      col => !orderKeys.includes(col.key)
    )
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
    CUSTOMER_LIST_COLUMN_DEFINITIONS.filter(col => col.required).forEach(col => {
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
