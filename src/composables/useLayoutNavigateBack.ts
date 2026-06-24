import { inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getLayoutBackTarget } from '@/utils/layoutNavigation'

export const LAYOUT_NAVIGATE_BACK_KEY = Symbol('layoutNavigateBack')

/** Layout 注入：返回首页（二级页保留顶栏标签） */
export function useLayoutNavigateBack() {
  const router = useRouter()
  const route = useRoute()
  const injected = inject<(() => void) | null>(LAYOUT_NAVIGATE_BACK_KEY, null)

  return () => {
    if (injected) {
      injected()
      return
    }
    router.push(getLayoutBackTarget(route.path))
  }
}
