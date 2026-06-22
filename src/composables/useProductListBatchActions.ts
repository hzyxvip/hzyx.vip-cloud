import { ref, computed, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { saveProductList } from '@/utils/productStore'
import { requirePlatformProductAdmin } from '@/utils/userPermission'
import { PRODUCT_LIST_COLUMN_DEFINITIONS } from '@/composables/useProductListColumnSettings'

const BATCH_MODIFY_EXCLUDED_KEYS = new Set(['code', 'auditStatus', 'auditTime', 'source'])

function normalizeProductId(id: unknown): string {
  return String(id ?? '')
}

function isSameProductId(a: unknown, b: unknown): boolean {
  return normalizeProductId(a) === normalizeProductId(b)
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

  const auditActionLabel = computed(() => {
    if (selectedIds.value.length === 0) return '审核'
    return selectedProducts.value.every(p => p.auditStatus === '已审核') ? '反审核' : '审核'
  })

  const clearSelection = () => {
    selectedIds.value = []
    selectAll.value = false
  }

  const handleAuditToggle = async () => {
    if (!requirePlatformProductAdmin('审核商品')) return
    if (!requireSelection()) return

    const isUnaudit = auditActionLabel.value === '反审核'
    try {
      await ElMessageBox.confirm(
        isUnaudit
          ? `确定反审核 ${selectedIds.value.length} 个商品吗？`
          : `确定审核 ${selectedIds.value.length} 个商品吗？`,
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
      ElMessage.success(isUnaudit ? '已反审核' : '审核成功')
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
    auditActionLabel,
    handleAuditToggle,
    handleBatchDelete,
    openBatchModifyDialog,
    confirmBatchModify
  }
}
