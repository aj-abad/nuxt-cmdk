import { onUnmounted, watch, isRef, type MaybeRef } from 'vue'
import { registerCommand, unregisterCommand, type Command } from './commandRegistry'

export type CommandInput = Omit<Command, 'id'> & { id?: string }

/**
 * Register a list of commands scoped to the current component.
 * Commands are auto-unregistered on unmount.
 *
 * Accepts a plain array, a `ref`, or a `computed`. For reactive sources, the
 * registry is updated incrementally:
 *
 * - **New IDs** are registered.
 * - **Removed IDs** are unregistered.
 * - **IDs present in both** are only re-registered if a structural field
 *   (`name`, `group`, `shortcut`, `keywords`, `priority`, `hidden`) changed.
 *
 * The `action` callback is intentionally **not** part of the structural
 * comparison — inline arrow functions get a new reference on every render and
 * would otherwise force a full re-register on every tick. This means that if
 * you change the action's *function reference* without changing any other
 * field, the previously-registered closure stays in place.
 *
 * The fix is to read reactive state *inside* the action body, e.g.:
 *
 * ```ts
 * // ✅ closure re-reads `isAdmin.value` at call time
 * action: () => isAdmin.value ? hardReset() : softReset()
 *
 * // ⚠️ captures the function reference at compute time; won't update
 * action: isAdmin.value ? hardReset : softReset
 * ```
 *
 * @example Static array
 * ```ts
 * useCommands([
 *   {
 *     id: 'go-home',
 *     name: 'Go to Home',
 *     group: 'Navigation',
 *     shortcut: 'g h',
 *     action: () => navigateTo('/'),
 *   },
 *   {
 *     id: 'save-doc',
 *     name: 'Save Document',
 *     shortcut: 'mod+s',
 *     keywords: ['write', 'persist'],
 *     action: async () => { await save() },
 *   },
 * ])
 * ```
 *
 * @example Reactive set — commands toggle based on state
 * ```ts
 * const isDirty = ref(false)
 * useCommands(computed(() => isDirty.value ? [{
 *   id: 'save',
 *   name: 'Save Changes',
 *   shortcut: 'mod+s',
 *   action: save,
 * }] : []))
 * ```
 *
 * @example Hidden shortcut (fires but doesn't appear in palette)
 * ```ts
 * useCommands([{
 *   id: 'select-all',
 *   name: 'Select All',
 *   shortcut: 'mod+a',
 *   hidden: true,
 *   action: selectAll,
 * }])
 * ```
 */
export function useCommands(commandsInput: MaybeRef<CommandInput[]>) {
  // SSR safety: the palette, keyboard listener, and registry are all client-only.
  // Bail early on the server so user setup() calls don't mutate the module-level
  // registry singleton across requests.
  if (typeof window === 'undefined') {
    return { unregister: () => {} }
  }

  // Tracks what's currently registered for this useCommands() instance.
  // Reassigned (not mutated) on each register() so the closure in unregister/
  // onUnmounted always sees the latest map.
  let previous = new Map<string, CommandInput>()

  // Stable auto-IDs by array position — so the same slot keeps the same ID
  // across watch fires and the diff can recognize unchanged commands.
  // Reorder the array and the alignment breaks; that's the documented hazard
  // of skipping explicit IDs.
  const autoIds: string[] = []
  let warnedAboutMissingId = false

  const idFor = (cmd: CommandInput, i: number): string => {
    if (cmd.id) return cmd.id
    if (!warnedAboutMissingId) {
      console.warn(
        '[cmdk] command registered without an explicit `id`. Auto-generated IDs '
        + 'collide easily, are unfriendly to debug, and break incremental updates '
        + 'for reactive command sets — provide an `id`.',
        cmd,
      )
      warnedAboutMissingId = true
    }
    if (!autoIds[i]) {
      autoIds[i] = `cmdk-auto-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`
    }
    return autoIds[i]!
  }

  const structurallyEqual = (a: CommandInput, b: CommandInput): boolean => {
    if (a === b) return true
    if (a.name !== b.name) return false
    if (a.group !== b.group) return false
    if (a.shortcut !== b.shortcut) return false
    if ((a.priority ?? 0) !== (b.priority ?? 0)) return false
    if (!!a.hidden !== !!b.hidden) return false

    // Shallow-compare keywords by length + per-entry identity.
    const ak = a.keywords
    const bk = b.keywords
    if (ak !== bk) {
      if (!ak || !bk || ak.length !== bk.length) return false
      for (let i = 0; i < ak.length; i++) {
        if (ak[i] !== bk[i]) return false
      }
    }

    // `action` intentionally skipped — see JSDoc.
    return true
  }

  const register = (cmds: CommandInput[]) => {
    const next = new Map<string, CommandInput>()

    cmds.forEach((cmd, i) => {
      const id = idFor(cmd, i)
      next.set(id, cmd)
      const prev = previous.get(id)
      if (!prev || !structurallyEqual(prev, cmd)) {
        registerCommand({ ...cmd, id })
      }
    })

    for (const oldId of previous.keys()) {
      if (!next.has(oldId)) unregisterCommand(oldId)
    }

    previous = next
  }

  if (isRef(commandsInput)) {
    watch(commandsInput, newCmds => register(newCmds), { immediate: true, deep: true })
  }
  else {
    register(commandsInput)
  }

  const teardown = () => {
    for (const id of previous.keys()) unregisterCommand(id)
    previous = new Map()
  }

  onUnmounted(teardown)

  return { unregister: teardown }
}
