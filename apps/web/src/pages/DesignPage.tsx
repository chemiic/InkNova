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
import { createId, formatNok } from '@/lib/utils'

export function DesignPage() {
  const { slug = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { addToCart } = useCart()

  const sizeIdParam = searchParams.get('sizeId')
  const qtyParam = Number(searchParams.get('qty') ?? '1')

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  /** view = preview only; add = preview then confirm into cart */
  const [previewIntent, setPreviewIntent] = useState<'view' | 'add'>('view')

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
  }, [product?.slug, selectedSize?.id, dims?.widthMm, dims?.heightMm])

  function applyTemplate(id: string) {
    if (!dims || !product) return
    setTemplateId(id)
    setDoc(buildDoc(id, product.slug))
    setPageIndex(0)
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
    setExportError(null)
    setPreviewIntent('view')
  }

  async function handleConfirmAddToCart() {
    if (!product || !selectedSize || !previewBlob) return
    setConfirming(true)
    setExportError(null)
    try {
      const designPdfKey = createId()
      const fileName = `${product.slug}-${selectedSize.id}.pdf`
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
        templateId,
      })
      navigate('/handlekurv')
    } catch (e) {
      console.error(e)
      setExportError(t('design.exportError'))
    } finally {
      setConfirming(false)
    }
  }

  const activePage = doc?.pages[pageIndex] ?? null
  const previewFileName =
    product && selectedSize ? `${product.slug}-${selectedSize.id}.pdf` : null

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-ink-muted">
        {t('common.loading')}
      </div>
    )
  }

  if (error || !product || !selectedSize || !doc || !dims || !activePage) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-ink-muted">{t('common.error')}</p>
        <Link to={`/produkter/${slug}`} className="mt-4 inline-block text-ink underline">
          {t('common.back')}
        </Link>
      </div>
    )
  }

  const copy = catalogCopy(product, t)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
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
            {doc.pages.length > 1 && (
              <>
                {' · '}
                {t('design.pageCount', { count: doc.pages.length })}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
            doc={doc}
            activePage={activePage}
            pageIndex={pageIndex}
            selectedId={selectedId}
            templateId={templateId}
            onSelectTemplate={applyTemplate}
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
          {doc.pages.length > 1 && (
            <div className="flex shrink-0 gap-2 border-b border-line px-4 py-2">
              {doc.pages.map((p, i) => (
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
                  {t(`design.pageLabels.${p.labelKey}`, {
                    defaultValue: t('design.pageLabels.pageN', { n: i + 1 }),
                  })}
                </button>
              ))}
            </div>
          )}
          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0">
              <DesignCanvas
                width={doc.width}
                height={doc.height}
                sizeLabel={selectedSize.label}
                widthMm={dims.widthMm}
                heightMm={dims.heightMm}
                page={activePage}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onChangeElement={changeElement}
                stageRef={stageRef}
              />
            </div>
          </div>
        </div>
      </div>

      <DesignPreviewModal
        open={previewOpen}
        blob={previewBlob}
        fileName={previewFileName}
        loading={exporting}
        error={exportError}
        confirmLabel={
          previewIntent === 'add' ? t('design.previewConfirm') : undefined
        }
        confirming={confirming}
        onConfirm={
          previewIntent === 'add'
            ? () => void handleConfirmAddToCart()
            : undefined
        }
        onClose={handleClosePreview}
      />
    </div>
  )
}
