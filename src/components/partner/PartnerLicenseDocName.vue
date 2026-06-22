<script setup lang="ts">
import { computed } from 'vue'
import { getPartnerDocFullName } from '@/utils/partnerLicenseDocuments'

const props = defineProps<{
  docName: string
  docNameSub?: string
  title?: string
  centered?: boolean
}>()

const fullName = computed(() => getPartnerDocFullName(props))
const tooltip = computed(() => props.title || fullName.value)
</script>

<template>
  <div class="license-doc-name" :class="{ centered }" :title="tooltip">
    <div class="name-main">{{ docName }}</div>
    <div v-if="docNameSub" class="name-sub">{{ docNameSub }}</div>
  </div>
</template>

<style lang="scss" scoped>
.license-doc-name {
  min-width: 0;

  &.centered {
    text-align: center;

    .name-main,
    .name-sub {
      text-align: center;
    }
  }
}

.name-main {
  font-size: inherit;
  font-weight: inherit;
  color: inherit;
  line-height: 1.25;
}

.name-sub {
  margin-top: 2px;
  font-size: 0.92em;
  font-weight: 500;
  color: #667085;
  line-height: 1.2;
}
</style>
