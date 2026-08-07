import { ImageIcon, Type } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DesignElement } from './types'

type Props = {
  elements: DesignElement[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  /**
   * List order top→bottom = back→front (first in list is behind).
   * Pass ids in that same order (index 0 = bottom of stack).
   */
  onReorder: (orderedIdsBackToFront: string[]) => void
}

function layerLabel(el: DesignElement, t: (k: string) => string): string {
  if (el.type === 'text') {
    const text = el.text.trim() || t('design.newText')
    return text.length > 28 ? `${text.slice(0, 28)}…` : text
  }
  return el.slotLabel?.trim() || t('design.imageSlot')
}

export function LayersPanel({
  elements,
  selectedId,
  onSelect,
  onReorder,
}: Props) {
  const { t } = useTranslation()
  const [dragId, setDragId] = useState<string | null>(null)

  // Top of panel = back (first in elements array); bottom of panel = front
  const backToFront = elements

  function move(fromId: string, toId: string) {
    if (fromId === toId) return
    const ids = backToFront.map((e) => e.id)
    const from = ids.indexOf(fromId)
    const to = ids.indexOf(toId)
    if (from < 0 || to < 0) return
    const next = [...ids]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item!)
    onReorder(next)
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {t('design.layers')}
      </p>
      {backToFront.length === 0 ? (
        <p className="text-xs text-ink-muted">{t('design.layersEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {backToFront.map((el) => {
            const selected = selectedId === el.id
            const dragging = dragId === el.id
            return (
              <li key={el.id}>
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    setDragId(el.id)
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', el.id)
                  }}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const fromId = e.dataTransfer.getData('text/plain') || dragId
                    if (fromId) move(fromId, el.id)
                    setDragId(null)
                  }}
                  onClick={() => onSelect(el.id)}
                  className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm transition ${
                    selected
                      ? 'border-accent bg-accent/10 font-medium'
                      : 'border-transparent hover:border-line hover:bg-paper'
                  } ${dragging ? 'opacity-50' : ''}`}
                >
                  {el.type === 'text' ? (
                    <Type className="size-3.5 shrink-0 text-ink-muted" />
                  ) : (
                    <ImageIcon className="size-3.5 shrink-0 text-ink-muted" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{layerLabel(el, t)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-2 text-[10px] leading-snug text-ink-muted">
        {t('design.layersHint')}
      </p>
    </div>
  )
}
