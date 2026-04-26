export default defineNuxtConfig({
  modules: ['../src/module'],
  cmdk: {
    paletteShortcut: 'mod+k',
    search: 'fuzzy',
  },
  ssr: false,
  devtools: { enabled: true },
  compatibilityDate: '2025-01-01',
})
