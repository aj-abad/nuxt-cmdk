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
  const callHookSafely = (hookName: 'cmdk:error' | 'cmdk:executed', ...args: unknown[]) => {
    Promise.resolve(nuxtApp.callHook(hookName as never, ...(args as never[])))
      .catch((hookErr) => {
        console.error(`[cmdk] hook "${hookName}" threw:`, hookErr)
      })
  }

  setCommandHooks({
    onError: (err, cmd) => {
      console.error(`[cmdk] command "${cmd.id}" threw:`, err)
      callHookSafely('cmdk:error', err, cmd)
    },
    onExecuted: (cmd) => {
      callHookSafely('cmdk:executed', cmd)
    },
  })

  if (config.paletteShortcut !== false) {
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

declare module '#app' {
  interface RuntimeNuxtHooks {
    'cmdk:error': (err: unknown, cmd: Command) => void
    'cmdk:executed': (cmd: Command) => void
  }
}
