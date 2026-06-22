<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Message,
  Setting,
  HomeFilled,
  ShoppingCart,
  Van,
  Shop,
  Wallet,
  DataBoard,
  MapLocation,
  FolderOpened,
  ArrowDown,
  TurnOff,
  ArrowRight,
  Close,
  OfficeBuilding
} from '@element-plus/icons-vue'
import { getCurrentCompany, setCurrentCompany, type Company } from '@/utils/dataStore'
import { companyApi } from '@/utils/api'
import { isPlatformOperator } from '@/utils/customerProductService'
import { isPlatformCompanyRecord, PLATFORM_COMPANY_NAME } from '@/constants/platformCompany'

const router = useRouter()
const route = useRoute()

const hoverMenu = ref('')
const openTabs = ref<Array<{ name: string; path: string }>>([
  { name: '首页', path: '/dashboard' }
])

const currentCompanyId = ref<number>(1)
const currentCompanyInfo = ref<Company | null>(null)
const companies = ref<Company[]>([])
const userInfo = ref<{
  username: string
  realName: string
  role: string
  companyId?: number
  companyName?: string
  companyCode?: string
  companyType?: string
} | null>(null)

const buildCompanyFromUser = (): Company | null => {
  try {
    const user = userInfo.value || JSON.parse(localStorage.getItem('user') || '{}')
    if (!user?.companyId || !user?.companyName) return null
    return {
      id: Number(user.companyId),
      code: String(user.companyCode || ''),
      name: String(user.companyName),
      companyType: String(user.companyType || ''),
      address: '',
      phone: '',
      taxNo: '',
      status: '启用'
    }
  } catch {
    return null
  }
}

const resolveCurrentCompany = async () => {
  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    userInfo.value = JSON.parse(storedUser)
  }

  try {
    const data = await companyApi.getAll()
    companies.value = data.filter(c => c.status === '启用')
  } catch {
    companies.value = []
  }

  if (isPlatformBoss.value) {
    const platformCompany = companies.value.find(c => isPlatformCompanyRecord(c))
    if (platformCompany) {
      currentCompanyId.value = platformCompany.id
      setCurrentCompany(platformCompany.id)
      currentCompanyInfo.value = platformCompany
      return
    }
  }

  const loginCompanyId = Number(userInfo.value?.companyId) || getCurrentCompany()
  currentCompanyId.value = loginCompanyId
  setCurrentCompany(loginCompanyId)

  currentCompanyInfo.value = companies.value.find(c => c.id === loginCompanyId) || null

  if (!currentCompanyInfo.value && loginCompanyId) {
    try {
      const company = await companyApi.getById(loginCompanyId)
      currentCompanyInfo.value = company
      if (!companies.value.some(c => c.id === company.id)) {
        companies.value = [...companies.value, company]
      }
    } catch {
      currentCompanyInfo.value = buildCompanyFromUser()
      if (currentCompanyInfo.value && !companies.value.some(c => c.id === currentCompanyInfo.value!.id)) {
        companies.value = [currentCompanyInfo.value]
      }
    }
  }

  if (!currentCompanyInfo.value) {
    currentCompanyInfo.value = buildCompanyFromUser()
    if (currentCompanyInfo.value) {
      companies.value = [currentCompanyInfo.value]
    }
  }
}

const isPlatformBoss = computed(() => {
  const role = userInfo.value?.role || localStorage.getItem('userRole') || ''
  return role === 'admin' || role === 'platform_admin'
})

const visibleCompanies = computed(() => {
  if (isPlatformBoss.value) {
    return companies.value.filter(c => isPlatformCompanyRecord(c))
  }
  return companies.value
})

const displayCompanyName = computed(() => {
  if (currentCompanyInfo.value?.name) return currentCompanyInfo.value.name
  if (userInfo.value?.companyName) return userInfo.value.companyName
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user.companyName) return user.companyName
  } catch {
    // ignore malformed cache
  }
  if (isPlatformBoss.value) return PLATFORM_COMPANY_NAME
  return '选择公司'
})

const displayCompanyTypeLabel = computed(() => {
  const type = currentCompanyInfo.value?.companyType || userInfo.value?.companyType || ''
  if (type === 'platform') return '平台'
  if (type === 'manufacturer') return '生产企业'
  if (type === 'distributor') return '经营公司'
  if (type === 'hospital') return '医疗机构'
  return ''
})

let hideTimer: ReturnType<typeof setTimeout> | null = null
const isMouseInPanel = ref(false)
const panelTop = ref(0)

const panelMaxHeight = computed(() => {
  return `calc(100vh - ${panelTop.value}px - 20px)`
})

onMounted(() => {
  resolveCurrentCompany()
})

const switchCompany = (companyId: number) => {
  currentCompanyId.value = companyId
  setCurrentCompany(companyId)
  currentCompanyInfo.value = companies.value.find(c => c.id === companyId) || null
  router.push('/dashboard')
}

const handleMenuHover = (label: string, event: MouseEvent) => {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  hoverMenu.value = label
  const target = event.currentTarget as HTMLElement
  const itemHeight = target.offsetHeight
  panelTop.value = Math.max(8, target.offsetTop - itemHeight * 2)
}

const handleMenuLeave = () => {
  hideTimer = setTimeout(() => {
    if (!isMouseInPanel.value) {
      hoverMenu.value = ''
    }
    hideTimer = null
  }, 150)
}

const handlePanelEnter = () => {
  isMouseInPanel.value = true
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

const handlePanelLeave = () => {
  isMouseInPanel.value = false
  hoverMenu.value = ''
}

const handleSubMenuClick = (path: string, label: string) => {
  router.push(path)
  hoverMenu.value = ''
  isMouseInPanel.value = false
  addTab(label, path)
}
const baseMenuItems = [
  {
    label: '采购管理',
    icon: ShoppingCart,
    categories: [
      {
        name: '采购单据',
        items: [
          { label: '采购订单', path: '/purchase/order-list/create' },
          { label: '采购订单记录', path: '/purchase/order-list' },
          { label: '采购入库', path: '/purchase/inbound' },
          { label: '采购入库单记录', path: '/purchase/inbound-record' },
          { label: '采购退货', path: '/purchase/return' },
          { label: '采购税票登记表', path: '/purchase/invoice' }
        ]
      },
      {
        name: '采购报表',
        items: [
          { label: '采购明细表', path: '/purchase/report' },
          { label: '采购汇总表', path: '/purchase/summary' },
          { label: '采购订单跟踪表', path: '/purchase/report' },
          { label: '采购付款跟踪表', path: '/purchase/finance' },
          { label: '采购付款一览表', path: '/purchase/finance' },
          { label: '采购日报', path: '/purchase/report' },
          { label: '采购价格分析表', path: '/purchase/report' },
          { label: '采购税票汇总表', path: '/purchase/return-record' }
        ]
      }
    ]
  },
  {
    label: '销售管理',
    icon: Van,
    categories: [
      {
        name: '销售单据',
        items: [
          { label: '销售订单', path: '/sales/order-list/create' },
          { label: '销售订单记录', path: '/sales/order-list' },
          { label: '销售出库', path: '/sales/outbound' },
          { label: '销售出库记录', path: '/sales/outbound-record' },
          { label: '销售退货', path: '/sales/return' },
          { label: '销售开票', path: '/sales/invoice' }
        ]
      },
      {
        name: '销售报表',
        items: [
          { label: '销售明细表', path: '/sales/record' },
          { label: '销售汇总表', path: '/sales/summary' },
          { label: '销售跟踪表', path: '/sales/report' },
          { label: '已开发票列表', path: '/sales/invoice-list' }
        ]
      }
    ]
  },
  {
    label: '仓库管理',
    icon: Shop,
    categories: [
      {
        name: '库存单据',
        items: [
          { label: '库存现况', path: '/warehouse' },
          { label: '生产入库', path: '/warehouse/production' },
          { label: '调拨出库', path: '/warehouse/transfer-out' },
          { label: '调拨入库', path: '/warehouse/transfer-in' },
          { label: '其他入库', path: '/warehouse/other-in' },
          { label: '其他出库', path: '/warehouse/other-out' },
          { label: '盘点单', path: '/warehouse/inventory' },
          { label: '盘盈入库', path: '/warehouse/inventory-in' },
          { label: '盘亏出库', path: '/warehouse/inventory-out' },
          { label: '预留单', path: '/warehouse/reserve' }
        ]
      },
      {
        name: '库存报表',
        items: [
          { label: '库存现况明细表', path: '/warehouse/details' },
          { label: '出入库明细表', path: '/warehouse/inout' },
          { label: '调拨差异处理表', path: '/warehouse/transfer-adjust' }
        ]
      }
    ]
  },
  {
    label: '资金管理',
    icon: Wallet,
    categories: [
      {
        name: '应收管理',
        items: [
          { label: '应收单据', path: '/fund/receivable' },
          { label: '收款单', path: '/fund/receipt' },
          { label: '收款退款', path: '/fund/receivable-refund' },
          { label: '预收款', path: '/fund/pre-receipt' },
          { label: '预收款退款', path: '/fund/pre-receipt-refund' },
          { label: '收款核销', path: '/fund/receipt-collection' }
        ]
      },
      {
        name: '应付管理',
        items: [
          { label: '应付单据', path: '/fund/payment' },
          { label: '付款单', path: '/fund/pay' },
          { label: '付款退款', path: '/fund/payment-refund' },
          { label: '预付款', path: '/fund/pre-payment' },
          { label: '预付款退款', path: '/fund/pre-payment-refund' },
          { label: '付款核销', path: '/fund/payment-collection' }
        ]
      },
      {
        name: '资金报表',
        items: [
          { label: '应收款明细表', path: '/fund/receivable-detail' },
          { label: '应付款明细表', path: '/fund/payment-detail' },
          { label: '收款明细表', path: '/fund/receipt-detail' },
          { label: '付款明细表', path: '/fund/pay-detail' },
          { label: '应收款汇总表', path: '/fund/receivable-stat' },
          { label: '应付款汇总表', path: '/fund/payment-stat' },
          { label: '应收款预警表', path: '/fund/receivable-forecast' },
          { label: '应付款预警表', path: '/fund/payment-forecast' },
          { label: '应收账款账龄表', path: '/fund/receivable-age' },
          { label: '应付账款账龄表', path: '/fund/payment-age' },
          { label: '往来报表', path: '/fund/report' },
          { label: '现金银行报表', path: '/fund/cash' },
          { label: '账户余额表', path: '/fund/account' }
        ]
      },
      {
        name: '其他收支',
        items: [
          { label: '其他收入', path: '/fund/other-income' },
          { label: '其他支出', path: '/fund/other-expense' },
          { label: '其他收入退款', path: '/fund/other-income-refund' },
          { label: '其他支出退款', path: '/fund/other-expense-refund' },
          { label: '合并收款单记录', path: '/fund/merge-receipt' }
        ]
      }
    ]
  },
  {
    label: '资料管理',
    icon: DataBoard,
    categories: [
      {
        name: '基础资料',
        items: [
          { label: '商品资料列表', path: '/data/product' },
          { label: '供应商资料', path: '/data/supplier' },
          { label: '客户管理', path: '/data/customer' },
          { label: '公司资料设定', path: '/data/company' },
          { label: '仓库管理', path: '/data/warehouse' },
          { label: '库位管理', path: '/data/location' },
          { label: '人员岗位设定', path: '/data/position' },
          { label: '结算账户设定', path: '/data/account' }
        ]
      },
      {
        name: '系统维护',
        items: [
          { label: '商品证件预警', path: '/data/product-warning' },
          { label: '权限设定', path: '/data/permission' },
          { label: '角色设定', path: '/data/role' },
          { label: '出入库类别', path: '/data/inout-type' }
        ]
      }
    ]
  },
  {
    label: '平台管理',
    icon: MapLocation,
    categories: [
      {
        name: '平台配置',
        items: [
          { label: '平台商品基本资料', path: '/platform/product' },
          { label: '公司类型设定', path: '/platform/company' },
          { label: '文档目录设定', path: '/platform/document' },
          { label: '登录账号设定', path: '/platform/account' },
          { label: '文档归档设定', path: '/platform/archive' },
          { label: '平台客户列表', path: '/platform/customer' },
          { label: '平台客户资料增加', path: '/platform/customer/create' }
        ]
      },
      {
        name: '数据维护',
        items: [
          { label: '汉字拼音缩写补充资料', path: '/platform/dictionary' },
          { label: '平台单位设定', path: '/platform/unit' },
          { label: '辅助单位换算', path: '/platform/counting' },
          { label: '医疗器械分类目录表', path: '/platform/category' },
          { label: '医疗相关证件有效期分类表', path: '/platform/license-validity' },
          { label: '平台资料字段目录', path: '/platform/field' }
        ]
      }
    ]
  }
]

const menuItems = computed(() => {
  if (isPlatformOperator()) return baseMenuItems
  return baseMenuItems.filter(item => item.label !== '平台管理')
})

const currentMenu = computed(() => {
  return menuItems.value.find(item => 
    item.categories.some(cat => cat.items.some(i => route.path.startsWith(i.path.split('/')[1])))
  )
})

const currentTabIndex = computed(() => {
  return openTabs.value.findIndex(tab => tab.path === route.path)
})

const addTab = (name: string, path: string) => {
  const existing = openTabs.value.find(tab => tab.path === path)
  if (!existing) {
    openTabs.value.push({ name, path })
  }
}

const closeTab = (index: number) => {
  if (index === 0) return
  openTabs.value.splice(index, 1)
  if (currentTabIndex.value === -1) {
    router.push(openTabs.value[openTabs.value.length - 1].path)
  }
}

const switchTab = (path: string) => {
  router.push(path)
}

const handleHomeClick = () => {
  router.push('/dashboard')
  hoverMenu.value = ''
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('userRole')
  localStorage.removeItem('userPermissions')
  localStorage.removeItem('currentCompanyId')
  router.push('/login')
}

const dropdownMenu = [
  { label: '消息中心', icon: Message },
  { label: '系统设置', icon: Setting },
  { label: '退出登录', icon: TurnOff, onClick: handleLogout }
]
</script>

<template>
  <el-container class="layout-container">
    <el-aside width="200px" class="sidebar">
      <div class="logo" @click="handleHomeClick">
        <el-icon :size="32" class="logo-icon">
          <FolderOpened />
        </el-icon>
        <span class="logo-text">医享云平台</span>
      </div>
      <div class="menu-list">
        <div 
          :class="['menu-item', 'home-item', { active: route.path === '/dashboard' }]"
          @click="handleHomeClick"
        >
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </div>
        <div 
          v-for="item in menuItems" 
          :key="item.label"
          class="menu-item"
          :class="{ 
            active: currentMenu?.label === item.label,
            hover: hoverMenu === item.label
          }"
          @mouseenter="handleMenuHover(item.label, $event)"
          @mouseleave="handleMenuLeave"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
          <el-icon class="arrow-icon"><ArrowRight /></el-icon>
        </div>
      </div>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <div 
            v-for="(tab, index) in openTabs" 
            :key="tab.path"
            class="tab-item"
            :class="{ active: route.path === tab.path }"
            @click="switchTab(tab.path)"
          >
            <span>{{ tab.name }}</span>
            <el-icon v-if="index > 0" class="tab-close" @click.stop="closeTab(index)"><Close /></el-icon>
          </div>
        </div>
        <div class="header-right">
          <el-dropdown v-if="visibleCompanies.length > 1" class="company-dropdown">
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item 
                  v-for="company in visibleCompanies" 
                  :key="company.id"
                  :class="{ active: currentCompanyId === company.id }"
                  @click="switchCompany(company.id)"
                >
                  <el-icon><OfficeBuilding /></el-icon>
                  {{ company.name }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
            <div class="company-info">
              <el-icon class="company-icon"><OfficeBuilding /></el-icon>
              <span>{{ displayCompanyName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
          </el-dropdown>
          <div v-else class="company-info company-info--static">
            <el-icon class="company-icon"><OfficeBuilding /></el-icon>
            <span>{{ displayCompanyName }}</span>
            <el-tag v-if="isPlatformBoss" size="small" type="success" effect="plain">平台</el-tag>
            <el-tag v-else-if="displayCompanyTypeLabel" size="small" type="info" effect="plain">
              {{ displayCompanyTypeLabel }}
            </el-tag>
          </div>
          <el-button class="header-btn" icon="Bell" circle />
          <el-button class="header-btn" icon="Message" circle />
          <el-dropdown>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="menu in dropdownMenu" :key="menu.label" @click="menu.onClick && menu.onClick()">
                  <el-icon><component :is="menu.icon" /></el-icon>
                  {{ menu.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
            <div class="user-info">
              <el-avatar icon="User" />
              <span class="user-name">{{ userInfo?.realName || userInfo?.username || '管理员' }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
          </el-dropdown>
        </div>
      </el-header>
      <el-container class="content-container">
        <div 
          v-if="hoverMenu"
          class="sub-menu-panel show"
          :style="{ top: panelTop + 'px', maxHeight: panelMaxHeight }"
          @mouseenter="handlePanelEnter"
          @mouseleave="handlePanelLeave"
        >
          <div class="panel-content">
            <div 
              v-for="category in menuItems.find(m => m.label === hoverMenu)?.categories"
              :key="category.name"
              class="category"
            >
              <div class="category-title">{{ category.name }}</div>
              <div class="category-items">
                <div 
                  v-for="item in category.items"
                  :key="item.path"
                  class="sub-item"
                  :class="{ active: route.path === item.path }"
                  @click="handleSubMenuClick(item.path, item.label)"
                >
                  {{ item.label }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <el-main class="main-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </el-container>
</template>

<style lang="scss" scoped>
$primary-color: #00bfa5;
$primary-light: #4DD0E1;
$success-color: #36B37E;
$warning-color: #FF9F43;
$danger-color: #E55353;
$info-color: #6B7A99;

$sidebar-bg: #F5F7FA;
$sidebar-card: #FFFFFF;
$sidebar-text: #333333;
$sidebar-text-secondary: #666666;
$sidebar-border: #E8ECF0;
$sidebar-hover: #E8F5F3;

$panel-bg: #FFFFFF;
$panel-border: #E8ECF0;

$light-bg: #F2F4F7;
$light-card: #FFFFFF;
$light-border: #F2F4F7;
$light-divider: #E4E7EC;
$light-row-hover: #F5F7FA;
$light-header: #FFFFFF;

.layout-container {
  height: 100vh;
  display: flex;
}

.content-container {
  position: relative;
  flex: 1;
}

.sidebar {
  background-color: $sidebar-bg;
  display: flex;
  flex-direction: column;
  padding-top: 0;
  flex-shrink: 0;
  position: relative;
  z-index: 100;
}

.logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  margin-bottom: 0;
  border-bottom: 1px solid $sidebar-border;
  
  .logo-icon {
    color: $primary-color;
    margin-bottom: 8px;
  }
  
  .logo-text {
    font-size: 16px;
    font-weight: 600;
    color: $sidebar-text;
    text-align: center;
  }
}

.menu-list {
  flex: 1;
  padding: 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin: 0;
  border-radius: 0;
  cursor: pointer;
  color: $sidebar-text-secondary;
  transition: all 0.2s;
  
  :deep(.el-icon) {
    margin-right: 10px;
    font-size: 16px;
    color: $sidebar-text-secondary;
  }
  
  .arrow-icon {
    margin-left: auto;
    margin-right: 0;
    font-size: 12px;
    opacity: 0.5;
    color: $sidebar-text-secondary;
  }
  
  &:hover, &.hover {
    background-color: $sidebar-hover;
    color: $primary-color;
    
    :deep(.el-icon) {
      color: $primary-color;
    }
    
    .arrow-icon {
      color: $primary-color;
      opacity: 1;
    }
  }
  
  &.active {
    background-color: $primary-color;
    color: #ffffff;
    
    :deep(.el-icon) {
      color: #ffffff;
    }
    
    .arrow-icon {
      opacity: 1;
      color: #ffffff;
    }
  }
  
  // 首页菜单项特殊样式（未激活时）
  &.home-item:not(.active) {
    font-weight: 600;
    font-size: 15px;
    color: $primary-color;
    background: linear-gradient(135deg, rgba(0, 191, 165, 0.1) 0%, rgba(0, 191, 165, 0.05) 100%);
    border-left: 3px solid $primary-color;
    
    :deep(.el-icon) {
      color: $primary-color;
      font-size: 18px;
    }
    
    span {
      color: $primary-color;
      font-weight: 600;
    }
  }
  
  // 首页菜单项特殊样式（激活时）
  &.home-item.active {
    font-weight: 600;
    font-size: 15px;
    background-color: $primary-color;
    
    :deep(.el-icon) {
      font-size: 18px;
    }
    
    span {
      font-weight: 600;
    }
  }
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  background-color: $light-card;
  border-bottom: 1px solid $light-divider;
  height: 50px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  overflow-x: auto;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  font-size: 13px;
  color: $sidebar-text-secondary;
  background-color: $light-border;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: all 0.2s;
  
  &:hover {
    background-color: $light-row-hover;
    color: $primary-color;
  }
  
  &.active {
    background-color: $light-card;
    color: $primary-color;
    border-bottom-color: $primary-color;
    font-weight: 500;
  }
  
  .tab-close {
    font-size: 12px;
    opacity: 0.5;
    
    &:hover {
      opacity: 1;
      color: $danger-color;
    }
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-btn {
  --el-button-bg-color: rgba(0, 191, 165, 0.05);
  --el-button-text-color: #666;
  
  &:hover {
    --el-button-bg-color: rgba(0, 191, 165, 0.1);
  }
}

.company-dropdown {
  :deep(.el-dropdown-menu__item.active) {
    color: $primary-color;
    background-color: rgba(0, 191, 165, 0.08);
  }
}

.company-info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  cursor: pointer;
  background-color: rgba(0, 191, 165, 0.05);
  font-size: 13px;
  color: $sidebar-text;
  
  &:hover {
    background-color: rgba(0, 191, 165, 0.1);
  }
  
  .company-icon {
    font-size: 14px;
    color: $primary-color;
  }

  &--static {
    cursor: default;

    &:hover {
      background-color: rgba(0, 191, 165, 0.05);
    }
  }
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 20px;
  cursor: pointer;
  background-color: rgba(0, 191, 165, 0.05);
  
  &:hover {
    background-color: rgba(0, 191, 165, 0.1);
  }
  
  .user-name {
    font-size: 14px;
    color: $sidebar-text;
    font-weight: 500;
  }
}

.sub-menu-panel {
  position: absolute;
  left: 8px;
  top: 0;
  width: auto;
  min-width: 0;
  max-width: none;
  background-color: $panel-bg;
  border: 1px solid $panel-border;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: none;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 99;
  border-radius: 12px;
  overflow: hidden;
  
  &.show {
    display: flex;
  }
  
  .panel-content {
    padding: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    overflow-y: auto;
    align-content: flex-start;
  }
  
  .category {
    width: calc(50% - 6px);
    min-width: 160px;
    
    .category-title {
      font-size: 13px;
      font-weight: 600;
      color: $sidebar-text;
      padding: 8px 12px;
      margin-bottom: 4px;
      border-radius: 8px;
      background-color: rgba(0, 191, 165, 0.08);
      cursor: default;
      transition: all 0.2s;
      
      &:hover {
        background-color: rgba(0, 191, 165, 0.15);
        color: $primary-color;
      }
    }
    
    .category-items {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .sub-item {
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      color: $sidebar-text-secondary;
      font-size: 12px;
      transition: all 0.15s;
      
      &:hover {
        background-color: rgba(0, 191, 165, 0.08);
        color: $primary-color;
      }
      
      &.active {
        background-color: rgba(0, 191, 165, 0.15);
        color: $primary-color;
        font-weight: 500;
      }
    }
  }
}

.main-content {
  background-color: $light-bg;
  padding: 12px;
  overflow-y: auto;
  flex: 1;
}
</style>
