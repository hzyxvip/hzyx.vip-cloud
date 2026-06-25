<script setup lang="ts">
import '@/styles/data-list-table.scss'
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Plus, Refresh, Setting } from '@element-plus/icons-vue'
import { useTableStyle } from '@/composables/useTableStyle'
import { usePartnerListBatchAudit } from '@/composables/usePartnerListBatchAudit'
import { useCustomerListBatchActions } from '@/composables/useCustomerListBatchActions'
import PlatformVipBadge from '@/components/customer/PlatformVipBadge.vue'
import { ElMessage } from 'element-plus'
import {
  getTradingPartners,
  upsertTradingPartner,
  type TradingPartner
} from '@/utils/platformCollaborationService'
import {
  batchSetCustomerAuditStatus,
  loadAndEnsureCustomerList,
  hydrateCustomerListFromServer,
  type CustomerMaster
} from '@/utils/customerStore'
import {
  CUSTOMER_LIST_COLUMN_DEFINITIONS,
  useCustomerListColumnSettings
} from '@/composables/useCustomerListColumnSettings'

const router = useRouter()
const tableRef = ref()
const selectedRows = ref<CustomerMaster[]>([])

const showAdvancedFilter = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)

const customerTypeOptions = [
  { label: '医院', value: 'hospital' },
  { label: '诊所', value: 'clinic' },
  { label: '药店', value: 'pharmacy' },
  { label: '医疗器械公司', value: 'deviceCompany' },
  { label: '其他', value: 'other' }
]

const auditStatusOptions = [
  { label: '未审核', value: 'notAudited' },
  { label: '已审核', value: 'audited' }
]

const statusOptions = [
  { label: '正常', value: 'normal' },
  { label: '隐匿', value: 'disabled' }
]

/** 按日历日比较，避免 ISO 日期字符串与本地 Date 边界比较导致当天记录被筛掉 */
const parseCalendarDay = (value: string | Date): number => {
  if (typeof value === 'string') {
    const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (matched) {
      return new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3])).getTime()
    }
  }
  const date = new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

const searchForm = ref({
  keyword: '',
  dateRange: [] as Date[],
  customerType: [] as string[],
  auditStatus: [] as string[],
  status: [] as string[]
})

onMounted(() => {
  void (async () => {
    const savedForm = localStorage.getItem('customer-search-form')
    if (savedForm) {
      try {
        const parsed = JSON.parse(savedForm)
        Object.assign(searchForm.value, parsed)

        if (parsed.dateRange && Array.isArray(parsed.dateRange)) {
          searchForm.value.dateRange = parsed.dateRange.map((d: string) => new Date(d))
        } else {
          searchForm.value.dateRange = []
        }

        showAdvancedFilter.value = parsed.showAdvancedFilter || false
      } catch {
        searchForm.value.dateRange = []
      }
    }

    loadCustomerListData()
    loadCustomerCollaboration()

    void hydrateCustomerListFromServer().then(() => {
      loadCustomerListData()
      loadCustomerCollaboration()
    })
  })()
})

const loadCustomerListData = () => {
  tableData.value = loadAndEnsureCustomerList()
}

const saveSearchForm = () => {
  const toSave = {
    ...searchForm.value,
    showAdvancedFilter: showAdvancedFilter.value
  }
  localStorage.setItem('customer-search-form', JSON.stringify(toSave))
}

watch(() => [searchForm.value.customerType, searchForm.value.auditStatus, searchForm.value.status], () => {
  saveSearchForm()
}, { deep: true })

const tableData = ref<CustomerMaster[]>([])

const customerTypeLabels: Record<string, string> = {
  hospital: '医院',
  clinic: '诊所',
  pharmacy: '药店',
  deviceCompany: '医疗器械公司',
  other: '其他'
}

const auditStatusLabels: Record<string, string> = {
  notAudited: '未审核',
  audited: '审核'
}

const statusLabels: Record<string, { text: string; color: string }> = {
  normal: { text: '正常', color: 'success' },
  disabled: { text: '隐匿', color: 'danger' }
}

const { columnWidths, handleHeaderDragend } = useTableStyle('customer-list', [
  { key: 'index', label: '序号', defaultWidth: 56 },
  { key: 'select', label: '', defaultWidth: 42 },
  ...CUSTOMER_LIST_COLUMN_DEFINITIONS.map(col => ({
    key: col.key,
    label: col.label,
    prop: col.prop,
    defaultWidth: col.defaultWidth
  }))
])

const {
  showColumnSelector,
  columnOptions,
  selectedColumns,
  sortedVisibleColumns,
  tableColumnRenderKey,
  openColumnSettings,
  handleColumnDragStart,
  handleColumnDragOver,
  handleColumnDrop,
  confirmColumnSelection
} = useCustomerListColumnSettings('customer-list')

const customerPartnerKey = (name: string) => `customer:${name}`

const loadCustomerCollaboration = () => {
  const partners = getTradingPartners()
  tableData.value.forEach((row: Record<string, unknown>) => {
    if (row.collaborationEnabled === undefined) row.collaborationEnabled = true
    const p = partners.find(x => x.partnerKey === customerPartnerKey(String(row.name)))
    if (p) row.collaborationEnabled = p.collaborationEnabled !== false
  })
}

const handleCustomerCollaborationChange = (row: { name: string; collaborationEnabled: boolean }) => {
  const partner: TradingPartner = {
    partnerKey: customerPartnerKey(row.name),
    partnerType: 'customer',
    partnerName: row.name,
    platformCompanyId: 0,
    collaborationEnabled: row.collaborationEnabled
  }
  upsertTradingPartner(partner)
  ElMessage.success(row.collaborationEnabled ? '已开启平台协同' : '已关闭平台协同')
}

const handleSelectAll = (field: string, options: any[], checkValues: string[]) => {
  if (checkValues.length === options.length) {
    switch (field) {
      case 'customerType':
        searchForm.value.customerType = []
        break
      case 'auditStatus':
        searchForm.value.auditStatus = []
        break
      case 'status':
        searchForm.value.status = []
        break
    }
  } else {
    switch (field) {
      case 'customerType':
        searchForm.value.customerType = options.map(opt => opt.value)
        break
      case 'auditStatus':
        searchForm.value.auditStatus = options.map(opt => opt.value)
        break
      case 'status':
        searchForm.value.status = options.map(opt => opt.value)
        break
    }
  }
}

const filteredData = computed(() => {
  return tableData.value.filter(item => {
    if (searchForm.value.keyword) {
      const keywords = searchForm.value.keyword.trim().split(/\s+/).filter(k => k)
      if (keywords.length > 0) {
        const matchFields = [
          item.code,
          item.id,
          item.name,
          item.contact,
          item.phone,
          item.mobile,
          item.address,
          item.email
        ]
        const allMatch = keywords.every(keyword => {
          const kw = keyword.toLowerCase()
          return matchFields.some(field => 
            String(field).toLowerCase().includes(kw)
          )
        })
        if (!allMatch) {
          return false
        }
      }
    }
    
    if (searchForm.value.dateRange.length === 2) {
      const itemDay = parseCalendarDay(item.createTime)
      const [startDate, endDate] = searchForm.value.dateRange
      const startDay = parseCalendarDay(startDate)
      const endDay = parseCalendarDay(endDate)
      if (itemDay < startDay || itemDay > endDay) {
        return false
      }
    }
    
    if (searchForm.value.customerType.length > 0 && !searchForm.value.customerType.includes(item.type)) {
      return false
    }
    
    if (searchForm.value.auditStatus.length > 0 && !searchForm.value.auditStatus.includes(item.auditStatus)) {
      return false
    }
    
    if (searchForm.value.status.length > 0 && !searchForm.value.status.includes(item.status)) {
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

const handleCreate = () => {
  router.push('/data/customer/create')
}

const handleEdit = (id: string) => {
  router.push(`/data/customer/create/${id}`)
}

const handleRowDoubleClick = (row: any) => {
  router.push(`/data/customer/detail/${row.id}`)
}

const handleCodeClick = (row: any) => {
  router.push(`/data/customer/detail/${row.id}`)
}

const handleSearch = () => {
  saveSearchForm()
  currentPage.value = 1
  ElMessage.success(`筛选条件已应用，共找到 ${filteredData.value.length} 条记录`)
}

const handleReset = () => {
  searchForm.value = {
    keyword: '',
    dateRange: [],
    customerType: [],
    auditStatus: [],
    status: []
  }
}

const handleRefresh = () => {
  loadCustomerListData()
  loadCustomerCollaboration()
  currentPage.value = 1
  clearTableSelection()
  ElMessage.success('数据已刷新')
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
}

const handleSelectionChange = (rows: CustomerMaster[]) => {
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
  entityLabel: '客户',
  batchSetAudit: batchSetCustomerAuditStatus,
  onAfterAudit: loadCustomerListData
})

const {
  showBatchModifyDialog,
  batchModifyColumn,
  batchModifyValue,
  batchModifiableColumns,
  batchModifyColumnDef,
  batchModifySelectOptions,
  handleToolbarEdit,
  handleBatchDelete,
  handleBatchHide,
  handleBatchConfirm,
  openBatchModifyDialog,
  confirmBatchModify
} = useCustomerListBatchActions(tableData, selectedRows, clearTableSelection, {
  onEdit: handleEdit,
  onAfterChange: () => {
    loadCustomerListData()
    loadCustomerCollaboration()
  }
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-info">
        <h1>客户列表</h1>
        <div class="breadcrumb">首页 / 资料管理 / 基础资料 / 客户列表</div>
      </div>
    </div>

    <div class="search-card">
      <div class="search-row">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="searchForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              clearable
              style="width: 240px;"
              @change="saveSearchForm()"
            />
          </el-form-item>
          <el-form-item class="keyword-input">
            <el-input v-model="searchForm.keyword" placeholder="医享平台编号/客户名称/联系人/电话/地址/邮箱" clearable style="width: 320px;" @input="saveSearchForm()" />
          </el-form-item>
        </el-form>
        <div class="button-group">
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleRefresh">刷新</el-button>
          <el-button type="primary" @click="handleCreate">新增</el-button>
          <el-button :disabled="selectedRows.length !== 1" @click="handleToolbarEdit">修改</el-button>
          <el-button :disabled="selectedRows.length === 0" @click="openBatchModifyDialog">批量修改</el-button>
          <el-button
            plain
            :disabled="selectedRows.length === 0"
            @click="handleBatchHide"
          >隐匿</el-button>
          <el-button
            v-if="canAudit"
            plain
            class="btn-audit-pending"
            :disabled="!canBatchAudit"
            @click="handleBatchConfirm"
          >审核</el-button>
          <el-button
            v-if="canAudit"
            class="btn-unaudit-pink"
            plain
            :disabled="!canBatchUnaudit"
            @click="handleBatchAudit('unaudit')"
          >反确定</el-button>
          <el-button
            type="danger"
            plain
            :disabled="selectedRows.length === 0"
            @click="handleBatchDelete"
          >删除</el-button>
          <el-button
            :type="showAdvancedFilter ? 'success' : 'default'"
            @click="showAdvancedFilter = !showAdvancedFilter; saveSearchForm()"
          >
            {{ showAdvancedFilter ? '隐藏筛选' : '高级筛选' }}
          </el-button>
        </div>
      </div>

      <div class="search-advanced" v-show="showAdvancedFilter">
        <div class="filter-row">
          <div class="filter-item">
            <span class="filter-label">客户类型：</span>
            <el-checkbox-group v-model="searchForm.customerType">
              <el-checkbox-button 
                v-for="opt in customerTypeOptions" 
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
      <div class="table-toolbar">
        <div class="table-summary">共 {{ filteredData.length }} 条</div>
        <el-button
          type="primary"
          link
          size="small"
          class="customer-list-settings-btn"
          @click="openColumnSettings"
        >
          <el-icon><Setting /></el-icon>
          列表设置
        </el-button>
      </div>
      <div v-if="sortedVisibleColumns.length === 0" class="header-empty-tip">
        请点击「列表设置」选择要显示的列
      </div>
      <el-table
        v-else
        ref="tableRef"
        :key="tableColumnRenderKey"
        :data="pagedData"
        row-key="id"
        class="common-table"
        border
        :fit="true"
        @row-dblclick="handleRowDoubleClick"
        @header-dragend="handleHeaderDragend"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="index" label="序号" :index="indexMethod" :width="columnWidths.index" align="center" fixed="left" />
        <el-table-column type="selection" :width="columnWidths.select" fixed="left" />
        <el-table-column
          v-for="col in sortedVisibleColumns"
          :key="col.key"
          :prop="col.prop"
          :label="col.label"
          :width="columnWidths[col.key]"
          :align="col.align"
          :header-align="col.headerAlign || col.align || 'center'"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span
              v-if="col.key === 'name'"
              class="name-cell"
            >{{ row.name }}</span>
            <PlatformVipBadge
              v-else-if="col.key === 'onlineCustomer'"
              :customer="row"
              variant="text"
            />
            <span
              v-else-if="col.key === 'code'"
              class="code-link"
              @click="handleCodeClick(row)"
            >{{ row.code || row.id }}</span>
            <el-tag v-else-if="col.key === 'type'" size="small" type="info">
              {{ customerTypeLabels[row.type] || row.type }}
            </el-tag>
            <span v-else-if="col.key === 'auditStatus'">
              {{ auditStatusLabels[row.auditStatus] || '未审核' }}
            </span>
            <el-tag
              v-else-if="col.key === 'status'"
              size="small"
              :type="statusLabels[row.status]?.color || 'info'"
            >
              {{ statusLabels[row.status]?.text || '正常' }}
            </el-tag>
            <el-switch
              v-else-if="col.key === 'collaboration'"
              v-model="row.collaborationEnabled"
              inline-prompt
              active-text="开"
              inactive-text="关"
              @change="handleCustomerCollaborationChange(row)"
            />
            <span v-else>{{ row[col.prop] ?? '' }}</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="filteredData.length"
        />
      </div>
    </div>

    <el-dialog v-model="showBatchModifyDialog" title="批量修改客户资料" width="480px" draggable>
      <el-form label-width="88px">
        <el-form-item label="修改字段">
          <el-select v-model="batchModifyColumn" placeholder="请选择字段" style="width: 100%;">
            <el-option
              v-for="col in batchModifiableColumns"
              :key="col.key"
              :label="col.label"
              :value="col.key"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="batchModifyColumnDef?.label || '新值'">
          <el-select
            v-if="batchModifyColumnDef?.type === 'select'"
            v-model="batchModifyValue"
            placeholder="请选择"
            style="width: 100%;"
          >
            <el-option
              v-for="opt in batchModifySelectOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <el-input v-else v-model="batchModifyValue" placeholder="请输入新值" />
        </el-form-item>
        <p class="batch-modify-tip">将修改已选 {{ selectedRows.length }} 条客户的对应字段</p>
      </el-form>
      <template #footer>
        <el-button @click="showBatchModifyDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmBatchModify">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showColumnSelector"
      title="客户列表设置"
      width="760px"
      draggable
      class="customer-column-settings-dialog"
    >
      <div class="field-selector">
        <p class="sort-tip">勾选需要在列表中显示的列，拖拽可调整顺序</p>
        <el-checkbox-group v-model="selectedColumns">
          <el-row :gutter="10">
            <el-col :span="8" v-for="(col, index) in columnOptions" :key="col.key">
              <div
                class="field-item"
                draggable="true"
                @dragstart="(event) => handleColumnDragStart(event, index)"
                @dragover="handleColumnDragOver"
                @drop="(event) => handleColumnDrop(event, index)"
              >
                <span class="field-order">{{ index + 1 }}.</span>
                <el-checkbox :label="col.key" :disabled="col.required">{{ col.label }}</el-checkbox>
              </div>
            </el-col>
          </el-row>
        </el-checkbox-group>
      </div>
      <template #footer>
        <el-button @click="showColumnSelector = false">取消</el-button>
        <el-button type="primary" @click="confirmColumnSelection">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; background-color: #F5F7FA; min-height: calc(100vh - 60px); }
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h1 {
    font-size: 20px;
    font-weight: 600;
    color: #344054;
    margin: 0 0 6px;
  }
}

.page-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.breadcrumb {
  font-size: 14px;
  color: #667085;
}

.search-card { 
  background: transparent; 
  border-radius: 0; 
  padding: 0 0 16px 0; 
  margin-bottom: 16px;
  box-shadow: none; 
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

  .btn-audit-pending {
    --el-button-text-color: #b45309;
    --el-button-border-color: #fbbf24;
    --el-button-bg-color: #fef3c7;
    --el-button-hover-text-color: #92400e;
    --el-button-hover-border-color: #f59e0b;
    --el-button-hover-bg-color: #fde68a;
    --el-button-disabled-text-color: #fcd34d;
    --el-button-disabled-border-color: #fef3c7;
    --el-button-disabled-bg-color: #fffbeb;
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
      
      .filter-label {
        font-size: 14px;
        color: #667085;
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
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);

  .table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .table-summary {
    font-size: 13px;
    color: #667085;
  }

  .customer-list-settings-btn {
    --el-button-text-color: #1890ff;
    font-size: 13px;
    font-weight: 500;

    &:hover {
      --el-button-hover-text-color: #096dd9;
    }
  }

  .pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #e4e7ed;
  }
}

.header-empty-tip {
  padding: 40px 0;
  text-align: center;
  color: #1890ff;
  font-size: 14px;
  background: #e6f7ff;
  border-radius: 6px;
  margin-bottom: 8px;
}

.field-selector {
  max-height: 460px;
  overflow-y: auto;
  padding: 12px 0;

  .sort-tip {
    color: #096dd9;
    font-size: 15px;
    line-height: 1.6;
    margin-bottom: 14px;
    padding: 8px 12px;
    background: #e6f7ff;
    border: 1px solid #91d5ff;
    border-radius: 4px;
  }

  .field-item {
    cursor: move;
    padding: 8px 10px;
    border-radius: 4px;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;

    &:hover {
      background: #e6f7ff;
    }

    .field-order {
      color: #1890ff;
      font-size: 15px;
      min-width: 26px;
    }

    :deep(.el-checkbox) {
      height: auto;
    }

    :deep(.el-checkbox__label) {
      font-size: 15px;
      line-height: 1.5;
      color: #303133;
    }

    :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
      background-color: #1890ff;
      border-color: #1890ff;
    }

    :deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
      color: #096dd9;
    }
  }
}

:deep(.customer-column-settings-dialog) {
  .el-dialog__header {
    margin-right: 0;
    padding: 16px 20px;
    background: #e6f7ff;
    border-bottom: 1px solid #91d5ff;
  }

  .el-dialog__title {
    font-size: 18px;
    font-weight: 600;
    color: #096dd9;
  }

  .el-dialog__body {
    font-size: 15px;
  }

  .el-dialog__footer .el-button--primary {
    background-color: #1890ff;
    border-color: #1890ff;

    &:hover {
      background-color: #096dd9;
      border-color: #096dd9;
    }
  }
}

.code-link {
  color: #00bfa5;
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
  }
}

:deep(.el-button--primary) {
  background-color: #00bfa5 !important;
  border-color: #00bfa5 !important;
  color: #fff !important;
}

.batch-modify-tip {
  margin: 0;
  font-size: 13px;
  color: #909399;
}
</style>