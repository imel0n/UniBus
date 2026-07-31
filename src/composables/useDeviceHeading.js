import { onBeforeUnmount, ref } from 'vue'

// Compass heading in degrees clockwise from true north, or null when the device
// can't supply one (no magnetometer, permission refused, desktop browser).
export function useDeviceHeading() {
  const heading = ref(null)
  let listening = false

  function onOrientation(event) {
    // iOS exposes a ready-made compass heading; everyone else reports alpha,
    // which counts anticlockwise from north when `absolute` is set.
    if (typeof event.webkitCompassHeading === 'number') {
      heading.value = event.webkitCompassHeading
      return
    }
    if (event.absolute && typeof event.alpha === 'number') {
      heading.value = (360 - event.alpha) % 360
    }
  }

  function listen() {
    if (listening) return
    listening = true
    // Not every browser fires the absolute variant, so take whichever arrives.
    window.addEventListener('deviceorientationabsolute', onOrientation)
    window.addEventListener('deviceorientation', onOrientation)
  }

  // Safari on iOS only hands out orientation data if asked from a user gesture,
  // so this has to be called from a tap rather than on mount.
  async function enable() {
    if (typeof window.DeviceOrientationEvent === 'undefined') return

    const request = window.DeviceOrientationEvent.requestPermission
    if (typeof request !== 'function') {
      listen()
      return
    }

    try {
      if ((await request()) === 'granted') listen()
    } catch {
      // A refusal just means no cone — the dot alone is still useful.
    }
  }

  onBeforeUnmount(() => {
    window.removeEventListener('deviceorientationabsolute', onOrientation)
    window.removeEventListener('deviceorientation', onOrientation)
    listening = false
  })

  return { heading, enable }
}
