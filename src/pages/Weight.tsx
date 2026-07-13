import { useEffect, useState, FormEvent } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid,
} from 'recharts'
import { addWeight, deleteWeight, getWeights } from '../db'
import { todayStr, aggregateWeightByDate, addDays } from '../utils'
import { WeightRecord } from '../types'
import { useStore } from '../store'

type Range = '7' | '30' | '90' | 'all'

export default function Weight() {
  const [records, setRecords] = useState<WeightRecord[]>([])
  const [value, setValue] = useState('')
  const [date, setDate] = useState(todayStr())
  const [note, setNote] = useState('')
  const [range, setRange] = useState<Range>('30')
  const { settings } = useStore()

  useEffect(() => {
    void refresh()
  }, [])

  async function refresh() {
    setRecords(await getWeights())
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const v = parseFloat(value)
    if (!v || v <= 0) return
    await addWeight({ date, value: v, note: note || undefined })
    setValue('')
    setNote('')
    await refresh()
  }

  const series = aggregateWeightByDate(records)
  const view =
    range === 'all'
      ? series
      : series.filter((r) => r.date >= addDays(todayStr(), -(Number(range) - 1)))
  const chartData = view.map((r) => ({ date: r.date.slice(5), value: r.value }))

  const latest = series.length ? series[series.length - 1].value : null
  const first = series.length ? series[0].value : null
  const lost = first != null && latest != null ? +(first - latest).toFixed(1) : null

  // BMI 计算
  const heightCm = settings.height ?? 170
  const heightM = heightCm / 100
  const bmiData = chartData.map((d) => ({ ...d, bmi: +(d.value / (heightM * heightM)).toFixed(1) }))
  const latestBmi = latest != null ? +(latest / (heightM * heightM)).toFixed(1) : null
  const bmiLabel_ = (bmi: number) => {
    if (bmi < 18.5) return '偏瘦'
    if (bmi < 25) return '理想'
    if (bmi < 30) return '偏胖'
    return '肥胖'
  }

  const sorted = [...records].reverse()

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold mb-4 text-brand-900">体重</h1>

      {/* 概览 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="glass-card text-center p-3">
          <div className="text-xl font-bold text-sky-600">{latest ?? '—'}</div>
          <div className="text-xs text-brand-900/40">当前 (kg)</div>
        </div>
        <div className="glass-card text-center p-3">
          <div className="text-xl font-bold text-brand-900/80">{settings.targetWeight ?? '—'}</div>
          <div className="text-xs text-brand-900/40">目标 (kg)</div>
        </div>
        <div className="glass-card text-center p-3">
          <div className={`text-xl font-bold ${lost != null && lost > 0 ? 'text-emerald-500' : lost != null && lost < 0 ? 'text-rose-500' : 'text-brand-900/80'}`}>
            {lost != null ? (lost > 0 ? `-${lost}` : lost < 0 ? `+${Math.abs(lost)}` : '0') : '—'}
          </div>
          <div className="text-xs text-brand-900/40">{lost != null && lost < 0 ? '累计增重 (kg)' : '累计已减 (kg)'}</div>
        </div>
        <div className="glass-card text-center p-3">
          <div className={`text-xl font-bold ${
            latestBmi != null ? (latestBmi < 18.5 ? 'text-sky-500' : latestBmi < 25 ? 'text-emerald-500' : latestBmi < 30 ? 'text-amber-500' : 'text-rose-500') : 'text-brand-900/80'
          }`}>
            {latestBmi ?? '—'}
          </div>
          <div className="text-xs text-brand-900/40">
            BMI {latestBmi != null ? `· ${bmiLabel_(latestBmi)}` : '(需设定身高)'}
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="glass-card p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-brand-900/60">体重 (kg)</label>
            <input type="number" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} placeholder="如 62.5" className="glass-input" required />
          </div>
          <div className="w-40">
            <label className="text-xs text-brand-900/60">日期</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="glass-input" />
          </div>
        </div>
        <div>
          <label className="text-xs text-brand-900/60">备注（可选）</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="如 晨起空腹" className="glass-input" />
        </div>
        <button className="w-full glass-btn-primary">保存记录</button>
      </form>

      {records.length > 1 && (
        <div className="glass-card p-4 mt-4">
          {/* BMI 趋势图 */}
          {settings.height ? (
            <div className="mb-5">
              <div className="text-sm font-medium mb-2">BMI 指数 · 科学范围参考</div>
              <div className="flex items-center gap-3 mb-2 text-[11px] text-brand-900/60 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-200 inline-block" />偏瘦 (&lt;18.5)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200 inline-block" />理想 (18.5-25)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 inline-block" />偏胖 (25-30)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-200 inline-block" />肥胖 (≥30)</span>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bmiData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[15, 35]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [v, 'BMI']} />
                    <ReferenceArea y1={15} y2={18.5} fill="#93c5fd" fillOpacity={0.15} />
                    <ReferenceArea y1={18.5} y2={25} fill="#86efac" fillOpacity={0.15} />
                    <ReferenceArea y1={25} y2={30} fill="#fdba74" fillOpacity={0.15} />
                    <ReferenceArea y1={30} y2={35} fill="#fca5a5" fillOpacity={0.15} />
                    <ReferenceLine y={18.5} stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={1} />
                    <ReferenceLine y={25} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1} />
                    <ReferenceLine y={30} stroke="#f97316" strokeDasharray="3 3" strokeWidth={1} />
                    <Line type="monotone" dataKey="bmi" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="mb-5 text-center text-sm text-brand-900/40">
              🏋️ 去「设置」填写身高，即可查看 BMI 指数与科学范围参考
            </div>
          )}
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">体重趋势</div>
              <div className="flex glass rounded-full p-0.5 text-xs">
                {([['7', '7天'], ['30', '30天'], ['90', '90天'], ['all', '总计']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setRange(v)} className={`px-2.5 py-1 rounded-full ${range === v ? 'bg-white text-brand-700 shadow-sm' : 'text-brand-900/60'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#33a888" strokeWidth={2} dot={{ r: 3 }} />
                  {settings.targetWeight ? (
                    <ReferenceLine y={settings.targetWeight} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '目标', position: 'insideTopRight', fontSize: 11, fill: '#ef4444' }} />
                  ) : null}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {sorted.map((r) => (
          <div key={r.id} className="glass-card p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{r.value} kg</div>
              <div className="text-xs text-brand-900/40">
                {r.date}
                {r.note ? ` · ${r.note}` : ''}
              </div>
            </div>
            <button
              onClick={async () => {
                if (r.id != null) await deleteWeight(r.id)
                await refresh()
              }}
              className="text-brand-900/40 hover:text-red-500 text-sm px-2"
            >
              删除
            </button>
          </div>
        ))}
        {sorted.length === 0 && <div className="text-center text-brand-900/40 text-sm py-8">还没有记录，先记一条吧</div>}
      </div>
    </div>
  )
}
