import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './assets/app.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

document.addEventListener('contextmenu', (event) => event.preventDefault())

// The map owns its own pinch/zoom gestures, so blocking them there would break it.
// Touch events retarget to where the touch began, so this holds mid-gesture too.
function insideMap(event) {
  return event.target instanceof Element && event.target.closest('.leaflet-container') !== null
}

document.addEventListener('gesturestart', (event) => {
  if (!insideMap(event)) event.preventDefault()
})
document.addEventListener('gesturechange', (event) => {
  if (!insideMap(event)) event.preventDefault()
})
document.addEventListener(
  'touchmove',
  (event) => {
    if (event.touches.length > 1 && !insideMap(event)) event.preventDefault()
  },
  { passive: false },
)

app.mount('#app')
