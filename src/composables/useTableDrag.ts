import { ref, onMounted } from 'vue'

export interface ColumnItem {
  key: string
  label: string
  defaultWidth?: number
  align?: 'left' | 'center' | 'right'
  hidden?: boolean
  fixed?: boolean
}

export function useTableDrag(tableName: string, columns: ColumnItem[]) {
  const columnWidths = ref<Record<string, number>>({})

  columns.forEach(col => {
    columnWidths.value[col.key] = col.defaultWidth || 120
  })

  const loadColumnWidths = () => {
    const saved = localStorage.getItem(`${tableName}-column-widths`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        Object.keys(parsed).forEach(key => {
          if (columnWidths.value[key] !== undefined) {
            columnWidths.value[key] = parsed[key]
          }
        })
      } catch {}
    }
  }

  const saveColumnWidths = () => {
    localStorage.setItem(`${tableName}-column-widths`, JSON.stringify(columnWidths.value))
  }

  const handleHeaderDragend = (newWidth: number, oldWidth: number, column: any) => {
    const label = column.label
    const colConfig = columns.find(c => c.label === label)
    if (colConfig && columnWidths.value[colConfig.key] !== undefined) {
      columnWidths.value[colConfig.key] = newWidth
      saveColumnWidths()
    }
  }

  onMounted(() => {
    loadColumnWidths()
  })

  return {
    columnWidths,
    handleHeaderDragend
  }
}
