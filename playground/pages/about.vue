<template>
  <section>
    <h2>About</h2>
    <p>This page registers a hidden shortcut that only works while you're here:</p>
    <p>Press <kbd>esc</kbd> to go back home.</p>
  </section>
</template>

<script setup lang="ts">
useCommands([
  {
    id: 'about:back-home',
    name: 'Back to Home',
    shortcut: 'escape',
    hidden: true,
    action: () => navigateTo('/'),
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
