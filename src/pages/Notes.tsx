import { useEffect, useRef, useState } from 'react'
import { addNote, getNotes, deleteNote } from '../db'
import { todayStr } from '../utils'
import { Note } from '../types'

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [showRecall, setShowRecall] = useState(false)
  const [detail, setDetail] = useState<Note | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setNotes(await getNotes())
  }

  function nowTime() {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    for (const f of files) {
      try {
        const b64 = await compressImage(f)
        setImages((prev) => [...prev, b64])
      } catch {
        /* 忽略无法读取的图片 */
      }
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  async function save() {
    if (!title.trim() && !content.trim() && images.length === 0) return
    await addNote({
      date: todayStr(),
      time: nowTime(),
      title: title.trim(),
      content: content.trim(),
      images: images.length ? images : undefined,
    })
    setTitle('')
    setContent('')
    setImages([])
    setSaved(true)
    await load()
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">灵感随心记</h1>
        <button
          onClick={() => setShowRecall(true)}
          className="text-sm bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full font-medium"
        >
          💡 回忆
        </button>
      </div>

      <div className="glass-card p-4 space-y-3">
        <div className="text-xs text-brand-900/40">{todayStr()} · {nowTime()}</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题（可选）"
          className="w-full border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-brand-400 font-medium"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="突然想到的灵感、随记、日记…"
          rows={5}
          className="w-full border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-brand-400 resize-none"
        />

        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="" className="w-20 h-20 object-cover rounded-lg border border-white/10" />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-gray-700 text-white w-5 h-5 rounded-full text-xs leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="text-sm bg-gray-100 text-brand-900/70 px-3 py-2 rounded-lg"
          >
            🖼️ 插入图片
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} />
          <button
            onClick={save}
            className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-medium"
          >
            保存
          </button>
        </div>
        {saved && <div className="text-xs text-emerald-500">已保存 ✓</div>}
      </div>

      {/* 回忆：查看历史 */}
      {showRecall && (
        <div className="fixed inset-0 z-50 bg-black/25 flex items-center justify-center p-4" onClick={() => { setShowRecall(false); setDetail(null) }}>
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-lg">回忆</div>
              <button onClick={() => { setShowRecall(false); setDetail(null) }} className="text-brand-900/40 text-2xl leading-none">×</button>
            </div>
            {notes.length === 0 ? (
              <div className="text-sm text-brand-900/40 text-center py-6">还没有记录</div>
            ) : (
              <div className="space-y-2">
                {notes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setDetail(n)}
                    className="w-full text-left glass-strong rounded-xl p-3 hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center justify-between text-xs text-brand-900/40">
                      <span>{n.date}</span>
                      <span>{n.time}</span>
                    </div>
                    <div className="font-medium text-sm mt-0.5 truncate">{n.title || '（无标题）'}</div>
                    <div className="text-sm text-brand-900/60 line-clamp-2">{n.content || ''}</div>
                    {n.images && n.images.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {n.images.slice(0, 4).map((s, i) => (
                          <img key={i} src={s} alt="" className="w-8 h-8 object-cover rounded" />
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 详情 */}
      {detail && (
        <div className="fixed inset-0 z-[60] bg-black/25 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-brand-900/40">{detail.date} · {detail.time}</div>
              <button onClick={() => setDetail(null)} className="text-brand-900/40 text-2xl leading-none">×</button>
            </div>
            <div className="font-bold text-lg mb-2">{detail.title || '（无标题）'}</div>
            <div className="text-sm text-brand-900/80 whitespace-pre-wrap leading-relaxed">{detail.content}</div>
            {detail.images && detail.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {detail.images.map((s, i) => (
                  <img key={i} src={s} alt="" className="w-24 h-24 object-cover rounded-lg border border-white/10" />
                ))}
              </div>
            )}
            <button
              onClick={async () => {
                if (detail.id != null) await deleteNote(detail.id)
                setDetail(null)
                await load()
              }}
              className="mt-4 text-sm text-red-500"
            >
              删除这条记录
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// 图片压缩为 base64（最大边 800px，JPEG 0.7），避免 localStorage 体积爆炸
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 800
        let { width, height } = img
        if (width > max || height > max) {
          const ratio = Math.min(max / width, max / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('no ctx'))
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
