import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { getTodos, getPomodoros } from '../db'
import { todayStr, fmtDuration, lastNDays, monthGrid, startOfWeek, addDays, periodRef } from '../utils'
import { Todo, PomodoroSession } from '../types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

type ChartRange = '7' | '30'
type HeatMode = 'month' | 'year'

function focusMap(pomodoros: PomodoroSession[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const p of pomodoros) {
    if (p.type !== 'focus' || !p.done) continue
    const ds = new Date(p.start)
    const dateStr = `${ds.getFullYear()}-${String(ds.getMonth() + 1).padStart(2, '0')}-${String(ds.getDate()).padStart(2, '0')}`
    m.set(dateStr, (m.get(dateStr) ?? 0) + p.duration)
  }
  return m
}

function heatColor(minutes: number): string {
  if (!minutes) return '#f1f5f9'
  const t = Math.min(1, minutes / 120)
  const op = (0.2 + t * 0.8).toFixed(2)
  return `rgba(51,168,136,${op})`
}

function buildYearWeeks(year: number): (string | null)[][] {
  const start = startOfWeek(`${year}-01-01`)
  const end = `${year}-12-31`
  const days: (string | null)[] = []
  let d = start
  while (d <= end) {
    days.push(d)
    d = addDays(d, 1)
  }
  while (days.length % 7 !== 0) days.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}

export default function Focus() {
  const { timer, startTimer, pauseTimer, resetTimer, switchMode, selectTodo } = useStore()
  const [todos, setTodos] = useState<Todo[]>([])
  const [pomodoros, setPomodoros] = useState<PomodoroSession[]>([])
  const [todayCount, setTodayCount] = useState(0)
  const [todaySeconds, setTodaySeconds] = useState(0)
  const [chartRange, setChartRange] = useState<ChartRange>('7')
  const [heatMode, setHeatMode] = useState<HeatMode>('month')
  const now = new Date()
  const [hy, setHy] = useState(now.getFullYear())
  const [hm, setHm] = useState(now.getMonth())

  useEffect(() => {
    void loadData()
  }, [timer.active])

  async function loadData() {
    const all = await getTodos()
    const today = todayStr()
    setTodos(all.filter((t) => !t.done && t.date === periodRef(t.period ?? 'day', today)))
    const p = await getPomodoros()
    setPomodoros(p)
    const tp = p.filter(
      (x) => x.type === 'focus' && x.done && new Date(x.start).toDateString() === new Date().toDateString(),
    )
    setTodayCount(tp.length)
    setTodaySeconds(tp.reduce((s, x) => s + x.duration, 0))
  }

  const mm = String(Math.floor(timer.remaining / 60)).padStart(2, '0')
  const ss = String(timer.remaining % 60).padStart(2, '0')
  const progress = timer.total > 0 ? (timer.remaining / timer.total) * 100 : 0

  const fMap = focusMap(pomodoros)
  const days = lastNDays(Number(chartRange))
  const barData = days.map((d) => ({ day: d.slice(5), min: Math.round((fMap.get(d) ?? 0) / 60) }))

  const monthCells = monthGrid(hy, hm)
  const yearWeeks = buildYearWeeks(hy)

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold mb-4 text-brand-900">番茄钟</h1>

      <div className="bg-white rounded-2xl p-6 border border-white/10 shadow-sm text-center">
        <div className="inline-flex glass rounded-full p-1 mb-4">
          <button onClick={() => switchMode('focus')} className={`px-4 py-1.5 rounded-full text-sm ${timer.mode === 'focus' ? 'bg-brand-600 text-white' : 'text-brand-900/70'}`}>专注</button>
          <button onClick={() => switchMode('break')} className={`px-4 py-1.5 rounded-full text-sm ${timer.mode === 'break' ? 'bg-brand-600 text-white' : 'text-brand-900/70'}`}>休息</button>
        </div>

        <div className="relative w-48 h-48 mx-auto">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#eef2f7" strokeWidth="8" />
            <circle cx="50" cy="50" r="45" fill="none" stroke={timer.mode === 'focus' ? '#33a888' : '#10b981'} strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 45} strokeDashoffset={(2 * Math.PI * 45 * progress) / 100} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold tabular-nums">{mm}:{ss}</div>
            <div className="text-xs text-brand-900/40 mt-1">{timer.mode === 'focus' ? '专注中' : '休息中'}</div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          {timer.running ? (
            <button onClick={pauseTimer} className="flex-1 bg-amber-500 text-white py-2.5 rounded-lg font-medium">暂停</button>
          ) : (
            <button onClick={startTimer} className="flex-1 glass-btn-primary">开始</button>
          )}
          <button onClick={resetTimer} className="px-5 bg-gray-100 text-brand-900/70 py-2.5 rounded-lg font-medium">重置</button>
        </div>

        {timer.mode === 'focus' && (
          <div className="mt-4 text-left">
            <label className="text-xs text-brand-900/60">绑定待办（可选）</label>
            <select value={timer.todoId ?? ''} onChange={(e) => selectTodo(e.target.value ? Number(e.target.value) : undefined)} className="glass-input bg-white">
              <option value="">不绑定</option>
              {todos.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mt-4 glass-card p-4 flex items-center justify-between">
        <div className="text-sm text-brand-900/60">今日专注</div>
        <div className="font-semibold">{todayCount} 个 · {todaySeconds > 0 ? fmtDuration(todaySeconds) : '0'}</div>
      </div>

      {/* 近期专注 */}
      <div className="glass-card p-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">近期专注（分钟）</div>
          <div className="flex glass rounded-full p-0.5 text-xs">
            {([['7', '近7天'], ['30', '近30天']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setChartRange(v)} className={`px-3 py-1 rounded-full ${chartRange === v ? 'bg-white text-brand-700 shadow-sm' : 'text-brand-900/60'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={chartRange === '7' ? 0 : 3} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="min" fill="#33a888" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 专注热力 */}
      <div className="glass-card p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium">专注热力</div>
          <div className="flex glass rounded-full p-0.5 text-xs">
            {([['month', '每月'], ['year', '每年']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setHeatMode(v)} className={`px-3 py-1 rounded-full ${heatMode === v ? 'bg-white text-brand-700 shadow-sm' : 'text-brand-900/60'}`}>{l}</button>
            ))}
          </div>
        </div>

        {heatMode === 'month' ? (
          <div>
            <div className="flex items-center justify-between mb-2 text-sm">
              <button onClick={() => (hm === 0 ? (setHm(11), setHy(hy - 1)) : setHm(hm - 1))} className="px-2 text-brand-900/60">‹</button>
              <span className="font-medium">{hy} 年 {hm + 1} 月</span>
              <button onClick={() => (hm === 11 ? (setHm(0), setHy(hy + 1)) : setHm(hm + 1))} className="px-2 text-brand-900/60">›</button>
            </div>
            <div className="grid grid-cols-7 text-center text-[10px] text-brand-900/40 mb-1">
              {['日', '一', '二', '三', '四', '五', '六'].map((w) => <div key={w}>{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((d, i) =>
                d ? (
                  <div key={i} title={`${d} · ${Math.round((fMap.get(d) ?? 0) / 60)} 分`} className="aspect-square rounded-md flex items-center justify-center text-[9px] text-brand-900/70" style={{ background: heatColor(fMap.get(d) ?? 0) }}>
                    {Number(d.slice(8))}
                  </div>
                ) : (
                  <div key={i} />
                ),
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2 text-sm">
              <button onClick={() => setHy(hy - 1)} className="px-2 text-brand-900/60">‹</button>
              <span className="font-medium">{hy} 年</span>
              <button onClick={() => setHy(hy + 1)} className="px-2 text-brand-900/60">›</button>
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {yearWeeks.map((w, i) => (
                <div key={i} className="flex flex-col gap-1">
                  {w.map((d, j) =>
                    d ? (
                      <div key={j} title={`${d} · ${Math.round((fMap.get(d) ?? 0) / 60)} 分`} className="w-3.5 h-3.5 rounded-sm" style={{ background: heatColor(fMap.get(d) ?? 0) }} />
                    ) : (
                      <div key={j} className="w-3.5 h-3.5" />
                    ),
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-brand-900/40">
              <span>少</span>
              {[0, 30, 60, 90, 120].map((m) => (
                <span key={m} className="w-3.5 h-3.5 rounded-sm" style={{ background: heatColor(m) }} />
              ))}
              <span>多</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
