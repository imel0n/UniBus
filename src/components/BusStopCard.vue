<script setup>
import { computed } from 'vue'
import heartIcon from '@/assets/icons/heart.png'

const props = defineProps({
  name: { type: String, required: true },
  distance: { type: String, required: true },
  isFavourite: { type: Boolean, default: false },
  // [{ code: 'A1', arrival: 3 | 'Arr' | 'NA' }, ...]
  services: { type: Array, required: true },
})

const emit = defineEmits(['toggle-favourite'])

// 'Arr' sorts ahead of every timed bus; 'NA' sinks to the bottom.
function arrivalRank(arrival) {
  if (arrival === 'Arr') return -1
  if (typeof arrival === 'number') return arrival
  return Infinity
}

const sortedServices = computed(() => {
  return [...props.services].sort((a, b) => arrivalRank(a.arrival) - arrivalRank(b.arrival))
})

const codeColors = {
  D1: { background: '#4b2e6f', color: '#ffffff' },
  D2: { background: '#d9c6f0', color: '#000000' },
  A1: { background: '#d92626', color: '#ffffff' },
  A2: { background: '#f5e042', color: '#000000' },
}

function codeStyle(code) {
  return codeColors[code] ?? { background: '#f0f0f0', color: '#000000' }
}
</script>

<template>
  <div class="bus-stop-card">
    <div class="header">
      <div class="info">
        <div class="name">{{ name }}</div>
        <div class="distance">{{ distance }}</div>
      </div>
      <button
        class="favourite-button"
        :class="{ active: isFavourite }"
        @click="emit('toggle-favourite')"
      >
        <span
          class="icon"
          :style="{ maskImage: `url(${heartIcon})`, WebkitMaskImage: `url(${heartIcon})` }"
        />
      </button>
    </div>
    <div class="services">
      <div v-for="service in sortedServices" :key="service.code" class="service">
        <div class="code" :style="codeStyle(service.code)">{{ service.code }}</div>
        <div class="arrival">
          {{ typeof service.arrival === 'number' ? `${service.arrival} min` : service.arrival }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bus-stop-card {
  background: #fff;
  border: 1.5px solid #e2e2e2;
  border-radius: 12px;
  padding: 14px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.name {
  font-size: 18px;
  font-weight: 700;
}

.distance {
  font-size: 13px;
  color: #9a9a9a;
  margin-top: 2px;
}

.favourite-button {
  display: flex;
  border: none;
  background: none;
  padding: 4px;
}

.favourite-button .icon {
  width: 20px;
  height: 20px;
  background-color: #d0d0d0;
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
}

.favourite-button.active .icon {
  background-color: #e63950;
}

.services {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  margin-top: 12px;
}

.service {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.code {
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 14px;
  font-weight: 600;
}

.arrival {
  font-size: 12px;
  color: #6a6a6a;
}
</style>
