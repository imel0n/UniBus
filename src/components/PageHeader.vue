<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

defineProps({
  title: {
    type: String,
    required: true,
  },
})

const isScrolled = ref(false)

function handleScroll() {
  isScrolled.value = window.scrollY > 16
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <header class="page-header" :class="{ 'is-scrolled': isScrolled }">
    <h1 class="page-title">{{ title }}</h1>
  </header>
</template>

<style scoped>
.page-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: #fff;
  padding: max(12px, env(safe-area-inset-top)) 26px 12px;
  box-shadow: 0 4px 8px -4px rgba(0, 0, 0, 0);
  transition: box-shadow 0.2s ease;
}

.page-header.is-scrolled {
  box-shadow: 0 4px 8px -4px rgba(0, 0, 0, 0.15);
}

.page-title {
  margin: 0;
  font-size: 28px;
  line-height: 28px;
  font-weight: 600;
}
</style>
