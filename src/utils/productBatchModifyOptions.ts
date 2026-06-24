/** 商品列表批量修改：下拉字段选项 */

import {
  getPlatformMeasureUnitOptions,
  type PlatformUnitOption
} from '@/utils/platformUnitStore'

export type ProductBatchModifyOption = PlatformUnitOption

export const PRODUCT_BATCH_MODIFY_SELECT_OPTIONS: Record<string, ProductBatchModifyOption[]> = {
  status: [
    { label: '正常', value: '正常' },
    { label: '停用', value: '停用' }
  ],
  medType: [
    { label: '一类', value: '一类' },
    { label: '二类', value: '二类' },
    { label: '三类', value: '三类' },
    { label: '消字号类', value: '消字号类' },
    { label: '非医疗', value: '非医疗' }
  ],
  medicalClass: [
    { label: '甲类', value: '甲类' },
    { label: '乙类', value: '乙类' },
    { label: '自费', value: '自费' }
  ],
  storageCondition: [
    { label: '常温', value: '常温' },
    { label: '阴凉', value: '阴凉' },
    { label: '冷藏', value: '冷藏' },
    { label: '低温冷冻', value: '低温冷冻' },
    { label: '超低温冷冻', value: '超低温冷冻' },
    { label: '恒温', value: '恒温' },
    { label: '其他', value: '其他' }
  ]
}

export function getProductBatchModifySelectOptions(key: string): ProductBatchModifyOption[] | null {
  if (key === 'measureUnit') {
    return getPlatformMeasureUnitOptions()
  }
  return PRODUCT_BATCH_MODIFY_SELECT_OPTIONS[key] ?? null
}
