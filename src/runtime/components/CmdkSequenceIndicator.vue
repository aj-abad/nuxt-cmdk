<template>
  <!--
    Wrapped in <ClientOnly> because sequenceState only ever activates from a
    keyboard listener that's client-only, and Teleport to="body" has no target
    during SSR.
  -->
  <ClientOnly>
    <Teleport to="body">
      <div class="cmdk-sr-only" role="status" aria-live="polite" aria-atomic="true">
        {{ sequenceState.announcement }}
      </div>
      <Transition name="cmdk-sequence">
        <div v-if="sequenceState.active" class="cmdk-sequence" aria-hidden="true">
          <CmdkShortcut :keys="sequenceState.pressedKeys" />
          <span class="cmdk-sequence-ellipsis">...</span>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { sequenceState } from '../composables/commandRegistry'
import CmdkShortcut from './CmdkShortcut.vue'
</script>

<style scoped>
.cmdk-sequence {
  position: fixed;
  bottom: 5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 99;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  background: var(--cmdk-bg, rgb(255 255 255 / 0.9));
  border: 1px solid var(--cmdk-border, rgb(0 0 0 / 0.1));
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.05);
  color: var(--cmdk-fg, rgb(0 0 0 / 0.8));
}

.cmdk-sequence-ellipsis {
  font-size: 0.75rem;
  color: var(--cmdk-muted-fg, rgb(0 0 0 / 0.4));
  letter-spacing: 0.05em;
}

/*
 * <Transition name="cmdk-sequence"> is kept as a hook with no default rules.
 * Consumers can opt into enter/leave animations like:
 *   .cmdk-sequence-enter-from,
 *   .cmdk-sequence-leave-to   { opacity: 0; }
 *   .cmdk-sequence-enter-active,
 *   .cmdk-sequence-leave-active { transition: opacity 150ms ease; }
 */

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
