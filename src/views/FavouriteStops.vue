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
}
</style>
