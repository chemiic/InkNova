import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'

type Props = {
  trackRef: RefObject<HTMLElement | null>
}

const TILE = 56
const GAP = 3
const STEP = TILE + GAP
const COLS = 28
const ROWS = 16

/**
 * Square tile grid with gaps; B/W glow; 3D transforms follow the cursor.
 */
export function HeroTiles({ trackRef }: Props) {
  const boardRef = useRef<HTMLDivElement>(null)
  const mouse = useRef({ nx: 0, ny: 0, bx: -1, by: -1, active: false })
  const raf = useRef(0)
  const [ready, setReady] = useState(false)

  const tiles = useMemo(() => {
    const list: { id: number; col: number; row: number }[] = []
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        list.push({ id: row * COLS + col, col, row })
      }
    }
    return list
  }, [])

  useEffect(() => {
    setReady(true)
  }, [])

  useEffect(() => {
    const trackEl = trackRef.current
    const boardEl = boardRef.current
    if (!trackEl || !boardEl || !ready) return

    const surface: HTMLElement = trackEl
    const board: HTMLDivElement = boardEl
    const tileNodes = Array.from(
      board.querySelectorAll<HTMLElement>('[data-tile]'),
    )

    const boardW = COLS * TILE + (COLS - 1) * GAP
    const boardH = ROWS * TILE + (ROWS - 1) * GAP

    function onMove(e: PointerEvent) {
      const rect = surface.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const bx = x - rect.width / 2 + boardW / 2
      const by = y - rect.height / 2 + boardH / 2
      mouse.current = {
        bx,
        by,
        nx: (x / rect.width) * 2 - 1,
        ny: (y / rect.height) * 2 - 1,
        active: true,
      }
    }

    function onLeave() {
      mouse.current.active = false
    }

    function tick() {
      const m = mouse.current
      const targetRotY = m.active ? m.nx * 9 : 0
      const targetRotX = m.active ? 12 - m.ny * 7 : 12

      board.style.transform = `translate(-50%, -50%) rotateX(${targetRotX}deg) rotateY(${targetRotY}deg)`

      for (const el of tileNodes) {
        const col = Number(el.dataset.col)
        const row = Number(el.dataset.row)
        const cx = col * STEP + TILE / 2
        const cy = row * STEP + TILE / 2
        const dx = cx - m.bx
        const dy = cy - m.by
        const dist = Math.sqrt(dx * dx + dy * dy)
        const influence = m.active ? Math.max(0, 1 - dist / 200) : 0
        const eased = influence * influence
        const z = eased * 42
        const scale = 1 + eased * 0.1
        const bright = 0.035 + eased * 0.4

        el.style.transform = `translateZ(${z}px) scale(${scale})`
        el.style.background = `rgba(255,255,255,${bright})`
        el.style.boxShadow =
          eased > 0.02
            ? `0 0 ${10 + eased * 32}px rgba(255,255,255,${0.1 + eased * 0.4})`
            : 'none'
      }

      raf.current = requestAnimationFrame(tick)
    }

    surface.addEventListener('pointermove', onMove)
    surface.addEventListener('pointerleave', onLeave)
    raf.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf.current)
      surface.removeEventListener('pointermove', onMove)
      surface.removeEventListener('pointerleave', onLeave)
    }
  }, [trackRef, ready])

  const width = COLS * TILE + (COLS - 1) * GAP
  const height = ROWS * TILE + (ROWS - 1) * GAP

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
      style={{
        background:
          'radial-gradient(ellipse 80% 70% at 50% 45%, #1c1c1c 0%, #0a0a0a 55%, #050505 100%)',
        perspective: '950px',
        perspectiveOrigin: '50% 42%',
      }}
    >
      <div
        ref={boardRef}
        className="absolute left-1/2 top-1/2 origin-center will-change-transform"
        style={{
          width,
          height,
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, ${TILE}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${TILE}px)`,
          gap: GAP,
          transform: 'translate(-50%, -50%) rotateX(12deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        {tiles.map((t) => (
          <div
            key={t.id}
            data-tile
            data-col={t.col}
            data-row={t.row}
            className="rounded-[2px] will-change-transform"
            style={{
              background: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(255,255,255,0.07)',
              transform: 'translateZ(0)',
            }}
          />
        ))}
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 50% at 50% 45%, transparent 0%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </div>
  )
}
