import { ref, computed, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  batchDeleteCustomers,
  batchSetCustomerAuditStatus,
  batchSetCustomerStatus,
  saveCustomerList,
  type CustomerMaster
} from '@/utils/customerStore'

const BATCH_MODIFY_COLUMNS = [
  { key: 'contact', label: '联系人', prop: 'contact', type: 'input' as const },
  { key: 'phone', label: '联系电话', prop: 'phone', type: 'input' as const },
  { key: 'mobile', label: '手机', prop: 'mobile', type: 'input' as const },
  { key: 'email', label: '邮箱', prop: 'email', type: 'input' as const },
  { key: 'type', label: '客户类型', prop: 'type', type: 'select' as const },
  { key: 'province', label: '省份', prop: 'province', type: 'input' as const },
  { key: 'city', label: '城市', prop: 'city', type: 'input' as const },
  { key: 'status', label: '状态', prop: 'status', type: 'select' as const },
  { key: 'remark', label: '备注', prop: 'remark', type: 'input' as const }
]

const CUSTOMER_TYPE_OPTIONS = [
  { label: '医院', value: 'hospital' },
  { label: '诊所', value: 'clinic' },
  { label: '药店', value: 'pharmacy' },
  { label: '医疗器械公司', value: 'deviceCompany' },
  { label: '其他', value: 'other' }
]

const STATUS_OPTIONS = [
  { label: '正常', value: 'normal' },
  { label: '停用（隐匿）', value: 'disabled' }
]

export function useCustomerListBatchActions(
  tableData: Ref<CustomerMaster[]>,
  selectedRows: Ref<CustomerMaster[]>,
  clearTableSelection: () => void,
  options: {
    onEdit: (id: string) => void
    onAfterChange?: () => void
  }
) {
  const showBatchModifyDialog = ref(false)
  const batchModifyColumn = ref('')
  const batchModifyValue = ref('')

  const batchModifiableColumns = BATCH_MODIFY_COLUMNS

  const selectedIds = computed(() => selectedRows.value.map(row => row.id))

  const batchModifyColumnDef = computed(() =>
    batchModifiableColumns.find(col => col.key === batchModifyColumn.value)
  )

  const batchModifySelectOptions = computed(() => {
    if (batchModifyColumn.value === 'type') return CUSTOMER_TYPE_OPTIONS
    if (batchModifyColumn.value === 'status') return STATUS_OPTIONS
    return []
  })

  const requireSelection = (hint = '请先勾选客户') => {
    if (selectedRows.value.length === 0) {
      ElMessage.warning(hint)
      return false
    }
    return true
  }

  const handleToolbarEdit = () => {
    if (selectedRows.value.length !== 1) {
      ElMessage.warning('请先勾选一条客户进行修改')
      return
    }
    options.onEdit(selectedRows.value[0].id)
  }

  const handleBatchDelete = async () => {
    if (!requireSelection('请先勾选要删除的客户')) return

    try {
      const count = selectedRows.value.length
      const names = selectedRows.value.map(item => item.name).join('、')
      await ElMessageBox.confirm(
        `请谨慎删除！确定删除选中的 ${count} 条客户吗？\n${names}\n此操作不可恢复。`,
        '删除确认',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      const ids = selectedRows.value.map(item => item.id)
      tableData.value = batchDeleteCustomers(ids)
      options.onAfterChange?.()
      clearTableSelection()
      ElMessage.success('删除成功')
    } catch {
      // 用户取消
    }
  }

  const handleBatchHide = async () => {
    if (!requireSelection('请先勾选要隐匿的客户')) return

    const alreadyHidden = selectedRows.value.every(row => row.status === 'disabled')
    if (alreadyHidden) {
      ElMessage.warning('选中的客户已是隐匿状态')
      return
    }

    try {
      const count = selectedRows.value.length
      await ElMessageBox.confirm(
        `确定隐匿选中的 ${count} 条客户吗？隐匿后不会在销售等业务单据的下拉列表中显示。`,
        '隐匿确认',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
      )
      tableData.value = batchSetCustomerStatus(selectedIds.value, 'disabled')
      options.onAfterChange?.()
      clearTableSelection()
      ElMessage.success(`已隐匿 ${count} 条客户`)
    } catch {
      // 用户取消
    }
  }

  const handleBatchConfirm = async () => {
    if (!requireSelection('请先勾选要确定的客户')) return

    const { auditedCount, notAuditedCount, isMixed } = (() => {
      const rows = selectedRows.value
      const audited = rows.filter(row => row.auditStatus === 'audited').length
      return {
        auditedCount: audited,
        notAuditedCount: rows.length - audited,
        isMixed: audited > 0 && rows.length - audited > 0
      }
    })()

    if (isMixed) {
      ElMessage.warning('不能同时勾选已确定和未确定的客户，请分开后再操作')
      return
    }
    if (notAuditedCount === 0) {
      ElMessage.warning('选中的客户已是确定状态，不能重复确定')
      return
    }

    try {
      const count = selectedRows.value.length
      await ElMessageBox.confirm(
        `确定审核通过选中的 ${count} 条客户吗？`,
        '确定确认',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
      )
      tableData.value = batchSetCustomerAuditStatus(selectedIds.value, true)
      options.onAfterChange?.()
      clearTableSelection()
      ElMessage.success(`已确定 ${count} 条客户`)
    } catch {
      // 用户取消
    }
  }

  const openBatchModifyDialog = () => {
    if (!requireSelection()) return
    batchModifyColumn.value = batchModifiableColumns[0]?.key || ''
    batchModifyValue.value = ''
    showBatchModifyDialog.value = true
  }

  const confirmBatchModify = () => {
    const col = batchModifiableColumns.find(item => item.key === batchModifyColumn.value)
    if (!col) {
      ElMessage.warning('请选择要修改的字段')
      return
    }

    if (col.type === 'select') {
      if (!batchModifyValue.value) {
        ElMessage.warning(`请选择${col.label}`)
        return
      }
    }

    const idSet = new Set(selectedIds.value)
    const count = selectedRows.value.length
    const next = tableData.value.map(item => {
      if (!idSet.has(item.id)) return item
      return { ...item, [col.prop]: batchModifyValue.value }
    })
    tableData.value = next
    saveCustomerList(next)
    showBatchModifyDialog.value = false
    options.onAfterChange?.()
    clearTableSelection()
    ElMessage.success(`已批量修改 ${count} 条客户的「${col.label}」`)
  }

  return {
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
  }
}
