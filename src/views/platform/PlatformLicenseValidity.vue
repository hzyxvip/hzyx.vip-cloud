<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTableDrag } from '@/composables/useTableDrag'
import {
  DEFAULT_LICENSE_VALIDITY_RULES,
  LICENSE_VALIDITY_CATEGORY_MAP,
  LICENSE_VALIDITY_MODULE_OPTIONS,
  formatLicenseValidityRuleName,
  type LicenseValidityModule,
  type LicenseValidityRule,
  type LicenseValidityType
} from '@/constants/licenseValidityRules'
import {
  loadAndEnsureLicenseValidityRules,
  saveLicenseValidityRules
} from '@/utils/licenseValidityRuleStore'

const searchKeyword = ref('')
const filterModule = ref<LicenseValidityModule | ''>('')
const showAddDialog = ref(false)
const editingId = ref<string | null>(null)
const tableRef = ref()
const selectedRows = ref<LicenseValidityRule[]>([])

const columns = [
  { key: 'id', label: '序号', defaultWidth: 60, align: 'center' },
  { key: 'module', label: '监管板块', defaultWidth: 150 },
  { key: 'category', label: '分类', defaultWidth: 150 },
  { key: 'docName', label: '证件名称', defaultWidth: 200 },
  { key: 'scope', label: '适用范围', defaultWidth: 180 },
  { key: 'validityLabel', label: '有效期', defaultWidth: 90, align: 'center' },
  { key: 'renewalRequirement', label: '到期延续要求', defaultWidth: 220 },
  { key: 'docKey', label: '关联证照Key', defaultWidth: 180 },
  { key: 'status', label: '状态', defaultWidth: 90, align: 'center' },
  { key: 'action', label: '操作', defaultWidth: 160, align: 'center' },
  { key: 'empty', label: '', defaultWidth: 0 }
]

const { columnWidths, handleHeaderDragend } = useTableDrag('license-validity', columns)

const rules = ref<LicenseValidityRule[]>([])

const addForm = ref({
  module: LICENSE_VALIDITY_MODULE_OPTIONS[0] as LicenseValidityModule,
  category: LICENSE_VALIDITY_CATEGORY_MAP[LICENSE_VALIDITY_MODULE_OPTIONS[0]][0],
  docName: '',
  docNameSub: '',
  scope: '',
  validityType: 'fixed_years' as LicenseValidityType,
  validityYears: 5,
  validityLabel: '5 年',
  renewalRequirement: '',
  docKey: '',
  longTerm: false,
  remark: ''
})

const summaryCards = [
  { title: '5 年（行政许可类）', items: ['二类/三类注册证', '医疗器械生产许可证', '三类经营许可证'] },
  { title: '4 年（消字号许可）', items: ['卫消证字生产许可证', '一类消毒产品卫生安全评价报告'] },
  { title: '长期有效（备案类）', items: ['一类产品备案', '一类生产备案', '二类经营备案', '二类消毒产品评价报告'] },
  { title: '年度复检（1 年）', items: ['健康证', '车间环境检测', '仪器校准证书'] }
]

const categoryOptions = computed(() => {
  if (!filterModule.value) return []
  return LICENSE_VALIDITY_CATEGORY_MAP[filterModule.value]
})

const addCategoryOptions = computed(() => LICENSE_VALIDITY_CATEGORY_MAP[addForm.value.module])

const filteredRules = computed(() => {
  let result = rules.value
  if (filterModule.value) {
    result = result.filter(item => item.module === filterModule.value)
  }
  if (!searchKeyword.value.trim()) return result
  const keyword = searchKeyword.value.trim().toLowerCase()
  return result.filter(item =>
    item.id.includes(keyword) ||
    item.docName.toLowerCase().includes(keyword) ||
    (item.docNameSub || '').toLowerCase().includes(keyword) ||
    item.scope.toLowerCase().includes(keyword) ||
    item.category.toLowerCase().includes(keyword) ||
    (item.docKey || '').toLowerCase().includes(keyword)
  )
})

const persistRules = () => {
  saveLicenseValidityRules(rules.value)
}

const loadRules = () => {
  rules.value = loadAndEnsureLicenseValidityRules()
}

onMounted(() => {
  loadRules()
})

const handleResetDefaults = async () => {
  try {
    await ElMessageBox.confirm('确定恢复为系统默认证件有效期分类表吗？自定义修改将被覆盖。', '恢复默认', {
      type: 'warning'
    })
  } catch {
    return
  }
  rules.value = JSON.parse(JSON.stringify(DEFAULT_LICENSE_VALIDITY_RULES))
  persistRules()
  ElMessage.success('已恢复默认分类表')
}

const handleAdd = () => {
  editingId.value = null
  addForm.value = {
    module: LICENSE_VALIDITY_MODULE_OPTIONS[0],
    category: LICENSE_VALIDITY_CATEGORY_MAP[LICENSE_VALIDITY_MODULE_OPTIONS[0]][0],
    docName: '',
    docNameSub: '',
    scope: '',
    validityType: 'fixed_years',
    validityYears: 5,
    validityLabel: '5 年',
    renewalRequirement: '',
    docKey: '',
    longTerm: false,
    remark: ''
  }
  showAddDialog.value = true
}

const syncValidityFields = (row: LicenseValidityRule) => {
  if (row.validityType === 'long_term') {
    row.longTerm = true
    row.validityLabel = '长期有效'
    row.validityYears = undefined
  } else if (row.validityType === 'annual') {
    row.longTerm = false
    row.validityYears = 1
    row.validityLabel = '1 年'
  } else if (row.validityType === 'none') {
    row.longTerm = false
    row.validityYears = undefined
    row.validityLabel = '——'
  } else if (row.validityYears) {
    row.longTerm = false
    row.validityLabel = `${row.validityYears} 年`
  }
}

const handleSubmitAdd = () => {
  if (!addForm.value.docName.trim()) {
    ElMessage.warning('请输入证件名称')
    return
  }
  const nextId = String(rules.value.length + 1).padStart(2, '0')
  const row: LicenseValidityRule = {
    id: nextId,
    module: addForm.value.module,
    category: addForm.value.category,
    docKey: addForm.value.docKey.trim() || undefined,
    docName: addForm.value.docName.trim(),
    docNameSub: addForm.value.docNameSub.trim() || undefined,
    scope: addForm.value.scope.trim(),
    validityType: addForm.value.validityType,
    validityYears: addForm.value.validityYears,
    validityLabel: addForm.value.validityLabel,
    renewalRequirement: addForm.value.renewalRequirement.trim(),
    longTerm: addForm.value.longTerm,
    remark: addForm.value.remark.trim() || undefined,
    status: '正常',
    sortOrder: rules.value.length + 1
  }
  syncValidityFields(row)
  rules.value.push(row)
  persistRules()
  showAddDialog.value = false
  ElMessage.success('添加成功')
}

const handleSelectionChange = (rows: LicenseValidityRule[]) => {
  selectedRows.value = rows
}

const handleToolbarEdit = () => {
  if (selectedRows.value.length !== 1) {
    ElMessage.warning('请先勾选一条证件有效期规则进行修改')
    return
  }
  handleStartEdit(selectedRows.value[0])
}

const handleToolbarDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先勾选要删除的证件有效期规则')
    return
  }

  try {
    const count = selectedRows.value.length
    const names = selectedRows.value.map(item => formatLicenseValidityRuleName(item)).join('、')
    await ElMessageBox.confirm(
      `请谨慎删除！确定删除选中的 ${count} 条证件有效期规则吗？\n${names}\n此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  const ids = new Set(selectedRows.value.map(item => item.id))
  if (editingId.value && ids.has(editingId.value)) {
    editingId.value = null
  }
  rules.value = rules.value.filter(item => !ids.has(item.id))
  persistRules()
  selectedRows.value = []
  tableRef.value?.clearSelection?.()
  ElMessage.success('删除成功')
}

const handleStartEdit = (row: LicenseValidityRule) => {
  editingId.value = row.id
}

const handleSaveEdit = (row: LicenseValidityRule) => {
  if (!row.docName.trim()) {
    ElMessage.warning('证件名称不能为空')
    return
  }
  syncValidityFields(row)
  editingId.value = null
  persistRules()
  ElMessage.success('修改成功')
}

const handleCancelEdit = () => {
  loadRules()
  editingId.value = null
}

const handleDelete = async (row: LicenseValidityRule) => {
  try {
    await ElMessageBox.confirm(
      `请谨慎删除！确定删除「${formatLicenseValidityRuleName(row)}」吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }
  if (editingId.value === row.id) {
    editingId.value = null
  }
  rules.value = rules.value.filter(item => item.id !== row.id)
  persistRules()
  ElMessage.success('删除成功')
}

const handleCopy = (row: LicenseValidityRule) => {
  const copy: LicenseValidityRule = {
    ...JSON.parse(JSON.stringify(row)),
    id: String(rules.value.length + 1).padStart(2, '0'),
    docKey: row.docKey ? `${row.docKey}_copy` : undefined,
    docName: `${row.docName}（复制）`,
    sortOrder: rules.value.length + 1,
    status: '正常'
  }
  rules.value.push(copy)
  persistRules()
  ElMessage.success('复制成功')
}

const handleRefresh = () => {
  searchKeyword.value = ''
  filterModule.value = ''
  editingId.value = null
  selectedRows.value = []
  tableRef.value?.clearSelection?.()
  loadRules()
  ElMessage.success('数据已刷新')
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-info">
        <h1>医疗相关证件有效期分类表</h1>
        <div class="breadcrumb">首页 / 平台管理 / 数据维护 / 医疗相关证件有效期分类表</div>
      </div>
    </div>

    <div class="summary-grid">
      <div v-for="card in summaryCards" :key="card.title" class="summary-card">
        <div class="summary-title">{{ card.title }}</div>
        <ul>
          <li v-for="item in card.items" :key="item">{{ item }}</li>
        </ul>
      </div>
    </div>

    <div class="search-bar">
      <el-select v-model="filterModule" placeholder="监管板块" clearable style="width: 220px;">
        <el-option v-for="item in LICENSE_VALIDITY_MODULE_OPTIONS" :key="item" :label="item" :value="item" />
      </el-select>
      <el-input
        v-model="searchKeyword"
        placeholder="搜索证件名称、适用范围、关联Key"
        style="width: 320px;"
        clearable
      />
      <el-button type="primary" @click="handleRefresh">查询</el-button>
      <el-button type="primary" @click="handleAdd">新增</el-button>
      <el-button :disabled="selectedRows.length !== 1" @click="handleToolbarEdit">修改</el-button>
      <el-button type="danger" plain :disabled="selectedRows.length === 0" @click="handleToolbarDelete">删除</el-button>
      <el-button @click="handleRefresh">刷新</el-button>
      <el-button @click="handleResetDefaults">恢复默认</el-button>
    </div>

    <div class="table-container">
      <el-table
        ref="tableRef"
        :data="filteredRules"
        class="license-validity-table"
        border
        :fit="true"
        @header-dragend="handleHeaderDragend"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="42" fixed="left" />
        <el-table-column label="序号" :width="columnWidths.id" align="center" fixed="left">
          <template #default="scope">{{ scope.row.id }}</template>
        </el-table-column>

        <el-table-column label="监管板块" :width="columnWidths.module">
          <template #default="scope">
            <el-select v-if="editingId === scope.row.id" v-model="scope.row.module" size="small" style="width: 100%;">
              <el-option v-for="item in LICENSE_VALIDITY_MODULE_OPTIONS" :key="item" :label="item" :value="item" />
            </el-select>
            <span v-else>{{ scope.row.module }}</span>
          </template>
        </el-table-column>

        <el-table-column label="分类" :width="columnWidths.category">
          <template #default="scope">
            <el-input v-if="editingId === scope.row.id" v-model="scope.row.category" size="small" />
            <span v-else>{{ scope.row.category }}</span>
          </template>
        </el-table-column>

        <el-table-column label="证件名称" :width="columnWidths.docName">
          <template #default="scope">
            <div v-if="editingId === scope.row.id" class="edit-name-col">
              <el-input v-model="scope.row.docName" size="small" placeholder="主名称" />
              <el-input v-model="scope.row.docNameSub" size="small" placeholder="副标题（如括号说明）" />
            </div>
            <div v-else class="name-cell">
              <div>{{ scope.row.docName }}</div>
              <div v-if="scope.row.docNameSub" class="name-sub">{{ scope.row.docNameSub }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="适用范围" :width="columnWidths.scope" show-overflow-tooltip>
          <template #default="scope">
            <el-input v-if="editingId === scope.row.id" v-model="scope.row.scope" size="small" type="textarea" :rows="2" />
            <span v-else>{{ scope.row.scope }}</span>
          </template>
        </el-table-column>

        <el-table-column label="有效期" :width="columnWidths.validityLabel" align="center">
          <template #default="scope">
            <el-input v-if="editingId === scope.row.id" v-model="scope.row.validityLabel" size="small" />
            <el-tag v-else size="small" :type="scope.row.longTerm ? 'info' : scope.row.validityType === 'annual' ? 'warning' : 'success'">
              {{ scope.row.validityLabel }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="到期延续要求" :width="columnWidths.renewalRequirement" show-overflow-tooltip>
          <template #default="scope">
            <el-input v-if="editingId === scope.row.id" v-model="scope.row.renewalRequirement" size="small" type="textarea" :rows="2" />
            <span v-else>{{ scope.row.renewalRequirement }}</span>
          </template>
        </el-table-column>

        <el-table-column label="关联证照Key" :width="columnWidths.docKey">
          <template #default="scope">
            <el-input v-if="editingId === scope.row.id" v-model="scope.row.docKey" size="small" />
            <span v-else>{{ scope.row.docKey || '——' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" :width="columnWidths.status" align="center">
          <template #default="scope">
            <el-switch
              v-model="scope.row.status"
              active-value="正常"
              inactive-value="停用"
              active-color="#00bfa5"
              inactive-color="#f56c6c"
              @change="persistRules"
            />
          </template>
        </el-table-column>

        <el-table-column label="操作" :width="columnWidths.action" align="center" fixed="right">
          <template #default="scope">
            <div class="action-buttons">
              <template v-if="editingId === scope.row.id">
                <el-button type="primary" link size="small" @click="handleSaveEdit(scope.row)">保存</el-button>
                <el-button type="primary" link size="small" @click="handleCancelEdit">取消</el-button>
              </template>
              <template v-else>
                <el-button type="primary" link size="small" @click="handleStartEdit(scope.row)">修改</el-button>
                <el-button type="danger" link size="small" @click="handleDelete(scope.row)">删除</el-button>
                <el-button type="primary" link size="small" @click="handleCopy(scope.row)">复制</el-button>
              </template>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="showAddDialog" title="新增证件有效期规则" width="560px">
      <el-form label-width="110px">
        <el-form-item label="监管板块" required>
          <el-select v-model="addForm.module" style="width: 100%;" @change="addForm.category = addCategoryOptions[0]">
            <el-option v-for="item in LICENSE_VALIDITY_MODULE_OPTIONS" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类" required>
          <el-select v-model="addForm.category" style="width: 100%;">
            <el-option v-for="item in addCategoryOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="证件名称" required>
          <el-input v-model="addForm.docName" />
        </el-form-item>
        <el-form-item label="名称副标题">
          <el-input v-model="addForm.docNameSub" placeholder="如：（卫消证字）" />
        </el-form-item>
        <el-form-item label="适用范围">
          <el-input v-model="addForm.scope" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="有效期类型">
          <el-select v-model="addForm.validityType" style="width: 100%;">
            <el-option label="固定年限" value="fixed_years" />
            <el-option label="长期有效" value="long_term" />
            <el-option label="年度复检" value="annual" />
            <el-option label="无专门证照" value="none" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="addForm.validityType === 'fixed_years'" label="有效年数">
          <el-input-number v-model="addForm.validityYears" :min="1" :max="10" />
        </el-form-item>
        <el-form-item label="延续要求">
          <el-input v-model="addForm.renewalRequirement" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="关联证照Key">
          <el-input v-model="addForm.docKey" placeholder="与企业证照模板关联，可留空" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitAdd">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.page-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  margin-bottom: 16px;

  h1 {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px;
    color: #344054;
  }
}

.breadcrumb {
  font-size: 14px;
  color: #667085;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .summary-title {
    font-size: 13px;
    font-weight: 600;
    color: #00bfa5;
    margin-bottom: 8px;
  }

  ul {
    margin: 0;
    padding-left: 16px;
    font-size: 12px;
    color: #667085;
    line-height: 1.5;
  }
}

.search-bar {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  align-items: center;
  flex-wrap: wrap;
}

.table-container {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow-x: auto;
}

.name-cell {
  .name-sub {
    margin-top: 2px;
    font-size: 12px;
    color: #667085;
  }
}

.edit-name-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
}

@media (max-width: 1200px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
