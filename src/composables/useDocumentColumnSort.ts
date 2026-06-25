import { reactive, type ComputedRef, type Ref, unref } from 'vue'
import {
  cycleColumnSortOrder,
  getDocumentSortIcon,
  sortRowsByColumn,
  type DocumentColumnSortOrder,
  type DocumentSortValue
} from '@/utils/documentTableSort'

type ColumnKeysSource = string[] | Ref<string[]> | ComputedRef<string[]>

export function createEmptySortOrders(columnKeys: string[]): Record<string, DocumentColumnSortOrder> {
  return Object.fromEntries(columnKeys.map(key => [key, '' as DocumentColumnSortOrder]))
}

/**
 * 列表页 / 记录页：表头点击排序（单列激活）
 */
export function useDocumentColumnSort(columnKeys: ColumnKeysSource) {
  const sortOrders = reactive<Record<string, DocumentColumnSortOrder>>({})

  const ensureKeys = () => {
    const keys = unref(columnKeys)
    keys.forEach(key => {
      if (!(key in sortOrders)) {
        sortOrders[key] = ''
      }
    })
    Object.keys(sortOrders).forEach(key => {
      if (!keys.includes(key)) {
        delete sortOrders[key]
      }
    })
  }

  ensureKeys()

  const getActiveColumnSort = () => {
    ensureKeys()
    for (const key of Object.keys(sortOrders)) {
      const order = sortOrders[key]
      if (order) return { prop: key, order }
    }
    return null
  }

  const getSortIcon = (colKey: string) => getDocumentSortIcon(sortOrders[colKey] || '')

  const handleSort = (colKey: string, onChange?: () => void) => {
    ensureKeys()
    sortOrders[colKey] = cycleColumnSortOrder(sortOrders[colKey] || '')
    Object.keys(sortOrders).forEach(key => {
      if (key !== colKey) sortOrders[key] = ''
    })
    onChange?.()
  }

  const sortRows = <T extends Record<string, unknown>>(
    rows: T[],
    resolveValue: (row: T, colKey: string) => DocumentSortValue
  ) => {
    const active = getActiveColumnSort()
    if (!active) return [...rows]
    return sortRowsByColumn(rows, active.prop, active.order, resolveValue)
  }

  return {
    sortOrders,
    getActiveColumnSort,
    getSortIcon,
    handleSort,
    sortRows
  }
}
