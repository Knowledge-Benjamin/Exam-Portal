import { type Editor } from '@tiptap/react';

interface ToolbarProps {
  editor: Editor | null;
  compact?: boolean;
}

function ToolbarBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={`h-8 min-w-[32px] px-2 rounded text-sm font-medium transition-all select-none flex items-center justify-center ${
        active
          ? 'bg-[#2d6fba] text-white shadow-[0_0_8px_rgba(0,242,254,0.3)]'
          : 'text-gray-300 hover:bg-white/10 hover:text-white'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-white/10 mx-1 shrink-0" />;
}

export function EditorToolbar({ editor, compact = false }: ToolbarProps) {
  if (!editor) return null;

  return (
    <div className={`flex flex-wrap items-center gap-0.5 bg-[#0f3261] border-b border-white/10 px-3 py-1.5 ${compact ? 'text-xs' : ''}`}>
      {/* History */}
      <ToolbarBtn title="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 010 16H3m0-16l4-4m-4 4l4 4"/></svg>
      </ToolbarBtn>
      <ToolbarBtn title="Redo (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 000 16h10m0-16l-4-4m4 4l-4 4"/></svg>
      </ToolbarBtn>

      <Sep />

      {/* Headings */}
      {!compact && (
        <>
          <ToolbarBtn title="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            <span className="font-black text-[13px]">H1</span>
          </ToolbarBtn>
          <ToolbarBtn title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <span className="font-black text-[13px]">H2</span>
          </ToolbarBtn>
          <ToolbarBtn title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <span className="font-black text-[13px]">H3</span>
          </ToolbarBtn>
          <Sep />
        </>
      )}

      {/* Inline formatting */}
      <ToolbarBtn title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <span className="font-black text-[13px]">B</span>
      </ToolbarBtn>
      <ToolbarBtn title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <span className="italic font-semibold text-[13px]">I</span>
      </ToolbarBtn>
      <ToolbarBtn title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <span className="underline font-semibold text-[13px]">U</span>
      </ToolbarBtn>
      <ToolbarBtn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <span className="line-through text-[13px]">S</span>
      </ToolbarBtn>

      <Sep />

      {/* Alignment */}
      {!compact && (
        <>
          <ToolbarBtn title="Align Left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14"/></svg>
          </ToolbarBtn>
          <ToolbarBtn title="Align Center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M6 18h12"/></svg>
          </ToolbarBtn>
          <ToolbarBtn title="Align Right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14"/></svg>
          </ToolbarBtn>
          <Sep />
        </>
      )}

      {/* Lists */}
      <ToolbarBtn title="Bullet List" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6h11M9 12h11M9 18h11M5 6h.01M5 12h.01M5 18h.01"/></svg>
      </ToolbarBtn>
      <ToolbarBtn title="Numbered List" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6h11M9 12h11M9 18h11M4 6h1m0 0v1m0-1V5m0 2h1M4 12h1m0 0h1m-1 0v2m0-2v-1m0 3v-1M4 18h1m0 0h1m-1 0V17m1 1h1"/></svg>
      </ToolbarBtn>

      {!compact && (
        <>
          <Sep />
          <ToolbarBtn title="Block Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          </ToolbarBtn>
          <ToolbarBtn title="Horizontal Rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <span className="text-[11px] tracking-widest font-bold">—</span>
          </ToolbarBtn>
        </>
      )}
    </div>
  );
}
