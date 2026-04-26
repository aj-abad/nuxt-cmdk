<template>
  <section>
    <h2>Home</h2>
    <p>Press <kbd>⌘K</kbd> to open the palette, or try <kbd>G</kbd> then <kbd>A</kbd> to navigate.</p>
    <p>Page-scoped command: press <kbd>⌘ ⇧ S</kbd> to "save" (simulated, 1s).</p>
  </section>
</template>

<script setup lang="ts">
useCommands([
  {
    id: 'home:save',
    name: 'Save (simulated)',
    group: 'Home',
    shortcut: 'mod+shift+s',
    action: () => new Promise(res => setTimeout(res, 1000)),
  },
])
</script>

<style scoped>
section {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 0.75rem;
  padding: 1.5rem;
}
kbd {
  background: #eee;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
}
</style>
