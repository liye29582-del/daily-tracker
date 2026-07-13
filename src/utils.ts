// 日期与通用工具

export const CUP_ML = 250 // 1 杯 = 250ml

export function todayStr(): string {
  return toDateStr(new Date())
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

// 返回某日期所在周的周日（与日历周日起始一致）
export function startOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - d.getDay())
  return toDateStr(d)
}

// 返回某日期所在月的首日（YYYY-MM-01）
export function startOfMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// 待办周期归属的参考日期：天=当天，周=当周首日，月=当月首日
export function periodRef(period: 'day' | 'week' | 'month', dateStr: string): string {
  if (period === 'week') return startOfWeek(dateStr)
  if (period === 'month') return startOfMonth(dateStr)
  return dateStr
}

// 最近 n 天日期数组（含今天，按时间升序）
export function lastNDays(n: number, end: string = todayStr()): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i))
  return out
}

// 某年某月的每一天（升序）
export function monthDays(year: number, month: number): string[] {
  const days = new Date(year, month + 1, 0).getDate()
  const out: string[] = []
  for (let d = 1; d <= days; d++) out.push(toDateStr(new Date(year, month, d)))
  return out
}

export function prettyDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日 ${week}`
}

export function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}小时${m}分`
  if (m > 0) return `${m}分`
  return `${seconds}秒`
}

// 生成本月日期网格（含前后补位，周日起始）
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1)
  const startDay = first.getDay() // 0=周日
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toDateStr(new Date(year, month, d)))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const esc = (v: unknown) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [headers.join(',')]
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(','))
  return lines.join('\n')
}

// 体重趋势聚合：同一天多条记录时取创建时间最新的一条，避免图表同 x 多point重叠
export function aggregateWeightByDate(
  records: { date: string; value: number; createdAt?: number }[],
): { date: string; value: number }[] {
  const sorted = [...records].sort(
    (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
  )
  const byDate = new Map<string, number>()
  for (const r of sorted) byDate.set(r.date, r.value) // 后者覆盖前者 = 当日最新
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, value]) => ({ date, value }))
}
