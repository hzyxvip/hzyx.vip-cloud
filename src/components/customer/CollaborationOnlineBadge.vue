<script setup lang="ts">
import { computed } from 'vue'
import { isCustomerCollaborationEnabled } from '@/utils/platformCollaborationService'
import type { CustomerMaster } from '@/utils/customerStore'

const props = defineProps<{
  customer: Partial<CustomerMaster>
}>()

const visible = computed(() => {
  if (props.customer.collaborationEnabled === false) return false
  if (props.customer.collaborationEnabled === true) return true
  const name = String(props.customer.name || '').trim()
  if (!name) return false
  return isCustomerCollaborationEnabled(name)
})
</script>

<template>
  <el-button
    v-if="visible"
    type="primary"
    plain
    class="collab-online-btn"
    tabindex="-1"
  >
    在线协同客户
  </el-button>
</template>

<style scoped lang="scss">
.collab-online-btn {
  flex-shrink: 0;
  pointer-events: none;
  cursor: default;
  vertical-align: middle;
}
</style>
