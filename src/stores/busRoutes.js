import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchAllBusRoutes } from '@/services/ltaApi'

const STORAGE_KEY = 'unibus:busRoutes'
const TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Collapses DataMall's flat route rows into `{ [serviceNo]: [[stopCode, ...], ...] }`
 * — one stop-code array per direction, in StopSequence order. Only the codes are
 * kept: names and coordinates already live in the bus stops store, and dropping
 * them is what makes the whole table small enough to cache.
 */
function indexRoutes(rows) {
  const byService = {}

  for (const row of rows) {
    const service = (byService[row.ServiceNo] ??= [])
    // Direction is 1-based; loop services only ever have direction 1.
    const stops = (service[row.Direction - 1] ??= [])
    stops.push([row.StopSequence, row.BusStopCode])
  }

  // The pages arrive in sequence order already, but sorting is cheap insurance
  // against a service whose rows straddle a page boundary out of order.
  for (const directions of Object.values(byService)) {
    for (let i = 0; i < directions.length; i += 1) {
      directions[i] = (directions[i] ?? []).sort((a, b) => a[0] - b[0]).map(([, code]) => code)
    }
  }

  return byService
}

export const useBusRoutesStore = defineStore('busRoutes', () => {
  const routesByService = ref({})
  const status = ref('idle') // idle | loading | ready | error
  const error = ref(null)

  function readCache() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const cached = JSON.parse(raw)
      if (!cached?.routes) return null
      if (Date.now() - cached.fetchedAt > TTL_MS) return null
      return cached.routes
    } catch {
      return null
    }
  }

  function writeCache(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ fetchedAt: Date.now(), routes: value }))
    } catch {
      // Quota exceeded or private mode — caching is an optimisation, not a requirement.
    }
  }

  async function ensureLoaded({ force = false } = {}) {
    if (!force && status.value === 'ready') return
    // Sharing one in-flight load keeps several cards opening at once to a single fetch.
    if (status.value === 'loading') return

    const cached = force ? null : readCache()
    if (cached) {
      routesByService.value = cached
      status.value = 'ready'
      return
    }

    status.value = 'loading'
    error.value = null
    try {
      const indexed = indexRoutes(await fetchAllBusRoutes())
      routesByService.value = indexed
      status.value = 'ready'
      writeCache(indexed)
    } catch (err) {
      error.value = err
      status.value = 'error'
    }
  }

  /** Stop codes in travel order for one direction (0-based), or [] if unknown. */
  function stopCodes(serviceNo, direction = 0) {
    return routesByService.value[serviceNo]?.[direction] ?? []
  }

  /** How many directions a service runs — 1 for a loop service, otherwise 2. */
  function directionCount(serviceNo) {
    return routesByService.value[serviceNo]?.length ?? 0
  }

  return { routesByService, status, error, ensureLoaded, stopCodes, directionCount }
})
