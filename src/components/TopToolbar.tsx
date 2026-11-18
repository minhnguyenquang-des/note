import React, { useState } from 'react';
import {
  Box,
  Circle,
  Compass,
  Download,
  Eraser,
  Hand,
  Highlighter,
  LayoutGrid,
  Magnet,
  Minus,
  Moon,
  MousePointer2,
  PanelLeft,
  PenLine,
  PenTool,
  Pointer,
  Ruler,
  Shapes,
  Sigma,
  Square,
  StickyNote,
  Sun,
  Triangle,
  Type,
  HandMetal,
} from 'lucide-react';
import type { PaperStyle, PenStyle, ToolType } from '../types/note';
import { PWAInstallButton } from './PWAControls';

interface TopToolbarProps {
  notebookTitle: string;
  pageTitle: string;
  isDark: boolean;
  onToggleDark: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  viewer3DOpen: boolean;
  onToggleViewer3D: () => void;
  shapePaletteOpen: boolean;
  onToggleShapePalette: () => void;
  writeOnlyMode: boolean;
  onToggleWriteOnlyMode: () => void;
  tool: ToolType;
  onSelectTool: (t: ToolType) => void;
  penStyle: PenStyle;
  onSelectPenStyle: (p: PenStyle) => void;
  strokeColor: string;
  onSelectColor: (c: string) => void;
  strokeSize: number;
  onSelectSize: (s: number) => void;
  paperStyle: PaperStyle;
  onSelectPaper: (p: PaperStyle) => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  palmRejection: boolean;
  onTogglePalmRejection: () => void;
  showRuler: boolean;
  onToggleRuler: () => void;
  showProtractor: boolean;
  onToggleProtractor: () => void;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onExportPDF: () => void;
}

const COLORS = [
  { hex: '#1e293b', name: 'Mực đen' },
  { hex: '#4f46e5', name: 'Indigo' },
  { hex: '#2563eb', name: 'Xanh dương' },
  { hex: '#dc2626', name: 'Đỏ' },
  { hex: '#059669', name: 'Xanh lá' },
  { hex: '#d97706', name: 'Vàng cam' },
];

const PAPER_OPTIONS: { id: PaperStyle; label: string }[] = [
  { id: 'grid', label: 'Ô ly vuông' },
  { id: 'dot', label: 'Chấm bi' },
  { id: 'ruled', label: 'Kẻ ngang' },
  { id: 'plain', label: 'Giấy trắng' },
  { id: 'cream', label: 'Giấy vàng nhạt' },
  { id: 'chalkboard', label: 'Bảng đen' },
];

export const TopToolbar: React.FC<TopToolbarProps> = ({
  notebookTitle,
  pageTitle,
  isDark,
  onToggleDark,
  sidebarOpen,
  onToggleSidebar,
  viewer3DOpen,
  onToggleViewer3D,
  shapePaletteOpen,
  onToggleShapePalette,
  writeOnlyMode,
  onToggleWriteOnlyMode,
  tool,
  onSelectTool,
  penStyle,
  onSelectPenStyle,
  strokeColor,
  onSelectColor,
  strokeSize,
  onSelectSize,
  paperStyle,
  onSelectPaper,
  snapEnabled,
  onToggleSnap,
  palmRejection,
  onTogglePalmRejection,
  showRuler,
  onToggleRuler,
  showProtractor,
  onToggleProtractor,
  onExportPNG,
  onExportSVG,
  onExportPDF,
}) => {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  return (
    <header className="z-30 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 select-none">
      {/* Row 1: Primary App Header */}
      <div className="flex items-center justify-between gap-4 px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
              sidebarOpen
                ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Ẩn/hiện danh sách sổ tay"
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <span className="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
            HìnhHọcNote
          </span>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
            <span aria-hidden="true">/</span>
            <span className="truncate max-w-44">{notebookTitle}</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-52">
              {pageTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton />

          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất file
            </button>
            {exportMenuOpen && (
              <div
                onMouseLeave={() => setExportMenuOpen(false)}
                className="absolute right-0 mt-1.5 w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1 z-50"
              >
                <button
                  type="button"
                  onClick={() => {
                    setExportMenuOpen(false);
                    onExportPNG();
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Xuất ảnh PNG (HD)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExportMenuOpen(false);
                    onExportPDF();
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Xuất tài liệu PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExportMenuOpen(false);
                    onExportSVG();
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Xuất Vector SVG
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleDark}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDark ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onToggleWriteOnlyMode}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              writeOnlyMode
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Chế độ chỉ viết: Ẩn toàn bộ thanh công cụ, chỉ giữ trang giấy (F)"
          >
            <PenLine className="w-3.5 h-3.5" />
            Chỉ viết
          </button>

          <button
            type="button"
            onClick={onToggleViewer3D}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              viewer3DOpen
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            {viewer3DOpen ? 'Ẩn không gian 3D' : 'Mở không gian 3D'}
          </button>
        </div>
      </div>

      {/* Row 2: Drawing, Geometry 2D, Formula & Paper Toolbar */}
      <div className="flex items-center gap-2 px-3.5 py-1.5 overflow-x-auto">
        {/* Pointer & Pan */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => onSelectTool('select')}
            className={`p-1.5 rounded-md transition-colors ${
              tool === 'select'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
            title="Chọn & Di chuyển (V)"
          >
            <MousePointer2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onSelectTool('pan')}
            className={`p-1.5 rounded-md transition-colors ${
              tool === 'pan'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
            title="Kéo trang giấy (Space)"
          >
            <Hand className="w-4 h-4" />
          </button>
        </div>

        {/* Pure Writing vs Shape Normalization + Highlighter + Eraser + Laser */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => {
              onSelectTool('pen');
              if (penStyle === 'highlighter') onSelectPenStyle('fountain');
            }}
            className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              tool === 'pen' && penStyle !== 'highlighter'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Chế độ viết đơn thuần: Viết chữ & công thức mượt, không tự biến thành hình (P)"
          >
            <PenTool className="w-3.5 h-3.5" />
            Viết tay
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectTool('smartDraw');
              if (penStyle === 'highlighter') onSelectPenStyle('fountain');
            }}
            className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              tool === 'smartDraw'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Chế độ chuẩn hoá hình: Vẽ tay tự nhận diện thành đoạn thẳng, tròn, tam giác, chữ nhật (S)"
          >
            <Shapes className="w-3.5 h-3.5" />
            Chuẩn hoá hình
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectTool('pen');
              onSelectPenStyle('highlighter');
            }}
            className={`p-1.5 rounded-md transition-colors ${
              tool === 'pen' && penStyle === 'highlighter'
                ? 'bg-white dark:bg-slate-900 text-amber-500 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Bút nhớ dòng (Highlighter)"
          >
            <Highlighter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onSelectTool('eraser')}
            className={`p-1.5 rounded-md transition-colors ${
              tool === 'eraser'
                ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Tẩy theo nét (E)"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onSelectTool('laser')}
            className={`p-1.5 rounded-md transition-colors ${
              tool === 'laser'
                ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Đèn laser giảng bài"
          >
            <Pointer className="w-4 h-4" />
          </button>
        </div>

        {/* Pen style selector when pen or smartDraw is active */}
        {(tool === 'pen' || tool === 'smartDraw') && (
          <select
            value={penStyle}
            onChange={(e) => onSelectPenStyle(e.target.value as PenStyle)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 shrink-0 focus:outline-none"
            title="Loại ngòi bút"
          >
            <option value="fountain">Bút mực (Thanh đậm)</option>
            <option value="calligraphy">Bút máy (Nét sắc)</option>
            <option value="ballpoint">Bút bi</option>
            <option value="pencil">Bút chì</option>
            <option value="dashed">Nét đứt tự do</option>
            <option value="highlighter">Bút nhớ dòng</option>
          </select>
        )}

        {/* 2D Geometry Tools */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => onSelectTool('line')}
            className={`p-1.5 rounded-md transition-colors ${
              tool === 'line'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Đoạn thẳng nét liền"
          >
            <Minus className="w-4 h-4 -rotate-45" />
          </button>
          <button
            type="button"
            onClick={() => onSelectTool('dashed')}
            className={`px-2 py-1.5 rounded-md text-xs font-mono font-bold transition-colors ${
              tool === 'dashed'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Đoạn thẳng nét đứt (cạnh khuất)"
          >
            ---
          </button>
          <button
            type="button"
            onClick={() => onSelectTool('triangle')}
            className={`p-1.5 rounded-md transition-colors ${
              tool === 'triangle'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Tam giác"
          >
            <Triangle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onSelectTool('rect')}
            className={`p-1.5 rounded-md transition-colors ${
              tool === 'rect'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Hình chữ nhật"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onSelectTool('circle')}
            className={`p-1.5 rounded-md transition-colors ${
              tool === 'circle'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Đường tròn"
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onSelectTool('label')}
            className={`p-1.5 rounded-md transition-colors ${
              tool === 'label'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Gắn nhãn đỉnh (A, B, C...)"
          >
            <Type className="w-4 h-4" />
          </button>
        </div>

        {/* LaTeX & Sticky Note */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onSelectTool('latex')}
            className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              tool === 'latex'
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Chạm lên giấy để chèn công thức LaTeX"
          >
            <Sigma className="w-3.5 h-3.5" />
            LaTeX
          </button>
          <button
            type="button"
            onClick={() => onSelectTool('sticky')}
            className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              tool === 'sticky'
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Chạm lên giấy để thêm thẻ Định lý / Bước giải"
          >
            <StickyNote className="w-3.5 h-3.5" />
            Thẻ giải
          </button>
          <button
            type="button"
            onClick={onToggleShapePalette}
            className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              shapePaletteOpen
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Mở/đóng hộp 100 mẫu hình phẳng & không gian (kéo thả lên giấy)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Kho 100 hình
          </button>
        </div>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 shrink-0" />

        {/* Colors & Width */}
        <div className="flex items-center gap-1 shrink-0">
          {COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => onSelectColor(c.hex)}
              style={{ backgroundColor: c.hex }}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${
                strokeColor === c.hex
                  ? 'border-indigo-500 scale-110 ring-2 ring-indigo-500/30'
                  : 'border-white dark:border-slate-800'
              }`}
              title={c.name}
            />
          ))}
          <input
            type="range"
            min={2}
            max={14}
            value={strokeSize}
            onChange={(e) => onSelectSize(Number(e.target.value))}
            className="w-16 ml-1 accent-indigo-600"
            title={`Độ dày nét: ${strokeSize}px`}
          />
        </div>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 shrink-0" />

        {/* Smart Aids: Snap, Ruler, Protractor, Palm Rejection */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleSnap}
            className={`p-1.5 rounded-lg border transition-colors ${
              snapEnabled
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-500'
            }`}
            title="Bắt điểm đỉnh, trung điểm & lưới"
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleRuler}
            className={`p-1.5 rounded-lg border transition-colors ${
              showRuler
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-500'
            }`}
            title="Thước kẻ 2D trên giấy"
          >
            <Ruler className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleProtractor}
            className={`p-1.5 rounded-lg border transition-colors ${
              showProtractor
                ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-500'
            }`}
            title="Thước đo góc"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onTogglePalmRejection}
            className={`p-1.5 rounded-lg border transition-colors ${
              palmRejection
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-500'
            }`}
            title="Chống chạm nhầm bàn tay (chỉ nhận bút stylus/chuột)"
          >
            <HandMetal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Paper Style Selector */}
        <select
          value={paperStyle}
          onChange={(e) => onSelectPaper(e.target.value as PaperStyle)}
          className="ml-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 shrink-0 focus:outline-none"
          title="Mẫu nền giấy"
        >
          {PAPER_OPTIONS.map((p) => (
            <option key={p.id} value={p.id}>
              Giấy: {p.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
};
