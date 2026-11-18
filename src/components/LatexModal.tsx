import React, { useMemo, useState } from 'react';
import katex from 'katex';
import { X, Check, StickyNote } from 'lucide-react';
import type { StickyElement } from '../types/note';

interface LatexModalProps {
  initialLatex?: string;
  onClose: () => void;
  onSubmit: (latex: string) => void;
}

const MATH_SNIPPETS = [
  { label: 'a/b', insert: '\\frac{a}{b}' },
  { label: '√x', insert: '\\sqrt{x}' },
  { label: 'xⁿ', insert: 'x^{2}' },
  { label: 'xᵢ', insert: 'S_{ABC}' },
  { label: '⃗AB', insert: '\\vec{AB}' },
  { label: '∠ABC', insert: '\\widehat{ABC}' },
  { label: '△', insert: '\\triangle ABC' },
  { label: '⊥', insert: '\\perp' },
  { label: '∥', insert: '\\parallel' },
  { label: '∩', insert: '\\cap' },
  { label: '∪', insert: '\\cup' },
  { label: '∈', insert: '\\in' },
  { label: '⊂', insert: '\\subset' },
  { label: '⇒', insert: '\\Rightarrow' },
  { label: '⇔', insert: '\\Leftrightarrow' },
  { label: 'α', insert: '\\alpha' },
  { label: 'β', insert: '\\beta' },
  { label: 'φ', insert: '\\varphi' },
  { label: 'π', insert: '\\pi' },
  { label: '∫', insert: '\\int_{a}^{b} f(x)\\,dx' },
  { label: 'lim', insert: '\\lim_{x \\to 0}' },
  { label: 'V chóp', insert: 'V = \\frac{1}{3} S_{\\text{đáy}} \\cdot h' },
];

export const LatexModal: React.FC<LatexModalProps> = ({
  initialLatex = 'd(A,(SBC)) = \\frac{3V_{S.ABC}}{S_{\\triangle SBC}}',
  onClose,
  onSubmit,
}) => {
  const [latex, setLatex] = useState(initialLatex);

  const renderedHtml = useMemo(() => {
    try {
      return katex.renderToString(latex || '\\text{Nhập công thức...}', {
        throwOnError: false,
        displayMode: true,
      });
    } catch {
      return '<span class="text-rose-500">Lỗi cú pháp LaTeX</span>';
    }
  }, [latex]);

  const insertSnippet = (snippet: string) => {
    setLatex((prev) => (prev ? `${prev} ${snippet}` : snippet));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Soạn công thức Toán (LaTeX)
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div
            className="min-h-20 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />

          <div>
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              Bàn phím Toán học nhanh
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MATH_SNIPPETS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => insertSnippet(s.insert)}
                  className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Mã LaTeX
            </label>
            <textarea
              rows={3}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder="Ví dụ: (P) \cap (Q) = d \parallel AB"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={() => {
              if (latex.trim()) onSubmit(latex.trim());
            }}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Chèn vào trang
          </button>
        </div>
      </div>
    </div>
  );
};

interface StickyModalProps {
  onClose: () => void;
  onSubmit: (data: { title: string; body: string; variant: StickyElement['variant'] }) => void;
}

export const StickyModal: React.FC<StickyModalProps> = ({ onClose, onSubmit }) => {
  const [title, setTitle] = useState('Định lý / Bước giải');
  const [body, setBody] = useState('');
  const [variant, setVariant] = useState<StickyElement['variant']>('theorem');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Thêm thẻ ghi chú / Định lý
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5">
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {(
              [
                { id: 'theorem', label: 'Định lý' },
                { id: 'step', label: 'Bước giải' },
                { id: 'note', label: 'Lưu ý' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setVariant(opt.id)}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  variant === opt.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề thẻ..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Nội dung chứng minh, điều kiện hoặc chú ý..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={() => {
              if (body.trim() || title.trim()) {
                onSubmit({ title: title.trim() || 'Ghi chú', body: body.trim(), variant });
              }
            }}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-700"
          >
            Thêm thẻ
          </button>
        </div>
      </div>
    </div>
  );
};
