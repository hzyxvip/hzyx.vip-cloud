<script setup lang="ts">
defineProps<{
  label: string
  sortIcon: string
  active?: boolean
  align?: 'left' | 'center' | 'right'
  required?: boolean
}>()

const emit = defineEmits<{
  sort: []
}>()
</script>

<template>
  <span
    class="sort-header"
    :class="{
      'is-active': active,
      'is-right': align === 'right',
      'is-left': align === 'left'
    }"
    @click.stop="emit('sort')"
  >
    <span :class="{ 'required-col': required }">{{ label }}</span>
    <span class="sort-icon">{{ sortIcon }}</span>
  </span>
</template>

<style scoped lang="scss">
@import '@/styles/document-table-sort.scss';
</style>
