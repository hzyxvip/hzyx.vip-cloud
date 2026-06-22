<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTableDrag } from '@/composables/useTableDrag'

const searchKeyword = ref('')
const showLeave = ref(false)

const showAddDialog = ref(false)
const addForm = ref({
  id: '',
  personName: '',
  personCode: '',
  department: '',
  phone: '',
  position: ''
})

const editingId = ref<string | null>(null)
const originalData = ref<any>(null)

const columns = [
  { key: 'id', label: '序号', defaultWidth: 80, align: 'center' },
  { key: 'personCode', label: '人员编号', defaultWidth: 120, align: 'center' },
  { key: 'personName', label: '人员姓名', defaultWidth: 120, align: 'center' },
  { key: 'position', label: '职务', defaultWidth: 140, align: 'center' },
  { key: 'department', label: '所属部门', defaultWidth: 140, align: 'center' },
  { key: 'phone', label: '联系电话', defaultWidth: 140, align: 'center' },
  { key: 'remark', label: '备注', defaultWidth: 100, align: 'center' },
  { key: 'workStatus', label: '在职状态', defaultWidth: 100, align: 'center' },
  { key: 'action', label: '操作', defaultWidth: 180, align: 'center' },
  { key: 'empty', label: '', defaultWidth: 0 }
]

const { columnWidths, handleHeaderDragend } = useTableDrag('position', columns)

const defaultPositions = [
  { id: '01', personName: '张三', personCode: 'RY001', department: '总经理办公室', phone: '13800138001', position: '总经理', remark: '公司最高管理者', workStatus: '在职' },
  { id: '02', personName: '李四', personCode: 'RY002', department: '总经理办公室', phone: '13800138002', position: '副总经理', remark: '协助总经理管理公司', workStatus: '在职' },
  { id: '03', personName: '王五', personCode: 'RY003', department: '采购部', phone: '13800138003', position: '采购经理', remark: '负责采购管理工作', workStatus: '在职' },
  { id: '04', personName: '赵六', personCode: 'RY004', department: '销售部', phone: '13800138004', position: '销售经理', remark: '负责销售管理工作', workStatus: '在职' },
  { id: '05', personName: '孙七', personCode: 'RY005', department: '仓库管理部', phone: '13800138005', position: '仓库经理', remark: '负责仓库管理工作', workStatus: '在职' },
  { id: '06', personName: '周八', personCode: 'RY006', department: '财务部', phone: '13800138006', position: '财务经理', remark: '负责财务管理工作', workStatus: '在职' },
  { id: '07', personName: '吴九', personCode: 'RY007', department: '采购部', phone: '13800138007', position: '采购员', remark: '负责采购业务', workStatus: '在职' },
  { id: '08', personName: '郑十', personCode: 'RY008', department: '销售部', phone: '13800138008', position: '销售员', remark: '负责销售业务', workStatus: '在职' },
  { id: '09', personName: '刘一', personCode: 'RY009', department: '仓库管理部', phone: '13800138009', position: '仓管员', remark: '负责仓库管理', workStatus: '在职' },
  { id: '10', personName: '陈二', personCode: 'RY010', department: '财务部', phone: '13800138010', position: '会计', remark: '负责会计工作', workStatus: '在职' },
  { id: '11', personName: '杨三', personCode: 'RY011', department: '财务部', phone: '13800138011', position: '出纳', remark: '负责出纳工作', workStatus: '在职' },
  { id: '12', personName: '黄四', personCode: 'RY012', department: '质量部', phone: '13800138012', position: '质检员', remark: '负责质量检验', workStatus: '在职' },
  { id: '13', personName: '林五', personCode: 'RY013', department: '客服部', phone: '13800138013', position: '客服专员', remark: '负责客户服务', workStatus: '在职' },
  { id: '14', personName: '何六', personCode: 'RY014', department: '行政部', phone: '13800138014', position: '行政专员', remark: '负责行政事务', workStatus: '在职' },
  { id: '15', personName: '马七', personCode: 'RY015', department: '市场部', phone: '13800138015', position: '市场专员', remark: '负责市场推广', workStatus: '离职' }
]

const positions = ref<any[]>([])

// 从 localStorage 加载数据
const loadPositions = () => {
  const saved = localStorage.getItem('position-data')
  if (saved) {
    try {
      positions.value = JSON.parse(saved)
    } catch {
      positions.value = JSON.parse(JSON.stringify(defaultPositions))
    }
  } else {
    positions.value = JSON.parse(JSON.stringify(defaultPositions))
  }
}

// 保存数据到 localStorage
const savePositions = () => {
  localStorage.setItem('position-data', JSON.stringify(positions.value))
}

onMounted(() => {
  loadPositions()
})

const filteredPositions = computed(() => {
  let result = positions.value
  if (!showLeave.value) {
    result = result.filter(pos => pos.workStatus === '在职')
  }
  if (!searchKeyword.value) return result
  const keyword = searchKeyword.value.toLowerCase()
  return result.filter(pos => 
    pos.id.toLowerCase().includes(keyword) || 
    pos.personName.toLowerCase().includes(keyword) ||
    pos.personCode.toLowerCase().includes(keyword) ||
    pos.department.toLowerCase().includes(keyword) ||
    pos.phone.toLowerCase().includes(keyword) ||
    pos.position.toLowerCase().includes(keyword)
  )
})

const handleAddPosition = () => {
  showAddDialog.value = true
}

const handleCloseDialog = () => {
  showAddDialog.value = false
  addForm.value = {
    id: '',
    personName: '',
    personCode: '',
    department: '',
    phone: '',
    position: ''
  }
}

const handleSubmitAdd = () => {
  if (!addForm.value.id.trim()) {
    ElMessage.warning('序号不能为空')
    return
  }
  if (!addForm.value.personName.trim()) {
    ElMessage.warning('人员姓名不能为空')
    return
  }
  if (!addForm.value.personCode.trim()) {
    ElMessage.warning('人员编号不能为空')
    return
  }
  
  const exists = positions.value.some(pos => pos.id === addForm.value.id)
  if (exists) {
    ElMessage.warning('该序号已存在')
    return
  }
  
  positions.value.push({ 
    id: addForm.value.id, 
    personName: addForm.value.personName,
    personCode: addForm.value.personCode,
    department: addForm.value.department,
    phone: addForm.value.phone,
    position: addForm.value.position,
    remark: '',
    workStatus: '在职'
  })
  
  positions.value.sort((a, b) => a.id.localeCompare(b.id))
  savePositions()
  
  ElMessage.success('添加成功')
  handleCloseDialog()
}

const handleStartEdit = (row: any) => {
  // 保存原始数据用于比较
  originalData.value = { ...row }
  editingId.value = row.id
}

const handleSaveEdit = (row: any) => {
  if (!row.personName.trim()) {
    ElMessage.warning('人员姓名不能为空')
    return
  }
  
  // 检查是否有实际修改
  if (originalData.value) {
    const hasChanged = 
      row.personName !== originalData.value.personName ||
      row.personCode !== originalData.value.personCode ||
      row.department !== originalData.value.department ||
      row.phone !== originalData.value.phone ||
      row.position !== originalData.value.position ||
      row.remark !== originalData.value.remark ||
      row.workStatus !== originalData.value.workStatus
    
    if (hasChanged) {
      savePositions()
      ElMessage.success('修改成功')
    }
  }
  
  editingId.value = null
  originalData.value = null
}

const handleCancelEdit = () => {
  // 恢复原始数据
  if (originalData.value && editingId.value) {
    const row = positions.value.find(pos => pos.id === editingId.value)
    if (row) {
      Object.assign(row, originalData.value)
    }
  }
  editingId.value = null
  originalData.value = null
}

const handleDeletePosition = (row: any) => {
  ElMessageBox.confirm(`确定要删除人员 "${row.personName}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    positions.value = positions.value.filter(pos => pos.id !== row.id)
    savePositions()
    ElMessage.success('删除成功')
  }).catch(() => {
    ElMessage.info('已取消删除')
  })
}

const handleEnablePosition = (row: any) => {
  row.workStatus = '在职'
  savePositions()
  ElMessage.success('已启用')
}

const handleDisablePosition = (row: any) => {
  row.workStatus = '离职'
  savePositions()
  ElMessage.success('已离职')
}

const handleCopyPosition = (row: any) => {
  const newId = String(Number(positions.value.length) + 1).padStart(2, '0')
  positions.value.push({
    id: newId,
    personName: row.personName + ' (复制)',
    personCode: row.personCode,
    department: row.department,
    phone: row.phone,
    position: row.position,
    remark: row.remark,
    workStatus: '在职'
  })
  positions.value.sort((a, b) => a.id.localeCompare(b.id))
  savePositions()
  ElMessage.success('复制成功')
}

const handleSearch = () => {
  editingId.value = null
  if (searchKeyword.value.trim()) {
    const count = filteredPositions.value.length
    ElMessage.info(`搜索完成，共找到 ${count} 条结果`)
  }
}

const handleRefresh = () => {
  searchKeyword.value = ''
  editingId.value = null
  ElMessage.success('数据已刷新')
}


</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-info">
        <h1>人员岗位设定</h1>
        <div class="breadcrumb">首页 / 资料管理 / 基础资料 / 人员岗位设定</div>
      </div>
    </div>
    
    <div class="search-bar">
      <el-input 
        v-model="searchKeyword" 
        placeholder="搜索序号、姓名、编号、部门、电话或职务" 
        style="width: 350px;"
        clearable
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <span style="color: #667085;">🔍</span>
        </template>
      </el-input>
      <el-checkbox v-model="showLeave" label="显示离职" />
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button type="primary" @click="handleAddPosition">新增</el-button>
      <el-button @click="handleRefresh">刷新</el-button>
    </div>
    
    <div class="table-container">
      <el-table :data="filteredPositions" class="position-table" border :fit="true" @header-dragend="handleHeaderDragend" header-cell-class-name="header-center">
        <el-table-column type="selection" width="55" align="center" fixed="left" />
        
        <el-table-column label="序号" :width="columnWidths.id" align="center" :show-overflow-tooltip="false">
          <template #default="scope">{{ scope.$index + 1 }}</template>
        </el-table-column>
        
        <el-table-column label="人员编号" :width="columnWidths.personCode" align="center">
          <template #default="scope">
            <el-input 
              v-if="editingId === scope.row.id" 
              v-model="scope.row.personCode" 
              @keyup.enter="handleSaveEdit(scope.row)" 
              class="edit-input" 
              autofocus 
            />
            <span v-else>{{ scope.row.personCode }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="人员姓名" :width="columnWidths.personName" align="center">
          <template #default="scope">
            <el-input 
              v-if="editingId === scope.id" 
              v-model="scope.row.personName" 
              @keyup.enter="handleSaveEdit(scope.row)" 
              @keyup.escape="handleCancelEdit" 
              class="edit-input" 
              autofocus 
            />
            <span v-else>{{ scope.row.personName }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="职务" :width="columnWidths.position" align="center">
          <template #default="scope">
            <el-input 
              v-if="editingId === scope.row.id" 
              v-model="scope.row.position" 
              @keyup.enter="handleSaveEdit(scope.row)" 
              class="edit-input" 
              autofocus 
            />
            <span v-else>{{ scope.row.position }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="所属部门" :width="columnWidths.department" align="center">
          <template #default="scope">
            <el-input 
              v-if="editingId === scope.row.id" 
              v-model="scope.row.department" 
              @keyup.enter="handleSaveEdit(scope.row)" 
              class="edit-input" 
              autofocus 
            />
            <span v-else>{{ scope.row.department }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="联系电话" :width="columnWidths.phone" align="center">
          <template #default="scope">
            <el-input 
              v-if="editingId === scope.row.id" 
              v-model="scope.row.phone" 
              @keyup.enter="handleSaveEdit(scope.row)" 
              class="edit-input" 
              autofocus 
            />
            <span v-else>{{ scope.row.phone }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="备注" :width="columnWidths.remark" align="center">
          <template #default="scope">
            <el-input 
              v-if="editingId === scope.row.id" 
              v-model="scope.row.remark" 
              @keyup.enter="handleSaveEdit(scope.row)" 
              class="remark-input" 
              autofocus 
            />
            <span v-else>{{ scope.row.remark }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="在职状态" :width="columnWidths.workStatus" align="center" :show-overflow-tooltip="false">
          <template #default="scope">
            <el-switch 
              v-if="editingId !== scope.row.id"
              v-model="scope.row.workStatus" 
              active-value="在职" 
              inactive-value="离职" 
              active-color="#00bfa5"
              inactive-color="#f56c6c"
              @change="scope.row.workStatus === '在职' ? handleEnablePosition(scope.row) : handleDisablePosition(scope.row)"
            />
            <span v-else :class="scope.row.workStatus === '在职' ? 'status-active' : 'status-inactive'">
              {{ scope.row.workStatus }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" :width="columnWidths.action" align="center" :show-overflow-tooltip="false">
          <template #default="scope">
            <div class="action-buttons">
              <template v-if="editingId === scope.row.id">
                <el-button type="text" size="small" class="btn-save" @click="handleSaveEdit(scope.row)">保存</el-button>
                <el-button type="text" size="small" class="btn-cancel" @click="handleCancelEdit">取消</el-button>
              </template>
              <template v-else>
                <el-button type="text" size="small" class="btn-edit" @click="handleStartEdit(scope.row)">修改</el-button>
                <el-button type="text" size="small" class="btn-delete" @click="handleDeletePosition(scope.row)">删除</el-button>
                <el-button type="text" size="small" class="btn-copy" @click="handleCopyPosition(scope.row)">复制</el-button>
              </template>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="" min-width="100" align="center" :resizable="false" />
      </el-table>
      
      <div v-if="filteredPositions.length === 0" class="empty-tip">
        <span>暂无数据</span>
      </div>
    </div>
    
    <el-dialog 
      title="新增人员" 
      v-model="showAddDialog" 
      width="500px"
      @close="handleCloseDialog"
    >
      <el-form :model="addForm" label-width="100px">
        <el-form-item label="序号" required>
          <el-input v-model="addForm.id" placeholder="请输入序号" maxlength="10" />
        </el-form-item>
        <el-form-item label="人员姓名" required>
          <el-input v-model="addForm.personName" placeholder="请输入人员姓名" maxlength="50" />
        </el-form-item>
        <el-form-item label="人员编号" required>
          <el-input v-model="addForm.personCode" placeholder="请输入人员编号" maxlength="20" />
        </el-form-item>
        <el-form-item label="职务">
          <el-input v-model="addForm.position" placeholder="请输入职务" maxlength="50" />
        </el-form-item>
        <el-form-item label="所属部门">
          <el-input v-model="addForm.department" placeholder="请输入所属部门" maxlength="100" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="addForm.phone" placeholder="请输入联系电话" maxlength="20" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleCloseDialog">取消</el-button>
        <el-button type="primary" @click="handleSubmitAdd">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; background-color: #F5F7FA; min-height: calc(100vh - 60px); }

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }

.page-info { 
  h1 { font-size: 20px; font-weight: 600; margin: 0 0 8px 0; color: #344054; } 
}

.breadcrumb { font-size: 14px; color: #667085; }

.search-bar { 
  display: flex; gap: 12px; padding: 16px; background: #fff; border-radius: 8px; margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  align-items: center;
  flex-wrap: wrap;
  
  :deep(.el-button) {
    z-index: 1;
    position: relative;
  }
  
  :deep(.el-button--primary) {
    color: #fff !important;
    background-color: #00bfa5 !important;
    border-color: #00bfa5 !important;
  }
  
  :deep(.el-checkbox__label) {
    color: #344054;
  }
}

.table-container { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }

.position-table { 
  width: 100%; 
  
  :deep(.el-table__row:nth-child(odd)) {
    background-color: #F0F9F7;
  }
  
  :deep(.el-table__row:nth-child(even)) {
    background-color: #FFFFFF;
  }
  
  :deep(.el-table__body tr:hover > td) {
    background-color: #D4EDE6 !important;
  }
  
  :deep(.el-table__header-wrapper th) {
    border-bottom: 1px solid #E5E7EB;
    border-right: 1px solid #F3F4F6;
    text-align: center !important;
  }
  
  :deep(.el-table__body-wrapper td) {
    border-bottom: 1px solid #F3F4F6;
    border-right: 1px solid #F3F4F6;
  }
  
  :deep(.el-table__header-wrapper th:last-child),
  :deep(.el-table__body-wrapper td:last-child) {
    border-right: none;
  }
}

:deep(.header-center) {
  text-align: center !important;
}

.empty-tip { 
  text-align: center; padding: 40px 20px; color: #667085; 
  font-size: 14px;
}

.edit-input { width: 100%; }

.remark-input { 
  width: 100%; 
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

:deep(.el-table__body tr) {
  height: 40px;
}

:deep(.el-table__header-wrapper tr) {
  height: 40px;
}

.btn-edit {
  color: #0EB89D !important;
  
  &:hover {
    color: #0BA388 !important;
  }
}

.btn-delete {
  color: #FF8C00 !important;
  
  &:hover {
    color: #E07B00 !important;
  }
}

.btn-copy {
  color: #409EFF !important;
  
  &:hover {
    color: #66B1FF !important;
  }
}

.btn-save {
  color: #0EB89D !important;
  
  &:hover {
    color: #0BA388 !important;
  }
}

.btn-cancel {
  color: #667085 !important;
  
  &:hover {
    color: #4D5566 !important;
  }
}

.status-active {
  color: #00bfa5;
  font-weight: 500;
}

.status-inactive {
  color: #f56c6c;
  font-weight: 500;
}
</style>
