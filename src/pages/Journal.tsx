import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { addMood, deleteMood, getMoods, addIntake, deleteIntake, getIntakes, saveBowel, getBowels, getWeights, getTodos, getPomodoros } from '../db'
import { todayStr, CUP_ML, lastNDays, monthGrid } from '../utils'
import { MoodEntry, IntakeRecord, MealType, BowelRecord, WeightRecord, Todo, PomodoroSession } from '../types'
import { useStore } from '../store'

type Tab = 'mood' | 'water' | 'diet' | 'bowel'

const MOODS = [
  { level: 1, emoji: '😞', label: '很差' },
  { level: 2, emoji: '😕', label: '不太好' },
  { level: 3, emoji: '😐', label: '一般' },
  { level: 4, emoji: '🙂', label: '不错' },
  { level: 5, emoji: '😄', label: '很好' },
]
const MEALS: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: '早餐' },
  { key: 'lunch', label: '午餐' },
  { key: 'dinner', label: '晚餐' },
  { key: 'snack', label: '加餐' },
]
const WATER_QUICK = [1, 2, 3] // 杯

function timeOf(ts: number) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'mood', icon: '😊', label: '心情' },
  { key: 'water', icon: '💧', label: '饮水' },
  { key: 'diet', icon: '🍽️', label: '饮食' },
  { key: 'bowel', icon: '🚽', label: '排便' },
]

export default function Journal() {
  const [moods, setMoods] = useState<MoodEntry[]>([])
  const [intakes, setIntakes] = useState<IntakeRecord[]>([])
  const [bowels, setBowels] = useState<BowelRecord[]>([])
  const [weights, setWeights] = useState<WeightRecord[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [pomodoros, setPomodoros] = useState<PomodoroSession[]>([])
  const today = todayStr()
  const { settings } = useStore()
  const [entryTab, setEntryTab] = useState<Tab | null>(null)
  const [calDay, setCalDay] = useState<string | null>(null)

  useEffect(() => {
    void refresh()
  }, [])

  async function refresh() {
    const [m, i, b, w, t, p] = await Promise.all([
      getMoods(),
      getIntakes(),
      getBowels(),
      getWeights(),
      getTodos(),
      getPomodoros(),
    ])
    setMoods(m)
    setIntakes(i)
    setBowels(b)
    setWeights(w)
    setTodos(t)
    setPomodoros(p)
  }

  const todayMoods = moods.filter((m) => m.date === today)
  const todayWater = intakes.filter((r) => r.kind === 'water' && r.date === today)
  const waterTotal = todayWater.reduce((s, r) => s + (r.amount ?? 0), 0)
  const waterCups = settings.waterTarget ? Math.round(waterTotal / CUP_ML) : 0
  const targetCups = settings.waterTarget ? Math.round(settings.waterTarget / CUP_ML) : 0
  const todayDiet = intakes.filter((r) => r.kind === 'diet' && r.date === today)
  const todayBowel = bowels.find((b) => b.date === today)

  const cardValue: Record<Tab, { value: string; sub: string; big?: string }> = {
    mood: {
      value: todayMoods.length ? MOODS.find((x) => x.level === todayMoods[todayMoods.length - 1].mood)?.emoji ?? '—' : '—',
      sub: todayMoods.length ? `${todayMoods.length} 条` : '未记录',
    },
    water: { value: '', sub: `${waterCups}/${targetCups} 杯`, big: waterTotal > 0 ? `${waterTotal}ml` : '0' },
    diet: { value: todayDiet.length ? `${todayDiet.length} 项` : '—', sub: todayDiet.length ? '今日已记' : '未记录' },
    bowel: {
      value: todayBowel && todayBowel.count > 0 ? `${todayBowel.count} 次` : '—',
      sub: todayBowel && todayBowel.count > 0 ? '今日已记' : '未记录',
    },
  }

  // 心情趋势：每日平均
  const moodByDay = new Map<string, { sum: number; n: number }>()
  for (const m of moods) {
    const o = moodByDay.get(m.date) ?? { sum: 0, n: 0 }
    o.sum += m.mood
    o.n++
    moodByDay.set(m.date, o)
  }
  const moodData = lastNDays(30)
    .filter((d) => moodByDay.has(d))
    .map((d) => ({ date: d.slice(5), mood: +(moodByDay.get(d)!.sum / moodByDay.get(d)!.n).toFixed(2) }))

  // 喝水趋势：每日总量
  const waterByDay = new Map<string, number>()
  for (const r of intakes) {
    if (r.kind !== 'water') continue
    waterByDay.set(r.date, (waterByDay.get(r.date) ?? 0) + (r.amount ?? 0))
  }
  const waterData = lastNDays(30)
    .filter((d) => waterByDay.has(d))
    .map((d) => ({ date: d.slice(5), ml: waterByDay.get(d)! }))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">记录</h1>

      {/* 四个小卡片：点击弹窗记录 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setEntryTab(t.key)}
            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-left hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="text-xl mb-1">{t.icon}</div>
            <div className="text-xs text-gray-500">{t.label}</div>
            <div className="text-lg font-bold text-gray-800 mt-0.5">{cardValue[t.key].big ?? cardValue[t.key].value}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{cardValue[t.key].sub}</div>
          </button>
        ))}
      </div>

      {/* 两张图表并排 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="text-sm font-medium mb-2">心情趋势（近 30 天）</div>
          <div className="h-44">
            {moodData.length >= 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={moodData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="mood" stroke="#ec4899" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">记录心情后展示</div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="text-sm font-medium mb-2">喝水统计（近 30 天 · ml）</div>
          <div className="h-44">
            {waterData.length >= 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={waterData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="ml" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">记录饮水后展示</div>
            )}
          </div>
        </div>
      </div>

      {/* 饮食 / 排便日历（近 30 天 + 可翻月） */}
      <DietBowelCalendar weights={weights} todos={todos} pomodoros={pomodoros} moods={moods} intakes={intakes} bowels={bowels} onPick={(d) => setCalDay(d)} />

      {entryTab && (
        <RecordModal tab={entryTab} onClose={() => { setEntryTab(null); void refresh() }} />
      )}

      {calDay && (
        <DayDetailModal
          date={calDay}
          weights={weights}
          todos={todos}
          pomodoros={pomodoros}
          moods={moods}
          intakes={intakes}
          bowels={bowels}
          onClose={() => setCalDay(null)}
        />
      )}
    </div>
  )
}

// 全量日历：体重/待办/番茄/心情/饮食/排便 六类数据在一张日历上以彩色圆点呈现，单视图看全一天
function DietBowelCalendar({
  weights,
  todos,
  pomodoros,
  moods,
  intakes,
  bowels,
  onPick,
}: {
  weights: WeightRecord[]
  todos: Todo[]
  pomodoros: PomodoroSession[]
  moods: MoodEntry[]
  intakes: IntakeRecord[]
  bowels: BowelRecord[]
  onPick: (date: string) => void
}) {
  const now = new Date()
  const [hy, setHy] = useState(now.getFullYear())
  const [hm, setHm] = useState(now.getMonth())
  const dietDays = new Set(intakes.filter((r) => r.kind === 'diet').map((r) => r.date))
  const bowelDays = new Set(bowels.filter((b) => b.count > 0).map((b) => b.date))
  const cells = monthGrid(hy, hm)

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">每日记录日历</div>
        <div className="flex items-center gap-1 text-sm">
          <button onClick={() => (hm === 0 ? (setHm(11), setHy(hy - 1)) : setHm(hm - 1))} className="px-2 text-gray-500">‹</button>
          <span className="font-medium">{hy} 年 {hm + 1} 月</span>
          <button onClick={() => (hm === 11 ? (setHm(0), setHy(hy + 1)) : setHm(hm + 1))} className="px-2 text-gray-500">›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] text-gray-400 mb-1">
        {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) =>
          d ? (
            <button
              key={i}
              onClick={() => onPick(d)}
              className="relative aspect-square rounded-lg flex items-center justify-center text-[11px] text-gray-600 hover:bg-gray-50"
            >
              {Number(d.slice(8))}
              <span className="absolute bottom-1 flex gap-0.5 flex-wrap justify-center max-w-[26px]">
                {weights.some((x) => x.date === d) && <i className="w-1 h-1 rounded-full bg-sky-400" />}
                {todos.some((x) => x.date === d) && <i className="w-1 h-1 rounded-full bg-emerald-400" />}
                {pomodoros.some((x) => x.type === 'focus' && x.done && new Date(x.start).toDateString() === new Date(d + 'T00:00:00').toDateString()) && <i className="w-1 h-1 rounded-full bg-amber-400" />}
                {moods.some((x) => x.date === d) && <i className="w-1 h-1 rounded-full bg-pink-400" />}
                {dietDays.has(d) && <i className="w-1 h-1 rounded-full bg-violet-400" />}
                {bowelDays.has(d) && <i className="w-1 h-1 rounded-full bg-orange-400" />}
              </span>
            </button>
          ) : (
            <div key={i} />
          ),
        )}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />体重</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />待办</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />番茄</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400 inline-block" />心情</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />饮食</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />排便</span>
      </div>
    </div>
  )
}

// 点击某天：弹窗呈现当天全部记录
function DayDetailModal({
  date,
  weights,
  todos,
  pomodoros,
  moods,
  intakes,
  bowels,
  onClose,
}: {
  date: string
  weights: WeightRecord[]
  todos: Todo[]
  pomodoros: PomodoroSession[]
  moods: MoodEntry[]
  intakes: IntakeRecord[]
  bowels: BowelRecord[]
  onClose: () => void
}) {
  const dayWeight = weights.filter((w) => w.date === date)
  const dayTodos = todos.filter((t) => t.date === date)
  const dayPomo = pomodoros.filter((p) => p.type === 'focus' && p.done && new Date(p.start).toDateString() === new Date(date + 'T00:00:00').toDateString())
  const dayMoods = moods.filter((m) => m.date === date)
  const dayDiet = intakes.filter((r) => r.kind === 'diet' && r.date === date)
  const dayWater = intakes.filter((r) => r.kind === 'water' && r.date === date)
  const dayBowel = bowels.find((b) => b.date === date)
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-lg">{date}</div>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        <ul className="text-sm text-gray-600 space-y-1 mb-3">
          <li>⚖️ 体重：{dayWeight.length ? dayWeight.map((x) => x.value).join(', ') + ' kg' : '无'}</li>
          <li>✅ 待办：{dayTodos.length} 条（完成 {dayTodos.filter((t) => t.done).length}）</li>
          <li>🍅 专注：{dayPomo.length} 个</li>
          <li>😊 心情：{dayMoods.length ? `${dayMoods.length} 条` : '无'}</li>
          <li>💧 饮水：{dayWater.length ? dayWater.reduce((s, r) => s + (r.amount ?? 0), 0) + ' ml' : '无'}</li>
          <li>🚽 排便：{dayBowel && dayBowel.count > 0 ? `${dayBowel.count} 次` : '无'}</li>
        </ul>

        {dayDiet.length > 0 && (
          <>
            <div className="text-xs text-gray-500 mb-1">饮食（{dayDiet.length}）</div>
            <div className="space-y-2">
              {dayDiet.map((r) => {
                const mealLabel = MEALS.find((m) => m.key === r.meal)?.label
                return (
                  <div key={r.id} className="bg-gray-50 rounded-xl p-3 text-sm">
                    <span className="text-gray-400 mr-2">{mealLabel}</span>
                    {r.text}
                  </div>
                )
              })}
            </div>
          </>
        )}
        {dayDiet.length === 0 && dayWater.length === 0 && (!dayBowel || dayBowel.count === 0) && dayWeight.length === 0 && dayTodos.length === 0 && dayPomo.length === 0 && dayMoods.length === 0 && (
          <div className="text-sm text-gray-400">当天无记录</div>
        )}
      </div>
    </div>
  )
}

function RecordModal({ tab, onClose }: { tab: Tab; onClose: () => void }) {
  const today = todayStr()
  const { settings, settingsLoaded } = useStore()
  const [mood, setMood] = useState(3)
  const [moodText, setMoodText] = useState('')
  const [pendingCups, setPendingCups] = useState(0)
  const [meal, setMeal] = useState<MealType>('breakfast')
  const [dietText, setDietText] = useState('')
  const [bowelOk, setBowelOk] = useState(false)
  const [bowelCount, setBowelCount] = useState(1)
  const [moods, setMoods] = useState<MoodEntry[]>([])
  const [intakes, setIntakes] = useState<IntakeRecord[]>([])
  const [bowels, setBowels] = useState<BowelRecord[]>([])

  useEffect(() => {
    void load()
  }, [tab])

  async function load() {
    const [m, i, b] = await Promise.all([getMoods(), getIntakes(), getBowels()])
    setMoods(m)
    setIntakes(i)
    setBowels(b)
  }

  const waterTotal = intakes.filter((r) => r.kind === 'water' && r.date === today).reduce((s, r) => s + (r.amount ?? 0), 0)
  const waterCups = settings.waterTarget ? Math.round(waterTotal / CUP_ML) : 0
  const targetCups = settings.waterTarget ? Math.round(settings.waterTarget / CUP_ML) : 0
  const todayWater = intakes.filter((r) => r.kind === 'water' && r.date === today)
  const todayDiet = intakes.filter((r) => r.kind === 'diet' && r.date === today)
  const label = TABS.find((t) => t.key === tab)?.label ?? ''

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-lg">记录{label}</div>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>
        {tab === 'mood' && (
          <div className="space-y-3">
            <div className="flex justify-between">
              {MOODS.map((m) => (
                <button key={m.level} onClick={() => setMood(m.level)} className={`text-2xl px-1 rounded-lg ${mood === m.level ? 'bg-brand-50 scale-110' : 'opacity-60'}`} title={m.label}>
                  {m.emoji}
                </button>
              ))}
            </div>
            <input value={moodText} onChange={(e) => setMoodText(e.target.value)} placeholder="写点什么…（可选）" className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-brand-400" />
            <button onClick={async () => { await addMood({ date: today, mood, text: moodText || undefined }); setMoodText(''); await load() }} className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium">确认</button>
            <div className="space-y-2">
              {moods.filter((m) => m.date === today).slice().reverse().map((m) => (
                <div key={m.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between text-sm">
                  <span>{MOODS.find((x) => x.level === m.mood)?.emoji} {m.text || ''}</span>
                  <button onClick={async () => { if (m.id != null) await deleteMood(m.id); await load() }} className="text-gray-400 hover:text-red-500 text-sm px-2">删除</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'water' && (
          <div className="space-y-3">
            <div className="text-sm text-gray-500">今日已喝 {waterTotal} ml（{waterCups}/{targetCups} 杯）</div>
            <div className="flex gap-2">
              {WATER_QUICK.map((c) => (
                <button key={c} onClick={() => setPendingCups((pc) => pc + c)} className="flex-1 bg-sky-50 text-sky-700 py-2.5 rounded-lg text-sm font-medium">+{c} 杯</button>
              ))}
            </div>
            {pendingCups > 0 && (
              <div className="text-[11px] text-sky-600">将新增 {pendingCups} 杯（{pendingCups * CUP_ML} ml）</div>
            )}
            <button
              onClick={async () => {
                if (pendingCups > 0) {
                  await addIntake({ date: today, kind: 'water', amount: pendingCups * CUP_ML })
                  setPendingCups(0)
                  await load()
                }
              }}
              disabled={pendingCups === 0}
              className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-40"
            >
              确认
            </button>
            <div className="space-y-2">
              {todayWater.slice().reverse().map((r) => (
                <div key={r.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                  <div className="text-sm">💧 {r.amount} ml</div>
                  <button onClick={async () => { if (r.id != null) await deleteIntake(r.id); await load() }} className="text-gray-400 hover:text-red-500 text-sm px-2">删除</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'diet' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {MEALS.map((m) => (
                <button key={m.key} onClick={() => setMeal(m.key)} className={`flex-1 py-1.5 rounded-lg text-sm ${meal === m.key ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{m.label}</button>
              ))}
            </div>
            <input value={dietText} onChange={(e) => setDietText(e.target.value)} placeholder="吃了什么？" className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-brand-400" />
            <button onClick={async () => { if (!dietText.trim()) return; await addIntake({ date: today, kind: 'diet', meal, text: dietText.trim() }); setDietText(''); await load() }} className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium">记录饮食</button>
            <div className="space-y-2">
              {todayDiet.map((r) => {
                const mealLabel = MEALS.find((m) => m.key === r.meal)?.label
                return (
                  <div key={r.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                    <div className="text-sm"><span className="text-gray-400 mr-2">{mealLabel}</span>{r.text}</div>
                    <button onClick={async () => { if (r.id != null) await deleteIntake(r.id); await load() }} className="text-gray-400 hover:text-red-500 text-sm px-2">删除</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {tab === 'bowel' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={bowelOk} onChange={(e) => setBowelOk(e.target.checked)} className="w-4 h-4 accent-brand-600" />
                今日已排便
              </label>
              <input type="number" min={1} value={bowelCount} onChange={(e) => setBowelCount(Math.max(1, Number(e.target.value) || 1))} disabled={!bowelOk} className="w-20 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-brand-400 disabled:bg-gray-50" />
              <span className="text-xs text-gray-400">次（不填默认 1）</span>
            </div>
            <button onClick={async () => { await saveBowel(today, bowelOk ? bowelCount : 0); await load() }} className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium">保存排便</button>
            {bowels.slice().reverse().slice(0, 5).map((b) => (
              <div key={b.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between text-sm">
                <span>{b.date} · {b.count > 0 ? `${b.count} 次` : '未记录'}</span>
                <button onClick={async () => { if (b.id != null) await saveBowel(b.date, 0); await load() }} className="text-gray-400 hover:text-red-500 text-sm px-2">清除</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
