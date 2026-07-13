import { useEffect, useState, ReactNode } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useStore } from './store'
import { getTodos, addWeight } from './db'
import { Todo as TodoT } from './types'
import { todayStr, CUP_ML } from './utils'
import AnimatedBackground from './components/AnimatedBackground'
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
  { to: '/', label: '首页', icon: '🏠', end: true, children: [
    { to: '/weight', label: '体重', icon: '⚖️' }, { to: '/todo', label: '待办', icon: '✅' },
    { to: '/focus', label: '番茄钟', icon: '🍅' }, { to: '/journal', label: '记录', icon: '📝' },
  ]},
  { to: '/notes', label: '灵感', icon: '💡' }, { to: '/stats', label: '统计', icon: '📊' }, { to: '/settings', label: '设置', icon: '⚙️' },
]

function Sidebar() {
  const [homeOpen, setHomeOpen] = useState(true)
  return (
    <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto py-2 sidebar-scroll">
      {GROUPS.map(g => (
        <div key={g.label}>
          <div className="flex items-center">
            <NavLink to={g.to} end={g.end} className={({isActive}) => `flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'glass-strong text-brand-700 font-bold' : 'text-white/70 hover:bg-white/15 hover:text-white'}`}>
              <span className="text-lg">{g.icon}</span>{g.label}
            </NavLink>
            {g.children && <button onClick={() => setHomeOpen(o => !o)} className="px-2 text-white/40 hover:text-white/70" aria-label="展开/收起"><span className={`inline-block transition-transform ${homeOpen ? 'rotate-90' : ''}`}>›</span></button>}
          </div>
          {g.children && homeOpen && <div className="ml-7 mt-0.5 space-y-0.5">
            {g.children.map(c => (
              <NavLink key={c.to} to={c.to} className={({isActive}) => `flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${isActive ? 'glass-strong text-brand-700 font-bold' : 'text-white/60 hover:bg-white/15 hover:text-white'}`}>
                <span>{c.icon}</span>{c.label}
              </NavLink>
            ))}
          </div>}
        </div>
      ))}
    </nav>
  )
}

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen relative">
      <AnimatedBackground />
      <div className="fixed inset-0 z-[1] bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />
      <aside className="hidden md:flex md:flex-col md:w-60 md:fixed md:inset-y-0 z-10 md:ml-4 md:mt-4 md:mb-4 glass rounded-2xl max-h-[calc(100vh-2rem)]">
        <div className="px-5 pt-5 pb-1 flex items-center gap-2"><span className="text-2xl">🌊</span><span className="font-serif font-bold text-xl text-white/90">日迹</span></div>
        <Sidebar />
        <div className="px-5 py-3 text-[11px] text-white/40 mt-auto">数据仅存于本机 · v0.7</div>
      </aside>
      <main className="relative z-[5] flex-1 md:ml-64 min-w-0"><div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8 page-enter">{children}</div></main>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-10 glass border-t border-white/20 flex rounded-t-2xl">
        {GROUPS.filter(g => !g.children).map(g => (
          <NavLink key={g.to} to={g.to} end={g.end} className={({isActive}) => `flex-1 flex flex-col items-center justify-center py-2.5 text-[11px] gap-0.5 transition-all ${isActive ? 'text-white font-bold' : 'text-white/50'}`}>
            <span className="text-xl leading-none">{g.icon}</span>{g.label}
          </NavLink>
        ))}
      </nav>
      <RunningBadge />
    </div>
  )
}

function RunningBadge() {
  const { timer } = useStore(); const loc = useLocation()
  if (!timer.active || loc.pathname === '/focus' || loc.pathname === '/') return null
  const mm = String(Math.floor(timer.remaining / 60)).padStart(2, '0'); const ss = String(timer.remaining % 60).padStart(2, '0')
  return <NavLink to="/focus" className="md:hidden fixed top-3 right-3 z-30 glass-btn-primary text-white text-xs px-3 py-1.5 rounded-full shadow-lg">🍅 {timer.mode === 'focus' ? '专注' : '休息'} {mm}:{ss}</NavLink>
}

function Onboarding() {
  const { settings, saveSettings } = useStore()
  const [nickname, setNickname] = useState(settings.nickname ?? ''); const [gender, setGender] = useState<'male'|'female'|'other'>(settings.gender ?? 'male')
  const [curWeight, setCurWeight] = useState(''); const [targetWeight, setTargetWeight] = useState(''); const [cups, setCups] = useState(8); const [err, setErr] = useState('')
  if (settings.onboarded) return null
  async function submit() {
    const cw = parseFloat(curWeight); if (!cw || cw <= 0) { setErr('请填写当前体重'); return }
    const tw = targetWeight ? parseFloat(targetWeight) : undefined
    await saveSettings({ nickname: nickname.trim() || undefined, gender, targetWeight: tw && tw > 0 ? tw : undefined, waterTarget: cups * CUP_ML, onboarded: true })
    await addWeight({ date: todayStr(), value: cw })
  }
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="glass-modal">
        <div className="text-3xl mb-2">🌊</div>
        <h2 className="font-serif text-lg font-bold mb-1 text-white/90">欢迎，先做个小设置</h2>
        <p className="text-sm text-white/60 mb-4 leading-relaxed">填几项基础信息，方便后续记录与统计。都可随时在「设置」里修改。</p>
        <div className="space-y-3">
          <div><label className="text-xs text-white/60">昵称（可选）</label><input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="怎么称呼你？" className="glass-input" /></div>
          <div><label className="text-xs text-white/60">性别</label>
            <div className="flex gap-2 mt-1">{([['male','男'],['female','女'],['other','其他']] as const).map(([v,l]) => (
              <button key={v} onClick={() => setGender(v)} className={`flex-1 py-2 rounded-xl text-sm transition-all ${gender === v ? 'glass-btn-primary' : 'glass-btn'}`}>{l}</button>
            ))}</div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="text-xs text-white/60">当前体重 (kg)</label><input type="number" step="0.1" value={curWeight} onChange={e => setCurWeight(e.target.value)} placeholder="如 62.5" className="glass-input" /></div>
            <div className="flex-1"><label className="text-xs text-white/60">目标体重 (kg)</label><input type="number" step="0.1" value={targetWeight} onChange={e => setTargetWeight(e.target.value)} placeholder="可选" className="glass-input" /></div>
          </div>
          <div><label className="text-xs text-white/60">每日期待饮水量（杯，1 杯≈250ml）</label><input type="number" min={1} value={cups} onChange={e => setCups(Math.max(1, Number(e.target.value) || 1))} className="glass-input" /><div className="text-[11px] text-white/40 mt-1">默认 8 杯（2000ml），成年人常见建议量，可改。</div></div>
        </div>
        {err && <div className="text-xs text-red-300 mt-2">{err}</div>}
        <button onClick={submit} className="w-full glass-btn-primary mt-4">开始使用</button>
      </div>
    </div>
  )
}

export default function App() {
  const { loadSettings, settingsLoaded, settings, timer, tick, pendingCompleteTodoId, resolveComplete } = useStore()
  useEffect(() => { void loadSettings() }, [loadSettings])
  useEffect(() => { if (!timer.running) return; const id = setInterval(() => tick(), 1000); return () => clearInterval(id) }, [timer.running, tick])
  useEffect(() => {
    if (!settings.browserNotify) return; if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const id = setInterval(async () => {
      const today = todayStr(); if (localStorage.getItem('dt_last_notify') === today) return
      const todos = await getTodos(); const undone = todos.filter(t => t.date === today && !t.done).length
      if (undone > 0) { new Notification('日迹 · 今日提醒', { body: `还有 ${undone} 条待办未完成，加油 💪` }); localStorage.setItem('dt_last_notify', today) }
    }, 5 * 60 * 1000); return () => clearInterval(id)
  }, [settings.browserNotify, settingsLoaded])

  if (!settingsLoaded) return <div className="min-h-screen flex items-center justify-center text-white/50" style={{background:'#0f0c29'}}><div className="glass px-6 py-3 rounded-2xl text-sm">加载中…</div></div>
  return (
    <><Layout><Routes>
      <Route path="/" element={<Dashboard />} /><Route path="/weight" element={<Weight />} /><Route path="/todo" element={<Todo />} />
      <Route path="/focus" element={<Focus />} /><Route path="/journal" element={<Journal />} /><Route path="/notes" element={<Notes />} />
      <Route path="/calendar" element={<Calendar />} /><Route path="/stats" element={<Stats />} /><Route path="/settings" element={<Settings />} />
    </Routes></Layout><Onboarding /><CompleteModal todoId={pendingCompleteTodoId} onResolve={resolveComplete} /></>
  )
}

function CompleteModal({ todoId, onResolve }: { todoId: number | null; onResolve: (done: boolean) => void }) {
  const [todo, setTodo] = useState<TodoT | null>(null)
  useEffect(() => { if (todoId != null) { void getTodos().then(arr => setTodo(arr.find(x => x.id === todoId) ?? null)) } else setTodo(null) }, [todoId])
  if (todoId == null) return null; const isHabit = todo?.kind === 'habit'
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="glass-modal text-center">
        <div className="text-4xl mb-2">{isHabit ? '🔁' : '🍅'}</div>
        <div className="font-serif font-bold text-lg mb-1 text-white/90">{isHabit ? '今日习惯达成了吗？' : '这个专注完成了吗？'}</div>
        {todo?.title && <div className="text-sm text-white/60 mb-4 truncate px-2">「{todo.title}」</div>}
        <div className="flex flex-col gap-2">
          <button onClick={() => onResolve(true)} className="w-full glass-btn-primary">{isHabit ? '🌱 已达成（打卡今日）' : '✅ 已完成（自动勾选）'}</button>
          <button onClick={() => onResolve(false)} className="w-full glass-btn">{isHabit ? '尚未达成，保留进度' : '仍未完成，保留任务'}</button>
        </div>
      </div>
    </div>
  )
}
