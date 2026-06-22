<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { departments, departmentStore, getCurrentCompany, refreshData } from '@/utils/dataStore'
import { useTableStyle } from '@/composables/useTableStyle'

const searchKeyword = ref('')
const editingId = ref<number | null>(null)
const addingRow = ref(false)

const { columnWidths, handleHeaderDragend } = useTableStyle('department-list', [
  { key: 'id', label: '编号', defaultWidth: 60 },
  { key: 'code', label: '部门编码', defaultWidth: 100 },
  { key: 'name', label: '部门名称', defaultWidth: 120 },
  { key: 'parent', label: '上级部门', defaultWidth: 120 },
  { key: 'manager', label: '部门负责人', defaultWidth: 100 },
  { key: 'phone', label: '联系电话', defaultWidth: 120 },
  { key: 'action', label: '操作', defaultWidth: 150 }
])

interface DepartmentForm {
  id: number
  code: string
  name: string
  parent: string
  manager: string
  phone: string
}

const editRow = reactive<DepartmentForm>({
  id: 0,
  code: '',
  name: '',
  parent: '',
  manager: '',
  phone: ''
})

const newRow = reactive<DepartmentForm>({
  id: 0,
  code: '',
  name: '',
  parent: '',
  manager: '',
  phone: ''
})

const filteredData = computed(() => {
  const currentCompanyId = getCurrentCompany()
  let data = departments.value.filter(d => d.companyId === currentCompanyId)
  
  if (!searchKeyword.value) return data
  
  const keyword = searchKeyword.value.toLowerCase()
  return data.filter(item => 
    item.code.toLowerCase().includes(keyword) ||
    item.name.toLowerCase().includes(keyword) ||
    item.parent.toLowerCase().includes(keyword) ||
    item.manager.toLowerCase().includes(keyword)
  )
})

const startEdit = (row: typeof departments.value[0]) => {
  editingId.value = row.id
  editRow.id = row.id
  editRow.code = row.code
  editRow.name = row.name
  editRow.parent = row.parent
  editRow.manager = row.manager
  editRow.phone = row.phone
}

const saveEdit = () => {
  departmentStore.update(editRow.id, {
    code: editRow.code,
    name: editRow.name,
    parent: editRow.parent,
    manager: editRow.manager,
    phone: editRow.phone
  })
  editingId.value = null
  ElMessage.success('编辑成功')
}

const cancelEdit = () => {
  editingId.value = null
}

const startAdd = () => {
  addingRow.value = true
  newRow.code = ''
  newRow.name = ''
  newRow.parent = ''
  newRow.manager = ''
  newRow.phone = ''
}

const saveAdd = () => {
  if (!newRow.code || !newRow.name) {
    ElMessage.warning('请填写部门编码和部门名称')
    return
  }
  
  const currentCompanyId = getCurrentCompany()
  const codeExists = departments.value.some(d => d.code === newRow.code && d.companyId === currentCompanyId)
  if (codeExists) {
    ElMessage.warning('部门编码已存在')
    return
  }
  
  departmentStore.add({
    companyId: currentCompanyId,
    code: newRow.code,
    name: newRow.name,
    parent: newRow.parent || '无',
    manager: newRow.manager,
    phone: newRow.phone
  })
  addingRow.value = false
  ElMessage.success('新增成功')
}

const cancelAdd = () => {
  addingRow.value = false
}

const handleDelete = (row: typeof departments.value[0]) => {
  ElMessageBox.confirm(`确定删除部门 "${row.name}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    departmentStore.delete(row.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const handleRefresh = () => {
  refreshData()
  editingId.value = null
  addingRow.value = false
  ElMessage.success('刷新成功')
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>部门资料设定</h1>
      <div class="header-actions">
        <el-button class="btn-gray" @click="handleRefresh">刷新</el-button>
        <el-button class="btn-gray" @click="startAdd">新增</el-button>
      </div>
    </div>
    <div class="search-form">
      <el-input v-model="searchKeyword" placeholder="部门编码/名称" style="width: 200px;" clearable />
      <el-button class="btn-gray" @click="() => {}">查询</button>
    </div>
    <div class="table-card">
      <el-table :data="filteredData" class="common-table" border stripe size="small" :fit="true" @header-dragend="handleHeaderDragend">
        <el-table-column prop="id" label="编号" :width="columnWidths.id" align="center" />
        <el-table-column label="部门编码" :width="columnWidths.code">
          <template #default="{ row }">
            <template v-if="editingId !== row.id">{{ row.code }}</template>
            <el-input v-else v-model="editRow.code" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="部门名称" :width="columnWidths.name">
          <template #default="{ row }">
            <template v-if="editingId !== row.id">{{ row.name }}</template>
            <el-input v-else v-model="editRow.name" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="上级部门" :width="columnWidths.parent">
          <template #default="{ row }">
            <template v-if="editingId !== row.id">{{ row.parent }}</template>
            <el-input v-else v-model="editRow.parent" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="部门负责人" :width="columnWidths.manager">
          <template #default="{ row }">
            <template v-if="editingId !== row.id">{{ row.manager }}</template>
            <el-input v-else v-model="editRow.manager" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="联系电话" :width="columnWidths.phone">
          <template #default="{ row }">
            <template v-if="editingId !== row.id">{{ row.phone }}</template>
            <el-input v-else v-model="editRow.phone" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="操作" :width="columnWidths.action" align="center">
          <template #default="{ row }">
            <template v-if="editingId === row.id">
              <el-button type="text" size="small" @click="saveEdit">保存</el-button>
              <el-button type="text" size="small" @click="cancelEdit">取消</el-button>
            </template>
            <template v-else>
              <el-button type="text" size="small" @click="startEdit(row)">编辑</el-button>
              <el-button type="text" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </template>
        </el-table-column>
        <el-table-column label="" />
      </el-table>
      <div v-if="addingRow" class="add-row-form">
        <el-form :inline="true" size="small">
          <el-form-item label="部门编码"><el-input v-model="newRow.code" placeholder="部门编码" /></el-form-item>
          <el-form-item label="部门名称"><el-input v-model="newRow.name" placeholder="部门名称" /></el-form-item>
          <el-form-item label="上级部门"><el-input v-model="newRow.parent" placeholder="上级部门" /></el-form-item>
          <el-form-item label="部门负责人"><el-input v-model="newRow.manager" placeholder="部门负责人" /></el-form-item>
          <el-form-item label="联系电话"><el-input v-model="newRow.phone" placeholder="联系电话" /></el-form-item>
          <el-form-item>
            <el-button type="primary" size="small" @click="saveAdd">保存</el-button>
            <el-button size="small" @click="cancelAdd">取消</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; background-color: #F5F7FA; min-height: calc(100vh - 60px); }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; color: #344054; } }
.header-actions { display: flex; gap: 10px; }
.search-form { display: flex; gap: 12px; padding: 16px; background: #fff; border-radius: 8px; margin-bottom: 16px; }
.table-card { 
  background: #fff; 
  border-radius: 12px; 
  padding: 20px; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.06); 
  
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
.add-row-form { margin-top: 16px; padding: 16px; background: #f5f7fa; border-radius: 8px; }

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
