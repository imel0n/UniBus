import { ref } from 'vue'

const OPTIONS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }

export function useGeolocation() {
  const coords = ref(null) // { lat, lon }
  const status = ref('idle') // idle | locating | ready | error
  const error = ref(null)

  function fail(message) {
    error.value = message
    status.value = 'error'
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      fail('Location isn’t available on this device.')
      return
    }
    if (window.isSecureContext === false) {
      fail('Location needs a secure (HTTPS) connection.')
      return
    }

    status.value = 'locating'
    error.value = null
    navigator.geolocation.getCurrentPosition(
      (position) => {
        coords.value = { lat: position.coords.latitude, lon: position.coords.longitude }
        status.value = 'ready'
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          fail('Location permission denied. Enable it to see stops near you.')
        } else {
          fail('Couldn’t get your location.')
        }
      },
      OPTIONS,
    )
  }

  return { coords, status, error, locate }
}
