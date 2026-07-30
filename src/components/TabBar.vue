<script setup></script>

<template>
  <nav>
    <RouterLink to="/">Nearby Stops</RouterLink>
    <RouterLink to="/favourites">Favourite Stops</RouterLink>
  </nav>
</template>

<style scoped>
nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
}

nav a {
  flex: 1;
  text-align: center;
}
</style>
