import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

export type PlatformCustomerListColumnDef = {
  key: string
  label: string
  prop: string
  align?: 'left' | 'center' | 'right'
  headerAlign?: 'left' | 'center' | 'right'
  required?: boolean
}

export const PLATFORM_CUSTOMER_LIST_COLUMN_DEFINITIONS: PlatformCustomerListColumnDef[] = [
  { key: 'platformStatus', label: '平台状态', prop: 'platformStatus', align: 'center', headerAlign: 'center' },
  { key: 'status', label: '状态', prop: 'status', align: 'center', headerAlign: 'center' },
  { key: 'companyCode', label: '医享平台编号', prop: 'companyCode' },
  { key: 'companyName', label: '公司名称', prop: 'companyName', required: true },
  { key: 'companyShortName', label: '公司简称', prop: 'companyShortName' },
  { key: 'companyType', label: '三方类型', prop: 'companyType', align: 'center', headerAlign: 'center' },
  { key: 'pinyin', label: '拼音缩写', prop: 'pinyin' },
  { key: 'contact', label: '联系人', prop: 'contact' },
  { key: 'phone', label: '公司电话', prop: 'phone' },
  { key: 'email', label: '公司邮箱', prop: 'email' },
  { key: 'province', label: '省', prop: 'province' },
  { key: 'city', label: '市', prop: 'city' },
  { key: 'address', label: '地址', prop: 'address' },
  { key: 'license', label: '营业执照', prop: 'license' },
  { key: 'licenseExpire', label: '证件到期', prop: 'licenseExpire' },
  { key: 'taxId', label: '税号', prop: 'taxId' },
  { key: 'bank', label: '开户银行', prop: 'bank' },
  { key: 'bankAccount', label: '银行账号', prop: 'bankAccount' },
  { key: 'platformUser', label: '平台用户', prop: 'platformUser' },
  { key: 'createDate', label: '创建日期', prop: 'createDate' },
  { key: 'creator', label: '创建人', prop: 'creator' },
  { key: 'editor', label: '编辑人员', prop: 'editor' },
  { key: 'editDate', label: '编辑日期', prop: 'editDate' },
  { key: 'remark', label: '备注', prop: 'remark' },
  { key: 'recordStatus', label: '平台备案', prop: 'recordStatus', align: 'center', headerAlign: 'center' },
  { key: 'recordDate', label: '备案日期', prop: 'recordDate' }
]

export const DEFAULT_PLATFORM_CUSTOMER_LIST_COLUMN_KEYS =
  PLATFORM_CUSTOMER_LIST_COLUMN_DEFINITIONS.map(col => col.key)

export function usePlatformCustomerListColumnSettings(storagePrefix: string) {
  const CONFIG_KEY = `${storagePrefix}-column-config`
  const ORDER_KEY = `${storagePrefix}-column-order`

  const showColumnSelector = ref(false)
  const columnOptions = ref<PlatformCustomerListColumnDef[]>([
    ...PLATFORM_CUSTOMER_LIST_COLUMN_DEFINITIONS
  ])
  const visibleColumns = ref<Set<string>>(new Set(DEFAULT_PLATFORM_CUSTOMER_LIST_COLUMN_KEYS))
  const selectedColumns = ref<string[]>([...DEFAULT_PLATFORM_CUSTOMER_LIST_COLUMN_KEYS])
  const dragIndex = ref(-1)

  const sortedVisibleColumns = computed(() =>
    columnOptions.value.filter(col => visibleColumns.value.has(col.key))
  )

  const tableColumnRenderKey = computed(() =>
    sortedVisibleColumns.value.map(col => col.key).join(',')
  )

  const initColumnConfig = () => {
    let orderKeys = PLATFORM_CUSTOMER_LIST_COLUMN_DEFINITIONS.map(col => col.key)
    let visibleKeys = [...DEFAULT_PLATFORM_CUSTOMER_LIST_COLUMN_KEYS]

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
          PLATFORM_CUSTOMER_LIST_COLUMN_DEFINITIONS.some(col => col.key === key)
        )
        if (parsed.length) visibleKeys = parsed
      } catch {
        /* ignore */
      }
    }

    orderKeys = orderKeys.filter(key =>
      PLATFORM_CUSTOMER_LIST_COLUMN_DEFINITIONS.some(col => col.key === key)
    )
    visibleKeys = visibleKeys.filter(key =>
      PLATFORM_CUSTOMER_LIST_COLUMN_DEFINITIONS.some(col => col.key === key)
    )

    if (visibleKeys.length <= 1) {
      visibleKeys = [...DEFAULT_PLATFORM_CUSTOMER_LIST_COLUMN_KEYS]
      localStorage.removeItem(CONFIG_KEY)
      localStorage.removeItem(ORDER_KEY)
    }

    const ordered = orderKeys
      .map(key => PLATFORM_CUSTOMER_LIST_COLUMN_DEFINITIONS.find(col => col.key === key))
      .filter(Boolean) as PlatformCustomerListColumnDef[]
    const missing = PLATFORM_CUSTOMER_LIST_COLUMN_DEFINITIONS.filter(
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
    PLATFORM_CUSTOMER_LIST_COLUMN_DEFINITIONS.filter(col => col.required).forEach(col => {
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
    ElMessage.success('客户列表设置已保存')
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
