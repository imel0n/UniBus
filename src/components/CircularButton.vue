<script setup>
defineProps({
  ariaLabel: {
    type: String,
    required: true,
  },
})

defineEmits(['click'])
</script>

<template>
  <button
    class="circular-button"
    type="button"
    :aria-label="ariaLabel"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<style scoped>
.circular-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border: none;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0px 16px rgba(0, 0, 0, 0.3);
}

.circular-button:active {
  background: #f5f5f5;
}
</style>
