import { useEffect, useRef } from 'react'
import type { TextElement } from './types'

type Props = {
  el: TextElement
  scale: number
  onChange: (patch: Partial<TextElement>) => void
  onClose: () => void
}

export function TextEditOverlay({ el, scale, onChange, onClose }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const node = textareaRef.current
    if (!node) return
    node.focus()
    node.setSelectionRange(node.value.length, node.value.length)
  }, [el.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const fontSize = Math.max(10, el.fontSize * scale)

  return (
    <textarea
      ref={textareaRef}
      value={el.text}
      onChange={(e) => onChange({ text: e.target.value })}
      onBlur={onClose}
      rows={Math.max(1, el.text.split('\n').length)}
      className="absolute z-20 resize-none overflow-hidden border-2 border-accent bg-white/95 p-0 leading-snug text-ink shadow-sm outline-none"
      style={{
        left: el.x * scale,
        top: el.y * scale,
        width: Math.max(40, el.width * scale),
        minHeight: fontSize * 1.35,
        fontSize,
        fontFamily: el.fontFamily,
        color: el.fill,
        textAlign: el.align,
        lineHeight: 1.2,
      }}
      aria-label={el.text || 'Text'}
    />
  )
}
