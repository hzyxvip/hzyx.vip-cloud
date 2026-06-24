import { ElLoading, type LoadingOptions } from 'element-plus'

const DEFAULT_MIN_LOADING_MS = 1200

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** 执行任务并显示 Loading，至少保持 minDurationMs 便于用户看清进度 */
export async function runWithLoading<T>(
  task: () => Promise<T> | T,
  options?: LoadingOptions & { minDurationMs?: number }
): Promise<T> {
  const minDurationMs = options?.minDurationMs ?? DEFAULT_MIN_LOADING_MS
  const { minDurationMs: _min, ...loadingOptions } = options || {}
  const startedAt = Date.now()

  const loading = ElLoading.service({
    lock: true,
    background: 'rgba(255, 255, 255, 0.7)',
    ...loadingOptions
  })

  try {
    return await task()
  } finally {
    const elapsed = Date.now() - startedAt
    if (elapsed < minDurationMs) {
      await delay(minDurationMs - elapsed)
    }
    loading.close()
  }
}

/** 成功提示默认展示更久，便于阅读导入/恢复结果 */
export const LOADING_RESULT_MESSAGE_DURATION = 4500
