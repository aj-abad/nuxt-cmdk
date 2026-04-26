# nuxt-cmdk — Agent Guide

Linear-style command palette + keyboard shortcut registry for Nuxt 3/4.
Headless, themable via CSS variables, composable-first.

This file is a dense API reference for AI agents and power users. For prose
docs and theming examples, see [`README.md`](./README.md).

## Setup

```bash
pnpm add nuxt-cmdk reka-ui
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-cmdk'],
  cmdk: {
    paletteShortcut: 'mod+k',  // default; set false to disable
    search: 'fuzzy',           // 'fuzzy' | 'substring'
    sequenceTimeoutMs: 1500,
    prefix: 'Cmdk',            // component prefix
  },
})
```

```vue
<!-- app.vue or root layout -->
<template>
  <NuxtPage />
  <CmdkPalette />
  <CmdkSequenceIndicator />
</template>
```

## Composables (auto-imported)

```ts
useCommands(commands: MaybeRef<CommandInput[]>): { unregister: () => void }
useCommandPalette(): { isOpen, open, close, toggle, restoreFocus }
useShortcutBlocker(isOpen: MaybeRef<boolean>): void
defineCommand(cmd: CommandInput): CommandInput
```

### Register commands (preferred pattern)

Register inside the component that owns the command. Auto-unregisters on unmount.

```ts
useCommands([
  {
    id: 'go-customers',
    name: 'Go to Customers',
    group: 'Navigation',
    shortcut: 'g c',
    action: () => navigateTo('/customers'),
  },
  {
    id: 'save',
    name: 'Save',
    shortcut: 'mod+s',
    keywords: ['write', 'persist'],
    action: async () => { await saveDoc() },
  },
])
```

### Reactive command sets

```ts
const isDirty = ref(false)
useCommands(computed(() => isDirty.value ? [saveCmd] : []))
```

## Components

Names use `cmdk.prefix` (default `Cmdk`).

- `<CmdkPalette />` — the dialog. Mount once in root layout.
- `<CmdkSequenceIndicator />` — visual hint for in-flight sequences.
- `<CmdkShortcut shortcut="mod+k" />` — render a styled keybinding label.

`CmdkPalette` exposes a `running` slot for replacing the per-command async spinner.

## Types

```ts
import type { Command, CommandInput, ModuleOptions } from 'nuxt-cmdk'

interface Command {
  id: string                          // stable, required
  name: string                        // displayed + searched
  group?: string                      // section header in palette
  shortcut?: string                   // see "Shortcut grammar"
  keywords?: string[]                 // search aliases
  action: () => unknown               // sync or async; errors caught
  priority?: number                   // higher = first, default 0
  hidden?: boolean                    // shortcut fires, hidden from palette
}

// CommandInput = Command with `id` optional (auto-generated if omitted, but
// auto-IDs warn and break incremental updates — always provide an id).
```

## Hooks

```ts
const nuxtApp = useNuxtApp()
nuxtApp.hook('cmdk:error',    (err: unknown, cmd: Command) => { ... })
nuxtApp.hook('cmdk:executed', (cmd: Command) => { ... })
```

## Shortcut grammar

| Token | Meaning |
|---|---|
| `mod` | `Cmd` on Mac, `Ctrl` elsewhere |
| `cmd`, `ctrl` | Synonyms for `mod` |
| `shift`, `alt`, `option` | Modifiers |
| `+` | Joins modifiers in a step (`mod+shift+s`) |
| ` ` (space) | Separates steps in a sequence (`g d`) |

Examples: `mod+k`, `mod+shift+p`, `g i`, `g g`, `escape`, `?`

## Behaviors that are easy to miss

- **`action` is excluded from structural diff.** `useCommands` re-registers a
  command only when `name`, `group`, `shortcut`, `keywords`, `priority`, or
  `hidden` change — not when the function reference changes. Read reactive
  state *inside* the action body, not by swapping which function you pass.
- **Plugin is client-only.** No commands register during SSR. `useCommands`
  bails out on the server.
- **Reserved id: `cmdk:toggle`** — used internally for the palette toggle.
- **Hidden commands** (`hidden: true`) still respond to shortcuts; just not in the list.
- **Exact-shortcut wins** over a longer sequence that could continue —
  matches Linear's UX. Don't design overlapping shortcuts (`g d` and `g`)
  expecting the longer one to wait.
- **Inputs are skipped** — sequence shortcuts don't fire while typing in
  `<input>`/`<textarea>`/`contenteditable`. Modifier shortcuts still work.
- **Priority decides ties** for both palette ordering AND exact-shortcut
  conflicts. Higher wins.
- **Reka UI Dialog/Popover already block sequences** via focus management.
  Use `useShortcutBlocker` only for custom overlay components.

## Module options

| Option | Type | Default |
|---|---|---|
| `prefix` | `string` | `"Cmdk"` |
| `search` | `'fuzzy' \| 'substring'` | `'fuzzy'` |
| `paletteShortcut` | `string \| false` | `'mod+k'` |
| `sequenceTimeoutMs` | `number` | `1500` |

## Theming

All visuals use CSS variables — no Tailwind, no animations by default.
See README for the full variable list and animation patterns.

Hooks for animation: `[data-state="open"]` / `[data-state="closed"]` on
`.cmdk-overlay` and `.cmdk-content`; Vue `<Transition name="cmdk-sequence">`
on the sequence indicator.
