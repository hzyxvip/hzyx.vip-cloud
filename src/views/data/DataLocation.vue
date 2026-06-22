<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, ArrowDown, ArrowUp, Plus, Download, Upload } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { warehouses, locations, locationStore, refreshData, getCurrentCompany, type Location } from '@/utils/dataStore'
import { useTableStyle } from '@/composables/useTableStyle'

const searchKeyword = ref('')
const showActiveOnly = ref(true)
const currentPage = ref(1)
const pageSize = ref(20)
const dialogVisible = ref(false)
const isEditing = ref(false)
const selectedIds = ref<number[]>([])
const selectAll = ref(false)
const showFilter = ref(false)
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
  { key: 'action', label: '操作', defaultWidth: 80 },
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
  ElMessageBox.confirm(`确定删除仓位 "${row.name}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    locationStore.delete(row.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const handleToggleStatus = (row: typeof locations.value[0]) => {
  const newStatus = row.status === '启用' ? '停用' : '启用'
  locationStore.update(row.id, { status: newStatus })
  ElMessage.success(newStatus === '启用' ? '已启用' : '已停用')
}

const handleBatchEnable = () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要启用的仓位')
    return
  }
  selectedIds.value.forEach(id => {
    locationStore.update(id, { status: '启用' })
  })
  ElMessage.success(`成功启用 ${selectedIds.value.length} 个仓位`)
  selectedIds.value = []
  selectAll.value = false
}

const handleBatchDisable = () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要停用的仓位')
    return
  }
  selectedIds.value.forEach(id => {
    locationStore.update(id, { status: '停用' })
  })
  ElMessage.success(`成功停用 ${selectedIds.value.length} 个仓位`)
  selectedIds.value = []
  selectAll.value = false
}

const handleBatchDelete = () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要删除的仓位')
    return
  }
  ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 个仓位吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    selectedIds.value.forEach(id => locationStore.delete(id))
    ElMessage.success(`成功删除 ${selectedIds.value.length} 个仓位`)
    selectedIds.value = []
    selectAll.value = false
  }).catch(() => {})
}

const handleRefresh = () => {
  refreshData()
  currentPage.value = 1
  selectedIds.value = []
  selectAll.value = false
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

const handleSelectAll = () => {
  if (selectAll.value) {
    selectedIds.value = paginatedData.value.map(row => row.id)
  } else {
    selectedIds.value = []
  }
}

const handleSelectRow = (id: number) => {
  const index = selectedIds.value.indexOf(id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(id)
  }
  selectAll.value = selectedIds.value.length === paginatedData.value.length
}
</script>

<template>
  <div class="location-page">
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

      <!-- 搜索和操作栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
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
          <el-button class="btn-gray" @click="showFilter = !showFilter">
            <el-icon><component :is="showFilter ? ArrowUp : ArrowDown" /></el-icon>
            展开过滤
          </el-button>
          <el-select v-model="showActiveOnly" style="width: 100px" @change="currentPage = 1">
            <el-option :value="true" label="显示在用" />
            <el-option :value="false" label="全部" />
          </el-select>
        </div>
        <div class="toolbar-right">
          <el-button type="success" @click="handleAdd">
            <el-icon><Plus /></el-icon>新增
          </el-button>
          <el-button class="btn-gray" @click="exportToExcel">
            <el-icon><Download /></el-icon>导出
          </el-button>
          <el-button class="btn-gray">
            <el-icon><Upload /></el-icon>引入
          </el-button>
        </div>
      </div>

      <!-- 高级筛选 -->
      <div v-show="showFilter" class="filter-panel">
        <el-form :inline="true">
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
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 批量操作 -->
      <div class="batch-bar">
        <el-button class="btn-gray" size="small" @click="handleBatchEnable">启用</el-button>
        <el-button class="btn-gray" size="small" @click="handleBatchDisable">禁用</el-button>
        <el-button class="btn-gray" size="small" @click="handleBatchDelete">删除</el-button>
        <el-button class="btn-gray" size="small">复制</el-button>
      </div>

      <!-- 表格 -->
      <div class="table-card">
        <el-table
          :data="paginatedData"
          border
          stripe
          size="small"
          :fit="true"
          :row-key="(row: Location) => row.id"
          @header-dragend="handleHeaderDragend"
        >
          <el-table-column type="selection" :width="columnWidths.selection" :selectable="(row: Location) => row.status !== '停用'" @select-all="handleSelectAll" @select="(_val: any, row: Location) => handleSelectRow(row.id)" />
          <el-table-column label="操作" :width="columnWidths.action" align="center">
            <template #default="scope">
              <el-button type="text" size="small" @click="handleEdit(scope.row)">编辑</el-button>
            </template>
          </el-table-column>
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

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            size="small"
            @size-change="currentPage = 1"
          >
            <template #total>共 {{ total }} 条</template>
          </el-pagination>
        </div>
      </div>
    </div>

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
  background: #F5F7FA;
}

.left-sidebar {
  width: 200px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
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
  padding: 20px;
  overflow-y: auto;
}

.page-header {
  margin-bottom: 16px;

  h1 {
    font-size: 20px;
    font-weight: 600;
    color: #344054;
    margin: 0;
  }
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 12px;

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }
}

.filter-panel {
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 12px;
}

.batch-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fff;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #e4e7ed;
}

.table-card {
  background: #fff;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  :deep(.el-table__header-wrapper th) {
    background: #f5f7fa;
    color: #344054;
    font-weight: 600;
    text-align: center !important;
  }
  :deep(.el-table__row:nth-child(odd)) {
    background-color: #F0F9F7;
  }
  
  :deep(.el-table__row:nth-child(even)) {
    background-color: #FFFFFF;
  }
  
  :deep(.el-table__body tr:hover > td) {
    background-color: #D4EDE6 !important;
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 16px;
}

.btn-gray {
  --el-button-text-color: #666666 !important;
  --el-button-bg-color: transparent !important;
  --el-button-border-color: #d9d9d9 !important;

  &:hover {
    --el-button-text-color: #409eff !important;
    --el-button-border-color: #409eff !important;
  }
}
</style>