<template>
  <div class="page">
    <header>
      <h1>nuxt-cmdk playground</h1>
      <nav>
        <NuxtLink to="/">Home</NuxtLink>
        <NuxtLink to="/about">About</NuxtLink>
      </nav>
      <button class="open-btn" @click="palette.open()">Open palette (⌘K)</button>
    </header>
    <main>
      <NuxtPage />
    </main>
    <CmdkPalette />
    <CmdkSequenceIndicator />
  </div>
</template>

<script setup lang="ts">
const palette = useCommandPalette()

useCommands([
  {
    id: 'go-home',
    name: 'Go to Home',
    group: 'Navigation',
    shortcut: 'g h',
    action: () => navigateTo('/'),
  },
  {
    id: 'go-about',
    name: 'Go to About',
    group: 'Navigation',
    shortcut: 'g a',
    action: () => navigateTo('/about'),
  },
  {
    id: 'demo-async',
    name: 'Simulate async work (2s)',
    group: 'Demo',
    keywords: ['loading', 'spinner'],
    action: () => new Promise(res => setTimeout(res, 2000)),
  },
  {
    id: 'demo-error',
    name: 'Throw an error',
    group: 'Demo',
    action: async () => {
      throw new Error('Demo error from "Throw an error" command')
    },
  },
])

const nuxtApp = useNuxtApp()
nuxtApp.hook('cmdk:error', (err, cmd) => {
  console.warn(`[playground] caught error from ${cmd.id}:`, err)
})
nuxtApp.hook('cmdk:executed', (cmd) => {
  console.log(`[playground] executed ${cmd.id}`)
})
</script>

<style>
body {
  margin: 0;
  font-family: ui-sans-serif, system-ui, sans-serif;
  background: #fafafa;
  color: #111;
}
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}
header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}
h1 {
  font-size: 1.25rem;
  margin: 0;
}
nav {
  display: flex;
  gap: 0.75rem;
  margin-left: auto;
}
nav a {
  color: #555;
  text-decoration: none;
  font-size: 0.875rem;
}
nav a.router-link-active {
  color: #000;
  font-weight: 600;
}
.open-btn {
  padding: 0.5rem 0.875rem;
  background: #000;
  color: #fff;
  border: 0;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
}
</style>
