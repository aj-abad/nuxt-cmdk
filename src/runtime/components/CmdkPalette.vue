<template>
  <!--
    Wrapped in <ClientOnly> because the palette is fundamentally client-side:
    it depends on a keyboard listener, focus management, and DOM teleportation.
    This also avoids hydration mismatches from <CmdkShortcut>'s navigator-based
    Mac/Win key labelling.
  -->
  <ClientOnly>
    <DialogRoot :open="isOpen" @update:open="handleOpenChange">
      <DialogPortal>
        <DialogOverlay class="cmdk-overlay" />
        <DialogContent
          class="cmdk-content"
          @open-auto-focus="handleOpenAutoFocus"
          @close-auto-focus="handleCloseAutoFocus"
        >
          <DialogTitle as="span" class="cmdk-sr-only">Command Palette</DialogTitle>
          <DialogDescription as="span" class="cmdk-sr-only">
            Search for a command or use keyboard shortcuts to navigate.
          </DialogDescription>

          <div class="cmdk-input-wrap">
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              class="cmdk-input"
              placeholder="Type a command or search…"
              role="combobox"
              aria-label="Command palette"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-expanded="true"
              aria-controls="cmdk-listbox"
              :aria-activedescendant="activeDescendant"
              @keydown="handleKeydown"
            />
          </div>

          <div class="cmdk-list-wrap" :style="{ height: `${listHeight}px` }">
            <div ref="scrollRef" class="cmdk-scroll">
              <ul id="cmdk-listbox" role="listbox" aria-label="Commands">
                <template v-for="item in flatItems" :key="item.cmd.id">
                  <li v-if="item.groupHeader" class="cmdk-group-label" role="presentation">
                    {{ item.groupHeader }}
                  </li>
                  <li
                    :id="`cmdk-option-${item.cmd.id}`"
                    :ref="(el) => setOptionRef(item.index, el as HTMLElement | null)"
                    role="option"
                    :aria-selected="item.index === activeIndex"
                    :class="['cmdk-option', { 'cmdk-option-active': item.index === activeIndex }]"
                    @click="selectCommand(item.cmd)"
                    @mouseenter="activeIndex = item.index"
                  >
                    <span class="cmdk-option-label">{{ item.cmd.name }}</span>
                    <div class="cmdk-option-meta">
                      <!--
                        Loading indicator. The default is an SVG spinner using SMIL
                        (animates regardless of prefers-reduced-motion). Override via
                        <template #running="{ command }">…</template> to render anything,
                        or nothing if you'd rather not show one.
                      -->
                      <slot
                        v-if="runningCommandIds.has(item.cmd.id)"
                        name="running"
                        :command="item.cmd"
                      >
                        <span class="cmdk-spinner" aria-label="Running">
                          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                            <circle
                              cx="12"
                              cy="12"
                              r="9"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2.5"
                              stroke-linecap="round"
                              stroke-dasharray="40 60"
                            >
                              <animateTransform
                                attributeName="transform"
                                type="rotate"
                                from="0 12 12"
                                to="360 12 12"
                                dur="800ms"
                                repeatCount="indefinite"
                              />
                            </circle>
                          </svg>
                        </span>
                      </slot>
                      <CmdkShortcut
                        v-if="item.cmd.shortcut"
                        :keys="item.cmd.shortcut"
                        class="cmdk-option-shortcut"
                      />
                    </div>
                  </li>
                </template>
                <li v-if="filteredCommands.length === 0" class="cmdk-empty">
                  No results found.
                </li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import Fuse from 'fuse.js'
import { useRuntimeConfig } from '#imports'
import {
  commands,
  runningCommandIds,
  executeCommand,
  type Command,
} from '../composables/commandRegistry'
import { useCommandPalette } from '../composables/useCommandPalette'
import CmdkShortcut from './CmdkShortcut.vue'

const config = useRuntimeConfig().public.cmdk

const { isOpen, close: closePalette, restoreFocus } = useCommandPalette()
const query = ref('')
const activeIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const scrollRef = ref<HTMLElement | null>(null)
const optionRefs = ref<Map<number, HTMLElement>>(new Map())

function setOptionRef(index: number, el: HTMLElement | null) {
  if (el) optionRefs.value.set(index, el)
  else optionRefs.value.delete(index)
}

function handleOpenChange(value: boolean) {
  if (!value) closePalette()
}

function handleOpenAutoFocus(event: Event) {
  event.preventDefault()
  nextTick(() => inputRef.value?.focus())
}

function handleCloseAutoFocus(event: Event) {
  event.preventDefault()
  query.value = ''
  activeIndex.value = 0
  restoreFocus()
}

const ITEM_HEIGHT = 44
const GROUP_LABEL_HEIGHT = 28
const MAX_VISIBLE_HEIGHT = 380
const MIN_HEIGHT = 52

const visibleCommands = computed(() => commands.value.filter(c => !c.hidden))

// Build the Fuse index only when the command set changes — not on every keystroke.
// Returns null when fuzzy search is disabled so the substring branch can short-circuit.
const fuse = computed(() => {
  if (config.search !== 'fuzzy') return null
  return new Fuse(visibleCommands.value, {
    keys: ['name', 'group', 'keywords'],
    threshold: 0.4,
    ignoreLocation: true,
  })
})

const filteredCommands = computed<Command[]>(() => {
  const q = query.value.trim()
  if (!q) return visibleCommands.value

  if (fuse.value) {
    return fuse.value.search(q).map(r => r.item)
  }

  const lower = q.toLowerCase()
  return visibleCommands.value.filter((c) => {
    if (c.name.toLowerCase().includes(lower)) return true
    if (c.group?.toLowerCase().includes(lower)) return true
    if (c.keywords?.some(k => k.toLowerCase().includes(lower))) return true
    return false
  })
})

const showGroups = computed(() => !query.value.trim())

interface FlatItem {
  cmd: Command
  index: number
  groupHeader?: string
}

const flatItems = computed<FlatItem[]>(() => {
  const items: FlatItem[] = []
  let lastGroup: string | undefined

  filteredCommands.value.forEach((cmd, idx) => {
    const groupHeader
      = showGroups.value && cmd.group !== lastGroup ? (cmd.group || undefined) : undefined
    lastGroup = cmd.group
    items.push({ cmd, index: idx, groupHeader })
  })

  return items
})

watch(filteredCommands, () => {
  activeIndex.value = 0
  if (scrollRef.value) scrollRef.value.scrollTop = 0
})

const listHeight = computed(() => {
  if (filteredCommands.value.length === 0) return MIN_HEIGHT
  let h = 8
  for (const item of flatItems.value) {
    if (item.groupHeader) h += GROUP_LABEL_HEIGHT
    h += ITEM_HEIGHT
  }
  return Math.min(h, MAX_VISIBLE_HEIGHT)
})

const activeDescendant = computed(() => {
  const cmd = filteredCommands.value[activeIndex.value]
  return cmd ? `cmdk-option-${cmd.id}` : undefined
})

function scrollActiveIntoView() {
  nextTick(() => {
    const el = optionRefs.value.get(activeIndex.value)
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    event.stopPropagation()
    closePalette()
    return
  }

  const count = filteredCommands.value.length
  let handled = true
  switch (event.key) {
    case 'ArrowDown':
      if (count > 0) {
        activeIndex.value = (activeIndex.value + 1) % count
        scrollActiveIntoView()
      }
      break
    case 'ArrowUp':
      if (count > 0) {
        activeIndex.value = (activeIndex.value - 1 + count) % count
        scrollActiveIntoView()
      }
      break
    case 'Home':
      if (count > 0) {
        activeIndex.value = 0
        scrollActiveIntoView()
      }
      break
    case 'End':
      if (count > 0) {
        activeIndex.value = count - 1
        scrollActiveIntoView()
      }
      break
    case 'Enter':
      if (count > 0) {
        const cmd = filteredCommands.value[activeIndex.value]
        if (cmd) selectCommand(cmd)
      }
      break
    case 'Tab':
      break
    case 'Escape':
      closePalette()
      break
    default:
      handled = false
  }
  if (handled) event.preventDefault()
}

function selectCommand(cmd: Command) {
  void executeCommand(cmd)
  closePalette()
}
</script>

<style scoped>
/*
 * No animations by default. Reka emits data-state="open"|"closed" on the overlay
 * and content, and waits for any matching CSS animation/transition to finish
 * before unmounting. Consumers can hook in like:
 *   .cmdk-overlay[data-state='open']  { animation: my-fade-in 150ms; }
 *   .cmdk-overlay[data-state='closed'] { animation: my-fade-out 150ms; }
 *   .cmdk-content[data-state='open']  { animation: my-scale-in 150ms; }
 *   .cmdk-content[data-state='closed'] { animation: my-scale-out 150ms; }
 * prefers-reduced-motion is the consumer's call.
 */
.cmdk-overlay {
  position: fixed;
  inset: 0;
  background: var(--cmdk-overlay-bg, rgb(0 0 0 / 0.2));
  backdrop-filter: blur(4px);
  z-index: var(--cmdk-z-index, 300);
}

.cmdk-content {
  position: fixed;
  z-index: var(--cmdk-z-index, 300);
  top: 7rem;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 2rem);
  max-width: var(--cmdk-max-width, 36rem);
  background: var(--cmdk-bg, #fff);
  color: var(--cmdk-fg, rgb(0 0 0 / 0.85));
  border-radius: var(--cmdk-radius, 0.75rem);
  box-shadow: var(--cmdk-shadow, 0 25px 50px -12px rgb(0 0 0 / 0.25));
  overflow: hidden;
  border: 1px solid var(--cmdk-border, rgb(0 0 0 / 0.05));
  font-family: var(--cmdk-font, inherit);
}

.cmdk-input-wrap {
  border-bottom: 1px solid var(--cmdk-border-subtle, rgb(0 0 0 / 0.05));
}

.cmdk-input {
  width: 100%;
  padding: 1rem;
  background: transparent;
  border: 0;
  outline: 0;
  color: inherit;
  font-size: 0.9375rem;
  font-family: inherit;
  box-sizing: border-box;
}
.cmdk-input::placeholder {
  color: var(--cmdk-placeholder, rgb(0 0 0 / 0.4));
}

.cmdk-list-wrap {
  /* Consumers who want a smooth resize when results filter can add:
     transition: height 200ms ease; */
  overflow: hidden;
}

.cmdk-scroll {
  height: 100%;
  overflow-y: auto;
  padding: 0.25rem;
  padding-right: 0.5rem;
  box-sizing: border-box;
}

#cmdk-listbox {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cmdk-group-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--cmdk-muted-fg, rgb(0 0 0 / 0.4));
  padding: 0.5rem 0.75rem 0.25rem;
  font-weight: 600;
}

.cmdk-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  cursor: pointer;
  border-radius: 0.5rem;
  height: 44px;
  box-sizing: border-box;
}

.cmdk-option-active {
  background: var(--cmdk-active-bg, rgb(0 0 0 / 0.05));
  color: var(--cmdk-active-fg, inherit);
}

.cmdk-option-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.cmdk-option-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--cmdk-muted-fg, rgb(0 0 0 / 0.6));
}

.cmdk-spinner {
  display: inline-flex;
  color: var(--cmdk-muted-fg, rgb(0 0 0 / 0.6));
}

.cmdk-empty {
  padding: 0.625rem 0.75rem;
  color: var(--cmdk-muted-fg, rgb(0 0 0 / 0.4));
  font-size: 0.875rem;
}

.cmdk-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

</style>
