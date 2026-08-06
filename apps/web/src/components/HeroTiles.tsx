import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'

type Props = {
  trackRef: RefObject<HTMLElement | null>
}

const TILE = 56
const GAP = 3
const STEP = TILE + GAP
/** Extra coverage so 3D tilt never reveals the board edge */
const OVERFLOW = 1.55
const LERP = 0.1

/**
 * Square tile grid with gaps; B/W glow; 3D transforms follow the cursor.
 * Grid size tracks the hero so the pattern spans full width on wide screens.
 */
export function HeroTiles({ trackRef }: Props) {
  const boardRef = useRef<HTMLDivElement>(null)
  const mouse = useRef({ nx: 0, ny: 0, bx: -1, by: -1, active: false })
  const smooth = useRef({ nx: 0, ny: 0, bx: 0, by: 0, active: 0 })
  const raf = useRef(0)
  const [grid, setGrid] = useState({ cols: 36, rows: 20 })

  useEffect(() => {
    const trackEl = trackRef.current
    if (!trackEl) return

    function measure() {
      const el = trackRef.current
      if (!el) return
      const cols = Math.ceil((el.clientWidth * OVERFLOW) / STEP)
      const rows = Math.ceil((el.clientHeight * OVERFLOW) / STEP)
      setGrid((prev) =>
        prev.cols === cols && prev.rows === rows ? prev : { cols, rows },
      )
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(trackEl)
    return () => ro.disconnect()
  }, [trackRef])

  const tiles = useMemo(() => {
    const list: { id: number; col: number; row: number }[] = []
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        list.push({ id: row * grid.cols + col, col, row })
      }
    }
    return list
  }, [grid.cols, grid.rows])

  const width = grid.cols * TILE + (grid.cols - 1) * GAP
  const height = grid.rows * TILE + (grid.rows - 1) * GAP

  useEffect(() => {
    const trackEl = trackRef.current
    const boardEl = boardRef.current
    if (!trackEl || !boardEl) return

    const surface: HTMLElement = trackEl
    const board: HTMLDivElement = boardEl
    const tileNodes = Array.from(
      board.querySelectorAll<HTMLElement>('[data-tile]'),
    )

    function onMove(e: PointerEvent) {
      const rect = surface.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      mouse.current = {
        bx: x - rect.width / 2 + width / 2,
        by: y - rect.height / 2 + height / 2,
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
      const s = smooth.current
      const targetActive = m.active ? 1 : 0

      s.active += (targetActive - s.active) * LERP
      if (m.active) {
        s.nx += (m.nx - s.nx) * LERP
        s.ny += (m.ny - s.ny) * LERP
        s.bx += (m.bx - s.bx) * LERP
        s.by += (m.by - s.by) * LERP
      } else {
        s.nx += (0 - s.nx) * LERP
        s.ny += (0 - s.ny) * LERP
      }

      const rotY = s.nx * 9
      const rotX = 12 - s.ny * 7
      board.style.transform = `translate(-50%, -50%) rotateX(${rotX}deg) rotateY(${rotY}deg)`

      for (const el of tileNodes) {
        const col = Number(el.dataset.col)
        const row = Number(el.dataset.row)
        const cx = col * STEP + TILE / 2
        const cy = row * STEP + TILE / 2
        const dx = cx - s.bx
        const dy = cy - s.by
        const dist = Math.sqrt(dx * dx + dy * dy)
        const influence = Math.max(0, 1 - dist / 200) * s.active
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
  }, [trackRef, width, height, tiles])

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
          gridTemplateColumns: `repeat(${grid.cols}, ${TILE}px)`,
          gridTemplateRows: `repeat(${grid.rows}, ${TILE}px)`,
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
