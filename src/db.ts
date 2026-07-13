import {
  WeightRecord,
  Todo,
  PomodoroSession,
  UserSettings,
  DEFAULT_SETTINGS,
  MoodEntry,
  IntakeRecord,
  BowelRecord,
  Note,
} from './types'
import { periodRef, startOfWeek, startOfMonth } from './utils'

// 本地存储后端（localStorage）：兼容 file:// 与 https，无需 IndexedDB
const K = {
  weights: 'dt_weights',
  todos: 'dt_todos',
  pomodoros: 'dt_pomodoros',
  settings: 'dt_settings',
  moods: 'dt_moods',
  intakes: 'dt_intakes',
  bowels: 'dt_bowels',
  notes: 'dt_notes',
  seq: 'dt_seq',
}

function read<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as T[]
  } catch {
    return []
  }
}
function write<T>(key: string, val: T[]) {
  localStorage.setItem(key, JSON.stringify(val))
}
function nextId(): number {
  const cur = Number(localStorage.getItem(K.seq) || '0')
  const n = cur + 1
  localStorage.setItem(K.seq, String(n))
  return n
}

// ---------- 设置 ----------
export async function getSettings(): Promise<UserSettings> {
  const raw = localStorage.getItem(K.settings)
  if (!raw) {
    localStorage.setItem(K.settings, JSON.stringify(DEFAULT_SETTINGS))
    return { ...DEFAULT_SETTINGS }
  }
  return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as UserSettings) }
}

export async function updateSettings(patch: Partial<UserSettings>) {
  const s = await getSettings()
  const merged = { ...s, ...patch }
  localStorage.setItem(K.settings, JSON.stringify(merged))
  return merged
}

// ---------- 体重 ----------
export async function addWeight(rec: Omit<WeightRecord, 'id' | 'createdAt'>) {
  const arr = read<WeightRecord>(K.weights)
  const item: WeightRecord = { ...rec, id: nextId(), createdAt: Date.now() }
  arr.push(item)
  write(K.weights, arr)
  return item.id
}
export async function deleteWeight(id: number) {
  write(
    K.weights,
    read<WeightRecord>(K.weights).filter((w) => w.id !== id),
  )
}
export async function getWeights(): Promise<WeightRecord[]> {
  return read<WeightRecord>(K.weights).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

// ---------- 待办 ----------
export async function addTodo(t: Omit<Todo, 'id' | 'createdAt' | 'done'>) {
  const arr = read<Todo>(K.todos)
  const item: Todo = {
    ...t,
    id: nextId(),
    done: false,
    createdAt: Date.now(),
    period: t.period ?? 'day',
    kind: t.kind,
    goalDays: t.goalDays,
    checkIns: t.kind === 'habit' ? [] : undefined,
  }
  arr.push(item)
  write(K.todos, arr)
  return item.id
}

// 习惯打卡：记录当天完成，并据此更新完成状态
export async function checkInTodo(todoId: number, date: string) {
  const arr = read<Todo>(K.todos)
  const t = arr.find((x) => x.id === todoId)
  if (!t || t.kind !== 'habit') return
  const ins = new Set(t.checkIns ?? [])
  ins.add(date)
  const checkIns = [...ins]
  const start = t.period === 'month' ? startOfMonth(date) : t.period === 'week' ? startOfWeek(date) : date
  const inPeriod = checkIns.filter((d) => d >= start && d <= date).length
  const done = t.goalDays ? inPeriod >= t.goalDays : t.done
  write(
    K.todos,
    arr.map((x) => (x.id === todoId ? { ...x, checkIns, done } : x)),
  )
}
export async function updateTodo(id: number, patch: Partial<Todo>) {
  const arr = read<Todo>(K.todos).map((t) => (t.id === id ? { ...t, ...patch } : t))
  write(K.todos, arr)
}
export async function deleteTodo(id: number) {
  write(
    K.todos,
    read<Todo>(K.todos).filter((t) => t.id !== id),
  )
}
export async function getTodos(): Promise<Todo[]> {
  return read<Todo>(K.todos).sort((a, b) => b.createdAt - a.createdAt)
}
export async function addFocusSeconds(todoId: number, seconds: number) {
  const arr = read<Todo>(K.todos)
  const t = arr.find((x) => x.id === todoId)
  if (!t) return
  t.focusSeconds = (t.focusSeconds ?? 0) + seconds
  write(K.todos, arr)
}

// ---------- 番茄钟 ----------
export async function addPomodoro(s: Omit<PomodoroSession, 'id'>) {
  const arr = read<PomodoroSession>(K.pomodoros)
  const item: PomodoroSession = { ...s, id: nextId() }
  arr.push(item)
  write(K.pomodoros, arr)
  return item.id
}
export async function getPomodoros(): Promise<PomodoroSession[]> {
  return read<PomodoroSession>(K.pomodoros).sort((a, b) => a.start - b.start)
}

// ---------- 心情 / 日记 ----------
export async function addMood(m: Omit<MoodEntry, 'id' | 'createdAt'>) {
  const arr = read<MoodEntry>(K.moods)
  const item: MoodEntry = { ...m, id: nextId(), createdAt: Date.now() }
  arr.push(item)
  write(K.moods, arr)
  return item.id
}
export async function deleteMood(id: number) {
  write(
    K.moods,
    read<MoodEntry>(K.moods).filter((m) => m.id !== id),
  )
}
export async function getMoods(): Promise<MoodEntry[]> {
  return read<MoodEntry>(K.moods).sort((a, b) => b.createdAt - a.createdAt)
}

// ---------- 喝水 / 饮食 ----------
export async function addIntake(r: Omit<IntakeRecord, 'id' | 'createdAt'>) {
  const arr = read<IntakeRecord>(K.intakes)
  const item: IntakeRecord = { ...r, id: nextId(), createdAt: Date.now() }
  arr.push(item)
  write(K.intakes, arr)
  return item.id
}
export async function deleteIntake(id: number) {
  write(
    K.intakes,
    read<IntakeRecord>(K.intakes).filter((x) => x.id !== id),
  )
}
export async function getIntakes(): Promise<IntakeRecord[]> {
  return read<IntakeRecord>(K.intakes).sort((a, b) => b.createdAt - a.createdAt)
}

// ---------- 排便 ----------
export async function saveBowel(date: string, count: number) {
  const arr = read<BowelRecord>(K.bowels)
  const idx = arr.findIndex((b) => b.date === date)
  if (idx >= 0) {
    arr[idx] = { ...arr[idx], count, createdAt: Date.now() }
  } else {
    arr.push({ id: nextId(), date, count, createdAt: Date.now() })
  }
  write(K.bowels, arr)
}
export async function getBowels(): Promise<BowelRecord[]> {
  return read<BowelRecord>(K.bowels).sort((a, b) => (a.date < b.date ? -1 : 1))
}

// ---------- 灵感随心记 ----------
export async function addNote(n: Omit<Note, 'id' | 'createdAt'>) {
  const arr = read<Note>(K.notes)
  const item: Note = { ...n, id: nextId(), createdAt: Date.now() }
  arr.push(item)
  write(K.notes, arr)
  return item.id
}
export async function getNotes(): Promise<Note[]> {
  return read<Note>(K.notes).sort((a, b) => b.createdAt - a.createdAt)
}
export async function deleteNote(id: number) {
  write(
    K.notes,
    read<Note>(K.notes).filter((n) => n.id !== id),
  )
}

// ---------- 导出 ----------
export async function exportAll() {
  const [weights, todos, pomodoros, moods, intakes, bowels, notes] = await Promise.all([
    getWeights(),
    getTodos(),
    getPomodoros(),
    getMoods(),
    getIntakes(),
    getBowels(),
    getNotes(),
  ])
  const settings = await getSettings()
  return {
    weights,
    todos,
    pomodoros,
    settings,
    moods,
    intakes,
    bowels,
    notes,
    exportedAt: Date.now(),
  }
}
