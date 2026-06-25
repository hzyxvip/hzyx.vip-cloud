<script setup lang="ts">
import { useRouter } from 'vue-router'
import { clearAuthSession, getAuthToken } from '@/utils/authSession'
import { elementPlusZhCn } from '@/utils/localeSetup'
import { applyTableAppearanceSettings } from '@/utils/tableAppearanceSettings'

applyTableAppearanceSettings()

const router = useRouter()

router.beforeEach((to, from, next) => {
  const token = getAuthToken()
  const publicPaths = ['/login', '/register', '/forget-password']

  if (token && to.path === '/login') {
    next('/dashboard')
    return
  }

  if (!token && !publicPaths.includes(to.path)) {
    next('/login')
    return
  }

  next()
})
</script>

<template>
  <el-config-provider :locale="elementPlusZhCn">
    <router-view />
  </el-config-provider>
</template>