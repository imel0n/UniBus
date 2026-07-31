<script setup>
import TabBar from './components/TabBar.vue'
</script>

<template>
  <RouterView v-slot="{ Component }">
    <KeepAlive>
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
  <TabBar />
</template>

<style scoped></style>
