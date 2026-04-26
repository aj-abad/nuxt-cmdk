import type { CommandInput } from './useCommands'

/** Type-safe helper for authoring commands inline. Pure pass-through at runtime. */
export function defineCommand(cmd: CommandInput): CommandInput {
  return cmd
}
