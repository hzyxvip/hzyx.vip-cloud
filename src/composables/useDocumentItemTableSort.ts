import { type Ref } from 'vue'
import {
  resolveDocumentItemSortValue,
  sortRowsByColumn,
  type ErpDocumentTableKind
} from '@/utils/documentTableSort'
import { useDocumentColumnSort } from '@/composables/useDocumentColumnSort'

type ItemColumnLike = { key: string; prop?: string; sortable?: boolean }

/**
 * 单据表体（进 / 订 / 出货）：按列名排序明细行
 * 点击表头后重排 form.items，与商品资料列表排序交互一致
 */
export function useDocumentItemTableSort(
  items: Ref<Record<string, unknown>[]>,
  columnKeys: Ref<string[]>,
  options?: {
    documentKind?: ErpDocumentTableKind
    getColumnDef?: (colKey: string) => ItemColumnLike | undefined
    onSorted?: () => void
  }
) {
  const { sortOrders, getSortIcon, getActiveColumnSort, handleSort: baseHandleSort } =
    useDocumentColumnSort(columnKeys)

  const resolveItemValue = (row: Record<string, unknown>, colKey: string) => {
    const col = options?.getColumnDef?.(colKey)
    return resolveDocumentItemSortValue(row, colKey, col?.prop)
  }

  const handleItemColumnSort = (colKey: string) => {
    const col = options?.getColumnDef?.(colKey)
    if (col?.sortable === false) return

    baseHandleSort(colKey, () => {
      const active = getActiveColumnSort()
      if (!active?.order || !items.value.length) {
        options?.onSorted?.()
        return
      }
      const sorted = sortRowsByColumn(
        [...items.value],
        active.prop,
        active.order,
        resolveItemValue
      )
      items.value.splice(0, items.value.length, ...sorted)
      options?.onSorted?.()
    })
  }

  const isColumnSortable = (col: ItemColumnLike) => col.sortable !== false

  return {
    itemSortOrders: sortOrders,
    getItemSortIcon: getSortIcon,
    handleItemColumnSort,
    isColumnSortable,
    getActiveItemSort: getActiveColumnSort
  }
}
