/** Curated Google Fonts for the editor (loaded in index.html). */
export const EDITOR_FONTS = [
  { id: 'Inter', label: 'Inter' },
  { id: 'Roboto', label: 'Roboto' },
  { id: 'Open Sans', label: 'Open Sans' },
  { id: 'Montserrat', label: 'Montserrat' },
  { id: 'Playfair Display', label: 'Playfair Display' },
  { id: 'Lora', label: 'Lora' },
] as const

export const DEFAULT_FONT = EDITOR_FONTS[0].id
