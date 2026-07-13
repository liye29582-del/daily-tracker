import { useEffect, useState } from 'react'
import { getWeights, getTodos, getPomodoros } from '../db'
import { todayStr, fmtDuration, startOfWeek, startOfMonth, aggregateWeightByDate } from '../utils'
import { WeightRecord, Todo, PomodoroSession } from '../types'

type Scope = 'week' | 'month'

export default function Stats() {
  const [weights, setWeights] = useState<WeightRecord[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [pomodoros, setPomodoros] = useState<PomodoroSession[]>([])
  const [scope, setScope] = useState<Scope>('week')

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    const [w, t, p] = await Promise.all([getWeights(), getTodos(), getPomodoros()])
    setWeights(w)
    setTodos(t)
    setPomodoros(p)
  }

  const today = todayStr()
  const start = scope === 'week' ? startOfWeek(today) : startOfMonth(today)
  const inScope = (date: string) => date >= start && date <= today

  // 累计已减（区间内）
  const series = aggregateWeightByDate(weights.filter((w) => inScope(w.date)))
  const lost =
    series.length >= 1
      ? +(series[0].value - series[series.length - 1].value).toFixed(1)
      : null

  // 完成待办 x/x
  const scopeTodos = todos.filter((t) => inScope(t.date))
  const doneN = scopeTodos.filter((t) => t.done).length
  const totalN = scopeTodos.length

  // 累计专注
  const focusSec = pomodoros
    .filter(
      (p) =>
        p.type === 'focus' &&
        p.done &&
        (() => {
          const d = `${new Date(p.start).getFullYear()}-${String(new Date(p.start).getMonth() + 1).padStart(2, '0')}-${String(new Date(p.start).getDate()).padStart(2, '0')}`
          return inScope(d)
        })(),
    )
    .reduce((s, p) => s + p.duration, 0)

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold mb-4 text-brand-900">统计</h1>

      <div className="flex glass rounded-full p-1 mb-4 w-fit">
        {([['week', '本周'], ['month', '本月']] as const).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setScope(v)}
            className={`px-5 py-1.5 rounded-full text-sm ${scope === v ? 'bg-white text-brand-700 shadow-sm font-medium' : 'text-brand-900/60'}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/60 border border-white/70 shadow-sm">
          <div className="text-2xl mb-2">⚖️</div>
          <div className={`text-3xl font-bold tabular-nums ${lost != null && lost > 0 ? 'text-emerald-600' : lost != null && lost < 0 ? 'text-rose-500' : 'text-brand-900/80'}`}>
            {lost != null ? (lost > 0 ? `-${lost}` : lost < 0 ? `+${Math.abs(lost)}` : '0') : '—'}
            {lost != null && <span className="text-base font-medium text-brand-900/40 ml-1">kg</span>}
          </div>
          <div className="text-sm text-brand-900/60 mt-1">{lost != null && lost < 0 ? '累计增重' : '累计已减'}</div>
        </div>
        <div className="rounded-3xl p-6 bg-gradient-to-br from-sky-50 to-sky-100/60 border border-white/70 shadow-sm">
          <div className="text-2xl mb-2">✅</div>
          <div className="text-3xl font-bold tabular-nums text-sky-600">
            {totalN ? `${doneN}/${totalN}` : '—'}
          </div>
          <div className="text-sm text-brand-900/60 mt-1">完成待办</div>
        </div>
        <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-50 to-amber-100/60 border border-white/70 shadow-sm">
          <div className="text-2xl mb-2">🍅</div>
          <div className="text-3xl font-bold tabular-nums text-amber-600">{focusSec > 0 ? fmtDuration(focusSec) : '—'}</div>
          <div className="text-sm text-brand-900/60 mt-1">累计专注</div>
        </div>
      </div>

      {/* 完成率进度条 */}
      <div className="mt-4 glass-card p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-brand-900/60">待办完成率</span>
          <span className="font-semibold text-emerald-500">{totalN ? Math.round((doneN / totalN) * 100) : 0}%</span>
        </div>
        <div className="h-2.5 glass-card rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${totalN ? Math.round((doneN / totalN) * 100) : 0}%` }} />
        </div>
        <div className="text-xs text-brand-900/40 mt-2">本{scope === 'week' ? '周' : '月'}共 {totalN} 条待办，已完成 {doneN} 条</div>
      </div>

      <p className="text-xs text-brand-900/40 mt-4 text-center">
        数据随「{scope === 'week' ? '本周' : '本月'}」切换实时更新 · 体重/专注/心情趋势详见对应板块
      </p>
    </div>
  )
}
