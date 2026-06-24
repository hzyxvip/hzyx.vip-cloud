import { ref, onMounted } from 'vue'

export interface ColumnConfig {
  key: string
  label: string
  prop?: string
  defaultWidth?: number
  align?: 'left' | 'center' | 'right'
}

export function useTableStyle(tableName: string, columns: ColumnConfig[]) {
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
            const colConfig = columns.find(c => c.key === key)
            const minWidth = colConfig?.defaultWidth ?? 50
            columnWidths.value[key] = Math.max(Math.round(parsed[key]), minWidth)
          }
        })
      } catch {}
    }
  }

  const saveColumnWidths = () => {
    localStorage.setItem(`${tableName}-column-widths`, JSON.stringify(columnWidths.value))
  }

  const handleHeaderDragend = (newWidth: number, _oldWidth: number, column: any) => {
    const label = column.label as string
    const property = column.property as string | undefined
    const type = column.type as string | undefined
    const colConfig = columns.find(c =>
      c.label === label ||
      (property && (c.key === property || c.prop === property)) ||
      (type === 'index' && c.key === 'index') ||
      (type === 'selection' && c.key === 'selection')
    )
    if (colConfig && columnWidths.value[colConfig.key] !== undefined) {
      const minWidth = colConfig.defaultWidth ?? 50
      columnWidths.value[colConfig.key] = Math.max(Math.round(newWidth), minWidth)
      saveColumnWidths()
    }
  }

  const getColumnWidth = (key: string, fallback = 120) =>
    columnWidths.value[key] ?? columns.find(c => c.key === key)?.defaultWidth ?? fallback

  onMounted(() => {
    loadColumnWidths()
  })

  return {
    columnWidths,
    getColumnWidth,
    handleHeaderDragend
  }
}