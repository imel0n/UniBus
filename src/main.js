import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './assets/app.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

document.addEventListener('contextmenu', (event) => event.preventDefault())

document.addEventListener('gesturestart', (event) => event.preventDefault())
document.addEventListener('gesturechange', (event) => event.preventDefault())
document.addEventListener(
  'touchmove',
  (event) => {
    if (event.touches.length > 1) event.preventDefault()
  },
  { passive: false },
)

app.mount('#app')
