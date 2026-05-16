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
        placeholder: 'Begin writing your answers here. Reference question numbers from the paper on the left (e.g. "Question 1:"). Your work auto-saves every 30 seconds.',
      }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'exam-prose focus:outline-none min-h-[calc(100vh-260px)] px-[72px] py-[60px] text-gray-900 text-base leading-[1.8]',
        spellcheck: 'true',
      },
    },
  });

  // Sync external content changes (e.g. on restore from socket)
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content]);

  return (
    <div className="flex flex-col h-full">
      {!readOnly && <EditorToolbar editor={editor} />}

      {/* A4 paper area */}
      <div className="flex-1 overflow-y-auto bg-[#1a1a2e] py-8 px-4 custom-scrollbar">
        <div
          className="bg-white mx-auto shadow-[0_4px_40px_rgba(0,0,0,0.5)] relative"
          style={{ width: '794px', minHeight: '1123px' }}
        >
          {/* Page margin guides */}
          <div className="absolute inset-0 pointer-events-none border border-gray-200/50" />
          <EditorContent editor={editor} />
        </div>
      </div>

      <style>{`
        .exam-prose h1 { font-size: 1.75rem; font-weight: 700; margin: 1.2em 0 0.5em; color: #1a1a2e; }
        .exam-prose h2 { font-size: 1.4rem; font-weight: 700; margin: 1em 0 0.4em; color: #1a1a2e; }
        .exam-prose h3 { font-size: 1.15rem; font-weight: 600; margin: 0.8em 0 0.3em; color: #1a1a2e; }
        .exam-prose p { margin: 0 0 0.8em; }
        .exam-prose p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
        .exam-prose ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 0.8em; }
        .exam-prose ol { list-style: decimal; padding-left: 1.5rem; margin-bottom: 0.8em; }
        .exam-prose li { margin-bottom: 0.2em; }
        .exam-prose strong { font-weight: 700; }
        .exam-prose em { font-style: italic; }
        .exam-prose u { text-decoration: underline; }
        .exam-prose s { text-decoration: line-through; }
        .exam-prose blockquote { border-left: 3px solid var(--color-primary); padding-left: 1rem; margin: 1em 0; color: #4b5563; font-style: italic; }
        .exam-prose hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5em 0; }
        .exam-prose code { background: #f3f4f6; padding: 0.15em 0.35em; border-radius: 3px; font-size: 0.9em; font-family: monospace; }
        .exam-prose pre { background: #1f2937; color: #f9fafb; padding: 1rem; border-radius: 6px; overflow-x: auto; margin-bottom: 1em; }
        .exam-prose pre code { background: none; padding: 0; }
      `}</style>
    </div>
  );
}


