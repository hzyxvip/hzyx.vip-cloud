import * as XLSX from 'xlsx'
import { allocateProductId, type ProductMaster, getProductDisplayName, getProductIdentityKey } from '@/utils/productStore'

export const PRODUCT_EXPORT_LIMIT = 50

const EXPORT_HEADERS: Array<{ key: string; label: string }> = [
  { key: 'code', label: '商品编码' },
  { key: 'name', label: '商品名称' },
  { key: 'spec', label: '规格型号' },
  { key: 'measureUnit', label: '单位' },
  { key: 'manufacturer', label: '生产厂家' },
  { key: 'registrant', label: '注册人/备案人' },
  { key: 'brand', label: '品牌' },
  { key: 'category', label: '商品分类' },
  { key: 'type', label: '商品类型' },
  { key: 'licenseNo', label: '生产许可证号' },
  { key: 'registerNo', label: '注册证号' },
  { key: 'udiCode', label: 'UDI码' },
  { key: 'medicalCode', label: '医保码' },
  { key: 'medicalClass', label: '医保报销分类' },
  { key: 'storageCondition', label: '储运条件' },
  { key: 'medType', label: '医疗器械分类' },
  { key: 'auditStatus', label: '审核状态' },
  { key: 'status', label: '状态' },
  { key: 'auditTime', label: '审核时间' }
]

const HEADER_TO_KEY = EXPORT_HEADERS.reduce<Record<string, string>>((map, item) => {
  map[item.label] = item.key
  map[item.key] = item.key
  return map
}, {})

/** WPS 云进销存等外部 Excel 常见表头别名 */
const IMPORT_HEADER_ALIASES: Record<string, string> = {
  商品编号: 'code',
  产品编码: 'code',
  货号: 'code',
  许可号: 'licenseNo',
  生产许可号: 'licenseNo',
  批准文号: 'licenseNo',
  税收编码_医保: 'medicalCode',
  医保编码: 'medicalCode',
  单位: 'measureUnit',
  注册人: 'registrant',
  备案人: 'registrant',
  '注册人/备案人': 'registrant'
}

const resolveImportHeaderKey = (header: string): string | undefined => {
  const trimmed = header.trim()
  if (!trimmed || trimmed.startsWith('__EMPTY')) return undefined
  return HEADER_TO_KEY[trimmed] || IMPORT_HEADER_ALIASES[trimmed]
}

const normalizeMeasureUnit = (value: unknown): string => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.includes(',')) return raw.split(',')[0].trim()
  if (raw.includes('，')) return raw.split('，')[0].trim()
  return raw
}

const formatFileDate = () => {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}${month}${day}`
}

export function exportProductsToExcel(
  products: ProductMaster[],
  fileNamePrefix: string
): { exported: number; total: number } {
  const total = products.length
  const slice = products.slice(0, PRODUCT_EXPORT_LIMIT)
  const exportData = slice.map((item, index) => {
    const row: Record<string, string | number> = { 行号: index + 1 }
    EXPORT_HEADERS.forEach(({ key, label }) => {
      row[label] = String(item[key] ?? '')
    })
    return row
  })

  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '商品资料')
  XLSX.writeFile(workbook, `${fileNamePrefix}_${formatFileDate()}.xlsx`)

  return { exported: slice.length, total }
}

/** 下载仅含表头与一行示例的导入模板（.xlsx） */
export function downloadProductImportTemplate(fileNamePrefix: string) {
  const exampleRow: Record<string, string> = {}
  EXPORT_HEADERS.forEach(({ key, label }) => {
    const samples: Record<string, string> = {
      code: 'DEMO001',
      name: '示例商品名称',
      spec: '示例规格型号',
      manufacturer: '示例生产厂家',
      registrant: '示例注册人/备案人',
      brand: '示例品牌',
      category: '医用材料',
      type: '耗材',
      licenseNo: '',
      registerNo: '',
      udiCode: '',
      medicalCode: '',
      medicalClass: '',
      measureUnit: '盒',
      storageCondition: '常温',
      medType: '',
      auditStatus: '待审核',
      status: '正常',
      auditTime: ''
    }
    exampleRow[label] = samples[key] ?? ''
  })

  const worksheet = XLSX.utils.json_to_sheet([exampleRow], {
    header: EXPORT_HEADERS.map(item => item.label)
  })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '商品资料')
  XLSX.writeFile(workbook, `${fileNamePrefix}.xlsx`)
}

const normalizeImportedRow = (row: Record<string, unknown>): ProductMaster | null => {
  const mapped: Record<string, unknown> = {}
  Object.entries(row).forEach(([header, value]) => {
    const trimmedHeader = String(header).trim()
    const key = resolveImportHeaderKey(trimmedHeader)
    if (!key || value == null || value === '') return
    if (key === 'measureUnit' && trimmedHeader === '单位' && mapped.measureUnit) return
    mapped[key] = value
  })

  const code = String(mapped.code || '').trim()
  const name = String(mapped.name || '').trim()
  if (!code || !name) return null

  return {
    id: mapped.id as number | string | undefined,
    code,
    name,
    spec: String(mapped.spec || ''),
    manufacturer: String(mapped.manufacturer || ''),
    registrant: String(mapped.registrant || mapped.manufacturer || ''),
    brand: String(mapped.brand || ''),
    category: String(mapped.category || ''),
    type: String(mapped.type || ''),
    licenseNo: String(mapped.licenseNo || ''),
    registerNo: String(mapped.registerNo || ''),
    udiCode: String(mapped.udiCode || ''),
    medicalCode: String(mapped.medicalCode || ''),
    medicalClass: String(mapped.medicalClass || ''),
    measureUnit: normalizeMeasureUnit(mapped.measureUnit),
    storageCondition: String(mapped.storageCondition || ''),
    medType: String(mapped.medType || ''),
    auditStatus: String(mapped.auditStatus || '待审核'),
    status: String(mapped.status || '正常'),
    auditTime: String(mapped.auditTime || '')
  }
}

export function parseProductImportFile(file: File): Promise<ProductMaster[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = event.target?.result
        if (!data) {
          reject(new Error('文件读取失败'))
          return
        }
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
          reject(new Error('Excel 文件中没有工作表'))
          return
        }
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          workbook.Sheets[sheetName],
          { defval: '' }
        )
        const products = rows
          .map(normalizeImportedRow)
          .filter((item): item is ProductMaster => item !== null)
        resolve(products)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

export function mergeImportedProducts(
  current: ProductMaster[],
  imported: ProductMaster[]
): { list: ProductMaster[]; added: number; updated: number; skipped: number } {
  const list = [...current]
  const codeIndex = new Map(list.map((item, index) => [String(item.code || '').trim(), index]))
  const identityIndex = new Map<string, number>()
  list.forEach((item, index) => {
    if (!getProductDisplayName(item)) return
    identityIndex.set(getProductIdentityKey(item), index)
  })

  const seenImportIdentities = new Set<string>()
  let added = 0
  let updated = 0
  let skipped = 0

  imported.forEach(item => {
    const code = String(item.code || '').trim()
    if (!code || !getProductDisplayName(item)) {
      skipped++
      return
    }

    const identityKey = getProductIdentityKey(item)
    const existingIdentityIndex = identityIndex.get(identityKey)
    const existingByIdentity =
      existingIdentityIndex != null ? list[existingIdentityIndex] : undefined

    if (existingByIdentity && String(existingByIdentity.code || '').trim() !== code) {
      skipped++
      seenImportIdentities.add(identityKey)
      return
    }

    if (seenImportIdentities.has(identityKey)) {
      skipped++
      return
    }

    const existingIndex = codeIndex.get(code)
    if (existingIndex != null) {
      const merged = {
        ...list[existingIndex],
        ...item,
        id: list[existingIndex].id
      }
      const mergedIdentityKey = getProductIdentityKey(merged)
      const conflictIndex = identityIndex.get(mergedIdentityKey)
      if (
        conflictIndex != null &&
        conflictIndex !== existingIndex &&
        getProductIdentityKey(list[conflictIndex]) === mergedIdentityKey
      ) {
        skipped++
        return
      }

      list[existingIndex] = merged
      identityIndex.set(mergedIdentityKey, existingIndex)
      updated++
      seenImportIdentities.add(identityKey)
      return
    }

    if (existingByIdentity) {
      skipped++
      seenImportIdentities.add(identityKey)
      return
    }

    const record: ProductMaster = {
      ...item,
      id: allocateProductId(list, item.id)
    }
    list.push(record)
    const newIndex = list.length - 1
    codeIndex.set(code, newIndex)
    identityIndex.set(identityKey, newIndex)
    seenImportIdentities.add(identityKey)
    added++
  })

  return { list, added, updated, skipped }
}
