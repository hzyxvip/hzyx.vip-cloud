<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  loadPlatformUnitCatalog,
  savePlatformUnitCatalog,
  addPlatformUnit,
  deletePlatformUnit,
  type PlatformUnitCategory
} from '@/utils/platformUnitStore'

const activeTab = ref('inventory')
const searchKeyword = ref('')

const showAddDialog = ref(false)
const addForm = ref({
  unitName: '',
  category: '',
  type: '计量' as '计量' | '计价'
})

const catalog = ref(loadPlatformUnitCatalog())
const inventoryUnits = computed(() => catalog.value.inventoryUnits)
const pricingUnits = computed(() => catalog.value.pricingUnits)

const persistCatalog = () => {
  savePlatformUnitCatalog(catalog.value)
}

const inventoryCategories = computed(() => inventoryUnits.value.map(item => item.category))
const pricingCategories = computed(() => pricingUnits.value.map(item => item.category))

const filteredInventoryUnits = computed(() => {
  if (!searchKeyword.value) return inventoryUnits.value
  const keyword = searchKeyword.value.toLowerCase()
  return inventoryUnits.value
    .map(cat => ({
      ...cat,
      units: cat.units.filter(unit => unit.toLowerCase().includes(keyword))
    }))
    .filter(cat => cat.units.length > 0 || cat.category.toLowerCase().includes(keyword))
})

const filteredPricingUnits = computed(() => {
  if (!searchKeyword.value) return pricingUnits.value
  const keyword = searchKeyword.value.toLowerCase()
  return pricingUnits.value
    .map(cat => ({
      ...cat,
      units: cat.units.filter(unit => unit.toLowerCase().includes(keyword))
    }))
    .filter(cat => cat.units.length > 0 || cat.category.toLowerCase().includes(keyword))
})

const allUnits = computed(() => {
  const units: Array<{ id: number; unit: string; category: string; type: string }> = []
  let id = 1
  
  inventoryUnits.value.forEach(cat => {
    cat.units.forEach(unit => {
      units.push({ id: id++, unit, category: cat.category, type: '计量' })
    })
  })
  
  pricingUnits.value.forEach(cat => {
    cat.units.forEach(unit => {
      units.push({ id: id++, unit, category: cat.category, type: '计价' })
    })
  })
  
  return units
})

const filteredSummary = computed(() => {
  if (!searchKeyword.value) return allUnits.value
  return allUnits.value.filter(item => 
    item.unit.toLowerCase().includes(searchKeyword.value.toLowerCase()) || 
    item.category.toLowerCase().includes(searchKeyword.value.toLowerCase())
  )
})

const handleAddUnit = () => {
  showAddDialog.value = true
}

const handleCloseDialog = () => {
  showAddDialog.value = false
  addForm.value = { unitName: '', category: '', type: '计量' }
}

const handleSubmitAdd = () => {
  const result = addPlatformUnit(addForm.value.unitName, addForm.value.category, addForm.value.type)
  if (!result.ok) {
    ElMessage.warning(result.message || '添加失败')
    return
  }
  catalog.value = loadPlatformUnitCatalog()
  ElMessage.success('添加成功')
  handleCloseDialog()
}

const handleEditUnit = (row: any) => {
  ElMessage.info(`编辑单位: ${row.unit}`)
}

const handleDeleteUnit = (row: { unit: string }) => {
  ElMessageBox.confirm(`确定要删除单位 "${row.unit}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    deletePlatformUnit(row.unit)
    catalog.value = loadPlatformUnitCatalog()
    ElMessage.success('删除成功')
  }).catch(() => {
    ElMessage.info('已取消删除')
  })
}

const handleDeleteFromCategory = (cat: PlatformUnitCategory, unitName: string) => {
  ElMessageBox.confirm(`确定要删除单位 "${unitName}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    cat.units = cat.units.filter((u: string) => u !== unitName)
    persistCatalog()
    catalog.value = loadPlatformUnitCatalog()
    ElMessage.success('删除成功')
  }).catch(() => {
    ElMessage.info('已取消删除')
  })
}

const handleResetSearch = () => {
  searchKeyword.value = ''
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-info">
        <h1>平台单位设定</h1>
        <div class="breadcrumb">首页 / 平台管理 / 数据维护 / 平台单位设定</div>
      </div>
      <el-button type="primary" @click="handleAddUnit">新增单位</el-button>
    </div>
    
    <div class="search-bar">
      <el-input 
        v-model="searchKeyword" 
        placeholder="搜索单位名称或分类" 
        style="width: 300px;"
        clearable
        @keyup.enter="handleResetSearch"
      >
        <template #prefix>
          <span style="color: #667085;">🔍</span>
        </template>
      </el-input>
      <el-button @click="handleResetSearch">重置</el-button>
    </div>
    
    <el-tabs v-model="activeTab" class="unit-tabs">
      <el-tab-pane label="一、实物最小库存单位（计量字段）" name="inventory">
        <div class="tab-content">
          <div v-if="filteredInventoryUnits.length === 0" class="empty-tip">
            <span>暂无数据</span>
          </div>
          <div class="category-section" v-for="item in filteredInventoryUnits" :key="item.id">
            <div class="category-header">
              <span class="category-icon">📦</span>
              <span class="category-name">{{ item.category }}</span>
              <span class="unit-count">{{ item.units.length }}个</span>
            </div>
            <div class="unit-tags">
              <el-tag 
                v-for="unit in item.units" 
                :key="unit" 
                class="unit-tag"
                closable
                @close="handleDeleteFromCategory(item, unit)"
              >{{ unit }}</el-tag>
            </div>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="二、包装计价单位（计价字段）" name="pricing">
        <div class="tab-content">
          <div v-if="filteredPricingUnits.length === 0" class="empty-tip">
            <span>暂无数据</span>
          </div>
          <div class="category-section" v-for="item in filteredPricingUnits" :key="item.id">
            <div class="category-header">
              <span class="category-icon">💰</span>
              <span class="category-name">{{ item.category }}</span>
              <span class="unit-count">{{ item.units.length }}个</span>
            </div>
            <div class="unit-tags">
              <el-tag 
                v-for="unit in item.units" 
                :key="unit" 
                class="unit-tag"
                closable
                @close="handleDeleteFromCategory(item, unit)"
              >{{ unit }}</el-tag>
            </div>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="三、纯文本汇总（全部清单）" name="summary">
        <div class="tab-content">
          <el-table :data="filteredSummary" border class="summary-table">
            <el-table-column prop="id" label="编号" width="80" />
            <el-table-column prop="unit" label="单位名称" width="120" />
            <el-table-column prop="category" label="分类" width="150">
              <template #default="scope">
                <el-tag size="small">{{ scope.row.category }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" width="120">
              <template #default="scope">
                <el-tag :type="scope.row.type === '计量' ? 'primary' : 'warning'">
                  {{ scope.row.type === '计量' ? '计量字段' : '计价字段' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="scope">
                <el-button type="text" size="small" @click="handleEditUnit(scope.row)">编辑</el-button>
                <el-button type="text" size="small" @click="handleDeleteUnit(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>
    
    <el-dialog 
      title="新增单位" 
      v-model="showAddDialog" 
      width="480px"
      @close="handleCloseDialog"
    >
      <el-form :model="addForm" label-width="100px">
        <el-form-item label="单位类型" required>
          <el-select v-model="addForm.type" style="width: 100%;" placeholder="请选择单位类型">
            <el-option label="计量字段" value="计量" />
            <el-option label="计价字段" value="计价" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属分类" required>
          <el-select v-model="addForm.category" style="width: 100%;" placeholder="请选择所属分类">
            <el-option 
              v-for="cat in (addForm.type === '计量' ? inventoryCategories : pricingCategories)" 
              :key="cat" 
              :label="cat" 
              :value="cat" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="单位名称" required>
          <el-input v-model="addForm.unitName" placeholder="请输入单位名称" maxlength="20" />
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
}

.unit-tabs { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }

.tab-content { margin-top: 16px; }

.empty-tip { 
  text-align: center; padding: 40px 20px; color: #667085; 
  font-size: 14px;
}

.category-section { margin-bottom: 20px; padding: 16px; background: #F9FAFB; border-radius: 8px; }

.category-header { 
  display: flex; align-items: center; gap: 8px; margin-bottom: 12px; 
}

.category-icon { font-size: 18px; }

.category-name { font-size: 16px; font-weight: 600; color: #344054; }

.unit-count { 
  font-size: 13px; color: #667085; background: #E5E7EB; padding: 2px 8px; border-radius: 10px; 
}

.unit-tags { display: flex; flex-wrap: wrap; gap: 8px; }

.unit-tag { 
  cursor: pointer; 
  font-size: 14px;
  color: #667085;
  
  :deep(.el-tag__close) {
    color: #E55353 !important;
    
    &:hover {
      background-color: #E55353 !important;
      color: #fff !important;
    }
  }
}

.summary-table { margin-top: 0; }
</style>