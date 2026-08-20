import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitContact } from '@/lib/api'

export function ContactPage() {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      await submitContact({
        email,
        message,
        name: name.trim() || undefined,
      })
      setStatus('ok')
      setName('')
      setEmail('')
      setMessage('')
    } catch {
      setStatus('err')
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="page-heading">
        {t('contact.title')}
      </h1>
      <p className="mt-4 text-ink-muted">{t('contact.info')}</p>
      <p className="mt-2 text-sm text-ink-muted">
        {t('contact.org')}: 832028452 ·{' '}
        <a className="text-ink hover:underline" href="mailto:Kontakt@inknova.no">
          Kontakt@inknova.no
        </a>
      </p>

      <form onSubmit={onSubmit} className="mt-10 space-y-5">
        <div>
          <Label htmlFor="name">{t('contact.name')}</Label>
          <Input
            id="name"
            className="mt-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div>
          <Label htmlFor="email">{t('contact.email')}</Label>
          <Input
            id="email"
            type="email"
            required
            className="mt-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <Label htmlFor="message">{t('contact.message')}</Label>
          <Textarea
            id="message"
            required
            className="mt-2"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" disabled={status === 'sending'}>
          {t('contact.send')}
        </Button>
        {status === 'ok' && (
          <p className="text-sm font-medium text-ink">{t('contact.success')}</p>
        )}
        {status === 'err' && (
          <p className="text-sm font-medium text-ink-muted">{t('contact.error')}</p>
        )}
      </form>
    </div>
  )
}
