<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  filterPlatformCatalogProducts,
  hydratePlatformCatalogFromServer,
  type PlatformCatalogSearchForm,
  type PlatformProduct
} from '@/utils/platformProductStore'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [product: PlatformProduct]
}>()

const loading = ref(false)
const catalog = ref<PlatformProduct[]>([])
const selectedCode = ref('')

const searchForm = reactive<PlatformCatalogSearchForm>({
  codeName: '',
  spec: '',
  registrant: '',
  manufacturer: ''
})

const filteredProducts = computed(() =>
  filterPlatformCatalogProducts(catalog.value, searchForm)
)

const selectedProduct = computed(() =>
  filteredProducts.value.find(item => item.code === selectedCode.value)
)

const resetSearch = () => {
  searchForm.codeName = ''
  searchForm.spec = ''
  searchForm.registrant = ''
  searchForm.manufacturer = ''
}

const loadCatalog = async () => {
  loading.value = true
  try {
    catalog.value = await hydratePlatformCatalogFromServer()
    if (!catalog.value.length) {
      ElMessage.warning('平台商品库暂无已审核商品，请联系平台管理员维护')
    }
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  visible => {
    if (!visible) return
    selectedCode.value = ''
    resetSearch()
    void loadCatalog()
  }
)

watch(filteredProducts, list => {
  if (selectedCode.value && !list.some(item => item.code === selectedCode.value)) {
    selectedCode.value = ''
  }
})

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleSearch = () => {
  if (!filteredProducts.value.length) {
    ElMessage.info('未找到匹配的平台商品')
  }
}

const handleRowClick = (row: PlatformProduct) => {
  selectedCode.value = row.code
}

const handleConfirm = () => {
  if (!selectedProduct.value) {
    ElMessage.warning('请先选择要引用的平台商品')
    return
  }
  emit('confirm', selectedProduct.value)
  emit('update:modelValue', false)
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="从平台导入商品"
    width="920px"
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
    @close="handleClose"
  >
    <div class="import-toolbar">
      <el-input
        v-model="searchForm.codeName"
        placeholder="商品编码/名称/拼音"
        clearable
        style="width: 180px;"
        @keyup.enter="handleSearch"
      />
      <el-input
        v-model="searchForm.spec"
        placeholder="规格型号/拼音"
        clearable
        style="width: 140px;"
        @keyup.enter="handleSearch"
      />
      <el-input
        v-model="searchForm.registrant"
        placeholder="注册人/备案人/拼音"
        clearable
        style="width: 160px;"
        @keyup.enter="handleSearch"
      />
      <el-input
        v-model="searchForm.manufacturer"
        placeholder="生产厂家/拼音"
        clearable
        style="width: 150px;"
        @keyup.enter="handleSearch"
      />
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button @click="resetSearch">重置</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="filteredProducts"
      height="420"
      highlight-current-row
      :row-class-name="({ row }) => (row.code === selectedCode ? 'is-selected-row' : '')"
      @row-click="handleRowClick"
    >
      <el-table-column width="48" align="center">
        <template #default="{ row }">
          <el-radio v-model="selectedCode" :label="row.code" @click.stop />
        </template>
      </el-table-column>
      <el-table-column prop="code" label="平台编码" width="110" />
      <el-table-column prop="name" label="商品名称" min-width="160" show-overflow-tooltip />
      <el-table-column prop="spec" label="规格型号" width="120" show-overflow-tooltip />
      <el-table-column prop="registrant" label="注册人/备案人" min-width="150" show-overflow-tooltip />
      <el-table-column prop="manufacturer" label="生产厂家" min-width="150" show-overflow-tooltip />
      <el-table-column prop="registerNo" label="注册证号" width="130" show-overflow-tooltip />
      <el-table-column prop="measureUnit" label="单位" width="70" align="center" />
    </el-table>

    <div v-if="selectedProduct" class="selected-preview">
      已选：<strong>{{ selectedProduct.name }}</strong>
      <span v-if="selectedProduct.spec"> · {{ selectedProduct.spec }}</span>
      <span v-if="selectedProduct.code"> · {{ selectedProduct.code }}</span>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :disabled="!selectedProduct" @click="handleConfirm">
        确认引用
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.import-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.selected-preview {
  margin-top: 12px;
  padding: 10px 12px;
  background: #f0faf8;
  border: 1px solid #cceee8;
  border-radius: 8px;
  color: #344054;
  font-size: 13px;
}

:deep(.is-selected-row) {
  background-color: #ecfdf8 !important;
}

:deep(.el-radio__label) {
  display: none;
}
</style>
