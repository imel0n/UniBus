<script setup></script>

<template>
  <div class="find-stop">
    <p class="state">Search for a bus stop coming soon.</p>
  </div>
</template>

<style scoped>
.find-stop {
  padding: calc(env(safe-area-inset-top) + 12px) 12px calc(env(safe-area-inset-bottom) + 76px);
}

.state {
  color: #6a6a6a;
  font-size: 14px;
  text-align: center;
  padding: 24px 12px;
}
</style>
