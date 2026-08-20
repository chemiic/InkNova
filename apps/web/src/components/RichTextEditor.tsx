import { useEditor, EditorContent } from '@tiptap/react'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { plainTextToHtml } from '@/lib/articleHtml'
import { cn } from '@/lib/utils'

type Props = {
  value: string
  onChange: (html: string) => void
  className?: string
  minHeightClass?: string
}

export function RichTextEditor({
  value,
  onChange,
  className,
  minHeightClass = 'min-h-[12rem]',
}: Props) {
  const { t } = useTranslation()

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        horizontalRule: false,
        blockquote: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
          class: 'underline',
        },
      }),
    ],
    content: plainTextToHtml(value),
    editorProps: {
      attributes: {
        class: cn(
          'prose-article max-w-none px-3 py-2 text-sm text-ink outline-none',
          minHeightClass,
        ),
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    const next = plainTextToHtml(value)
    if (editor.getHTML() === next) return
    if (editor.isFocused) return
    editor.commands.setContent(next, { emitUpdate: false })
  }, [editor, value])

  if (!editor) return null

  function setLink() {
    if (!editor) return
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt(t('admin.editor.linkPrompt'), previous ?? 'https://')
    if (url === null) return
    const trimmed = url.trim()
    if (trimmed === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: trimmed })
      .run()
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-transparent bg-[#ededed]',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line/80 px-2 py-1.5">
        <ToolbarButton
          label={t('admin.editor.bold')}
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t('admin.editor.italic')}
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t('admin.editor.underline')}
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton
          label={t('admin.editor.heading2')}
          active={editor.isActive('heading', { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t('admin.editor.heading3')}
          active={editor.isActive('heading', { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton
          label={t('admin.editor.bulletList')}
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t('admin.editor.orderedList')}
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton
          label={t('admin.editor.link')}
          active={editor.isActive('link')}
          onClick={setLink}
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton
          label={t('admin.editor.undo')}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t('admin.editor.redo')}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

function ToolbarSep() {
  return <span className="mx-1 h-5 w-px bg-line" aria-hidden />
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
  disabled,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 touch-target items-center justify-center rounded text-ink-muted transition hover:bg-paper hover:text-ink disabled:pointer-events-none disabled:opacity-40 sm:h-8 sm:w-8',
        active && 'bg-paper text-ink',
      )}
    >
      {children}
    </button>
  )
}
