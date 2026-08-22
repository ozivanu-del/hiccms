import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Heading2, Italic, Link as LinkIcon, List, ListOrdered, Quote } from 'lucide-react'

export default function TiptapEditor({ content, onChange }: { content: string; onChange: (content: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false }), Placeholder.configure({ placeholder: 'Mulai menulis...' })],
    content,
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
    editorProps: { attributes: { class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[400px] py-4 px-6 border border-gray-200 rounded-b-lg bg-white' } },
  })
  useEffect(() => { if (editor && editor.getHTML() !== content) editor.commands.setContent(content || '', false) }, [content, editor])
  if (!editor) return null
  const setLink = () => {
    const url = window.prompt('URL Tautan:', editor.getAttributes('link').href)
    if (url === null) return
    if (!url) editor.chain().focus().extendMarkRange('link').unsetLink().run()
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }
  const buttons = [
    { title: 'Bold', active: editor.isActive('bold'), action: () => editor.chain().focus().toggleBold().run(), icon: Bold },
    { title: 'Italic', active: editor.isActive('italic'), action: () => editor.chain().focus().toggleItalic().run(), icon: Italic },
    { title: 'Heading 2', active: editor.isActive('heading', { level: 2 }), action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), icon: Heading2 },
    { title: 'Bullet List', active: editor.isActive('bulletList'), action: () => editor.chain().focus().toggleBulletList().run(), icon: List },
    { title: 'Ordered List', active: editor.isActive('orderedList'), action: () => editor.chain().focus().toggleOrderedList().run(), icon: ListOrdered },
    { title: 'Quote', active: editor.isActive('blockquote'), action: () => editor.chain().focus().toggleBlockquote().run(), icon: Quote },
    { title: 'Link', active: editor.isActive('link'), action: setLink, icon: LinkIcon },
  ]
  return <div><div className="flex flex-wrap gap-1 rounded-t-lg border border-b-0 bg-gray-50 p-2">{buttons.map(({ title, active, action, icon: Icon }) => <button type="button" key={title} title={title} onClick={action} className={`rounded p-2 ${active ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}`}><Icon className="h-4 w-4" /></button>)}</div><EditorContent editor={editor} /></div>
}
