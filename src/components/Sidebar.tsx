import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  FilePlus2,
  FolderPlus,
  Search,
  Trash2,
  X,
  FileText,
  ChevronRight,
} from 'lucide-react';
import type { Notebook } from '../types/note';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  notebooks: Notebook[];
  activeNotebookId: string;
  activePageId: string;
  onSelectPage: (notebookId: string, pageId: string) => void;
  onCreateNotebook: (title: string, subject: Notebook['subject']) => void;
  onDeleteNotebook: (notebookId: string) => void;
  onAddPage: (notebookId: string) => void;
  onDeletePage: (notebookId: string, pageId: string) => void;
  onRenamePage: (notebookId: string, pageId: string, title: string) => void;
}

const SUBJECTS: Array<'Tất cả' | Notebook['subject']> = [
  'Tất cả',
  'Hình học không gian',
  'Đại số & Giải tích',
  'Đề ôn tập',
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  notebooks,
  activeNotebookId,
  activePageId,
  onSelectPage,
  onCreateNotebook,
  onDeleteNotebook,
  onAddPage,
  onDeletePage,
  onRenamePage,
}) => {
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<'Tất cả' | Notebook['subject']>('Tất cả');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState<Notebook['subject']>('Hình học không gian');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notebooks.filter((nb) => {
      if (subjectFilter !== 'Tất cả' && nb.subject !== subjectFilter) return false;
      if (!q) return true;
      return (
        nb.title.toLowerCase().includes(q) ||
        nb.tags.some((t) => t.toLowerCase().includes(q)) ||
        nb.pages.some((p) => p.title.toLowerCase().includes(q))
      );
    });
  }, [notebooks, search, subjectFilter]);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateNotebook(newTitle.trim(), newSubject);
    setNewTitle('');
    setShowNewForm(false);
  };

  return (
    <aside className="w-72 shrink-0 h-full flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 select-none z-20">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Sổ tay học tập
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowNewForm((v) => !v)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Tạo sổ tay mới"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            title="Đóng danh sách"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showNewForm && (
        <form
          onSubmit={handleCreate}
          className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2.5"
        >
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Tên sổ tay (vd: Hình chóp & Lăng trụ)..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          <select
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value as Notebook['subject'])}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="Hình học không gian">Hình học không gian</option>
            <option value="Đại số & Giải tích">Đại số & Giải tích</option>
            <option value="Đề ôn tập">Đề ôn tập</option>
          </select>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="px-3 py-1 rounded-md bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Tạo sổ
            </button>
          </div>
        </form>
      )}

      <div className="p-3 space-y-2.5 border-b border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm bài học, thẻ..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {SUBJECTS.map((subj) => {
            const active = subjectFilter === subj;
            const shortLabel =
              subj === 'Hình học không gian'
                ? 'Không gian'
                : subj === 'Đại số & Giải tích'
                  ? 'Giải tích'
                  : subj;
            return (
              <button
                key={subj}
                type="button"
                onClick={() => setSubjectFilter(subj)}
                className={`px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-8 px-3 text-xs text-slate-500 dark:text-slate-400">
            Không tìm thấy sổ tay phù hợp.
          </div>
        ) : (
          filtered.map((nb) => {
            const isSelectedNb = nb.id === activeNotebookId;
            return (
              <div key={nb.id} className="space-y-1.5">
                <div className="flex items-start justify-between gap-2 group">
                  <button
                    type="button"
                    onClick={() => onSelectPage(nb.id, nb.activePageId || nb.pages[0]?.id)}
                    className="text-left flex-1 min-w-0"
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {nb.title}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="truncate">{nb.subject}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums shrink-0">{nb.pages.length} trang</span>
                    </div>
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onAddPage(nb.id)}
                      className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Thêm trang mới"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                    </button>
                    {notebooks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteNotebook(nb.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Xoá sổ tay"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1 pl-2 border-l border-slate-200 dark:border-slate-800">
                  {nb.pages.map((pg) => {
                    const isActivePage = isSelectedNb && pg.id === activePageId;
                    const isEditing = editingPageId === pg.id;

                    return (
                      <div
                        key={pg.id}
                        className={`group/pg flex items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                          isActivePage
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => {
                              if (editingTitle.trim()) {
                                onRenamePage(nb.id, pg.id, editingTitle.trim());
                              }
                              setEditingPageId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (editingTitle.trim()) {
                                  onRenamePage(nb.id, pg.id, editingTitle.trim());
                                }
                                setEditingPageId(null);
                              } else if (e.key === 'Escape') {
                                setEditingPageId(null);
                              }
                            }}
                            className="flex-1 min-w-0 rounded border border-indigo-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 text-xs focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectPage(nb.id, pg.id)}
                            onDoubleClick={() => {
                              setEditingPageId(pg.id);
                              setEditingTitle(pg.title);
                            }}
                            className="flex-1 min-w-0 flex items-center gap-1.5 text-left"
                            title="Nhấn đúp để đổi tên trang"
                          >
                            {isActivePage ? (
                              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            )}
                            <span className="truncate">{pg.title}</span>
                          </button>
                        )}

                        {nb.pages.length > 1 && !isEditing && (
                          <button
                            type="button"
                            onClick={() => onDeletePage(nb.id, pg.id)}
                            className="p-0.5 rounded text-slate-400 hover:text-rose-600 opacity-0 group-hover/pg:opacity-100 transition-opacity shrink-0"
                            title="Xoá trang"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
