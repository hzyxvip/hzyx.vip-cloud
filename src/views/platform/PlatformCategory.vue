<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTableDrag } from '@/composables/useTableDrag'

const searchKeyword = ref('')

const showAddDialog = ref(false)
const addForm = ref({
  id: '',
  name: ''
})

const editingId = ref<string | null>(null)

const columns = [
  { key: 'id', label: '序号', defaultWidth: 80, align: 'center' },
  { key: 'code', label: '医疗器械目录分类名称编码', defaultWidth: 160, align: 'center' },
  { key: 'name', label: '医疗器械分类名称', defaultWidth: 180 },
  { key: 'remark', label: '备注', defaultWidth: 120 },
  { key: 'status', label: '状态', defaultWidth: 100, align: 'center' },
  { key: 'action', label: '操作', defaultWidth: 180, align: 'center' },
  { key: 'empty', label: '', defaultWidth: 0 }
]

const { columnWidths, handleHeaderDragend } = useTableDrag('category', columns)

const categories = ref([
  { id: '01', code: '6801', name: '手术器械', remark: '', status: '正常' },
  { id: '02', code: '6802', name: '显微外科手术器械', remark: '', status: '正常' },
  { id: '03', code: '6803', name: '神经外科手术器械', remark: '', status: '正常' },
  { id: '04', code: '6804', name: '眼科手术器械', remark: '', status: '正常' },
  { id: '05', code: '6805', name: '耳鼻喉科手术器械', remark: '', status: '正常' },
  { id: '06', code: '6806', name: '口腔科手术器械', remark: '', status: '正常' },
  { id: '07', code: '6807', name: '胸腔心血管外科手术器械', remark: '', status: '正常' },
  { id: '08', code: '6808', name: '腹部外科手术器械', remark: '', status: '正常' },
  { id: '09', code: '6809', name: '泌尿肛肠外科手术器械', remark: '', status: '正常' },
  { id: '10', code: '6810', name: '骨科手术器械', remark: '', status: '正常' },
  { id: '11', code: '6812', name: '妇产科手术器械', remark: '', status: '正常' },
  { id: '12', code: '6813', name: '儿科手术器械', remark: '', status: '正常' },
  { id: '13', code: '6815', name: '消毒灭菌设备及器具', remark: '', status: '正常' },
  { id: '14', code: '6864', name: '医用卫生材料及敷料', remark: '', status: '正常' },
  { id: '15', code: '6865', name: '医用缝合材料及粘合剂', remark: '', status: '正常' },
  { id: '16', code: '6866', name: '医用高分子材料及制品', remark: '', status: '正常' },
  { id: '17', code: '6877', name: '介入器械', remark: '', status: '正常' },
  { id: '18', code: '6854', name: '手术室、急救室、诊疗室设备及器具', remark: '', status: '正常' },
  { id: '19', code: '6821', name: '医用电子仪器设备', remark: '', status: '正常' },
  { id: '20', code: '6822', name: '医用光学器具、仪器及内窥镜设备', remark: '', status: '正常' },
  { id: '21', code: '6823', name: '医用超声仪器及有关设备', remark: '', status: '正常' },
  { id: '22', code: '6840', name: '体外诊断试剂', remark: '', status: '正常' }
])

const filteredCategories = computed(() => {
  if (!searchKeyword.value) return categories.value
  const keyword = searchKeyword.value.toLowerCase()
  return categories.value.filter(cat => 
    cat.id.toLowerCase().includes(keyword) || 
    cat.name.toLowerCase().includes(keyword)
  )
})

const handleAddCategory = () => {
  showAddDialog.value = true
}

const handleCloseDialog = () => {
  showAddDialog.value = false
  addForm.value = { id: '', name: '' }
}

const handleSubmitAdd = () => {
  if (!addForm.value.id.trim()) {
    ElMessage.warning('请输入分类序号')
    return
  }
  if (!addForm.value.name.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }
  
  if (categories.value.some(cat => cat.id === addForm.value.id)) {
    ElMessage.warning('该序号已存在')
    return
  }
  
  categories.value.push({ 
    id: addForm.value.id, 
    code: '', 
    name: addForm.value.name,
    remark: '',
    status: '正常'
  })
  
  categories.value.sort((a, b) => a.id.localeCompare(b.id))
  
  ElMessage.success('添加成功')
  handleCloseDialog()
}

const handleStartEdit = (row: any) => {
  editingId.value = row.id
}

const handleSaveEdit = (row: any) => {
  if (!row.name.trim()) {
    ElMessage.warning('分类名称不能为空')
    return
  }
  editingId.value = null
  ElMessage.success('修改成功')
}

const handleCancelEdit = () => {
  editingId.value = null
}

const handleDeleteCategory = (row: any) => {
  ElMessageBox.confirm(`确定要删除分类 "${row.name}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    categories.value = categories.value.filter(cat => cat.id !== row.id)
    ElMessage.success('删除成功')
  }).catch(() => {
    ElMessage.info('已取消删除')
  })
}

const handleEnableCategory = (row: any) => {
  row.status = '正常'
  ElMessage.success('已启用')
}

const handleDisableCategory = (row: any) => {
  row.status = '停用'
  ElMessage.success('已停用')
}

const handleCopyCategory = (row: any) => {
  const newId = String(Number(categories.value.length) + 1).padStart(2, '0')
  categories.value.push({
    id: newId,
    code: row.code,
    name: row.name + ' (复制)',
    remark: row.remark,
    status: '正常'
  })
  categories.value.sort((a, b) => a.id.localeCompare(b.id))
  ElMessage.success('复制成功')
}

const handleSearch = () => {
  editingId.value = null
  if (searchKeyword.value.trim()) {
    const count = filteredCategories.value.length
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
        <h1>医疗器械22大专业目录分类表</h1>
        <div class="breadcrumb">首页 / 平台管理 / 数据维护 / 医疗器械22大专业目录分类表</div>
      </div>
    </div>
    
    <div class="search-bar">
      <el-input 
        v-model="searchKeyword" 
        placeholder="搜索分类序号或分类名称" 
        style="width: 300px;"
        clearable
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <span style="color: #667085;">🔍</span>
        </template>
      </el-input>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button type="primary" @click="handleAddCategory">新增</el-button>
      <el-button @click="handleRefresh">刷新</el-button>
    </div>
    
    <div class="table-container">
      <el-table :data="filteredCategories" class="category-table" border :fit="true" @header-dragend="handleHeaderDragend">
        <el-table-column type="selection" width="55" align="center" fixed="left" />
        
        <el-table-column label="序号" :width="columnWidths.id" align="center" :show-overflow-tooltip="false">
          <template #default="scope">{{ scope.$index + 1 }}</template>
        </el-table-column>
        
        <el-table-column label="医疗器械目录分类名称编码" :width="columnWidths.code" align="center">
          <template #default="scope">
            <el-input v-if="editingId === scope.row.id" v-model="scope.row.code" @blur="handleSaveEdit(scope.row)" @keyup.enter="handleSaveEdit(scope.row)" class="edit-input" autofocus />
            <span v-else>{{ scope.row.code }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="医疗器械分类名称" :width="columnWidths.name">
          <template #default="scope">
            <el-input v-if="editingId === scope.row.id" v-model="scope.row.name" @blur="handleSaveEdit(scope.row)" @keyup.enter="handleSaveEdit(scope.row)" @keyup.escape="handleCancelEdit" class="edit-input" autofocus />
            <span v-else>{{ scope.row.name }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="备注" :width="columnWidths.remark">
          <template #default="scope">
            <el-input v-if="editingId === scope.row.id" v-model="scope.row.remark" @blur="handleSaveEdit(scope.row)" @keyup.enter="handleSaveEdit(scope.row)" class="remark-input" autofocus />
            <span v-else>{{ scope.row.remark }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" :width="columnWidths.status" align="center" :show-overflow-tooltip="false">
          <template #default="scope">
            <el-switch 
              v-model="scope.row.status" 
              active-value="正常" 
              inactive-value="停用" 
              active-color="#00bfa5"
              inactive-color="#f56c6c"
              @change="scope.row.status === '正常' ? handleEnableCategory(scope.row) : handleDisableCategory(scope.row)"
            />
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
                <el-button type="text" size="small" class="btn-delete" @click="handleDeleteCategory(scope.row)">删除</el-button>
                <el-button type="text" size="small" class="btn-copy" @click="handleCopyCategory(scope.row)">复制</el-button>
              </template>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="" min-width="100" align="center" :resizable="false" />
      </el-table>
      
      <div v-if="filteredCategories.length === 0" class="empty-tip">
        <span>暂无数据</span>
      </div>
    </div>
    
    <el-dialog 
      title="新增分类" 
      v-model="showAddDialog" 
      width="480px"
      @close="handleCloseDialog"
    >
      <el-form :model="addForm" label-width="120px">
        <el-form-item label="分类序号" required>
          <el-input v-model="addForm.id" placeholder="请输入分类序号" maxlength="10" />
        </el-form-item>
        <el-form-item label="分类名称" required>
          <el-input v-model="addForm.name" placeholder="请输入医疗器械目录分类名称" maxlength="100" />
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
}

.table-container { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }

.category-table { 
  width: 100%; 
  
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
</style>
