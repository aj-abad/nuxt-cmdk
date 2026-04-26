import { reactive, computed } from 'vue'

export interface Command {
  /** Stable unique identifier. Required for reliable registration & debugging. */
  id: string
  /** Display name shown in the palette and used for search. */
  name: string
  /** Optional category, shown as a section header in the palette. */
  group?: string
  /** Shortcut string. Single step ("mod+k") or sequence ("g d"). */
  shortcut?: string
  /** Search aliases — useful for fuzzy matching ("home" → "Go to Dashboard"). */
  keywords?: string[]
  /** Sync or async handler. Errors are caught and broadcast via `cmdk:error`. */
  action: () => void | Promise<void>
  /** Higher = appears first in palette and wins on exact-shortcut match. Default 0. */
  priority?: number
  /** When true, the shortcut still fires but the command is omitted from the palette. */
  hidden?: boolean
}

interface ParsedShortcut {
  mod: boolean
  shift: boolean
  alt: boolean
  key: string
}

interface ParsedSequence {
  steps: ParsedShortcut[]
}

const registry = reactive(new Map<string, Command>())
let listenerAttached = false

let shortcutBlockerCount = 0

export function pushShortcutBlocker() {
  shortcutBlockerCount++
  if (sequenceState.active) cancelSequence()
}

export function popShortcutBlocker() {
  shortcutBlockerCount = Math.max(0, shortcutBlockerCount - 1)
}

export const commands = computed(() =>
  [...registry.values()].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)),
)

/** Reactive set of currently-running async command IDs. The palette uses this for spinners. */
export const runningCommandIds = reactive(new Set<string>())

export function registerCommand(cmd: Command) {
  registry.set(cmd.id, cmd)
  ensureListener()
}

export function unregisterCommand(id: string) {
  registry.delete(id)
}

let onError: ((err: unknown, cmd: Command) => void) | null = null
let onExecuted: ((cmd: Command) => void) | null = null

export function setCommandHooks(hooks: {
  onError?: (err: unknown, cmd: Command) => void
  onExecuted?: (cmd: Command) => void
}) {
  if (hooks.onError) onError = hooks.onError
  if (hooks.onExecuted) onExecuted = hooks.onExecuted
}

export async function executeCommand(cmd: Command) {
  runningCommandIds.add(cmd.id)
  try {
    await cmd.action()
    onExecuted?.(cmd)
  }
  catch (err) {
    if (onError) onError(err, cmd)
    else console.error(`[cmdk] command "${cmd.id}" threw:`, err)
  }
  finally {
    runningCommandIds.delete(cmd.id)
  }
}

export const sequenceState = reactive({
  pressedKeys: [] as string[],
  active: false,
  announcement: '',
})

let sequenceTimeout: ReturnType<typeof setTimeout> | null = null
let sequenceTimeoutMs = 1500

export function setSequenceTimeoutMs(ms: number) {
  sequenceTimeoutMs = ms
}

export function resetSequence() {
  sequenceState.pressedKeys = []
  sequenceState.active = false
  sequenceState.announcement = ''
  if (sequenceTimeout) {
    clearTimeout(sequenceTimeout)
    sequenceTimeout = null
  }
}

function cancelSequence() {
  if (!sequenceState.active) return
  sequenceState.announcement = 'Shortcut cancelled'
  sequenceState.pressedKeys = []
  sequenceState.active = false
  if (sequenceTimeout) {
    clearTimeout(sequenceTimeout)
    sequenceTimeout = null
  }
  setTimeout(() => {
    if (sequenceState.announcement === 'Shortcut cancelled') {
      sequenceState.announcement = ''
    }
  }, 1000)
}

const parseStep = (token: string): ParsedShortcut => {
  const parts = token.toLowerCase().split('+')
  return {
    mod: parts.includes('mod') || parts.includes('cmd') || parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('option'),
    key: parts.filter(p => !['mod', 'cmd', 'ctrl', 'shift', 'alt', 'option'].includes(p))[0] || '',
  }
}

const parseSequence = (shortcut: string): ParsedSequence => {
  const tokens = shortcut.trim().split(/\s+/)
  return { steps: tokens.map(parseStep) }
}

const matchesStep = (e: KeyboardEvent, step: ParsedShortcut): boolean => {
  const modPressed = e.metaKey || e.ctrlKey
  if (step.mod && !modPressed) return false
  if (step.shift && !e.shiftKey) return false
  if (step.alt && !e.altKey) return false
  if (!step.mod && (e.metaKey || e.ctrlKey)) return false
  if (!step.shift && e.shiftKey) return false
  if (!step.alt && e.altKey) return false
  return e.key.toLowerCase() === step.key
}

const stepLabel = (step: ParsedShortcut): string => {
  const parts: string[] = []
  if (step.mod) parts.push('⌘')
  if (step.shift) parts.push('⇧')
  if (step.alt) parts.push('⌥')
  parts.push(step.key.toUpperCase())
  return parts.join('')
}

const handleKeyDown = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement
  const isInput
    = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
  if (isInput && !(e.metaKey || e.ctrlKey)) return

  if (shortcutBlockerCount > 0) return

  if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return

  if (e.key === 'Escape' && sequenceState.active) {
    cancelSequence()
    e.preventDefault()
    return
  }

  const sorted = [...registry.values()].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  const currentStepIndex = sequenceState.pressedKeys.length

  let exactMatch: Command | null = null
  let hasPartialMatch = false

  for (const cmd of sorted) {
    if (!cmd.shortcut) continue
    const seq = parseSequence(cmd.shortcut)

    if (seq.steps.length < currentStepIndex + 1) continue

    let prefixOk = true
    for (let i = 0; i < currentStepIndex; i++) {
      if (sequenceState.pressedKeys[i] !== stepLabel(seq.steps[i]!)) {
        prefixOk = false
        break
      }
    }
    if (!prefixOk) continue

    if (!matchesStep(e, seq.steps[currentStepIndex]!)) continue

    if (seq.steps.length === currentStepIndex + 1) {
      if (!exactMatch) exactMatch = cmd
    }
    else {
      hasPartialMatch = true
    }
  }

  if (!exactMatch && !hasPartialMatch) {
    if (sequenceState.active) cancelSequence()
    return
  }

  e.preventDefault()

  const currentStep = parseStep(buildStepToken(e))
  const label = stepLabel(currentStep)

  if (exactMatch) {
    // Exact match wins, even if there's a longer sequence that could also match.
    // Matches Linear's behavior — predictable and avoids surprise waits.
    resetSequence()
    void executeCommand(exactMatch)
    return
  }

  sequenceState.pressedKeys = [...sequenceState.pressedKeys, label]
  sequenceState.active = true
  sequenceState.announcement = `${sequenceState.pressedKeys.join(' ')} pressed, waiting for next key`

  if (sequenceTimeout) clearTimeout(sequenceTimeout)
  sequenceTimeout = setTimeout(cancelSequence, sequenceTimeoutMs)
}

const buildStepToken = (e: KeyboardEvent): string => {
  const parts: string[] = []
  if (e.metaKey || e.ctrlKey) parts.push('mod')
  if (e.shiftKey) parts.push('shift')
  if (e.altKey) parts.push('alt')
  parts.push(e.key.toLowerCase())
  return parts.join('+')
}

function onWindowBlur() {
  cancelSequence()
}

function onDocumentMouseDown() {
  cancelSequence()
}

function onDocumentFocusIn() {
  cancelSequence()
}

function ensureListener() {
  if (listenerAttached) return
  if (typeof window === 'undefined') return
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('blur', onWindowBlur)
  document.addEventListener('mousedown', onDocumentMouseDown)
  document.addEventListener('focusin', onDocumentFocusIn)
  listenerAttached = true
}

export function destroyListener() {
  if (typeof window === 'undefined') return
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('blur', onWindowBlur)
  document.removeEventListener('mousedown', onDocumentMouseDown)
  document.removeEventListener('focusin', onDocumentFocusIn)
  listenerAttached = false
  shortcutBlockerCount = 0
  resetSequence()
}
