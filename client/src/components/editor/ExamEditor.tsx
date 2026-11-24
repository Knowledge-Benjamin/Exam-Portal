import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { useEffect } from 'react';
import { EditorToolbar } from './EditorToolbar';

interface ExamEditorProps {
  content: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
}

export function ExamEditor({ content, onChange, readOnly = false }: ExamEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Typography,
      Placeholder.configure({
        placeholder: 'Begin typing your answers here. Reference questions from the paper on the left (e.g. Question 1:). Autosaves continuously.',
      }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'exam-prose focus:outline-none min-h-[calc(100vh-260px)] px-[64px] py-[48px] text-[#1a2654] text-base leading-[1.8]',
        spellcheck: 'true',
      },
    },
  });

  // Sync external content changes only when not focused
  useEffect(() => {
    if (editor && content && !editor.isFocused && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="flex flex-col h-full bg-[#f7f9fc] rounded-2xl overflow-hidden border border-[#e2e8f0]">
      {!readOnly && <EditorToolbar editor={editor} />}

      {/* A4 paper area with crisp, realistic light styling */}
      <div className="flex-1 overflow-y-auto bg-[#eef2f7] py-6 px-4 custom-scrollbar">
        <div
          className="bg-white mx-auto shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-[#e2e8f0] relative rounded-sm"
          style={{ width: '794px', minHeight: '1123px' }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      <style>{`
        .exam-prose h1 { font-size: 1.6rem; font-weight: 700; margin: 1.2em 0 0.4em; color: #1a3a6b; }
        .exam-prose h2 { font-size: 1.3rem; font-weight: 700; margin: 1em 0 0.3em; color: #1a3a6b; }
        .exam-prose h3 { font-size: 1.1rem; font-weight: 600; margin: 0.8em 0 0.25em; color: #1a3a6b; }
        .exam-prose p { margin: 0 0 0.8em; }
        .exam-prose p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #94a3b8;
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
        .exam-prose ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 0.8em; }
        .exam-prose ol { list-style: decimal; padding-left: 1.5rem; margin-bottom: 0.8em; }
        .exam-prose li { margin-bottom: 0.2em; }
        .exam-prose strong { font-weight: 700; color: #1a2654; }
        .exam-prose em { font-style: italic; }
        .exam-prose u { text-decoration: underline; }
        .exam-prose s { text-decoration: line-through; }
        .exam-prose blockquote { border-left: 3px solid #2563eb; padding-left: 1rem; margin: 1em 0; color: #475569; font-style: italic; }
        .exam-prose hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5em 0; }
        .exam-prose code { background: #f1f5f9; padding: 0.15em 0.35em; border-radius: 4px; font-size: 0.9em; font-family: monospace; color: #2563eb; }
        .exam-prose pre { background: #1e293b; color: #f8fafc; padding: 1rem; border-radius: 8px; overflow-x: auto; margin-bottom: 1em; }
        .exam-prose pre code { background: none; padding: 0; color: #f8fafc; }
      `}</style>
    </div>
  );
}
