const { chromium } = require('playwright')

const OUT = '/workspace/.ux'
const results = []
const consoleErrors = []
const pageErrors = []

function step(name, fn) {
  return (async () => {
    try {
      const r = await fn()
      results.push({ step: name, ok: true, info: r || '' })
      console.log('OK  ', name, r || '')
    } catch (e) {
      results.push({ step: name, ok: false, error: String(e && e.message ? e.message : e) })
      console.log('FAIL', name, e && e.message ? e.message : e)
    }
  })()
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 本地日期字符串，与前端 todayStr() 一致（避免 UTC 偏差）
function lds(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function addDaysStr(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return lds(d)
}

// 构造种子数据，覆盖全部六类，便于验证合并日历与方向性标签
const today = lds()
// 当月 1 号（必在「本月」统计区间内），与今日构成增重 65→67
const early = (() => { const d = new Date(); d.setDate(1); return lds(d) })()
// 周习惯须按「周起始日」存储（与 periodRef('week') 一致），否则不会出现在「每周待办」
const weekStart = (() => { const d = new Date(today + 'T00:00:00'); d.setDate(d.getDate() - d.getDay()); return lds(d) })()
const ts = (minsAgo) => Date.now() - minsAgo * 60000

const settings = {
  theme: 'light', pomodoroLen: 25, breakLen: 5,
  targetWeight: 60, waterTarget: 2000, exportFormat: 'json',
  onboarded: true, nickname: '测试用户',
}
const weights = [
  { id: 1, date: early, value: 65, note: '', createdAt: ts(300) },
  { id: 2, date: today, value: 67, note: '今天涨了', createdAt: ts(10) },
]
const todos = [
  { id: 3, title: '写周报', date: today, period: 'day', kind: 'event', done: false, createdAt: ts(200) },
  { id: 4, title: '每周健身', date: weekStart, period: 'week', kind: 'habit', goalDays: 3, checkIns: [], done: false, createdAt: ts(190) },
]
const pomodoros = [
  { id: 5, type: 'focus', done: true, start: ts(120), duration: 1500, todoId: 3, createdAt: ts(120) },
]
const moods = [
  { id: 6, date: today, mood: 4, text: '', createdAt: ts(100) },
]
const intakes = [
  { id: 7, date: today, kind: 'diet', meal: 'lunch', text: '沙拉', createdAt: ts(90) },
  { id: 8, date: today, kind: 'water', amount: 500, createdAt: ts(80) },
]
const bowels = [
  { id: 9, date: today, count: 1, createdAt: ts(70) },
]
const seed = {
  'dt_settings': settings,
  'dt_weights': weights,
  'dt_todos': todos,
  'dt_pomodoros': pomodoros,
  'dt_moods': moods,
  'dt_intakes': intakes,
  'dt_bowels': bowels,
  'dt_notes': [],
  'dt_seq': 9,
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }) // 桌面视口
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => pageErrors.push(String(e)))

  // 在应用脚本执行前注入种子数据
  await page.addInitScript((s) => {
    const data = JSON.parse(s)
    for (const k of Object.keys(data)) localStorage.setItem(k, JSON.stringify(data[k]))
  }, JSON.stringify(seed))

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  await sleep(800)
  // 显式等待首页渲染完成（开发服务器首屏需拉取模块）
  await page.getByRole('heading', { name: '今日概览' }).waitFor({ state: 'visible', timeout: 30000 })

  // 0. 无引导弹窗（已 seed onboarded）
  await step('no-onboarding', async () => {
    const t = await page.getByText('欢迎，先做个小设置').isVisible().catch(() => false)
    return t ? '引导仍出现(异常)' : '已跳过引导'
  })

  // 1. 首页
  await step('home-title', async () => {
    const t = await page.getByRole('heading', { name: '今日概览' }).isVisible()
    return t ? '首页标题可见' : '无'
  })
  await page.screenshot({ path: `${OUT}/d01-home.png` })

  // P1-2：首页「记录」卡片点击后跳转记录页
  await step('P1-2-record-card-nav', async () => {
    const card = page.getByRole('button', { name: /记录/ })
    await card.waitFor({ state: 'visible', timeout: 10000 })
    await card.click()
    await sleep(500)
    const url = page.url()
    return url.includes('/journal') ? `跳转记录页成功 ${url}` : `未跳转 ${url}`
  })
  await step('back-to-home', async () => {
    await page.getByRole('link', { name: '首页' }).click()
    await sleep(400)
    return '回到首页'
  })

  // P1-1：首页「待办」卡片弹窗含「查看全部待办 →」，点击跳转待办页
  await step('P1-1-open-todo-modal', async () => {
    await page.getByRole('button', { name: '待办' }).click()
    await sleep(400)
    const t = await page.getByText('添加待办').isVisible()
    return t ? '待办弹窗出现' : '未出现'
  })
  await step('P1-1-view-all-link', async () => {
    const link = page.getByRole('button', { name: '查看全部待办 →' })
    const visible = await link.isVisible().catch(() => false)
    return visible ? '链接存在' : '链接缺失'
  })
  await step('P1-1-click-nav', async () => {
    await page.getByRole('button', { name: '查看全部待办 →' }).click()
    await sleep(500)
    const url = page.url()
    return url.includes('/todo') ? `跳转待办页成功 ${url}` : `未跳转 ${url}`
  })

  // P1-3：周习惯空格子可点击打卡
  await step('P1-3-habit-hint', async () => {
    const hint = await page.getByText('今日还没打卡').isVisible().catch(() => false)
    return hint ? '未打卡提示出现' : '提示缺失'
  })
  await step('P1-3-click-empty-square', async () => {
    const before = await page.evaluate(() => {
      const todos = JSON.parse(localStorage.getItem('dt_todos') || '[]')
      const h = todos.find((x) => x.title === '每周健身')
      return (h && h.checkIns) || []
    })
    // 点一个标题为「今日打卡」的空格子
    await page.getByTitle('今日打卡').first().click()
    await sleep(400)
    const after = await page.evaluate(() => {
      const todos = JSON.parse(localStorage.getItem('dt_todos') || '[]')
      const h = todos.find((x) => x.title === '每周健身')
      return (h && h.checkIns) || []
    })
    const ok = after.length === before.length + 1 && after.includes(today)
    return ok ? `打卡成功 checkIns=${JSON.stringify(after)}` : `未同步 before=${JSON.stringify(before)} after=${JSON.stringify(after)}`
  })

  // P1-4：记录页日历展示六类（日历已从导航移除，合并后由记录页承载）
  await step('nav-journal', async () => {
    await page.getByRole('link', { name: '记录' }).click()
    await sleep(500)
    return '进入记录页'
  })
  await page.screenshot({ path: `${OUT}/d03-journal.png` })
  await step('P1-4-journal-legend-6', async () => {
    const labels = ['体重', '待办', '番茄', '心情', '饮食', '排便']
    const vis = []
    for (const l of labels) {
      const v = await page.getByText(l, { exact: true }).first().isVisible().catch(() => false)
      vis.push(`${l}:${v ? 'Y' : 'N'}`)
    }
    const all = vis.every((x) => x.endsWith('Y'))
    return all ? '记录页日历六类图例齐全' : `图例不全 ${vis.join(' ')}`
  })

  // P2-2：体重页「累计增重」方向性标签（种子为增重 65→67）
  await step('nav-weight', async () => {
    await page.getByRole('link', { name: '体重' }).click()
    await sleep(500)
    return '进入体重页'
  })
  await page.screenshot({ path: `${OUT}/d04-weight.png` })
  await step('P2-2-weight-direction', async () => {
    const labelGain = await page.getByText('累计增重 (kg)').isVisible().catch(() => false)
    const val = await page.getByText('+2', { exact: false }).first().isVisible().catch(() => false)
    return labelGain ? `方向标签正确(累计增重) 数值含+2=${val}` : '仍显示累计已减(异常)'
  })

  // P2-2：统计页方向性标签
  await step('nav-stats', async () => {
    await page.getByRole('link', { name: '统计' }).click()
    await sleep(500)
    return '进入统计页'
  })
  await page.screenshot({ path: `${OUT}/d05-stats.png` })
  await step('P2-2-stats-direction', async () => {
    // 切到「本月」区间，确保包含当月 1 号与今日两条体重
    await page.getByRole('button', { name: '本月' }).click()
    await sleep(400)
    const labelGain = await page.getByText('累计增重').isVisible().catch(() => false)
    return labelGain ? '统计页方向标签正确(累计增重)' : '仍显示累计已减(异常)'
  })

  console.log('\n=== RESULTS ===')
  console.log(JSON.stringify(results, null, 2))
  console.log('\n=== CONSOLE ERRORS (' + consoleErrors.length + ') ===')
  console.log(JSON.stringify(consoleErrors.slice(0, 30), null, 2))
  console.log('\n=== PAGE ERRORS (' + pageErrors.length + ') ===')
  console.log(JSON.stringify(pageErrors.slice(0, 30), null, 2))

  await browser.close()
})().catch((e) => {
  console.log('FATAL', e)
  process.exit(1)
})
