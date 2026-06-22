import { ref, computed, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  formatToday,
  getCompanyCategory,
  batchSetPlatformCustomerAuditStatus,
  normalizePlatformCustomerId,
  savePlatformCustomerList,
  type PlatformCustomer
} from '@/utils/platformCustomerStore'
import { PLATFORM_CUSTOMER_LIST_COLUMN_DEFINITIONS } from '@/composables/usePlatformCustomerListColumnSettings'
import { requirePlatformProductAdmin } from '@/utils/userPermission'

const BATCH_MODIFY_EXCLUDED_KEYS = new Set([
  'platformStatus',
  'companyCode',
  'companyName',
  'createDate',
  'creator',
  'editDate',
  'editor'
])

function getOperatorName(): string {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return user.realName || user.username || '平台管理员'
  } catch {
    return '平台管理员'
  }
}

export function usePlatformCustomerListBatchActions(
  allCustomers: Ref<PlatformCustomer[]>,
  selectedRows: Ref<PlatformCustomer[]>,
  clearTableSelection: () => void
) {
  const showBatchModifyDialog = ref(false)
  const batchModifyColumn = ref('')
  const batchModifyValue = ref('')

  const batchModifiableColumns = PLATFORM_CUSTOMER_LIST_COLUMN_DEFINITIONS.filter(
    col => !BATCH_MODIFY_EXCLUDED_KEYS.has(col.key)
  )

  const selectedIds = computed(() => selectedRows.value.map(row => row.id))

  const selectionAuditState = computed(() => {
    const rows = selectedRows.value
    const auditedCount = rows.filter(row => row.platformStatus === 'platformAudited').length
    const notAuditedCount = rows.length - auditedCount
    return {
      auditedCount,
      notAuditedCount,
      isMixed: auditedCount > 0 && notAuditedCount > 0
    }
  })

  const canBatchAudit = computed(() => {
    const { notAuditedCount, isMixed } = selectionAuditState.value
    return selectedRows.value.length > 0 && !isMixed && notAuditedCount > 0
  })

  const canBatchUnaudit = computed(() => {
    const { auditedCount, isMixed } = selectionAuditState.value
    return selectedRows.value.length > 0 && !isMixed && auditedCount > 0
  })

  const validateBatchAuditSelection = (action: 'audit' | 'unaudit'): string | null => {
    if (selectedRows.value.length === 0) {
      return '请先勾选客户资料'
    }

    const { auditedCount, notAuditedCount, isMixed } = selectionAuditState.value
    if (isMixed) {
      return '不能同时勾选已审核和未审核的客户，请分开后再操作'
    }

    if (action === 'audit' && auditedCount > 0) {
      return '选中的客户已是已审核状态，不能重复审核'
    }

    if (action === 'unaudit' && notAuditedCount > 0) {
      return '选中的客户已是未审核状态，不能反审核'
    }

    return null
  }

  const requireSelection = () => {
    if (selectedRows.value.length === 0) {
      ElMessage.warning('请先勾选客户资料')
      return false
    }
    return true
  }

  const handleBatchAudit = async (action: 'audit' | 'unaudit' | string) => {
    if (action !== 'audit' && action !== 'unaudit') return
    if (!requirePlatformProductAdmin('审核客户资料')) return

    const validationMessage = validateBatchAuditSelection(action)
    if (validationMessage) {
      ElMessage.warning(validationMessage)
      return
    }

    const isUnaudit = action === 'unaudit'
    const count = selectedRows.value.length
    try {
      await ElMessageBox.confirm(
        isUnaudit
          ? `确定反审核选中的 ${count} 条客户资料吗？`
          : `确定审核通过选中的 ${count} 条客户资料吗？`,
        isUnaudit ? '反审核确认' : '审核确认',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
      )

      allCustomers.value = batchSetPlatformCustomerAuditStatus(
        selectedIds.value,
        isUnaudit ? 'platformNotAudited' : 'platformAudited'
      )
      clearTableSelection()
      ElMessage.success(isUnaudit ? `已反审核 ${count} 条` : `已审核 ${count} 条`)
    } catch {
      // 用户取消
    }
  }

  const batchModifyColumnDef = computed(() =>
    batchModifiableColumns.find(col => col.key === batchModifyColumn.value)
  )

  const applyBatchFieldUpdate = (item: PlatformCustomer, prop: string, value: string): PlatformCustomer => {
    const today = formatToday()
    const operator = getOperatorName()
    const next: PlatformCustomer = {
      ...item,
      [prop]: value,
      editor: operator,
      editDate: today
    }
    if (prop === 'companyType') {
      next.companyCategory = getCompanyCategory(value)
    }
    return next
  }

  const openBatchModifyDialog = () => {
    if (!requireSelection()) return
    batchModifyColumn.value = batchModifiableColumns[0]?.key || ''
    batchModifyValue.value = ''
    showBatchModifyDialog.value = true
  }

  const confirmBatchModify = () => {
    const col = batchModifiableColumns.find(c => c.key === batchModifyColumn.value)
    if (!col) {
      ElMessage.warning('请选择要修改的列')
      return
    }

    const idSet = new Set(selectedIds.value.map(normalizePlatformCustomerId))
    const count = selectedRows.value.length
    allCustomers.value = allCustomers.value.map(item => {
      if (!idSet.has(normalizePlatformCustomerId(item.id))) return item
      return applyBatchFieldUpdate(item, col.prop, batchModifyValue.value)
    })
    savePlatformCustomerList(allCustomers.value)
    showBatchModifyDialog.value = false
    clearTableSelection()
    ElMessage.success(`已批量修改 ${count} 条客户资料的「${col.label}」`)
  }

  return {
    showBatchModifyDialog,
    batchModifyColumn,
    batchModifyValue,
    batchModifiableColumns,
    batchModifyColumnDef,
    canBatchAudit,
    canBatchUnaudit,
    handleBatchAudit,
    openBatchModifyDialog,
    confirmBatchModify
  }
}
