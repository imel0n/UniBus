<script setup>
import PageHeader from '@/components/PageHeader.vue'
</script>

<template>
  <div>
    <PageHeader title="Favourite Stops" />
    <div class="page-content"></div>
  </div>
</template>

<style scoped>
.page-content {
  padding-top: calc(env(safe-area-inset-top) + 66px);
  padding-bottom: calc(env(safe-area-inset-bottom) + 76px);
}
</style>
