import { reactive, watch } from 'vue'

/**
 * Keeps card expansion state outside the cards themselves, so a re-render (a
 * refresh, a re-sort, a brief loading state) doesn't collapse what's open. A
 * stop that drops off the list loses its state — it's gone, not collapsed.
 */
export function useExpandedStops(stopCodesRef) {
  const expandedCodes = reactive(new Set())

  function isExpanded(code) {
    return expandedCodes.has(code)
  }

  function setExpanded(code, expanded) {
    if (expanded) expandedCodes.add(code)
    else expandedCodes.delete(code)
  }

  function expandAll() {
    ;(stopCodesRef.value ?? []).forEach((code) => expandedCodes.add(code))
  }

  function collapseAll() {
    expandedCodes.clear()
  }

  watch(stopCodesRef, (codes) => {
    const live = new Set(codes ?? [])
    expandedCodes.forEach((code) => {
      if (!live.has(code)) expandedCodes.delete(code)
    })
  })

  return { isExpanded, setExpanded, expandAll, collapseAll }
}
