import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ImagePlus,
  Keyboard,
  Minus,
  PanelLeft,
  Plus,
  Trash2,
  Type,
} from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { DesignElement, TextElement } from './types'

type Props = {
  selected: DesignElement | null
  sidebarOpen: boolean
  textEditActive: boolean
  onToggleSidebar: () => void
  onToggleTextEdit: () => void
  onChangeElement: (id: string, patch: Partial<DesignElement>) => void
  onRemoveElement: (id: string) => void
  onAddText: () => void
  onAddImage: () => void
}

export function EditorMobileToolbar({
  selected,
  sidebarOpen,
  textEditActive,
  onToggleSidebar,
  onToggleTextEdit,
  onChangeElement,
  onRemoveElement,
  onAddText,
  onAddImage,
}: Props) {
  const { t } = useTranslation()
  const imageInputRef = useRef<HTMLInputElement>(null)

  function onImageFile(files: FileList | null) {
    if (selected?.type !== 'image') return
    const file = files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChangeElement(selected.id, { src: reader.result })
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper-card px-3 sticky-bar-padding lg:hidden">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => {
          onImageFile(e.target.files)
          e.target.value = ''
        }}
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={sidebarOpen ? 'default' : 'outline'}
          size="sm"
          className="shrink-0 px-2.5"
          onClick={onToggleSidebar}
          aria-label={t('design.tools')}
          aria-expanded={sidebarOpen}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>

        {selected?.type === 'text' && (
          <>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
              <Button
                type="button"
                variant={textEditActive ? 'default' : 'outline'}
                size="sm"
                className="h-9 w-9 shrink-0 p-0"
                onPointerDown={(e) => {
                  if (textEditActive) e.preventDefault()
                }}
                onClick={onToggleTextEdit}
                aria-label={t('design.editText')}
                aria-pressed={textEditActive}
              >
                <Keyboard className="h-4 w-4" />
              </Button>
              <label className="relative shrink-0">
                <span className="sr-only">{t('design.color')}</span>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-md border-2 border-line bg-paper ring-1 ring-ink/20 ring-inset"
                  style={{ backgroundColor: selected.fill }}
                />
                <input
                  type="color"
                  value={selected.fill}
                  onChange={(e) =>
                    onChangeElement(selected.id, { fill: e.target.value })
                  }
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-9 shrink-0 p-0"
                onClick={() =>
                  onChangeElement(selected.id, {
                    fontSize: Math.max(8, selected.fontSize - 2),
                  })
                }
                aria-label={t('design.decreaseFontSize')}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="min-w-[2rem] text-center text-sm font-medium tabular-nums">
                {selected.fontSize}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-9 shrink-0 p-0"
                onClick={() =>
                  onChangeElement(selected.id, {
                    fontSize: Math.min(200, selected.fontSize + 2),
                  })
                }
                aria-label={t('design.increaseFontSize')}
              >
                <Plus className="h-4 w-4" />
              </Button>
              {(['left', 'center', 'right'] as const).map((align) => {
                const Icon =
                  align === 'left'
                    ? AlignLeft
                    : align === 'center'
                      ? AlignCenter
                      : AlignRight
                return (
                  <Button
                    key={align}
                    type="button"
                    variant={selected.align === align ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 w-9 shrink-0 p-0"
                    onClick={() =>
                      onChangeElement(selected.id, {
                        align: align as TextElement['align'],
                      })
                    }
                    aria-label={t(
                      align === 'left'
                        ? 'design.alignLeft'
                        : align === 'center'
                          ? 'design.alignCenter'
                          : 'design.alignRight',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                )
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 shrink-0 p-0 text-warm"
              onClick={() => onRemoveElement(selected.id)}
              aria-label={t('design.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}

        {selected?.type === 'image' && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-w-0 flex-1 truncate"
              onClick={() => imageInputRef.current?.click()}
            >
              <ImagePlus className="mr-1.5 h-4 w-4 shrink-0" />
              {selected.src ? t('design.replaceImage') : t('design.uploadImage')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 shrink-0 p-0 text-warm"
              onClick={() => onRemoveElement(selected.id)}
              aria-label={t('design.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}

        {!selected && (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onAddText}
            >
              <Type className="mr-1.5 h-4 w-4 shrink-0" />
              {t('design.addText')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onAddImage}
            >
              <ImagePlus className="mr-1.5 h-4 w-4 shrink-0" />
              {t('design.addImage')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
