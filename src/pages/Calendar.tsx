import { useEffect, useState } from 'react'
import { getWeights, getTodos, getPomodoros, getMoods, getIntakes, getBowels } from '../db'
import { monthGrid, todayStr, prettyDate } from '../utils'
import { WeightRecord, Todo, PomodoroSession, MoodEntry, IntakeRecord, BowelRecord } from '../types'

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

export default function Calendar() {
  const [weights, setWeights] = useState<WeightRecord[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [pomodoros, setPomodoros] = useState<PomodoroSession[]>([])
  const [moods, setMoods] = useState<MoodEntry[]>([])
  const [intakes, setIntakes] = useState<IntakeRecord[]>([])
  const [bowels, setBowels] = useState<BowelRecord[]>([])
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<string | null>(todayStr())

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    const [w, t, p, m, i, b] = await Promise.all([
      getWeights(),
      getTodos(),
      getPomodoros(),
      getMoods(),
      getIntakes(),
      getBowels(),
    ])
    setWeights(w)
    setTodos(t)
    setPomodoros(p)
    setMoods(m)
    setIntakes(i)
    setBowels(b)
  }

  const grid = monthGrid(year, month)
  const today = todayStr()

  function byDate<T extends { date: string }>(arr: T[], d: string) {
    return arr.filter((x) => x.date === d)
  }

  const dietDays = new Set(intakes.filter((r) => r.kind === 'diet').map((r) => r.date))
  const bowelDays = new Set(bowels.filter((b) => b.count > 0).map((b) => b.date))

  const selWeights = selected ? byDate(weights, selected) : []
  const selTodos = selected ? byDate(todos, selected) : []
  const selPomo = selected
    ? pomodoros.filter((p) => p.type === 'focus' && p.done && new Date(p.start).toDateString() === new Date(selected + 'T00:00:00').toDateString())
    : []
  const selMoods = selected ? moods.filter((x) => x.date === selected) : []
  const selDiet = selected ? intakes.filter((r) => r.kind === 'diet' && r.date === selected) : []
  const selWater = selected ? intakes.filter((r) => r.kind === 'water' && r.date === selected) : []
  const selBowel = selected ? bowels.find((b) => b.date === selected) : undefined

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">日历</h1>

      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => {
              const m = month - 1
              if (m < 0) {
                setYear(year - 1)
                setMonth(11)
              } else setMonth(m)
            }}
            className="px-3 py-1 text-gray-500"
          >
            ‹
          </button>
          <div className="font-semibold">
            {year} 年 {month + 1} 月
          </div>
          <button
            onClick={() => {
              const m = month + 1
              if (m > 11) {
                setYear(year + 1)
                setMonth(0)
              } else setMonth(m)
            }}
            className="px-3 py-1 text-gray-500"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 text-center text-xs text-gray-400 mb-1">
          {WEEK.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((d, i) => {
            if (!d) return <div key={i} />
            const w = byDate(weights, d).length
            const t = byDate(todos, d).length
            const p = pomodoros.filter(
              (x) => x.type === 'focus' && x.done && new Date(x.start).toDateString() === new Date(d + 'T00:00:00').toDateString(),
            ).length
            const hasMood = moods.some((x) => x.date === d)
            const hasDiet = dietDays.has(d)
            const hasBowel = bowelDays.has(d)
            const isToday = d === today
            const isSel = d === selected
            return (
              <button
                key={d}
                onClick={() => setSelected(d)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative ${
                  isSel ? 'bg-brand-600 text-white' : isToday ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span>{Number(d.slice(8))}</span>
                <span className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-[28px]">
                  {w > 0 && <i className="w-1 h-1 rounded-full bg-sky-400" />}
                  {t > 0 && <i className="w-1 h-1 rounded-full bg-emerald-400" />}
                  {p > 0 && <i className="w-1 h-1 rounded-full bg-amber-400" />}
                  {hasMood && <i className="w-1 h-1 rounded-full bg-pink-400" />}
                  {hasDiet && <i className="w-1 h-1 rounded-full bg-violet-400" />}
                  {hasBowel && <i className="w-1 h-1 rounded-full bg-orange-400" />}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex gap-3 text-[11px] text-gray-400 mt-3 justify-center flex-wrap">
          <span><i className="w-2 h-2 rounded-full bg-sky-400 inline-block mr-1" />体重</span>
          <span><i className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-1" />待办</span>
          <span><i className="w-2 h-2 rounded-full bg-amber-400 inline-block mr-1" />番茄</span>
          <span><i className="w-2 h-2 rounded-full bg-pink-400 inline-block mr-1" />心情</span>
          <span><i className="w-2 h-2 rounded-full bg-violet-400 inline-block mr-1" />饮食</span>
          <span><i className="w-2 h-2 rounded-full bg-orange-400 inline-block mr-1" />排便</span>
        </div>
      </div>

      {selected && (
        <div className="mt-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="font-medium mb-2">{prettyDate(selected)}</div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>⚖️ 体重：{selWeights.length ? selWeights.map((x) => x.value).join(', ') + ' kg' : '无'}</li>
            <li>✅ 待办：{selTodos.length} 条（完成 {selTodos.filter((t) => t.done).length}）</li>
            <li>🍅 专注：{selPomo.length} 个</li>
            <li>😊 心情：{selMoods.length ? `${selMoods.length} 条` : '无'}</li>
            <li>🍽️ 饮食：{selDiet.length ? `${selDiet.length} 项` : '无'}</li>
            <li>💧 饮水：{selWater.length ? selWater.reduce((s, r) => s + (r.amount ?? 0), 0) + ' ml' : '无'}</li>
            <li>🚽 排便：{selBowel && selBowel.count > 0 ? `${selBowel.count} 次` : '无'}</li>
          </ul>
        </div>
      )}
    </div>
  )
}
