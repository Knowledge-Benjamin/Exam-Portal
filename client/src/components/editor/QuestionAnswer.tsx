import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import type { Question } from '../../types';
import { EditorToolbar } from './EditorToolbar';

interface QuestionAnswerProps {
  question: Question;
  index: number;
  value: string;
  onChange: (questionId: string, value: string) => void;
  readOnly?: boolean;
}

// ─── MCQ ─────────────────────────────────────────────────────────────────────

function MCQAnswer({
  question,
  value,
  onChange,
  readOnly,
}: {
  question: Question;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  const options: string[] = question.options ?? [];
  return (
    <div className="space-y-2.5 mt-4">
      {options.map((opt, i) => {
        const label = String.fromCharCode(65 + i); // A, B, C, D
        const selected = value === opt;
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange(opt)}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-150 flex items-center gap-3 group ${
              selected
                ? 'bg-[#eff6ff] border-[#2563eb] text-[#1a3a6b] shadow-xs'
                : 'bg-white border-[#e2e8f0] text-[#1a2654] hover:border-[#cbd5e1] hover:bg-[#f8fafc]'
            } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border transition-all ${
              selected
                ? 'bg-[#2563eb] border-[#2563eb] text-white'
                : 'border-[#cbd5e1] text-[#64748b] bg-[#f8fafc] group-hover:border-[#94a3b8]'
            }`}>
              {label}
            </span>
            <span className="text-sm font-medium leading-snug">{opt}</span>
            {selected && (
              <svg className="w-4 h-4 text-[#2563eb] ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Short Answer ─────────────────────────────────────────────────────────────

function ShortAnswer({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      placeholder="Type your answer here..."
      className="w-full mt-4 bg-white border border-[#e2e8f0] text-[#1a2654] placeholder-[#94a3b8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15 transition-all shadow-xs"
    />
  );
}

// ─── Long Answer ─────────────────────────────────────────────────────────────

function LongAnswer({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: 'Write your answer here...' }),
    ],
    content: value || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'essay-prose focus:outline-none min-h-[160px] p-4 text-[#1a2654] text-sm leading-relaxed bg-white',
      },
    },
  });

  useEffect(() => {
    if (editor && value && !editor.isFocused && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div className="mt-4 border border-[#e2e8f0] rounded-xl overflow-hidden bg-white focus-within:border-[#2563eb] focus-within:ring-2 focus-within:ring-[#2563eb]/15 transition-all shadow-xs">
      {!readOnly && <EditorToolbar editor={editor} compact />}
      <EditorContent editor={editor} />
      <style>{`
        .essay-prose p { margin-bottom: 0.5em; }
        .essay-prose h1, .essay-prose h2, .essay-prose h3 { font-weight: 700; color: #1a3a6b; margin-bottom: 0.3em; }
        .essay-prose ul { list-style: disc; padding-left: 1.2rem; margin-bottom: 0.5em; }
        .essay-prose ol { list-style: decimal; padding-left: 1.2rem; margin-bottom: 0.5em; }
        .essay-prose strong { font-weight: 700; color: #1a2654; }
        .essay-prose em { font-style: italic; }
        .essay-prose u { text-decoration: underline; }
        .essay-prose p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #94a3b8;
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Multiple Choice',
  short_answer: 'Short Answer',
  long_answer: 'Essay',
};

export function QuestionAnswer({ question, index, value, onChange, readOnly = false }: QuestionAnswerProps) {
  const handleChange = (v: string) => onChange(question.id, v);

  return (
    <div
      id={`question-${question.id}`}
      className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-xs scroll-mt-4 mb-4"
    >
      {/* Question header */}
      <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-6 py-4 flex justify-between items-start gap-4">
        <div className="flex items-start gap-3">
          <span className="w-7 h-7 rounded-full bg-[#2563eb] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
            {index + 1}
          </span>
          <p className="text-[#1a3a6b] text-sm leading-relaxed font-semibold">{question.prompt}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb] bg-[#2563eb]/10 px-2 py-0.5 rounded-full">
            {TYPE_LABELS[question.type] ?? question.type}
          </span>
          <span className="text-[11px] text-[#64748b] font-semibold">
            {question.marks} mark{question.marks !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Answer area */}
      <div className="px-6 pb-6">
        {question.type === 'multiple_choice' && (
          <MCQAnswer question={question} value={value} onChange={handleChange} readOnly={readOnly} />
        )}
        {question.type === 'short_answer' && (
          <ShortAnswer value={value} onChange={handleChange} readOnly={readOnly} />
        )}
        {question.type === 'long_answer' && (
          <LongAnswer value={value} onChange={handleChange} readOnly={readOnly} />
        )}
      </div>
    </div>
  );
}
