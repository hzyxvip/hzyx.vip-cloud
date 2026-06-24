import { ref, computed, watch, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  saveProductList,
  syncProductListToServer,
  cancelProductServerSyncQueue,
  reconcileProductRecoveryWithCurrentList,
  addDeletedProductCodes,
  isProductListUserCleared,
  markProductListAsUserCleared,
  markProductListAsActive
} from '@/utils/productStore'
import { getAuthToken } from '@/utils/authSession'
import { requirePlatformProductAdmin, requireProductAudit, requireProductDelete } from '@/utils/userPermission'
import { PRODUCT_LIST_COLUMN_DEFINITIONS } from '@/composables/useProductListColumnSettings'
import { getProductBatchModifySelectOptions } from '@/utils/productBatchModifyOptions'

const BATCH_MODIFY_EXCLUDED_KEYS = new Set(['code', 'auditStatus', 'auditTime', 'source'])

export type ProductListDeleteGuard = 'platform' | 'permission'

export type ProductListBatchActionsOptions = {
  deleteGuard?: ProductListDeleteGuard
  /** 平台商品基本资料：批量修改需平台管理员权限并立即同步服务器 */
  requireAdminForModify?: boolean
}

function normalizeProductId(id: unknown): string {
  return String(id ?? '')
}

function isSameProductId(a: unknown, b: unknown): boolean {
  return normalizeProductId(a) === normalizeProductId(b)
}

function isProductAudited(auditStatus: unknown): boolean {
  return auditStatus === '已审核'
}

export function useProductListBatchActions(
  allProducts: Ref<any[]>,
  selectedIds: Ref<any[]>,
  selectAll: Ref<boolean>,
  refreshList: () => void,
  options?: ProductListBatchActionsOptions
) {
  const showBatchModifyDialog = ref(false)
  const batchModifyColumn = ref('')
  const batchModifyValue = ref('')

  const batchModifiableColumns = PRODUCT_LIST_COLUMN_DEFINITIONS.filter(
    col => !BATCH_MODIFY_EXCLUDED_KEYS.has(col.key)
  )

  const batchModifyColumnDef = computed(() =>
    batchModifiableColumns.find(col => col.key === batchModifyColumn.value)
  )

  const batchModifySelectOptions = computed(() =>
    getProductBatchModifySelectOptions(batchModifyColumn.value)
  )

  watch(batchModifyColumn, () => {
    batchModifyValue.value = ''
  })

  const requireSelection = () => {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请先选择商品')
      return false
    }
    return true
  }

  const selectedProducts = computed(() =>
    allProducts.value.filter(p =>
      selectedIds.value.some(id => isSameProductId(id, p.id) || isSameProductId(id, p.code))
    )
  )

  const selectionAuditState = computed(() => {
    const rows = selectedProducts.value
    const auditedCount = rows.filter(row => isProductAudited(row.auditStatus)).length
    const notAuditedCount = rows.length - auditedCount
    return {
      auditedCount,
      notAuditedCount,
      isMixed: auditedCount > 0 && notAuditedCount > 0
    }
  })

  const canBatchAudit = computed(() => {
    const { notAuditedCount, isMixed } = selectionAuditState.value
    return selectedIds.value.length > 0 && !isMixed && notAuditedCount > 0
  })

  const canBatchUnaudit = computed(() => {
    const { auditedCount, isMixed } = selectionAuditState.value
    return selectedIds.value.length > 0 && !isMixed && auditedCount > 0
  })

  const validateBatchAuditSelection = (action: 'audit' | 'unaudit'): string | null => {
    if (selectedIds.value.length === 0) {
      return '请先选择商品'
    }

    const { auditedCount, notAuditedCount, isMixed } = selectionAuditState.value
    if (isMixed) {
      return '不能同时勾选已审核和待审核的商品，请分开后再操作'
    }

    if (action === 'audit' && auditedCount > 0) {
      return '选中的商品已是已审核状态，不能重复审核'
    }

    if (action === 'unaudit' && notAuditedCount > 0) {
      return '选中的商品已是待审核状态，不能重复反审核'
    }

    return null
  }

  const clearSelection = () => {
    selectedIds.value = []
    selectAll.value = false
  }

  const handleBatchAudit = async (action: 'audit' | 'unaudit' | string) => {
    if (action !== 'audit' && action !== 'unaudit') return
    if (!requireProductAudit(action === 'audit' ? '审核商品' : '反审核商品')) return

    const validationError = validateBatchAuditSelection(action)
    if (validationError) {
      ElMessage.warning(validationError)
      return
    }

    const isUnaudit = action === 'unaudit'
    const count = selectedIds.value.length
    try {
      await ElMessageBox.confirm(
        isUnaudit
          ? `确定反审核选中的 ${count} 个商品吗？`
          : `确定审核通过选中的 ${count} 个商品吗？`,
        isUnaudit ? '反审核确认' : '审核确认',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
      )

      const now = new Date().toLocaleString('zh-CN')
      allProducts.value = allProducts.value.map(item => {
        if (!selectedIds.value.some(id => isSameProductId(id, item.id) || isSameProductId(id, item.code))) {
          return item
        }
        return isUnaudit
          ? { ...item, auditStatus: '待审核', auditTime: '' }
          : { ...item, auditStatus: '已审核', auditTime: now }
      })
      saveProductList(allProducts.value)
      await syncProductListToServer(allProducts.value)
      refreshList()
      clearSelection()
      ElMessage.success(isUnaudit ? `已反审核 ${count} 个商品` : `已审核 ${count} 个商品`)
    } catch {
      // 用户取消
    }
  }

  const requireDeletePermission = () => {
    const guard = options?.deleteGuard ?? 'permission'
    return guard === 'platform'
      ? requirePlatformProductAdmin('删除商品')
      : requireProductDelete('删除商品')
  }

  const handleBatchDelete = async () => {
    if (!requireDeletePermission()) return
    if (!requireSelection()) return

    let confirmed = false
    try {
      await ElMessageBox.confirm(
        `确定删除 ${selectedIds.value.length} 个商品吗？此操作不可恢复！`,
        '删除确认',
        { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
      )
      confirmed = true

      const count = selectedIds.value.length
      const beforeDelete = [...allProducts.value]
      const deletedCodes = beforeDelete
        .filter(item =>
          selectedIds.value.some(id => isSameProductId(id, item.id) || isSameProductId(id, item.code))
        )
        .map(item => String(item.code ?? '').trim())
        .filter(Boolean)

      allProducts.value = allProducts.value.filter(
        item =>
          !selectedIds.value.some(id => isSameProductId(id, item.id) || isSameProductId(id, item.code))
      )

      addDeletedProductCodes(deletedCodes)
      if (allProducts.value.length === 0) {
        markProductListAsUserCleared()
      } else if (isProductListUserCleared()) {
        markProductListAsActive()
      }

      cancelProductServerSyncQueue()
      saveProductList(allProducts.value, { skipServerSync: true })

      if (getAuthToken()) {
        const synced = await syncProductListToServer(allProducts.value, { replace: true })
        if (!synced && allProducts.value.length > 0) {
          allProducts.value = beforeDelete
          saveProductList(beforeDelete, { skipServerSync: true })
          ElMessage.error('删除失败：无法同步到服务器，请检查网络或稍后重试')
          return
        }
      } else {
        saveProductList(allProducts.value)
      }

      if (allProducts.value.length > 0 || isProductListUserCleared()) {
        reconcileProductRecoveryWithCurrentList()
      }

      refreshList()
      clearSelection()
      ElMessage.success(`成功删除 ${count} 个商品`)
    } catch {
      if (confirmed) {
        ElMessage.error('删除失败，请重试')
      }
    }
  }

  const requireBatchModifyPermission = () => {
    if (options?.requireAdminForModify && !requirePlatformProductAdmin('批量修改商品')) {
      return false
    }
    return true
  }

  const openBatchModifyDialog = () => {
    if (!requireSelection()) return
    if (!requireBatchModifyPermission()) return
    batchModifyColumn.value = batchModifiableColumns[0]?.key || ''
    batchModifyValue.value = ''
    showBatchModifyDialog.value = true
  }

  const confirmBatchModify = async () => {
    if (!requireBatchModifyPermission()) return

    const col = batchModifiableColumns.find(c => c.key === batchModifyColumn.value)
    if (!col) {
      ElMessage.warning('请选择要修改的列')
      return
    }

    const selectOptions = getProductBatchModifySelectOptions(col.key)
    if (selectOptions) {
      if (!batchModifyValue.value) {
        ElMessage.warning(`请选择「${col.label}」`)
        return
      }
      if (!selectOptions.some(opt => opt.value === batchModifyValue.value)) {
        ElMessage.warning(`请选择有效的「${col.label}」`)
        return
      }
    }

    const count = selectedIds.value.length
    allProducts.value = allProducts.value.map(item => {
      if (!selectedIds.value.some(id => isSameProductId(id, item.id) || isSameProductId(id, item.code))) {
        return item
      }
      const next = { ...item, [col.prop]: batchModifyValue.value }
      if (col.key === 'measureUnit') {
        next.purchaseUnit = batchModifyValue.value
        next.saleUnit = batchModifyValue.value
        if (!next.stockUnit) next.stockUnit = batchModifyValue.value
        if (!next.reportUnit) next.reportUnit = batchModifyValue.value
      }
      return next
    })

    if (options?.requireAdminForModify && getAuthToken()) {
      saveProductList(allProducts.value, { skipServerSync: true })
      const synced = await syncProductListToServer(allProducts.value)
      if (!synced) {
        ElMessage.warning('本地已修改，同步服务器失败，请稍后点「刷新」重试')
      }
    } else {
      saveProductList(allProducts.value)
    }

    refreshList()
    showBatchModifyDialog.value = false
    ElMessage.success(`已批量修改 ${count} 条商品的「${col.label}」`)
    clearSelection()
  }

  return {
    showBatchModifyDialog,
    batchModifyColumn,
    batchModifyValue,
    batchModifiableColumns,
    batchModifyColumnDef,
    batchModifySelectOptions,
    canBatchAudit,
    canBatchUnaudit,
    handleBatchAudit,
    handleBatchDelete,
    openBatchModifyDialog,
    confirmBatchModify
  }
}
