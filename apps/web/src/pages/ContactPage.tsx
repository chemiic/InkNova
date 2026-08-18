import { useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ConsentCheckbox } from '@/components/ConsentCheckbox'
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
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err' | 'consent'>('idle')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!privacyConsent) {
      setStatus('consent')
      return
    }
    setStatus('sending')
    try {
      await submitContact({
        email,
        message,
        name: name.trim() || undefined,
        privacyConsent: true,
      })
      setStatus('ok')
      setName('')
      setEmail('')
      setMessage('')
      setPrivacyConsent(false)
    } catch {
      setStatus('err')
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-display text-4xl text-ink md:text-5xl">
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
        <ConsentCheckbox
          id="contact-privacy"
          required
          checked={privacyConsent}
          onChange={setPrivacyConsent}
        >
          <Trans
            i18nKey="contact.privacyConsent"
            components={{
              privacy: <Link to="/personvern" className="underline hover:text-ink" />,
            }}
          />
        </ConsentCheckbox>
        <Button
          type="submit"
          size="lg"
          disabled={status === 'sending' || !privacyConsent}
        >
          {t('contact.send')}
        </Button>
        {status === 'ok' && (
          <p className="text-sm font-medium text-ink">{t('contact.success')}</p>
        )}
        {status === 'consent' && (
          <p className="text-sm font-medium text-warm">{t('contact.errorConsent')}</p>
        )}
        {status === 'err' && (
          <p className="text-sm font-medium text-ink-muted">{t('contact.error')}</p>
        )}
      </form>
    </div>
  )
}
