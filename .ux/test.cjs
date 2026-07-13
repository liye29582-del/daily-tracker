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

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 414, height: 896 } }) // 移动视口
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => pageErrors.push(String(e)))

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  await sleep(400)

  // 1. 引导
  await step('onboarding-visible', async () => {
    const t = await page.getByText('欢迎，先做个小设置').first().isVisible()
    return t ? '引导弹窗出现' : '未出现'
  })
  await step('onboarding-fill', async () => {
    await page.getByPlaceholder('如 62.5').fill('62.5')
    await page.getByRole('button', { name: '开始使用' }).click()
    await sleep(400)
    return '已提交引导'
  })

  // 2. 首页
  await page.screenshot({ path: `${OUT}/01-home.png` })
  await step('home-title', async () => {
    const t = await page.getByRole('heading', { name: '今日概览' }).isVisible()
    return t ? '首页标题可见' : '无'
  })

  // 3. 体重（首页卡片 -> 弹窗）
  await step('weight-add', async () => {
    await page.getByRole('button', { name: '体重' }).click()
    await sleep(300)
    await page.getByPlaceholder('如 62.5').fill('61.0')
    await page.getByRole('button', { name: '保存' }).click()
    await sleep(300)
    const closed = await page.getByPlaceholder('如 62.5').isVisible().catch(() => false)
    return closed ? '弹窗未关闭' : '体重已记录并关闭弹窗'
  })

  // 4. 底部导航 -> 待办（验证移动端可达性，关键修复点）
  await step('nav-to-todo', async () => {
    await page.getByRole('link', { name: '待办' }).click()
    await sleep(400)
    const t = await page.getByRole('heading', { name: '待办' }).isVisible()
    return t ? '移动端成功进入待办页' : '进入失败'
  })
  await step('todo-week-habit', async () => {
    await page.getByPlaceholder('添加…').fill('每周读书')
    await page.getByRole('button', { name: '习惯' }).click()
    await sleep(150)
    await page.getByRole('button', { name: '+' }).click()
    await sleep(300)
    const has = await page.getByText('每周读书').isVisible()
    return has ? '周习惯已添加' : '未添加'
  })
  await step('todo-day-event', async () => {
    await page.getByPlaceholder('添加…').fill('写周报')
    await page.getByRole('button', { name: '+' }).click()
    await sleep(300)
    const has = await page.getByText('写周报').isVisible()
    return has ? '日事件已添加' : '未添加'
  })

  // 5. 绑定周习惯并倒计时（首页 FocusModal）
  await step('nav-to-home', async () => {
    await page.getByRole('link', { name: '首页' }).click()
    await sleep(400)
    return '回到首页'
  })
  await step('focus-bind-habit', async () => {
    await page.getByRole('button', { name: '专注' }).click()
    await sleep(300)
    await page.getByRole('button', { name: '绑定待办' }).click()
    await sleep(200)
    await page.getByRole('button', { name: '周' }).click()
    await sleep(200)
    await page.locator('.max-h-52 button').first().click()
    await sleep(150)
    await page.getByRole('button', { name: '开始专注' }).click()
    await sleep(500)
    return '已开启绑定并倒计时'
  })
  await page.screenshot({ path: `${OUT}/02-countdown.png` })
  await step('countdown-view', async () => {
    const t = await page.getByRole('button', { name: '结束' }).first().isVisible()
    return t ? '首页已切倒计时视图' : '未切换'
  })
  await step('focus-end-and-complete', async () => {
    await page.getByRole('button', { name: '结束' }).first().click()
    await sleep(300)
    await page.getByRole('button', { name: '结束', exact: true }).last().click()
    await sleep(400)
    const q = await page.getByText('今日习惯达成了吗？').isVisible().catch(() => false)
    if (q) {
      await page.getByRole('button', { name: /已达成/ }).click()
      await sleep(400)
      return '出现习惯完成弹窗并已选「已达成」'
    }
    return '未出现习惯弹窗'
  })
  await step('habit-checked-via-localStorage', async () => {
    const todos = await page.evaluate(() => JSON.parse(localStorage.getItem('dt_todos') || '[]'))
    const t = todos.find((x) => x.title === '每周读书')
    const today = new Date().toISOString().slice(0, 10)
    const ok = t && (t.checkIns || []).includes(today) && t.done === true
    return ok ? 'localStorage 确认习惯已打卡且 done=true' : `未同步 checkIns=${t && JSON.stringify(t.checkIns)} done=${t && t.done}`
  })

  // 6. 未绑定专注：手动结束也必须计入（细化修改4 修复点）
  await step('focus-nobind-record', async () => {
    await page.getByRole('link', { name: '首页' }).click()
    await sleep(400)
    await page.getByRole('button', { name: '专注' }).click()
    await sleep(300)
    await page.getByRole('button', { name: '15' }).click()
    await sleep(150)
    await page.getByRole('button', { name: '开始专注' }).click()
    await sleep(500)
    await page.getByRole('button', { name: '结束' }).first().click()
    await sleep(300)
    await page.getByRole('button', { name: '结束', exact: true }).last().click()
    await sleep(400)
    return '未绑定专注已结束'
  })
  await step('pomodoro-recorded-localStorage', async () => {
    const p = await page.evaluate(() => JSON.parse(localStorage.getItem('dt_pomodoros') || '[]'))
    const focusN = p.filter((x) => x.type === 'focus').length
    return focusN >= 2 ? `localStorage 确认番茄钟记录数=${focusN}` : `记录数不足=${focusN}`
  })

  // 7. 番茄钟页（验证今日专注）
  await step('nav-focus-page', async () => {
    await page.getByRole('link', { name: '番茄钟' }).click()
    await sleep(400)
    await page.screenshot({ path: `${OUT}/03-focus.png` })
    const t = await page.getByText('今日专注').isVisible()
    return t ? '番茄钟页可见「今日专注」' : '未找到'
  })

  // 8. 记录页：心情/饮水/饮食/排便 + 日历
  await step('nav-journal', async () => {
    await page.getByRole('link', { name: '记录' }).click()
    await sleep(400)
    return '进入记录页'
  })
  await step('journal-mood', async () => {
    await page.getByRole('button', { name: '心情' }).click()
    await sleep(250)
    await page.locator('.text-2xl').first().click()
    await page.getByRole('button', { name: '确认' }).click()
    await sleep(250)
    return '心情已确认'
  })
  await step('journal-water', async () => {
    await page.getByRole('button', { name: '饮水' }).click()
    await sleep(250)
    await page.getByRole('button', { name: '+1 杯' }).click()
    await sleep(150)
    await page.getByRole('button', { name: '确认' }).click()
    await sleep(250)
    return '饮水已确认'
  })
  await step('journal-diet', async () => {
    await page.getByRole('button', { name: '饮食' }).click()
    await sleep(250)
    await page.getByPlaceholder('吃了什么？').fill('沙拉')
    await page.getByRole('button', { name: '记录饮食' }).click()
    await sleep(250)
    return '饮食已记录'
  })
  await step('journal-bowel', async () => {
    await page.getByRole('button', { name: '排便' }).click()
    await sleep(250)
    await page.getByText('今日已排便').click()
    await sleep(150)
    await page.getByRole('button', { name: '保存排便' }).click()
    await sleep(300)
    return '排便已记录'
  })
  await step('journal-calendar-pick', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const day = Number(today.slice(8))
    await page.getByRole('button', { name: String(day) }).last().click()
    await sleep(300)
    const detail = await page.getByText('沙拉').isVisible().catch(() => false)
    await page.getByRole('button', { name: '×' }).last().click().catch(() => {})
    await sleep(200)
    return detail ? '点击今日日历弹出当日饮食详情' : '日历详情未显示'
  })
  await page.screenshot({ path: `${OUT}/04-journal.png` })

  // 9. 灵感
  await step('nav-notes', async () => {
    await page.getByRole('link', { name: '灵感' }).click()
    await sleep(400)
    return '进入灵感页'
  })
  await step('notes-save', async () => {
    await page.getByPlaceholder('标题（可选）').fill('产品灵感')
    await page.getByPlaceholder('突然想到的灵感、随记、日记…').fill('做一个每日记录的小工具')
    await page.getByRole('button', { name: '保存' }).click()
    await sleep(300)
    const saved = await page.getByText('已保存').isVisible().catch(() => false)
    return saved ? '灵感已保存' : '保存状态未显示'
  })
  await step('notes-recall', async () => {
    await page.getByRole('button', { name: /回忆/ }).click()
    await sleep(300)
    const t = await page.getByText('产品灵感').isVisible().catch(() => false)
    await page.screenshot({ path: `${OUT}/05-notes.png` })
    await page.getByRole('button', { name: '×' }).last().click().catch(() => {})
    await sleep(200)
    return t ? '回忆列表可见历史灵感' : '回忆未显示'
  })

  // 10. 统计 / 设置 / 日历
  await step('nav-stats', async () => {
    await page.getByRole('link', { name: '统计' }).click()
    await sleep(400)
    await page.screenshot({ path: `${OUT}/06-stats.png` })
    const t = await page.getByText('累计已减').isVisible()
    return t ? '统计页可见' : '未找到'
  })
  await step('nav-settings', async () => {
    await page.getByRole('link', { name: '设置' }).click()
    await sleep(400)
    await page.screenshot({ path: `${OUT}/07-settings.png` })
    return '设置页截图'
  })
  await step('nav-calendar', async () => {
    await page.getByRole('link', { name: '日历' }).click()
    await sleep(400)
    await page.screenshot({ path: `${OUT}/08-calendar.png` })
    const t = await page.getByText('体重').isVisible()
    return t ? '日历页可见' : '未找到'
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
