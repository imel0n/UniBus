<script setup>
import { computed, nextTick, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import BusStopCard from '@/components/BusStopCard.vue'
import CircularButton from '@/components/CircularButton.vue'
import { useBusStopsStore } from '@/stores/busStops'
import { useFavouritesStore } from '@/stores/favourites'
import { useGeolocation } from '@/composables/useGeolocation'
import { useArrivalsPolling } from '@/composables/useArrivalsPolling'
import { formatDistance, haversineMetres } from '@/utils/geo'
import stopMarkerIcon from '@/assets/icons/stop-marker.png'

const SINGAPORE_CENTRE = [1.3521, 103.8198]
const OVERVIEW_ZOOM = 12
const FOCUS_ZOOM = 17
// Below this, the island holds far too many stops to be legible or tappable.
const MIN_MARKER_ZOOM = 16
const MAX_RESULTS = 8
// One duration for every deliberate move, so consecutive ones read as one motion.
const MOVE_DURATION = 0.45
// Matches the card's enter/resize transition, so the map tracks it rather than
// racing it when the card grows.
const CARD_FOLLOW_DURATION = 0.2
// GPS jitter below this isn't worth a second animation after the recentre flight.
const RECENTRE_NUDGE_METRES = 10

const router = useRouter()
const busStopsStore = useBusStopsStore()
const favouritesStore = useFavouritesStore()
const { coords, locate } = useGeolocation()

const mapEl = ref(null)
const searchInput = ref(null)
const cardEl = ref(null)
const selectedStop = ref(null)
const query = ref('')
const belowMarkerZoom = ref(true)
const cardHeight = ref(0)
let cardResizeObserver = null

// Leaflet instances are deliberately outside Vue's reactivity — wrapping them in
// proxies breaks their internal identity checks.
let map = null
let markerLayer = null
let userMarker = null
let accuracyCircle = null
const markersByCode = new Map()
let userHasMovedMap = false
let hasCentredOnUser = false
let recenterRequested = false
let recentreTarget = null
// Our own animations fire the same move events a drag does, so they have to be
// counted out before a move can be attributed to the rider.
let programmaticMoves = 0
// Cleared as soon as the rider takes over, so a growing card stops pulling the map.
let followSelectedStop = false

const baseIcon = L.icon({
  iconUrl: stopMarkerIcon,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  className: 'stop-marker-icon stop-marker-icon--base',
})
const activeIcon = L.icon({
  iconUrl: stopMarkerIcon,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  className: 'stop-marker-icon stop-marker-icon--active',
})

const userIcon = L.divIcon({
  html: '<div class="user-dot"></div>',
  className: 'user-location-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

function renderUserLocation() {
  if (!map || !coords.value) return

  const { lat, lon, accuracy } = coords.value
  const position = [lat, lon]

  if (userMarker) {
    userMarker.setLatLng(position)
  } else {
    // Sits above the stop markers so it stays findable in a dense cluster.
    userMarker = L.marker(position, {
      icon: userIcon,
      interactive: false,
      keyboard: false,
      zIndexOffset: 1000,
    }).addTo(map)
  }

  // A GPS fix good to a few metres is smaller than the dot itself; drawing the
  // halo then just adds noise.
  if (accuracy > 20) {
    if (accuracyCircle) {
      accuracyCircle.setLatLng(position).setRadius(accuracy)
    } else {
      accuracyCircle = L.circle(position, {
        radius: accuracy,
        interactive: false,
        color: '#1a73e8',
        weight: 1,
        opacity: 0.25,
        fillColor: '#1a73e8',
        fillOpacity: 0.12,
      }).addTo(map)
    }
  } else if (accuracyCircle) {
    accuracyCircle.remove()
    accuracyCircle = null
  }

}

const searchResults = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (q.length < 2) return []

  const results = []
  for (const stop of busStopsStore.stops) {
    if (
      stop.name.toLowerCase().includes(q) ||
      stop.road.toLowerCase().includes(q) ||
      stop.code.startsWith(q)
    ) {
      results.push(stop)
      if (results.length === MAX_RESULTS) break
    }
  }
  return results
})

// Only the open stop is polled — one request per cycle rather than one per marker.
const selectedCodes = computed(() => (selectedStop.value ? [selectedStop.value.code] : []))
const { arrivalsByStop } = useArrivalsPolling(selectedCodes)

const selectedServices = computed(() =>
  selectedStop.value ? (arrivalsByStop.value[selectedStop.value.code] ?? []) : [],
)

const selectedDistance = computed(() => {
  const stop = selectedStop.value
  if (!stop || !coords.value) return ''
  return formatDistance(haversineMetres(coords.value.lat, coords.value.lon, stop.lat, stop.lon))
})

function setSelected(stop) {
  const previous = selectedStop.value
  if (previous) markersByCode.get(previous.code)?.setIcon(baseIcon)
  selectedStop.value = stop
  followSelectedStop = Boolean(stop)
  if (stop) markersByCode.get(stop.code)?.setIcon(activeIcon)
}

// Leaflet's flyTo arcs out and back along the path, which is right for a jump
// across the island but reads as a lurch when the zoom isn't changing at all.
function moveMap(latlng, zoom, duration = MOVE_DURATION) {
  if (!map) return

  programmaticMoves += 1
  let released = false
  const release = () => {
    if (released) return
    released = true
    programmaticMoves -= 1
    map?.off('moveend', release)
    clearTimeout(timer)
  }
  // A move that changes nothing never reaches moveend, so don't rely on it alone.
  const timer = setTimeout(release, duration * 1000 + 400)
  map.on('moveend', release)

  if (duration === 0) {
    map.setView(latlng, zoom, { animate: false })
  } else if (Math.abs(zoom - map.getZoom()) < 0.01) {
    map.panTo(latlng, { animate: true, duration })
  } else {
    map.flyTo(latlng, zoom, { duration })
  }
}

// The search field and the open card each cover a slice of the map, so the true
// centre of what the rider can see sits above the container's midpoint.
async function centreOnStop(stop, { zoom, duration } = {}) {
  if (!map) return

  // Let the card mount (or re-measure for a taller one) before reading its edge.
  await nextTick()
  if (!map || !mapEl.value) return

  const targetZoom = zoom ?? map.getZoom()
  const size = map.getSize()
  const mapTop = mapEl.value.getBoundingClientRect().top
  const topBound = searchInput.value ? searchInput.value.getBoundingClientRect().bottom - mapTop : 0
  // offsetTop is the card's settled layout position: a rect would read the enter
  // transition's translate, and both share .find-stop's box with the map.
  const bottomBound = cardEl.value ? cardEl.value.offsetTop : size.y
  const visibleCentreY = (topBound + bottomBound) / 2

  // Push the map centre south of the stop by the same gap, so the stop lands on
  // the visible centre rather than behind the card.
  const point = map.project([stop.lat, stop.lon], targetZoom).add([0, size.y / 2 - visibleCentreY])
  moveMap(map.unproject(point, targetZoom), targetZoom, duration)
}

function renderVisibleMarkers() {
  if (!map || busStopsStore.status !== 'ready') return

  belowMarkerZoom.value = map.getZoom() < MIN_MARKER_ZOOM
  if (belowMarkerZoom.value) {
    markerLayer.clearLayers()
    markersByCode.clear()
    return
  }

  // Pad by a fifth of the viewport so a pan reveals markers that already exist.
  const bounds = map.getBounds().pad(0.2)
  const south = bounds.getSouth()
  const north = bounds.getNorth()
  const west = bounds.getWest()
  const east = bounds.getEast()

  const visible = new Set()
  for (const stop of busStopsStore.stops) {
    if (stop.lat < south || stop.lat > north || stop.lon < west || stop.lon > east) continue

    visible.add(stop.code)
    if (markersByCode.has(stop.code)) continue

    const marker = L.marker([stop.lat, stop.lon], {
      icon: stop.code === selectedStop.value?.code ? activeIcon : baseIcon,
      keyboard: false,
    })
    marker.on('click', () => {
      setSelected(stop)
      centreOnStop(stop)
    })
    marker.addTo(markerLayer)
    markersByCode.set(stop.code, marker)
  }

  for (const [code, marker] of markersByCode) {
    if (visible.has(code)) continue
    markerLayer.removeLayer(marker)
    markersByCode.delete(code)
  }
}

function chooseResult(stop) {
  query.value = ''
  // Otherwise the on-screen keyboard stays up and covers the card.
  searchInput.value?.blur()
  setSelected(stop)
  centreOnStop(stop, { zoom: FOCUS_ZOOM })
}

function recenterOnUser() {
  followSelectedStop = false
  recenterRequested = true
  // Move on the cached fix straight away so the tap feels answered; the watcher
  // only follows up if the fresh fix lands somewhere meaningfully different.
  if (coords.value) {
    recentreTarget = coords.value
    moveMap([coords.value.lat, coords.value.lon], FOCUS_ZOOM)
  } else {
    recentreTarget = null
  }
  locate()
}

onMounted(() => {
  busStopsStore.ensureLoaded()
  favouritesStore.ensureLoaded()
  locate()

  map = L.map(mapEl.value, {
    center: SINGAPORE_CENTRE,
    zoom: OVERVIEW_ZOOM,
    zoomControl: false,
  })

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
  }).addTo(map)

  markerLayer = L.layerGroup().addTo(map)
  renderUserLocation()

  map.on('moveend zoomend', renderVisibleMarkers)
  map.on('click', () => setSelected(null))
  map.on('movestart', () => {
    if (programmaticMoves > 0) return
    userHasMovedMap = true
    followSelectedStop = false
  })
})

// KeepAlive hides the view rather than unmounting it, so Leaflet caches a stale
// (often zero) container size while it's off screen.
onActivated(() => {
  map?.invalidateSize()
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
  userMarker = null
  accuracyCircle = null
  cardResizeObserver?.disconnect()
  cardResizeObserver = null
})

watch(cardEl, (el) => {
  cardResizeObserver?.disconnect()
  cardResizeObserver = null
  if (!el) {
    cardHeight.value = 0
    return
  }
  cardResizeObserver = new ResizeObserver(([entry]) => {
    cardHeight.value = entry.contentRect.height
  })
  cardResizeObserver.observe(el)
})

// Arrivals land after the card opens, and expanding it grows it again — both move
// the visible centre, so the stop has to be re-centred against the new one.
watch(cardHeight, (_height, previous) => {
  // The 0 -> first measurement is the card opening, which centreOnStop already read.
  if (!previous || !followSelectedStop || !selectedStop.value) return
  centreOnStop(selectedStop.value, { duration: CARD_FOLLOW_DURATION })
})

watch(coords, (value) => {
  if (!value || !map) return

  renderUserLocation()

  if (recenterRequested) {
    recenterRequested = false
    const drift = recentreTarget
      ? haversineMetres(recentreTarget.lat, recentreTarget.lon, value.lat, value.lon)
      : Infinity
    recentreTarget = null
    // Chasing a couple of metres of GPS jitter with a second animation is the
    // wobble; let the dot settle under a map that's already stopped.
    if (drift > RECENTRE_NUDGE_METRES) moveMap([value.lat, value.lon], FOCUS_ZOOM)
    return
  }

  // A slow GPS fix shouldn't yank the map out from under someone already panning.
  if (hasCentredOnUser || userHasMovedMap) return
  hasCentredOnUser = true
  // Instant: the map is still on the island-wide overview, and flying that whole
  // distance on load is more disorienting than simply arriving.
  moveMap([value.lat, value.lon], FOCUS_ZOOM, 0)
})

watch(() => busStopsStore.status, renderVisibleMarkers)
</script>

<template>
  <div class="find-stop">
    <div ref="mapEl" class="map" />

    <div class="search">
      <input
        ref="searchInput"
        v-model="query"
        class="search-input"
        type="search"
        placeholder="Search for a bus stop"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
      />
      <ul v-if="searchResults.length" class="results">
        <li v-for="stop in searchResults" :key="stop.code">
          <button class="result" @click="chooseResult(stop)">
            <span class="result-name">{{ stop.name }}</span>
            <span class="result-meta">{{ stop.road }} &middot; {{ stop.code }}</span>
          </button>
        </li>
      </ul>
    </div>

    <p v-if="belowMarkerZoom && !searchResults.length" class="zoom-hint">Zoom in to see stops</p>

    <CircularButton
      class="recenter-button"
      :style="
        selectedStop
          ? { bottom: `calc(env(safe-area-inset-bottom) + 88px + ${cardHeight}px)` }
          : null
      "
      aria-label="Recentre map on my location"
      @click="recenterOnUser"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#000000" stroke-width="2">
        <circle cx="12" cy="12" r="3" fill="#000000" stroke="none" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke-linecap="round" />
        <circle cx="12" cy="12" r="7" />
      </svg>
    </CircularButton>

    <Transition name="card">
      <div v-if="selectedStop" ref="cardEl" class="card">
        <BusStopCard
          :key="selectedStop.code"
          :name="selectedStop.name"
          :road="selectedStop.road"
          :distance="selectedDistance"
          :is-favourite="favouritesStore.isFavourite(selectedStop.code)"
          :services="selectedServices"
          max-expanded-height="45vh"
          @toggle-favourite="favouritesStore.toggle(selectedStop)"
          @select-service="router.push(`/bus/${$event}`)"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.find-stop {
  position: fixed;
  inset: 0;
}

.map {
  position: absolute;
  inset: 0;
  background: #f4f4f2;
}

.search {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 12px);
  left: 12px;
  right: 12px;
  z-index: 1000;
}

.search-input {
  width: 100%;
  border: 1.5px solid #e2e2e2;
  border-radius: 12px;
  background: #fff;
  padding: 12px 14px;
  font: inherit;
  /* 16px keeps iOS from zooming the viewport when the field takes focus. */
  font-size: 16px;
  color: #000;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  -webkit-user-select: text;
  user-select: text;
}

.search-input::placeholder {
  color: #9a9a9a;
}

.results {
  list-style: none;
  margin: 8px 0 0;
  padding: 4px;
  background: #fff;
  border: 1.5px solid #e2e2e2;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  max-height: 50vh;
  overflow-y: auto;
}

.result {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  border: none;
  background: none;
  padding: 10px;
  font: inherit;
  text-align: left;
  border-radius: 8px;
}

.result:active {
  background: #f5f5f5;
}

.result-name {
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.result-meta {
  font-size: 12px;
  color: #9a9a9a;
}

.zoom-hint {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 72px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 900;
  margin: 0;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  pointer-events: none;
}

.recenter-button {
  position: absolute;
  right: 24px;
  bottom: calc(env(safe-area-inset-bottom) + 82px);
  z-index: 900;
  transition: bottom 0.2s ease;
}

.card {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: calc(env(safe-area-inset-bottom) + 76px);
  z-index: 1000;
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.12);
}

.card-enter-active,
.card-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.card-enter-from,
.card-leave-to {
  transform: translateY(12px);
  opacity: 0;
}

:deep(.leaflet-control-attribution) {
  display: none;
}

:deep(.user-dot) {
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: #1a73e8;
  border: 2.5px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
}

:deep(.stop-marker-icon--base) {
  opacity: 0.5;
}

:deep(.stop-marker-icon--active) {
  opacity: 1;
}
</style>
