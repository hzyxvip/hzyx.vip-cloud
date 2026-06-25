<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Download, Upload } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { warehouses, locations, locationStore, loadLocationsFromApi, loadWarehousesFromApi, getCurrentCompany, type Location } from '@/utils/dataStore'
import { hydrateWarehouseOptionsFromServer } from '@/utils/warehouseSettings'
import { useTableStyle } from '@/composables/useTableStyle'
import { useStockBatchModifyActions } from '@/composables/useStockBatchModifyActions'
import {
  LOCATION_BATCH_MODIFY_COLUMNS,
  getLocationBatchModifySelectOptions
} from '@/utils/stockBatchModifyOptions'
import {
  buildBatchLocationDeleteConfirm,
  buildLocationDeleteConfirm
} from '@/utils/stockDeleteGuard'
import '@/styles/product-list-table.scss'
import '@/styles/data-list-page.scss'

const searchKeyword = ref('')
const showActiveOnly = ref(true)
const currentPage = ref(1)
const pageSize = ref(20)
const dialogVisible = ref(false)
const isEditing = ref(false)
const selectedIds = ref<number[]>([])
const showFilter = ref(false)
const tableRef = ref()
const selectedWarehouse = ref('全部')

interface EditForm {
  id: number | null
  warehouse: string
  code: string
  name: string
  area: string
  remark: string
  status: string
}

const editForm = ref<EditForm>({
  id: null,
  warehouse: '',
  code: '',
  name: '',
  area: '',
  remark: '',
  status: '启用'
})

const { columnWidths, handleHeaderDragend } = useTableStyle('location-data', [
  { key: 'selection', label: '', defaultWidth: 50 },
  { key: 'code', label: '仓位编码', defaultWidth: 120 },
  { key: 'name', label: '仓位名称', defaultWidth: 150 },
  { key: 'warehouse', label: '对应仓库', defaultWidth: 150 },
  { key: 'remark', label: '备注', defaultWidth: 200 },
  { key: 'status', label: '状态', defaultWidth: 80 }
])

const warehouseTree = computed(() => {
  const currentCompanyId = getCurrentCompany()
  const activeWarehouses = warehouses.value.filter(w => w.companyId === currentCompanyId && w.status === '启用')
  return [
    {
      label: '全部',
      value: '全部',
      children: activeWarehouses.map(w => ({
        label: w.name,
        value: w.name
      }))
    }
  ]
})

const filteredLocations = computed(() => {
  const currentCompanyId = getCurrentCompany()
  let data = locations.value.filter(l => l.companyId === currentCompanyId)

  if (showActiveOnly.value) {
    data = data.filter(l => l.status === '启用')
  }

  if (selectedWarehouse.value !== '全部') {
    data = data.filter(l => l.warehouse === selectedWarehouse.value)
  }

  if (!searchKeyword.value) return data

  const keyword = searchKeyword.value.toLowerCase()
  return data.filter(l =>
    l.code.toLowerCase().includes(keyword) ||
    l.name.toLowerCase().includes(keyword) ||
    (l.warehouse && l.warehouse.toLowerCase().includes(keyword)) ||
    (l.area && l.area.toLowerCase().includes(keyword))
  )
})

const total = computed(() => filteredLocations.value.length)

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredLocations.value.slice(start, end)
})

const activeWarehouses = computed(() => {
  const currentCompanyId = getCurrentCompany()
  return warehouses.value.filter(w => w.companyId === currentCompanyId && w.status === '启用')
})

const handleSearch = () => {
  currentPage.value = 1
}

const handleReset = () => {
  searchKeyword.value = ''
  showActiveOnly.value = true
  selectedWarehouse.value = '全部'
  currentPage.value = 1
}

const handleAdd = () => {
  isEditing.value = false
  editForm.value = {
    id: null,
    warehouse: '',
    code: '',
    name: '',
    area: '',
    remark: '',
    status: '启用'
  }
  dialogVisible.value = true
}

const handleEdit = (row: typeof locations.value[0]) => {
  isEditing.value = true
  editForm.value = {
    id: row.id,
    warehouse: row.warehouse,
    code: row.code,
    name: row.name,
    area: row.area,
    remark: '',
    status: row.status || '启用'
  }
  dialogVisible.value = true
}

const handleSave = () => {
  if (!editForm.value.warehouse || !editForm.value.code || !editForm.value.name) {
    ElMessage.warning('请填写所属仓库、仓位编码和仓位名称')
    return
  }

  const currentCompanyId = getCurrentCompany()
  const codeExists = locations.value.some(l => l.code === editForm.value.code && l.companyId === currentCompanyId && l.id !== editForm.value.id)
  if (codeExists) {
    ElMessage.warning('仓位编码已存在')
    return
  }

  const nameExists = locations.value.some(l => l.name === editForm.value.name && l.warehouse === editForm.value.warehouse && l.companyId === currentCompanyId && l.id !== editForm.value.id)
  if (nameExists) {
    ElMessage.warning('同仓库下仓位名称已存在')
    return
  }

  if (isEditing.value && editForm.value.id) {
    locationStore.update(editForm.value.id, {
      warehouse: editForm.value.warehouse,
      code: editForm.value.code,
      name: editForm.value.name,
      area: editForm.value.area,
      status: editForm.value.status
    })
    ElMessage.success('编辑成功')
  } else {
    locationStore.add({
      companyId: currentCompanyId,
      warehouse: editForm.value.warehouse,
      code: editForm.value.code,
      name: editForm.value.name,
      area: editForm.value.area,
      status: '启用'
    })
    ElMessage.success('新增成功')
  }

  dialogVisible.value = false
}

const handleSaveAndNew = () => {
  handleSave()
  if (!dialogVisible.value) {
    handleAdd()
  }
}

const handleDelete = (row: typeof locations.value[0]) => {
  const confirm = buildLocationDeleteConfirm(row)
  ElMessageBox.confirm(confirm.message, confirm.title, {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    locationStore.delete(row.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const handleToggleStatus = (row: typeof locations.value[0]) => {
  locationStore.update(row.id, { status: row.status })
  ElMessage.success(row.status === '启用' ? '已启用' : '已停用')
}

const handleBatchEnable = () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要启用的库位')
    return
  }
  selectedIds.value.forEach(id => {
    locationStore.update(id, { status: '启用' })
  })
  ElMessage.success(`成功启用 ${selectedIds.value.length} 个库位`)
  clearTableSelection()
}

const handleBatchDisable = () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要停用的库位')
    return
  }
  selectedIds.value.forEach(id => {
    locationStore.update(id, { status: '停用' })
  })
  ElMessage.success(`成功停用 ${selectedIds.value.length} 个库位`)
  clearTableSelection()
}

const handleBatchDelete = () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要删除的库位')
    return
  }
  const confirm = buildBatchLocationDeleteConfirm(selectedIds.value, locations.value)
  if (!confirm.ids.length) return
  ElMessageBox.confirm(confirm.message, confirm.title, {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    confirm.ids.forEach(id => locationStore.delete(id))
    ElMessage.success(`成功删除 ${confirm.ids.length} 个库位`)
    clearTableSelection()
  }).catch(() => {})
}

const handleRefresh = async () => {
  await Promise.all([loadLocationsFromApi(), loadWarehousesFromApi()])
  currentPage.value = 1
  clearTableSelection()
  ElMessage.success('刷新成功')
}

const exportToExcel = () => {
  const exportData = filteredLocations.value.map((item, index) => ({
    '行号': index + 1,
    '仓位编码': item.code,
    '仓位名称': item.name,
    '对应仓库': item.warehouse,
    '区域': item.area || '',
    '备注': '',
    '状态': item.status
  }))

  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '库位管理')

  const now = new Date()
  const month = now.getMonth() + 1 < 10 ? '0' + (now.getMonth() + 1) : String(now.getMonth() + 1)
  const day = now.getDate() < 10 ? '0' + now.getDate() : String(now.getDate())
  const fileName = `库位管理_${now.getFullYear()}${month}${day}.xlsx`

  XLSX.writeFile(workbook, fileName)
  ElMessage.success('导出成功')
}

const handleSelectionChange = (rows: Location[]) => {
  selectedIds.value = rows.map(row => row.id)
}

const clearTableSelection = () => {
  selectedIds.value = []
  tableRef.value?.clearSelection()
}

const {
  showBatchModifyDialog,
  batchModifyColumn,
  batchModifyValue,
  batchModifiableColumns,
  batchModifyColumnDef,
  batchModifySelectOptions,
  openBatchModifyDialog,
  confirmBatchModify
} = useStockBatchModifyActions({
  entityLabel: '库位',
  columns: LOCATION_BATCH_MODIFY_COLUMNS,
  selectedIds,
  getSelectOptions: (key) => getLocationBatchModifySelectOptions(key, activeWarehouses.value.map(item => item.name)),
  applyUpdate: (id, prop, value) => {
    locationStore.update(id, { [prop]: value })
  },
  clearSelection: clearTableSelection
})

onMounted(() => {
  void Promise.all([loadLocationsFromApi(), hydrateWarehouseOptionsFromServer()])
})
</script>

<template>
  <div class="location-page data-list-page">
    <!-- 左侧仓库树 -->
    <div class="left-sidebar">
      <div class="sidebar-header">
        <span>仓库列表</span>
        <el-link type="primary" :underline="false" @click="handleAdd">
          <el-icon><Plus /></el-icon>
        </el-link>
      </div>
      <el-tree
        :data="warehouseTree"
        :props="{ label: 'label', children: 'children' }"
        node-key="value"
        :default-expand-all="true"
        :highlight-current="true"
        @node-click="(data: any) => { selectedWarehouse = data.value || data.label; handleSearch() }"
      >
        <template #default="{ node }">
          <span class="tree-node">
            <el-icon v-if="node.level === 1"><HomeFilled /></el-icon>
            <el-icon v-else><Location /></el-icon>
            <span>{{ node.label }}</span>
          </span>
        </template>
      </el-tree>
    </div>

    <!-- 右侧内容区 -->
    <div class="right-content">
      <div class="page-header">
        <h1>仓位</h1>
      </div>

      <div class="search-card">
        <div class="search-row">
          <el-form inline class="search-form list-search-form">
            <el-form-item>
              <el-input
                v-model="searchKeyword"
                placeholder="搜索仓位编码或名称或仓库或区域"
                style="width: 320px"
                clearable
                @keyup.enter="handleSearch"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="显示范围">
              <el-select v-model="showActiveOnly" style="width: 100px" @change="currentPage = 1">
                <el-option :value="true" label="显示在用" />
                <el-option :value="false" label="全部" />
              </el-select>
            </el-form-item>
          </el-form>
          <div class="button-group">
            <el-button type="primary" class="btn-teal" @click="handleSearch">查询</el-button>
            <el-button @click="handleRefresh">刷新</el-button>
            <el-button type="primary" class="btn-teal" @click="handleReset">重置</el-button>
            <el-button type="primary" class="btn-teal" @click="handleAdd">新增</el-button>
            <el-button type="primary" class="btn-teal" @click="showFilter = !showFilter">
              {{ showFilter ? '隐藏过滤' : '展开过滤' }}
            </el-button>
            <el-button @click="exportToExcel">导出</el-button>
          </div>
        </div>
        <div v-show="showFilter" class="search-advanced">
          <el-form inline>
            <el-form-item label="所属仓库">
              <el-select v-model="selectedWarehouse" style="width: 200px" @change="handleSearch">
                <el-option label="全部仓库" value="全部" />
                <el-option v-for="w in activeWarehouses" :key="w.id" :label="w.name" :value="w.name" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="showActiveOnly" style="width: 120px">
                <el-option :value="true" label="启用" />
                <el-option :value="false" label="全部" />
              </el-select>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <div class="action-bar">
        <div class="action-bar-left">
          已选中 <strong>{{ selectedIds.length }}</strong> 条
        </div>
        <div class="action-bar-controls">
          <el-button type="primary" link size="small" @click="handleBatchEnable">启用</el-button>
          <el-button type="primary" link size="small" @click="handleBatchDisable">停用</el-button>
          <el-button type="primary" link size="small" @click="openBatchModifyDialog">修改</el-button>
          <el-button type="primary" link size="small" @click="handleBatchDelete">删除</el-button>
        </div>
        <div class="action-bar-extra">
          <el-button class="btn-teal" type="primary" size="small" @click="handleAdd">新增仓位</el-button>
        </div>
      </div>

      <div class="table-card product-list-table-card">
        <div class="table-scroll product-list-table-scroll">
        <el-table
          ref="tableRef"
          :data="paginatedData"
          class="common-table"
          border
          size="small"
          :fit="true"
          :row-key="(row: Location) => row.id"
          @header-dragend="handleHeaderDragend"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" :width="columnWidths.selection" />
          <el-table-column prop="code" label="仓位编码" :width="columnWidths.code" />
          <el-table-column prop="name" label="仓位名称" :width="columnWidths.name" />
          <el-table-column prop="warehouse" label="对应仓库" :width="columnWidths.warehouse" />
          <el-table-column label="备注" :width="columnWidths.remark" />
          <el-table-column label="状态" :width="columnWidths.status" align="center">
            <template #default="scope">
              <el-switch v-model="scope.row.status" active-value="启用" inactive-value="停用" size="small" @change="handleToggleStatus(scope.row)" />
            </template>
          </el-table-column>
        </el-table>
        </div>

        <div class="pagination">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            size="small"
            @size-change="currentPage = 1"
          />
        </div>
      </div>
    </div>

    <!-- 修改 -->
    <el-dialog
      v-model="showBatchModifyDialog"
      title="修改（库位）"
      width="480px"
      draggable
      :close-on-click-modal="false"
    >
      <el-form label-width="80px" class="list-search-form">
        <el-form-item label="修改列：">
          <el-select v-model="batchModifyColumn" placeholder="选择列" style="width: 100%" filterable>
            <el-option
              v-for="col in batchModifiableColumns"
              :key="col.key"
              :label="col.label"
              :value="col.key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="新值：">
          <el-select
            v-if="batchModifySelectOptions"
            v-model="batchModifyValue"
            :placeholder="`请选择${batchModifyColumnDef?.label || ''}`"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="opt in batchModifySelectOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <el-input v-else v-model="batchModifyValue" placeholder="请输入新值" clearable />
        </el-form-item>
        <p class="batch-modify-tip">
          将修改已选 {{ selectedIds.length }} 条库位的「{{ batchModifyColumnDef?.label || '对应字段' }}」
        </p>
      </el-form>
      <template #footer>
        <el-button @click="showBatchModifyDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmBatchModify">确定</el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="isEditing ? '编辑仓位' : '新增仓位'" v-model="dialogVisible" width="500px" destroy-on-close>
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="所属仓库" required>
          <el-select v-model="editForm.warehouse" style="width: 100%">
            <el-option v-for="wh in activeWarehouses" :key="wh.id" :value="wh.name" :label="wh.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="仓位编码" required>
          <el-input v-model="editForm.code" :disabled="isEditing" placeholder="请输入仓位编码" />
        </el-form-item>
        <el-form-item label="仓位名称" required>
          <el-input v-model="editForm.name" placeholder="请输入仓位名称" />
        </el-form-item>
        <el-form-item label="区域">
          <el-input v-model="editForm.area" placeholder="请输入区域" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.status" style="width: 100%">
            <el-option label="启用" value="启用" />
            <el-option label="停用" value="停用" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确定并关闭</el-button>
        <el-button type="primary" @click="handleSaveAndNew">确定并新增</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.location-page {
  display: flex;
  height: calc(100vh - 60px);
  background: #f5f7fa;
}

.left-sidebar {
  width: 200px;
  padding: 16px;

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-weight: 600;
    font-size: 14px;
    color: #344054;
  }

  .tree-node {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }
}

.right-content {
  flex: 1;
  padding: 16px 20px;
  overflow-y: auto;
}

.page-header {
  margin-bottom: 12px;

  h1 {
    font-size: 20px;
    font-weight: 600;
    color: #344054;
    margin: 0;
  }
}

.batch-modify-tip {
  margin: 0;
  padding-left: 80px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}
</style>