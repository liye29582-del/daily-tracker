import { useEffect, useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { addWeight, addTodo, getBowels, getWeights, getTodos, getPomodoros, getMoods, getIntakes } from '../db'
import { useStore } from '../store'
import { todayStr, fmtDuration, periodRef } from '../utils'
import { WeightRecord, Todo, PomodoroSession, IntakeRecord, BowelRecord, MoodEntry, TodoPeriod } from '../types'

type ModalKind = null | 'weight' | 'todo' | 'focus'

export default function Dashboard() {
  const { startFocus, settings, timer, pauseTimer, startTimer, finishAndAsk } = useStore()
  const navigate = useNavigate()
  const [weights, setWeights] = useState<WeightRecord[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [pomodoros, setPomodoros] = useState<PomodoroSession[]>([])
  const [moods, setMoods] = useState<MoodEntry[]>([])
  const [intakes, setIntakes] = useState<IntakeRecord[]>([])
  const [bowels, setBowels] = useState<BowelRecord[]>([])
  const [modal, setModal] = useState<ModalKind>(null)

  useEffect(() => {
    void refresh()
  }, [])

  async function refresh() {
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

  const today = todayStr()
  const todayTodos = todos.filter((t) => t.date === today)
  const doneCount = todayTodos.filter((t) => t.done).length
  const latestWeight = weights.length ? weights[weights.length - 1] : null
  const boundTodo = todos.find((t) => t.id === timer.todoId)
  const todayFocus = pomodoros.filter(
    (p) => p.type === 'focus' && p.done && new Date(p.start).toDateString() === new Date().toDateString(),
  )
  const focusSeconds = todayFocus.reduce((s, p) => s + p.duration, 0)
  const todayRecords =
    moods.filter((m) => m.date === today).length +
    intakes.filter((r) => r.date === today).length +
    bowels.filter((b) => b.date === today && b.count > 0).length

  const subtitle = settings.nickname
    ? `${settings.nickname}，今天也要好好记录哦`
    : '坚持记录，看见自己的变化'

  return (
    <div>
      {timer.active ? (
        <CountdownView
          boundTitle={boundTodo?.title}
          onPause={pauseTimer}
          onResume={startTimer}
          onEnd={finishAndAsk}
          running={timer.running}
          remaining={timer.remaining}
          total={timer.total}
          mode={timer.mode}
        />
      ) : (
        <>
          <div className="text-center mb-9 mt-2">
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">今日概览</h1>
            <p className="text-gray-400 text-sm mt-2">{subtitle}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ModuleCard icon="⚖️" tint="from-sky-50 to-sky-100/70" iconBg="bg-sky-100 text-sky-600" title="体重" value={latestWeight ? `${latestWeight.value} kg` : '—'} sub={latestWeight ? latestWeight.date : '点按记录'} onClick={() => setModal('weight')} />
            <ModuleCard icon="✅" tint="from-emerald-50 to-emerald-100/70" iconBg="bg-emerald-100 text-emerald-600" title="待办" value={`${doneCount}/${todayTodos.length}`} sub="今日已完成 / 总数" onClick={() => setModal('todo')} />
            <ModuleCard icon="🍅" tint="from-rose-50 to-rose-100/70" iconBg="bg-rose-100 text-rose-500" title="专注" value={todayFocus.length > 0 ? `${todayFocus.length} 个` : '0'} sub={focusSeconds > 0 ? fmtDuration(focusSeconds) : '点按开始'} onClick={() => setModal('focus')} />
            <ModuleCard icon="📝" tint="from-violet-50 to-violet-100/70" iconBg="bg-violet-100 text-violet-600" title="记录" value={todayRecords > 0 ? `${todayRecords} 项` : '—'} sub="心情/饮水/饮食/排便" onClick={() => navigate('/journal')} />
          </div>

          {modal === 'weight' && (
            <WeightModal onClose={() => { setModal(null); void refresh() }} />
          )}
          {modal === 'todo' && (
            <TodoModal onClose={() => { setModal(null); void refresh() }} />
          )}
          {modal === 'focus' && (
            <FocusModal onClose={() => setModal(null)} startFocus={startFocus} todos={todos} />
          )}
        </>
      )}
    </div>
  )
}

// 首页倒计时视图：专注进行中（含暂停）时替换首页卡片，仅呈现倒计时
function CountdownView({
  boundTitle,
  onPause,
  onResume,
  onEnd,
  running,
  remaining,
  total,
  mode,
}: {
  boundTitle?: string
  onPause: () => void
  onResume: () => void
  onEnd: () => void
  running: boolean
  remaining: number
  total: number
  mode: 'focus' | 'break'
}) {
  const [endConfirm, setEndConfirm] = useState(false)
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const progress = total > 0 ? (remaining / total) * 100 : 0
  const accent = mode === 'focus' ? '#33a888' : '#10b981'

  return (
    <div className="text-center pt-6">
      <div className="text-gray-400 text-sm mb-6">{mode === 'focus' ? '专注中' : '休息中'}{running ? '' : '（已暂停）'}</div>

      <div className="relative w-60 h-60 mx-auto">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#eef2f7" strokeWidth="7" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={accent}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 45}
            strokeDashoffset={(2 * Math.PI * 45 * progress) / 100}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-5xl font-bold tabular-nums text-gray-800">{mm}:{ss}</div>
          {boundTitle && <div className="text-xs text-gray-500 mt-2 max-w-[150px] truncate px-2">🎯 {boundTitle}</div>}
        </div>
      </div>

      <div className="flex gap-3 mt-8 max-w-xs mx-auto">
        {running ? (
          <button onClick={onPause} className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-medium">暂停</button>
        ) : (
          <button onClick={onResume} className="flex-1 bg-brand-600 text-white py-3 rounded-xl font-medium">继续</button>
        )}
        <button onClick={() => setEndConfirm(true)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium">结束</button>
      </div>

      {endConfirm && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setEndConfirm(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-3xl mb-2">🍅</div>
            <div className="font-bold text-lg mb-1">结束当前专注？</div>
            <p className="text-sm text-gray-500 mb-4">结束后可记录该任务是否完成，专注时长已计入统计。</p>
            <div className="flex gap-3">
              <button onClick={() => setEndConfirm(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium">继续专注</button>
              <button
                onClick={() => {
                  setEndConfirm(false)
                  onEnd()
                }}
                className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-medium"
              >
                结束
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ModuleCard({
  icon,
  tint,
  iconBg,
  title,
  value,
  sub,
  onClick,
}: {
  icon: string
  tint: string
  iconBg: string
  title: string
  value: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left bg-gradient-to-br ${tint} rounded-3xl p-5 border border-white/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}
    >
      <div className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center text-xl`}>
        {icon}
      </div>
      <div className="mt-4 text-xs text-gray-500">{title}</div>
      <div className="text-xl font-bold text-gray-800 mt-0.5 truncate">{value}</div>
      <div className="text-[11px] text-gray-400 mt-1 truncate">{sub}</div>
    </button>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-lg">{title}</div>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const fieldCls = 'w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-brand-400'

function WeightModal({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  return (
    <Modal title="记录体重" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500">体重 (kg)</label>
          <input type="number" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} placeholder="如 62.5" className={fieldCls} autoFocus />
        </div>
        <div>
          <label className="text-xs text-gray-500">备注（可选）</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="如 晨起空腹" className={fieldCls} />
        </div>
        {err && <div className="text-xs text-red-500">{err}</div>}
        <button
          onClick={async () => {
            const v = parseFloat(value)
            if (!v || v <= 0) {
              setErr('请填写有效体重')
              return
            }
            await addWeight({ date: todayStr(), value: v, note: note || undefined })
            onClose()
          }}
          className="w-full bg-brand-600 text-white py-2.5 rounded-xl font-medium"
        >
          保存
        </button>
      </div>
    </Modal>
  )
}

function TodoModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [period, setPeriod] = useState<TodoPeriod>('day')
  const [kind, setKind] = useState<'event' | 'habit'>('event')
  const [goalDays, setGoalDays] = useState(5)
  const [err, setErr] = useState('')
  const today = todayStr()
  const showKind = period !== 'day'

  async function pickPeriod(v: TodoPeriod) {
    setPeriod(v)
    setKind('event')
    setGoalDays(v === 'month' ? 20 : 5)
  }
  return (
    <Modal title="添加待办" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500">内容</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="要做什么？" className={fieldCls} autoFocus />
        </div>
        <div>
          <label className="text-xs text-gray-500">归属</label>
          <div className="flex gap-2 mt-1">
            {([['day', '每日'], ['week', '每周'], ['month', '每月']] as const).map(([v, l]) => (
              <button
                key={v}
                onClick={() => pickPeriod(v)}
                className={`flex-1 py-2 rounded-lg text-sm border ${
                  period === v ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {showKind && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              {([['event', '事件'], ['habit', '习惯']] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setKind(v)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    kind === v ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            {kind === 'habit' && (
              <label className="flex items-center gap-1 text-xs text-gray-500">
                目标
                <input
                  type="number"
                  min={1}
                  max={period === 'week' ? 7 : 31}
                  value={goalDays}
                  onChange={(e) => setGoalDays(Math.max(1, Number(e.target.value) || 1))}
                  className="w-14 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-brand-400"
                />
                天/{period === 'week' ? '周' : '月'}
              </label>
            )}
          </div>
        )}

        {err && <div className="text-xs text-red-500">{err}</div>}
        <button
          onClick={async () => {
            if (!title.trim()) {
              setErr('请填写内容')
              return
            }
            await addTodo({
              title: title.trim(),
              date: periodRef(period, today),
              period,
              ...(showKind ? { kind, goalDays: kind === 'habit' ? goalDays : undefined } : {}),
            })
            onClose()
          }}
          className="w-full bg-brand-600 text-white py-2.5 rounded-xl font-medium"
        >
          添加
        </button>
      </div>
      <button
        onClick={() => {
          onClose()
          navigate('/todo')
        }}
        className="w-full mt-2 text-brand-600 text-sm py-2 hover:underline"
      >
        查看全部待办 →
      </button>
    </Modal>
  )
}

function FocusModal({
  onClose,
  startFocus,
  todos,
}: {
  onClose: () => void
  startFocus: (minutes: number, todoId?: number) => void
  todos: Todo[]
}) {
  const [len, setLen] = useState(25)
  const [bindOn, setBindOn] = useState(false)
  const [bindPeriod, setBindPeriod] = useState<TodoPeriod>('day')
  const [boundId, setBoundId] = useState<number | null>(null)
  const today = todayStr()

  const candidateTodos = bindOn
    ? todos.filter(
        (t) =>
          (t.period ?? 'day') === bindPeriod &&
          t.date === periodRef(bindPeriod, today) &&
          !t.done,
      )
    : []

  return (
    <Modal title="开始专注" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500">时长（分钟）</label>
          <div className="flex gap-2 mt-1">
            {[15, 25, 45, 60].map((m) => (
              <button
                key={m}
                onClick={() => setLen(m)}
                className={`flex-1 py-2 rounded-lg text-sm border ${
                  len === m ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* 绑定开关 */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
          <div>
            <div className="text-sm font-medium">绑定待办</div>
            <div className="text-[11px] text-gray-400">结束后可记录该任务是否完成</div>
          </div>
          <button
            onClick={() => {
              setBindOn((o) => !o)
              setBoundId(null)
            }}
            className={`relative w-12 h-7 rounded-full transition ${bindOn ? 'bg-brand-600' : 'bg-gray-300'}`}
            aria-pressed={bindOn}
            aria-label="绑定待办"
          >
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${bindOn ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        {bindOn && (
          <>
            {/* 日 / 周 / 月 横排 */}
            <div className="flex gap-2">
              {([['day', '日'], ['week', '周'], ['month', '月']] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => {
                    setBindPeriod(v)
                    setBoundId(null)
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm border ${
                    bindPeriod === v ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-400">选择「{bindPeriod === 'day' ? '今日' : bindPeriod === 'week' ? '本周' : '本月'}」待办</div>

            {/* 对应周期待办纵排 */}
            <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
              {candidateTodos.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setBoundId(t.id ?? null)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl border transition ${
                    boundId === t.id ? 'bg-brand-50 border-brand-400' : 'bg-white border-gray-200 hover:border-brand-300'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${boundId === t.id ? 'border-brand-600 bg-brand-600' : 'border-gray-300'}`}>
                    {boundId === t.id && <span className="text-white text-[10px]">✓</span>}
                  </span>
                  <span className="flex-1 text-sm truncate">{t.title}</span>
                  {t.kind === 'habit' && <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 rounded">习惯</span>}
                </button>
              ))}
              {candidateTodos.length === 0 && (
                <div className="text-center text-gray-400 text-xs py-4">该周期暂无待办，可去「待办」里添加</div>
              )}
            </div>
          </>
        )}

        <button
          onClick={() => {
            startFocus(len, boundId ?? undefined)
            onClose()
          }}
          className="w-full bg-brand-600 text-white py-2.5 rounded-xl font-medium"
        >
          开始专注
        </button>
        <p className="text-[11px] text-gray-400 text-center">专注将在后台计时，可随时从右上角浮标返回。</p>
      </div>
    </Modal>
  )
}

