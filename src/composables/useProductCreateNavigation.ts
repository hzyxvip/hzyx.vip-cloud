import { computed, onMounted, ref, type ComputedRef, type Ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  clearProductCreateDraft,
  loadProductCreateDraft,
  saveProductCreateDraft
} from '@/utils/productCreateDraftStore'
import { useLayoutNavigateBack } from '@/composables/useLayoutNavigateBack'

type AuditStatus = 'pending' | 'approved' | 'rejected'

export function useProductCreateNavigation(options: {
  formData: Record<string, unknown>
  auditStatus: Ref<AuditStatus>
  fromPlatformPick: Ref<boolean>
  isEditMode: ComputedRef<boolean>
  listPath: string
  draftStorageKey: string
  formRef: Ref<{ validate: (cb: (valid: boolean) => void) => void } | null>
  saveToProductList: () => boolean
}) {
  const router = useRouter()
  const layoutNavigateBack = useLayoutNavigateBack()
  const initialSnapshot = ref('')
  let leaveConfirmed = false

  const captureSnapshot = () =>
    JSON.stringify({
      form: options.formData,
      audit: options.auditStatus.value,
      fromPlatform: options.fromPlatformPick.value
    })

  const isDirty = computed(() => captureSnapshot() !== initialSnapshot.value)

  const markClean = () => {
    initialSnapshot.value = captureSnapshot()
  }

  const saveDraft = () => {
    saveProductCreateDraft(options.draftStorageKey, {
      formData: options.formData,
      auditStatus: options.auditStatus.value,
      fromPlatformPick: options.fromPlatformPick.value
    })
  }

  onMounted(() => {
    if (options.isEditMode.value) {
      markClean()
      return
    }

    const draft = loadProductCreateDraft(options.draftStorageKey)
    if (draft) {
      Object.assign(options.formData, draft.formData)
      options.auditStatus.value = draft.auditStatus
      options.fromPlatformPick.value = draft.fromPlatformPick
      ElMessage.info('已恢复上次未完成的草稿')
    }
    markClean()
  })

  const confirmLeave = async (): Promise<'save' | 'discard' | 'cancel'> => {
    if (!isDirty.value) return 'discard'

    const isEdit = options.isEditMode.value
    try {
      await ElMessageBox.confirm(
        isEdit
          ? '当前修改尚未保存，是否保存？'
          : '当前填写内容尚未保存，是否保存草稿？下次新增可继续填写。',
        '返回确认',
        {
          confirmButtonText: '保存',
          cancelButtonText: '不保存',
          distinguishCancelAndClose: true,
          type: 'warning'
        }
      )
      return 'save'
    } catch (action) {
      if (action === 'cancel') return 'discard'
      return 'cancel'
    }
  }

  const leaveToList = () => {
    leaveConfirmed = true
    router.push(options.listPath)
  }

  const leaveToHome = () => {
    leaveConfirmed = true
    layoutNavigateBack()
  }

  const trySubmitToProductList = (): Promise<boolean> =>
    new Promise(resolve => {
      options.formRef.value?.validate(valid => {
        if (!valid) {
          resolve(false)
          return
        }
        resolve(options.saveToProductList())
      })
    })

  const handleSaveClick = async () => {
    const ok = await trySubmitToProductList()
    if (ok) {
      if (!options.isEditMode.value) {
        clearProductCreateDraft(options.draftStorageKey)
      }
      markClean()
      leaveToList()
      return
    }

    if (options.isEditMode.value) return

    saveDraft()
    markClean()
    ElMessage.success('已保存草稿，下次新增可继续填写')
  }

  const handleBack = async () => {
    const action = await confirmLeave()
    if (action === 'cancel') return

    if (action === 'save') {
      if (options.isEditMode.value) {
        const ok = await trySubmitToProductList()
        if (!ok) return
        markClean()
      } else {
        saveDraft()
        markClean()
        ElMessage.success('草稿已保存')
      }
    } else if (!options.isEditMode.value) {
      clearProductCreateDraft(options.draftStorageKey)
    }

    leaveToHome()
  }

  onBeforeRouteLeave(async (_to, _from, next) => {
    if (leaveConfirmed) {
      leaveConfirmed = false
      next()
      return
    }

    if (_to.path === '/dashboard') {
      const action = await confirmLeave()
      if (action === 'cancel') {
        next(false)
        return
      }
      if (action === 'save') {
        if (options.isEditMode.value) {
          const ok = await trySubmitToProductList()
          if (!ok) {
            next(false)
            return
          }
        } else {
          saveDraft()
        }
      } else if (!options.isEditMode.value) {
        clearProductCreateDraft(options.draftStorageKey)
      }
      next()
      return
    }

    const action = await confirmLeave()
    if (action === 'cancel') {
      next(false)
      return
    }

    if (action === 'save') {
      if (options.isEditMode.value) {
        const ok = await trySubmitToProductList()
        if (!ok) {
          next(false)
          return
        }
      } else {
        saveDraft()
      }
    } else if (!options.isEditMode.value) {
      clearProductCreateDraft(options.draftStorageKey)
    }

    next()
  })

  return {
    handleBack,
    handleSaveClick,
    isDirty
  }
}
