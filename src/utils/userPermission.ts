import { ElMessage, ElMessageBox } from 'element-plus'

/** 系统管理员或平台管理员 */
export function isPlatformProductAdmin(): boolean {
  const role = localStorage.getItem('userRole') || ''
  return role === 'admin' || role === 'platform_admin'
}

export function requirePlatformProductAdmin(actionLabel: string): boolean {
  if (isPlatformProductAdmin()) return true
  ElMessage.warning(`仅平台管理员可${actionLabel}`)
  return false
}

/** 清空全部：二次确认，须输入「确认清空」 */
export async function confirmClearAllProducts(total: number): Promise<boolean> {
  try {
    await ElMessageBox.confirm(
      `您即将删除全部 ${total} 条商品资料（平台商品与数据商品共用同一数据源）。\n\n清空后列表为空，请重新导入。此操作不可恢复。`,
      '危险操作：清空商品资料',
      {
        confirmButtonText: '下一步',
        cancelButtonText: '取消',
        type: 'warning',
        distinguishCancelAndClose: true
      }
    )
  } catch {
    return false
  }

  try {
    const { value } = await ElMessageBox.prompt(
      '为防止误删，请在下方输入「确认清空」后继续：',
      '二次确认',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        inputPattern: /^确认清空$/,
        inputErrorMessage: '请输入「确认清空」',
        type: 'warning',
        distinguishCancelAndClose: true
      }
    )
    return value === '确认清空'
  } catch {
    return false
  }
}
