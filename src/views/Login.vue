<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { setCurrentCompany } from '@/utils/dataStore'
import { authApi } from '@/utils/api'
import { LOGIN_DEMO_ACCOUNTS, REMEMBER_USERNAME_KEY } from '@/constants/loginAccounts'
import { getRolePermissions } from '@/constants/rolePermissions'

const router = useRouter()

const loginForm = ref({
  username: '',
  password: '',
  rememberMe: false
})

onMounted(() => {
  const remembered = localStorage.getItem(REMEMBER_USERNAME_KEY)
  if (remembered) {
    loginForm.value.username = remembered
    loginForm.value.rememberMe = true
  }
})

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

  try {
    const response = await authApi.login({ username, password })

    if (response.success) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('userRole')
      localStorage.removeItem('userPermissions')
      localStorage.removeItem('currentCompanyId')

      localStorage.setItem('token', response.token)
      localStorage.setItem('userRole', response.user.role)
      localStorage.setItem('userPermissions', JSON.stringify(getRolePermissions(response.user.role)))
      localStorage.setItem('user', JSON.stringify(response.user))

      setCurrentCompany(response.user.companyId)
      persistRememberUsername()

      ElMessage.success(`欢迎回来，${response.user.realName || response.user.username}（${response.user.companyName}）`)

      setTimeout(() => {
        router.push('/dashboard').catch(err => {
          console.error('路由跳转失败:', err)
          window.location.href = '/dashboard'
        })
      }, 500)
    }
  } catch (error: any) {
    ElMessage.error(error.message || '登录失败')
  }
}

const handleForgotPassword = () => {
  router.push('/forget-password')
}

const handleRegister = () => {
  router.push('/register')
}

const fillDemoAccount = (account: (typeof LOGIN_DEMO_ACCOUNTS)[number]) => {
  loginForm.value.username = account.username
  loginForm.value.password = account.password
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
            <el-button type="primary" class="login-btn" @click="handleLogin">登录</el-button>
          </el-form-item>
          <div class="form-footer">
            <span class="link-text" @click="handleForgotPassword">忘记密码？</span>
            <span>|</span>
            <span class="link-text" @click="handleRegister">注册新账号</span>
          </div>
          <div class="demo-accounts">
            <p class="demo-title">演示账号（点击快速填入，仅需用户名+密码登录）</p>
            <div v-for="account in LOGIN_DEMO_ACCOUNTS" :key="account.key" class="demo-item">
              <span class="demo-label">{{ account.label }}</span>
              <el-button link type="primary" @click="fillDemoAccount(account)">
                {{ account.username }} / {{ account.password }} · {{ account.hint }}
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
