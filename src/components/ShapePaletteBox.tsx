import React, { useMemo, useState } from 'react';
import { Search, X, GripVertical } from 'lucide-react';
import {
  SHAPE_CATEGORIES,
  SHAPE_TEMPLATES_100,
  type ShapeCategory,
  type ShapeTemplate,
} from '../utils/shapeLibrary100';

interface ShapePaletteBoxProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTemplate: (tpl: ShapeTemplate) => void;
}

const ShapeThumbnail: React.FC<{ tpl: ShapeTemplate }> = ({ tpl }) => {
  return (
    <svg viewBox="0 0 100 100" className="w-11 h-11 overflow-visible">
      {tpl.lines.map((ln, idx) => (
        <line
          key={`l-${idx}`}
          x1={ln.x1 * 100}
          y1={ln.y1 * 100}
          x2={ln.x2 * 100}
          y2={ln.y2 * 100}
          stroke={ln.accent ? '#4f46e5' : 'currentColor'}
          strokeWidth={ln.accent ? 2 : 2.2}
          strokeLinecap="round"
          strokeDasharray={ln.dashed ? '4 3' : undefined}
        />
      ))}
      {tpl.circles?.map((c, idx) => (
        <ellipse
          key={`c-${idx}`}
          cx={c.cx * 100}
          cy={c.cy * 100}
          rx={(c.rx ?? c.r) * 100}
          ry={(c.ry ?? c.r) * 100}
          fill="none"
          stroke={c.accent ? '#4f46e5' : 'currentColor'}
          strokeWidth={2}
          strokeDasharray={c.dashed ? '4 3' : undefined}
        />
      ))}
      {tpl.arcs?.map((a, idx) => {
        const rx = (a.rx ?? a.r) * 100;
        const ry = (a.ry ?? a.r) * 100;
        const x1 = a.cx * 100 + Math.cos(a.startAngle) * rx;
        const y1 = a.cy * 100 + Math.sin(a.startAngle) * ry;
        const x2 = a.cx * 100 + Math.cos(a.endAngle) * rx;
        const y2 = a.cy * 100 + Math.sin(a.endAngle) * ry;
        const diff = a.endAngle - a.startAngle;
        const largeArc = Math.abs(diff) > Math.PI ? 1 : 0;
        const sweep = diff >= 0 ? 1 : 0;
        return (
          <path
            key={`a-${idx}`}
            d={`M ${x1} ${y1} A ${rx} ${ry} 0 ${largeArc} ${sweep} ${x2} ${y2}`}
            fill="none"
            stroke={a.accent ? '#4f46e5' : 'currentColor'}
            strokeWidth={2}
            strokeDasharray={a.dashed ? '4 3' : undefined}
          />
        );
      })}
      {tpl.curves?.map((cv, idx) => {
        if (cv.pts.length < 2) return null;
        const d = cv.pts
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p[0] * 100).toFixed(1)} ${(p[1] * 100).toFixed(1)}`)
          .join(' ');
        return (
          <path
            key={`cv-${idx}`}
            d={d}
            fill="none"
            stroke={cv.accent ? '#4f46e5' : 'currentColor'}
            strokeWidth={2}
            strokeDasharray={cv.dashed ? '4 3' : undefined}
          />
        );
      })}
      {tpl.dots?.map((d, idx) => (
        <circle
          key={`d-${idx}`}
          cx={d.x * 100}
          cy={d.y * 100}
          r={2.4}
          fill="#4f46e5"
        />
      ))}
    </svg>
  );
};

export const ShapePaletteBox: React.FC<ShapePaletteBoxProps> = ({
  isOpen,
  onClose,
  onInsertTemplate,
}) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ShapeCategory>('Tất cả');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SHAPE_TEMPLATES_100.filter((tpl) => {
      if (category !== 'Tất cả' && tpl.category !== category) return false;
      if (!q) return true;
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.category.toLowerCase().includes(q)
      );
    });
  }, [search, category]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-3 right-3 z-30 w-80 max-w-[calc(100%-1.5rem)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-xl flex flex-col max-h-[76vh] select-none overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
            Kho mẫu hình ({SHAPE_TEMPLATES_100.length})
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
            · Kéo thả vào giấy
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Đóng hộp mẫu hình"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-2.5 space-y-2 border-b border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm: chóp, tam giác, nón, đồ thị..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 pl-8 pr-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {SHAPE_CATEGORIES.map((cat) => {
            const active = category === cat;
            const short =
              cat === 'Cơ bản & Góc'
                ? 'Cơ bản'
                : cat === 'Tứ giác & Đa giác'
                  ? 'Tứ giác'
                  : cat === 'Đường tròn & Đồ thị'
                    ? 'Tròn & Đồ thị'
                    : cat === 'Hình chóp & Tứ diện'
                      ? 'Hình chóp'
                      : cat === 'Lăng trụ & Tròn xoay'
                        ? 'Lăng trụ & Khối'
                        : cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {short}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Không có mẫu hình phù hợp.
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {filtered.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-hinhhoc-shape', tpl.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => onInsertTemplate(tpl)}
                title={`${tpl.name} (Kéo thả vào trang hoặc chạm để chèn)`}
                className="group flex flex-col items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-1.5 text-slate-700 dark:text-slate-200 hover:border-indigo-400 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50 transition-colors cursor-grab active:cursor-grabbing"
              >
                <ShapeThumbnail tpl={tpl} />
                <span className="mt-1 w-full truncate text-center text-[10px] text-slate-600 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                  {tpl.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
