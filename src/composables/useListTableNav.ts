import { computed, nextTick, ref, type ComputedRef, type Ref } from 'vue'
import type { TableInstance } from 'element-plus'

/** 列表页：首张 / 上一张 / 下一张 / 末张（切换表格选中行，不触发 watch 循环） */
export function useListTableNav<T extends { id: string }>(options: {
  filteredData: ComputedRef<T[]>
  selectedRows: Ref<T[]>
  currentPage: Ref<number>
  pageSize: Ref<number>
  tableRef: Ref<TableInstance | undefined>
}) {
  const activeNavId = ref('')

  const activeNavIndex = computed(() => {
    const id = activeNavId.value
    if (!id) return -1
    return options.filteredData.value.findIndex(row => row.id === id)
  })

  const canNavFirst = computed(() => activeNavIndex.value > 0)
  const canNavPrev = computed(() => activeNavIndex.value > 0)
  const canNavNext = computed(() => {
    const index = activeNavIndex.value
    if (index < 0) return options.filteredData.value.length > 0
    return index < options.filteredData.value.length - 1
  })
  const canNavLast = computed(() => {
    const index = activeNavIndex.value
    if (index < 0) return options.filteredData.value.length > 0
    return index < options.filteredData.value.length - 1
  })

  const applyNavIndex = (index: number) => {
    const row = options.filteredData.value[index]
    if (!row) return
    activeNavId.value = row.id
    options.selectedRows.value = [row]
    options.currentPage.value = Math.floor(index / options.pageSize.value) + 1
    nextTick(() => {
      options.tableRef.value?.clearSelection()
      options.tableRef.value?.toggleRowSelection(row, true)
    })
  }

  const handleNavFirst = () => applyNavIndex(0)
  const handleNavPrev = () => {
    const index = activeNavIndex.value >= 0 ? activeNavIndex.value : 0
    if (index > 0) applyNavIndex(index - 1)
  }
  const handleNavNext = () => {
    const index = activeNavIndex.value >= 0 ? activeNavIndex.value : -1
    const nextIndex = index < 0 ? 0 : index + 1
    if (nextIndex < options.filteredData.value.length) applyNavIndex(nextIndex)
  }
  const handleNavLast = () => {
    if (options.filteredData.value.length > 0) {
      applyNavIndex(options.filteredData.value.length - 1)
    }
  }

  const handleSelectionChange = (val: T[]) => {
    options.selectedRows.value = val
    if (val.length === 1) {
      activeNavId.value = val[0].id
    } else if (val.length === 0) {
      activeNavId.value = ''
    }
  }

  return {
    canNavFirst,
    canNavPrev,
    canNavNext,
    canNavLast,
    handleNavFirst,
    handleNavPrev,
    handleNavNext,
    handleNavLast,
    handleSelectionChange
  }
}
