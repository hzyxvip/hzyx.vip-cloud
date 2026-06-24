<script setup lang="ts">
withDefaults(
  defineProps<{
    text?: string
    size?: 'default' | 'compact'
    overlay?: boolean
  }>(),
  {
    text: '已审核',
    size: 'default',
    overlay: false
  }
)
</script>

<template>
  <div
    class="audit-seal"
    :class="[`audit-seal--${size}`, { 'audit-seal--overlay': overlay }]"
    aria-hidden="true"
  >
    <div class="audit-seal-frame">
      <span class="audit-seal-text">{{ text }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.audit-seal {
  display: inline-flex;
  pointer-events: none;
  user-select: none;
  flex-shrink: 0;

  &--overlay {
    position: absolute;
    top: 128px;
    right: 64px;
    transform: rotate(-10deg);
    z-index: 20;
  }

  &--default .audit-seal-frame {
    min-width: 84px;
    height: 38px;
    padding: 0 12px;
  }

  &--default .audit-seal-text {
    font-size: 16px;
    letter-spacing: 4px;
  }

  &--compact .audit-seal-frame {
    min-width: 72px;
    height: 32px;
    padding: 0 10px;
  }

  &--compact .audit-seal-text {
    font-size: 14px;
    letter-spacing: 3px;
  }
}

.audit-seal-frame {
  border: 2px solid #d32f2f;
  border-radius: 2px;
  background: rgba(211, 47, 47, 0.04);
  box-shadow:
    inset 0 0 0 1px rgba(211, 47, 47, 0.4),
    0 1px 4px rgba(211, 47, 47, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 4px;
    border: 1px solid rgba(211, 47, 47, 0.45);
    border-radius: 1px;
    pointer-events: none;
  }
}

.audit-seal-text {
  color: #c62828;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  font-family: 'SimSun', 'STSong', 'Songti SC', serif;
  opacity: 0.9;
}
</style>
