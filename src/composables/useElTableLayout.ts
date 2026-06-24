import { nextTick, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

type TableRef = Ref<{ doLayout?: () => void } | null | undefined>

/** 表头/表体列宽同步；可选绑定滚动容器以计算 el-table 固定高度（启用表体纵向滚动） */
export function useElTableLayout(
  tableRef: TableRef,
  scrollContainerRef?: Ref<HTMLElement | null | undefined>
) {
  const tableHeight = ref<number | undefined>(undefined)
  let resizeObserver: ResizeObserver | null = null

  const updateTableHeight = () => {
    const container = scrollContainerRef?.value
    if (!container) {
      tableHeight.value = undefined
      return
    }
    const nextHeight = Math.max(240, Math.floor(container.clientHeight))
    if (tableHeight.value !== nextHeight) {
      tableHeight.value = nextHeight
    }
  }

  const relayoutTable = () => {
    updateTableHeight()
    nextTick(() => {
      requestAnimationFrame(() => {
        tableRef.value?.doLayout?.()
      })
    })
  }

  onMounted(() => {
    relayoutTable()
    window.addEventListener('resize', relayoutTable)

    const container = scrollContainerRef?.value
    if (container && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => relayoutTable())
      resizeObserver.observe(container)
    }
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', relayoutTable)
    resizeObserver?.disconnect()
    resizeObserver = null
  })

  return { relayoutTable, tableHeight }
}
