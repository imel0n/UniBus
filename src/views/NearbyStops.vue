<script setup>
import { ref } from 'vue'
import BusStopCard from '@/components/BusStopCard.vue'
import PageHeader from '@/components/PageHeader.vue'

const stops = ref([
  {
    name: 'Opp Blk 123',
    distance: '120 m',
    isFavourite: false,
    services: [
      { code: 'A1', arrival: 5 },
      { code: 'D1', arrival: 2 },
      { code: 'A2', arrival: 8 },
    ],
  },
  {
    name: 'Blk 456',
    distance: '340 m',
    isFavourite: true,
    services: [
      { code: 'D2', arrival: 4 },
      { code: 'A1', arrival: 11 },
    ],
  },
  {
    name: 'Opp Community Centre',
    distance: '500 m',
    isFavourite: false,
    services: [
      { code: 'A2', arrival: 1 },
      { code: 'D1', arrival: 6 },
      { code: 'D2', arrival: 9 },
      { code: 'A1', arrival: 13 },
    ],
  },
])

function toggleFavourite(stop) {
  stop.isFavourite = !stop.isFavourite
}
</script>

<template>
  <div>
    <PageHeader title="Nearby Stops" />
    <div class="stops-list">
      <BusStopCard
        v-for="stop in stops"
        :key="stop.name"
        :name="stop.name"
        :distance="stop.distance"
        :is-favourite="stop.isFavourite"
        :services="stop.services"
        @toggle-favourite="toggleFavourite(stop)"
      />
    </div>
  </div>
</template>

<style scoped>
.stops-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: calc(env(safe-area-inset-top) + 66px) 12px 12px;
}
</style>
