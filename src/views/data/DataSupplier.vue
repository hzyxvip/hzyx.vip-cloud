<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTableStyle } from '@/composables/useTableStyle'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getTradingPartners,
  upsertTradingPartner,
  type TradingPartner
} from '@/utils/platformCollaborationService'
import {
  deleteSupplier,
  loadAndEnsureSupplierList,
  setSupplierAuditStatus,
  supplierTypeOptions,
  type SupplierMaster
} from '@/utils/supplierStore'

const SEARCH_FORM_KEY = 'supplier-search-form'

const router = useRouter()
const showAdvancedFilter = ref(false)
const tableData = ref<SupplierMaster[]>([])
const currentPage = ref(1)
const pageSize = ref(20)

const timePresets = [
  { label: '当月', value: 'thisMonth' },
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '本周', value: 'thisWeek' },
  { label: '上月', value: 'lastMonth' },
  { label: '近三个月', value: 'last3Months' },
  { label: '近半年', value: 'halfYear' },
  { label: '近一年', value: 'lastYear' }
]

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

const getDateRange = (preset: string): [Date, Date] | null => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (preset) {
    case 'thisMonth':
      return [new Date(today.getFullYear(), today.getMonth(), 1), today]
    case 'today':
      return [today, today]
    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return [yesterday, yesterday]
    }
    case 'thisWeek': {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      return [weekStart, today]
    }
    case 'lastMonth':
      return [
        new Date(today.getFullYear(), today.getMonth() - 1, 1),
        new Date(today.getFullYear(), today.getMonth(), 0)
      ]
    case 'last3Months':
      return [new Date(today.getFullYear(), today.getMonth() - 3, 1), today]
    case 'halfYear':
      return [new Date(today.getFullYear(), today.getMonth() - 6, 1), today]
    case 'lastYear':
      return [new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()), today]
    default:
      return null
  }
}

const searchForm = ref({
  keyword: '',
  selectedPreset: 'thisMonth' as string,
  dateRange: [] as Date[],
  supplierType: [] as string[],
  auditStatus: [] as string[],
  status: [] as string[]
})

const { columnWidths, handleHeaderDragend } = useTableStyle('supplier-list', [
  { key: 'index', label: '行号', defaultWidth: 56 },
  { key: 'id', label: '供应商编号', defaultWidth: 120 },
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
  { key: 'createTime', label: '建档日期', defaultWidth: 110 },
  { key: 'action', label: '操作', defaultWidth: 220 }
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

const handlePresetChange = (val: string) => {
  const range = getDateRange(val)
  if (range) searchForm.value.dateRange = range
  saveSearchForm()
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

const handleDelete = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定删除该供应商吗？删除后不可恢复。', '删除确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    if (deleteSupplier(id)) {
      loadSupplierListData()
      loadCollaborationFlags()
      ElMessage.success('删除成功')
    } else {
      ElMessage.error('供应商不存在')
    }
  } catch {
    // 用户取消
  }
}

const handleAuditToggle = async (row: SupplierMaster) => {
  const isAudited = row.auditStatus === 'audited'
  try {
    await ElMessageBox.confirm(
      isAudited ? '确定反审核该供应商吗？' : '确定审核通过该供应商吗？',
      isAudited ? '反审核确认' : '审核确认',
      { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' }
    )
    const updated = setSupplierAuditStatus(row.id, !isAudited)
    if (updated) {
      Object.assign(row, updated)
      ElMessage.success(isAudited ? '已反审核' : '审核通过')
    }
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
    selectedPreset: 'thisMonth',
    dateRange: [],
    supplierType: [],
    auditStatus: [],
    status: []
  }
  const range = getDateRange('thisMonth')
  if (range) searchForm.value.dateRange = range
  currentPage.value = 1
  localStorage.removeItem(SEARCH_FORM_KEY)
}

const handleRefresh = () => {
  handleReset()
  loadSupplierListData()
  loadCollaborationFlags()
  ElMessage.success('数据已刷新')
}

const handlePageChange = (page: number) => {
  currentPage.value = page
}

const handlePageSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

onMounted(() => {
  const range = getDateRange('thisMonth')
  if (range) searchForm.value.dateRange = range

  const saved = localStorage.getItem(SEARCH_FORM_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      Object.assign(searchForm.value, parsed)
      if (parsed.dateRange?.length) {
        searchForm.value.dateRange = parsed.dateRange.map((d: string) => new Date(d))
      } else if (range) {
        searchForm.value.dateRange = range
      }
      showAdvancedFilter.value = parsed.showAdvancedFilter ?? false
    } catch {
      if (range) searchForm.value.dateRange = range
    }
  }

  loadSupplierListData()
  loadCollaborationFlags()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>供应商资料</h1>
    </div>

    <div class="search-card">
      <div class="search-row">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="业务时段">
            <el-select
              v-model="searchForm.selectedPreset"
              placeholder="时间段"
              clearable
              style="width: 100px;"
              @change="handlePresetChange"
            >
              <el-option v-for="preset in timePresets" :key="preset.value" :label="preset.label" :value="preset.value" />
            </el-select>
          </el-form-item>
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
              placeholder="编号/名称/联系人/电话/地址/统一社会信用代码"
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

    <div class="table-card">
      <el-table
        :data="pagedData"
        class="common-table"
        border
        :fit="false"
        @row-dblclick="handleRowDoubleClick"
        @header-dragend="handleHeaderDragend"
      >
        <el-table-column type="index" label="行号" :index="indexMethod" :width="columnWidths.index" align="center" />
        <el-table-column prop="id" label="供应商编号" :width="columnWidths.id">
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
        <el-table-column label="操作" :width="columnWidths.action" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row.id)">编辑</el-button>
            <el-button
              type="primary"
              link
              size="small"
              @click="handleAuditToggle(row)"
            >
              {{ row.auditStatus === 'audited' ? '反审核' : '审核' }}
            </el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
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

    :deep(.el-input__wrapper),
    :deep(.el-select .el-input__wrapper),
    :deep(.el-date-editor.el-input__wrapper) {
      box-shadow: none !important;
      border: none !important;
      border-bottom: 1px solid #e4e7ed !important;
      border-radius: 0 !important;
      background: transparent !important;
    }
  }

  .button-group {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
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
  overflow-x: auto;

  :deep(.common-table.el-table) {
    --table-line-color: #d9d9d9;
    --table-row-odd-bg: #f0f7ff;
    --table-row-even-bg: #f5f5f5;
    --table-row-hover-bg: #fff3cd;
    --table-header-bg: #f5f7fa;

    th.el-table__cell {
      background: var(--table-header-bg) !important;
      color: #344054;
      font-weight: 600;
      text-align: center !important;
    }

    .el-table__body-wrapper tr:nth-child(odd) > td.el-table__cell {
      background-color: var(--table-row-odd-bg) !important;
    }

    .el-table__body-wrapper tr:nth-child(even) > td.el-table__cell {
      background-color: var(--table-row-even-bg) !important;
    }

    .el-table__body-wrapper tr:hover > td.el-table__cell {
      background-color: var(--table-row-hover-bg) !important;
    }
  }
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
