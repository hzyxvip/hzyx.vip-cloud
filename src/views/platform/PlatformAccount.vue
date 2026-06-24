<script setup lang="ts">
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { companyApi, userApi } from '@/utils/api'
import type { Company, User } from '@/utils/dataStore'
import { getSeedLoginPassword } from '@/constants/loginAccounts'
import { getCompanyTypeLabel } from '@/utils/platformCustomerStore'
import { getAuthCompanyId, getAuthUser, isLoggedIn } from '@/utils/authSession'
import { isPlatformOperator } from '@/utils/customerProductService'
import {
  calculateExpiresAt,
  isAccountExpired,
  isExpiringThisMonth,
  isExpiringWithinThreeMonths,
  isExpiringWithinTwoMonths,
  matchAccountExpiryFilter,
  todayYmd,
  type AccountExpiryFilter
} from '@/utils/accountValidity'
import { useTableStyle } from '@/composables/useTableStyle'
import '@/styles/data-list-table.scss'

type AccountRow = User & {
  companyName: string
  companyTypeLabel: string
  displayLoginPassword: string
}

const ROLE_OPTIONS = [
  { label: '系统管理员', value: 'admin' },
  { label: '平台管理员', value: 'platform_admin' },
  { label: '企业管理员', value: 'company_admin' }
]

const DEFAULT_VALIDITY_YEARS = 1

const COMPANY_TYPE_FILTER_OPTIONS = [
  { label: '全部', value: '' },
  { label: '平台', value: 'platform' },
  { label: '生产企业', value: 'manufacturer' },
  { label: '经营公司', value: 'distributor' },
  { label: '医院', value: 'hospital' }
]

const EXPIRY_FILTER_OPTIONS: { label: string; value: AccountExpiryFilter }[] = [
  { label: '全部', value: '' },
  { label: '当月到期', value: 'thisMonth' },
  { label: '两月到期', value: 'twoMonths' },
  { label: '三个月到期', value: 'threeMonths' }
]

const ROLE_LABELS: Record<string, string> = {
  admin: '系统管理员',
  platform_admin: '平台管理员',
  company_admin: '企业管理员'
}

const ACCOUNT_COLUMNS = [
  { key: 'id', label: '编号', defaultWidth: 72, align: 'center' as const },
  { key: 'username', label: '用户名', defaultWidth: 110 },
  { key: 'realName', label: '姓名', defaultWidth: 100 },
  { key: 'password', label: '密码', defaultWidth: 100 },
  { key: 'companyName', label: '所属企业', defaultWidth: 160 },
  { key: 'companyTypeLabel', label: '企业类型', defaultWidth: 100, align: 'center' as const },
  { key: 'role', label: '角色', defaultWidth: 100, align: 'center' as const },
  { key: 'enabledAt', label: '启用时间', defaultWidth: 112, align: 'center' as const },
  { key: 'validityYears', label: '有效期(年)', defaultWidth: 96, align: 'center' as const },
  { key: 'expiresAt', label: '到期时间', defaultWidth: 112, align: 'center' as const },
  { key: 'expireThisMonth', label: '当月到期', defaultWidth: 88, align: 'center' as const },
  { key: 'expireTwoMonths', label: '两月到期', defaultWidth: 88, align: 'center' as const },
  { key: 'expireThreeMonths', label: '三个月到期', defaultWidth: 100, align: 'center' as const },
  { key: 'status', label: '状态', defaultWidth: 88, align: 'center' as const },
  { key: 'showOnLogin', label: '登录页', defaultWidth: 88, align: 'center' as const }
]

const { columnWidths, handleHeaderDragend } = useTableStyle('platform-account', ACCOUNT_COLUMNS)

const route = useRoute()

const pageTitle = computed(() =>
  route.path.startsWith('/system/account') ? '账号设定' : '登录账号设定'
)

const canManageAllCompanies = computed(() => isPlatformOperator())

const loading = ref(false)
const loadError = ref('')
const tableData = ref<AccountRow[]>([])
const companies = ref<Company[]>([])
const selectedRow = ref<AccountRow | null>(null)

const searchForm = reactive({
  keyword: '',
  companyType: '',
  expiryFilter: '' as AccountExpiryFilter
})

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const passwordDialogVisible = ref(false)

const accountForm = reactive({
  id: 0,
  username: '',
  password: '',
  realName: '',
  companyId: null as number | null,
  role: 'company_admin',
  status: '启用',
  showOnLogin: false,
  loginHintPassword: '',
  enabledAt: todayYmd(),
  validityYears: DEFAULT_VALIDITY_YEARS,
  expiresAt: ''
})

const passwordForm = reactive({
  password: '',
  confirmPassword: ''
})

const syncExpiresAt = () => {
  if (accountForm.enabledAt && accountForm.validityYears) {
    accountForm.expiresAt = calculateExpiresAt(accountForm.enabledAt, accountForm.validityYears)
  }
}

watch(
  () => [accountForm.enabledAt, accountForm.validityYears],
  () => syncExpiresAt()
)

const dialogTitle = computed(() => (dialogMode.value === 'create' ? '新增账号' : '编辑账号'))

const filteredTableData = computed(() => {
  const keyword = searchForm.keyword.trim().toLowerCase()
  return tableData.value.filter(row => {
    const matchKeyword = !keyword
      || row.username.toLowerCase().includes(keyword)
      || row.realName.toLowerCase().includes(keyword)
      || row.companyName.toLowerCase().includes(keyword)

    const companyType = row.company?.companyType || ''
    const matchType = !searchForm.companyType || companyType === searchForm.companyType
    const matchExpiry = matchAccountExpiryFilter(searchForm.expiryFilter, row.expiresAt)

    return matchKeyword && matchType && matchExpiry
  })
})

const getCurrentUserId = () => {
  const user = getAuthUser<{ id?: number }>()
  return Number(user?.id) || 0
}

const mapUserRow = (user: User): AccountRow => {
  const companyType = user.company?.companyType || ''
  const displayLoginPassword = user.loginHintPassword || getSeedLoginPassword(user.username) || '—'
  return {
    ...user,
    companyName: user.company?.name || '-',
    companyTypeLabel: companyType === 'platform' ? '平台' : getCompanyTypeLabel(companyType),
    displayLoginPassword
  }
}

const loadAccounts = async () => {
  loading.value = true
  loadError.value = ''
  try {
    if (!isLoggedIn()) {
      loadError.value = '未登录或登录已过期，请重新登录后再查看账号列表'
      tableData.value = []
      return
    }

    const users = await userApi.getAll()
    if (!Array.isArray(users)) {
      throw new Error('账号列表数据格式异常')
    }
    tableData.value = users.map(mapUserRow)
    if (tableData.value.length === 0) {
      loadError.value = '暂无账号，请在后端执行 npm run seed 初始化预设账号，或点击右上角「新增账号」'
    }
  } catch (error: any) {
    loadError.value = error.message || '加载账号列表失败'
    tableData.value = []
    ElMessage.error(loadError.value)
  } finally {
    loading.value = false
  }
}

const loadCompanies = async () => {
  try {
    if (canManageAllCompanies.value) {
      companies.value = await companyApi.getAll()
      return
    }

    const companyId = getAuthCompanyId()
    if (companyId) {
      companies.value = [await companyApi.getById(companyId)]
    }
  } catch (error) {
    console.error('加载企业列表失败:', error)
  }
}

const resetAccountForm = () => {
  accountForm.id = 0
  accountForm.username = ''
  accountForm.password = ''
  accountForm.realName = ''
  accountForm.companyId = companies.value[0]?.id ?? getAuthCompanyId()
  accountForm.role = 'company_admin'
  accountForm.status = '启用'
  accountForm.showOnLogin = false
  accountForm.loginHintPassword = ''
  accountForm.enabledAt = todayYmd()
  accountForm.validityYears = DEFAULT_VALIDITY_YEARS
  accountForm.expiresAt = calculateExpiresAt(accountForm.enabledAt, accountForm.validityYears)
}

const handleSearch = () => {
  ElMessage.success(`已筛选 ${filteredTableData.value.length} 条账号`)
}

const handleResetSearch = () => {
  searchForm.keyword = ''
  searchForm.companyType = ''
  searchForm.expiryFilter = ''
}

const handleRowSelect = (row: AccountRow | null) => {
  selectedRow.value = row
}

const openCreateDialog = () => {
  dialogMode.value = 'create'
  resetAccountForm()
  if (!route.path.startsWith('/system/account')) {
    accountForm.showOnLogin = true
  }
  dialogVisible.value = true
}

const openEditDialog = (row?: AccountRow) => {
  const target = row || selectedRow.value
  if (!target) {
    ElMessage.warning('请先选择要编辑的账号')
    return
  }

  dialogMode.value = 'edit'
  accountForm.id = target.id
  accountForm.username = target.username
  accountForm.password = ''
  accountForm.realName = target.realName
  accountForm.companyId = target.companyId
  accountForm.role = target.role
  accountForm.status = target.status
  accountForm.showOnLogin = Boolean(target.showOnLogin)
  accountForm.loginHintPassword = target.loginHintPassword || getSeedLoginPassword(target.username)
  accountForm.enabledAt = target.enabledAt || todayYmd()
  accountForm.validityYears = target.validityYears || DEFAULT_VALIDITY_YEARS
  accountForm.expiresAt = target.expiresAt
    || calculateExpiresAt(accountForm.enabledAt, accountForm.validityYears)
  dialogVisible.value = true
}

const submitAccountForm = async () => {
  const username = accountForm.username.trim()
  const realName = accountForm.realName.trim()

  if (!username) {
    ElMessage.warning('请输入用户名')
    return
  }
  if (!realName) {
    ElMessage.warning('请输入姓名')
    return
  }
  if (!accountForm.companyId) {
    ElMessage.warning('请选择所属企业')
    return
  }
  if (accountForm.showOnLogin && !accountForm.loginHintPassword.trim() && dialogMode.value === 'create') {
    ElMessage.warning('勾选登录页展示时请填写演示密码')
    return
  }
  if (dialogMode.value === 'create' && !accountForm.password) {
    ElMessage.warning('请输入登录密码')
    return
  }
  if (dialogMode.value === 'create' && accountForm.password.length < 6) {
    ElMessage.warning('密码长度不能少于6位')
    return
  }

  try {
    const loginHintPassword = accountForm.showOnLogin
      ? accountForm.loginHintPassword.trim() || accountForm.password
      : null

    if (dialogMode.value === 'create') {
      await userApi.create({
        username,
        password: accountForm.password,
        realName,
        companyId: accountForm.companyId,
        role: accountForm.role,
        status: accountForm.status,
        showOnLogin: accountForm.showOnLogin,
        loginHintPassword,
        enabledAt: accountForm.enabledAt,
        validityYears: accountForm.validityYears,
        expiresAt: accountForm.expiresAt
      })
      ElMessage.success('账号已新增')
    } else {
      const payload: Partial<User> & { password?: string } = {
        username,
        realName,
        companyId: accountForm.companyId,
        role: accountForm.role,
        status: accountForm.status,
        showOnLogin: accountForm.showOnLogin,
        loginHintPassword,
        enabledAt: accountForm.enabledAt,
        validityYears: accountForm.validityYears,
        expiresAt: accountForm.expiresAt
      }
      if (accountForm.password) {
        if (accountForm.password.length < 6) {
          ElMessage.warning('密码长度不能少于6位')
          return
        }
        payload.password = accountForm.password
      }
      await userApi.update(accountForm.id, payload)
      ElMessage.success('账号已更新')
    }

    dialogVisible.value = false
    selectedRow.value = null
    await loadAccounts()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}

const patchAccountStatus = async (status: '启用' | '停用', row?: AccountRow) => {
  const target = row || selectedRow.value
  if (!target) {
    ElMessage.warning(`请先选择要${status === '启用' ? '启用' : '停用'}的账号`)
    return
  }

  try {
    await userApi.update(target.id, { status })
    ElMessage.success(status === '启用' ? '账号已启用' : '账号已停用')
    if (selectedRow.value?.id === target.id) {
      selectedRow.value = { ...target, status }
    }
    await loadAccounts()
  } catch (error: any) {
    ElMessage.error(error.message || `${status === '启用' ? '启用' : '停用'}失败`)
  }
}

const handleEnable = (row?: AccountRow) => patchAccountStatus('启用', row)
const handleDisable = (row?: AccountRow) => patchAccountStatus('停用', row)

const openPasswordDialog = (row?: AccountRow) => {
  const target = row || selectedRow.value
  if (!target) {
    ElMessage.warning('请先选择要修改密码的账号')
    return
  }

  selectedRow.value = target
  passwordForm.password = ''
  passwordForm.confirmPassword = ''
  passwordDialogVisible.value = true
}

const submitPasswordForm = async () => {
  if (!selectedRow.value) return

  if (!passwordForm.password) {
    ElMessage.warning('请输入新密码')
    return
  }
  if (passwordForm.password.length < 6) {
    ElMessage.warning('密码长度不能少于6位')
    return
  }
  if (passwordForm.password !== passwordForm.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }

  try {
    await userApi.update(selectedRow.value.id, { password: passwordForm.password })
    ElMessage.success('密码已修改')
    passwordDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '修改密码失败')
  }
}

const handleDelete = async (row?: AccountRow) => {
  const target = row || selectedRow.value
  if (!target) {
    ElMessage.warning('请先选择要删除的账号')
    return
  }

  if (target.id === getCurrentUserId()) {
    ElMessage.warning('不能删除当前登录账号')
    return
  }

  try {
    await ElMessageBox.confirm(
      `请谨慎删除！确定删除账号「${target.username} / ${target.realName}」吗？\n此操作不可恢复。`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }

  try {
    await userApi.delete(target.id)
    ElMessage.success('账号已删除')
    if (selectedRow.value?.id === target.id) {
      selectedRow.value = null
    }
    await loadAccounts()
  } catch (error: any) {
    ElMessage.error(error.message || '删除失败')
  }
}

onMounted(async () => {
  await loadCompanies()
  await loadAccounts()
})

onActivated(async () => {
  await loadAccounts()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1>{{ pageTitle }}</h1>
        <p class="page-desc">系统预设账号（admin / demo / factory）与新增账号均在下方列表维护</p>
      </div>
      <el-button type="primary" class="btn-teal" @click="openCreateDialog">新增账号</el-button>
    </div>

    <div class="search-card">
      <div class="search-row">
        <el-form inline class="search-form">
          <el-form-item>
            <el-input
              v-model="searchForm.keyword"
              placeholder="用户名 / 姓名 / 企业名称"
              clearable
              style="width: 260px;"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="企业类型">
            <el-select v-model="searchForm.companyType" placeholder="全部" clearable style="width: 140px;">
              <el-option
                v-for="item in COMPANY_TYPE_FILTER_OPTIONS"
                :key="item.value || 'all'"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="到期筛选">
            <el-select v-model="searchForm.expiryFilter" placeholder="全部" clearable style="width: 140px;">
              <el-option
                v-for="item in EXPIRY_FILTER_OPTIONS"
                :key="item.value || 'all'"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-form>
        <div class="button-group">
          <el-button type="primary" class="btn-teal" @click="handleSearch">查询</el-button>
          <el-button @click="loadAccounts">刷新</el-button>
          <el-button type="primary" class="btn-teal" @click="handleResetSearch">重置</el-button>
        </div>
      </div>
    </div>

    <div class="action-bar">
      <div class="action-bar-left">
        <span class="selected-text">
          已选中 <strong>{{ selectedRow ? 1 : 0 }}</strong> 条
        </span>
      </div>
      <div class="action-bar-controls">
        <el-button type="primary" link size="small" :disabled="!selectedRow" @click="handleEnable()">启用</el-button>
        <el-button type="primary" link size="small" :disabled="!selectedRow" @click="handleDisable()">停用</el-button>
        <el-button type="primary" link size="small" :disabled="!selectedRow" @click="openEditDialog()">修改</el-button>
        <el-button type="primary" link size="small" :disabled="!selectedRow" @click="openPasswordDialog()">修改密码</el-button>
        <el-button type="danger" link size="small" class="btn-delete-link" :disabled="!selectedRow" @click="handleDelete()">删除</el-button>
      </div>
    </div>

    <div class="table-card data-list-table-card">
      <div class="table-scroll">
        <el-table
          v-loading="loading"
          :data="filteredTableData"
          class="common-table"
          border
          size="small"
          :fit="false"
          highlight-current-row
          @header-dragend="handleHeaderDragend"
          @current-change="handleRowSelect"
        >
          <el-table-column prop="id" label="编号" :width="columnWidths.id" align="center" />
          <el-table-column prop="username" label="用户名" :width="columnWidths.username" show-overflow-tooltip />
          <el-table-column prop="realName" label="姓名" :width="columnWidths.realName" show-overflow-tooltip />
          <el-table-column label="密码" :width="columnWidths.password">
            <template #default="{ row }">
              {{ row.displayLoginPassword }}
            </template>
          </el-table-column>
          <el-table-column prop="companyName" label="所属企业" :width="columnWidths.companyName" show-overflow-tooltip />
          <el-table-column prop="companyTypeLabel" label="企业类型" :width="columnWidths.companyTypeLabel" align="center" />
          <el-table-column label="角色" :width="columnWidths.role" align="center">
            <template #default="{ row }">
              {{ ROLE_LABELS[row.role] || row.role }}
            </template>
          </el-table-column>
          <el-table-column label="启用时间" :width="columnWidths.enabledAt" align="center">
            <template #default="{ row }">
              {{ row.enabledAt || '—' }}
            </template>
          </el-table-column>
          <el-table-column label="有效期(年)" :width="columnWidths.validityYears" align="center">
            <template #default="{ row }">
              {{ row.validityYears ?? '—' }}
            </template>
          </el-table-column>
          <el-table-column label="到期时间" :width="columnWidths.expiresAt" align="center">
            <template #default="{ row }">
              <span :class="{ 'is-expired': isAccountExpired(row.expiresAt) }">
                {{ row.expiresAt || '—' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="当月到期" :width="columnWidths.expireThisMonth" align="center">
            <template #default="{ row }">
              <el-tag v-if="isExpiringThisMonth(row.expiresAt)" type="danger" size="small">是</el-tag>
              <span v-else class="cell-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="两月到期" :width="columnWidths.expireTwoMonths" align="center">
            <template #default="{ row }">
              <el-tag v-if="isExpiringWithinTwoMonths(row.expiresAt)" type="warning" size="small">是</el-tag>
              <span v-else class="cell-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="三个月到期" :width="columnWidths.expireThreeMonths" align="center">
            <template #default="{ row }">
              <el-tag v-if="isExpiringWithinThreeMonths(row.expiresAt)" type="info" size="small">是</el-tag>
              <span v-else class="cell-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" :width="columnWidths.status" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="row.status === '启用' ? 'success' : 'warning'">
                {{ row.status === '启用' ? '正常' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="登录页" :width="columnWidths.showOnLogin" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="row.showOnLogin ? 'success' : 'info'">
                {{ row.showOnLogin ? '展示' : '隐藏' }}
              </el-tag>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty :description="loadError || '暂无账号数据'">
              <el-button type="primary" class="btn-teal" @click="loadAccounts">重新加载</el-button>
            </el-empty>
          </template>
        </el-table>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" destroy-on-close>
      <el-form label-width="96px">
        <el-form-item label="用户名" required>
          <el-input v-model="accountForm.username" placeholder="登录用户名" maxlength="50" />
        </el-form-item>
        <el-form-item :label="dialogMode === 'create' ? '登录密码' : '新密码'" :required="dialogMode === 'create'">
          <el-input
            v-model="accountForm.password"
            type="password"
            show-password
            :placeholder="dialogMode === 'create' ? '至少6位' : '留空则不修改'"
          />
        </el-form-item>
        <el-form-item label="姓名" required>
          <el-input v-model="accountForm.realName" placeholder="真实姓名" maxlength="50" />
        </el-form-item>
        <el-form-item label="所属企业" required>
          <el-select
            v-model="accountForm.companyId"
            placeholder="请选择企业"
            style="width: 100%;"
            :disabled="!canManageAllCompanies"
          >
            <el-option
              v-for="company in companies"
              :key="company.id"
              :label="company.name"
              :value="company.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="accountForm.role" style="width: 100%;">
            <el-option
              v-for="item in ROLE_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="启用时间" required>
          <el-date-picker
            v-model="accountForm.enabledAt"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择启用日期"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="有效期(年)" required>
          <el-input-number v-model="accountForm.validityYears" :min="1" :max="99" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="到期时间">
          <el-input v-model="accountForm.expiresAt" readonly placeholder="根据启用时间与有效期自动计算" />
        </el-form-item>
        <el-form-item label="当前状态">
          <el-tag :type="accountForm.status === '启用' ? 'success' : 'warning'">
            {{ accountForm.status === '启用' ? '启用' : '停用' }}
          </el-tag>
          <span class="status-tip">请使用上方操作栏进行启用/停用</span>
        </el-form-item>
        <el-form-item label="登录页展示">
          <el-switch v-model="accountForm.showOnLogin" active-text="展示" inactive-text="隐藏" />
        </el-form-item>
        <el-form-item v-if="accountForm.showOnLogin" label="演示密码">
          <el-input
            v-model="accountForm.loginHintPassword"
            type="password"
            show-password
            :placeholder="dialogMode === 'create' ? '登录页快捷填入用，默认同登录密码' : '留空则不在登录页展示密码'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAccountForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="passwordDialogVisible" title="修改密码" width="420px" destroy-on-close>
      <el-form label-width="96px">
        <el-form-item label="账号">
          <span>{{ selectedRow?.username }} / {{ selectedRow?.realName }}</span>
        </el-form-item>
        <el-form-item label="新密码" required>
          <el-input v-model="passwordForm.password" type="password" show-password placeholder="至少6位" />
        </el-form-item>
        <el-form-item label="确认密码" required>
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPasswordForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.page-container {
  padding: 16px 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.btn-teal {
  --el-button-bg-color: #00bfa5;
  --el-button-border-color: #00bfa5;
  --el-button-hover-bg-color: #00a896;
  --el-button-hover-border-color: #00a896;
  --el-button-active-bg-color: #008f7a;
  --el-button-active-border-color: #008f7a;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;

  h1 {
    font-size: 22px;
    font-weight: 600;
    margin: 0 0 4px;
    color: #1d2939;
  }

  .page-desc {
    margin: 0;
    font-size: 13px;
    color: #667085;
  }
}

.search-card {
  background: #fff;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);

  .search-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .search-form {
    flex: 1;

    :deep(.el-form-item) {
      margin-bottom: 8px;
      margin-right: 12px;
    }
  }

  .button-group {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  background: #fff;
  padding: 10px 16px;
  margin-bottom: 12px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.action-bar-left {
  flex-shrink: 0;

  .selected-text {
    font-size: 13px;
    color: #667085;

    strong {
      color: #00bfa5;
      font-weight: 600;
    }
  }
}

.action-bar-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  flex: 1;

  :deep(.el-button.is-link) {
    padding: 4px 8px;
    color: #344054;
    font-size: 13px;

    &:hover:not(.is-disabled) {
      color: #00bfa5;
    }
  }

  .btn-delete-link {
    color: #f56c6c !important;

    &:hover:not(.is-disabled),
    &:focus:not(.is-disabled) {
      color: #f89898 !important;
    }
  }
}

.table-card {
  background: #fff;
  border-radius: 4px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.table-scroll {
  overflow-x: auto;
}

.is-expired {
  color: #d32f2f;
  font-weight: 600;
}

.cell-muted {
  color: #bbb;
}

.status-tip {
  margin-left: 10px;
  font-size: 12px;
  color: #999;
}
</style>
