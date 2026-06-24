<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { BatchNoFormat } from '@/utils/productBatchExpiry'

const props = withDefaults(
  defineProps<{
    modelValue?: BatchNoFormat
    disabled?: boolean
    compact?: boolean
  }>(),
  { disabled: false, compact: false }
)

const emit = defineEmits<{
  confirm: [BatchNoFormat]
  cancel: []
}>()

const pending = ref<BatchNoFormat>(props.modelValue === 'YYMMDD' ? 'YYMMDD' : 'YYYYMMDD')

watch(
  () => props.modelValue,
  value => {
    if (value === 'YYYYMMDD' || value === 'YYMMDD') {
      pending.value = value
    }
  }
)

const confirm = () => {
  if (props.disabled) return
  emit('confirm', pending.value)
}

const useManual = () => {
  if (props.disabled) return
  emit('confirm', 'custom')
}

const title = computed(() => (props.compact ? '批号格式' : '按生产日期生成批号'))
</script>

<template>
  <div class="batch-format-confirm-panel">
    <div class="panel-title">{{ title }}</div>
    <el-radio-group v-model="pending" class="vertical-options" :disabled="disabled">
      <el-radio value="YYYYMMDD">20260624</el-radio>
      <el-radio value="YYMMDD">260624</el-radio>
    </el-radio-group>
    <div class="panel-actions">
      <el-button size="small" type="primary" :disabled="disabled" @click="confirm">确定</el-button>
      <el-button size="small" link :disabled="disabled" @click="useManual">手输批号</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.batch-format-confirm-panel {
  padding: 8px 10px;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 4px;

  .panel-title {
    font-size: 12px;
    color: #909399;
    margin-bottom: 6px;
  }

  .vertical-options {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    width: 100%;

    :deep(.el-radio) {
      height: 24px;
      margin-right: 0;
    }
  }

  .panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }
}
</style>
