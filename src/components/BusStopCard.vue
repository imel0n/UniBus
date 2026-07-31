<script setup>
import { computed } from 'vue'
import heartIcon from '@/assets/icons/heart.png'
// Inlined rather than used as a mask/`<img>`: the markup carries its own sizing
// and picks up the grey from `.deck-icon`.
// import singleDeckerIcon from '@/assets/icons/single-decker.svg?raw'
import doubleDeckerIcon from '@/assets/icons/double-decker.svg?raw'

const props = defineProps({
  name: { type: String, required: true },
  road: { type: String, default: '' },
  distance: { type: String, default: '' },
  isFavourite: { type: Boolean, default: false },
  // [{ code: 'A1', arrivals: ['Arr', 8, 'NA'], deckTypes: ['DD', 'SD', null] }, ...]
  // `deckTypes` is optional — without it the expanded rows just omit the icon.
  services: { type: Array, required: true },
  // Any CSS length. Empty means the expanded card grows as tall as it needs to.
  maxExpandedHeight: { type: String, default: '' },
})

const emit = defineEmits(['toggle-favourite', 'select-service'])

// Optional v-model: bind it to keep expansion alive across re-renders, or leave
// it unbound and the card just holds the state itself.
const expanded = defineModel('expanded', { type: Boolean, default: false })

// 'Arr' sorts ahead of every timed bus; 'NA' sinks to the bottom.
function arrivalRank(arrival) {
  if (arrival === 'Arr') return -1
  if (typeof arrival === 'number') return arrival
  return Infinity
}

const sortedServices = computed(() => {
  return [...props.services].sort((a, b) => arrivalRank(a.arrivals[0]) - arrivalRank(b.arrivals[0]))
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

function arrivalClass(arrival) {
  if (arrival === 'Arr') return 'urgent'
  if (typeof arrival === 'number' && arrival <= 5) return 'soon'
  return ''
}

function formatArrival(arrival) {
  return typeof arrival === 'number' ? `${arrival} min` : arrival
}

// The first bus gets its own line, so only the two behind it go in the sub-line.
function laterArrivals(arrivals) {
  return arrivals.slice(1, 3).filter((arrival) => arrival !== 'NA')
}

// Only double-deckers are flagged for now; the single-decker icon (also used for
// bendy buses, which are single-deck vehicles) is parked until it looks right.
const deckIcons = {
  // SD: { icon: singleDeckerIcon, label: 'Single-decker bus' },
  // BD: { icon: singleDeckerIcon, label: 'Bendy bus (single deck)' },
  DD: { icon: doubleDeckerIcon, label: 'Double-decker bus' },
}

// Only the leading bus gets an icon — that's the timing the row is built around.
function nextDeck(service) {
  return deckIcons[service.deckTypes?.[0]] ?? null
}

function toggle() {
  expanded.value = !expanded.value
}
</script>

<template>
  <div
    class="bus-stop-card"
    role="button"
    tabindex="0"
    :aria-expanded="expanded"
    @click="toggle"
    @keydown.enter.prevent="toggle"
    @keydown.space.prevent="toggle"
  >
    <div class="header">
      <div class="info">
        <div class="name">{{ name }}</div>
        <div class="meta">
          <span v-if="road">{{ road }}</span>
          <span v-if="road && distance" class="dot">&middot;</span>
          <span v-if="distance">{{ distance }}</span>
        </div>
      </div>
      <button
        class="favourite-button"
        :class="{ active: isFavourite }"
        @click.stop="emit('toggle-favourite')"
      >
        <span
          class="icon"
          :style="{ maskImage: `url(${heartIcon})`, WebkitMaskImage: `url(${heartIcon})` }"
        />
      </button>
    </div>

    <!-- Taps inside the scrollable table shouldn't collapse the card mid-scroll. -->
    <div
      v-if="expanded"
      class="arrivals-table"
      :class="{ scrollable: maxExpandedHeight }"
      :style="maxExpandedHeight ? { maxHeight: maxExpandedHeight } : null"
      @click.stop
    >
      <div
        v-for="service in sortedServices"
        :key="service.code"
        class="row"
        role="button"
        tabindex="0"
        @click="emit('select-service', service.code)"
        @keydown.enter.prevent="emit('select-service', service.code)"
        @keydown.space.prevent="emit('select-service', service.code)"
      >
        <div class="row-code" :style="codeStyle(service.code)">{{ service.code }}</div>
        <div class="row-times">
          <div class="next-line" :class="arrivalClass(service.arrivals[0])">
            <span
              v-if="nextDeck(service)"
              class="deck-icon"
              role="img"
              :aria-label="nextDeck(service).label"
              :title="nextDeck(service).label"
              v-html="nextDeck(service).icon"
            />
            <div class="next">{{ formatArrival(service.arrivals[0]) }}</div>
          </div>
          <div v-if="laterArrivals(service.arrivals).length" class="later">
            {{ laterArrivals(service.arrivals).map(formatArrival).join(', ') }}
          </div>
        </div>
      </div>
      <div v-if="!sortedServices.length" class="empty">No services running right now.</div>
    </div>

    <div v-else class="services">
      <div v-for="service in sortedServices" :key="service.code" class="service">
        <div class="code" :style="codeStyle(service.code)">{{ service.code }}</div>
        <div class="arrival" :class="arrivalClass(service.arrivals[0])">
          {{ formatArrival(service.arrivals[0]) }}
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

.meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #9a9a9a;
  margin-top: 2px;
}

.dot {
  line-height: 1;
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
  min-height: 44px;
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
  font-weight: 500;
}

.arrival.soon {
  color: #d97706;
}

.arrival.urgent {
  color: #16a34a;
  font-weight: 700;
}

.arrivals-table {
  margin-top: 12px;
  min-height: 44px;
}

.arrivals-table.scrollable {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid #f0f0f0;
}

.row:first-child {
  border-top: none;
  padding-top: 2px;
}

.row-code {
  /* The collapsed pill is ~25px tall with an 8px radius; this one is ~40px. */
  border-radius: 13px;
  padding: 8px 12px;
  font-size: 20px;
  font-weight: 700;
  width: 60px;
  flex-shrink: 0;
  text-align: center;
}

.row-times {
  text-align: right;
}

.next-line {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  color: #000;
}

.next-line.soon {
  color: #d97706;
}

.next-line.urgent {
  color: #16a34a;
}

.next {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
}

/* Deliberately neutral: the vehicle type is reference detail, so it stays grey
   while the timing beside it keeps the urgency colour. */
.deck-icon {
  display: flex;
  flex-shrink: 0;
  color: #9a9a9a;
}

.deck-icon :deep(svg) {
  width: 16px;
  height: 16px;
  display: block;
}

.later {
  margin-top: 3px;
  font-size: 12px;
  font-weight: 500;
  color: #9a9a9a;
}

.empty {
  font-size: 13px;
  color: #9a9a9a;
  padding: 12px 0;
}
</style>
