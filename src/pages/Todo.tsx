import { useEffect, useState, FormEvent } from 'react'
import { addTodo, updateTodo, deleteTodo, getTodos } from '../db'
import { todayStr, fmtDuration, periodRef } from '../utils'
import { Todo as TodoT, TodoPeriod } from '../types'

export default function Todo() {
  const [todos, setTodos] = useState<TodoT[]>([])

  useEffect(() => {
    void refresh()
  }, [])

  async function refresh() {
    setTodos(await getTodos())
  }

  const today = todayStr()
  const total = todos.length
  const done = todos.filter((t) => t.done).length
  const rate = total ? Math.round((done / total) * 100) : 0

  const ofPeriod = (period: TodoPeriod) =>
    todos.filter((t) => (t.period ?? 'day') === period && t.date === periodRef(period, today))

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold mb-4 text-white/90">待办</h1>

      <div className="glass p-4 flex items-center justify-between mb-4">
        <div className="text-sm text-white/60">总完成率</div>
        <div className="font-semibold">
          <span className="text-emerald-500 text-xl">{rate}%</span>
          <span className="text-xs text-white/40 ml-2">
            {done}/{total}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <TodoCard title="每日待办" period="day" items={ofPeriod('day')} onChanged={refresh} />
        <TodoCard title="每周待办" period="week" items={ofPeriod('week')} onChanged={refresh} />
        <TodoCard title="每月待办" period="month" items={ofPeriod('month')} onChanged={refresh} />
      </div>
    </div>
  )
}

function TodoCard({
  title,
  period,
  items,
  onChanged,
}: {
  title: string
  period: TodoPeriod
  items: TodoT[]
  onChanged: () => void
}) {
  const [title_, setTitle_] = useState('')
  const [tag, setTag] = useState('')
  const [kind, setKind] = useState<'event' | 'habit'>('event')
  const [goalDays, setGoalDays] = useState(period === 'month' ? 20 : 5)
  const today = todayStr()
  const showKind = period !== 'day'
  const doneN = items.filter((t) => t.done).length

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title_.trim()) return
    await addTodo({
      title: title_.trim(),
      date: periodRef(period, today),
      tag: tag.trim() || undefined,
      period,
      ...(showKind ? { kind, goalDays: kind === 'habit' ? goalDays : undefined } : {}),
    })
    setTitle_('')
    setTag('')
    await onChanged()
  }

  async function toggleCheckIn(t: TodoT) {
    const ins = new Set(t.checkIns ?? [])
    if (ins.has(today)) ins.delete(today)
    else ins.add(today)
    const arr = [...ins]
    const start = periodRef(t.period ?? 'day', today)
    const inPeriod = arr.filter((d) => d >= start && d <= today).length
    const done = t.goalDays ? inPeriod >= t.goalDays : false
    await updateTodo(t.id!, { checkIns: arr, done })
    await onChanged()
  }

  return (
    <div className="glass p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-white/40">
          {doneN}/{items.length}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-2 mb-2">
        <div className="flex gap-2">
          <input value={title_} onChange={(e) => setTitle_(e.target.value)} placeholder="添加…" className="glass-input flex-1" />
          <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="标签" className="glass-input w-20" />
          <button className="glass-btn-primary">+</button>
        </div>
        {showKind && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              {([['event', '事件'], ['habit', '习惯']] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setKind(v)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    kind === v ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-white/70 border-white/20'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            {kind === 'habit' && (
              <label className="flex items-center gap-1 text-xs text-white/60">
                目标
                <input
                  type="number"
                  min={1}
                  max={period === 'week' ? 7 : 31}
                  value={goalDays}
                  onChange={(e) => setGoalDays(Math.max(1, Number(e.target.value) || 1))}
                  className="w-14 border border-white/20 rounded-lg px-2 py-1 outline-none focus:border-brand-400"
                />
                天/{period === 'week' ? '周' : '月'}
              </label>
            )}
          </div>
        )}
      </form>

      <div className="space-y-2">
        {items.map((t) => (
          <div key={t.id} className="glass rounded-xl p-2.5">
            <div className="flex items-center gap-3">
              {t.kind === 'habit' ? (
                <span
                  onClick={async () => await toggleCheckIn(t)}
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] cursor-pointer ${
                    (t.checkIns ?? []).includes(today) ? 'bg-brand-600 text-white' : 'bg-white border-2 border-gray-300'
                  }`}
                  title="今日打卡"
                >
                  {(t.checkIns ?? []).includes(today) ? '✓' : ''}
                </span>
              ) : (
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={async () => {
                    await updateTodo(t.id!, { done: !t.done })
                    await onChanged()
                  }}
                  className="w-5 h-5 accent-brand-600"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm ${t.done ? 'line-through text-white/40' : ''}`}>{t.title}</div>
                <div className="text-xs text-white/40 flex gap-2 flex-wrap items-center">
                  {t.tag && <span className="glass-btn-primary text-xs px-1.5 rounded">{t.tag}</span>}
                  {t.kind === 'habit' && <span className="glass text-white/70 text-xs px-1.5 rounded">习惯</span>}
                  {t.focusSeconds ? <span>🍅 {fmtDuration(t.focusSeconds)}</span> : null}
                </div>
              </div>
              <button
                onClick={async () => {
                  await deleteTodo(t.id!)
                  await onChanged()
                }}
                className="text-white/40 hover:text-red-500 text-sm px-2"
              >
                删除
              </button>
            </div>

            {t.kind === 'habit' && t.goalDays ? <HabitProgress t={t} onChanged={onChanged} /> : null}
          </div>
        ))}
        {items.length === 0 && <div className="text-center text-white/40 text-xs py-3">暂无</div>}
      </div>
    </div>
  )
}

// 习惯进度：周=每日打卡小方块（按打卡顺序填充）；月=进度条
function HabitProgress({ t, onChanged }: { t: TodoT; onChanged: () => void }) {
  const today = todayStr()
  const start = periodRef(t.period ?? 'day', today)
  const checked = t.checkIns ?? []
  const inPeriod = checked.filter((d) => d >= start && d <= today).length
  const goal = t.goalDays ?? 0
  const pct = goal ? Math.min(100, Math.round((inPeriod / goal) * 100)) : 0
  const isMonth = (t.period ?? 'day') === 'month'

  async function toggleDay(d: string) {
    const ins = new Set(checked)
    if (ins.has(d)) ins.delete(d)
    else ins.add(d)
    const arr = [...ins]
    const ip = arr.filter((x) => x >= start && x <= today).length
    const done = goal ? ip >= goal : false
    await updateTodo(t.id!, { checkIns: arr, done })
    await onChanged()
  }

  if (isMonth) {
    return (
      <div className="mt-2 pl-8">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2.5 glass rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-white/60 whitespace-nowrap">
            {inPeriod}/{goal} · {pct}%
          </span>
        </div>
      </div>
    )
  }

  const todayChecked = checked.includes(today)
  return (
    <div className="mt-2 pl-8">
      <div className="flex items-center gap-1.5 flex-wrap">
        {Array.from({ length: goal }).map((_, i) => {
          const d = checked[i]
          return (
            <button
              key={i}
              onClick={() => (d ? toggleDay(d) : toggleDay(today))}
              className={`w-5 h-5 rounded-md transition ${d ? 'bg-brand-500 hover:bg-brand-600 cursor-pointer' : 'bg-white/20 hover:bg-brand-300 cursor-pointer'}`}
              title={d ? `已打卡 ${d}（点击取消）` : '点击「今日打卡」'}
              aria-label={d ? `已打卡 ${d}` : '今日打卡'}
            />
          )
        })}
        <span className="text-xs text-white/60 ml-1">
          {inPeriod}/{goal}
        </span>
      </div>
      {!todayChecked && (
        <div className="text-[11px] text-brand-600 mt-1">今日还没打卡，点上方格子记录一下吧 👆</div>
      )}
    </div>
  )
}
