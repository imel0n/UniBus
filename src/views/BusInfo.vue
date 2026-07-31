<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBusStopsStore } from '@/stores/busStops'
import { useBusRoutesStore } from '@/stores/busRoutes'
import { useGeolocation } from '@/composables/useGeolocation'
import { haversineMetres } from '@/utils/geo'

// Named so <KeepAlive :exclude> in App.vue can keep this view out of the cache.
defineOptions({ name: 'BusInfo' })

const route = useRoute()
const router = useRouter()
const busStopsStore = useBusStopsStore()
const busRoutesStore = useBusRoutesStore()

const serviceNo = computed(() => route.params.service)
// 0 is direction 1 (origin -> destination); 1 is the return leg.
const direction = ref(0)

const stopsByCode = computed(() => {
  const index = new Map()
  for (const stop of busStopsStore.stops) index.set(stop.code, stop)
  return index
})

/** The current direction's stops, resolved against the stop list. */
const routeStops = computed(() =>
  busRoutesStore.stopCodes(serviceNo.value, direction.value).map((code) => ({
    code,
    name: stopsByCode.value.get(code)?.name ?? code,
  })),
)

// A service that only runs one direction, or one that comes back to where it
// started, has a single terminus rather than two ends to swap between.
const isLoop = computed(() => {
  const stops = routeStops.value
  if (busRoutesStore.directionCount(serviceNo.value) < 2) return true
  return stops.length > 1 && stops[0].code === stops[stops.length - 1].code
})

const { coords, locate } = useGeolocation()

/** The route stop nearest the user's current location, or null if unknown. */
const closestStopCode = computed(() => {
  if (!coords.value) return null
  let closestCode = null
  let closestDistance = Infinity
  for (const stop of routeStops.value) {
    const full = stopsByCode.value.get(stop.code)
    if (!full) continue
    const distance = haversineMetres(coords.value.lat, coords.value.lon, full.lat, full.lon)
    if (distance < closestDistance) {
      closestDistance = distance
      closestCode = stop.code
    }
  }
  return closestCode
})

const origin = computed(() => routeStops.value[0]?.name ?? '')
const destination = computed(() => routeStops.value[routeStops.value.length - 1]?.name ?? '')

const isLoading = computed(
  () => busRoutesStore.status === 'loading' || busStopsStore.status === 'loading',
)
const hasError = computed(
  () => busRoutesStore.status === 'error' || busStopsStore.status === 'error',
)
const isEmpty = computed(() => !isLoading.value && !hasError.value && routeStops.value.length === 0)

function reverse() {
  if (isLoop.value) return
  direction.value = direction.value === 0 ? 1 : 0
}

function goBack() {
  // A deep link has no history to pop back into.
  if (window.history.state?.back) router.back()
  else router.replace('/')
}

function retry() {
  busStopsStore.ensureLoaded()
  busRoutesStore.ensureLoaded({ force: busRoutesStore.status === 'error' })
}

busStopsStore.ensureLoaded()
busRoutesStore.ensureLoaded()
locate()
</script>

<template>
  <div class="bus-info">
    <header class="header">
      <button class="back" aria-label="Back" @click="goBack">
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div class="service">{{ serviceNo }}</div>

      <button
        class="terminus"
        :class="{ 'is-loop': isLoop }"
        :disabled="isLoop || !routeStops.length"
        :aria-label="isLoop ? undefined : 'Reverse direction'"
        @click="reverse"
      >
        <span class="terminus-name">{{ origin || '—' }}</span>

        <!-- Two-way swap for a there-and-back service; a closed loop otherwise. -->
        <span class="terminus-icon">
          <svg
            v-if="isLoop"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M20.5 13a8.5 8.5 0 1 1-2-6.5" />
            <path d="M19 2v5h-5" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M8 3v18M8 21l-3.5-3.5M8 21l3.5-3.5" />
            <path d="M16 21V3M16 3l-3.5 3.5M16 3l3.5 3.5" />
          </svg>
        </span>

        <span v-if="!isLoop" class="terminus-name">{{ destination || '—' }}</span>
      </button>
    </header>

    <div class="stop-list">
      <div v-if="hasError" class="state">
        <p>Couldn’t load this route.</p>
        <button class="retry-button" @click="retry">Try again</button>
      </div>
      <div v-else-if="isLoading" class="state">
        <p>Loading route…</p>
      </div>
      <div v-else-if="isEmpty" class="state">
        <p>No route information for service {{ serviceNo }}.</p>
      </div>
      <ol v-else class="stops">
        <li v-for="(stop, index) in routeStops" :key="`${index}-${stop.code}`" class="stop">
          <span class="stop-name" :class="{ nearest: stop.code === closestStopCode }">
            {{ stop.name }}
            <span v-if="stop.code === closestStopCode" class="nearest-label">Nearest Stop</span>
          </span>
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.bus-info {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: max(12px, env(safe-area-inset-top)) 20px 12px;
}

.back {
  display: flex;
  align-items: center;
  border: none;
  background: none;
  padding: 0 2px 0 0;
  color: #1a1a1a;
  margin-left: -4px;
}

.service {
  background: #000;
  color: #fff;
  border-radius: 15px;
  padding: 9px 16px;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
}

.terminus {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  margin-left: auto;
  border: none;
  background: none;
  padding: 4px 0 4px 8px;
  font: inherit;
  text-align: right;
  color: #1a1a1a;
}

.terminus:active:not(:disabled) {
  opacity: 0.5;
}

.terminus-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
}

.terminus-icon {
  display: flex;
  color: #9a9a9a;
}

.stop-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  border-top: 1.5px solid #e2e2e2;
  padding-bottom: env(safe-area-inset-bottom);
}

.stops {
  list-style: none;
  margin: 0;
  padding: 0;
}

.stop {
  position: relative;
  padding: 22px 20px 22px 64px;
  font-size: 17px;
  font-weight: 500;
}

.stop::before,
.stop::after {
  content: '';
  position: absolute;
  left: 29px;
}

.stop::before {
  top: 50%;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0 30%, #000 32% 100%);
  transform: translate(-50%, -50%);
  z-index: 1;
}

.stop::after {
  top: 0;
  bottom: 0;
  width: 3px;
  background: #000;
  transform: translateX(-50%);
}

.stop:first-child::after {
  top: 50%;
}

.stop:last-child::after {
  bottom: 50%;
}

.stop-name.nearest {
  display: inline-block;
  margin: -4px -8px;
  border-radius: 8px;
  padding: 4px 8px;
  background: #000;
  color: #fff;
}

.nearest-label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
}

.state {
  color: #6a6a6a;
  font-size: 14px;
  text-align: center;
  padding: 24px 20px;
}

.retry-button {
  margin-top: 12px;
  border: 1.5px solid #e2e2e2;
  border-radius: 8px;
  background: #fff;
  padding: 8px 16px;
  font: inherit;
  font-weight: 600;
  color: #000;
}
</style>
