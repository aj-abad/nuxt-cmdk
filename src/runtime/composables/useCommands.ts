import { onUnmounted, watch, isRef, type MaybeRef } from 'vue'
import { registerCommand, unregisterCommand, type Command } from './commandRegistry'

export type CommandInput = Omit<Command, 'id'> & { id?: string }

export function useCommands(commandsInput: MaybeRef<CommandInput[]>) {
  let registeredIds: string[] = []

  const register = (cmds: CommandInput[]) => {
    registeredIds.forEach(unregisterCommand)
    registeredIds = []

    cmds.forEach((cmd, i) => {
      if (!cmd.id) {
        console.warn(
          '[cmdk] command registered without an explicit `id`. Auto-generated IDs collide easily and are unfriendly to debug.',
          cmd,
        )
      }
      const id = cmd.id || `auto-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`
      registerCommand({ ...cmd, id })
      registeredIds.push(id)
    })
  }

  if (isRef(commandsInput)) {
    watch(commandsInput, newCmds => register(newCmds), { immediate: true, deep: true })
  }
  else {
    register(commandsInput)
  }

  onUnmounted(() => {
    registeredIds.forEach(unregisterCommand)
  })

  return {
    unregister: () => {
      registeredIds.forEach(unregisterCommand)
      registeredIds = []
    },
  }
}
