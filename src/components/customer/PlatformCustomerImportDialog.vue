<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, RefreshRight } from '@element-plus/icons-vue'
import { getCompanyTypeLabel, type PlatformCustomer } from '@/utils/platformCustomerStore'
import {
  filterPlatformCustomersForImport,
  loadImportablePlatformCustomers,
  type PlatformCustomerCatalogSearchForm
} from '@/utils/platformCustomerImportService'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [customer: PlatformCustomer]
}>()

const loading = ref(false)
const tableRef = ref<{ doLayout?: () => void } | null>(null)
const catalog = ref<PlatformCustomer[]>([])
const selectedCode = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const searchForm = reactive<PlatformCustomerCatalogSearchForm>({
  keyword: '',
  companyType: ''
})

const filteredCustomers = computed(() =>
  filterPlatformCustomersForImport(catalog.value, searchForm)
)

const pagedCustomers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredCustomers.value.slice(start, start + pageSize.value)
})

const selectedCustomer = computed(() =>
  filteredCustomers.value.find(item => item.companyCode === selectedCode.value)
    || catalog.value.find(item => item.companyCode === selectedCode.value)
)

const resetSearch = () => {
  searchForm.keyword = ''
  currentPage.value = 1
}

const loadCatalog = () => {
  loading.value = true
  try {
    catalog.value = loadImportablePlatformCustomers()
    if (!catalog.value.length) {
      ElMessage.warning('平台客户库暂无已审核客户，请联系平台管理员维护')
    }
  } finally {
    loading.value = false
    relayoutTable()
  }
}

const indexMethod = (index: number) => (currentPage.value - 1) * pageSize.value + index + 1

watch(
  () => props.modelValue,
  visible => {
    if (!visible) return
    selectedCode.value = ''
    currentPage.value = 1
    resetSearch()
    loadCatalog()
  }
)

watch(filteredCustomers, list => {
  const maxPage = Math.max(1, Math.ceil(list.length / pageSize.value) || 1)
  if (currentPage.value > maxPage) {
    currentPage.value = maxPage
  }
  if (selectedCode.value && !list.some(item => item.companyCode === selectedCode.value)) {
    selectedCode.value = ''
  }
  relayoutTable()
})

watch([currentPage, pageSize], () => {
  relayoutTable()
})

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleSearch = () => {
  currentPage.value = 1
  if (!filteredCustomers.value.length) {
    ElMessage.info('未找到匹配的平台客户')
  }
}

const handleRefresh = () => {
  selectedCode.value = ''
  loadCatalog()
  ElMessage.success('列表已刷新')
}

const handleRowClick = (row: PlatformCustomer) => {
  selectedCode.value = row.companyCode
}

const handleConfirm = () => {
  if (!selectedCustomer.value) {
    ElMessage.warning('请先选择要引用的平台客户')
    return
  }
  emit('confirm', selectedCustomer.value)
  emit('update:modelValue', false)
}

const formatRegion = (row: PlatformCustomer) =>
  [row.province, row.city, row.district].filter(Boolean).join(' ')

const relayoutTable = () => {
  nextTick(() => {
    requestAnimationFrame(() => {
      tableRef.value?.doLayout?.()
    })
  })
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="从平台导入客户"
    width="960px"
    class="platform-customer-import-dialog"
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
    @opened="relayoutTable"
    @close="handleClose"
  >
    <div class="import-dialog-body">
      <div class="search-bar">
        <div class="search-row">
          <span class="search-label">关键词</span>
          <el-input
            v-model="searchForm.keyword"
            placeholder="客户编码 / 名称 / 拼音 / 联系人"
            clearable
            class="keyword-input"
            @keyup.enter="handleSearch"
          />
          <div class="button-group">
            <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
            <el-button :icon="RefreshRight" @click="handleRefresh">刷新</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </div>
        </div>
        <div class="result-tip">
          平台已审核客户 <strong>{{ catalog.length }}</strong> 条，当前匹配
          <strong>{{ filteredCustomers.length }}</strong> 条
        </div>
      </div>

      <div class="table-card data-list-table-card">
        <el-table
          ref="tableRef"
          v-loading="loading"
          :data="pagedCustomers"
          class="common-table import-customer-table"
          border
          :fit="true"
          height="380"
          highlight-current-row
          :row-class-name="({ row }) => (row.companyCode === selectedCode ? 'is-selected-row' : '')"
          @row-click="handleRowClick"
        >
          <el-table-column
            type="index"
            label="序号"
            :index="indexMethod"
            width="56"
            align="center"
          />
          <el-table-column width="48" align="center" label=" ">
            <template #default="{ row }">
              <el-radio v-model="selectedCode" :label="row.companyCode" @click.stop />
            </template>
          </el-table-column>
          <el-table-column prop="companyCode" label="客户编码" width="110" align="center">
            <template #default="{ row }">
              <span class="code-text">{{ row.companyCode }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="companyName" label="客户名称" min-width="200" show-overflow-tooltip />
          <el-table-column prop="companyShortName" label="简称" width="100" show-overflow-tooltip />
          <el-table-column label="企业类型" width="110" align="center">
            <template #default="{ row }">
              {{ getCompanyTypeLabel(row.companyType) }}
            </template>
          </el-table-column>
          <el-table-column prop="contact" label="联系人" width="90" align="center" />
          <el-table-column prop="phone" label="电话" width="120" show-overflow-tooltip />
          <el-table-column label="地区" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">
              {{ formatRegion(row) || '—' }}
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无匹配的平台客户" :image-size="72" />
          </template>
        </el-table>

        <div v-if="filteredCustomers.length > 0" class="table-footer">
          <div class="pagination">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              :total="filteredCustomers.length"
              small
            />
          </div>
        </div>
      </div>

      <div v-if="selectedCustomer" class="selected-preview">
        <div class="selected-label">已选客户</div>
        <div class="selected-content">
          <strong>{{ selectedCustomer.companyName }}</strong>
          <span v-if="selectedCustomer.companyCode" class="selected-code">
            {{ selectedCustomer.companyCode }}
          </span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer-bar">
        <span class="footer-tip">单击表格行或单选框选择客户，确认后将带入客户资料</span>
        <div class="footer-actions">
          <el-button @click="handleClose">取消</el-button>
          <el-button type="primary" :disabled="!selectedCustomer" @click="handleConfirm">
            确认引用
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.import-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-bar {
  padding-bottom: 4px;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-label {
  flex-shrink: 0;
  font-size: 14px;
  color: #344054;
}

.keyword-input {
  width: 320px;
}

.button-group {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.result-tip {
  margin-top: 10px;
  font-size: 13px;
  color: #667085;

  strong {
    color: #00bfa5;
    font-weight: 600;
  }
}

.table-card {
  background: #fff;
  border: 1px solid #e4e7ec;
  border-radius: 4px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.data-list-table-card {
  overflow-x: auto;
  overflow-y: hidden;
}

.data-list-table-card :deep(.import-customer-table.el-table .el-table__header-wrapper) {
  overflow: hidden;
}

.data-list-table-card :deep(.import-customer-table.el-table .el-table__body-wrapper) {
  overflow-y: scroll !important;
}

.data-list-table-card :deep(.import-customer-table.el-table) {
  --table-line-color: #d9d9d9;
  --table-row-odd-bg: #f0f7ff;
  --table-row-even-bg: #f5f5f5;
  --table-row-hover-bg: #fff3cd;
  --table-header-bg: #f5f5f5;

  width: 100% !important;
  border: 1px solid var(--table-line-color);
}

.data-list-table-card :deep(.import-customer-table.el-table .el-table__inner-wrapper::before),
.data-list-table-card :deep(.import-customer-table.el-table .el-table__border-left-patch),
.data-list-table-card :deep(.import-customer-table.el-table .el-table__border-right-patch) {
  background-color: var(--table-line-color);
}

.data-list-table-card :deep(.import-customer-table.el-table th.el-table__cell),
.data-list-table-card :deep(.import-customer-table.el-table td.el-table__cell) {
  border-color: var(--table-line-color) !important;
  border-right: 1px solid var(--table-line-color);
  border-bottom: 1px solid var(--table-line-color);
}

.data-list-table-card :deep(.import-customer-table.el-table .el-table__header-wrapper th.el-table__cell) {
  background: var(--table-header-bg) !important;
  color: #344054;
  font-weight: 600;
  text-align: center;
}

.data-list-table-card :deep(.import-customer-table.el-table .el-table__header-wrapper th.el-table__cell .cell) {
  justify-content: center;
}

.data-list-table-card :deep(.import-customer-table.el-table .el-table__body-wrapper .el-table__row:nth-child(odd) > td.el-table__cell) {
  background-color: var(--table-row-odd-bg) !important;
}

.data-list-table-card :deep(.import-customer-table.el-table .el-table__body-wrapper .el-table__row:nth-child(even) > td.el-table__cell) {
  background-color: var(--table-row-even-bg) !important;
}

.data-list-table-card :deep(.import-customer-table.el-table .el-table__body-wrapper .el-table__row:hover > td.el-table__cell) {
  background-color: var(--table-row-hover-bg) !important;
}

.table-footer {
  margin-top: 12px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
}

.code-text {
  color: #00bfa5;
  font-weight: 600;
}

.selected-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: linear-gradient(90deg, #f0faf8 0%, #f8fffe 100%);
  border: 1px solid #b2ebe3;
  border-radius: 4px;
}

.selected-label {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: #008f7a;
}

.selected-content {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: #344054;

  strong {
    font-size: 14px;
  }
}

.selected-code {
  padding: 2px 8px;
  border-radius: 4px;
  background: #fff;
  border: 1px solid #cceee8;
  color: #00bfa5;
  font-weight: 600;
}

.dialog-footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}

.footer-tip {
  font-size: 12px;
  color: #98a2b3;
}

.footer-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.data-list-table-card :deep(.import-customer-table.el-table .is-selected-row > td.el-table__cell) {
  background-color: #ecfdf8 !important;
}

.data-list-table-card :deep(.import-customer-table.el-table .is-selected-row:hover > td.el-table__cell) {
  background-color: #d1fae5 !important;
}

:deep(.el-radio__label) {
  display: none;
}

:deep(.el-dialog__body) {
  padding-top: 12px;
  padding-bottom: 8px;
}
</style>
