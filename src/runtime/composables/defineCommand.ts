import type { CommandInput } from './useCommands'

/**
 * Type-safe helper for authoring commands. Pure pass-through at runtime —
 * exists so authors get inline `Command` autocomplete and validation in
 * standalone files (factories, helpers, command modules) where the type can't
 * be inferred from `useCommands([...])`.
 *
 * @example
 * ```ts
 * // commands/navigation.ts
 * export const goHome = defineCommand({
 *   id: 'go-home',
 *   name: 'Go to Home',
 *   shortcut: 'g h',
 *   action: () => navigateTo('/'),
 * })
 *
 * // app.vue
 * useCommands([goHome, ...])
 * ```
 */
export function defineCommand(cmd: CommandInput): CommandInput {
  return cmd
}
