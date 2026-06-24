import type { RouteLocationNormalizedLoaded } from 'vue-router'

/** 二级操作页：create/edit/detail 等 */
const SECONDARY_ROUTE_PATTERN =
  /(\/(create|edit|details?|intro|investment|license|stamp-preview)(\/|$))/

/** 菜单直达的一级列表页（精确匹配） */
const PRIMARY_ROUTE_TITLES: Record<string, string> = {
  '/dashboard': '首页',
  '/data': '基础数据',
  '/data/product': '商品资料列表',
  '/data/supplier': '供应商列表',
  '/data/customer': '客户列表',
  '/data/company': '公司资料设定',
  '/data/warehouse': '仓库管理',
  '/data/location': '库位管理',
  '/data/position': '人员岗位设定',
  '/data/account': '结算账户设定',
  '/data/product-warning': '商品证件预警',
  '/data/permission': '权限设定',
  '/data/role': '角色设定',
  '/data/inout-type': '出入库类别',
  '/data/param-config': '参数配置',
  '/data/barcode-rule': '条码规则',
  '/platform': '平台管理',
  '/platform/product': '平台商品基本资料',
  '/platform/company': '公司类型设定',
  '/platform/document': '文档目录设定',
  '/platform/account': '登录账号设定',
  '/platform/archive': '文档归档设定',
  '/platform/customer': '平台客户列表',
  '/platform/dictionary': '汉字拼音缩写补充资料',
  '/platform/unit': '平台单位设定',
  '/platform/counting': '辅助单位换算',
  '/platform/category': '医疗器械分类目录表',
  '/platform/license-validity': '医疗相关证件有效期分类表',
  '/platform/field': '平台资料字段目录',
  '/purchase/order-list': '采购订单记录',
  '/purchase/inbound': '采购入库',
  '/purchase/inbound-record': '采购入库单记录',
  '/purchase/return': '采购退货',
  '/purchase/invoice': '采购税票登记表',
  '/purchase/report': '采购明细表',
  '/purchase/summary': '采购汇总表',
  '/purchase/finance': '采购付款跟踪表',
  '/sales/order-list': '销售订单记录',
  '/sales/outbound': '销售出库',
  '/sales/outbound-record': '销售出库记录',
  '/sales/return': '销售退货',
  '/sales/invoice': '销售开票',
  '/sales/record': '销售明细表',
  '/sales/summary': '销售汇总表',
  '/sales/report': '销售跟踪表',
  '/sales/invoice-list': '已开发票列表',
  '/warehouse': '库存现况',
  '/warehouse/details': '库存现况明细表',
  '/warehouse/inout': '出入库明细表',
  '/fund': '资金管理',
  '/fund/receivable': '应收单据',
  '/fund/payment': '应付单据',
  '/system/permission': '权限管理',
  '/system/document-function': '单据功能设定',
  '/system/print': '打印设置',
  '/system/document-number': '单据编号设定',
  '/system/account': '账号设定'
}

const SECONDARY_ROUTE_TITLES: Array<{ test: (path: string) => boolean; name: string }> = [
  { test: p => p.startsWith('/data/product/create'), name: '新增商品' },
  { test: p => p.startsWith('/data/product/edit/'), name: '编辑商品' },
  { test: p => p.startsWith('/platform/product/create'), name: '新增平台商品' },
  { test: p => p.startsWith('/platform/product/edit/'), name: '编辑平台商品' },
  { test: p => p.startsWith('/data/supplier/create'), name: '供应商资料' },
  { test: p => p.startsWith('/data/customer/create'), name: '客户资料' },
  { test: p => p.startsWith('/data/customer/detail/'), name: '客户详情' },
  { test: p => p.startsWith('/platform/customer/create'), name: '平台客户资料' },
  { test: p => p.startsWith('/platform/customer/edit/'), name: '编辑平台客户' },
  { test: p => p.includes('/investment'), name: '招商信息' },
  { test: p => p.includes('/license') && p.includes('/customer'), name: '企业证照' },
  { test: p => p.startsWith('/data/company/intro'), name: '公司简介' },
  { test: p => p.startsWith('/data/company/investment'), name: '招商信息' },
  { test: p => p.startsWith('/data/company/license'), name: '企业证照' },
  { test: p => p.startsWith('/purchase/order-list/create'), name: '采购订单' },
  { test: p => p.startsWith('/sales/order-list/create'), name: '销售订单' },
  { test: p => p.includes('/order-list/details'), name: '订单详情' }
]

export type LayoutRouteLevel = 0 | 1 | 2

export function normalizeRoutePath(path: string): string {
  return path.split('?')[0].split('#')[0]
}

/** 0=首页 1=一级列表 2=二级操作 */
export function getLayoutRouteLevel(path: string): LayoutRouteLevel {
  const normalized = normalizeRoutePath(path)
  if (normalized === '/dashboard' || normalized === '/') return 0
  if (isSecondaryRoute(normalized)) return 2
  return 1
}

export function isSecondaryRoute(path: string): boolean {
  const normalized = normalizeRoutePath(path)
  if (SECONDARY_ROUTE_PATTERN.test(normalized)) return true
  const segments = normalized.split('/').filter(Boolean)
  return segments.length >= 3
}

export function resolveTabFromRoute(path: string): { name: string; path: string; level: LayoutRouteLevel } | null {
  const normalized = normalizeRoutePath(path)
  if (normalized === '/dashboard' || normalized === '/') {
    return { name: '首页', path: '/dashboard', level: 0 }
  }

  const level = getLayoutRouteLevel(normalized)

  for (const rule of SECONDARY_ROUTE_TITLES) {
    if (rule.test(normalized)) {
      return { name: rule.name, path: normalized, level }
    }
  }

  if (PRIMARY_ROUTE_TITLES[normalized]) {
    return { name: PRIMARY_ROUTE_TITLES[normalized], path: normalized, level }
  }

  const segments = normalized.split('/').filter(Boolean)
  const fallback = segments[segments.length - 1] || '页面'
  return { name: fallback, path: normalized, level }
}

/** 一级/二级界面统一返回首页；二级页签由 Layout 保留 */
export function getLayoutBackTarget(_path: string): string {
  return '/dashboard'
}

export function shouldKeepTabOnLayoutBack(path: string): boolean {
  return getLayoutRouteLevel(path) === 2
}

export function syncTabFromRoute(
  route: Pick<RouteLocationNormalizedLoaded, 'path'>,
  addTab: (name: string, path: string) => void
): void {
  const tab = resolveTabFromRoute(route.path)
  if (!tab || tab.level === 0) return
  addTab(tab.name, tab.path)
}
