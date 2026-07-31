import { ref, watch, onScopeDispose, onActivated, onDeactivated } from 'vue'
import { fetchBusArrivals } from '@/services/ltaApi'
import { mapArrivalServices } from '@/utils/arrivals'

/**
 * Polls live arrivals for a reactive list of stop codes. DataMall refreshes
 * upstream every 20 s, so polling any faster just burns quota. Polling pauses
 * while the tab is hidden and refreshes immediately when it comes back.
 */
export function useArrivalsPolling(stopCodesRef, { intervalMs = 20000 } = {}) {
  const arrivalsByStop = ref({})
  const lastUpdated = ref(null)

  let timer = null
  let inFlight = false

  async function refresh() {
    const codes = stopCodesRef.value ?? []
    if (!codes.length || inFlight) return

    inFlight = true
    try {
      const results = await Promise.allSettled(codes.map((code) => fetchBusArrivals(code)))
      const next = { ...arrivalsByStop.value }
      results.forEach((result, index) => {
        // A failed stop keeps its last-known arrivals rather than blanking out.
        if (result.status !== 'fulfilled') return
        next[codes[index]] = mapArrivalServices(result.value.Services)
      })
      arrivalsByStop.value = next
      lastUpdated.value = Date.now()
    } finally {
      inFlight = false
    }
  }

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  function startTimer() {
    stopTimer()
    timer = setInterval(refresh, intervalMs)
  }

  function onVisibilityChange() {
    if (document.hidden) {
      stopTimer()
    } else if ((stopCodesRef.value ?? []).length) {
      refresh()
      startTimer()
    }
  }

  watch(
    stopCodesRef,
    (codes) => {
      if (!codes?.length) {
        stopTimer()
        return
      }
      refresh()
      startTimer()
    },
    { immediate: true },
  )

  document.addEventListener('visibilitychange', onVisibilityChange)

  onDeactivated(stopTimer)
  onActivated(() => {
    if (!document.hidden && (stopCodesRef.value ?? []).length) {
      refresh()
      startTimer()
    }
  })

  onScopeDispose(() => {
    stopTimer()
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return { arrivalsByStop, lastUpdated, refresh }
}
