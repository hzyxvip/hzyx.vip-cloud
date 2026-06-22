<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const formRef = ref()

const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  companyName: '',
  companyType: '',
  contactName: '',
  contactPhone: '',
  email: '',
  creditCode: '',
  licenseNo: '',
  address: ''
})

const companyTypes = [
  { label: '生产企业', value: 'manufacturer' },
  { label: '经营公司', value: 'distributor' },
  { label: '医院', value: 'hospital' }
]

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度3-50个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' }
  ],
  companyType: [
    { required: true, message: '请选择企业类型', trigger: 'change' }
  ],
  companyName: [
    { required: true, message: '请输入企业名称', trigger: 'blur' }
  ],
  contactName: [
    { required: true, message: '请输入联系人', trigger: 'blur' }
  ],
  contactPhone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ]
}

const handleRegister = () => {
  formRef.value.validate((valid: boolean) => {
    if (!valid) return
    
    if (registerForm.password !== registerForm.confirmPassword) {
      ElMessage.error('两次输入的密码不一致')
      return
    }
    
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userPermissions')
    localStorage.removeItem('currentCompanyId')

    ElMessage.success('注册信息已提交，请等待审核。演示环境请使用登录页演示账号。')
    router.push('/login')
  })
}

const handleBack = () => {
  router.push('/login')
}
</script>

<template>
  <div class="register-container">
    <div class="register-wrapper">
      <div class="register-header">
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
      <div class="register-form">
        <h2>用户注册</h2>
        <el-form ref="formRef" :model="registerForm" :rules="rules" label-width="100px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="用户名" prop="username">
                <el-input v-model="registerForm.username" placeholder="请输入用户名" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="密码" prop="password">
                <el-input v-model="registerForm.password" type="password" placeholder="请输入密码" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input v-model="registerForm.confirmPassword" type="password" placeholder="请再次输入密码" />
          </el-form-item>
          
          <el-form-item label="企业类型" prop="companyType">
            <el-select v-model="registerForm.companyType" placeholder="请选择企业类型">
              <el-option v-for="type in companyTypes" :key="type.value" :label="type.label" :value="type.value" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="企业名称" prop="companyName">
            <el-input v-model="registerForm.companyName" placeholder="请输入企业全称" />
          </el-form-item>
          
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="联系人" prop="contactName">
                <el-input v-model="registerForm.contactName" placeholder="请输入联系人姓名" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系电话" prop="contactPhone">
                <el-input v-model="registerForm.contactPhone" placeholder="请输入联系电话" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="registerForm.email" placeholder="请输入邮箱地址" />
          </el-form-item>
          
          <el-form-item label="统一社会信用代码">
            <el-input v-model="registerForm.creditCode" placeholder="选填" />
          </el-form-item>
          
          <el-form-item label="许可证号">
            <el-input v-model="registerForm.licenseNo" placeholder="生产/经营许可证号" />
          </el-form-item>
          
          <el-form-item label="企业地址">
            <el-input v-model="registerForm.address" type="textarea" placeholder="请输入企业地址" :rows="2" />
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" class="register-btn" @click="handleRegister">注册</el-button>
            <el-button class="back-btn" @click="handleBack">返回登录</el-button>
          </el-form-item>
        </el-form>
      </div>
      <div class="register-footer">
        <p>© 2024 医享云平台 - 医疗器械进销存管理系统</p>
        <p>GSP规范认证 · 三方协同管理</p>
      </div>
    </div>
    <div class="register-bg">
      <div class="bg-decoration"></div>
      <div class="bg-decoration bg-2"></div>
      <div class="bg-decoration bg-3"></div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #004D40 0%, #00796B 50%, #00bfa5 100%);
  position: relative;
  overflow: hidden;
}

.register-wrapper {
  z-index: 10;
  background: #fff;
  border-radius: 20px;
  padding: 40px;
  width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.register-header {
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

.register-form {
  h2 {
    font-size: 20px;
    font-weight: 600;
    color: #333;
    margin: 0 0 24px;
    text-align: center;
  }
}

.register-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  border-radius: 8px;
}

.back-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  border-radius: 8px;
  margin-top: 12px;
  color: #667085;
  border-color: #CBD5E1;
  
  &:hover {
    color: #00bfa5;
    border-color: #00bfa5;
  }
}

.register-footer {
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

.register-bg {
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