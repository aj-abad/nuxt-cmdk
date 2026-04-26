import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import {
  setCommandHooks,
  setSequenceTimeoutMs,
  registerCommand,
  type Command,
} from './composables/commandRegistry'
import { useCommandPalette } from './composables/useCommandPalette'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public.cmdk

  setSequenceTimeoutMs(config.sequenceTimeoutMs)

  // Hook handlers may be async or throw; isolate their failures so a buggy
  // user listener can't take down command execution.
  const safeOnError = (err: unknown, cmd: Command) => {
    console.error(`[cmdk] command "${cmd.id}" threw:`, err)
    Promise.resolve(nuxtApp.callHook('cmdk:error', err, cmd))
      .catch((hookErr) => {
        console.error('[cmdk] hook "cmdk:error" threw:', hookErr)
      })
  }
  const safeOnExecuted = (cmd: Command) => {
    Promise.resolve(nuxtApp.callHook('cmdk:executed', cmd))
      .catch((hookErr) => {
        console.error('[cmdk] hook "cmdk:executed" threw:', hookErr)
      })
  }

  setCommandHooks({
    onError: safeOnError,
    onExecuted: safeOnExecuted,
  })

  // Truthy check rather than `!== false` because Nuxt's runtime config type
  // inference narrows literal config values: when a user sets
  // `paletteShortcut: 'mod+k'`, the inferred runtime type is `string` (not
  // `string | false`), so `!== false` would be flagged as a type-overlap error.
  // Falsy here covers both the `false` opt-out and accidental empty strings.
  if (config.paletteShortcut) {
    const { toggle } = useCommandPalette()
    registerCommand({
      id: 'cmdk:toggle',
      name: 'Toggle Command Palette',
      shortcut: config.paletteShortcut,
      action: toggle,
      hidden: true,
      priority: -1000,
    })
  }
})
