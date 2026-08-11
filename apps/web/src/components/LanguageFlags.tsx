/** Compact flag icons for the language toggle (NO / GB). */

export function FlagNorway({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 16"
      className={className}
      aria-hidden
      focusable="false"
    >
      <rect width="22" height="16" fill="#BA0C2F" />
      <rect x="6" width="4" height="16" fill="#fff" />
      <rect y="6" width="22" height="4" fill="#fff" />
      <rect x="7" width="2" height="16" fill="#00205B" />
      <rect y="7" width="22" height="2" fill="#00205B" />
    </svg>
  )
}

export function FlagUk({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 16"
      className={className}
      aria-hidden
      focusable="false"
    >
      <rect width="22" height="16" fill="#012169" />
      <path d="M0 0 L22 16 M22 0 L0 16" stroke="#fff" strokeWidth="3.2" />
      <path d="M0 0 L22 16 M22 0 L0 16" stroke="#C8102E" strokeWidth="1.6" />
      <rect x="9" width="4" height="16" fill="#fff" />
      <rect y="6" width="22" height="4" fill="#fff" />
      <rect x="10" width="2" height="16" fill="#C8102E" />
      <rect y="7" width="22" height="2" fill="#C8102E" />
    </svg>
  )
}
