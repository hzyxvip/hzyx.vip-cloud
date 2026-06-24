<script setup lang="ts">
import { computed } from 'vue'
import { isPlatformVipCustomer, type CustomerMaster } from '@/utils/customerStore'

const props = withDefaults(
  defineProps<{
    customer: Partial<CustomerMaster>
    size?: 'small' | 'default'
    /** solid：金色底；text：仅金色 VIP 文字 */
    variant?: 'solid' | 'text'
  }>(),
  {
    size: 'small',
    variant: 'solid'
  }
)

const visible = computed(() => isPlatformVipCustomer(props.customer))
</script>

<template>
  <el-tag
    v-if="visible && variant === 'solid'"
    class="platform-vip-tag platform-vip-tag--solid"
    :size="size"
    effect="dark"
  >
    VIP
  </el-tag>
  <span v-else-if="visible" class="platform-vip-tag platform-vip-tag--text">VIP</span>
</template>

<style scoped>
.platform-vip-tag--solid {
  margin-left: 8px;
  border: none;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
  font-weight: 700;
  letter-spacing: 1px;
}

.platform-vip-tag--text {
  display: inline-block;
  color: #d97706;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
  line-height: 1;
}
</style>
