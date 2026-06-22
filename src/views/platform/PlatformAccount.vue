<script setup lang="ts">
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { companyApi, userApi } from '@/utils/api'
import type { Company, User } from '@/utils/dataStore'
import { getCompanyTypeLabel } from '@/utils/platformCustomerStore'

type AccountRow = User & {
  companyName: string
  companyTypeLabel: string
}

const ROLE_OPTIONS = [
  { label: '系统管理员', value: 'admin' },
  { label: '平台管理员', value: 'platform_admin' },
  { label: '企业管理员', value: 'company_admin' }
]

const STATUS_OPTIONS = [
  { label: '启用', value: '启用' },
  { label: '停用', value: '停用' }
]

const COMPANY_TYPE_FILTER_OPTIONS = [
  { label: '全部', value: '' },
  { label: '平台', value: 'platform' },
  { label: '生产企业', value: 'manufacturer' },
  { label: '经营公司', value: 'distributor' },
  { label: '医院', value: 'hospital' }
]

const ROLE_LABELS: Record<string, string> = {
  admin: '系统管理员',
  platform_admin: '平台管理员',
  company_admin: '企业管理员'
}

const loading = ref(false)
const loadError = ref('')
const tableData = ref<AccountRow[]>([])
const companies = ref<Company[]>([])
const selectedRow = ref<AccountRow | null>(null)

const searchForm = reactive({
  keyword: '',
  companyType: ''
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
  status: '启用'
})

const passwordForm = reactive({
  password: '',
  confirmPassword: ''
})

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

    return matchKeyword && matchType
  })
})

const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return Number(user.id) || 0
  } catch {
    return 0
  }
}

const mapUserRow = (user: User): AccountRow => {
  const companyType = user.company?.companyType || ''
  return {
    ...user,
    companyName: user.company?.name || '-',
    companyTypeLabel: companyType === 'platform' ? '平台' : getCompanyTypeLabel(companyType)
  }
}

const loadAccounts = async () => {
  loading.value = true
  loadError.value = ''
  try {
    if (!localStorage.getItem('token')) {
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
      loadError.value = '暂无账号，可点击右上角「新增账号」创建'
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
    companies.value = await companyApi.getAll()
  } catch (error) {
    console.error('加载企业列表失败:', error)
  }
}

const resetAccountForm = () => {
  accountForm.id = 0
  accountForm.username = ''
  accountForm.password = ''
  accountForm.realName = ''
  accountForm.companyId = companies.value[0]?.id ?? null
  accountForm.role = 'company_admin'
  accountForm.status = '启用'
}

const handleSearch = () => {
  ElMessage.success(`已筛选 ${filteredTableData.value.length} 条账号`)
}

const handleResetSearch = () => {
  searchForm.keyword = ''
  searchForm.companyType = ''
}

const handleRowSelect = (row: AccountRow | null) => {
  selectedRow.value = row
}

const openCreateDialog = () => {
  dialogMode.value = 'create'
  resetAccountForm()
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
  if (dialogMode.value === 'create' && !accountForm.password) {
    ElMessage.warning('请输入登录密码')
    return
  }
  if (dialogMode.value === 'create' && accountForm.password.length < 6) {
    ElMessage.warning('密码长度不能少于6位')
    return
  }

  try {
    if (dialogMode.value === 'create') {
      await userApi.create({
        username,
        password: accountForm.password,
        realName,
        companyId: accountForm.companyId,
        role: accountForm.role,
        status: accountForm.status
      })
      ElMessage.success('账号已新增')
    } else {
      const payload: Partial<User> & { password?: string } = {
        username,
        realName,
        companyId: accountForm.companyId,
        role: accountForm.role,
        status: accountForm.status
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
      <h1>登录账号设定</h1>
      <el-button type="primary" @click="openCreateDialog">新增账号</el-button>
    </div>

    <div class="search-form">
      <el-input
        v-model="searchForm.keyword"
        placeholder="用户名 / 姓名 / 企业名称"
        clearable
        style="width: 240px;"
        @keyup.enter="handleSearch"
      />
      <el-select v-model="searchForm.companyType" placeholder="企业类型" clearable style="width: 150px;">
        <el-option
          v-for="item in COMPANY_TYPE_FILTER_OPTIONS"
          :key="item.value || 'all'"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button @click="handleResetSearch">重置</el-button>
      <el-button link type="primary" @click="loadAccounts">刷新列表</el-button>
    </div>

    <div class="toolbar">
      <el-button size="small" :disabled="!selectedRow" @click="openEditDialog()">修改</el-button>
      <el-button size="small" :disabled="!selectedRow" @click="openPasswordDialog()">修改密码</el-button>
      <el-button type="danger" plain size="small" :disabled="!selectedRow" @click="handleDelete()">删除</el-button>
    </div>

    <div class="table-card">
      <el-table
        v-loading="loading"
        :data="filteredTableData"
        border
        highlight-current-row
        @current-change="handleRowSelect"
      >
        <el-table-column prop="id" label="编号" width="80" />
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="realName" label="姓名" min-width="120" />
        <el-table-column prop="companyName" label="所属企业" min-width="180" />
        <el-table-column prop="companyTypeLabel" label="企业类型" width="110" />
        <el-table-column label="角色" width="120">
          <template #default="{ row }">
            {{ ROLE_LABELS[row.role] || row.role }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === '启用' ? 'success' : 'warning'">
              {{ row.status === '启用' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openPasswordDialog(row)">修改密码</el-button>
            <el-button type="primary" link size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="loadError || '暂无账号数据'">
            <el-button type="primary" @click="loadAccounts">重新加载</el-button>
          </el-empty>
        </template>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px" destroy-on-close>
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
          <el-select v-model="accountForm.companyId" placeholder="请选择企业" style="width: 100%;">
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
        <el-form-item label="状态" required>
          <el-select v-model="accountForm.status" style="width: 100%;">
            <el-option
              v-for="item in STATUS_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
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
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h1 {
    font-size: 22px;
    font-weight: 600;
    margin: 0;
  }
}

.search-form {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 12px;
}

.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.table-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
</style>
