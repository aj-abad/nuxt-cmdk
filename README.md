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

## Animations

The palette ships with **no animations by default** — that's a deliberate choice so you can match your app's motion language and decide how to handle `prefers-reduced-motion` yourself.

### Open / close

`<CmdkPalette />` is built on Reka UI's Dialog, which sets `data-state="open"` and `data-state="closed"` on the overlay and content. Reka waits for any matching CSS animation (or transition) to finish before unmounting, so you only need CSS:

```css
.cmdk-overlay[data-state='open']  { animation: my-fade-in 150ms ease-out; }
.cmdk-overlay[data-state='closed'] { animation: my-fade-out 100ms ease-in; }

.cmdk-content[data-state='open']  { animation: my-scale-in 150ms ease-out; }
.cmdk-content[data-state='closed'] { animation: my-scale-out 100ms ease-in; }

@keyframes my-fade-in   { from { opacity: 0 } }
@keyframes my-fade-out  { to   { opacity: 0 } }
@keyframes my-scale-in  { from { opacity: 0; transform: translateX(-50%) scale(0.98) } }
@keyframes my-scale-out { to   { opacity: 0; transform: translateX(-50%) scale(0.98) } }
```

### Result list resize

When search filters the result list, the wrapper resizes instantly. To smooth it:

```css
.cmdk-list-wrap { transition: height 200ms ease; }
```

### Sequence indicator

`<CmdkSequenceIndicator />` is wrapped in `<Transition name="cmdk-sequence">`. Drop in your own classes:

```css
.cmdk-sequence-enter-from,
.cmdk-sequence-leave-to    { opacity: 0; transform: translateY(0.5rem); }
.cmdk-sequence-enter-active,
.cmdk-sequence-leave-active { transition: opacity 150ms ease, transform 150ms ease; }
```

### Loading indicator (per-command)

While an async command's promise is pending, `<CmdkPalette />` renders a small SVG spinner. The spinner uses SMIL and animates regardless of `prefers-reduced-motion`. To replace it (or remove it), use the `running` slot:

```vue
<CmdkPalette>
  <template #running="{ command }">
    <span class="my-loader" :aria-label="`Running ${command.name}`" />
  </template>
</CmdkPalette>
```

The slot only renders for commands that are currently executing.

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

## Using with Claude Code (and other AI agents)

This package ships an [`AGENTS.md`](./AGENTS.md) at its root with a dense, agent-friendly API summary — including behaviors that are easy to miss when scanning the source (e.g. `action` is excluded from structural diff, the `cmdk:toggle` id is reserved, exact-shortcut beats longer-sequence). Agents can read `node_modules/nuxt-cmdk/AGENTS.md` to load the API in one shot.

If you'd like Claude Code to use the palette pattern by default in your project, drop something like this into your `CLAUDE.md`:

```md
## Command palette and shortcuts

This project uses [nuxt-cmdk](https://www.npmjs.com/package/nuxt-cmdk).
- Register commands with `useCommands([...])` in the component that owns them — do not maintain a central registry.
- Always set an explicit `id` on each command.
- Read reactive state inside the `action` body, not by swapping the function reference.
- See `node_modules/nuxt-cmdk/AGENTS.md` for the full API.
```

## Credits

Pattern adapted from [arcon-cpo](https://github.com/Arcon/arcon-cpo)'s internal command system. Multi-step sequence semantics inspired by Linear.

## License

MIT
