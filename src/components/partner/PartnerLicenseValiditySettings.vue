<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Rank } from '@element-plus/icons-vue'
import Sortable from 'sortablejs'
import { PARTNER_LICENSE_SECTIONS, formatLicenseSectionCode } from '@/constants/partnerLicenseSections'
import PartnerLicenseDocName from '@/components/partner/PartnerLicenseDocName.vue'
import {
  LICENSE_WARNING_MONTH_OPTIONS,
  PLATFORM_DEFAULT_LICENSE_WARNING_MONTHS,
  getPartnerLicenseWarningMonths,
  setPartnerLicenseWarningMonths
} from '@/utils/partnerLicenseWarning'
import {
  type LicenseVisibilityConfig,
  loadLicenseVisibility,
  saveLicenseVisibility,
  setAllLicenseVisibility,
  setLicenseItemVisible,
  setLicenseSectionVisible,
  removeLicenseItemVisibility
} from '@/utils/partnerLicenseVisibility'
import {
  type CustomLicenseTemplate,
  addCustomLicenseTemplate,
  batchUpdateLicenseTemplates,
  getEditableLicenseTemplate,
  getEffectiveLicenseSections,
  getLicenseTemplateLabel,
  removeLicenseTemplate,
  setLicenseSectionItemOrder,
  updateLicenseTemplate,
  type BatchLicenseTemplateField
} from '@/utils/partnerLicenseSettings'
import {
  TENANT_LICENSE_DELETE_CONFIRM,
  TENANT_LICENSE_RULE_TIP,
  applyTenantLicenseVisibilityScope,
  buildTenantLicenseReferenceOptions,
  buildTenantLicenseSettingsSections,
  getTenantLicenseReferenceStatusLabel,
  isTenantLicenseDeletable,
  isTenantLicenseKey,
  TENANT_LICENSE_REFERENCE_TIP
} from '@/utils/tenantCompanyLicenseService'
import type { PartnerDocument } from '@/types/partnerProfile'

const props = defineProps<{
  readonly?: boolean
  modelValue: boolean
  /** 租户企业证照：由本企业添加，不可删除 */
  tenantMode?: boolean
  companyType?: string
  documents?: PartnerDocument[]
  visibilityConfig?: LicenseVisibilityConfig
}>()

const emit = defineEmits<{
  'update:modelValue': [visible: boolean]
  'visibility-change': [config: LicenseVisibilityConfig]
  'warning-months-change': [months: number]
  'license-added': [template: CustomLicenseTemplate]
  'license-removed': [key: string]
  'tenant-license-create': [payload: {
    docName: string
    docNameSub: string
    sectionCode: string
    docNoLabel: string
    longTerm: boolean
    validityNote: string
  }]
  'tenant-license-update': [payload: {
    docKey: string
    docName: string
    docNameSub: string
    sectionCode: string
    docNoLabel: string
    longTerm: boolean
    validityNote: string
  }]
  'tenant-license-removed': [docKey: string]
  'tenant-license-reference': [templateKey: string]
  'templates-change': []
}>()

const warningMonths = ref(getPartnerLicenseWarningMonths())
const visibility = ref<LicenseVisibilityConfig>(loadLicenseVisibility())
const licenseSections = ref(getEffectiveLicenseSections())
const addDialogVisible = ref(false)
const batchDialogVisible = ref(false)
const editingLicenseKey = ref<string | null>(null)
const selectedLicenseKeys = ref<string[]>([])
const tenantReferenceKey = ref('')
const tenantReferenceSectionCode = ref('')
const addForm = reactive({
  docName: '',
  docNameSub: '',
  sectionCode: PARTNER_LICENSE_SECTIONS[0]?.code || '1',
  docNoLabel: '证照编号',
  longTerm: false,
  validityNote: ''
})
const batchForm = reactive({
  applySectionCode: false,
  sectionCode: PARTNER_LICENSE_SECTIONS[0]?.code || '1',
  applyDocNoLabel: false,
  docNoLabel: '证照编号',
  applyLongTerm: false,
  longTerm: false,
  applyValidityNote: false,
  validityNote: '',
  applyVisibility: false,
  visible: true
})

const itemListRefs = new Map<string, HTMLElement>()
const sortableInstances: Sortable[] = []

const setItemListRef = (sectionCode: string, el: unknown) => {
  if (el instanceof HTMLElement) {
    itemListRefs.set(sectionCode, el)
    return
  }
  itemListRefs.delete(sectionCode)
}

const destroyItemListSortable = () => {
  sortableInstances.splice(0).forEach(instance => instance.destroy())
}

const initItemListSortable = () => {
  destroyItemListSortable()
  if (props.readonly || props.tenantMode) return

  licenseSections.value.forEach(section => {
    const el = itemListRefs.get(section.code)
    if (!el || section.items.length < 2) return

    sortableInstances.push(
      Sortable.create(el, {
        animation: 150,
        draggable: '.item-row',
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: evt => {
          const { oldIndex, newIndex } = evt
          if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return

          const sectionIndex = licenseSections.value.findIndex(item => item.code === section.code)
          if (sectionIndex < 0) return

          const currentSection = licenseSections.value[sectionIndex]
          const nextItems = [...currentSection.items]
          const [moved] = nextItems.splice(oldIndex, 1)
          nextItems.splice(newIndex, 0, moved)
          licenseSections.value[sectionIndex] = {
            ...currentSection,
            items: nextItems
          }
          setLicenseSectionItemOrder(
            section.code,
            nextItems.map(item => item.key)
          )
          emit('templates-change')
        }
      })
    )
  })
}

const refreshSections = () => {
  if (props.tenantMode) {
    licenseSections.value = buildTenantLicenseSettingsSections(props.companyType, props.documents)
  } else {
    licenseSections.value = getEffectiveLicenseSections()
  }
  nextTick(() => initItemListSortable())
}

const drawerTitle = computed(() => (props.tenantMode ? '企业证照展示' : '证照有效期设置'))

const categoryBlockTitle = computed(() => (props.tenantMode ? '证照展示' : '证照分类显示'))

const addSectionOptions = computed(() =>
  props.tenantMode ? licenseSections.value : PARTNER_LICENSE_SECTIONS
)

const tenantReferenceOptions = computed(() =>
  buildTenantLicenseReferenceOptions(
    props.companyType,
    props.documents,
    visibility.value,
    tenantReferenceSectionCode.value || undefined
  )
)

const tenantReferenceOptionGroups = computed(() => {
  const groups = new Map<string, { code: string; title: string; items: typeof tenantReferenceOptions.value }>()
  tenantReferenceOptions.value.forEach(option => {
    if (!groups.has(option.sectionCode)) {
      groups.set(option.sectionCode, {
        code: option.sectionCode,
        title: option.sectionTitle,
        items: []
      })
    }
    groups.get(option.sectionCode)?.items.push(option)
  })
  return Array.from(groups.values())
})

const selectableTenantReferenceCount = computed(() =>
  tenantReferenceOptions.value.filter(option => option.selectable).length
)

const tenantAddDialogTitle = computed(() => {
  if (editingLicenseKey.value) return '修改证照'
  return props.tenantMode ? '引用平台证照' : '新增证照'
})

const closeDrawer = () => {
  emit('update:modelValue', false)
}

const persistVisibility = () => {
  if (!props.tenantMode) {
    saveLicenseVisibility(visibility.value)
  }
  emit('visibility-change', visibility.value)
}

const handleWarningMonthsChange = (months: number) => {
  const normalized = setPartnerLicenseWarningMonths(months)
  warningMonths.value = normalized
  emit('warning-months-change', normalized)
}

const setSectionVisible = (sectionCode: string, visible: boolean) => {
  if (props.tenantMode) {
    const section = licenseSections.value.find(item => item.code === sectionCode)
    const nextItems = { ...visibility.value.items }
    section?.items.forEach(item => {
      nextItems[item.key] = visible
    })
    visibility.value = {
      sections: { ...visibility.value.sections, [sectionCode]: visible },
      items: nextItems
    }
  } else {
    visibility.value = setLicenseSectionVisible(visibility.value, sectionCode, visible)
  }
  persistVisibility()
}

const setItemVisible = (sectionCode: string, itemKey: string, visible: boolean) => {
  if (props.tenantMode) {
    const nextItems = { ...visibility.value.items, [itemKey]: visible }
    const section = licenseSections.value.find(item => item.code === sectionCode)
    const sectionVisible = section?.items.some(item => nextItems[item.key] !== false) ?? visible
    visibility.value = {
      sections: { ...visibility.value.sections, [sectionCode]: sectionVisible },
      items: nextItems
    }
  } else {
    visibility.value = setLicenseItemVisible(visibility.value, sectionCode, itemKey, visible)
  }
  persistVisibility()
}

const selectAll = () => {
  if (props.tenantMode) {
    visibility.value = applyTenantLicenseVisibilityScope(
      visibility.value,
      props.companyType,
      props.documents,
      true
    )
  } else {
    visibility.value = setAllLicenseVisibility(true)
  }
  persistVisibility()
}

const clearAll = () => {
  if (props.tenantMode) {
    visibility.value = applyTenantLicenseVisibilityScope(
      visibility.value,
      props.companyType,
      props.documents,
      false
    )
  } else {
    visibility.value = setAllLicenseVisibility(false)
  }
  persistVisibility()
}

const allLicenseKeys = computed(() =>
  licenseSections.value.flatMap(section => section.items.map(item => item.key))
)

const isAllLicensesSelected = computed(() => {
  const keys = allLicenseKeys.value
  return keys.length > 0 && keys.every(key => selectedLicenseKeys.value.includes(key))
})

const isLicenseSelectionIndeterminate = computed(() => {
  const keys = allLicenseKeys.value
  const selectedCount = keys.filter(key => selectedLicenseKeys.value.includes(key)).length
  return selectedCount > 0 && selectedCount < keys.length
})

const toggleSelectAllLicenses = (checked: boolean) => {
  selectedLicenseKeys.value = checked ? [...allLicenseKeys.value] : []
}

const resetBatchForm = () => {
  batchForm.applySectionCode = false
  batchForm.sectionCode = PARTNER_LICENSE_SECTIONS[0]?.code || '1'
  batchForm.applyDocNoLabel = false
  batchForm.docNoLabel = '证照编号'
  batchForm.applyLongTerm = false
  batchForm.longTerm = false
  batchForm.applyValidityNote = false
  batchForm.validityNote = ''
  batchForm.applyVisibility = false
  batchForm.visible = true
}

const openBatchEditDialog = () => {
  if (selectedLicenseKeys.value.length === 0) {
    ElMessage.warning('请先勾选要批量修改的证照')
    return
  }
  resetBatchForm()
  if (props.tenantMode) {
    batchForm.applyVisibility = true
    batchForm.visible = true
  }
  batchDialogVisible.value = true
}

const findLicenseSectionCode = (itemKey: string): string | undefined => {
  return licenseSections.value.find(section =>
    section.items.some(item => item.key === itemKey)
  )?.code
}

const submitBatchEdit = () => {
  if (props.tenantMode) {
    batchForm.applyVisibility = true
  }

  const fields: BatchLicenseTemplateField[] = []
  if (batchForm.applySectionCode) fields.push('sectionCode')
  if (batchForm.applyDocNoLabel) fields.push('docNoLabel')
  if (batchForm.applyLongTerm) fields.push('longTerm')
  if (batchForm.applyValidityNote && !batchForm.longTerm) fields.push('validityNote')

  if (!fields.length && !batchForm.applyVisibility) {
    ElMessage.warning('请至少勾选一项要批量修改的内容')
    return
  }

  let updated = 0
  if (fields.length) {
    const result = batchUpdateLicenseTemplates(
      [...selectedLicenseKeys.value],
      fields,
      {
        sectionCode: batchForm.sectionCode,
        docNoLabel: batchForm.docNoLabel,
        longTerm: batchForm.longTerm,
        validityNote: batchForm.validityNote
      }
    )
    updated = result.updated
    if (result.failed.length) {
      ElMessage.warning(`有 ${result.failed.length} 条证照未能更新`)
    }
  }

  if (batchForm.applyVisibility) {
    selectedLicenseKeys.value.forEach(itemKey => {
      const sectionCode = findLicenseSectionCode(itemKey)
      if (!sectionCode) return
      visibility.value = setLicenseItemVisible(
        visibility.value,
        sectionCode,
        itemKey,
        batchForm.visible
      )
    })
    persistVisibility()
  }

  if (fields.length) {
    refreshSections()
    emit('templates-change')
  }

  batchDialogVisible.value = false
  const actionCount = fields.length
    ? Math.max(updated, batchForm.applyVisibility ? selectedLicenseKeys.value.length : 0)
    : selectedLicenseKeys.value.length
  if (actionCount === 0) {
    ElMessage.warning('未能更新所选证照，请检查勾选项')
    return
  }
  ElMessage.success(`已批量处理 ${selectedLicenseKeys.value.length} 条证照`)
}

const resetAddForm = () => {
  addForm.docName = ''
  addForm.docNameSub = ''
  addForm.sectionCode = addSectionOptions.value[0]?.code || PARTNER_LICENSE_SECTIONS[0]?.code || '1'
  addForm.docNoLabel = '证照编号'
  addForm.longTerm = false
  addForm.validityNote = ''
}

const openAddDialog = (sectionCode?: string) => {
  editingLicenseKey.value = null
  if (props.tenantMode) {
    tenantReferenceKey.value = ''
    tenantReferenceSectionCode.value = sectionCode || ''
    addDialogVisible.value = true
    return
  }
  resetAddForm()
  if (sectionCode) {
    addForm.sectionCode = sectionCode
  }
  addDialogVisible.value = true
}

const openEditDialog = () => {
  if (selectedLicenseKeys.value.length !== 1) {
    ElMessage.warning('请先勾选一条证照进行修改')
    return
  }

  const selectedKey = selectedLicenseKeys.value[0]

  if (props.tenantMode) {
    if (!isTenantLicenseKey(selectedKey)) {
      ElMessage.warning('平台模板证照不可在此修改名称，仅可调整展示状态')
      return
    }
    const doc = props.documents?.find(item => item.docKey === selectedKey)
    if (!doc) {
      ElMessage.warning('未找到所选证照')
      return
    }
    editingLicenseKey.value = selectedKey
    addForm.docName = doc.docName
    addForm.docNameSub = doc.docNameSub || ''
    addForm.sectionCode = doc.sectionCode || PARTNER_LICENSE_SECTIONS[0]?.code || '1'
    addForm.docNoLabel = doc.docNoLabel || '证照编号'
    addForm.longTerm = doc.longTerm === true
    addForm.validityNote = doc.validityNote || ''
    addDialogVisible.value = true
    return
  }

  const template = getEditableLicenseTemplate(selectedKey)
  if (!template) {
    ElMessage.warning('未找到所选证照')
    return
  }

  editingLicenseKey.value = template.key
  addForm.docName = template.docName
  addForm.docNameSub = template.docNameSub || ''
  addForm.sectionCode = template.sectionCode
  addForm.docNoLabel = template.docNoLabel || '证照编号'
  addForm.longTerm = template.longTerm === true
  addForm.validityNote = template.validityNote || ''
  addDialogVisible.value = true
}

const toggleLicenseSelection = (itemKey: string, checked: boolean) => {
  if (checked) {
    if (!selectedLicenseKeys.value.includes(itemKey)) {
      selectedLicenseKeys.value.push(itemKey)
    }
    return
  }
  selectedLicenseKeys.value = selectedLicenseKeys.value.filter(key => key !== itemKey)
}

const removeSelectedLicenses = async (keys: string[], names: string[]) => {
  if (!keys.length) return

  const deletableKeys = props.tenantMode ? keys.filter(key => isTenantLicenseDeletable(key)) : keys
  const deletableNames = props.tenantMode
    ? names.filter((_, index) => isTenantLicenseDeletable(keys[index]))
    : names

  if (props.tenantMode) {
    if (!deletableKeys.length) {
      ElMessage.warning('仅可删除本企业新增的证照，平台模板证照不可删除')
      return
    }
    if (deletableKeys.length < keys.length) {
      ElMessage.warning('已跳过不可删除的平台模板证照，仅删除本企业新增项')
    }
  }

  try {
    await ElMessageBox.confirm(
      props.tenantMode
        ? `${TENANT_LICENSE_DELETE_CONFIRM}\n\n${deletableNames.join('、')}`
        : `请谨慎删除！确定删除选中的 ${deletableKeys.length} 条证照吗？\n${deletableNames.join('、')}\n此操作不可恢复。`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }

  if (props.tenantMode) {
    deletableKeys.forEach(itemKey => {
      visibility.value = removeLicenseItemVisibility(visibility.value, itemKey)
      emit('tenant-license-removed', itemKey)
    })
    persistVisibility()
    refreshSections()
    selectedLicenseKeys.value = selectedLicenseKeys.value.filter(key => !deletableKeys.includes(key))
    ElMessage.success('证照已删除')
    return
  }

  deletableKeys.forEach(itemKey => {
    if (!removeLicenseTemplate(itemKey)) return
    visibility.value = removeLicenseItemVisibility(visibility.value, itemKey)
    emit('license-removed', itemKey)
  })

  persistVisibility()
  refreshSections()
  selectedLicenseKeys.value = selectedLicenseKeys.value.filter(key => !deletableKeys.includes(key))
  emit('templates-change')
  ElMessage.success('证照已删除')
}

const handleToolbarDelete = () => {
  if (selectedLicenseKeys.value.length === 0) {
    ElMessage.warning('请先勾选要删除的证照')
    return
  }

  if (props.tenantMode) {
    const deletable = selectedLicenseKeys.value.filter(key => isTenantLicenseDeletable(key))
    if (!deletable.length) {
      ElMessage.warning('所选证照均为平台模板，不可删除')
      return
    }
    const names = deletable.map(key => {
      const section = licenseSections.value.find(item => item.items.some(row => row.key === key))
      const item = section?.items.find(row => row.key === key)
      return item ? `${item.docName}${item.docNameSub || ''}` : key
    })
    removeSelectedLicenses(deletable, names)
    return
  }

  const names = selectedLicenseKeys.value.map(key => getLicenseTemplateLabel(key, key))
  removeSelectedLicenses([...selectedLicenseKeys.value], names)
}

const submitAdd = async () => {
  try {
    if (props.tenantMode) {
      if (editingLicenseKey.value) {
        const payload = {
          docName: addForm.docName,
          docNameSub: addForm.docNameSub,
          sectionCode: addForm.sectionCode,
          docNoLabel: addForm.docNoLabel,
          longTerm: addForm.longTerm,
          validityNote: addForm.validityNote
        }
        emit('tenant-license-update', { docKey: editingLicenseKey.value, ...payload })
        addDialogVisible.value = false
        editingLicenseKey.value = null
        ElMessage.success('证照已修改')
        return
      }

      if (!tenantReferenceKey.value) {
        ElMessage.warning('请选择要引用的平台证照项目')
        return
      }

      const option = tenantReferenceOptions.value.find(item => item.key === tenantReferenceKey.value)
      if (!option) {
        ElMessage.warning('未找到所选平台证照项目')
        return
      }
      if (!option.selectable) {
        ElMessage.warning('该证照已在展示中')
        return
      }

      emit('tenant-license-reference', tenantReferenceKey.value)
      addDialogVisible.value = false
      tenantReferenceKey.value = ''
      ElMessage.success(option.status === 'hidden' ? '已恢复展示该平台证照' : '已引用平台证照')
      return
    }

    if (editingLicenseKey.value) {
      const updated = updateLicenseTemplate(editingLicenseKey.value, {
        docName: addForm.docName,
        docNameSub: addForm.docNameSub,
        sectionCode: addForm.sectionCode,
        docNoLabel: addForm.docNoLabel,
        longTerm: addForm.longTerm,
        validityNote: addForm.validityNote
      })
      if (!updated) {
        ElMessage.warning('修改失败，证照不存在')
        return
      }
      visibility.value = setLicenseItemVisible(
        visibility.value,
        addForm.sectionCode,
        editingLicenseKey.value,
        true
      )
      persistVisibility()
      refreshSections()
      emit('templates-change')
      addDialogVisible.value = false
      editingLicenseKey.value = null
      ElMessage.success('证照已修改')
      return
    }

    const template = addCustomLicenseTemplate({
      docName: addForm.docName,
      sectionCode: addForm.sectionCode,
      docNoLabel: addForm.docNoLabel,
      longTerm: addForm.longTerm,
      validityNote: addForm.validityNote
    })
    visibility.value = setLicenseItemVisible(visibility.value, template.sectionCode, template.key, true)
    persistVisibility()
    refreshSections()
    emit('license-added', template)
    emit('templates-change')
    addDialogVisible.value = false
    ElMessage.success('证照已新增')
  } catch (error) {
    ElMessage.warning(error instanceof Error ? error.message : '保存失败')
  }
}

const removeCustomLicense = async (itemKey: string, docName: string) => {
  if (props.tenantMode && !isTenantLicenseDeletable(itemKey)) {
    ElMessage.warning('平台模板证照不可删除')
    return
  }
  await removeSelectedLicenses([itemKey], [docName])
}

watch(
  () => props.visibilityConfig,
  config => {
    if (!props.tenantMode || !config) return
    visibility.value = config
  },
  { deep: true }
)

watch(
  () => [props.companyType, props.documents?.length, props.tenantMode] as const,
  () => {
    if (!props.modelValue || !props.tenantMode) return
    refreshSections()
  }
)

watch(
  () => props.modelValue,
  open => {
    if (!open) {
      destroyItemListSortable()
      return
    }
    initPanelState()
  }
)

const initPanelState = () => {
  refreshSections()
  if (props.tenantMode && props.visibilityConfig) {
    visibility.value = props.visibilityConfig
  } else if (!props.tenantMode) {
    visibility.value = loadLicenseVisibility()
  }
  warningMonths.value = getPartnerLicenseWarningMonths()
  selectedLicenseKeys.value = []
  editingLicenseKey.value = null
}

onBeforeUnmount(() => destroyItemListSortable())

defineExpose({
  openAddDialog
})
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    :title="drawerTitle"
    direction="rtl"
    size="420px"
    @close="closeDrawer"
  >
    <div class="settings-body">
      <section class="settings-block">
        <div class="block-title">效期预警</div>
        <div class="warning-row">
          <span class="row-label">预警提前量</span>
          <el-select
            :model-value="warningMonths"
            :disabled="readonly"
            size="small"
            style="width: 120px;"
            @change="handleWarningMonthsChange"
          >
            <el-option
              v-for="option in LICENSE_WARNING_MONTH_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        <div class="block-hint">企业可选 1-6 个月，平台默认 {{ PLATFORM_DEFAULT_LICENSE_WARNING_MONTHS }} 个月</div>
      </section>

      <section class="settings-block">
        <div class="block-title row-with-actions">
          <span>{{ categoryBlockTitle }}</span>
          <div v-if="!readonly" class="quick-actions">
            <el-button type="primary" :icon="Plus" size="small" @click="openAddDialog()">添加项</el-button>
            <el-button
              size="small"
              :disabled="selectedLicenseKeys.length === 0"
              @click="openBatchEditDialog"
            >批量修改</el-button>
            <el-button
              size="small"
              :disabled="selectedLicenseKeys.length !== 1"
              @click="openEditDialog"
            >修改</el-button>
            <el-button
              type="danger"
              plain
              size="small"
              :disabled="selectedLicenseKeys.length === 0"
              @click="handleToolbarDelete"
            >删除</el-button>
            <el-button type="primary" link size="small" @click="selectAll">全显示</el-button>
            <el-button type="primary" link size="small" @click="clearAll">全隐匿</el-button>
          </div>
        </div>
        <div class="block-hint">
          <template v-if="tenantMode">仅展示当前企业身份适用的证照；添加项优先引用平台已有项目；本企业自定义证照可修改或删除，平台模板不可删除</template>
          <template v-else>勾选证照后可批量修改或删除；拖拽左侧手柄可调整排序，与证照展示页同步；关闭隐匿开关后，该证照不在列表中显示</template>
        </div>

        <div v-if="!readonly" class="batch-select-bar">
          <el-checkbox
            :model-value="isAllLicensesSelected"
            :indeterminate="isLicenseSelectionIndeterminate"
            @change="(val: string | number | boolean) => toggleSelectAllLicenses(Boolean(val))"
          >
            全选证照
          </el-checkbox>
          <span v-if="selectedLicenseKeys.length" class="selected-count">已选 {{ selectedLicenseKeys.length }} 条</span>
        </div>

        <div class="category-list">
          <div v-for="section in licenseSections" :key="section.code" class="category-group">
            <div class="section-row">
              <span class="checkbox-slot" />
              <div class="section-label">
                <span class="section-code">{{ formatLicenseSectionCode(section.code) }}</span>
                <span class="section-title">{{ section.title }}</span>
              </div>
              <div class="visibility-cell">
                <span
                  class="visibility-status"
                  :class="visibility.sections[section.code] !== false ? 'is-visible' : 'is-hidden'"
                >{{ visibility.sections[section.code] !== false ? '显示' : '隐匿' }}</span>
                <el-switch
                  :model-value="visibility.sections[section.code] !== false"
                  :disabled="readonly"
                  size="small"
                  @change="(val: string | number | boolean) => setSectionVisible(section.code, Boolean(val))"
                />
              </div>
              <span class="delete-slot section-action-slot">
                <el-button
                  v-if="!readonly"
                  type="primary"
                  link
                  size="small"
                  @click="openAddDialog(section.code)"
                >添加项</el-button>
              </span>
            </div>

            <div
              :ref="el => setItemListRef(section.code, el)"
              class="item-list"
            >
              <div v-for="item in section.items" :key="item.key" class="item-row">
                <span class="checkbox-slot">
                  <button
                    v-if="!readonly && !tenantMode && section.items.length > 1"
                    type="button"
                    class="drag-handle"
                    aria-label="拖拽排序"
                    @mousedown.stop
                  >
                    <el-icon><Rank /></el-icon>
                  </button>
                  <el-checkbox
                    v-if="!readonly"
                    :model-value="selectedLicenseKeys.includes(item.key)"
                    @change="(val: string | number | boolean) => toggleLicenseSelection(item.key, Boolean(val))"
                  />
                </span>
                <PartnerLicenseDocName
                  class="item-name"
                  :doc-name="item.docName"
                  :doc-name-sub="item.docNameSub"
                />
                <div class="visibility-cell">
                  <span
                    class="visibility-status"
                    :class="visibility.items[item.key] !== false ? 'is-visible' : 'is-hidden'"
                  >{{ visibility.items[item.key] !== false ? '显示' : '隐匿' }}</span>
                  <el-switch
                    :model-value="visibility.items[item.key] !== false"
                    :disabled="readonly"
                    size="small"
                    @change="(val: string | number | boolean) => setItemVisible(section.code, item.key, Boolean(val))"
                  />
                </div>
                <span class="delete-slot">
                  <el-button
                    v-if="!readonly && (!tenantMode || isTenantLicenseDeletable(item.key))"
                    type="danger"
                    link
                    size="small"
                    @click="removeCustomLicense(item.key, item.docName)"
                  >删除</el-button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <el-dialog
      v-model="addDialogVisible"
      :title="tenantAddDialogTitle"
      width="460px"
      append-to-body
      destroy-on-close
    >
      <template v-if="tenantMode && !editingLicenseKey">
        <el-alert
          class="tenant-add-tip"
          type="info"
          :closable="false"
          show-icon
          :title="TENANT_LICENSE_REFERENCE_TIP"
        />
        <div v-if="selectableTenantReferenceCount === 0" class="tenant-reference-empty">
          {{ tenantReferenceSectionCode ? '当前分类下暂无可引用的平台证照，或已全部展示。' : '暂无可引用的平台证照，或已全部展示。' }}
        </div>
        <el-form v-else label-width="96px" @submit.prevent="submitAdd">
          <el-form-item label="平台证照" required>
            <el-select
              v-model="tenantReferenceKey"
              filterable
              placeholder="请选择平台已有证照项目"
              style="width: 100%;"
            >
              <el-option-group
                v-for="group in tenantReferenceOptionGroups"
                :key="group.code"
                :label="`${formatLicenseSectionCode(group.code)}${group.title}`"
              >
                <el-option
                  v-for="option in group.items"
                  :key="option.key"
                  :label="`${option.docName}${option.docNameSub || ''}`"
                  :value="option.key"
                  :disabled="!option.selectable"
                >
                  <div class="tenant-reference-option">
                    <span>{{ option.docName }}{{ option.docNameSub || '' }}</span>
                    <span
                      class="tenant-reference-status"
                      :class="`is-${option.status}`"
                    >{{ getTenantLicenseReferenceStatusLabel(option.status) }}</span>
                  </div>
                </el-option>
              </el-option-group>
            </el-select>
          </el-form-item>
        </el-form>
      </template>
      <template v-else>
      <el-alert
        v-if="tenantMode && editingLicenseKey"
        class="tenant-add-tip"
        type="warning"
        :closable="false"
        show-icon
        :title="TENANT_LICENSE_RULE_TIP"
      />
      <el-form label-width="96px" @submit.prevent="submitAdd">
        <el-form-item label="证照名称" required>
          <el-input v-model="addForm.docName" placeholder="请输入证照名称" maxlength="80" show-word-limit />
        </el-form-item>
        <el-form-item label="名称副标题">
          <el-input v-model="addForm.docNameSub" placeholder="如：（卫消证字）" />
        </el-form-item>
        <el-form-item label="所属分类" required>
          <el-select v-model="addForm.sectionCode" style="width: 100%;">
            <el-option
              v-for="section in addSectionOptions"
              :key="section.code"
              :label="`${formatLicenseSectionCode(section.code)}${section.title}`"
              :value="section.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="编号标签">
          <el-input v-model="addForm.docNoLabel" placeholder="如：证照编号、备案编号" />
        </el-form-item>
        <el-form-item label="长期有效">
          <el-switch v-model="addForm.longTerm" />
        </el-form-item>
        <el-form-item v-if="!addForm.longTerm" label="效期说明">
          <el-input v-model="addForm.validityNote" placeholder="如：有效期 5 年" />
        </el-form-item>
      </el-form>
      </template>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="tenantMode && !editingLicenseKey && selectableTenantReferenceCount === 0"
          @click="submitAdd"
        >
          {{ editingLicenseKey ? '保存修改' : (tenantMode ? '确定引用' : '确定') }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="batchDialogVisible"
      :title="tenantMode ? '批量设置展示' : '批量修改证照'"
      width="460px"
      append-to-body
      destroy-on-close
    >
      <div class="batch-dialog-tip">
        已选择 {{ selectedLicenseKeys.length }} 条证照{{ tenantMode ? '，批量调整展示状态' : '，仅更新勾选的字段' }}。
      </div>
      <el-form label-width="108px" @submit.prevent="submitBatchEdit">
        <template v-if="!tenantMode">
        <el-form-item>
          <el-checkbox v-model="batchForm.applySectionCode">统一所属分类</el-checkbox>
          <el-select
            v-model="batchForm.sectionCode"
            :disabled="!batchForm.applySectionCode"
            style="width: 100%; margin-top: 8px;"
          >
            <el-option
              v-for="section in PARTNER_LICENSE_SECTIONS"
              :key="section.code"
              :label="`${formatLicenseSectionCode(section.code)}${section.title}`"
              :value="section.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="batchForm.applyDocNoLabel">统一编号标签</el-checkbox>
          <el-input
            v-model="batchForm.docNoLabel"
            :disabled="!batchForm.applyDocNoLabel"
            placeholder="如：证照编号、备案编号"
            style="margin-top: 8px;"
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="batchForm.applyLongTerm">统一长期有效</el-checkbox>
          <el-switch
            v-model="batchForm.longTerm"
            :disabled="!batchForm.applyLongTerm"
            style="margin-left: 12px;"
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="batchForm.applyValidityNote">统一效期说明</el-checkbox>
          <el-input
            v-model="batchForm.validityNote"
            :disabled="!batchForm.applyValidityNote || batchForm.applyLongTerm && batchForm.longTerm"
            placeholder="如：有效期 5 年"
            style="margin-top: 8px;"
          />
        </el-form-item>
        </template>
        <el-form-item>
          <el-checkbox v-if="!tenantMode" v-model="batchForm.applyVisibility">统一显示状态</el-checkbox>
          <span v-else class="batch-visibility-label">统一显示状态</span>
          <el-radio-group
            v-model="batchForm.visible"
            :disabled="!tenantMode && !batchForm.applyVisibility"
            style="margin-left: 12px;"
          >
            <el-radio :value="true">显示</el-radio>
            <el-radio :value="false">隐匿</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitBatchEdit">应用到选中证照</el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<style lang="scss" scoped>
.settings-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.tenant-add-tip {
  margin-bottom: 12px;
}

.tenant-reference-empty {
  padding: 16px 12px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
  background: #f8fafc;
  border: 1px dashed #dbe3ef;
  border-radius: 6px;
}

.tenant-reference-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tenant-reference-status {
  flex-shrink: 0;
  font-size: 12px;
  color: #64748b;

  &.is-visible {
    color: #16a34a;
  }

  &.is-hidden {
    color: #d97706;
  }
}

.settings-block {
  .block-title {
    font-size: 14px;
    font-weight: 600;
    color: #344054;
    margin-bottom: 10px;

    &.row-with-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
  }

  .block-hint {
    margin-top: 6px;
    font-size: 12px;
    color: #667085;
  }
}

.warning-row {
  display: flex;
  align-items: center;
  gap: 10px;

  .row-label {
    font-size: 13px;
    color: #344054;
  }
}

.quick-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.batch-select-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0 10px;
  font-size: 12px;
  color: #667085;

  .selected-count {
    color: #007a6a;
    font-weight: 600;
  }
}

.batch-dialog-tip {
  margin-bottom: 12px;
  font-size: 12px;
  color: #667085;
}

.batch-visibility-label {
  font-size: 13px;
  color: #344054;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.category-group {
  padding: 10px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;

  --license-action-checkbox-width: 44px;
  --license-action-visibility-width: 72px;
  --license-action-delete-width: 36px;
}

.section-row,
.item-row {
  display: grid;
  grid-template-columns:
    var(--license-action-checkbox-width)
    minmax(0, 1fr)
    var(--license-action-visibility-width)
    var(--license-action-delete-width);
  align-items: center;
  column-gap: 6px;
}

.checkbox-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 24px;
}

.section-row {
  min-height: 32px;
  --license-action-delete-width: 52px;
}

.section-action-slot {
  :deep(.el-button) {
    padding: 0 2px;
    font-size: 11px;
  }
}

.section-label {
  display: flex;
  align-items: center;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: #344054;

  .section-code {
    width: 40px;
    flex-shrink: 0;
    color: #00bfa5;
    font-weight: 600;
  }

  .section-title {
    min-width: 0;
    line-height: 1.35;
  }
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #e4e7ed;
}

.item-row {
  min-height: 30px;
  padding: 2px 0;

  &.sortable-ghost {
    opacity: 0.45;
    background: #ecfdf8;
    border-radius: 4px;
  }
}

.item-name {
  min-width: 0;
  padding-left: 8px;

  :deep(.name-main) {
    font-size: 12px;
    line-height: 1.35;
    color: #344054;
  }

  :deep(.name-sub) {
    font-size: 11px;
    margin-top: 1px;
  }
}

.visibility-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  position: relative;
  z-index: 1;

  :deep(.el-switch) {
    height: 20px;
  }
}

.visibility-status {
  font-size: 10px;
  line-height: 1.2;
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 0 0 1px rgba(228, 231, 237, 0.75);

  &.is-visible {
    color: #007a6a;
    background: rgba(236, 253, 248, 0.92);
    box-shadow: 0 0 0 1px rgba(127, 220, 200, 0.45);
  }

  &.is-hidden {
    color: #98a2b3;
    background: rgba(248, 250, 252, 0.92);
  }
}

.delete-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
}

.drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: #98a2b3;
  cursor: grab;
  flex-shrink: 0;

  &:hover {
    color: #00bfa5;
    background: #ecfdf8;
  }

  &:active {
    cursor: grabbing;
  }
}
</style>
