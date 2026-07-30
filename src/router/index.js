import { createRouter, createWebHistory } from 'vue-router'
import NearbyStops from '../views/NearbyStops.vue'
import FavouriteStops from '../views/FavouriteStops.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: NearbyStops },
    { path: '/favourites', component: FavouriteStops },
  ],
})

export default router
