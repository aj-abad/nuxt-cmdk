# nuxt-cmdk

Linear-style command palette + keyboard shortcut registry for Nuxt. Composable-first, headless, themable via CSS variables.

## Features

- **Multi-step sequences** — `g d` to navigate, like Linear/Vercel
- **OS-aware modifiers** — `mod+k` resolves to `⌘K` on Mac, `Ctrl+K` elsewhere
- **Async actions** — `action: () => Promise<void>` with built-in loading state
- **Fuzzy search** — Fuse.js, with substring fallback
- **Scoped commands** — register per-component, auto-cleanup on unmount
- **Scoped CSS + CSS variables** — themable, no Tailwind dependency
- **Reka UI Dialog** — accessible, keyboard-driven
- **Overlay-aware** — `useShortcutBlocker` pauses shortcuts under dropdowns/menus
- **Error hooks** — `cmdk:error` and `cmdk:executed` for toast/log integration

## Install

```bash
pnpm add nuxt-cmdk reka-ui
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-cmdk'],
  cmdk: {
    paletteShortcut: 'mod+k',  // default
    search: 'fuzzy',           // 'fuzzy' | 'substring'
    sequenceTimeoutMs: 1500,
    prefix: 'Cmdk',            // component prefix
  },
})
```

Mount the palette and sequence indicator in your root layout:

```vue
<!-- app.vue or layouts/default.vue -->
<template>
  <NuxtPage />
  <CmdkPalette />
  <CmdkSequenceIndicator />
</template>
```

## Usage

### Register commands

```vue
<script setup lang="ts">
useCommands([
  {
    id: 'go-customers',
    name: 'Go to Customers',
    group: 'Navigation',
    shortcut: 'g c',
    action: () => navigateTo('/customers'),
  },
  {
    id: 'save-document',
    name: 'Save Document',
    shortcut: 'mod+s',
    keywords: ['write', 'persist'],
    action: async () => {
      await saveDocument()
    },
  },
])
</script>
```

Commands registered via `useCommands` are auto-unregistered on unmount.

### Hidden shortcuts

Set `hidden: true` to make a command shortcut-only — it won't show in the palette but the shortcut still fires:

```ts
useCommands([
  {
    id: 'select-all',
    name: 'Select All',
    shortcut: 'mod+a',
    hidden: true,
    action: selectAll,
  },
])
```

### Reactive command sets

Pass a `ref` or `computed` to enable/disable commands based on state:

```ts
const isDirty = ref(false)
const cmds = computed(() => isDirty.value ? [{
  id: 'save',
  name: 'Save Changes',
  shortcut: 'mod+s',
  action: save,
}] : [])

useCommands(cmds)
```

### Palette control

```ts
const { isOpen, open, close, toggle } = useCommandPalette()
```

### Block shortcuts under overlays

If you have a custom dropdown/menu/modal that doesn't already block shortcuts, use `useShortcutBlocker`:

```vue
<script setup lang="ts">
const menuOpen = ref(false)
useShortcutBlocker(menuOpen)
</script>
```

While `menuOpen` is true, all sequence shortcuts are paused (modifier shortcuts like `Cmd+K` still work via the palette's own listener).

### Listen to errors

```ts
const nuxtApp = useNuxtApp()
nuxtApp.hook('cmdk:error', (err, cmd) => {
  toast.error(`"${cmd.name}" failed: ${(err as Error).message}`)
})
nuxtApp.hook('cmdk:executed', (cmd) => {
  console.log(`ran ${cmd.id}`)
})
```

## Shortcut syntax

| Token | Meaning |
|---|---|
| `mod` | `Cmd` on Mac, `Ctrl` elsewhere |
| `cmd`, `ctrl` | Same as `mod` |
| `shift`, `alt`, `option` | Modifiers |
| `+` | Joins modifiers in a step (`mod+shift+s`) |
| ` ` (space) | Separates steps in a sequence (`g d`) |

Examples: `mod+k`, `mod+shift+p`, `g i`, `g g`, `escape`, `?`

## API

### `useCommands(commands)`

Registers a list of commands scoped to the current component. Accepts a static array or a `ref`/`computed` for reactive sets.

### `useCommandPalette()`

Returns `{ isOpen, open, close, toggle, restoreFocus }`.

### `useShortcutBlocker(isOpen)`

Pauses sequence shortcuts while the given ref is `true`. Auto-cleans on unmount.

### `defineCommand(cmd)`

Type-safe helper for authoring commands inline.

### `Command` type

```ts
interface Command {
  id: string
  name: string
  group?: string
  shortcut?: string
  keywords?: string[]
  action: () => void | Promise<void>
  priority?: number
  hidden?: boolean
}
```

## Theming

All visuals use CSS variables. Override at any level:

```css
:root {
  --cmdk-bg: #1a1a1a;
  --cmdk-fg: rgb(255 255 255 / 0.9);
  --cmdk-border: rgb(255 255 255 / 0.1);
  --cmdk-border-subtle: rgb(255 255 255 / 0.05);
  --cmdk-overlay-bg: rgb(0 0 0 / 0.5);
  --cmdk-active-bg: rgb(255 255 255 / 0.08);
  --cmdk-active-fg: #fff;
  --cmdk-muted-fg: rgb(255 255 255 / 0.5);
  --cmdk-placeholder: rgb(255 255 255 / 0.4);
  --cmdk-kbd-bg: rgb(255 255 255 / 0.1);
  --cmdk-radius: 0.75rem;
  --cmdk-max-width: 36rem;
  --cmdk-z-index: 300;
  --cmdk-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5);
}
```

## Module options

| Option | Type | Default | Description |
|---|---|---|---|
| `prefix` | `string` | `"Cmdk"` | Component prefix (`<CmdkPalette />`) |
| `search` | `'fuzzy' \| 'substring'` | `'fuzzy'` | Search algorithm |
| `paletteShortcut` | `string \| false` | `'mod+k'` | Open shortcut, or `false` to disable |
| `sequenceTimeoutMs` | `number` | `1500` | Time before partial sequences cancel |

## Development

```bash
pnpm install
pnpm dev:prepare   # generates .nuxt for typing
pnpm dev           # runs the playground
```

## Credits

Pattern adapted from [arcon-cpo](https://github.com/Arcon/arcon-cpo)'s internal command system. Multi-step sequence semantics inspired by Linear.

## License

MIT
