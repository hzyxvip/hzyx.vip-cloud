import * as XLSX from 'xlsx'

export type FundExcelColumn = {
  key: string
  header: string
}

export function exportRowsToExcel(
  fileName: string,
  sheetName: string,
  columns: FundExcelColumn[],
  rows: Record<string, unknown>[]
): void {
  const exportData = rows.map((row, index) => {
    const line: Record<string, unknown> = { 行号: index + 1 }
    columns.forEach(col => {
      line[col.header] = row[col.key] ?? ''
    })
    return line
  })

  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))
  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`)
}

export function buildFundExportFileName(prefix: string): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${prefix}_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.xlsx`
}
