<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  
  if (!token && to.path !== '/login' && to.path !== '/register' && to.path !== '/forget-password') {
    next('/login')
  } else if (token && to.path === '/login') {
    if (from.path !== '/dashboard') {
      next('/dashboard')
    } else {
      next()
    }
  } else {
    next()
  }
})
</script>

<template>
  <router-view />
</template>