<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { setCurrentCompany } from '@/utils/dataStore'
import { authApi, checkBackendHealth } from '@/utils/api'
import { LOGIN_DEMO_ACCOUNTS, REMEMBER_USERNAME_KEY, type LoginDemoAccount } from '@/constants/loginAccounts'
import { getRolePermissions } from '@/constants/rolePermissions'
import {
  clearAuthSession,
  getAuthUser,
  isLoggedIn,
  saveAuthSession
} from '@/utils/authSession'

const router = useRouter()

const loginForm = ref({
  username: '',
  password: '',
  rememberMe: false
})

const loggingIn = ref(false)
const backendOnline = ref<boolean | null>(null)
const demoAccounts = ref<LoginDemoAccount[]>([...LOGIN_DEMO_ACCOUNTS])
const loadingDemoAccounts = ref(false)

const loggedInUser = computed(() => getAuthUser<{
  username?: string
  realName?: string
  companyName?: string
}>())

const showLoggedInHint = computed(() => isLoggedIn() && !!loggedInUser.value)

const handleSwitchAccount = () => {
  clearAuthSession()
  loginForm.value.password = ''
  ElMessage.info('已退出当前标签页登录，请重新输入账号')
}

const navigateToDashboard = () => {
  router.push('/dashboard').catch(err => {
    console.error('路由跳转失败:', err)
    window.location.href = '/dashboard'
  })
}

const handleEnterSystem = () => {
  if (!isLoggedIn()) {
    ElMessage.warning('登录已失效，请重新登录')
    return
  }
  navigateToDashboard()
}

onMounted(async () => {
  const remembered = localStorage.getItem(REMEMBER_USERNAME_KEY)
  if (remembered) {
    loginForm.value.username = remembered
    loginForm.value.rememberMe = true
  }

  backendOnline.value = await checkBackendHealth()
  await loadDemoAccounts()

  if (isLoggedIn()) {
    navigateToDashboard()
  }
})

const loadDemoAccounts = async () => {
  if (backendOnline.value === false) {
    demoAccounts.value = [...LOGIN_DEMO_ACCOUNTS]
    return
  }

  loadingDemoAccounts.value = true
  try {
    const accounts = await authApi.getLoginAccounts()
    demoAccounts.value = accounts.length > 0 ? accounts : [...LOGIN_DEMO_ACCOUNTS]
  } catch {
    demoAccounts.value = [...LOGIN_DEMO_ACCOUNTS]
  } finally {
    loadingDemoAccounts.value = false
  }
}

const persistRememberUsername = () => {
  if (loginForm.value.rememberMe) {
    localStorage.setItem(REMEMBER_USERNAME_KEY, loginForm.value.username.trim())
    return
  }
  localStorage.removeItem(REMEMBER_USERNAME_KEY)
}

const handleLogin = async () => {
  const username = loginForm.value.username.trim()
  const password = loginForm.value.password

  if (!username) {
    ElMessage.warning('请输入用户名')
    return
  }
  if (!password) {
    ElMessage.warning('请输入密码')
    return
  }

  if (backendOnline.value === false) {
    backendOnline.value = await checkBackendHealth()
    if (!backendOnline.value) {
      ElMessage.error('后端服务未启动，请在项目根目录运行 npm run dev:all')
      return
    }
  }

  loggingIn.value = true
  try {
    const response = await authApi.login({ username, password })

    if (response.success) {
      clearAuthSession()

      saveAuthSession({
        token: response.token,
        user: response.user,
        role: response.user.role,
        permissions: getRolePermissions(response.user.role),
        companyId: response.user.companyId
      })

      setCurrentCompany(response.user.companyId)
      persistRememberUsername()

      ElMessage.success(`欢迎回来，${response.user.realName || response.user.username}（${response.user.companyName}）`)
      navigateToDashboard()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    loggingIn.value = false
  }
}

const handleForgotPassword = () => {
  router.push('/forget-password')
}

const handleRegister = () => {
  router.push('/register')
}

const fillDemoAccount = (account: LoginDemoAccount) => {
  loginForm.value.username = account.username
  loginForm.value.password = account.password || ''
  ElMessage.info(`已填入${account.label}：${account.hint}`)
}
</script>

<template>
  <div class="login-container">
    <div class="login-wrapper">
      <div class="login-header">
        <div class="logo">
          <div class="logo-icon">
            <svg viewBox="0 0 120 120" fill="none">
              <rect width="120" height="120" rx="20" fill="#00bfa5"/>
              <path d="M60 15c-25 0-45 15-45 35 0 12 5 22 13 28L60 105l32-27c8-6 13-16 13-28 0-20-20-35-45-35z" stroke="white" stroke-width="3" fill="none"/>
              <path d="M60 15L60 105M15 60L105 60" stroke="white" stroke-width="3"/>
              <text x="60" y="52" text-anchor="middle" fill="white" font-size="18" font-weight="bold">医享</text>
              <text x="60" y="78" text-anchor="middle" fill="white" font-size="18" font-weight="bold">科技</text>
            </svg>
          </div>
          <h1>医享云平台</h1>
          <p>医疗器械进销存管理系统</p>
        </div>
      </div>
      <div class="login-form">
        <h2>用户登录</h2>
        <el-alert
          v-if="backendOnline === false"
          type="warning"
          :closable="false"
          show-icon
          class="logged-in-alert"
          title="后端服务未启动"
          description="请在项目根目录打开终端，运行 npm run dev:all 后再登录。"
        />
        <el-alert
          v-else-if="backendOnline === true"
          type="success"
          :closable="false"
          show-icon
          class="logged-in-alert"
          title="服务已就绪"
          description="前端 http://localhost:5174 · 后端 http://localhost:3006"
        />
        <el-alert
          v-if="showLoggedInHint"
          type="info"
          :closable="false"
          show-icon
          class="logged-in-alert"
          :title="`当前标签页已登录：${loggedInUser?.realName || loggedInUser?.username}（${loggedInUser?.companyName || ''}）`"
          description="每个浏览器标签页可登录不同账号。要换账号请先点「切换账号」，或直接新开一个标签页登录另一个演示账号。"
        />
        <div v-if="showLoggedInHint" class="logged-in-actions">
          <el-button type="primary" @click="handleEnterSystem">进入系统</el-button>
          <el-button @click="handleSwitchAccount">切换账号</el-button>
        </div>
        <el-form :model="loginForm" class="form" @submit.prevent="handleLogin">
          <el-form-item label="用户名">
            <el-input v-model="loginForm.username" placeholder="请输入用户名" class="input-full" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              class="input-full"
              show-password
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          <el-form-item>
            <el-checkbox v-model="loginForm.rememberMe">记住我</el-checkbox>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" class="login-btn" :loading="loggingIn" @click="handleLogin">
              {{ loggingIn ? '登录中...' : '登录' }}
            </el-button>
          </el-form-item>
          <div class="form-footer">
            <span class="link-text" @click="handleForgotPassword">忘记密码？</span>
            <span>|</span>
            <span class="link-text" @click="handleRegister">注册新账号</span>
          </div>
          <div class="demo-accounts">
            <p class="demo-title">
              快捷登录账号（来自后台「登录账号设定」，点击快速填入）
            </p>
            <div v-if="loadingDemoAccounts" class="demo-loading">正在加载账号列表...</div>
            <div v-else-if="demoAccounts.length === 0" class="demo-loading">暂无可用登录账号</div>
            <div v-for="account in demoAccounts" :key="account.key" class="demo-item">
              <span class="demo-label">{{ account.label }}</span>
              <el-button link type="primary" @click="fillDemoAccount(account)">
                {{ account.username }}<template v-if="account.password"> / {{ account.password }}</template> · {{ account.hint }}
              </el-button>
            </div>
          </div>
        </el-form>
      </div>
      <div class="login-footer">
        <p>© 2024 医享云平台 - 医疗器械进销存管理系统</p>
        <p>GSP规范认证 · 三方协同管理</p>
      </div>
    </div>
    <div class="login-bg">
      <div class="bg-decoration"></div>
      <div class="bg-decoration bg-2"></div>
      <div class="bg-decoration bg-3"></div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #004D40 0%, #00796B 50%, #00bfa5 100%);
  position: relative;
  overflow: hidden;
}

.login-wrapper {
  z-index: 10;
  background: #fff;
  border-radius: 20px;
  padding: 40px;
  width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.logo {
  .logo-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 16px;
  }
  
  h1 {
    font-size: 28px;
    font-weight: 700;
    color: #1D2939;
    margin: 0 0 8px;
  }
  
  p {
    font-size: 14px;
    color: #666;
    margin: 0;
  }
}

.login-form {
  h2 {
    font-size: 20px;
    font-weight: 600;
    color: #333;
    margin: 0 0 24px;
    text-align: center;
  }
}

.form {
  .login-btn {
    width: 100%;
    height: 48px;
    font-size: 18px;
    font-weight: 600;
    border-radius: 8px;
    background-color: #00bfa5;
    border-color: #00bfa5;
    
    &:hover {
      background-color: #00a896;
      border-color: #00a896;
    }
    
    &:active {
      background-color: #009688;
      border-color: #009688;
    }
  }
}

.demo-accounts {
  margin-top: 8px;
}

.logged-in-alert {
  margin-bottom: 12px;
}

.logged-in-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.demo-accounts {
  margin-top: 20px;
  padding: 14px 16px;
  background: #f5fafa;
  border: 1px solid #e0f2f1;
  border-radius: 8px;

  .demo-title {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 600;
    color: #00695c;
  }

  .demo-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .demo-label {
    flex-shrink: 0;
    width: 56px;
    font-size: 12px;
    color: #666;
  }

  .demo-loading {
    font-size: 12px;
    color: #888;
  }
}

.form-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  
  .link-text {
    color: #00897b;
    text-decoration: none;
    font-size: 14px;
    cursor: pointer;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  span {
    color: #ccc;
  }
}

.login-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #eee;
  
  p {
    font-size: 12px;
    color: #999;
    margin: 4px 0;
  }
}

.login-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.bg-decoration {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  
  &.bg-2 {
    width: 400px;
    height: 400px;
    top: 20%;
    right: 10%;
  }
  
  &.bg-3 {
    width: 300px;
    height: 300px;
    bottom: 20%;
    left: 10%;
  }
}
</style>
