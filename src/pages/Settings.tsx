import { useStore } from '../store'
import { exportAll } from '../db'
import { downloadFile, toCSV, CUP_ML } from '../utils'

export default function Settings() {
  const { settings, saveSettings } = useStore()

  async function doExportJSON() {
    const data = await exportAll()
    downloadFile(
      `daily-tracker-${Date.now()}.json`,
      JSON.stringify(data, null, 2),
      'application/json',
    )
  }

  async function doExportCSV() {
    const data = await exportAll()
    const weightRows = data.weights.map((w) => ({
      date: w.date,
      value: w.value,
      note: w.note ?? '',
    }))
    downloadFile(`weight-${Date.now()}.csv`, toCSV(weightRows), 'text/csv')
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold mb-4 text-white/90">设置</h1>

      <div className="glass p-4 space-y-4">
        <div>
          <label className="text-sm text-white/60">昵称（可选）</label>
          <input
            value={settings.nickname ?? ''}
            onChange={(e) => saveSettings({ nickname: e.target.value.trim() || undefined })}
            placeholder="怎么称呼你？"
            className="glass-input"
          />
        </div>
        <div>
          <label className="text-sm text-white/60">性别</label>
          <div className="flex gap-2 mt-1">
            {([['male', '男'], ['female', '女'], ['other', '其他']] as const).map(([v, l]) => (
              <button
                key={v}
                onClick={() => saveSettings({ gender: v })}
                className={`flex-1 py-2 rounded-lg text-sm border ${
                  settings.gender === v ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-white/70 border-white/20'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm text-white/60">身高（厘米，选填）</label>
          <input
            type="number"
            min={100}
            max={250}
            value={settings.height ?? ''}
            onChange={(e) => saveSettings({ height: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="如 170"
            className="glass-input"
          />
          <div className="text-[11px] text-white/40 mt-1">用于计算 BMI 指数</div>
        </div>
        <div>
          <label className="text-sm text-white/60">专注时长（分钟）</label>
          <input
            type="number"
            min={1}
            value={settings.pomodoroLen}
            onChange={(e) => saveSettings({ pomodoroLen: Number(e.target.value) || 25 })}
            className="glass-input"
          />
        </div>
        <div>
          <label className="text-sm text-white/60">休息时长（分钟）</label>
          <input
            type="number"
            min={1}
            value={settings.breakLen}
            onChange={(e) => saveSettings({ breakLen: Number(e.target.value) || 5 })}
            className="glass-input"
          />
        </div>
        <div>
          <label className="text-sm text-white/60">目标体重（kg，可选）</label>
          <input
            type="number"
            step="0.1"
            value={settings.targetWeight ?? ''}
            onChange={(e) =>
              saveSettings({
                targetWeight: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            placeholder="如 60"
            className="glass-input"
          />
        </div>
        <div>
          <label className="text-sm text-white/60">每日喝水目标（杯，1 杯≈250ml）</label>
          <input
            type="number"
            min={1}
            value={settings.waterTarget ? Math.round(settings.waterTarget / CUP_ML) : ''}
            onChange={(e) =>
              saveSettings({
                waterTarget: e.target.value ? Number(e.target.value) * CUP_ML : undefined,
              })
            }
            placeholder="如 8"
            className="glass-input"
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="pr-3">
            <div className="text-sm font-medium">浏览器通知</div>
            <div className="text-xs text-white/40">
              开启后，有待办未完成时弹系统通知（需授权；离开网页不保证送达）
            </div>
          </div>
          <button
            onClick={() => {
              const next = !settings.browserNotify
              if (next && typeof Notification !== 'undefined' && Notification.permission === 'default') {
                Notification.requestPermission()
              }
              saveSettings({ browserNotify: next })
            }}
            className={`shrink-0 w-12 h-7 rounded-full transition relative ${
              settings.browserNotify ? 'bg-brand-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                settings.browserNotify ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="glass p-4 mt-4 space-y-3">
        <div className="text-sm font-medium">数据备份</div>
        <p className="text-xs text-white/40">所有数据仅存于本机浏览器。导出后可换设备或留存。</p>
        <div className="flex gap-3">
          <button onClick={doExportJSON} className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg text-sm font-medium">
            导出全部 (JSON)
          </button>
          <button onClick={doExportCSV} className="flex-1 bg-gray-100 text-white/80 py-2.5 rounded-lg text-sm font-medium">
            导出体重 (CSV)
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-white/40">
        日常记录 · 本地优先 · v0.6
      </div>
    </div>
  )
}
