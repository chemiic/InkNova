import type { ReactNode } from 'react'

export function LegalDocument({
  title,
  intro,
  updated,
  children,
}: {
  title: string
  intro?: string
  updated?: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl text-ink md:text-5xl">{title}</h1>
      {updated ? (
        <p className="mt-3 text-sm text-ink-muted">{updated}</p>
      ) : null}
      {intro ? <p className="mt-4 text-ink-muted">{intro}</p> : null}
      <div className="mt-10 space-y-10">{children}</div>
    </div>
  )
}

export function LegalSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-ink">{title}</h2>
      {children}
    </section>
  )
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p className="leading-relaxed text-ink-muted">{children}</p>
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-ink-muted">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
