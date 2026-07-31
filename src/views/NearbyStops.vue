<script setup>
import { computed, onMounted } from 'vue'
import BusStopCard from '@/components/BusStopCard.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useBusStopsStore } from '@/stores/busStops'
import { useFavouritesStore } from '@/stores/favourites'
import { useGeolocation } from '@/composables/useGeolocation'
import { useArrivalsPolling } from '@/composables/useArrivalsPolling'
import { formatDistance } from '@/utils/geo'

const busStopsStore = useBusStopsStore()
const favouritesStore = useFavouritesStore()
const { coords, status: locationStatus, error: locationError, locate } = useGeolocation()

const nearbyStops = computed(() => {
  if (!coords.value || busStopsStore.status !== 'ready') return []
  return busStopsStore.nearest(coords.value.lat, coords.value.lon)
})

const stopCodes = computed(() => nearbyStops.value.map((stop) => stop.code))

const { arrivalsByStop } = useArrivalsPolling(stopCodes)

const cards = computed(() =>
  nearbyStops.value.map((stop) => ({
    code: stop.code,
    name: stop.name,
    road: stop.road,
    distance: formatDistance(stop.distanceM),
    isFavourite: favouritesStore.isFavourite(stop.code),
    services: arrivalsByStop.value[stop.code] ?? [],
    lat: stop.lat,
    lon: stop.lon,
  })),
)

onMounted(() => {
  // Independent of each other, so run both and render once they're both ready.
  locate()
  busStopsStore.ensureLoaded()
  favouritesStore.ensureLoaded()
})
</script>

<template>
  <div>
    <PageHeader title="Nearby Stops" />
    <div class="stops-list">
      <div v-if="locationStatus === 'error'" class="state">
        <p>{{ locationError }}</p>
        <button class="retry-button" @click="locate">Try again</button>
      </div>
      <div v-else-if="busStopsStore.status === 'error'" class="state">
        <p>Couldn’t load bus stops.</p>
        <button class="retry-button" @click="busStopsStore.ensureLoaded()">Try again</button>
      </div>
      <div v-else-if="locationStatus === 'locating' || locationStatus === 'idle'" class="state">
        <p>Locating you…</p>
      </div>
      <div v-else-if="busStopsStore.status !== 'ready'" class="state">
        <p>Loading bus stops…</p>
      </div>
      <template v-else>
        <BusStopCard
          v-for="stop in cards"
          :key="stop.code"
          :name="stop.name"
          :road="stop.road"
          :distance="stop.distance"
          :is-favourite="stop.isFavourite"
          :services="stop.services"
          @toggle-favourite="favouritesStore.toggle(stop)"
        />
      </template>
    </div>
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
</style>
