import { useTranslation } from 'react-i18next'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

type FaqItem = { q: string; a: string }

export function FaqPage() {
  const { t } = useTranslation()
  const items = t('faq.items', { returnObjects: true }) as FaqItem[]

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl text-ink md:text-5xl">
        {t('faq.title')}
      </h1>
      <p className="mt-4 text-ink-muted">{t('faq.intro')}</p>

      <Accordion type="single" collapsible className="mt-10 w-full">
        {items.map((item, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger>{item.q}</AccordionTrigger>
            <AccordionContent>{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
