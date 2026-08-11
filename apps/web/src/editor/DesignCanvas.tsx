import { BLEED_MM, mmToPx } from '@inknova/shared'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
  Transformer,
} from 'react-konva'
import type Konva from 'konva'
import { snapResize, snapTranslate, type SnapGuide } from './snap'
import type { DesignElement, DesignPageSide, ImageElement, TextElement } from './types'

type Props = {
  width: number
  height: number
  /** e.g. "9×5 cm" from catalog size label */
  sizeLabel: string
  widthMm: number
  heightMm: number
  page: DesignPageSide
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChangeElement: (id: string, patch: Partial<DesignElement>) => void
  stageRef: React.RefObject<Konva.Stage | null>
}

function useHtmlImage(src: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!src) {
      setImage(null)
      return
    }
    let cancelled = false
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (!cancelled) setImage(img)
    }
    img.onerror = () => {
      if (!cancelled) setImage(null)
    }
    img.src = src
    return () => {
      cancelled = true
    }
  }, [src])
  return image
}

type SnapCtx = {
  pageWidth: number
  pageHeight: number
  elements: DesignElement[]
  setGuides: (g: SnapGuide[]) => void
}

function TextNode({
  el,
  selected,
  onSelect,
  onChange,
  snap,
}: {
  el: TextElement
  selected: boolean
  onSelect: () => void
  onChange: (patch: Partial<TextElement>) => void
  snap: SnapCtx
}) {
  const shapeRef = useRef<Konva.Text>(null)
  const trRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    if (selected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [selected])

  return (
    <>
      <Text
        ref={shapeRef}
        id={el.id}
        x={el.x}
        y={el.y}
        width={el.width}
        text={el.text}
        fontSize={el.fontSize}
        fontFamily={el.fontFamily}
        fill={el.fill}
        align={el.align}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragMove={(e) => {
          const node = e.target
          const h = node.height()
          const snapped = snapTranslate(
            { x: node.x(), y: node.y(), width: el.width, height: h },
            snap.pageWidth,
            snap.pageHeight,
            snap.elements,
            el.id,
          )
          node.position({ x: snapped.x, y: snapped.y })
          snap.setGuides(snapped.guides)
        }}
        onDragEnd={(e) => {
          snap.setGuides([])
          onChange({ x: e.target.x(), y: e.target.y() })
        }}
        onTransform={() => {
          const node = shapeRef.current
          if (!node) return
          const scaleX = node.scaleX()
          const scaleY = node.scaleY()
          const raw = {
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width() * scaleX),
            height: Math.max(10, node.height() * scaleY),
          }
          const { box, guides } = snapResize(
            raw,
            snap.pageWidth,
            snap.pageHeight,
            snap.elements,
            el.id,
          )
          node.scaleX(1)
          node.scaleY(1)
          node.position({ x: box.x, y: box.y })
          node.width(box.width)
          snap.setGuides(guides)
        }}
        onTransformEnd={() => {
          const node = shapeRef.current
          if (!node) return
          snap.setGuides([])
          // scale already baked in onTransform
          node.scaleX(1)
          node.scaleY(1)
          const nextFont =
            el.width > 0
              ? Math.max(8, Math.round(el.fontSize * (node.width() / el.width)))
              : el.fontSize
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width()),
            fontSize: nextFont,
          })
        }}
      />
      {selected && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          enabledAnchors={['middle-left', 'middle-right', 'bottom-right']}
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width < 20 || newBox.height < 10 ? oldBox : newBox
          }
        />
      )}
    </>
  )
}

function ImageNode({
  el,
  selected,
  onSelect,
  onChange,
  snap,
}: {
  el: ImageElement
  selected: boolean
  onSelect: () => void
  onChange: (patch: Partial<ImageElement>) => void
  snap: SnapCtx
}) {
  const shapeRef = useRef<Konva.Image | Konva.Rect>(null)
  const trRef = useRef<Konva.Transformer>(null)
  const image = useHtmlImage(el.src)

  useEffect(() => {
    if (selected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [selected, image])

  const applyDragSnap = (node: Konva.Node) => {
    const snapped = snapTranslate(
      {
        x: node.x(),
        y: node.y(),
        width: el.width,
        height: el.height,
      },
      snap.pageWidth,
      snap.pageHeight,
      snap.elements,
      el.id,
    )
    node.position({ x: snapped.x, y: snapped.y })
    snap.setGuides(snapped.guides)
  }

  const applyTransformSnap = () => {
    const node = shapeRef.current
    if (!node) return
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    const raw = {
      x: node.x(),
      y: node.y(),
      width: Math.max(20, node.width() * scaleX),
      height: Math.max(20, node.height() * scaleY),
    }
    const { box, guides } = snapResize(
      raw,
      snap.pageWidth,
      snap.pageHeight,
      snap.elements,
      el.id,
    )
    node.scaleX(1)
    node.scaleY(1)
    node.position({ x: box.x, y: box.y })
    node.width(box.width)
    node.height(box.height)
    snap.setGuides(guides)
  }

  const common = {
    id: el.id,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    draggable: true as const,
    onClick: onSelect,
    onTap: onSelect,
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
      applyDragSnap(e.target)
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      snap.setGuides([])
      onChange({ x: e.target.x(), y: e.target.y() })
    },
    onTransform: () => {
      applyTransformSnap()
    },
    onTransformEnd: () => {
      const node = shapeRef.current
      if (!node) return
      snap.setGuides([])
      node.scaleX(1)
      node.scaleY(1)
      onChange({
        x: node.x(),
        y: node.y(),
        width: Math.max(20, Math.round(node.width())),
        height: Math.max(20, Math.round(node.height())),
      })
    },
  }

  const slotFontSize = Math.max(
    12,
    Math.min(56, Math.round(Math.min(el.width, el.height) * 0.14)),
  )

  return (
    <>
      {image ? (
        <KonvaImage ref={shapeRef as React.RefObject<Konva.Image>} image={image} {...common} />
      ) : (
        <>
          <Rect
            ref={shapeRef as React.RefObject<Konva.Rect>}
            {...common}
            fill="#e8e4de"
            stroke="#6b6560"
            strokeWidth={1}
            dash={[6, 4]}
          />
          <Text
            x={el.x}
            y={el.y + el.height / 2 - slotFontSize / 2}
            width={el.width}
            text={el.slotLabel ?? '+'}
            fontSize={slotFontSize}
            fill="#5a554f"
            align="center"
            listening={false}
          />
        </>
      )}
      {selected && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width < 20 || newBox.height < 20 ? oldBox : newBox
          }
        />
      )}
    </>
  )
}

export function DesignCanvas({
  width,
  height,
  sizeLabel,
  widthMm,
  heightMm,
  page,
  selectedId,
  onSelect,
  onChangeElement,
  stageRef,
}: Props) {
  const { t } = useTranslation()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [guides, setGuides] = useState<SnapGuide[]>([])

  const bleedPx = mmToPx(BLEED_MM)
  // Labels + bleed strip + crop-mark overhang outside the artboard
  const LABEL_PAD = 52 + bleedPx

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const fit = () => {
      const totalW = width + bleedPx * 2
      const totalH = height + bleedPx * 2
      const availW = Math.max(80, el.clientWidth - LABEL_PAD * 2)
      const availH = Math.max(80, el.clientHeight - LABEL_PAD * 2)
      const s = Math.min(availW / totalW, availH / totalH)
      setScale(Math.max(0.05, s))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [width, height, bleedPx, LABEL_PAD])

  const snap: SnapCtx = {
    pageWidth: width,
    pageHeight: height,
    elements: page.elements,
    setGuides,
  }

  const dimBottom = `${sizeLabel} · Trim ${widthMm}×${heightMm} mm`
  const dimSide = `${sizeLabel} · ${heightMm} mm`
  const boardW = width * scale
  const boardH = height * scale
  const bleedScreen = bleedPx * scale
  const markLen = Math.max(8, bleedScreen * 0.55)
  const markGap = 2
  const stageW = Math.max(1, Math.round(boardW))
  const stageH = Math.max(1, Math.round(boardH))
  const frameW = boardW + bleedScreen * 2
  const frameH = boardH + bleedScreen * 2
  const stroke = Math.max(1, 1 / scale)

  return (
    <div
      ref={wrapRef}
      className="relative box-border h-full w-full overflow-hidden bg-[#cfcbc5]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onSelect(null)
      }}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: frameW,
          height: frameH,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Bleed sheet — colour + optional full-bleed photo (cover) */}
        <div
          className="absolute inset-0 shadow-[0_8px_28px_rgba(0,0,0,0.18)] ring-1 ring-black/10"
          style={{
            backgroundColor: page.background,
            backgroundImage: page.backgroundImage
              ? `url(${page.backgroundImage})`
              : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          aria-hidden
        />

        {/* Subtle hatch on bleed (outside trim) so the cut zone reads clearly */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            boxShadow: `inset 0 0 0 ${bleedScreen}px rgba(0,0,0,0.06)`,
          }}
          aria-hidden
        />

        {/* Trim artboard — transparent when bg image so bleed photo shows through */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: bleedScreen,
            top: bleedScreen,
            width: boardW,
            height: boardH,
            boxShadow: `inset 0 0 0 ${stroke}px rgba(0,0,0,0.22)`,
          }}
        >
          <Stage
            ref={stageRef}
            width={stageW}
            height={stageH}
            scaleX={scale}
            scaleY={scale}
            onMouseDown={(e) => {
              if (e.target === e.target.getStage()) onSelect(null)
            }}
          >
            <Layer>
              {!page.backgroundImage && (
                <Rect
                  x={0}
                  y={0}
                  width={width}
                  height={height}
                  fill={page.background}
                  listening={false}
                />
              )}
              {page.elements.map((el) =>
                el.type === 'text' ? (
                  <TextNode
                    key={el.id}
                    el={el}
                    selected={selectedId === el.id}
                    onSelect={() => onSelect(el.id)}
                    onChange={(patch) => onChangeElement(el.id, patch)}
                    snap={snap}
                  />
                ) : (
                  <ImageNode
                    key={el.id}
                    el={el}
                    selected={selectedId === el.id}
                    onSelect={() => onSelect(el.id)}
                    onChange={(patch) => onChangeElement(el.id, patch)}
                    snap={snap}
                  />
                ),
              )}
              {guides.map((g, i) =>
                g.orientation === 'v' ? (
                  <Line
                    key={`vg-${i}-${g.pos}`}
                    points={[g.pos, 0, g.pos, height]}
                    stroke="#ff2d55"
                    strokeWidth={1 / scale}
                    dash={[4 / scale, 4 / scale]}
                    listening={false}
                  />
                ) : (
                  <Line
                    key={`hg-${i}-${g.pos}`}
                    points={[0, g.pos, width, g.pos]}
                    stroke="#ff2d55"
                    strokeWidth={1 / scale}
                    dash={[4 / scale, 4 / scale]}
                    listening={false}
                  />
                ),
              )}
            </Layer>
          </Stage>
        </div>

        {/* Crop marks at trim corners (same idea as print PDF) */}
        <svg
          className="pointer-events-none absolute inset-0 z-10 overflow-visible"
          width={frameW}
          height={frameH}
          aria-hidden
        >
          {/* top-left */}
          <line
            x1={bleedScreen - markLen}
            y1={bleedScreen}
            x2={bleedScreen - markGap}
            y2={bleedScreen}
            stroke="#222"
            strokeWidth={1}
          />
          <line
            x1={bleedScreen}
            y1={bleedScreen - markLen}
            x2={bleedScreen}
            y2={bleedScreen - markGap}
            stroke="#222"
            strokeWidth={1}
          />
          {/* top-right */}
          <line
            x1={bleedScreen + boardW + markGap}
            y1={bleedScreen}
            x2={bleedScreen + boardW + markLen}
            y2={bleedScreen}
            stroke="#222"
            strokeWidth={1}
          />
          <line
            x1={bleedScreen + boardW}
            y1={bleedScreen - markLen}
            x2={bleedScreen + boardW}
            y2={bleedScreen - markGap}
            stroke="#222"
            strokeWidth={1}
          />
          {/* bottom-left */}
          <line
            x1={bleedScreen - markLen}
            y1={bleedScreen + boardH}
            x2={bleedScreen - markGap}
            y2={bleedScreen + boardH}
            stroke="#222"
            strokeWidth={1}
          />
          <line
            x1={bleedScreen}
            y1={bleedScreen + boardH + markGap}
            x2={bleedScreen}
            y2={bleedScreen + boardH + markLen}
            stroke="#222"
            strokeWidth={1}
          />
          {/* bottom-right */}
          <line
            x1={bleedScreen + boardW + markGap}
            y1={bleedScreen + boardH}
            x2={bleedScreen + boardW + markLen}
            y2={bleedScreen + boardH}
            stroke="#222"
            strokeWidth={1}
          />
          <line
            x1={bleedScreen + boardW}
            y1={bleedScreen + boardH + markGap}
            x2={bleedScreen + boardW}
            y2={bleedScreen + boardH + markLen}
            stroke="#222"
            strokeWidth={1}
          />
        </svg>

        <div
          className="pointer-events-none absolute left-0 right-0 z-20 text-center text-xs font-semibold tracking-wide text-[#2a2825]"
          style={{ top: 'calc(100% + 10px)' }}
        >
          {dimBottom}
          <span className="mt-0.5 block font-medium text-[#4a4540]">
            {t('design.bleedHint', { bleed: BLEED_MM })}
          </span>
        </div>
        <div
          className="pointer-events-none absolute z-20 text-xs font-semibold tracking-wide text-[#2a2825]"
          style={{
            left: 'calc(100% + 12px)',
            top: '50%',
            transform: 'translateY(-50%)',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
          }}
        >
          {dimSide}
        </div>
      </div>
    </div>
  )
}

