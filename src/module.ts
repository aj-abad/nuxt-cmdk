import { defineNuxtModule, addPlugin, addImports, addComponent, createResolver } from '@nuxt/kit'
import type { Command } from './runtime/composables/commandRegistry'
import type { CommandInput } from './runtime/composables/useCommands'

export type { Command, CommandInput }

/**
 * Module options for `nuxt-cmdk`. Set under the `cmdk` key in `nuxt.config.ts`.
 *
 * @example
 * ```ts
 * // nuxt.config.ts
 * export default defineNuxtConfig({
 *   modules: ['nuxt-cmdk'],
 *   cmdk: {
 *     paletteShortcut: 'mod+k',
 *     search: 'fuzzy',
 *     sequenceTimeoutMs: 1500,
 *     prefix: 'Cmdk',
 *   },
 * })
 * ```
 */
export interface ModuleOptions {
  /** Component name prefix. Default: "Cmdk" → <CmdkPalette /> */
  prefix?: string
  /** Search algorithm. Default: "fuzzy" (uses fuse.js). */
  search?: 'fuzzy' | 'substring'
  /** Shortcut to toggle the palette. Pass false to disable. Default: "mod+k" */
  paletteShortcut?: string | false
  /** Multi-step sequence timeout in ms. Default: 1500 */
  sequenceTimeoutMs?: number
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-cmdk',
    configKey: 'cmdk',
    compatibility: { nuxt: '>=3.0.0' },
  },
  defaults: {
    prefix: 'Cmdk',
    search: 'fuzzy',
    paletteShortcut: 'mod+k',
    sequenceTimeoutMs: 1500,
  },
  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    nuxt.options.runtimeConfig.public.cmdk = {
      search: options.search!,
      paletteShortcut: options.paletteShortcut!,
      sequenceTimeoutMs: options.sequenceTimeoutMs!,
    }

    addImports([
      { name: 'useCommands', from: resolve('./runtime/composables/useCommands') },
      { name: 'useCommandPalette', from: resolve('./runtime/composables/useCommandPalette') },
      { name: 'useShortcutBlocker', from: resolve('./runtime/composables/useShortcutBlocker') },
      { name: 'defineCommand', from: resolve('./runtime/composables/defineCommand') },
    ])

    const prefix = options.prefix || 'Cmdk'

    addComponent({
      name: `${prefix}Palette`,
      filePath: resolve('./runtime/components/CmdkPalette.vue'),
    })
    addComponent({
      name: `${prefix}SequenceIndicator`,
      filePath: resolve('./runtime/components/CmdkSequenceIndicator.vue'),
    })
    addComponent({
      name: `${prefix}Shortcut`,
      filePath: resolve('./runtime/components/CmdkShortcut.vue'),
    })

    // Client-only: the palette, listener, and registry mutations are all client-side.
    // Excluding the plugin from the server bundle prevents the singleton state in
    // commandRegistry from being mutated across SSR requests.
    addPlugin({ src: resolve('./runtime/plugin'), mode: 'client' })
  },
})

declare module '@nuxt/schema' {
  interface NuxtConfig {
    cmdk?: ModuleOptions
  }
  interface NuxtOptions {
    cmdk: ModuleOptions
  }
  interface PublicRuntimeConfig {
    cmdk: {
      search: 'fuzzy' | 'substring'
      paletteShortcut: string | false
      sequenceTimeoutMs: number
    }
  }
}

declare module '#app' {
  interface RuntimeNuxtHooks {
    'cmdk:error': (err: unknown, cmd: Command) => void
    'cmdk:executed': (cmd: Command) => void
  }
}
