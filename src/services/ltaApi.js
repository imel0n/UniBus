// Thin wrapper around LTA DataMall, reached through the /api/lta proxy that
// injects the AccountKey header (see vite.config.js).

const BASE = '/api/lta'
const PAGE_SIZE = 500

async function ltaGet(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`LTA request failed (${res.status}): ${path}`)
  return res.json()
}

/**
 * DataMall has no nearby/radius endpoint, so the full stop list is pulled once
 * (~5,000 records, 500 per page) and distances are computed client-side.
 */
export async function fetchAllBusStops() {
  const stops = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const data = await ltaGet(`/BusStops?$skip=${skip}`)
    const page = data.value ?? []
    stops.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return stops
}

export function fetchBusArrivals(busStopCode) {
  return ltaGet(`/v3/BusArrival?BusStopCode=${busStopCode}`)
}
