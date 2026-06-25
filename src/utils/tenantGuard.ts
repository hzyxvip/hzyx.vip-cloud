import { ElMessage } from 'element-plus'
import { getAuthCompanyId, getAuthToken, isLoggedIn } from '@/utils/authSession'
import { getCurrentCompany } from '@/utils/dataStore'

/** 当前标签页有效租户 companyId；无登录态时不回退默认值 */
export function resolveTenantCompanyId(): number | null {
  const authId = getAuthCompanyId()
  if (authId && authId > 0) return authId
  const current = getCurrentCompany()
  if (current && current > 0) return current
  return null
}

/** 写单/同步前校验租户；失败时提示重新登录 */
export function requireTenantCompanyId(showMessage = true): number | null {
  if (!getAuthToken() || !isLoggedIn()) {
    if (showMessage) ElMessage.warning('登录已失效，请重新登录')
    return null
  }
  const companyId = resolveTenantCompanyId()
  if (!companyId) {
    if (showMessage) ElMessage.warning('无法识别当前企业，请重新登录')
  }
  return companyId
}
