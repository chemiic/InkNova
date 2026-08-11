import {
  BLEED_MM,
  effectiveMinQuantity,
  lineTotalFromPack,
  mmToPx,
  sizeToMm,
  unitPriceFromPack,
} from '@inknova/shared'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { Product, SizeOption } from '@inknova/shared'
import type Konva from 'konva'
import { DesignPreviewModal } from '@/components/DesignPreviewModal'
import { Button } from '@/components/ui/button'
import { DesignCanvas } from '@/editor/DesignCanvas'
import { exportPrintPdf } from '@/editor/exportPdf'
import { EditorSidebar } from '@/editor/EditorSidebar'
import {
  applyProductPageStructure,
  getTemplate,
  templatesForProduct,
} from '@/editor/templates'
import type { DesignDoc, DesignElement, DesignPageSide } from '@/editor/types'
import type { TemplateCopy } from '@/editor/types'
import { fetchProduct } from '@/lib/api'
import { catalogCopy } from '@/lib/catalogI18n'
import { useCart } from '@/lib/cart'
import { saveDesignPdf } from '@/lib/designStore'
import {
  normalizePrintUpload,
  PRINT_UPLOAD_ACCEPT,
} from '@/lib/uploadPrintFile'
import { createId, cn, formatNok } from '@/lib/utils'

type DesignMode = 'editor' | 'upload'

export function DesignPage() {
  const { slug = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { addToCart } = useCart()

  const sizeIdParam = searchParams.get('sizeId')
  const qtyParam = Number(searchParams.get('qty') ?? '1')
  const modeParam = searchParams.get('mode')
  const mode: DesignMode = modeParam === 'upload' ? 'upload' : 'editor'

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewFileNameState, setPreviewFileNameState] = useState<string | null>(
    null,
  )
  /** view = preview only; add = preview then confirm into cart */
  const [previewIntent, setPreviewIntent] = useState<'view' | 'add'>('view')
  const [dragOver, setDragOver] = useState(false)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const [templateId, setTemplateId] = useState('blank')
  const [doc, setDoc] = useState<DesignDoc | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const stageRef = useRef<Konva.Stage | null>(null)

  const minQty = effectiveMinQuantity(product?.minQuantity)
  const qty =
    Number.isFinite(qtyParam) && qtyParam >= minQty
      ? Math.floor(qtyParam)
      : minQty

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    void fetchProduct(slug)
      .then((data) => {
        if (!cancelled) setProduct(data)
      })
      .catch(() => {
        if (!cancelled) {
          setProduct(null)
          setError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const selectedSize: SizeOption | null = useMemo(() => {
    if (!product) return null
    const sizeId =
      sizeIdParam ?? product.sizes[0]?.id ?? (product.customSize ? 'custom' : null)
    if (!sizeId) return null
    if (sizeId === 'custom' && product.customSize) {
      return {
        id: 'custom',
        label: t('product.customSize'),
        price: product.customSize.basePrice,
      }
    }
    return product.sizes.find((s) => s.id === sizeId) ?? null
  }, [product, sizeIdParam, t])

  const dims = selectedSize ? sizeToMm(selectedSize.id) : null

  function getTemplateCopy(): TemplateCopy {
    return {
      logo: t('design.templateCopy.logo'),
      yourName: t('design.templateCopy.yourName'),
      titleRole: t('design.templateCopy.titleRole'),
      contactLine: t('design.templateCopy.contactLine'),
      companyName: t('design.templateCopy.companyName'),
      website: t('design.templateCopy.website'),
      image: t('design.templateCopy.image'),
      headline: t('design.templateCopy.headline'),
      shortDescription: t('design.templateCopy.shortDescription'),
      event: t('design.templateCopy.event'),
      titleHere: t('design.templateCopy.titleHere'),
      photo: t('design.templateCopy.photo'),
      datePlaceTime: t('design.templateCopy.datePlaceTime'),
    }
  }

  function buildDoc(templateKey: string, productSlug: string): DesignDoc {
    const w = mmToPx(dims!.widthMm)
    const h = mmToPx(dims!.heightMm)
    const tpl = getTemplate(templateKey) ?? getTemplate('blank')!
    return applyProductPageStructure(
      tpl.build(w, h, productSlug, getTemplateCopy()),
      productSlug,
    )
  }

  useEffect(() => {
    if (!product || !selectedSize || !dims) return
    const available = templatesForProduct(product.slug)
    const initial =
      available.find((tpl) => tpl.id !== 'blank')?.id ??
      available[0]?.id ??
      'blank'
    setTemplateId(initial)
    setDoc(buildDoc(initial, product.slug))
    setPageIndex(0)
    setSelectedId(null)
    setPreviewOpen(false)
    setPreviewBlob(null)
    setPreviewFileNameState(null)
  }, [product?.slug, selectedSize?.id, dims?.widthMm, dims?.heightMm])

  function setMode(next: DesignMode) {
    const params = new URLSearchParams(searchParams)
    if (next === 'upload') params.set('mode', 'upload')
    else params.delete('mode')
    setSearchParams(params, { replace: true })
    setExportError(null)
    setPreviewOpen(false)
    setPreviewBlob(null)
    setPreviewFileNameState(null)
  }

  function applyTemplate(id: string) {
    if (!dims || !product) return
    setTemplateId(id)
    setDoc(buildDoc(id, product.slug))
    setPageIndex(0)
    setSelectedId(null)
  }

  /** Place uploaded artwork as a full-bleed background scaled to the format. */
  function applyOwnFile(dataUrl: string) {
    if (!dims || !product) return
    const next = buildDoc('blank', product.slug)
    const targetIndex = next.pages.length === 1 ? 0 : pageIndex
    next.pages = next.pages.map((p, i) =>
      i === targetIndex
        ? { ...p, backgroundImage: dataUrl, elements: [] }
        : p,
    )
    setTemplateId('own-file')
    setDoc(next)
    setSelectedId(null)
  }

  function selectPage(index: number) {
    setPageIndex(index)
    setSelectedId(null)
  }

  function updateActivePage(
    updater: (page: DesignPageSide) => DesignPageSide,
  ) {
    setDoc((d) => {
      if (!d) return d
      return {
        ...d,
        pages: d.pages.map((p, i) => (i === pageIndex ? updater(p) : p)),
      }
    })
  }

  function patchPage(
    patch: Partial<Pick<DesignPageSide, 'background' | 'backgroundImage'>>,
  ) {
    updateActivePage((p) => ({ ...p, ...patch }))
  }

  function changeElement(id: string, patch: Partial<DesignElement>) {
    updateActivePage((p) => ({
      ...p,
      elements: p.elements.map((el) =>
        el.id === id ? ({ ...el, ...patch } as DesignElement) : el,
      ),
    }))
  }

  function addElement(el: DesignElement) {
    updateActivePage((p) => ({ ...p, elements: [...p.elements, el] }))
  }

  function removeElement(id: string) {
    updateActivePage((p) => ({
      ...p,
      elements: p.elements.filter((e) => e.id !== id),
    }))
    setSelectedId(null)
  }

  /** orderedIdsBackToFront: first id = bottom of stack (drawn first) */
  function reorderElements(orderedIdsBackToFront: string[]) {
    updateActivePage((p) => {
      const byId = new Map(p.elements.map((el) => [el.id, el]))
      const next = orderedIdsBackToFront
        .map((id) => byId.get(id))
        .filter((el): el is DesignElement => Boolean(el))
      return { ...p, elements: next }
    })
  }

  async function handleOpenPreview(intent: 'view' | 'add') {
    if (!product || !selectedSize || !doc) return
    setPreviewIntent(intent)
    setExporting(true)
    setExportError(null)
    setPreviewOpen(true)
    setPreviewBlob(null)
    setPreviewFileNameState(`${product.slug}-${selectedSize.id}.pdf`)
    try {
      const blob = await exportPrintPdf(doc)
      setPreviewBlob(blob)
    } catch (e) {
      console.error(e)
      setExportError(t('design.exportError'))
    } finally {
      setExporting(false)
    }
  }

  function handleClosePreview() {
    if (confirming) return
    setPreviewOpen(false)
    setPreviewBlob(null)
    setPreviewFileNameState(null)
    setExportError(null)
    setPreviewIntent('view')
  }

  async function handleConfirmAddToCart() {
    if (!product || !selectedSize || !previewBlob) return
    setConfirming(true)
    setExportError(null)
    try {
      const designPdfKey = createId()
      const fileName =
        previewFileNameState ?? `${product.slug}-${selectedSize.id}.pdf`
      await saveDesignPdf(designPdfKey, previewBlob, fileName)
      addToCart({
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        sizeId: selectedSize.id,
        sizeLabel: selectedSize.label,
        qty,
        unitPrice: unitPriceFromPack(selectedSize.price, product.minQuantity),
        designPdfKey,
        designFileName: fileName,
        templateId: mode === 'upload' ? 'upload' : templateId,
      })
      navigate('/handlekurv')
    } catch (e) {
      console.error(e)
      setExportError(t('design.exportError'))
    } finally {
      setConfirming(false)
    }
  }

  async function processUploadFile(file: File) {
    if (!product || !selectedSize || !dims) return
    setExporting(true)
    setExportError(null)
    setPreviewIntent('add')
    setPreviewOpen(true)
    setPreviewBlob(null)
    setPreviewFileNameState(null)
    try {
      const result = await normalizePrintUpload(
        file,
        dims,
        product.slug,
        selectedSize.id,
      )
      setPreviewBlob(result.blob)
      setPreviewFileNameState(result.fileName)
    } catch (e) {
      console.error(e)
      const code = e instanceof Error ? e.message : ''
      if (code === 'invalid-type') {
        setExportError(t('design.uploadInvalidType'))
      } else if (code === 'invalid-size') {
        setExportError(t('design.uploadInvalidSize'))
      } else {
        setExportError(t('design.uploadError'))
      }
    } finally {
      setExporting(false)
    }
  }

  function onUploadInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) void processUploadFile(file)
  }

  function onDropFile(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void processUploadFile(file)
  }

  const activePage = doc?.pages[pageIndex] ?? null
  const previewFileName =
    previewFileNameState ??
    (product && selectedSize ? `${product.slug}-${selectedSize.id}.pdf` : null)

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-ink-muted">
        {t('common.loading')}
      </div>
    )
  }

  if (error || !product || !selectedSize || !dims) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-ink-muted">{t('common.error')}</p>
        <Link to={`/produkter/${slug}`} className="mt-4 inline-block text-ink underline">
          {t('common.back')}
        </Link>
      </div>
    )
  }

  if (mode === 'editor' && (!doc || !activePage)) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-ink-muted">
        {t('common.loading')}
      </div>
    )
  }

  const copy = catalogCopy(product, t)

  const modeSwitcher = (
    <div className="flex shrink-0 gap-1 rounded-lg border border-line bg-paper-card p-1">
      <button
        type="button"
        onClick={() => setMode('editor')}
        className={cn(
          'rounded-md px-3 py-1.5 text-sm transition',
          mode === 'editor'
            ? 'bg-ink text-paper'
            : 'text-ink-muted hover:text-ink',
        )}
      >
        {t('design.modeEditor')}
      </button>
      <button
        type="button"
        onClick={() => setMode('upload')}
        className={cn(
          'rounded-md px-3 py-1.5 text-sm transition',
          mode === 'upload'
            ? 'bg-ink text-paper'
            : 'text-ink-muted hover:text-ink',
        )}
      >
        {t('design.modeUpload')}
      </button>
    </div>
  )

  const headerMeta = (
    <div className="min-w-0">
      <p className="truncate text-sm text-ink-muted">
        <Link
          to={`/produkter/${product.slug}`}
          className="underline-offset-2 hover:underline"
        >
          {copy.name}
        </Link>
        {' · '}
        {selectedSize.label}
        {' · '}
        {t('design.trimSize', {
          width: dims.widthMm,
          height: dims.heightMm,
          bleed: BLEED_MM,
        })}
        {mode === 'editor' && doc && doc.pages.length > 1 && (
          <>
            {' · '}
            {t('design.pageCount', { count: doc.pages.length })}
          </>
        )}
      </p>
    </div>
  )

  const previewModal = (
    <DesignPreviewModal
      open={previewOpen}
      blob={previewBlob}
      fileName={previewFileName}
      loading={exporting}
      error={exportError}
      confirmLabel={
        previewIntent === 'add' ? t('design.previewConfirm') : undefined
      }
      dismissLabel={
        mode === 'upload' ? t('design.previewChooseOther') : undefined
      }
      confirming={confirming}
      onConfirm={
        previewIntent === 'add'
          ? () => void handleConfirmAddToCart()
          : undefined
      }
      onClose={handleClosePreview}
    />
  )

  if (mode === 'upload') {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          {headerMeta}
          <div className="flex flex-wrap items-center gap-3">
            {modeSwitcher}
            <p className="text-sm font-medium">
              {t('product.lineTotal', {
                count: qty,
                total: formatNok(
                  lineTotalFromPack(
                    selectedSize.price,
                    qty,
                    product.minQuantity,
                  ),
                ),
              })}
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10">
          <div className="w-full max-w-lg text-center">
            <h1 className="font-display text-3xl text-ink md:text-4xl">
              {t('design.uploadTitle')}
            </h1>
            <p className="mt-3 text-ink-muted">{t('design.uploadSub')}</p>
          </div>

          <input
            ref={uploadInputRef}
            type="file"
            accept={PRINT_UPLOAD_ACCEPT}
            className="sr-only"
            onChange={onUploadInputChange}
          />

          <button
            type="button"
            disabled={exporting || confirming}
            onClick={() => uploadInputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              setDragOver(false)
            }}
            onDrop={onDropFile}
            className={cn(
              'mt-8 flex w-full max-w-lg flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-16 text-center transition',
              dragOver
                ? 'border-accent bg-accent/5'
                : 'border-line bg-paper-card hover:border-ink/30',
              (exporting || confirming) && 'pointer-events-none opacity-60',
            )}
          >
            <p className="text-base font-semibold text-ink">
              {exporting ? t('design.uploadProcessing') : t('design.uploadDrop')}
            </p>
            <p className="text-sm text-ink-muted">{t('design.uploadHint')}</p>
            <span className="mt-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper">
              {t('design.uploadBrowse')}
            </span>
          </button>

          {exportError && !previewOpen && (
            <p className="mt-4 max-w-lg text-center text-sm text-warm">
              {exportError}
            </p>
          )}
        </div>

        {previewModal}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        {headerMeta}
        <div className="flex flex-wrap items-center gap-3">
          {modeSwitcher}
          <p className="text-sm font-medium">
            {t('product.lineTotal', {
              count: qty,
              total: formatNok(
                lineTotalFromPack(selectedSize.price, qty, product.minQuantity),
              ),
            })}
          </p>
          <Button
            size="lg"
            variant="outline"
            disabled={exporting || confirming}
            onClick={() => void handleOpenPreview('view')}
          >
            {exporting && previewIntent === 'view'
              ? t('design.exporting')
              : t('design.preview')}
          </Button>
          <Button
            size="lg"
            disabled={exporting || confirming}
            onClick={() => void handleOpenPreview('add')}
          >
            {exporting && previewIntent === 'add'
              ? t('design.exporting')
              : t('design.addToCart')}
          </Button>
        </div>
      </div>

      {exportError && !previewOpen && (
        <div className="mx-4 mt-2 shrink-0 rounded-lg border border-warm/40 bg-warm/10 px-4 py-2 text-sm text-warm">
          {exportError}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="scrollbar-editor max-h-[40vh] min-w-0 shrink-0 overflow-x-hidden overflow-y-auto lg:max-h-none lg:h-full lg:w-72">
          <EditorSidebar
            productSlug={product.slug}
            doc={doc!}
            activePage={activePage!}
            pageIndex={pageIndex}
            selectedId={selectedId}
            templateId={templateId}
            onSelectTemplate={applyTemplate}
            onOwnFile={applyOwnFile}
            onSelectPage={selectPage}
            onPatchPage={patchPage}
            onChangeElement={changeElement}
            onAddElement={addElement}
            onRemoveElement={removeElement}
            onReorderElements={reorderElements}
            onSelect={setSelectedId}
          />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {doc!.pages.length > 1 && (
            <div className="flex shrink-0 gap-2 border-b border-line px-4 py-2">
              {doc!.pages.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPage(i)}
                  className={`rounded-md px-3 py-1.5 text-sm transition ${
                    pageIndex === i
                      ? 'bg-ink text-paper'
                      : 'bg-paper-card text-ink-muted hover:text-ink'
                  }`}
                >
                  {doc!.pages.length > 1 && p.labelKey === 'page'
                    ? t('design.pageLabels.pageN', { n: i + 1 })
                    : t(`design.pageLabels.${p.labelKey}`, {
                        defaultValue: t('design.pageLabels.pageN', {
                          n: i + 1,
                        }),
                      })}
                </button>
              ))}
            </div>
          )}
          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0">
              <DesignCanvas
                width={doc!.width}
                height={doc!.height}
                sizeLabel={selectedSize.label}
                widthMm={dims.widthMm}
                heightMm={dims.heightMm}
                page={activePage!}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onChangeElement={changeElement}
                stageRef={stageRef}
              />
            </div>
          </div>
        </div>
      </div>

      {previewModal}
    </div>
  )
}
