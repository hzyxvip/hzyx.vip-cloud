<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { getProductDisplayName } from '@/utils/productStore'
import {
  PRODUCT_BATCH_SELECT_HARD_MAX,
  PRODUCT_BATCH_SELECT_PAGE_SIZE,
  PRODUCT_BATCH_SELECT_RECOMMENDED_MAX
} from '@/constants/productBatchSelect'

export type ProductBatchRow = Record<string, unknown> & {
  code?: string
  name?: string
  spec?: string
  manufacturer?: string
  brand?: string
  registrant?: string
  auditStatus?: string
  unitPrice?: number | string
  lastPrice?: number | string
  stockQty?: number | string
  warehouse?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    products: ProductBatchRow[]
    title?: string
    variant?: 'default' | 'purchase'
    /** 返回 false 的行不可勾选 */
    rowSelectable?: (row: ProductBatchRow) => boolean
  }>(),
  {
    title: '批量添加商品',
    variant: 'default'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [rows: ProductBatchRow[]]
}>()

const searchQuery = ref('')
const tableRef = ref<{ clearSelection: () => void; toggleRowSelection: (row: ProductBatchRow, selected?: boolean) => void }>()
const selectedRows = ref<ProductBatchRow[]>([])
const currentPage = ref(1)
const pageSize = ref(PRODUCT_BATCH_SELECT_PAGE_SIZE)

const filteredProducts = computed(() => {
  const list = props.products || []
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return list
  return list.filter(p => {
    const name = String(p.name ?? getProductDisplayName(p as Parameters<typeof getProductDisplayName>[0]) ?? '')
    return (
      String(p.code ?? '').toLowerCase().includes(query) ||
      name.toLowerCase().includes(query) ||
      String(p.spec ?? '').toLowerCase().includes(query) ||
      String(p.manufacturer ?? '').toLowerCase().includes(query)
    )
  })
})

const pagedProducts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredProducts.value.slice(start, start + pageSize.value)
})

const selectedCount = computed(() => selectedRows.value.length)

const showRecommendWarning = computed(
  () => selectedCount.value > PRODUCT_BATCH_SELECT_RECOMMENDED_MAX
)

const isRowSelectable = (row: ProductBatchRow) => props.rowSelectable?.(row) ?? true

const handleSelectionChange = (rows: ProductBatchRow[]) => {
  selectedRows.value = rows
}

const restorePageSelection = () => {
  nextTick(() => {
    if (!tableRef.value) return
    pagedProducts.value.forEach(row => {
      const selected = selectedRows.value.some(r => r.code === row.code)
      tableRef.value?.toggleRowSelection(row, selected)
    })
  })
}

watch(
  () => props.modelValue,
  visible => {
    if (visible) {
      searchQuery.value = ''
      selectedRows.value = []
      currentPage.value = 1
      nextTick(() => tableRef.value?.clearSelection())
    }
  }
)

watch([currentPage, filteredProducts], () => {
  if (props.modelValue) restorePageSelection()
})

watch(searchQuery, () => {
  currentPage.value = 1
})

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleConfirm = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请勾选至少一个商品')
    return
  }
  if (selectedRows.value.length > PRODUCT_BATCH_SELECT_HARD_MAX) {
    ElMessage.warning(`单次最多添加 ${PRODUCT_BATCH_SELECT_HARD_MAX} 个商品，请分批选择`)
    return
  }
  emit('confirm', [...selectedRows.value])
  emit('update:modelValue', false)
}

const displayName = (row: ProductBatchRow) =>
  String(row.name ?? getProductDisplayName(row as Parameters<typeof getProductDisplayName>[0]) ?? '')
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="980px"
    draggable
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="product-batch-select">
      <div class="toolbar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索商品编码、名称、规格、厂家"
          clearable
          class="search-input"
        />
        <span class="selected-tip">已勾选 <strong>{{ selectedCount }}</strong> 条</span>
      </div>

      <p class="hint">
        支持多行勾选后一次添加。建议单次不超过 {{ PRODUCT_BATCH_SELECT_RECOMMENDED_MAX }} 条；超过 {{ PRODUCT_BATCH_SELECT_HARD_MAX }} 条将无法提交。
      </p>

      <el-alert
        v-if="showRecommendWarning"
        type="warning"
        show-icon
        :closable="false"
        class="warn-alert"
        :title="`已选 ${selectedCount} 条，数量较多时明细表加载与保存可能变慢，建议分批添加`"
      />

      <el-table
        ref="tableRef"
        :data="pagedProducts"
        border
        height="380"
        row-key="code"
        @selection-change="handleSelectionChange"
      >
        <el-table-column
          type="selection"
          width="48"
          reserve-selection
          :selectable="isRowSelectable"
        />
        <el-table-column prop="code" label="商品编码" width="110" show-overflow-tooltip />
        <el-table-column label="商品名称" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ displayName(row) }}</template>
        </el-table-column>
        <template v-if="variant === 'purchase'">
          <el-table-column prop="auditStatus" label="审核状态" width="90" align="center" />
        </template>
        <el-table-column prop="spec" label="规格型号" width="120" show-overflow-tooltip />
        <el-table-column prop="manufacturer" label="生产厂家" min-width="130" show-overflow-tooltip />
        <el-table-column v-if="variant === 'default'" prop="brand" label="品牌" width="90" show-overflow-tooltip />
        <el-table-column v-if="variant === 'default'" label="上次价格" width="96" align="right">
          <template #default="{ row }">
            ¥{{ Number(row.lastPrice ?? row.unitPrice ?? 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column v-if="variant === 'default'" prop="registrant" label="注册人/备案人" min-width="120" show-overflow-tooltip />
        <template v-if="variant === 'purchase'">
          <el-table-column label="单价" width="96" align="right">
            <template #default="{ row }">¥{{ Number(row.unitPrice || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="stockQty" label="库存" width="88" align="right" />
          <el-table-column prop="warehouse" label="仓库" width="96" show-overflow-tooltip />
        </template>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[50, 100, 200]"
          layout="total, sizes, prev, pager, next"
          :total="filteredProducts.length"
          small
        />
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleConfirm">
        确定添加{{ selectedCount > 0 ? `（${selectedCount}）` : '' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.product-batch-select {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input {
  flex: 1;
}

.selected-tip {
  flex-shrink: 0;
  font-size: 13px;
  color: #606266;

  strong {
    color: #409eff;
  }
}

.hint {
  margin: 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.warn-alert {
  margin-bottom: 0;
}

.pager {
  display: flex;
  justify-content: flex-end;
}
</style>
