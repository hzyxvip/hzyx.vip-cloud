<script setup lang="ts">
import { computed } from 'vue'
import { PARTNER_PROFILE_TABS } from '@/constants/partnerProfileTabs'

const props = defineProps<{
  modelValue: string
  tabs?: ReadonlyArray<{ label: string; value: string }>
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const resolvedTabs = computed(() => props.tabs ?? PARTNER_PROFILE_TABS)
</script>

<template>
  <el-tabs
    :model-value="modelValue"
    type="card"
    class="partner-profile-tabs"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <el-tab-pane
      v-for="tab in resolvedTabs"
      :key="tab.value"
      :label="tab.label"
      :name="tab.value"
      lazy
    >
      <div class="partner-profile-pane">
        <slot :name="tab.value" />
      </div>
    </el-tab-pane>
  </el-tabs>
</template>

<style lang="scss" scoped>
.partner-profile-tabs {
  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }

  :deep(.el-tabs__item) {
    border-radius: 6px 6px 0 0;
    margin-right: 4px;
    padding: 8px 16px;
    font-weight: 500;
    font-size: 13px;
  }

  :deep(.el-tabs__item.is-active) {
    background: #00bfa5;
    color: #fff;
  }

  :deep(.el-tabs__content) {
    padding: 12px 0 0;
    overflow: visible;
  }
}

.partner-profile-pane {
  padding-top: 0;
}

:deep(.partner-form-grid) {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 2px 12px;
  margin-bottom: 4px;

  @media (max-width: 1400px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .span-full,
  .span-2 {
    grid-column: 1 / -1;
  }

  .el-form-item {
    margin-bottom: 6px;
  }

  .el-form-item__label {
    padding-bottom: 0;
    line-height: 1.25;
    font-size: 13px;
    height: auto;
  }

  .el-input__wrapper,
  .el-select__wrapper {
    min-height: 30px;
  }

  .el-textarea__inner {
    padding: 6px 8px;
  }
}

:deep(.partner-section-title) {
  margin: 4px 0 8px;
  padding-left: 8px;
  border-left: 3px solid #00bfa5;
  font-size: 14px;
  font-weight: 600;
  color: #344054;

  &.row-with-action {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-left: none;
    padding-left: 0;
  }
}
</style>
