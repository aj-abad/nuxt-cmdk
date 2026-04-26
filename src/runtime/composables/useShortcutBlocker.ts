import type { MaybeRef } from 'vue'
import { isRef, ref, watch, onUnmounted } from 'vue'
import { pushShortcutBlocker, popShortcutBlocker } from './commandRegistry'

/**
 * Pauses sequence shortcuts while the given ref is `true`.
 * Use when dropdowns, context menus, or other overlays are open
 * so that shortcut keys (especially multi-step ones like "g d") don't fire underneath.
 */
export function useShortcutBlocker(isOpen: MaybeRef<boolean>) {
  const openRef = isRef(isOpen) ? isOpen : ref(isOpen)

  watch(
    openRef,
    (open) => {
      if (open) pushShortcutBlocker()
      else popShortcutBlocker()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (openRef.value) popShortcutBlocker()
  })
}
