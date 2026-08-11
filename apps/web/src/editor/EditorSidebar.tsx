import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EDITOR_FONTS, DEFAULT_FONT } from './fonts'
import { LayersPanel } from './LayersPanel'
import { templatesForProduct } from './templates'
import type {
  DesignDoc,
  DesignElement,
  DesignPageSide,
  ImageElement,
  TextElement,
} from './types'
import { uid } from './types'

type Props = {
  productSlug: string
  doc: DesignDoc
  activePage: DesignPageSide
  pageIndex: number
  selectedId: string | null
  templateId: string
  onSelectTemplate: (templateId: string) => void
  /** Upload own artwork scaled to the current format */
  onOwnFile: (dataUrl: string) => void
  onSelectPage: (index: number) => void
  onPatchPage: (
    patch: Partial<Pick<DesignPageSide, 'background' | 'backgroundImage'>>,
  ) => void
  onChangeElement: (id: string, patch: Partial<DesignElement>) => void
  onAddElement: (el: DesignElement) => void
  onRemoveElement: (id: string) => void
  onReorderElements: (orderedIdsBackToFront: string[]) => void
  onSelect: (id: string | null) => void
}

export function EditorSidebar({
  productSlug,
  doc,
  activePage,
  pageIndex,
  selectedId,
  templateId,
  onSelectTemplate,
  onOwnFile,
  onSelectPage,
  onPatchPage,
  onChangeElement,
  onAddElement,
  onRemoveElement,
  onReorderElements,
  onSelect,
}: Props) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)
  const bgFileRef = useRef<HTMLInputElement>(null)
  const ownFileRef = useRef<HTMLInputElement>(null)
  const templates = templatesForProduct(productSlug)
  const selected = activePage.elements.find((e) => e.id === selectedId) ?? null

  function addText() {
    const el: TextElement = {
      id: uid('txt'),
      type: 'text',
      x: Math.round(doc.width * 0.1),
      y: Math.round(doc.height * 0.1),
      width: Math.round(doc.width * 0.6),
      text: t('design.newText'),
      fontSize: Math.max(16, Math.round(doc.width * 0.05)),
      fontFamily: DEFAULT_FONT,
      fill: '#1a1a1a',
      align: 'left',
    }
    onAddElement(el)
    onSelect(el.id)
  }

  function addImageSlot() {
    const el: ImageElement = {
      id: uid('img'),
      type: 'image',
      x: Math.round(doc.width * 0.15),
      y: Math.round(doc.height * 0.2),
      width: Math.round(doc.width * 0.4),
      height: Math.round(doc.height * 0.3),
      src: null,
      slotLabel: t('design.imageSlot'),
    }
    onAddElement(el)
    onSelect(el.id)
  }

  function onFile(files: FileList | null) {
    const file = files?.[0]
    if (!file || !selected || selected.type !== 'image') return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChangeElement(selected.id, { src: reader.result })
      }
    }
    reader.readAsDataURL(file)
  }

  function onBackgroundFile(files: FileList | null) {
    const file = files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onPatchPage({ backgroundImage: reader.result })
      }
    }
    reader.readAsDataURL(file)
  }

  function onOwnFilePick(files: FileList | null) {
    const file = files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onOwnFile(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <aside className="box-border flex w-full min-w-0 max-w-full flex-col gap-5 overflow-x-hidden border-b border-line bg-paper-card p-4 lg:border-b-0 lg:border-r">
      <div>
        <input
          ref={ownFileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            onOwnFilePick(e.target.files)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => ownFileRef.current?.click()}
          className={`mb-3 w-full min-w-0 break-words rounded-md border px-3 py-2.5 text-left text-sm font-medium transition ${
            templateId === 'own-file'
              ? 'border-accent bg-accent/10'
              : 'border-line hover:border-ink/30'
          }`}
        >
          {t('design.ownFile')}
        </button>
        <p className="-mt-2 mb-3 text-xs text-ink-muted">
          {t('design.ownFileHint')}
        </p>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {t('design.templates')}
        </p>
        <div className="flex flex-col gap-1.5">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onSelectTemplate(tpl.id)}
              className={`min-w-0 break-words rounded-md border px-3 py-2 text-left text-sm transition ${
                templateId === tpl.id
                  ? 'border-accent bg-accent/10 font-medium'
                  : 'border-line hover:border-ink/30'
              }`}
            >
              {t(`design.templateNames.${tpl.nameKey}`)}
            </button>
          ))}
        </div>
      </div>

      {doc.pages.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {t('design.pages')}
          </p>
          <div className="flex flex-col gap-1.5">
            {doc.pages.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPage(i)}
                className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                  pageIndex === i
                    ? 'border-accent bg-accent/10 font-medium'
                    : 'border-line hover:border-ink/30'
                }`}
              >
                {doc.pages.length > 1 && p.labelKey === 'page'
                  ? t('design.pageLabels.pageN', { n: i + 1 })
                  : t(`design.pageLabels.${p.labelKey}`, {
                      defaultValue: t('design.pageLabels.pageN', {
                        n: i + 1,
                      }),
                    })}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {t('design.background')}
        </p>
        <div>
          <Label htmlFor="page-bg-color" className="text-ink-muted">
            {t('design.backgroundColor')}
          </Label>
          <Input
            id="page-bg-color"
            type="color"
            value={activePage.background}
            onChange={(e) => onPatchPage({ background: e.target.value })}
            className="mt-1 h-10 w-full max-w-full cursor-pointer p-1"
          />
        </div>
        <input
          ref={bgFileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            onBackgroundFile(e.target.files)
            e.target.value = ''
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => bgFileRef.current?.click()}
        >
          {activePage.backgroundImage
            ? t('design.replaceBackgroundImage')
            : t('design.uploadBackgroundImage')}
        </Button>
        {activePage.backgroundImage && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full text-warm"
            onClick={() => onPatchPage({ backgroundImage: null })}
          >
            {t('design.clearBackgroundImage')}
          </Button>
        )}
        <p className="text-xs text-ink-muted">{t('design.backgroundImageHint')}</p>
      </div>

      <div className="flex min-w-0 flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={addText}>
          {t('design.addText')}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={addImageSlot}>
          {t('design.addImage')}
        </Button>
      </div>

      <LayersPanel
        elements={activePage.elements}
        selectedId={selectedId}
        onSelect={onSelect}
        onReorder={onReorderElements}
      />

      {selected?.type === 'text' && (
        <div className="space-y-3 border-t border-line pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {t('design.textProps')}
          </p>
          <div>
            <Label htmlFor="el-text">{t('design.text')}</Label>
            <textarea
              id="el-text"
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
              rows={3}
              value={selected.text}
              onChange={(e) => onChangeElement(selected.id, { text: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="el-font">{t('design.font')}</Label>
            <select
              id="el-font"
              className="mt-1 h-10 w-full rounded-md border border-line bg-paper px-2 text-sm"
              value={selected.fontFamily}
              onChange={(e) =>
                onChangeElement(selected.id, { fontFamily: e.target.value })
              }
            >
              {EDITOR_FONTS.map((f) => (
                <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="el-size">{t('design.fontSize')}</Label>
              <Input
                id="el-size"
                type="number"
                min={8}
                max={200}
                className="mt-1"
                value={selected.fontSize}
                onChange={(e) =>
                  onChangeElement(selected.id, {
                    fontSize: Math.max(8, Number(e.target.value) || 8),
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="el-color">{t('design.color')}</Label>
              <Input
                id="el-color"
                type="color"
                className="mt-1 h-10 cursor-pointer p-1"
                value={selected.fill}
                onChange={(e) => onChangeElement(selected.id, { fill: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="el-align">{t('design.align')}</Label>
            <select
              id="el-align"
              className="mt-1 h-10 w-full rounded-md border border-line bg-paper px-2 text-sm"
              value={selected.align}
              onChange={(e) =>
                onChangeElement(selected.id, {
                  align: e.target.value as TextElement['align'],
                })
              }
            >
              <option value="left">{t('design.alignLeft')}</option>
              <option value="center">{t('design.alignCenter')}</option>
              <option value="right">{t('design.alignRight')}</option>
            </select>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-warm"
            onClick={() => onRemoveElement(selected.id)}
          >
            {t('design.delete')}
          </Button>
        </div>
      )}

      {selected?.type === 'image' && (
        <div className="mt-1 space-y-3 border-t border-line pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {t('design.imageProps')}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              onFile(e.target.files)
              e.target.value = ''
            }}
          />
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => fileRef.current?.click()}
            >
              {selected.src ? t('design.replaceImage') : t('design.uploadImage')}
            </Button>
            {selected.src && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => onChangeElement(selected.id, { src: null })}
              >
                {t('design.clearImage')}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full text-warm"
              onClick={() => onRemoveElement(selected.id)}
            >
              {t('design.delete')}
            </Button>
          </div>
        </div>
      )}
    </aside>
  )
}
