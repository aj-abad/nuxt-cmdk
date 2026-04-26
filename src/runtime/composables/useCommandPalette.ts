import { ref } from 'vue'
import {
  resetSequence,
  pushShortcutBlocker,
  popShortcutBlocker,
} from './commandRegistry'

const isOpen = ref(false)
let previouslyFocusedElement: HTMLElement | null = null

export function useCommandPalette() {
  const open = () => {
    if (isOpen.value) return
    resetSequence()
    if (typeof document !== 'undefined') {
      previouslyFocusedElement = document.activeElement as HTMLElement | null
    }
    isOpen.value = true
    pushShortcutBlocker()
  }

  const close = () => {
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
