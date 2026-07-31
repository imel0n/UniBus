import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchAllBusStops } from '@/services/ltaApi'
import { haversineMetres } from '@/utils/geo'

const STORAGE_KEY = 'unibus:busStops'
const TTL_MS = 7 * 24 * 60 * 60 * 1000
const NEARBY_RADIUS_M = 1000
const FALLBACK_COUNT = 20

export const useBusStopsStore = defineStore('busStops', () => {
  const stops = ref([])
  const status = ref('idle') // idle | loading | ready | error
  const error = ref(null)

  function readCache() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const cached = JSON.parse(raw)
      if (!cached?.stops?.length) return null
      if (Date.now() - cached.fetchedAt > TTL_MS) return null
      return cached.stops
    } catch {
      return null
    }
  }

  function writeCache(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ fetchedAt: Date.now(), stops: value }))
    } catch {
      // Quota exceeded or private mode — caching is an optimisation, not a requirement.
    }
  }

  async function ensureLoaded() {
    if (status.value === 'ready' && stops.value.length) return

    const cached = readCache()
    if (cached) {
      stops.value = cached
      status.value = 'ready'
      return
    }

    status.value = 'loading'
    error.value = null
    try {
      const raw = await fetchAllBusStops()
      const mapped = raw
        .filter((stop) => stop.Latitude !== 0 && stop.Longitude !== 0)
        .map((stop) => ({
          code: stop.BusStopCode,
          name: stop.Description,
          road: stop.RoadName,
          lat: stop.Latitude,
          lon: stop.Longitude,
        }))
      stops.value = mapped
      status.value = 'ready'
      writeCache(mapped)
    } catch (err) {
      error.value = err
      status.value = 'error'
    }
  }

  /** All stops within 1 km, nearest first; if none, the nearest 20 instead. */
  function nearest(lat, lon) {
    const withDistance = stops.value
      .map((stop) => ({ ...stop, distanceM: haversineMetres(lat, lon, stop.lat, stop.lon) }))
      .sort((a, b) => a.distanceM - b.distanceM)

    const within = withDistance.filter((stop) => stop.distanceM <= NEARBY_RADIUS_M)
    return within.length ? within : withDistance.slice(0, FALLBACK_COUNT)
  }

  return { stops, status, error, ensureLoaded, nearest }
})
