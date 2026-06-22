<script setup lang="ts">
import { computed, watch } from 'vue'
import {
  findExpiredPartnerDocuments,
  findWarningPartnerDocuments,
  getPartnerDocumentDaysLeft,
  getPartnerDocFullName,
  syncPartnerDocumentStatus
} from '@/utils/partnerLicenseDocuments'
import type { PartnerDocument } from '@/types/partnerProfile'

const props = defineProps<{
  documents: PartnerDocument[]
  readonly?: boolean
  warningMonths: number
}>()

const applyStatusSync = () => {
  const synced = syncPartnerDocumentStatus(props.documents, props.warningMonths)
  synced.forEach((doc, index) => {
    Object.assign(props.documents[index], doc)
  })
}

const warningDocuments = computed(() =>
  findWarningPartnerDocuments(props.documents, props.warningMonths)
)

const expiredDocuments = computed(() =>
  findExpiredPartnerDocuments(props.documents, props.warningMonths)
)

watch(
  () => [props.documents, props.warningMonths],
  () => applyStatusSync(),
  { deep: true, immediate: true }
)

defineExpose({ applyStatusSync })
</script>

<template>
  <div class="license-warning-panel">
    <el-alert
      v-if="expiredDocuments.length"
      type="error"
      :closable="false"
      show-icon
      class="warning-alert"
      :title="`已过期证照 ${expiredDocuments.length} 项，请尽快更新`"
    >
      <ul class="warning-list">
        <li v-for="doc in expiredDocuments" :key="doc.docKey || doc.id">
          {{ getPartnerDocFullName(doc) }}
          <span v-if="doc.docNo">（{{ doc.docNo }}）</span>
          <span class="expire-meta">到期：{{ doc.expireDate || '-' }}</span>
        </li>
      </ul>
    </el-alert>

    <el-alert
      v-if="warningDocuments.length"
      type="warning"
      :closable="false"
      show-icon
      class="warning-alert"
      :title="`效期预警 ${warningDocuments.length} 项，将在 ${warningMonths} 个月内到期`"
    >
      <ul class="warning-list">
        <li v-for="doc in warningDocuments" :key="doc.docKey || doc.id">
          {{ getPartnerDocFullName(doc) }}
          <span v-if="doc.docNo">（{{ doc.docNo }}）</span>
          <span class="expire-meta">
            剩余 {{ getPartnerDocumentDaysLeft(doc) ?? '-' }} 天，到期：{{ doc.expireDate || '-' }}
          </span>
        </li>
      </ul>
    </el-alert>
  </div>
</template>

<style lang="scss" scoped>
.license-warning-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.warning-alert {
  :deep(.el-alert__content) {
    width: 100%;
  }
}

.warning-list {
  margin: 4px 0 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.6;

  .expire-meta {
    color: #667085;
    margin-left: 4px;
  }
}
</style>
