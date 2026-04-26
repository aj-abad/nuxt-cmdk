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

  setCommandHooks({
    onError: (err, cmd) => {
      console.error(`[cmdk] command "${cmd.id}" threw:`, err)
      nuxtApp.callHook('cmdk:error' as never, err as never, cmd as never)
    },
    onExecuted: (cmd) => {
      nuxtApp.callHook('cmdk:executed' as never, cmd as never)
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
