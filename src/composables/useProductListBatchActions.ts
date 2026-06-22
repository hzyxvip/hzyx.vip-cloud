import { ref, computed, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { saveProductList } from '@/utils/productStore'
import { requirePlatformProductAdmin, requireProductAudit } from '@/utils/userPermission'
import { PRODUCT_LIST_COLUMN_DEFINITIONS } from '@/composables/useProductListColumnSettings'

const BATCH_MODIFY_EXCLUDED_KEYS = new Set(['code', 'auditStatus', 'auditTime', 'source'])

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
  refreshList: () => void
) {
  const showBatchModifyDialog = ref(false)
  const batchModifyColumn = ref('')
  const batchModifyValue = ref('')

  const batchModifiableColumns = PRODUCT_LIST_COLUMN_DEFINITIONS.filter(
    col => !BATCH_MODIFY_EXCLUDED_KEYS.has(col.key)
  )

  const requireSelection = () => {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请先选择商品')
      return false
    }
    return true
  }

  const selectedProducts = computed(() =>
    allProducts.value.filter(p =>
      selectedIds.value.some(id => isSameProductId(id, p.id))
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
        if (!selectedIds.value.some(id => isSameProductId(id, item.id))) return item
        return isUnaudit
          ? { ...item, auditStatus: '待审核', auditTime: '' }
          : { ...item, auditStatus: '已审核', auditTime: now }
      })
      saveProductList(allProducts.value)
      refreshList()
      clearSelection()
      ElMessage.success(isUnaudit ? `已反审核 ${count} 个商品` : `已审核 ${count} 个商品`)
    } catch {
      // 用户取消
    }
  }

  const handleBatchDelete = async () => {
    if (!requirePlatformProductAdmin('删除商品')) return
    if (!requireSelection()) return

    try {
      await ElMessageBox.confirm(
        `确定删除 ${selectedIds.value.length} 个商品吗？此操作不可恢复！`,
        '删除确认',
        { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
      )

      const count = selectedIds.value.length
      allProducts.value = allProducts.value.filter(
        item => !selectedIds.value.some(id => isSameProductId(id, item.id))
      )
      saveProductList(allProducts.value)
      refreshList()
      clearSelection()
      ElMessage.success(`成功删除 ${count} 个商品`)
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
    const col = batchModifiableColumns.find(c => c.key === batchModifyColumn.value)
    if (!col) {
      ElMessage.warning('请选择要修改的列')
      return
    }

    allProducts.value = allProducts.value.map(item => {
      if (!selectedIds.value.some(id => isSameProductId(id, item.id))) return item
      return { ...item, [col.prop]: batchModifyValue.value }
    })
    saveProductList(allProducts.value)
    refreshList()
    showBatchModifyDialog.value = false
    ElMessage.success(`已修改 ${selectedIds.value.length} 个商品的「${col.label}」`)
    clearSelection()
  }

  return {
    showBatchModifyDialog,
    batchModifyColumn,
    batchModifyValue,
    batchModifiableColumns,
    canBatchAudit,
    canBatchUnaudit,
    handleBatchAudit,
    handleBatchDelete,
    openBatchModifyDialog,
    confirmBatchModify
  }
}
