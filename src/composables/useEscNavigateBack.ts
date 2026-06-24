import { onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useLayoutNavigateBack } from '@/composables/useLayoutNavigateBack'

const NON_TYPING_INPUT_TYPES = new Set([
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'file',
  'color',
  'range',
  'hidden'
])

/** 当前是否处于需要键盘输入的控件中（输入框、文本域、下拉框等） */
export function isTypingContext(): boolean {
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  if (el.isContentEditable) return true
  if (el.closest('[data-esc-ignore]')) return true

  const tag = el.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') {
    const type = ((el as HTMLInputElement).type || 'text').toLowerCase()
    return !NON_TYPING_INPUT_TYPES.has(type)
  }

  return false
}

/** Element Plus 弹层/下拉打开时不应触发页面返回 */
export function hasOpenOverlay(): boolean {
  if (document.querySelector('.el-message-box__wrapper')) return true

  const overlays = document.querySelectorAll('.el-overlay')
  for (const node of overlays) {
    const style = window.getComputedStyle(node)
    if (style.display !== 'none' && style.visibility !== 'hidden') return true
  }

  return document.querySelectorAll('.el-popper[aria-hidden="false"]').length > 0
}

/** 全局 ESC / 返回：一级、二级界面均回首页；二级页签保留在顶栏 */
export function useEscNavigateBack(options?: { enabled?: () => boolean }) {
  const route = useRoute()
  const layoutNavigateBack = useLayoutNavigateBack()

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' && event.key !== 'Esc') return
    if (event.defaultPrevented) return
    if (options?.enabled && !options.enabled()) return
    if (isTypingContext()) return
    if (hasOpenOverlay()) return
    if (route.path === '/dashboard') return

    event.preventDefault()
    layoutNavigateBack()
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })
}
