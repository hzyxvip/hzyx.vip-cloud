<script setup lang="ts">
import '@/styles/data-list-table.scss'
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTableStyle } from '@/composables/useTableStyle'
import { usePartnerListBatchAudit } from '@/composables/usePartnerListBatchAudit'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getTradingPartners,
  upsertTradingPartner,
  type TradingPartner
} from '@/utils/platformCollaborationService'
import {
  batchDeleteSuppliers,
  batchSetSupplierAuditStatus,
  loadAndEnsureSupplierList,
  supplierTypeOptions,
  type SupplierMaster
} from '@/utils/supplierStore'

const SEARCH_FORM_KEY = 'supplier-search-form'

const router = useRouter()
const tableRef = ref()
const selectedRows = ref<SupplierMaster[]>([])
const showAdvancedFilter = ref(false)
const tableData = ref<SupplierMaster[]>([])
const currentPage = ref(1)
const pageSize = ref(20)

const searchForm = ref({
  keyword: '',
  dateRange: [] as Date[],
  supplierType: [] as string[],
  auditStatus: [] as string[],
  status: [] as string[]
})

const auditStatusOptions = [
  { label: '未审核', value: 'notAudited' },
  { label: '已审核', value: 'audited' }
]

const statusOptions = [
  { label: '正常', value: 'normal' },
  { label: '停用', value: 'disabled' }
]

const supplierTypeLabels = Object.fromEntries(
  supplierTypeOptions.map(item => [item.value, item.label])
)

const auditStatusLabels: Record<string, string> = {
  notAudited: '未审核',
  audited: '已审核'
}

const statusLabels: Record<string, { text: string; color: string }> = {
  normal: { text: '正常', color: 'success' },
  disabled: { text: '停用', color: 'danger' }
}

const { columnWidths, handleHeaderDragend } = useTableStyle('supplier-list', [
  { key: 'index', label: '行号', defaultWidth: 56 },
  { key: 'select', label: '', defaultWidth: 42 },
  { key: 'id', label: '医享平台编号', defaultWidth: 120 },
  { key: 'name', label: '供应商名称', defaultWidth: 180 },
  { key: 'contact', label: '联系人', defaultWidth: 100 },
  { key: 'phone', label: '联系电话', defaultWidth: 120 },
  { key: 'mobile', label: '手机', defaultWidth: 120 },
  { key: 'type', label: '供应商类型', defaultWidth: 110 },
  { key: 'province', label: '省份', defaultWidth: 90 },
  { key: 'city', label: '城市', defaultWidth: 90 },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 100 },
  { key: 'status', label: '状态', defaultWidth: 80 },
  { key: 'collaboration', label: '平台协同', defaultWidth: 100 },
  { key: 'createTime', label: '建档日期', defaultWidth: 110 }
])

const partnerKey = (name: string) => `supplier:${name}`

const loadSupplierListData = () => {
  tableData.value = loadAndEnsureSupplierList()
}

const loadCollaborationFlags = () => {
  const partners = getTradingPartners()
  tableData.value.forEach(row => {
    if (row.collaborationEnabled === undefined) row.collaborationEnabled = true
    const p = partners.find(x => x.partnerKey === partnerKey(row.name))
    if (p) row.collaborationEnabled = p.collaborationEnabled !== false
  })
}

const saveSearchForm = () => {
  localStorage.setItem(
    SEARCH_FORM_KEY,
    JSON.stringify({
      ...searchForm.value,
      showAdvancedFilter: showAdvancedFilter.value
    })
  )
}

watch(
  () => [searchForm.value.supplierType, searchForm.value.auditStatus, searchForm.value.status],
  saveSearchForm,
  { deep: true }
)

const filteredData = computed(() => {
  return tableData.value.filter(item => {
    if (searchForm.value.keyword.trim()) {
      const keywords = searchForm.value.keyword.trim().split(/\s+/).filter(Boolean)
      const fields = [
        item.id,
        item.code,
        item.name,
        item.contact,
        item.phone,
        item.mobile,
        item.address,
        item.email,
        item.creditCode
      ]
      const allMatch = keywords.every(kw => {
        const key = kw.toLowerCase()
        return fields.some(f => String(f ?? '').toLowerCase().includes(key))
      })
      if (!allMatch) return false
    }

    if (searchForm.value.dateRange.length === 2) {
      const itemDate = new Date(item.createTime)
      const [startDate, endDate] = searchForm.value.dateRange
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      if (itemDate < startDate || itemDate > end) return false
    }

    if (
      searchForm.value.supplierType.length > 0 &&
      !searchForm.value.supplierType.includes(item.type)
    ) {
      return false
    }

    if (
      searchForm.value.auditStatus.length > 0 &&
      !searchForm.value.auditStatus.includes(item.auditStatus)
    ) {
      return false
    }

    if (
      searchForm.value.status.length > 0 &&
      !searchForm.value.status.includes(item.status)
    ) {
      return false
    }

    return true
  })
})

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

const indexMethod = (index: number) => (currentPage.value - 1) * pageSize.value + index + 1

watch(filteredData, list => {
  const maxPage = Math.max(1, Math.ceil(list.length / pageSize.value) || 1)
  if (currentPage.value > maxPage) {
    currentPage.value = maxPage
  }
})

const handleCollaborationChange = (row: { name: string; collaborationEnabled: boolean }) => {
  const partner: TradingPartner = {
    partnerKey: partnerKey(row.name),
    partnerType: 'supplier',
    partnerName: row.name,
    platformCompanyId: 0,
    collaborationEnabled: row.collaborationEnabled
  }
  upsertTradingPartner(partner)
  ElMessage.success(row.collaborationEnabled ? '已开启平台协同' : '已关闭平台协同')
}

const handleCreate = () => {
  router.push('/data/supplier/create')
}

const handleEdit = (id: string) => {
  router.push(`/data/supplier/create/${id}`)
}

const handleRowDoubleClick = (row: SupplierMaster) => {
  handleEdit(row.id)
}

const handleCodeClick = (row: SupplierMaster) => {
  handleEdit(row.id)
}

const handleToolbarDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先勾选要删除的供应商')
    return
  }

  try {
    const count = selectedRows.value.length
    const names = selectedRows.value.map(item => item.name).join('、')
    await ElMessageBox.confirm(
      `请谨慎删除！确定删除选中的 ${count} 条供应商吗？\n${names}\n此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    const ids = selectedRows.value.map(item => item.id)
    tableData.value = batchDeleteSuppliers(ids)
    loadCollaborationFlags()
    clearTableSelection()
    ElMessage.success('删除成功')
  } catch {
    // 用户取消
  }
}

const handleSearch = () => {
  currentPage.value = 1
  saveSearchForm()
  ElMessage.success(`共找到 ${filteredData.value.length} 条供应商`)
}

const handleReset = () => {
  searchForm.value = {
    keyword: '',
    dateRange: [],
    supplierType: [],
    auditStatus: [],
    status: []
  }
  currentPage.value = 1
  localStorage.removeItem(SEARCH_FORM_KEY)
}

const handleRefresh = () => {
  loadSupplierListData()
  loadCollaborationFlags()
  currentPage.value = 1
  clearTableSelection()
  ElMessage.success('数据已刷新')
}

const handlePageChange = (page: number) => {
  currentPage.value = page
}

const handlePageSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleSelectionChange = (rows: SupplierMaster[]) => {
  selectedRows.value = rows
}

const clearTableSelection = () => {
  selectedRows.value = []
  tableRef.value?.clearSelection?.()
}

const {
  canAudit,
  canBatchAudit,
  canBatchUnaudit,
  handleBatchAudit
} = usePartnerListBatchAudit(tableData, selectedRows, clearTableSelection, {
  entityLabel: '供应商',
  batchSetAudit: batchSetSupplierAuditStatus,
  onAfterAudit: loadSupplierListData
})

onMounted(() => {
  const saved = localStorage.getItem(SEARCH_FORM_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      Object.assign(searchForm.value, parsed)
      if (parsed.dateRange?.length) {
        searchForm.value.dateRange = parsed.dateRange.map((d: string) => new Date(d))
      } else {
        searchForm.value.dateRange = []
      }
      showAdvancedFilter.value = parsed.showAdvancedFilter ?? false
    } catch {
      searchForm.value.dateRange = []
    }
  }

  loadSupplierListData()
  loadCollaborationFlags()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>供应商列表</h1>
    </div>

    <div class="search-card">
      <div class="search-row">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="searchForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始"
              end-placeholder="结束"
              style="width: 240px;"
              @change="saveSearchForm()"
            />
          </el-form-item>
          <el-form-item class="keyword-input">
            <el-input
              v-model="searchForm.keyword"
              placeholder="医享平台编号/名称/联系人/电话/地址/统一社会信用代码"
              clearable
              style="width: 320px;"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
        </el-form>
        <div class="button-group">
          <el-button type="primary" class="btn-teal" @click="handleSearch">查询</el-button>
          <el-button @click="handleRefresh">刷新</el-button>
          <el-button type="primary" class="btn-teal" @click="handleCreate">新增</el-button>
          <el-button
            v-if="canAudit"
            type="success"
            plain
            :disabled="!canBatchAudit"
            @click="handleBatchAudit('audit')"
          >审核</el-button>
          <el-button
            v-if="canAudit"
            class="btn-unaudit-pink"
            plain
            :disabled="!canBatchUnaudit"
            @click="handleBatchAudit('unaudit')"
          >反审核</el-button>
          <el-button
            type="danger"
            plain
            :disabled="selectedRows.length === 0"
            @click="handleToolbarDelete"
          >删除</el-button>
          <el-button
            :type="showAdvancedFilter ? 'success' : 'default'"
            @click="showAdvancedFilter = !showAdvancedFilter; saveSearchForm()"
          >
            {{ showAdvancedFilter ? '隐藏筛选' : '高级筛选' }}
          </el-button>
        </div>
      </div>

      <div v-show="showAdvancedFilter" class="search-advanced">
        <div class="filter-row">
          <div class="filter-item">
            <span class="filter-label">供应商类型：</span>
            <el-checkbox-group v-model="searchForm.supplierType">
              <el-checkbox-button
                v-for="opt in supplierTypeOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </el-checkbox-button>
            </el-checkbox-group>
          </div>
          <div class="filter-item">
            <span class="filter-label">审核状态：</span>
            <el-checkbox-group v-model="searchForm.auditStatus">
              <el-checkbox-button
                v-for="opt in auditStatusOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </el-checkbox-button>
            </el-checkbox-group>
          </div>
          <div class="filter-item">
            <span class="filter-label">状态：</span>
            <el-checkbox-group v-model="searchForm.status">
              <el-checkbox-button
                v-for="opt in statusOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </el-checkbox-button>
            </el-checkbox-group>
          </div>
        </div>
      </div>
    </div>

    <div class="table-card data-list-table-card">
      <el-table
        ref="tableRef"
        :data="pagedData"
        row-key="id"
        class="common-table"
        border
        :fit="false"
        @row-dblclick="handleRowDoubleClick"
        @header-dragend="handleHeaderDragend"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="index" label="行号" :index="indexMethod" :width="columnWidths.index" align="center" />
        <el-table-column type="selection" :width="columnWidths.select" fixed="left" />
        <el-table-column prop="id" label="医享平台编号" :width="columnWidths.id">
          <template #default="{ row }">
            <span class="code-link" @click="handleCodeClick(row)">{{ row.code || row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="供应商名称" :width="columnWidths.name" show-overflow-tooltip />
        <el-table-column prop="contact" label="联系人" :width="columnWidths.contact" />
        <el-table-column prop="phone" label="联系电话" :width="columnWidths.phone" />
        <el-table-column prop="mobile" label="手机" :width="columnWidths.mobile" />
        <el-table-column prop="type" label="供应商类型" :width="columnWidths.type">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ supplierTypeLabels[row.type] || row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="province" label="省份" :width="columnWidths.province" />
        <el-table-column prop="city" label="城市" :width="columnWidths.city" />
        <el-table-column label="审核状态" :width="columnWidths.auditStatus" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.auditStatus === 'audited' ? 'success' : 'info'">
              {{ auditStatusLabels[row.auditStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" :width="columnWidths.status" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="statusLabels[row.status]?.color || 'info'">
              {{ statusLabels[row.status]?.text || '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="平台协同" :width="columnWidths.collaboration" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.collaborationEnabled"
              inline-prompt
              active-text="开"
              inactive-text="关"
              @change="handleCollaborationChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="建档日期" :width="columnWidths.createTime" />
      </el-table>

      <div class="pagination">
        <span class="pagination-info">共 {{ filteredData.length }} 条</span>
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="filteredData.length"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h1 {
    font-size: 20px;
    font-weight: 600;
    color: #344054;
    margin: 0;
  }
}

.search-card {
  background: transparent;
  padding: 0 0 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;

  .search-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: space-between;
  }

  .search-form {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;

    :deep(.el-form-item) {
      margin-bottom: 0;
      margin-right: 0;
    }
  }

  .button-group {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }

  .btn-unaudit-pink {
    --el-button-text-color: #db2777;
    --el-button-border-color: #f9a8d4;
    --el-button-bg-color: #fdf2f8;
    --el-button-hover-text-color: #be185d;
    --el-button-hover-border-color: #f472b6;
    --el-button-hover-bg-color: #fce7f3;
    --el-button-disabled-text-color: #f9a8d4;
    --el-button-disabled-border-color: #fce7f3;
    --el-button-disabled-bg-color: #fff;
  }

  .search-advanced {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed #e4e7ed;

    .filter-row {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }

    .filter-item {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;

      .filter-label {
        font-size: 14px;
        color: #667085;
        white-space: nowrap;
      }

      :deep(.el-checkbox-button__inner) {
        border-radius: 4px !important;
        margin-right: 4px;
      }
    }
  }
}

.table-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.code-link {
  color: #00897b;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 16px;
  flex-wrap: wrap;

  .pagination-info {
    font-size: 13px;
    color: #666;
    margin-right: auto;
  }
}

.btn-teal {
  background-color: #00bfa5 !important;
  border-color: #00bfa5 !important;
}
</style>
