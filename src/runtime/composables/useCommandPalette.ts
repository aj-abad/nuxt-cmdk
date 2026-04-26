import { ref } from 'vue'
import {
  resetSequence,
  pushShortcutBlocker,
  popShortcutBlocker,
} from './commandRegistry'

const isOpen = ref(false)
let previouslyFocusedElement: HTMLElement | null = null

/**
 * Imperative control over the command palette dialog.
 * Returns reactive open state plus open/close/toggle methods. State is shared
 * across all callers — calling `open()` from anywhere shows the same palette.
 *
 * @example
 * ```ts
 * const { isOpen, open, close, toggle } = useCommandPalette()
 *
 * // Open from a button
 * <button @click="open()">Open palette</button>
 *
 * // Conditional rendering
 * <div v-if="isOpen">Palette is open</div>
 * ```
 *
 * @example Restore focus after the palette closes
 * ```ts
 * // Useful when the palette is closed via custom code paths.
 * // Reka's Dialog already restores focus on its own close path, so most
 * // consumers never need this.
 * const { close, restoreFocus } = useCommandPalette()
 * close()
 * restoreFocus()
 * ```
 */
export function useCommandPalette() {
  const open = () => {
    // SSR safety: palette is client-only. Don't mutate the singleton on the server.
    if (typeof document === 'undefined') return
    if (isOpen.value) return
    resetSequence()
    previouslyFocusedElement = document.activeElement as HTMLElement | null
    isOpen.value = true
    pushShortcutBlocker()
  }

  const close = () => {
    if (typeof document === 'undefined') return
    if (!isOpen.value) return
    isOpen.value = false
    popShortcutBlocker()
  }

  const restoreFocus = () => {
    const elementToFocus = previouslyFocusedElement
    previouslyFocusedElement = null

    if (elementToFocus && typeof elementToFocus.focus === 'function') {
      requestAnimationFrame(() => {
        elementToFocus.focus()
      })
    }
  }

  const toggle = () => {
    if (isOpen.value) close()
    else open()
  }

  return { isOpen, open, close, toggle, restoreFocus }
}
