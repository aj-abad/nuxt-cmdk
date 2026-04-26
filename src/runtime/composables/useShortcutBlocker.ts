import type { MaybeRef } from 'vue'
import { isRef, ref, watch, onUnmounted } from 'vue'
import { pushShortcutBlocker, popShortcutBlocker } from './commandRegistry'

/**
 * Pauses sequence shortcuts while the given ref is `true`.
 * Use when dropdowns, context menus, or other overlays are open
 * so that shortcut keys (especially multi-step ones like "g d") don't fire underneath.
 *
 * Modifier shortcuts (e.g. `mod+k` for the palette toggle) are not affected —
 * those are owned by their listeners and continue to work.
 *
 * Reka UI's Dialog and Popover already block shortcuts via their own focus
 * management, so you only need this for custom overlay components.
 *
 * @example
 * ```ts
 * const menuOpen = ref(false)
 * useShortcutBlocker(menuOpen)
 *
 * // While menuOpen is true, "g d" sequences won't fire under the menu.
 * ```
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
