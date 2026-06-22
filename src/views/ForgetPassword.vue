<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()

const step = ref(1)
const phone = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const countdown = ref(0)

const phonePattern = /^1[3-9]\d{9}$/

const handleGetCode = () => {
  if (!phone.value) {
    ElMessage.warning('请输入手机号')
    return
  }
  if (!phonePattern.test(phone.value)) {
    ElMessage.warning('请输入正确的手机号')
    return
  }
  
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
  
  ElMessage.success('验证码已发送，请注意查收')
}

const handleVerifyCode = () => {
  if (!phone.value) {
    ElMessage.warning('请输入手机号')
    return
  }
  if (!phonePattern.test(phone.value)) {
    ElMessage.warning('请输入正确的手机号')
    return
  }
  if (!code.value) {
    ElMessage.warning('请输入验证码')
    return
  }
  
  step.value = 2
  ElMessage.success('验证码验证通过')
}

const handleResetPassword = () => {
  if (!newPassword.value) {
    ElMessage.warning('请输入新密码')
    return
  }
  if (newPassword.value.length < 6) {
    ElMessage.warning('密码长度不能少于6位')
    return
  }
  if (!confirmPassword.value) {
    ElMessage.warning('请确认新密码')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  
  step.value = 3
  ElMessage.success('密码重置成功')
}

const handleBackToLogin = () => {
  router.push('/login')
}

const getCountdownText = () => {
  if (countdown.value > 0) {
    return `${countdown.value}秒后重新获取`
  }
  return '获取验证码'
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
      
      <div class="forget-form">
        <div class="step-indicator">
          <div class="step-item" :class="{ active: step >= 1, completed: step > 1 }">
            <span class="step-number">1</span>
            <span class="step-label">输入手机号</span>
          </div>
          <div class="step-line" :class="{ active: step > 1 }"></div>
          <div class="step-item" :class="{ active: step >= 2, completed: step > 2 }">
            <span class="step-number">2</span>
            <span class="step-label">验证短信</span>
          </div>
          <div class="step-line" :class="{ active: step > 2 }"></div>
          <div class="step-item" :class="{ active: step >= 3 }">
            <span class="step-number">3</span>
            <span class="step-label">重置密码</span>
          </div>
        </div>
        
        <template v-if="step === 1">
          <h2>忘记密码</h2>
          <p class="form-desc">请输入您注册时使用的手机号，我们将发送验证码到您的手机</p>
          <el-form :model="{ phone }" class="form">
            <el-form-item label="手机号" required>
              <el-input 
                v-model="phone" 
                placeholder="请输入手机号" 
                maxlength="11"
                class="input-full"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" class="submit-btn" @click="handleGetCode">获取验证码</el-button>
            </el-form-item>
          </el-form>
        </template>
        
        <template v-else-if="step === 2">
          <h2>验证短信</h2>
          <p class="form-desc">验证码已发送至 {{ phone }}，请输入收到的验证码</p>
          <el-form :model="{ code }" class="form">
            <el-form-item label="验证码" required>
              <el-input 
                v-model="code" 
                placeholder="请输入验证码" 
                maxlength="6"
                class="input-full"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" class="submit-btn" @click="handleVerifyCode">验证验证码</el-button>
              <el-button class="secondary-btn" @click="handleGetCode" :disabled="countdown > 0">
                {{ getCountdownText() }}
              </el-button>
            </el-form-item>
          </el-form>
        </template>
        
        <template v-else-if="step === 3">
          <div class="success-card">
            <div class="success-icon">
              <svg viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="30" fill="#00bfa5"/>
                <path d="M20 32l10 10L44 22" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h2>密码重置成功</h2>
            <p class="success-desc">您的密码已成功重置，请使用新密码登录</p>
            <el-button type="primary" class="submit-btn" @click="handleBackToLogin">返回登录</el-button>
          </div>
        </template>
        
        <div class="form-footer" v-if="step < 3">
          <span class="link-text" @click="handleBackToLogin">返回登录</span>
        </div>
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
  width: 480px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.logo {
  .logo-icon {
    width: 60px;
    height: 60px;
    margin: 0 auto 12px;
  }
  
  h1 {
    font-size: 24px;
    font-weight: 700;
    color: #1D2939;
    margin: 0 0 6px;
  }
  
  p {
    font-size: 13px;
    color: #666;
    margin: 0;
  }
}

.step-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 24px;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  
  .step-number {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #E5E7EB;
    color: #9CA3AF;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.3s;
  }
  
  .step-label {
    font-size: 12px;
    color: #9CA3AF;
    transition: all 0.3s;
  }
  
  &.active {
    .step-number {
      background: #00bfa5;
      color: white;
    }
    .step-label {
      color: #00bfa5;
      font-weight: 500;
    }
  }
  
  &.completed {
    .step-number {
      background: #00bfa5;
      color: white;
    }
    .step-label {
      color: #00bfa5;
    }
  }
}

.step-line {
  width: 60px;
  height: 3px;
  background: #E5E7EB;
  margin: 0 8px;
  transition: all 0.3s;
  
  &.active {
    background: #00bfa5;
  }
}

.forget-form {
  h2 {
    font-size: 20px;
    font-weight: 600;
    color: #333;
    margin: 0 0 8px;
    text-align: center;
  }
  
  .form-desc {
    font-size: 14px;
    color: #666;
    text-align: center;
    margin: 0 0 24px;
  }
}

.form {
  .submit-btn {
    width: 100%;
    height: 44px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 8px;
    background-color: #00bfa5;
    border-color: #00bfa5;
    
    &:hover {
      background-color: #00a896;
      border-color: #00a896;
    }
  }
  
  .secondary-btn {
    width: 100%;
    height: 44px;
    font-size: 16px;
    margin-top: 8px;
    border-radius: 8px;
    
    &:hover:not(:disabled) {
      background-color: #F3F4F6;
    }
  }
}

.success-card {
  text-align: center;
  
  .success-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 16px;
  }
  
  h2 {
    font-size: 24px;
    font-weight: 600;
    color: #1D2939;
    margin: 0 0 8px;
  }
  
  .success-desc {
    font-size: 14px;
    color: #666;
    margin: 0 0 24px;
  }
  
  .submit-btn {
    width: 200px;
    height: 44px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 8px;
    background-color: #00bfa5;
    border-color: #00bfa5;
    
    &:hover {
      background-color: #00a896;
      border-color: #00a896;
    }
  }
}

.form-footer {
  text-align: center;
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