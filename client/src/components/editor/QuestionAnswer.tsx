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
    <div className="space-y-2 mt-4">
      {options.map((opt, i) => {
        const label = String.fromCharCode(65 + i); // A, B, C, D
        const selected = value === opt;
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange(opt)}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 flex items-center gap-3 group ${
              selected
                ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)] text-white shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.2)]'
                : 'bg-[var(--color-primary)]/50 border-white/10 text-gray-300 hover:border-white/30 hover:bg-[var(--color-primary)]'
            } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 border transition-all ${
              selected
                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-white/20 text-gray-400 group-hover:border-white/40'
            }`}>
              {label}
            </span>
            <span className="text-sm leading-snug">{opt}</span>
            {selected && (
              <svg className="w-4 h-4 text-[var(--color-primary)] ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
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
      className="w-full mt-4 bg-[var(--color-primary)]/50 border border-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]/50 focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all"
    />
  );
}

// ─── Long Answer (TipTap mini) ────────────────────────────────────────────────

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
        class: 'essay-prose focus:outline-none min-h-[180px] p-4 text-gray-200 text-sm leading-relaxed',
      },
    },
  });

  useEffect(() => {
    if (editor && value && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [value]);

  return (
    <div className="mt-4 border border-white/10 rounded-xl overflow-hidden bg-[var(--color-primary)]/50 focus-within:border-[var(--color-primary)]/40 focus-within:ring-1 focus-within:ring-[var(--color-primary)]/20 transition-all">
      {!readOnly && <EditorToolbar editor={editor} compact />}
      <EditorContent editor={editor} />
      <style>{`
        .essay-prose p { margin-bottom: 0.5em; }
        .essay-prose h1, .essay-prose h2, .essay-prose h3 { font-weight: 700; margin-bottom: 0.3em; }
        .essay-prose ul { list-style: disc; padding-left: 1.2rem; margin-bottom: 0.5em; }
        .essay-prose ol { list-style: decimal; padding-left: 1.2rem; margin-bottom: 0.5em; }
        .essay-prose strong { font-weight: 700; color: white; }
        .essay-prose em { font-style: italic; }
        .essay-prose u { text-decoration: underline; }
        .essay-prose p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #6b7280;
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
      className="bg-[var(--color-primary)] border border-white/5 rounded-2xl overflow-hidden shadow-lg scroll-mt-4"
    >
      {/* Question header */}
      <div className="bg-[var(--color-primary)]/70 border-b border-white/5 px-6 py-4 flex justify-between items-start gap-4">
        <div className="flex items-start gap-3">
          <span className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white text-sm font-black flex items-center justify-center shrink-0 mt-0.5">
            {index + 1}
          </span>
          <p className="text-white text-sm leading-relaxed font-medium">{question.prompt}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)] bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 px-2 py-0.5 rounded">
            {TYPE_LABELS[question.type] ?? question.type}
          </span>
          <span className="text-[10px] text-gray-400 font-bold">
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


