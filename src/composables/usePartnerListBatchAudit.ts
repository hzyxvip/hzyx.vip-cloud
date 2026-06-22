import { computed, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { isProductAuditor } from '@/utils/userPermission'

type AuditableRow = {
  id: string
  auditStatus: string
}

function isAudited(status: string): boolean {
  return status === 'audited'
}

export function usePartnerListBatchAudit<T extends AuditableRow>(
  tableData: Ref<T[]>,
  selectedRows: Ref<T[]>,
  clearTableSelection: () => void,
  options: {
    entityLabel: string
    batchSetAudit: (ids: string[], audited: boolean) => T[]
  }
) {
  const canAudit = computed(() => isProductAuditor())

  const selectionAuditState = computed(() => {
    const rows = selectedRows.value
    const auditedCount = rows.filter(row => isAudited(row.auditStatus)).length
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
      return `请先勾选${options.entityLabel}`
    }

    const { auditedCount, notAuditedCount, isMixed } = selectionAuditState.value
    if (isMixed) {
      return `不能同时勾选已审核和未审核的${options.entityLabel}，请分开后再操作`
    }

    if (action === 'audit' && auditedCount > 0) {
      return `选中的${options.entityLabel}已是已审核状态，不能重复审核`
    }

    if (action === 'unaudit' && notAuditedCount > 0) {
      return `选中的${options.entityLabel}已是未审核状态，不能重复反审核`
    }

    return null
  }

  const handleBatchAudit = async (action: 'audit' | 'unaudit' | string) => {
    if (action !== 'audit' && action !== 'unaudit') return
    if (!canAudit.value) {
      ElMessage.warning(`您没有${options.entityLabel}审核权限`)
      return
    }

    const validationError = validateBatchAuditSelection(action)
    if (validationError) {
      ElMessage.warning(validationError)
      return
    }

    const isUnaudit = action === 'unaudit'
    const count = selectedRows.value.length
    const verb = isUnaudit ? '反审核' : '审核通过'

    try {
      await ElMessageBox.confirm(
        `确定${verb}选中的 ${count} 条${options.entityLabel}吗？`,
        isUnaudit ? '反审核确认' : '审核确认',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
      )

      const ids = selectedRows.value.map(row => row.id)
      tableData.value = options.batchSetAudit(ids, !isUnaudit)
      clearTableSelection()
      ElMessage.success(isUnaudit ? `已反审核 ${count} 条` : `已审核 ${count} 条`)
    } catch {
      // 用户取消
    }
  }

  return {
    canAudit,
    canBatchAudit,
    canBatchUnaudit,
    handleBatchAudit
  }
}
