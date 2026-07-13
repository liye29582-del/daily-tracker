import { useEffect, useState, ReactNode } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useStore } from './store'
import { getTodos, addWeight } from './db'
import { Todo as TodoT } from './types'
import { todayStr, CUP_ML } from './utils'
import Dashboard from './pages/Dashboard'
import Weight from './pages/Weight'
import Todo from './pages/Todo'
import Focus from './pages/Focus'
import Calendar from './pages/Calendar'
import Stats from './pages/Stats'
import Settings from './pages/Settings'
import Journal from './pages/Journal'
import Notes from './pages/Notes'

const GROUPS = [
  {
    to: '/',
    label: '首页',
    icon: '🏠',
    end: true,
    children: [
      { to: '/weight', label: '体重', icon: '⚖️' },
      { to: '/todo', label: '待办', icon: '✅' },
      { to: '/focus', label: '番茄钟', icon: '🍅' },
      { to: '/journal', label: '记录', icon: '📝' },
    ],
  },
  { to: '/notes', label: '灵感', icon: '💡' },
  { to: '/stats', label: '统计', icon: '📊' },
  { to: '/settings', label: '设置', icon: '⚙️' },
]

function Sidebar() {
  const [homeOpen, setHomeOpen] = useState(true)
  return (
    <nav className="flex-1 px-2 space-y-1 overflow-y-auto py-1">
      {GROUPS.map((g) => (
        <div key={g.label}>
          <div className="flex items-center">
            <NavLink
              to={g.to}
              end={g.end}
              className={({ isActive }) =>
                `flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <span className="text-lg">{g.icon}</span>
              {g.label}
            </NavLink>
            {g.children && (
              <button
                onClick={() => setHomeOpen((o) => !o)}
                className="px-2 text-gray-400 hover:text-gray-600"
                aria-label="展开/收起"
              >
                <span className={`inline-block transition-transform ${homeOpen ? 'rotate-90' : ''}`}>›</span>
              </button>
            )}
          </div>
          {g.children && homeOpen && (
            <div className="ml-7 mt-1 space-y-1">
              {g.children.map((c) => (
                <NavLink
                  key={c.to}
                  to={c.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition ${
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-100'
                    }`
                  }
                >
                  <span>{c.icon}</span>
                  {c.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* 宽屏侧栏 */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:fixed md:inset-y-0 bg-white/80 backdrop-blur border-r border-gray-100">
        <div className="px-5 py-5 text-brand-700 font-bold text-lg">日常记录</div>
        <Sidebar />
        <div className="px-5 py-4 text-xs text-gray-400">数据仅存于本机 · v0.6</div>
      </aside>

      {/* 主内容 */}
      <main className="flex-1 md:ml-60 min-w-0">
        <div className="max-w-2xl mx-auto px-5 py-8 pb-24 md:pb-8">{children}</div>
      </main>

      {/* 窄屏底部 Tab（仅顶级四项） */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t border-gray-100 flex z-20">
        {GROUPS.filter((g) => !g.children).map((g) => (
          <NavLink
            key={g.to}
            to={g.to}
            end={g.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2.5 text-[11px] gap-0.5 ${
                isActive ? 'text-brand-700' : 'text-gray-500'
              }`
            }
          >
            <span className="text-xl leading-none">{g.icon}</span>
            {g.label}
          </NavLink>
        ))}
      </nav>

      {/* 番茄钟进行中浮标 */}
      <RunningBadge />
    </div>
  )
}

function RunningBadge() {
  const { timer } = useStore()
  const loc = useLocation()
  if (!timer.active || loc.pathname === '/focus' || loc.pathname === '/') return null
  const mm = String(Math.floor(timer.remaining / 60)).padStart(2, '0')
  const ss = String(timer.remaining % 60).padStart(2, '0')
  return (
    <NavLink
      to="/focus"
      className="md:hidden fixed top-3 right-3 z-30 bg-brand-600 text-white text-xs px-3 py-1.5 rounded-full shadow"
    >
      🍅 {timer.mode === 'focus' ? '专注' : '休息'} {mm}:{ss}
    </NavLink>
  )
}

function Onboarding() {
  const { settings, saveSettings } = useStore()
  const [nickname, setNickname] = useState(settings.nickname ?? '')
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(settings.gender ?? 'male')
  const [curWeight, setCurWeight] = useState('')
  const [targetWeight, setTargetWeight] = useState('')
  const [cups, setCups] = useState(8)
  const [err, setErr] = useState('')

  if (settings.onboarded) return null

  async function submit() {
    const cw = parseFloat(curWeight)
    if (!cw || cw <= 0) {
      setErr('请填写当前体重')
      return
    }
    const tw = targetWeight ? parseFloat(targetWeight) : undefined
    await saveSettings({
      nickname: nickname.trim() || undefined,
      gender,
      targetWeight: tw && tw > 0 ? tw : undefined,
      waterTarget: cups * CUP_ML,
      onboarded: true,
    })
    await addWeight({ date: todayStr(), value: cw })
  }

  const field = 'w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-brand-400'
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="text-3xl mb-2">👋</div>
        <h2 className="text-lg font-bold mb-1">欢迎，先做个小设置</h2>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          填几项基础信息，方便后续记录与统计。都可随时在「设置」里修改。
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">昵称（可选）</label>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="怎么称呼你？" className={field} />
          </div>
          <div>
            <label className="text-xs text-gray-500">性别</label>
            <div className="flex gap-2 mt-1">
              {([['male', '男'], ['female', '女'], ['other', '其他']] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setGender(v)}
                  className={`flex-1 py-2 rounded-lg text-sm border ${
                    gender === v ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500">当前体重 (kg)</label>
              <input type="number" step="0.1" value={curWeight} onChange={(e) => setCurWeight(e.target.value)} placeholder="如 62.5" className={field} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">目标体重 (kg)</label>
              <input type="number" step="0.1" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} placeholder="可选" className={field} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">每日期待饮水量（杯，1 杯≈250ml）</label>
            <input type="number" min={1} value={cups} onChange={(e) => setCups(Math.max(1, Number(e.target.value) || 1))} className={field} />
            <div className="text-[11px] text-gray-400 mt-1">默认 8 杯（2000ml），成年人常见建议量，可改。</div>
          </div>
        </div>
        {err && <div className="text-xs text-red-500 mt-2">{err}</div>}
        <button onClick={submit} className="w-full bg-brand-600 text-white py-2.5 rounded-xl font-medium mt-4">
          开始使用
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const { loadSettings, settingsLoaded, settings, timer, tick, pendingCompleteTodoId, resolveComplete } = useStore()

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  // 番茄钟计时循环
  useEffect(() => {
    if (!timer.running) return
    const id = setInterval(() => tick(), 1000)
    return () => clearInterval(id)
  }, [timer.running, tick])

  // 浏览器通知：页面打开时每 5 分钟检查一次，当天仅提醒一次
  useEffect(() => {
    if (!settings.browserNotify) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const id = setInterval(async () => {
      const today = todayStr()
      if (localStorage.getItem('dt_last_notify') === today) return
      const todos = await getTodos()
      const undone = todos.filter((t) => t.date === today && !t.done).length
      if (undone > 0) {
        new Notification('日常记录 · 今日提醒', {
          body: `还有 ${undone} 条待办未完成，加油 💪`,
        })
        localStorage.setItem('dt_last_notify', today)
      }
    }, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [settings.browserNotify, settingsLoaded])

  if (!settingsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        加载中…
      </div>
    )
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/weight" element={<Weight />} />
          <Route path="/todo" element={<Todo />} />
          <Route path="/focus" element={<Focus />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
      <Onboarding />
      <CompleteModal
        todoId={pendingCompleteTodoId}
        onResolve={resolveComplete}
      />
    </>
  )
}

// 全局「完成任务？」弹窗：仅当本次专注绑定了待办且结束时出现
function CompleteModal({
  todoId,
  onResolve,
}: {
  todoId: number | null
  onResolve: (done: boolean) => void
}) {
  const [todo, setTodo] = useState<TodoT | null>(null)
  useEffect(() => {
    if (todoId != null) {
      void getTodos().then((arr) => setTodo(arr.find((x) => x.id === todoId) ?? null))
    } else {
      setTodo(null)
    }
  }, [todoId])
  if (todoId == null) return null
  const isHabit = todo?.kind === 'habit'
  return (
    <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-xl text-center">
        <div className="text-4xl mb-2">{isHabit ? '🔁' : '🍅'}</div>
        <div className="font-bold text-lg mb-1">
          {isHabit ? '今日习惯达成了吗？' : '这个专注完成了吗？'}
        </div>
        {todo?.title && <div className="text-sm text-gray-500 mb-4 truncate px-2">「{todo.title}」</div>}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onResolve(true)}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-medium"
          >
            {isHabit ? '✅ 已达成（打卡今日）' : '✅ 已完成（自动勾选）'}
          </button>
          <button
            onClick={() => onResolve(false)}
            className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-xl font-medium"
          >
            {isHabit ? '尚未达成，保留进度' : '仍未完成，保留任务'}
          </button>
        </div>
      </div>
    </div>
  )
}
