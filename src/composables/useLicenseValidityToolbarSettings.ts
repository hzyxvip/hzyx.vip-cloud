import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'

export type LicenseValidityToolbarRow = 'main' | 'end' | 'actions'

export type LicenseValidityToolbarActionDef = {
  key: string
  label: string
  row: LicenseValidityToolbarRow
  buttonType?: 'primary' | 'success' | 'warning' | 'danger' | 'default'
  plain?: boolean
  className?: string
  conditional?: 'editing'
}

export const LICENSE_VALIDITY_TOOLBAR_DEFINITIONS: LicenseValidityToolbarActionDef[] = [
  { key: 'enable', label: '启用', row: 'main', buttonType: 'success', plain: true, className: 'toolbar-btn-enable' },
  { key: 'disable', label: '停用', row: 'main', buttonType: 'warning', plain: true, className: 'toolbar-btn-disable' },
  { key: 'defaultSort', label: '设为默认排序', row: 'main' },
  { key: 'cancelEdit', label: '取消编辑', row: 'end', conditional: 'editing' },
  { key: 'copy', label: '复制到其他企业类型', row: 'end', plain: true },
  { key: 'refresh', label: '刷新', row: 'end' },
  { key: 'save', label: '保存', row: 'end', buttonType: 'primary' },
  { key: 'query', label: '查询', row: 'actions', buttonType: 'primary' },
  { key: 'add', label: '新增', row: 'actions', buttonType: 'primary' },
  { key: 'edit', label: '修改', row: 'actions', buttonType: 'primary', plain: true, className: 'toolbar-btn-edit' },
  { key: 'delete', label: '删除', row: 'actions', buttonType: 'danger', plain: true, className: 'toolbar-btn-delete' }
]

const DEFAULT_TOOLBAR_ORDER: Record<LicenseValidityToolbarRow, string[]> = {
  main: ['enable', 'disable', 'defaultSort'],
  end: ['cancelEdit', 'copy', 'refresh', 'save'],
  actions: ['query', 'add', 'edit', 'delete']
}

const ROW_LABELS: Record<LicenseValidityToolbarRow, string> = {
  main: '第一行（筛选区）',
  end: '第一行右侧',
  actions: '第二行操作'
}

export function useLicenseValidityToolbarSettings(storagePrefix = 'license-validity-list') {
  const ORDER_KEY = `${storagePrefix}-toolbar-order`

  const showToolbarSettings = ref(false)
  const toolbarOrder = ref<Record<LicenseValidityToolbarRow, string[]>>(cloneDefaultOrder())
  const draftOrder = ref<Record<LicenseValidityToolbarRow, string[]>>(cloneDefaultOrder())
  const dragState = ref<{ row: LicenseValidityToolbarRow; index: number } | null>(null)

  const toolbarDefinitionMap = computed(() =>
    Object.fromEntries(LICENSE_VALIDITY_TOOLBAR_DEFINITIONS.map(item => [item.key, item]))
  )

  const sortedToolbarMain = computed(() => resolveRowActions('main'))
  const sortedToolbarEnd = computed(() => resolveRowActions('end'))
  const sortedToolbarActions = computed(() => resolveRowActions('actions'))

  function cloneDefaultOrder(): Record<LicenseValidityToolbarRow, string[]> {
    return {
      main: [...DEFAULT_TOOLBAR_ORDER.main],
      end: [...DEFAULT_TOOLBAR_ORDER.end],
      actions: [...DEFAULT_TOOLBAR_ORDER.actions]
    }
  }

  function normalizeOrder(raw: Partial<Record<LicenseValidityToolbarRow, string[]>> | null | undefined) {
    const validKeys = new Set(LICENSE_VALIDITY_TOOLBAR_DEFINITIONS.map(item => item.key))
    const next = cloneDefaultOrder()

    ;(['main', 'end', 'actions'] as LicenseValidityToolbarRow[]).forEach(row => {
      if (Array.isArray(raw?.[row])) {
        next[row] = raw![row]!.filter(key => validKeys.has(key))
      }
    })

    LICENSE_VALIDITY_TOOLBAR_DEFINITIONS.forEach(def => {
      const exists = (['main', 'end', 'actions'] as LicenseValidityToolbarRow[]).some(row =>
        next[row].includes(def.key)
      )
      if (!exists) next[def.row].push(def.key)
    })

    return next
  }

  function resolveRowActions(row: LicenseValidityToolbarRow) {
    return toolbarOrder.value[row]
      .map(key => toolbarDefinitionMap.value[key])
      .filter(Boolean) as LicenseValidityToolbarActionDef[]
  }

  function initToolbarOrder() {
    const raw = localStorage.getItem(ORDER_KEY)
    if (!raw) {
      toolbarOrder.value = cloneDefaultOrder()
      return
    }

    try {
      toolbarOrder.value = normalizeOrder(JSON.parse(raw) as Record<LicenseValidityToolbarRow, string[]>)
    } catch {
      toolbarOrder.value = cloneDefaultOrder()
    }
  }

  const openToolbarSettings = () => {
    draftOrder.value = {
      main: [...toolbarOrder.value.main],
      end: [...toolbarOrder.value.end],
      actions: [...toolbarOrder.value.actions]
    }
    showToolbarSettings.value = true
  }

  const handleToolbarDragStart = (
    event: DragEvent,
    row: LicenseValidityToolbarRow,
    index: number
  ) => {
    dragState.value = { row, index }
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', `${row}:${index}`)
    }
  }

  const handleToolbarDragOver = (event: DragEvent) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  const handleToolbarDrop = (
    event: DragEvent,
    targetRow: LicenseValidityToolbarRow,
    targetIndex: number
  ) => {
    event.preventDefault()
    if (!dragState.value) return

    const { row: sourceRow, index: sourceIndex } = dragState.value
    if (sourceRow === targetRow && sourceIndex === targetIndex) {
      dragState.value = null
      return
    }

    const sourceList = [...draftOrder.value[sourceRow]]
    const [moved] = sourceList.splice(sourceIndex, 1)
    if (!moved) {
      dragState.value = null
      return
    }

    draftOrder.value[sourceRow] = sourceList
    const targetList = sourceRow === targetRow ? sourceList : [...draftOrder.value[targetRow]]
    targetList.splice(targetIndex, 0, moved)
    draftOrder.value[targetRow] = targetList
    dragState.value = null
  }

  const confirmToolbarSettings = () => {
    toolbarOrder.value = normalizeOrder(draftOrder.value)
    localStorage.setItem(ORDER_KEY, JSON.stringify(toolbarOrder.value))
    showToolbarSettings.value = false
    ElMessage.success('按钮布局已保存')
  }

  const resetToolbarSettings = () => {
    draftOrder.value = cloneDefaultOrder()
  }

  initToolbarOrder()

  return {
    showToolbarSettings,
    draftOrder,
    rowLabels: ROW_LABELS,
    sortedToolbarMain,
    sortedToolbarEnd,
    sortedToolbarActions,
    openToolbarSettings,
    handleToolbarDragStart,
    handleToolbarDragOver,
    handleToolbarDrop,
    confirmToolbarSettings,
    resetToolbarSettings
  }
}
