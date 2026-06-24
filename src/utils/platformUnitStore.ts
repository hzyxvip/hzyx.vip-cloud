/** 平台单位设定（计量 / 计价）共享数据 */

export type PlatformUnitCategory = {
  id: number
  category: string
  units: string[]
}

export type PlatformUnitCatalog = {
  inventoryUnits: PlatformUnitCategory[]
  pricingUnits: PlatformUnitCategory[]
}

export type PlatformUnitOption = { label: string; value: string }

const STORAGE_KEY = 'platformUnitCatalog'

export const DEFAULT_PLATFORM_UNIT_CATALOG: PlatformUnitCatalog = {
  inventoryUnits: [
    { id: 1, category: '单件器械', units: ['支', '只', '根', '枚', '个', '套', '柄', '条', '管', '粒', '丸', '颗', '组', '件', '单元'] },
    { id: 2, category: '片状敷料', units: ['片', '张', '贴', '卷', '条', '垫', '块'] },
    { id: 3, category: '液体/容器类', units: ['瓶', '罐', '桶', '袋', '包'] },
    { id: 4, category: '重量单位', units: ['μg', 'mg', 'g', 'kg', 't', '微克', '毫克', '克', '千克', '吨'] },
    { id: 5, category: '容积单位', units: ['μL', 'ml', 'cc', 'L', '微升', '毫升', '升'] },
    { id: 6, category: '长度单位', units: ['mm', 'cm', 'm', '毫米', '厘米', '米'] },
    { id: 7, category: '面积单位', units: ['c㎡', '㎡', '平方厘米', '平方米'] },
    { id: 8, category: '检验/医用特殊', units: ['人份', '次', '疗程'] },
    { id: 9, category: '设备仪器', units: ['台', '把'] }
  ],
  pricingUnits: [
    {
      id: 1,
      category: '包装计价单位',
      units: [
        '箱', '大箱', '中箱', '小箱', '盒', '大包', '小包', '捆', '扎', '托盘', '塑封', '整批',
        '板', '排', '层', '托', '塑封袋', '周转箱', '纸箱', '塑盒', '铝箔袋', '件', '袋', '包'
      ]
    }
  ]
}

function cloneCatalog(catalog: PlatformUnitCatalog): PlatformUnitCatalog {
  return {
    inventoryUnits: catalog.inventoryUnits.map(item => ({
      ...item,
      units: [...item.units]
    })),
    pricingUnits: catalog.pricingUnits.map(item => ({
      ...item,
      units: [...item.units]
    }))
  }
}

function normalizeCatalog(raw: unknown): PlatformUnitCatalog {
  if (!raw || typeof raw !== 'object') {
    return cloneCatalog(DEFAULT_PLATFORM_UNIT_CATALOG)
  }
  const data = raw as Partial<PlatformUnitCatalog>
  const inventoryUnits = Array.isArray(data.inventoryUnits)
    ? data.inventoryUnits
        .filter(item => item && typeof item.category === 'string' && Array.isArray(item.units))
        .map((item, index) => ({
          id: Number(item.id) || index + 1,
          category: item.category,
          units: [...new Set(item.units.map(unit => String(unit).trim()).filter(Boolean))]
        }))
    : []
  const pricingUnits = Array.isArray(data.pricingUnits)
    ? data.pricingUnits
        .filter(item => item && typeof item.category === 'string' && Array.isArray(item.units))
        .map((item, index) => ({
          id: Number(item.id) || index + 1,
          category: item.category,
          units: [...new Set(item.units.map(unit => String(unit).trim()).filter(Boolean))]
        }))
    : []

  if (!inventoryUnits.length && !pricingUnits.length) {
    return cloneCatalog(DEFAULT_PLATFORM_UNIT_CATALOG)
  }

  return {
    inventoryUnits: inventoryUnits.length
      ? inventoryUnits
      : cloneCatalog(DEFAULT_PLATFORM_UNIT_CATALOG).inventoryUnits,
    pricingUnits: pricingUnits.length
      ? pricingUnits
      : cloneCatalog(DEFAULT_PLATFORM_UNIT_CATALOG).pricingUnits
  }
}

export function loadPlatformUnitCatalog(): PlatformUnitCatalog {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return cloneCatalog(DEFAULT_PLATFORM_UNIT_CATALOG)
    return normalizeCatalog(JSON.parse(saved))
  } catch {
    return cloneCatalog(DEFAULT_PLATFORM_UNIT_CATALOG)
  }
}

export function savePlatformUnitCatalog(catalog: PlatformUnitCatalog): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeCatalog(catalog)))
}

function flattenUniqueUnits(groups: PlatformUnitCategory[]): string[] {
  const set = new Set<string>()
  groups.forEach(group => {
    group.units.forEach(unit => {
      const trimmed = String(unit).trim()
      if (trimmed) set.add(trimmed)
    })
  })
  return [...set]
}

/** 实物最小库存单位（计量字段） */
export function getPlatformMeasureUnitNames(): string[] {
  return flattenUniqueUnits(loadPlatformUnitCatalog().inventoryUnits)
}

/** 包装计价单位 */
export function getPlatformPricingUnitNames(): string[] {
  return flattenUniqueUnits(loadPlatformUnitCatalog().pricingUnits)
}

export function toUnitOptions(names: string[]): PlatformUnitOption[] {
  return names.map(name => ({ label: name, value: name }))
}

export function getPlatformMeasureUnitOptions(): PlatformUnitOption[] {
  return toUnitOptions(getPlatformMeasureUnitNames())
}

export function getPlatformPricingUnitOptions(): PlatformUnitOption[] {
  return toUnitOptions(getPlatformPricingUnitNames())
}

/** 多单位换算：计量 + 计价 */
export function getPlatformConversionUnitOptions(): PlatformUnitOption[] {
  const merged = [...getPlatformMeasureUnitNames(), ...getPlatformPricingUnitNames()]
  return toUnitOptions([...new Set(merged)])
}

export function addPlatformUnit(
  unitName: string,
  category: string,
  type: '计量' | '计价'
): { ok: boolean; message?: string } {
  const name = String(unitName).trim()
  if (!name) return { ok: false, message: '请输入单位名称' }
  if (!category) return { ok: false, message: '请选择分类' }

  const catalog = loadPlatformUnitCatalog()
  const groups = type === '计量' ? catalog.inventoryUnits : catalog.pricingUnits
  const targetCategory = groups.find(item => item.category === category)
  if (!targetCategory) return { ok: false, message: '分类不存在' }

  if (targetCategory.units.includes(name)) {
    return { ok: false, message: '该单位已存在' }
  }

  targetCategory.units.push(name)
  savePlatformUnitCatalog(catalog)
  return { ok: true }
}

export function deletePlatformUnit(unitName: string): void {
  const name = String(unitName).trim()
  if (!name) return
  const catalog = loadPlatformUnitCatalog()
  catalog.inventoryUnits.forEach(group => {
    group.units = group.units.filter(unit => unit !== name)
  })
  catalog.pricingUnits.forEach(group => {
    group.units = group.units.filter(unit => unit !== name)
  })
  savePlatformUnitCatalog(catalog)
}

export function getPlatformUnitInventoryCategories(): string[] {
  return loadPlatformUnitCatalog().inventoryUnits.map(item => item.category)
}

export function getPlatformUnitPricingCategories(): string[] {
  return loadPlatformUnitCatalog().pricingUnits.map(item => item.category)
}
