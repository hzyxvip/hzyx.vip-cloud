import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'

/** 单据表单页：首张 / 上一张 / 下一张 / 末张 导航 */
export function useOrderDocumentNav(options: {
  loadOrderIds: () => string[]
  currentId: MaybeRefOrGetter<string>
  editRoutePath: (id: string) => string
  hasUnsavedChanges?: () => boolean
}) {
  const router = useRouter()

  const orderIds = computed(() => options.loadOrderIds())

  const currentIndex = computed(() => {
    const id = String(toValue(options.currentId)).trim()
    if (!id) return -1
    return orderIds.value.findIndex(oid => oid === id)
  })

  const canNavFirst = computed(() => currentIndex.value > 0)
  const canNavPrev = computed(() => currentIndex.value > 0)
  const canNavNext = computed(() => {
    const index = currentIndex.value
    if (index < 0) return orderIds.value.length > 0
    return index < orderIds.value.length - 1
  })
  const canNavLast = computed(() => {
    const index = currentIndex.value
    if (index < 0) return orderIds.value.length > 0
    return index < orderIds.value.length - 1
  })

  const confirmNavigate = async () => {
    if (!options.hasUnsavedChanges?.()) return true
    try {
      await ElMessageBox.confirm(
        '当前单据尚未保存，确定切换吗？未保存内容将丢失。',
        '切换单据',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
      )
      return true
    } catch {
      return false
    }
  }

  const navigateToIndex = async (index: number) => {
    const id = orderIds.value[index]
    if (!id || id === String(toValue(options.currentId)).trim()) return
    if (!(await confirmNavigate())) return
    await router.push(options.editRoutePath(id))
  }

  const handleNavFirst = () => navigateToIndex(0)
  const handleNavPrev = () => {
    const index = currentIndex.value >= 0 ? currentIndex.value : 0
    if (index > 0) navigateToIndex(index - 1)
  }
  const handleNavNext = () => {
    const index = currentIndex.value >= 0 ? currentIndex.value : -1
    const nextIndex = index < 0 ? 0 : index + 1
    if (nextIndex < orderIds.value.length) navigateToIndex(nextIndex)
  }
  const handleNavLast = () => {
    if (orderIds.value.length > 0) {
      navigateToIndex(orderIds.value.length - 1)
    }
  }

  return {
    canNavFirst,
    canNavPrev,
    canNavNext,
    canNavLast,
    handleNavFirst,
    handleNavPrev,
    handleNavNext,
    handleNavLast
  }
}
