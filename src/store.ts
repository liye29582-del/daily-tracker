import { create } from 'zustand'
import { UserSettings, DEFAULT_SETTINGS } from './types'
import { getSettings, updateSettings, addPomodoro, addFocusSeconds, updateTodo, getTodos, checkInTodo } from './db'
import { todayStr } from './utils'

type TimerMode = 'focus' | 'break'

interface TimerState {
  mode: TimerMode
  running: boolean
  active: boolean // 是否处于一段进行中的专注/休息会话（暂停也保持 true）
  remaining: number // 秒
  total: number // 秒
  todoId?: number
}

interface AppState {
  settings: UserSettings
  settingsLoaded: boolean
  loadSettings: () => Promise<void>
  saveSettings: (patch: Partial<UserSettings>) => Promise<void>

  timer: TimerState
  selectTodo: (todoId?: number) => void
  startTimer: () => void
  startFocus: (minutes: number, todoId?: number) => void
  pauseTimer: () => void
  resetTimer: () => void
  switchMode: (mode: TimerMode) => void
  tick: () => void
  pendingCompleteTodoId: number | null
  finishAndAsk: () => void
  resolveComplete: (done: boolean) => Promise<void>
}

function modeTotal(mode: TimerMode, s: UserSettings): number {
  return (mode === 'focus' ? s.pomodoroLen : s.breakLen) * 60
}

export const useStore = create<AppState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  settingsLoaded: false,

  async loadSettings() {
    const s = await getSettings()
    set({
      settings: s,
      settingsLoaded: true,
      timer: {
        ...get().timer,
        total: modeTotal(get().timer.mode, s),
        remaining:
          get().timer.remaining > 0
            ? get().timer.remaining
            : modeTotal(get().timer.mode, s),
      },
    })
  },

  async saveSettings(patch) {
    const s = await updateSettings(patch)
    set({ settings: s })
  },

  timer: {
    mode: 'focus',
    running: false,
    active: false,
    remaining: DEFAULT_SETTINGS.pomodoroLen * 60,
    total: DEFAULT_SETTINGS.pomodoroLen * 60,
    todoId: undefined,
  },
  pendingCompleteTodoId: null,

  selectTodo(todoId) {
    set({ timer: { ...get().timer, todoId } })
  },

  startTimer() {
    const { timer, settings } = get()
    const total = timer.remaining > 0 ? timer.total : modeTotal(timer.mode, settings)
    const remaining = timer.remaining > 0 ? timer.remaining : total
    set({ timer: { ...timer, running: true, active: true, total, remaining } })
  },

  startFocus(minutes: number, todoId?: number) {
    const total = Math.max(1, Math.round(minutes)) * 60
    set({
      timer: {
        mode: 'focus',
        running: true,
        active: true,
        remaining: total,
        total,
        todoId,
      },
    })
  },

  pauseTimer() {
    set({ timer: { ...get().timer, running: false } })
  },

  resetTimer() {
    const { settings } = get()
    const total = modeTotal(get().timer.mode, settings)
    set({ timer: { ...get().timer, running: false, active: false, remaining: total, total } })
  },

  switchMode(mode) {
    const { settings } = get()
    const total = modeTotal(mode, settings)
    set({ timer: { ...get().timer, mode, running: false, remaining: total, total } })
  },

  finishAndAsk() {
    const { timer } = get()
    if (timer.todoId != null) set({ pendingCompleteTodoId: timer.todoId })
    const { settings } = get()
    const total = modeTotal(get().timer.mode, settings)
    const elapsed = Math.max(0, Math.round(timer.total - timer.remaining))
    const wasFocus = timer.mode === 'focus'
    const boundTodoId = timer.todoId
    set({ timer: { ...get().timer, running: false, active: false, remaining: total, total } })
    // 手动结束也记录本次专注（无论是否绑定待办），并同步到番茄钟界面
    if (wasFocus && elapsed > 0) {
      void (async () => {
        await addPomodoro({
          todoId: boundTodoId,
          start: Date.now() - elapsed * 1000,
          end: Date.now(),
          duration: elapsed,
          type: 'focus',
          done: true,
        })
        if (boundTodoId != null) await addFocusSeconds(boundTodoId, elapsed)
      })()
    }
  },

  resolveComplete: async (done: boolean) => {
    const id = get().pendingCompleteTodoId
    if (id != null) {
      const arr = await getTodos()
      const t = arr.find((x) => x.id === id)
      if (t?.kind === 'habit' && done) {
        // 习惯绑定番茄钟：完成 = 今日打卡
        await checkInTodo(id, todayStr())
      } else if (!t?.kind || t.kind === 'event') {
        await updateTodo(id, { done })
      }
      // 习惯且选择「否」：不变
    }
    set({ pendingCompleteTodoId: null })
  },

  tick() {
    const { timer, settings } = get()
    if (!timer.running) return
    const next = timer.remaining - 1
    if (next > 0) {
      set({ timer: { ...timer, remaining: next } })
      return
    }
    // 时间到，处理一段会话结束
    const finishedMode = timer.mode
    const durationSec = timer.total
    const boundTodoId = timer.todoId
    void (async () => {
      if (finishedMode === 'focus') {
        await addPomodoro({
          todoId: boundTodoId,
          start: Date.now() - durationSec * 1000,
          end: Date.now(),
          duration: durationSec,
          type: 'focus',
          done: true,
        })
        if (boundTodoId) await addFocusSeconds(boundTodoId, durationSec)
      } else {
        await addPomodoro({
          start: Date.now() - durationSec * 1000,
          end: Date.now(),
          duration: durationSec,
          type: 'break',
          done: true,
        })
      }
      // 焦点结束且绑定了待办 → 询问是否完成（仅绑定任务时问）
      if (finishedMode === 'focus' && boundTodoId != null) {
        set({ pendingCompleteTodoId: boundTodoId })
      }
    })()
    const nextMode: TimerMode = finishedMode === 'focus' ? 'break' : 'focus'
    const nextTotal = modeTotal(nextMode, settings)
    set({
      timer: {
        mode: nextMode,
        running: false,
        active: false,
        remaining: nextTotal,
        total: nextTotal,
        todoId: finishedMode === 'focus' ? timer.todoId : undefined,
      },
    })
  },
}))
