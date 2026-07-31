<script setup>
import { onBeforeUnmount, ref } from 'vue'

// Long enough that a deliberate hold is unambiguous, short enough that it lands
// before the browser's own long-press gestures do.
const HOLD_MS = 400
// A hold that drifts this far is a scroll or a drag, not a press.
const MOVE_TOLERANCE_PX = 10

const props = defineProps({
  ariaLabel: {
    type: String,
    required: true,
  },
  // [{ id, label }] — omit to keep the button a plain tap target.
  menuItems: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['click', 'select'])

const open = ref(false)
let holdTimer = null
let startPoint = null
// The pointerup that ends a hold still fires a click on the circle; it opened the
// menu, so it must not also fire the tap action.
let openedByHold = false

function cancelHold() {
  clearTimeout(holdTimer)
  holdTimer = null
  startPoint = null
}

function onPointerDown(event) {
  // A hold that opens the menu may swallow no click at all, since the circle stops
  // taking pointer events — so each fresh press starts from a clean flag.
  openedByHold = false
  if (!props.menuItems.length || open.value || event.button > 0) return

  startPoint = { x: event.clientX, y: event.clientY }
  holdTimer = setTimeout(() => {
    holdTimer = null
    openedByHold = true
    open.value = true
    // Confirms the threshold was crossed without the rider having to look.
    navigator.vibrate?.(10)
  }, HOLD_MS)
}

function onPointerMove(event) {
  if (!startPoint) return
  if (
    Math.abs(event.clientX - startPoint.x) > MOVE_TOLERANCE_PX ||
    Math.abs(event.clientY - startPoint.y) > MOVE_TOLERANCE_PX
  ) {
    cancelHold()
  }
}

function onClick() {
  if (openedByHold) {
    openedByHold = false
    return
  }
  emit('click')
}

function choose(item) {
  open.value = false
  emit('select', item.id)
}

onBeforeUnmount(cancelHold)
</script>

<template>
  <div class="circular-button-root" @keydown.esc="open = false">
    <div v-if="open" class="scrim" @pointerdown.stop="open = false" />

    <button
      class="circular-button"
      :class="{ 'circular-button--hidden': open }"
      type="button"
      :aria-label="ariaLabel"
      :aria-haspopup="menuItems.length ? 'menu' : undefined"
      :aria-expanded="menuItems.length ? open : undefined"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="cancelHold"
      @pointercancel="cancelHold"
      @pointerleave="cancelHold"
      @contextmenu.prevent
      @click="onClick"
    >
      <slot />
    </button>

    <Transition name="menu">
      <div v-if="open" class="menu" role="menu" :aria-label="ariaLabel">
        <button
          v-for="item in menuItems"
          :key="item.id"
          class="menu-item"
          type="button"
          role="menuitem"
          @click="choose(item)"
        >
          {{ item.label }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.circular-button-root {
  width: 54px;
  height: 54px;
}

/* Sits under the menu but over the page, so the next tap dismisses rather than
   reaching whatever is behind it. */
.scrim {
  position: fixed;
  inset: 0;
}

.circular-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border: none;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0px 16px rgba(0, 0, 0, 0.3);
  /* Keeps a hold from selecting text or raising iOS's own callout menu. */
  touch-action: manipulation;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.circular-button:active {
  background: #f5f5f5;
}

/* Left in place rather than removed, so the root keeps the size the views position. */
.circular-button--hidden {
  opacity: 0;
  transform: scale(0.7);
  pointer-events: none;
}

.menu {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  min-width: 208px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 0px 16px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.menu-item {
  position: relative;
  border: none;
  background: none;
  padding: 16px 18px;
  font: inherit;
  font-size: 16px;
  font-weight: 500;
  color: #000;
  text-align: left;
  white-space: nowrap;
}

/* Hairline between stacked rows, without a divider element per gap. */
.menu-item + .menu-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: #efefef;
}

.menu-item:active {
  background: #f5f5f5;
}

/* A pressed row swallows the lines on both of its edges, so the highlight reads
   as one clean shape. */
.menu-item:active::before,
.menu-item:active + .menu-item::before {
  display: none;
}

/* Grows out of the circle it replaced — same corner, same shadow. */
.menu-enter-active,
.menu-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.3, 1);
  transform-origin: calc(100% - 27px) calc(100% - 27px);
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: scale(0.35);
}
</style>
