import { useEffect, useRef } from 'react'

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let animId = 0

    const stars: { x: number; y: number; baseBright: number; speed: number; size: number }[] = []
    const sparkles: { x: number; y: number; phase: number; size: number }[] = []
    const clouds: { x: number; y: number; w: number; h: number; speed: number; alpha: number }[] = []

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      const w = canvas.width, h = canvas.height

      stars.length = 0
      for (let i = 0; i < 60; i++) stars.push({ x: Math.random() * w, y: Math.random() * h * 0.45, baseBright: 0.2 + Math.random() * 0.6, speed: 0.5 + Math.random() * 1.5, size: 0.8 + Math.random() * 1.5 })

      sparkles.length = 0
      for (let i = 0; i < 35; i++) sparkles.push({ x: Math.random() * w, y: h * 0.62 + Math.random() * h * 0.3, phase: Math.random() * Math.PI * 2, size: 2 + Math.random() * 3 })

      clouds.length = 0
      for (let i = 0; i < 4; i++) clouds.push({ x: Math.random() * w, y: h * (0.1 + Math.random() * 0.25), w: 150 + Math.random() * 250, h: 30 + Math.random() * 40, speed: 0.1 + Math.random() * 0.2, alpha: 0.08 + Math.random() * 0.12 })
    }
    resize()
    window.addEventListener('resize', resize)

    function draw(time: number) {
      const w = canvas.width, h = canvas.height, seaLine = h * 0.62, t = time * 0.001

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, seaLine)
      sky.addColorStop(0, '#0f0c29'); sky.addColorStop(0.15, '#302b63'); sky.addColorStop(0.35, '#6b3a7d')
      sky.addColorStop(0.5, '#b85a7a'); sky.addColorStop(0.65, '#d4847a'); sky.addColorStop(0.8, '#eba878')
      sky.addColorStop(0.95, '#f5c892')
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, seaLine)

      // sun glow
      const glowX = w * 0.65, glowY = seaLine - 20
      const sunGlow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, w * 0.4)
      sunGlow.addColorStop(0, 'rgba(255,200,150,0.25)'); sunGlow.addColorStop(0.3, 'rgba(255,180,120,0.12)')
      sunGlow.addColorStop(0.7, 'rgba(255,160,100,0.04)'); sunGlow.addColorStop(1, 'rgba(255,160,100,0)')
      ctx.fillStyle = sunGlow; ctx.fillRect(0, 0, w, seaLine)

      // clouds
      for (const c of clouds) {
        c.x += c.speed; if (c.x > w + c.w) c.x = -c.w
        ctx.beginPath()
        ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2)
        ctx.ellipse(c.x + c.w * 0.3, c.y - c.h * 0.2, c.w * 0.35, c.h * 0.4, 0, 0, Math.PI * 2)
        ctx.ellipse(c.x - c.w * 0.2, c.y + c.h * 0.1, c.w * 0.3, c.h * 0.35, 0, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,220,200,${c.alpha + Math.sin(t * 0.5 + c.x) * 0.02})`; ctx.fill()
      }

      // ocean
      const ocean = ctx.createLinearGradient(0, seaLine, 0, h)
      ocean.addColorStop(0, '#5a78a0'); ocean.addColorStop(0.2, '#4d6f96'); ocean.addColorStop(0.5, '#3d5f86')
      ocean.addColorStop(0.8, '#2d4f76'); ocean.addColorStop(1, '#1f3d60')
      ctx.fillStyle = ocean; ctx.fillRect(0, seaLine, w, h - seaLine)

      // waves
      for (let layer = 0; layer < 5; layer++) {
        ctx.beginPath(); ctx.moveTo(0, seaLine + 5 + layer * 35)
        for (let x = 0; x <= w; x += 3) {
          const y = seaLine + 5 + layer * 35 + Math.sin(x * (0.008 + layer * 0.003) + t * (1.2 + layer * 0.4) + layer * 1.8) * (6 - layer * 0.8) + Math.sin(x * (0.016 + layer * 0.006) + t * (0.84 + layer * 0.28)) * (6 - layer * 0.8) * 0.4
          ctx.lineTo(x, y)
        }
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath()
        ctx.fillStyle = `rgba(${180 - layer * 12}, ${200 - layer * 10}, ${225 - layer * 9}, ${0.16 - layer * 0.018})`; ctx.fill()
      }

      // sun reflections
      for (let i = 0; i < 20; i++) {
        const rx = glowX + Math.sin(t * 0.3 + i * 2.1) * 60, ry = seaLine + 10 + i * 12 + Math.sin(t * 0.5 + i * 1.3) * 4
        ctx.beginPath(); ctx.arc(rx, ry, 3 + Math.sin(t * 0.8 + i * 2.7) * 1.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,210,160,${0.15 + Math.sin(t * 0.6 + i * 1.5) * 0.08})`; ctx.fill()
      }

      // sparkles
      for (const s of sparkles) {
        const fl = 0.3 + Math.sin(t * s.phase + s.x * 0.01 + s.y * 0.01) * 0.25
        ctx.beginPath(); ctx.arc(s.x, s.y + Math.sin(t * 0.4 + s.phase) * 5, s.size * (0.5 + fl * 0.5), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,240,220,${fl * 0.4})`; ctx.fill()
      }

      // figure silhouette
      const figX = w * 0.32, figY = seaLine - 2, sway = Math.sin(t * 0.8) * 2, hairSway = Math.sin(t * 1.2) * 4
      ctx.fillStyle = '#1a1a2e'
      ctx.beginPath(); ctx.ellipse(figX, figY - 50, 14, 28 + sway * 0.3, 0, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(figX + sway, figY - 22, 18 + sway * 0.5, 8, 0, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(figX, figY - 78, 9, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(figX + 6 + hairSway * 0.6, figY - 80, 7, 10, 0.2 + hairSway * 0.01, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.moveTo(figX + 8, figY - 82)
      for (let i = 0; i < 5; i++) ctx.quadraticCurveTo(figX + 10 + hairSway + i * 3 + 8 + hairSway * 0.5 + Math.sin(t + i) * 2, figY - 78 + i * 6 - 3, figX + 10 + hairSway + i * 3 + 12 + hairSway * 0.7 + Math.sin(t * 0.7 + i * 2) * 3, figY - 78 + i * 6 + 4)
      ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 2.5; ctx.stroke()

      // stars
      for (const s of stars) {
        const bright = s.baseBright + Math.sin(t * s.speed + s.x * 0.1) * 0.3
        if (bright <= 0) continue
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size * (0.5 + bright * 0.5), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, bright)})`; ctx.fill()
        if (bright > 0.5) { ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 2, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${bright * 0.1})`; ctx.fill() }
      }

      animId = requestAnimationFrame(draw)
    }
    animId = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 w-full h-full" style={{ zIndex: 0, objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
}
