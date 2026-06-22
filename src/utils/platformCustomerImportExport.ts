import * as XLSX from 'xlsx'
import {
  formatToday,
  type PlatformCustomer
} from '@/utils/platformCustomerStore'

export interface PlatformCustomerImportRow {
  companyName: string
  contact: string
  phone: string
}

const HEADER_ALIASES: Record<string, keyof PlatformCustomerImportRow> = {
  公司名称: 'companyName',
  公司全称: 'companyName',
  客户名称: 'companyName',
  供应商名称: 'companyName',
  名称: 'companyName',
  联系人: 'contact',
  联系电话: 'phone',
  公司电话: 'phone',
  电话: 'phone',
  手机: 'phone',
  手机号码: 'phone'
}

const normalizeCell = (value: unknown): string => String(value ?? '').trim()

const normalizeNameKey = (name: string): string => name.trim().toLowerCase()

const resolveHeaderKey = (header: unknown): keyof PlatformCustomerImportRow | undefined => {
  const trimmed = normalizeCell(header)
  if (!trimmed || trimmed.startsWith('__EMPTY')) return undefined
  return HEADER_ALIASES[trimmed]
}

function findHeaderInfo(rows: unknown[][]): { headerRowIndex: number; colMap: Partial<Record<keyof PlatformCustomerImportRow, number>> } | null {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 20); rowIndex += 1) {
    const row = rows[rowIndex]
    if (!Array.isArray(row)) continue

    const colMap: Partial<Record<keyof PlatformCustomerImportRow, number>> = {}
    row.forEach((cell, colIndex) => {
      const key = resolveHeaderKey(cell)
      if (key != null && colMap[key] == null) {
        colMap[key] = colIndex
      }
    })

    if (colMap.companyName != null) {
      return { headerRowIndex: rowIndex, colMap }
    }
  }
  return null
}

function rowFromArray(
  row: unknown[],
  colMap: Partial<Record<keyof PlatformCustomerImportRow, number>>
): PlatformCustomerImportRow | null {
  const companyName = normalizeCell(row[colMap.companyName ?? -1])
  if (!companyName) return null

  return {
    companyName,
    contact: normalizeCell(row[colMap.contact ?? -1]),
    phone: normalizeCell(row[colMap.phone ?? -1])
  }
}

function rowFromObject(row: Record<string, unknown>): PlatformCustomerImportRow | null {
  const mapped: Partial<PlatformCustomerImportRow> = {}
  Object.entries(row).forEach(([header, value]) => {
    const key = resolveHeaderKey(header)
    if (!key || value == null || value === '') return
    mapped[key] = normalizeCell(value)
  })

  const companyName = mapped.companyName?.trim()
  if (!companyName) return null

  return {
    companyName,
    contact: mapped.contact || '',
    phone: mapped.phone || ''
  }
}

export function parsePlatformCustomerImportRows(buffer: ArrayBuffer): PlatformCustomerImportRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error('Excel 文件中没有工作表')
  }

  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
  const headerInfo = findHeaderInfo(matrix)

  if (headerInfo) {
    return matrix
      .slice(headerInfo.headerRowIndex + 1)
      .map(row => (Array.isArray(row) ? rowFromArray(row, headerInfo.colMap) : null))
      .filter((item): item is PlatformCustomerImportRow => item !== null)
  }

  const objectRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  return objectRows
    .map(rowFromObject)
    .filter((item): item is PlatformCustomerImportRow => item !== null)
}

export function parsePlatformCustomerImportFile(file: File): Promise<PlatformCustomerImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = event => {
      try {
        const data = event.target?.result
        if (!data || !(data instanceof ArrayBuffer)) {
          reject(new Error('文件读取失败'))
          return
        }
        resolve(parsePlatformCustomerImportRows(data))
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

function createImportCode(existingCodes: Set<string>, seq: number): string {
  let code = `PC${String(100000 + seq).slice(-6)}`
  while (existingCodes.has(code)) {
    seq += 1
    code = `PC${String(100000 + seq).slice(-6)}`
  }
  existingCodes.add(code)
  return code
}

export function buildPlatformCustomerFromImportRow(
  row: PlatformCustomerImportRow,
  seq: number,
  existingCodes: Set<string>,
  existing?: PlatformCustomer
): PlatformCustomer {
  const today = formatToday()
  const companyName = row.companyName.trim()
  const phone = row.phone.trim()
  const contact = row.contact.trim()
  const compactPhone = phone.replace(/\s/g, '')
  const isMobile = /^1\d{10}$/.test(compactPhone)

  return {
    id: existing?.id ?? Date.now() + seq,
    platformStatus: existing?.platformStatus ?? 'platformNotAudited',
    companyCode: existing?.companyCode ?? createImportCode(existingCodes, seq),
    companyName,
    companyShortName: existing?.companyShortName || companyName.slice(0, 6),
    companyType: existing?.companyType ?? '',
    companyCategory: existing?.companyCategory ?? '',
    pinyin: existing?.pinyin ?? '',
    contact: contact || existing?.contact || '',
    phone: phone || existing?.phone || '',
    mobile: isMobile ? compactPhone : existing?.mobile || '',
    email: existing?.email ?? '',
    country: existing?.country ?? '中国',
    province: existing?.province ?? '',
    city: existing?.city ?? '',
    district: existing?.district ?? '',
    address: existing?.address ?? '',
    postalCode: existing?.postalCode ?? '',
    companyIntro: existing?.companyIntro ?? '',
    businessScope: existing?.businessScope ?? '',
    legalPerson: existing?.legalPerson ?? '',
    registerCapital: existing?.registerCapital ?? '',
    establishDate: existing?.establishDate ?? '',
    license: existing?.license ?? '',
    licenseExpire: existing?.licenseExpire ?? '',
    taxId: existing?.taxId ?? '',
    bank: existing?.bank ?? '',
    bankBranchNo: existing?.bankBranchNo ?? '',
    bankAccount: existing?.bankAccount ?? '',
    settlementPeriod: existing?.settlementPeriod ?? 0,
    enterpriseLeader: existing?.enterpriseLeader ?? '',
    documents: existing?.documents ?? [],
    platformUser: existing?.platformUser ?? '否',
    createDate: existing?.createDate ?? today,
    creator: existing?.creator ?? 'Excel导入',
    editor: 'Excel导入',
    editDate: today,
    remark: existing?.remark ?? '',
    status: existing?.status ?? 'normal',
    recordStatus: existing?.recordStatus ?? '否',
    recordDate: existing?.recordDate ?? ''
  }
}

export function mergeImportedPlatformCustomers(
  current: PlatformCustomer[],
  imported: PlatformCustomerImportRow[]
): { list: PlatformCustomer[]; added: number; updated: number; skipped: number } {
  const list = [...current]
  const nameIndex = new Map(list.map((item, index) => [normalizeNameKey(item.companyName), index]))
  const existingCodes = new Set(list.map(item => item.companyCode).filter(Boolean))
  let added = 0
  let updated = 0
  let skipped = 0
  let seq = list.length + 1

  imported.forEach(row => {
    const companyName = row.companyName.trim()
    if (!companyName) {
      skipped += 1
      return
    }

    const nameKey = normalizeNameKey(companyName)
    const existingIndex = nameIndex.get(nameKey)
    if (existingIndex != null) {
      list[existingIndex] = buildPlatformCustomerFromImportRow(
        row,
        seq,
        existingCodes,
        list[existingIndex]
      )
      updated += 1
      seq += 1
      return
    }

    const record = buildPlatformCustomerFromImportRow(row, seq, existingCodes)
    list.push(record)
    nameIndex.set(nameKey, list.length - 1)
    added += 1
    seq += 1
  })

  return { list, added, updated, skipped }
}

export function downloadPlatformCustomerImportTemplate(fileNamePrefix: string) {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['供应商名称', '联系人', '联系电话'],
    ['示例公司名称', '张经理', '13800138000']
  ])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '平台客户')
  XLSX.writeFile(workbook, `${fileNamePrefix}.xlsx`)
}
