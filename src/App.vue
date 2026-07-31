<script setup>
import { useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'

const route = useRoute()
</script>

<template>
  <RouterView v-slot="{ Component }">
    <!-- BusInfo is excluded: it's per-service, and its map shouldn't outlive the view. -->
    <KeepAlive :exclude="['BusInfo']">
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
  <TabBar v-if="!route.meta.fullscreen" />
</template>

<style scoped></style>
