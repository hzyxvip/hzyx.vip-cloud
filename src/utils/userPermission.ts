import { ElMessage, ElMessageBox } from 'element-plus'
import { getRolePermissions } from '@/constants/rolePermissions'

/** 系统管理员或平台管理员 */
export function isPlatformProductAdmin(): boolean {
  const role = localStorage.getItem('userRole') || ''
  return role === 'admin' || role === 'platform_admin'
}

export function getUserPermissions(): string[] {
  try {
    const raw = localStorage.getItem('userPermissions')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter(Boolean)
    }
  } catch {
    // ignore malformed cache
  }

  const role = localStorage.getItem('userRole') || ''
  return getRolePermissions(role)
}

export function hasPermission(code: string): boolean {
  if (isPlatformProductAdmin()) return true
  return getUserPermissions().includes(code)
}

/** 可审核/反审核商品（平台管理员、企业管理员或具备 product_audit 权限） */
export function isProductAuditor(): boolean {
  const role = localStorage.getItem('userRole') || ''
  return isPlatformProductAdmin() || role === 'company_admin' || hasPermission('product_audit')
}

export function requirePlatformProductAdmin(actionLabel: string): boolean {
  if (isPlatformProductAdmin()) return true
  ElMessage.warning(`仅平台管理员可${actionLabel}`)
  return false
}

export function requireProductAudit(actionLabel: string): boolean {
  if (isProductAuditor()) return true
  ElMessage.warning(`您没有商品审核权限，无法${actionLabel}`)
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
