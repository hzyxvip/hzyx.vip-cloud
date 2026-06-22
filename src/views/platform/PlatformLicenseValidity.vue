<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Setting } from '@element-plus/icons-vue'
import { useTableDrag } from '@/composables/useTableDrag'
import { useLicenseValidityColumnSettings } from '@/composables/useLicenseValidityColumnSettings'
import {
  LICENSE_VALIDITY_TOOLBAR_DEFINITIONS,
  useLicenseValidityToolbarSettings,
  type LicenseValidityToolbarActionDef
} from '@/composables/useLicenseValidityToolbarSettings'
import {
  LICENSE_VALIDITY_CATEGORY_MAP,
  LICENSE_VALIDITY_FILTER_OPTIONS,
  LICENSE_VALIDITY_MODULE_OPTIONS,
  applyDefaultLicenseValiditySort,
  formatLicenseValidityRuleName,
  compareLicenseValidityRulesByDocName,
  ruleMatchesLicenseFilter,
  type LicenseValidityFilter,
  type LicenseValidityModule,
  type LicenseValidityRule,
  type LicenseValidityType
} from '@/constants/licenseValidityRules'
import {
  deleteLicenseValidityRules,
  loadAndEnsureLicenseValidityRules,
  persistLicenseValidityRules
} from '@/utils/licenseValidityRuleStore'

const searchKeyword = ref('')
const filterModule = ref<LicenseValidityFilter>('all')
const showAddDialog = ref(false)
const showCopyModuleDialog = ref(false)
const copyTargetModules = ref<LicenseValidityModule[]>([])
const copySourceRule = ref<LicenseValidityRule | null>(null)
const editingId = ref<string | null>(null)
const tableRef = ref()
const selectedRows = ref<LicenseValidityRule[]>([])

const columns = [
  { key: 'id', label: '序号', defaultWidth: 60, align: 'center' as const },
  { key: 'module', label: '企业类型', defaultWidth: 150, align: 'center' as const },
  { key: 'docName', label: '证件名称', defaultWidth: 200 },
  { key: 'category', label: '分类', defaultWidth: 150 },
  { key: 'scope', label: '适用范围', defaultWidth: 180 },
  { key: 'validityLabel', label: '有效期', defaultWidth: 90, align: 'center' as const },
  { key: 'renewalRequirement', label: '到期延续要求', defaultWidth: 220 },
  { key: 'docKey', label: '关联证照Key', defaultWidth: 180 },
  { key: 'status', label: '状态', defaultWidth: 90, align: 'center' as const }
]

const { columnWidths, handleHeaderDragend } = useTableDrag('license-validity', columns)

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
} = useLicenseValidityColumnSettings()

const {
  showToolbarSettings,
  draftOrder,
  rowLabels,
  sortedToolbarMain,
  sortedToolbarEnd,
  sortedToolbarActions,
  openToolbarSettings,
  handleToolbarDragStart,
  handleToolbarDragOver,
  handleToolbarDrop,
  confirmToolbarSettings,
  resetToolbarSettings
} = useLicenseValidityToolbarSettings()

const toolbarRows = ['main', 'end', 'actions'] as const

const getToolbarActionLabel = (key: string) =>
  LICENSE_VALIDITY_TOOLBAR_DEFINITIONS.find(item => item.key === key)?.label || key

const getColumnAlign = (key: string): 'left' | 'center' | 'right' => {
  const col = columns.find(item => item.key === key)
  return (col?.align as 'left' | 'center' | 'right') || 'left'
}

const getColumnHeaderAlign = (key: string): 'left' | 'center' | 'right' => getColumnAlign(key)

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

const getDefaultCategory = (module: LicenseValidityModule) =>
  LICENSE_VALIDITY_CATEGORY_MAP[module][0]

const isSameRuleForModule = (
  rule: LicenseValidityRule,
  module: LicenseValidityModule,
  source: LicenseValidityRule
) =>
  rule.module === module &&
  rule.docKey === source.docKey &&
  rule.docName === source.docName &&
  (rule.docNameSub || '') === (source.docNameSub || '')

const copyTargetModuleOptions = computed(() => {
  if (!copySourceRule.value) return []
  return LICENSE_VALIDITY_MODULE_OPTIONS.filter(
    module => module !== copySourceRule.value!.module
  )
})

const filteredRules = computed(() => {
  let result = rules.value.filter(item => ruleMatchesLicenseFilter(item, filterModule.value))
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase()
    result = result.filter(item =>
      item.id.includes(keyword) ||
      item.docName.toLowerCase().includes(keyword) ||
      (item.docNameSub || '').toLowerCase().includes(keyword) ||
      (item.docKey || '').toLowerCase().includes(keyword)
    )
  }
  return [...result].sort(
    (a, b) => a.sortOrder - b.sortOrder || compareLicenseValidityRulesByDocName(a, b)
  )
})

const persistRules = () => {
  rules.value = persistLicenseValidityRules(rules.value)
}

const loadRules = () => {
  rules.value = loadAndEnsureLicenseValidityRules()
}

onMounted(() => {
  loadRules()
})

const handleApplyDefaultSort = async () => {
  try {
    await ElMessageBox.confirm(
      '确定按证件名称重新排列所有记录吗？不会覆盖已有证件内容。',
      '设为默认排序',
      { type: 'info' }
    )
  } catch {
    return
  }
  rules.value = applyDefaultLicenseValiditySort(rules.value)
  persistRules()
  ElMessage.success('已设为默认排序')
}

const handleAdd = () => {
  editingId.value = null
  addForm.value = {
    module: LICENSE_VALIDITY_MODULE_OPTIONS[0],
    category: getDefaultCategory(LICENSE_VALIDITY_MODULE_OPTIONS[0]),
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

  const ids = selectedRows.value.map(item => item.id)
  if (editingId.value && ids.includes(editingId.value)) {
    editingId.value = null
  }
  rules.value = deleteLicenseValidityRules(rules.value, ids)
  selectedRows.value = []
  tableRef.value?.clearSelection?.()
  ElMessage.success('删除成功')
}

const handleStartEdit = (row: LicenseValidityRule) => {
  editingId.value = row.id
}

const commitRuleEdit = (row: LicenseValidityRule): boolean => {
  if (!row.docName.trim()) {
    ElMessage.warning('证件名称不能为空')
    return false
  }
  row.longTerm = row.validityType === 'long_term' || row.validityLabel === '长期有效'
  return true
}

const handleSaveAll = () => {
  if (editingId.value) {
    const row = rules.value.find(item => item.id === editingId.value)
    if (row && !commitRuleEdit(row)) return
    syncValidityFields(row)
    editingId.value = null
  }
  persistRules()
  ElMessage.success('保存成功')
}

const handleCancelEdit = () => {
  loadRules()
  editingId.value = null
}

const handleRefresh = () => {
  searchKeyword.value = ''
  filterModule.value = 'all'
  editingId.value = null
  selectedRows.value = []
  tableRef.value?.clearSelection?.()
  loadRules()
  ElMessage.success('数据已刷新')
}

const handleQuery = () => {
  if (!searchKeyword.value.trim() && filterModule.value === 'all') {
    ElMessage.info('当前为全部数据，可直接在列表中筛选')
    return
  }
  ElMessage.success(`已筛选出 ${filteredRules.value.length} 条记录`)
}

const requireSelection = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先勾选要操作的记录')
    return false
  }
  return true
}

const applyStatusToSelected = (status: '正常' | '停用') => {
  if (!requireSelection()) return
  const ids = new Set(selectedRows.value.map(item => item.id))
  rules.value.forEach(item => {
    if (ids.has(item.id)) item.status = status
  })
  persistRules()
  ElMessage.success(status === '正常'
    ? `已启用 ${selectedRows.value.length} 条规则`
    : `已停用 ${selectedRows.value.length} 条规则`)
}

const handleEnableSelected = () => applyStatusToSelected('正常')

const handleDisableSelected = () => applyStatusToSelected('停用')

const formatRuleStatusLabel = (row: LicenseValidityRule) =>
  row.status === '正常' ? '启用' : '停用'

const getRuleStatusTagType = (row: LicenseValidityRule): 'success' | 'info' =>
  row.status === '正常' ? 'success' : 'info'

const buildCopyRuleId = (sourceId: string, module: LicenseValidityModule) => {
  const base = sourceId.split('-')[0]
  let candidate = `${base}-${module}`
  let suffix = 1
  while (rules.value.some(item => item.id === candidate)) {
    candidate = `${base}-${module}-${suffix++}`
  }
  return candidate
}

const resolveCopyCategory = (module: LicenseValidityModule, source: LicenseValidityRule) =>
  LICENSE_VALIDITY_CATEGORY_MAP[module].includes(source.category)
    ? source.category
    : getDefaultCategory(module)

const openCopyToEnterpriseTypes = () => {
  if (selectedRows.value.length !== 1) {
    ElMessage.warning('请先勾选一条证件有效期规则')
    return
  }
  copySourceRule.value = selectedRows.value[0]
  copyTargetModules.value = []
  showCopyModuleDialog.value = true
}

const confirmCopyToEnterpriseTypes = () => {
  const source = copySourceRule.value
  if (!source) return

  if (copyTargetModules.value.length === 0) {
    ElMessage.warning('请至少选择一个目标企业类型')
    return
  }

  const maxSort = rules.value.reduce((max, item) => Math.max(max, item.sortOrder), 0)
  let added = 0

  copyTargetModules.value.forEach((module, index) => {
    if (rules.value.some(rule => isSameRuleForModule(rule, module, source))) return

    const row: LicenseValidityRule = {
      ...JSON.parse(JSON.stringify(source)),
      id: buildCopyRuleId(source.id, module),
      module,
      category: resolveCopyCategory(module, source),
      sortOrder: maxSort + index + 1
    }
    rules.value.push(row)
    added++
  })

  if (added === 0) {
    ElMessage.warning('所选企业类型均已存在相同证件规则')
    return
  }

  persistRules()
  showCopyModuleDialog.value = false
  copySourceRule.value = null
  copyTargetModules.value = []
  ElMessage.success(`已复制 ${added} 条规则到其他企业类型`)
}

const isToolbarActionVisible = (action: LicenseValidityToolbarActionDef) => {
  if (action.conditional === 'editing') return !!editingId.value
  return true
}

const runToolbarAction = (key: string) => {
  const handlers: Record<string, () => void> = {
    enable: handleEnableSelected,
    disable: handleDisableSelected,
    defaultSort: handleApplyDefaultSort,
    cancelEdit: handleCancelEdit,
    copy: openCopyToEnterpriseTypes,
    refresh: handleRefresh,
    save: handleSaveAll,
    query: handleQuery,
    add: handleAdd,
    edit: handleToolbarEdit,
    delete: handleToolbarDelete
  }
  handlers[key]?.()
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
      <div class="search-bar-row search-bar-row-top">
        <div class="filter-module-group">
          <span class="filter-module-label">企业类型：</span>
          <el-radio-group v-model="filterModule" size="default">
            <el-radio-button
              v-for="item in LICENSE_VALIDITY_FILTER_OPTIONS"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
        </div>
        <el-input
          v-model="searchKeyword"
          placeholder="搜索证件名称、关联Key"
          style="width: 320px;"
          clearable
        />
        <el-button
          v-for="action in sortedToolbarMain.filter(isToolbarActionVisible)"
          :key="action.key"
          :type="action.buttonType"
          :plain="action.plain"
          :class="action.className"
          @click="runToolbarAction(action.key)"
        >
          {{ action.label }}
        </el-button>
        <div class="search-bar-row-end">
          <el-button
            v-for="action in sortedToolbarEnd.filter(isToolbarActionVisible)"
            :key="action.key"
            :type="action.buttonType"
            :plain="action.plain"
            :class="action.className"
            @click="runToolbarAction(action.key)"
          >
            {{ action.label }}
          </el-button>
        </div>
      </div>
      <div class="search-bar-row search-bar-row-actions">
        <el-button
          v-for="action in sortedToolbarActions.filter(isToolbarActionVisible)"
          :key="action.key"
          :type="action.buttonType"
          :plain="action.plain"
          :class="action.className"
          @click="runToolbarAction(action.key)"
        >
          {{ action.label }}
        </el-button>
      </div>
    </div>

    <div class="table-container">
      <div class="table-toolbar">
        <el-button size="small" @click="openToolbarSettings">按钮设置</el-button>
        <el-button size="small" @click="openColumnSettings">
          <el-icon><Setting /></el-icon>
          列表设置
        </el-button>
      </div>

      <div v-if="sortedVisibleColumns.length === 0" class="header-empty-tip">
        请点击「列表设置」选择要显示的列
      </div>
      <el-table
        v-else
        :key="tableColumnRenderKey"
        ref="tableRef"
        :data="filteredRules"
        class="license-validity-table common-table"
        border
        :fit="false"
        @header-dragend="handleHeaderDragend"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="42" fixed="left" align="center" header-align="center" />

        <el-table-column
          v-for="col in sortedVisibleColumns"
          :key="col.key"
          :label="col.key === 'module' ? '企业类型' : col.label"
          :width="columnWidths[col.key]"
          :align="getColumnAlign(col.key)"
          :header-align="getColumnHeaderAlign(col.key)"
          :fixed="col.key === 'id' ? 'left' : undefined"
          :show-overflow-tooltip="col.key === 'scope' || col.key === 'renewalRequirement'"
        >
          <template #default="scope">
            <template v-if="col.key === 'id'">
              {{ String(scope.$index + 1).padStart(2, '0') }}
            </template>

            <template v-else-if="col.key === 'module'">
              <el-radio-group
                v-if="editingId === scope.row.id"
                v-model="scope.row.module"
                size="small"
              >
                <el-radio-button
                  v-for="item in LICENSE_VALIDITY_MODULE_OPTIONS"
                  :key="item"
                  :value="item"
                >
                  {{ item }}
                </el-radio-button>
              </el-radio-group>
              <span v-else>{{ scope.row.module }}</span>
            </template>

            <template v-else-if="col.key === 'category'">
              <el-input v-if="editingId === scope.row.id" v-model="scope.row.category" size="small" />
              <span v-else>{{ scope.row.category }}</span>
            </template>

            <template v-else-if="col.key === 'docName'">
              <div v-if="editingId === scope.row.id" class="edit-name-col">
                <el-input v-model="scope.row.docName" size="small" placeholder="主名称" />
                <el-input v-model="scope.row.docNameSub" size="small" placeholder="副标题（如括号说明）" />
              </div>
              <div v-else class="name-cell">
                <div>{{ scope.row.docName }}</div>
                <div v-if="scope.row.docNameSub" class="name-sub">{{ scope.row.docNameSub }}</div>
              </div>
            </template>

            <template v-else-if="col.key === 'scope'">
              <el-input
                v-if="editingId === scope.row.id"
                v-model="scope.row.scope"
                size="small"
                type="textarea"
                :rows="2"
              />
              <span v-else>{{ scope.row.scope }}</span>
            </template>

            <template v-else-if="col.key === 'validityLabel'">
              <el-input v-if="editingId === scope.row.id" v-model="scope.row.validityLabel" size="small" />
              <el-tag
                v-else
                size="small"
                :type="scope.row.longTerm ? 'info' : scope.row.validityType === 'annual' ? 'warning' : 'success'"
              >
                {{ scope.row.validityLabel }}
              </el-tag>
            </template>

            <template v-else-if="col.key === 'renewalRequirement'">
              <el-input
                v-if="editingId === scope.row.id"
                v-model="scope.row.renewalRequirement"
                size="small"
                type="textarea"
                :rows="2"
              />
              <span v-else>{{ scope.row.renewalRequirement }}</span>
            </template>

            <template v-else-if="col.key === 'docKey'">
              <el-input v-if="editingId === scope.row.id" v-model="scope.row.docKey" size="small" />
              <span v-else>{{ scope.row.docKey || '——' }}</span>
            </template>

            <template v-else-if="col.key === 'status'">
              <el-tag size="small" :type="getRuleStatusTagType(scope.row)">
                {{ formatRuleStatusLabel(scope.row) }}
              </el-tag>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="showToolbarSettings" title="按钮设置" width="720px" draggable>
      <p class="sort-tip">拖拽按钮可调整位置，也可拖到其他行区域</p>
      <div
        v-for="row in toolbarRows"
        :key="row"
        class="toolbar-settings-group"
      >
        <div class="toolbar-settings-title">{{ rowLabels[row] }}</div>
        <div class="toolbar-settings-list">
          <div
            v-for="(key, index) in draftOrder[row]"
            :key="`${row}-${key}`"
            class="toolbar-settings-item"
            draggable="true"
            @dragstart="(event) => handleToolbarDragStart(event, row, index)"
            @dragover="handleToolbarDragOver"
            @drop="(event) => handleToolbarDrop(event, row, index)"
          >
            <span class="field-order">{{ index + 1 }}.</span>
            <span>{{ getToolbarActionLabel(key) }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="resetToolbarSettings">恢复默认布局</el-button>
        <el-button @click="showToolbarSettings = false">取消</el-button>
        <el-button type="primary" @click="confirmToolbarSettings">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showColumnSelector" title="列表设置" width="720px" draggable>
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

    <el-dialog v-model="showCopyModuleDialog" title="复制到其他企业类型" width="480px" draggable>
      <p v-if="copySourceRule" class="copy-module-tip">
        将「{{ formatLicenseValidityRuleName(copySourceRule) }}」复制为独立行，每行仅对应一种企业类型。
      </p>
      <el-checkbox-group v-model="copyTargetModules">
        <el-checkbox
          v-for="module in copyTargetModuleOptions"
          :key="module"
          :label="module"
          :disabled="rules.some(rule => copySourceRule && isSameRuleForModule(rule, module, copySourceRule))"
        >
          {{ module }}
          <span
            v-if="copySourceRule && rules.some(rule => isSameRuleForModule(rule, module, copySourceRule))"
            class="copy-module-exists"
          >
            （已存在）
          </span>
        </el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="showCopyModuleDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmCopyToEnterpriseTypes">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showAddDialog" title="新增证件有效期规则" width="560px">
      <el-form label-width="110px">
        <el-form-item label="企业类型" required>
          <el-radio-group v-model="addForm.module" @change="addForm.category = getDefaultCategory(addForm.module)">
            <el-radio-button
              v-for="item in LICENSE_VALIDITY_MODULE_OPTIONS"
              :key="item"
              :value="item"
            >
              {{ item }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="证件名称" required>
          <el-input v-model="addForm.docName" />
        </el-form-item>
        <el-form-item label="名称副标题">
          <el-input v-model="addForm.docNameSub" placeholder="如：（卫消证字）" />
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
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.search-bar-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
}

.search-bar-row-top {
  justify-content: flex-start;
}

.search-bar-row-end {
  margin-left: auto;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.search-bar-row-actions {
  padding-top: 4px;
  border-top: 1px solid #eef0f3;
}

.filter-module-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-module-label {
  font-size: 14px;
  color: #344054;
  white-space: nowrap;
}

.table-container {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow-x: auto;
}

.table-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 12px;
}

.toolbar-settings-group {
  & + & {
    margin-top: 16px;
  }
}

.toolbar-settings-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #344054;
}

.toolbar-settings-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar-settings-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #fafafa;
  cursor: move;
  font-size: 13px;
  color: #344054;

  .field-order {
    color: #98a2b3;
    min-width: 20px;
  }
}

.header-empty-tip {
  padding: 40px 0;
  text-align: center;
  color: #667085;
  font-size: 14px;
}

.field-selector {
  .sort-tip {
    margin: 0 0 16px;
    font-size: 13px;
    color: #667085;
  }

  .field-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    margin-bottom: 8px;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    cursor: move;
    background: #fafafa;

    .field-order {
      color: #98a2b3;
      font-size: 12px;
      min-width: 20px;
    }
  }
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

.copy-module-tip {
  margin: 0 0 16px;
  font-size: 13px;
  color: #667085;
  line-height: 1.5;
}

.copy-module-exists {
  margin-left: 4px;
  font-size: 12px;
  color: #98a2b3;
}

.license-validity-table {
  --table-line-color: #e4e7ec;
  --table-header-bg: #eff2f7;
  --table-row-odd-bg: #f0f9f7;
  --table-row-even-bg: #fff;
  --table-row-hover-bg: #d4ede6;

  width: 100%;

  :deep(.el-table__inner-wrapper::before),
  :deep(.el-table__border-left-patch),
  :deep(.el-table__border-right-patch) {
    background-color: var(--table-line-color);
  }

  :deep(th.el-table__cell),
  :deep(td.el-table__cell) {
    border-color: var(--table-line-color) !important;
    border-right: 1px solid var(--table-line-color) !important;
    border-bottom: 1px solid var(--table-line-color) !important;
    vertical-align: middle;
  }

  :deep(.el-table__header-wrapper th.el-table__cell) {
    background: var(--table-header-bg) !important;
    color: #344054;
    font-weight: 600;
  }

  :deep(.el-table__header-wrapper th.el-table__cell .cell) {
    white-space: nowrap;
    line-height: 1.4;
    padding-top: 10px;
    padding-bottom: 10px;
  }

  :deep(.el-table__body-wrapper td.el-table__cell .cell) {
    line-height: 1.5;
    padding-top: 8px;
    padding-bottom: 8px;
  }

  :deep(.el-table__header-wrapper th.el-table__cell.is-center .cell),
  :deep(.el-table__body-wrapper td.el-table__cell.is-center .cell) {
    text-align: center;
    justify-content: center;
  }

  :deep(.el-table__body-wrapper) {
    .el-table__row:nth-child(odd) > td.el-table__cell {
      background-color: var(--table-row-odd-bg) !important;
    }

    .el-table__row:nth-child(even) > td.el-table__cell {
      background-color: var(--table-row-even-bg) !important;
    }

    .el-table__row:hover > td.el-table__cell {
      background-color: var(--table-row-hover-bg) !important;
    }
  }
}

.toolbar-btn-edit,
.toolbar-btn-enable,
.toolbar-btn-disable,
.toolbar-btn-delete {
  min-width: 64px;
}

.toolbar-btn-delete.el-button--danger.is-plain {
  color: #e55353;
  border-color: #fecdca;
  background-color: #fff5f5;

  &:hover,
  &:focus {
    color: #c93c3c;
    border-color: #fda29b;
    background-color: #fef3f2;
  }
}

@media (max-width: 1200px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
