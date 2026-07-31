<script setup>
import { computed, onMounted } from 'vue'
import BusStopCard from '@/components/BusStopCard.vue'
import CircularButton from '@/components/CircularButton.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useFavouritesStore } from '@/stores/favourites'
import { useGeolocation } from '@/composables/useGeolocation'
import { useArrivalsPolling } from '@/composables/useArrivalsPolling'
import { haversineMetres, formatDistance } from '@/utils/geo'

const favouritesStore = useFavouritesStore()
const { coords, locate } = useGeolocation()

// Every favourite is shown — proximity only decides the order.
const sortedStops = computed(() => {
  const stops = favouritesStore.favourites
  if (!coords.value) return stops.map((stop) => ({ ...stop, distanceM: null }))

  return stops
    .map((stop) => ({
      ...stop,
      distanceM: haversineMetres(coords.value.lat, coords.value.lon, stop.lat, stop.lon),
    }))
    .sort((a, b) => a.distanceM - b.distanceM)
})

const stopCodes = computed(() => sortedStops.value.map((stop) => stop.code))

const { arrivalsByStop, refresh: refreshArrivals } = useArrivalsPolling(stopCodes)

const cards = computed(() =>
  sortedStops.value.map((stop) => ({
    code: stop.code,
    name: stop.name,
    road: stop.road,
    distance: stop.distanceM === null ? '' : formatDistance(stop.distanceM),
    services: arrivalsByStop.value[stop.code] ?? [],
    lat: stop.lat,
    lon: stop.lon,
  })),
)

function refreshFavourites() {
  locate()
  refreshArrivals()
}

onMounted(() => {
  locate()
  favouritesStore.ensureLoaded()
})
</script>

<template>
  <div>
    <PageHeader title="Favourite Stops" />
    <div class="stops-list">
      <div v-if="favouritesStore.status === 'error'" class="state">
        <p>Couldn’t load your favourites.</p>
        <button class="retry-button" @click="favouritesStore.ensureLoaded()">Try again</button>
      </div>
      <div v-else-if="favouritesStore.status !== 'ready'" class="state">
        <p>Loading favourites…</p>
      </div>
      <div v-else-if="!cards.length" class="state">
        <p>No favourite stops yet. Tap the heart on a stop to save it here.</p>
      </div>
      <template v-else>
        <BusStopCard
          v-for="stop in cards"
          :key="stop.code"
          :name="stop.name"
          :road="stop.road"
          :distance="stop.distance"
          :is-favourite="true"
          :services="stop.services"
          @toggle-favourite="favouritesStore.toggle(stop)"
        />
      </template>
    </div>

    <CircularButton
      class="refresh-button"
      aria-label="Re-poll bus timings"
      @click="refreshFavourites"
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="#000000"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M23 4v6h-6" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    </CircularButton>
  </div>
</template>

<style scoped>
.stops-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: calc(env(safe-area-inset-top) + 66px) 12px calc(env(safe-area-inset-bottom) + 76px);
}

.state {
  color: #6a6a6a;
  font-size: 14px;
  text-align: center;
  padding: 24px 12px;
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

.refresh-button {
  position: fixed;
  right: 24px;
  bottom: calc(env(safe-area-inset-bottom) + 82px);
  z-index: 900;
}
</style>
