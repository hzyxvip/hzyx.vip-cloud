import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  CONFIRM_STATUS_CONFIRMED,
  CONFIRM_STATUS_UNCONFIRMED,
  type DocumentFunctionKey,
  isDocumentConfirmEnabled
} from '@/utils/documentFunctionSettings'
import { hasPermission } from '@/utils/userPermission'

export function useDocumentConfirm(
  documentKey: DocumentFunctionKey,
  getConfirmStatus: () => string,
  setConfirmStatus: (value: string) => void,
  options?: {
    validate?: () => boolean
    onPersist?: () => void
    permissionCode?: string
  }
) {
  const confirmEnabled = computed(() => isDocumentConfirmEnabled(documentKey))

  const canConfirm = computed(() => {
    if (!confirmEnabled.value) return false
    if (options?.permissionCode && !hasPermission(options.permissionCode)) return false
    return getConfirmStatus() !== CONFIRM_STATUS_CONFIRMED
  })

  const handleConfirm = () => {
    if (!confirmEnabled.value) return
    if (options?.permissionCode && !hasPermission(options.permissionCode)) {
      ElMessage.warning('无确定权限')
      return
    }
    if (getConfirmStatus() === CONFIRM_STATUS_CONFIRMED) {
      ElMessage.info('单据已确定')
      return
    }
    if (options?.validate && !options.validate()) return
    setConfirmStatus(CONFIRM_STATUS_CONFIRMED)
    options?.onPersist?.()
    ElMessage.success('单据已确定')
  }

  const requireConfirmedBeforeAudit = (): boolean => {
    if (confirmEnabled.value && getConfirmStatus() !== CONFIRM_STATUS_CONFIRMED) {
      ElMessage.warning('请先确定单据')
      return false
    }
    return true
  }

  const resetConfirmStatus = () => {
    setConfirmStatus(CONFIRM_STATUS_UNCONFIRMED)
  }

  /** 保存并审核：在需确定时自动完成确定（需确定权限） */
  const autoConfirmIfNeeded = (): boolean => {
    if (!confirmEnabled.value) return true
    if (getConfirmStatus() === CONFIRM_STATUS_CONFIRMED) return true
    if (options?.permissionCode && !hasPermission(options.permissionCode)) {
      ElMessage.warning('无确定权限，无法审核')
      return false
    }
    if (options?.validate && !options.validate()) return false
    setConfirmStatus(CONFIRM_STATUS_CONFIRMED)
    options?.onPersist?.()
    return true
  }

  return {
    confirmEnabled,
    canConfirm,
    handleConfirm,
    requireConfirmedBeforeAudit,
    resetConfirmStatus,
    autoConfirmIfNeeded
  }
}
