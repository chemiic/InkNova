import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Article } from '@inknova/shared'
import { RichTextEditor } from '@/components/RichTextEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  adminCreateArticle,
  adminGetArticle,
  adminUpdateArticle,
  adminUpload,
} from '@/lib/adminApi'
import { assetUrl } from '@/lib/assetUrl'

type FormState = {
  slug: string
  titleNb: string
  titleEn: string
  excerptNb: string
  excerptEn: string
  bodyNb: string
  bodyEn: string
  imageUrl: string
  hidden: boolean
}

function emptyForm(): FormState {
  return {
    slug: '',
    titleNb: '',
    titleEn: '',
    excerptNb: '',
    excerptEn: '',
    bodyNb: '',
    bodyEn: '',
    imageUrl: '',
    hidden: false,
  }
}

function fromArticle(a: Article): FormState {
  return {
    slug: a.slug,
    titleNb: a.titleNb,
    titleEn: a.titleEn,
    excerptNb: a.excerptNb,
    excerptEn: a.excerptEn,
    bodyNb: a.bodyNb,
    bodyEn: a.bodyEn,
    imageUrl: a.imageUrl ?? '',
    hidden: a.hidden === true,
  }
}

export function AdminArticleEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    void adminGetArticle(id!)
      .then((a) => {
        if (!cancelled) setForm(fromArticle(a))
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('common.error'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, isNew, t])

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onUpload(files: FileList | null) {
    if (!files?.[0]) return
    try {
      const { url } = await adminUpload(files[0])
      patch('imageUrl', url)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t('admin.common.uploadFailed'),
      )
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        id: isNew ? undefined : id,
        slug: form.slug.trim(),
        titleNb: form.titleNb,
        titleEn: form.titleEn,
        excerptNb: form.excerptNb,
        excerptEn: form.excerptEn,
        bodyNb: form.bodyNb,
        bodyEn: form.bodyEn,
        imageUrl: form.imageUrl || null,
        hidden: form.hidden,
      }
      if (isNew) {
        const created = await adminCreateArticle(payload)
        navigate(`/admin/articles/${created.id}`, { replace: true })
      } else {
        await adminUpdateArticle(id!, payload)
        navigate('/admin/articles')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-ink-muted">{t('admin.common.loading')}</p>
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/admin/articles" className="text-sm text-ink-muted underline">
          {t('admin.common.back')}
        </Link>
        <h1 className="mt-2 font-display text-3xl text-ink">
          {isNew
            ? t('admin.articles.createTitle')
            : t('admin.articles.editTitle')}
        </h1>
      </div>

      <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="slug">{t('admin.articles.slug')}</Label>
            <Input
              id="slug"
              className="mt-1"
              value={form.slug}
              onChange={(e) => patch('slug', e.target.value)}
              required
            />
          </div>
          <label className="mt-7 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.hidden}
              onChange={(e) => patch('hidden', e.target.checked)}
            />
            {t('admin.articles.hidden')}
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="titleNb">{t('admin.articles.titleNbLabel')}</Label>
            <Input
              id="titleNb"
              className="mt-1"
              value={form.titleNb}
              onChange={(e) => patch('titleNb', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="titleEn">{t('admin.articles.titleEnLabel')}</Label>
            <Input
              id="titleEn"
              className="mt-1"
              value={form.titleEn}
              onChange={(e) => patch('titleEn', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="excerptNb">{t('admin.articles.excerptNb')}</Label>
            <Textarea
              id="excerptNb"
              className="mt-1"
              rows={3}
              value={form.excerptNb}
              onChange={(e) => patch('excerptNb', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="excerptEn">{t('admin.articles.excerptEn')}</Label>
            <Textarea
              id="excerptEn"
              className="mt-1"
              rows={3}
              value={form.excerptEn}
              onChange={(e) => patch('excerptEn', e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{t('admin.articles.bodyNb')}</Label>
            <div className="mt-1">
              <RichTextEditor
                value={form.bodyNb}
                onChange={(html) => patch('bodyNb', html)}
              />
            </div>
          </div>
          <div>
            <Label>{t('admin.articles.bodyEn')}</Label>
            <div className="mt-1">
              <RichTextEditor
                value={form.bodyEn}
                onChange={(html) => patch('bodyEn', html)}
              />
            </div>
          </div>
        </div>

        <div>
          <Label>{t('admin.articles.cover')}</Label>
          <Input
            type="file"
            accept="image/*"
            className="mt-1"
            onChange={(e) => void onUpload(e.target.files)}
          />
          {form.imageUrl && (
            <img
              src={assetUrl(form.imageUrl)}
              alt=""
              className="mt-3 h-40 object-contain"
            />
          )}
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? t('admin.common.saving') : t('admin.common.save')}
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/articles">{t('admin.common.cancel')}</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
