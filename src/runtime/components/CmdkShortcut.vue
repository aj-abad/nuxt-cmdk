<template>
  <span class="cmdk-shortcut">
    <template v-for="(part, idx) in formattedParts" :key="idx">
      <span v-if="part.type === 'separator'" class="cmdk-shortcut-sep" aria-hidden="true">
        then
      </span>
      <span v-else-if="part.type === 'plus'" class="cmdk-shortcut-plus" aria-hidden="true">
        +
      </span>
      <kbd v-else class="cmdk-shortcut-kbd">{{ part.value }}</kbd>
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** Shortcut string ("mod+k", "g d") or array of pressed-key labels (["G", "D"]) */
  keys?: string | string[]
}
const props = defineProps<Props>()

/**
 * Detect Mac/iOS for ⌘ vs Ctrl labelling.
 *
 * `navigator.platform` is deprecated. Modern Chromium exposes
 * `navigator.userAgentData.platform`, but it's gated to HTTPS and not
 * implemented in Safari/Firefox — so we fall back to a userAgent regex,
 * which also catches iPad/iPhone (their external keyboards use ⌘).
 */
const isMac = ((): boolean => {
  if (typeof navigator === 'undefined') return false
  const uaData = (navigator as { userAgentData?: { platform?: string } }).userAgentData
  if (uaData?.platform) return /mac/i.test(uaData.platform)
  return /Mac|iPad|iPhone|iPod/i.test(navigator.userAgent)
})()

type ShortcutPart =
  | { type: 'kbd', value: string }
  | { type: 'separator' }
  | { type: 'plus' }

const formatStep = (step: string): ShortcutPart[] => {
  const keyParts = step.split('+').map((part): ShortcutPart => {
    const p = part.toLowerCase().trim()
    if (p === 'mod' || p === 'cmd' || p === 'ctrl' || p === '⌘') {
      return { type: 'kbd', value: isMac ? '⌘' : 'Ctrl' }
    }
    if (p === 'shift' || p === '⇧') return { type: 'kbd', value: '⇧' }
    if (p === 'alt' || p === 'option' || p === '⌥') {
      return { type: 'kbd', value: isMac ? '⌥' : 'Alt' }
    }
    return { type: 'kbd', value: part.toUpperCase() }
  })
  const result: ShortcutPart[] = []
  keyParts.forEach((p, i) => {
    if (i > 0) result.push({ type: 'plus' })
    result.push(p)
  })
  return result
}

const formattedParts = computed<ShortcutPart[]>(() => {
  if (!props.keys) return []

  if (Array.isArray(props.keys)) {
    const parts: ShortcutPart[] = []
    props.keys.forEach((key, i) => {
      if (i > 0) parts.push({ type: 'separator' })
      parts.push(...formatStep(key))
    })
    return parts
  }

  const steps = props.keys.trim().split(/\s+/)
  const parts: ShortcutPart[] = []
  steps.forEach((step, i) => {
    if (i > 0) parts.push({ type: 'separator' })
    parts.push(...formatStep(step))
  })
  return parts
})
</script>

<style scoped>
.cmdk-shortcut {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.cmdk-shortcut-sep {
  font-size: 0.6875rem;
  color: currentColor;
  opacity: 0.6;
}

.cmdk-shortcut-plus {
  font-size: 0.6875rem;
  opacity: 0.4;
}

.cmdk-shortcut-kbd {
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.25rem;
  border-radius: 0.375rem;
  background: var(--cmdk-kbd-bg, rgb(0 0 0 / 0.05));
  font-size: 0.6875rem;
  font-weight: 500;
  color: inherit;
}
</style>
