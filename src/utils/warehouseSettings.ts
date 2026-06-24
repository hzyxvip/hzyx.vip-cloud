import { computed, ref } from 'vue'
import { getCurrentCompany, warehouseStore, warehouses } from '@/utils/dataStore'
import {
  SYSTEM_DEFAULT_WAREHOUSE_CODE,
  SYSTEM_DEFAULT_WAREHOUSE_NAME
} from '@/utils/warehouseDefaults'

export type WarehouseSelectOption = {
  label: string
  value: string
  code?: string
  isDefault?: boolean
}

/** 早期演示用仓库（已废弃） */
const LEGACY_TEST_WAREHOUSE_VALUES = new Set(['beijing', 'shanghai', 'guangzhou', 'shenzhen'])
const LEGACY_TEST_WAREHOUSE_LABELS = new Set(['北京仓库', '上海仓库', '广州仓库', '深圳仓库'])

export function isLegacyTestWarehouse(item: { label: string; value: string }): boolean {
  const value = String(item.value || '').trim()
  const label = String(item.label || '').trim()
  return LEGACY_TEST_WAREHOUSE_VALUES.has(value) || LEGACY_TEST_WAREHOUSE_LABELS.has(label)
}

const warehouseOptionsRef = ref<WarehouseSelectOption[]>([])

export const activeWarehouseOptions = computed(() => warehouseOptionsRef.value)

export const isMultiWarehouseMode = computed(() => warehouseOptionsRef.value.length > 1)

export const shouldSkipWarehouseField = computed(() => warehouseOptionsRef.value.length <= 1)

export function resolveWarehouseLabel(
  warehouseVal: string | undefined,
  options: WarehouseSelectOption[] = warehouseOptionsRef.value
): string {
  const raw = String(warehouseVal || '').trim()
  if (!raw) return ''
  if (isLegacyTestWarehouse({ label: raw, value: raw })) return ''
  const byValue = options.find(opt => opt.value === raw)
  if (byValue) return byValue.label
  const byLabel = options.find(opt => opt.label === raw)
  if (byLabel) return byLabel.label
  return raw
}

export function getDefaultWarehouseValue(options: WarehouseSelectOption[] = warehouseOptionsRef.value): string {
  if (!options.length) return ''
  return options.find(opt => opt.isDefault)?.value || options[0].value
}

function purgeLegacyTestWarehouseStorage() {
  const saved = localStorage.getItem('system_warehouse_list')
  if (!saved) return
  try {
    const parsed = JSON.parse(saved) as Array<{ label: string; value: string; code?: string }>
    const filtered = parsed.filter(w =>
      !isLegacyTestWarehouse({ label: w.label, value: w.value || w.label })
    )
    if (filtered.length !== parsed.length) {
      if (filtered.length) {
        localStorage.setItem('system_warehouse_list', JSON.stringify(filtered))
      } else {
        localStorage.removeItem('system_warehouse_list')
      }
    }
  } catch {}
}

export function refreshWarehouseOptions() {
  purgeLegacyTestWarehouseStorage()

  const companyId = getCurrentCompany()
  const fromStore = warehouses.value
    .filter(w => w.companyId === companyId && w.status === '启用')
    .filter(w => !isLegacyTestWarehouse({ label: w.name, value: w.name }))
    .map(w => ({
      label: w.name,
      value: w.name,
      code: w.code,
      isDefault: w.isDefault
    }))

  if (fromStore.length) {
    warehouseOptionsRef.value = fromStore
    return
  }

  const defaultWh = warehouseStore.getDefault(companyId)
  if (defaultWh && !isLegacyTestWarehouse({ label: defaultWh.name, value: defaultWh.name })) {
    warehouseOptionsRef.value = [{
      label: defaultWh.name,
      value: defaultWh.name,
      code: defaultWh.code,
      isDefault: true
    }]
    return
  }

  const saved = localStorage.getItem('system_warehouse_list')
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Array<{ label: string; value: string; code?: string }>
      const filtered = parsed.filter(w =>
        !isLegacyTestWarehouse({ label: w.label, value: w.value || w.label })
      )
      if (filtered.length) {
        warehouseOptionsRef.value = filtered.map((w, index) => ({
          label: w.label,
          value: w.value || w.label,
          code: w.code,
          isDefault: index === 0
        }))
        return
      }
    } catch {}
  }

  warehouseOptionsRef.value = [{
    label: SYSTEM_DEFAULT_WAREHOUSE_NAME,
    value: SYSTEM_DEFAULT_WAREHOUSE_NAME,
    code: SYSTEM_DEFAULT_WAREHOUSE_CODE,
    isDefault: true
  }]
}
