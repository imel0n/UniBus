import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getAllFavourites, putFavourite, deleteFavourite } from '@/utils/idb'

export const useFavouritesStore = defineStore('favourites', () => {
  const favourites = ref([]) // [{ code, name, road, lat, lon }, ...]
  const status = ref('idle') // idle | loading | ready | error
  const error = ref(null)

  async function ensureLoaded() {
    if (status.value === 'ready' || status.value === 'loading') return

    status.value = 'loading'
    error.value = null
    try {
      favourites.value = await getAllFavourites()
      status.value = 'ready'
    } catch (err) {
      error.value = err
      status.value = 'error'
    }
  }

  function isFavourite(code) {
    return favourites.value.some((stop) => stop.code === code)
  }

  /** Optimistic: the list updates immediately, the write catches up after. */
  function toggle(stop) {
    if (isFavourite(stop.code)) {
      favourites.value = favourites.value.filter((entry) => entry.code !== stop.code)
      deleteFavourite(stop.code).catch(() => {})
      return
    }

    const entry = {
      code: stop.code,
      name: stop.name,
      road: stop.road,
      lat: stop.lat,
      lon: stop.lon,
    }
    favourites.value = [...favourites.value, entry]
    putFavourite(entry).catch(() => {})
  }

  return { favourites, status, error, ensureLoaded, isFavourite, toggle }
})
