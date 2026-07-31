<script setup>
import mapPinIcon from '@/assets/icons/map-pin.png'
import heartIcon from '@/assets/icons/heart.png'
import mapIcon from '@/assets/icons/map.png'
</script>

<template>
  <nav>
    <RouterLink to="/" class="tab">
      <span
        class="icon"
        :style="{ maskImage: `url(${mapPinIcon})`, WebkitMaskImage: `url(${mapPinIcon})` }"
      />
      <span class="label">Nearby</span>
    </RouterLink>
    <RouterLink to="/favourites" class="tab">
      <span
        class="icon"
        :style="{ maskImage: `url(${heartIcon})`, WebkitMaskImage: `url(${heartIcon})` }"
      />
      <span class="label">Favourites</span>
    </RouterLink>
    <RouterLink to="/find" class="tab">
      <span
        class="icon"
        :style="{ maskImage: `url(${mapIcon})`, WebkitMaskImage: `url(${mapIcon})` }"
      />
      <span class="label">Find Stop</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: #fff;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
  padding: 8px 0 max(8px, env(safe-area-inset-bottom));
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  color: #9a9a9a;
  padding: 4px 0;
}

.icon {
  width: 24px;
  height: 24px;
  background-color: currentColor;
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
}

.label {
  font-size: 12px;
  font-weight: 500;
}

.tab.router-link-exact-active {
  color: #1a1a1a;
}
</style>
