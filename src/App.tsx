import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  loadNotebooks,
  saveNotebook,
  deleteNotebookFromDB,
  createDefaultNotebooks,
} from './db/storage';
import type {
  CameraState,
  CanvasElement,
  DiagramElement,
  LatexElement,
  Notebook,
  PaperStyle,
  PenStyle,
  StickyElement,
  ToolType,
} from './types/note';
import type { ShapeTemplate } from './utils/shapeLibrary100';
import { PanelTopOpen } from 'lucide-react';
import { TopToolbar } from './components/TopToolbar';
import { Sidebar } from './components/Sidebar';
import { CanvasWorkspace, type CanvasWorkspaceHandle } from './components/CanvasWorkspace';
import { Viewer3D } from './components/Viewer3D';
import { LatexModal, StickyModal } from './components/LatexModal';
import { OfflineIndicator } from './components/PWAControls';
import { ShapePaletteBox } from './components/ShapePaletteBox';

export default function App() {
  const [notebooks, setNotebooks] = useState<Notebook[]>(() => createDefaultNotebooks());
  const [activeNotebookId, setActiveNotebookId] = useState<string>('nb-blank-1');
  const [activePageId, setActivePageId] = useState<string>('page-blank-1');
  const [loaded, setLoaded] = useState(false);

  // Workspace UI state
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewer3DOpen, setViewer3DOpen] = useState(true);
  const [shapePaletteOpen, setShapePaletteOpen] = useState(true);
  const [writeOnlyMode, setWriteOnlyMode] = useState(false);

  // Active tool settings
  const [tool, setTool] = useState<ToolType>('pen');
  const [penStyle, setPenStyle] = useState<PenStyle>('fountain');
  const [strokeColor, setStrokeColor] = useState<string>('#1e293b');
  const [strokeSize, setStrokeSize] = useState<number>(4);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [palmRejection, setPalmRejection] = useState<boolean>(false);
  const [showRuler, setShowRuler] = useState<boolean>(false);
  const [showProtractor, setShowProtractor] = useState<boolean>(false);

  // Undo / Redo history per active page session
  const [undoStack, setUndoStack] = useState<CanvasElement[][]>([]);
  const [redoStack, setRedoStack] = useState<CanvasElement[][]>([]);

  // Modals for LaTeX & Sticky Note
  const [latexModalTarget, setLatexModalTarget] = useState<{
    pos: { x: number; y: number };
    existing?: LatexElement;
  } | null>(null);
  const [stickyModalPos, setStickyModalPos] = useState<{ x: number; y: number } | null>(null);

  const canvasHandleRef = useRef<CanvasWorkspaceHandle | null>(null);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDark]);

  // Load persisted notebooks from IndexedDB
  useEffect(() => {
    let alive = true;
    loadNotebooks().then((items) => {
      if (!alive) return;
      if (items.length > 0) {
        setNotebooks(items);
        setActiveNotebookId(items[0].id);
        setActivePageId(items[0].activePageId || items[0].pages[0].id);
      }
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const activeNotebook = useMemo(
    () => notebooks.find((n) => n.id === activeNotebookId) || notebooks[0],
    [notebooks, activeNotebookId]
  );

  const activePage = useMemo(
    () =>
      activeNotebook?.pages.find((p) => p.id === activePageId) || activeNotebook?.pages[0],
    [activeNotebook, activePageId]
  );

  const updateActivePage = useCallback(
    (updater: (elements: CanvasElement[]) => CanvasElement[], recordHistory = true) => {
      if (!activeNotebook || !activePage) return;
      if (recordHistory) {
        setUndoStack((prev) => [...prev.slice(-49), activePage.elements]);
        setRedoStack([]);
      }
      const nextElements = updater(activePage.elements);
      const updatedNb: Notebook = {
        ...activeNotebook,
        updatedAt: Date.now(),
        pages: activeNotebook.pages.map((p) =>
          p.id === activePage.id
            ? { ...p, elements: nextElements, updatedAt: Date.now() }
            : p
        ),
      };
      setNotebooks((prev) => prev.map((n) => (n.id === updatedNb.id ? updatedNb : n)));
      if (loaded) saveNotebook(updatedNb);
    },
    [activeNotebook, activePage, loaded]
  );

  const handleChangeElements = useCallback(
    (next: CanvasElement[], recordHistory = true) => {
      updateActivePage(() => next, recordHistory);
    },
    [updateActivePage]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || !activePage) return;
    const prevElements = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, activePage.elements]);
    updateActivePage(() => prevElements, false);
  }, [undoStack, activePage, updateActivePage]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !activePage) return;
    const nextElements = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, activePage.elements]);
    updateActivePage(() => nextElements, false);
  }, [redoStack, activePage, updateActivePage]);

  const toggleWriteOnlyMode = useCallback(() => {
    setWriteOnlyMode((prev) => {
      const next = !prev;
      if (next && tool !== 'pen' && tool !== 'eraser') {
        setTool('pen');
      }
      return next;
    });
  }, [tool]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, V, P, E, F, Esc)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Escape' && writeOnlyMode && !latexModalTarget && !stickyModalPos) {
        setWriteOnlyMode(false);
      } else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleWriteOnlyMode();
      } else if (e.key.toLowerCase() === 'v') {
        setTool('select');
      } else if (e.key.toLowerCase() === 'p') {
        setTool('pen');
      } else if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        setTool('smartDraw');
      } else if (e.key.toLowerCase() === 'e') {
        setTool('eraser');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo, writeOnlyMode, latexModalTarget, stickyModalPos, toggleWriteOnlyMode]);

  const handleChangeCamera = useCallback(
    (nextCam: CameraState) => {
      if (!activeNotebook || !activePage) return;
      const updatedNb: Notebook = {
        ...activeNotebook,
        pages: activeNotebook.pages.map((p) =>
          p.id === activePage.id ? { ...p, camera: nextCam } : p
        ),
      };
      setNotebooks((prev) => prev.map((n) => (n.id === updatedNb.id ? updatedNb : n)));
    },
    [activeNotebook, activePage]
  );

  const handleSelectPaper = (paperStyle: PaperStyle) => {
    if (!activeNotebook || !activePage) return;
    const updatedNb: Notebook = {
      ...activeNotebook,
      updatedAt: Date.now(),
      pages: activeNotebook.pages.map((p) =>
        p.id === activePage.id ? { ...p, paperStyle, updatedAt: Date.now() } : p
      ),
    };
    setNotebooks((prev) => prev.map((n) => (n.id === updatedNb.id ? updatedNb : n)));
    saveNotebook(updatedNb);
  };

  const handleSelectPage = (nbId: string, pageId: string) => {
    setActiveNotebookId(nbId);
    setActivePageId(pageId);
    setUndoStack([]);
    setRedoStack([]);
    setNotebooks((prev) =>
      prev.map((nb) => (nb.id === nbId ? { ...nb, activePageId: pageId } : nb))
    );
  };

  const handleCreateNotebook = (title: string, subject: Notebook['subject']) => {
    const now = Date.now();
    const pageId = `pg-${now}`;
    const newNb: Notebook = {
      id: `nb-${now}`,
      title,
      subject,
      tags: ['Mới'],
      activePageId: pageId,
      createdAt: now,
      updatedAt: now,
      pages: [
        {
          id: pageId,
          title: 'Trang 1',
          paperStyle: 'grid',
          elements: [],
          camera: { x: 0, y: 0, zoom: 1 },
          updatedAt: now,
        },
      ],
    };
    setNotebooks((prev) => [newNb, ...prev]);
    setActiveNotebookId(newNb.id);
    setActivePageId(pageId);
    setUndoStack([]);
    setRedoStack([]);
    saveNotebook(newNb);
  };

  const handleDeleteNotebook = (nbId: string) => {
    if (notebooks.length <= 1) return;
    const remaining = notebooks.filter((n) => n.id !== nbId);
    setNotebooks(remaining);
    deleteNotebookFromDB(nbId);
    if (activeNotebookId === nbId && remaining[0]) {
      setActiveNotebookId(remaining[0].id);
      setActivePageId(remaining[0].activePageId || remaining[0].pages[0].id);
    }
  };

  const handleAddPage = (nbId: string) => {
    const target = notebooks.find((n) => n.id === nbId);
    if (!target) return;
    const now = Date.now();
    const newPage = {
      id: `pg-${now}`,
      title: `Trang ${target.pages.length + 1}`,
      paperStyle: activePage?.paperStyle || 'grid',
      elements: [],
      camera: { x: 0, y: 0, zoom: 1 },
      updatedAt: now,
    };
    const updatedNb: Notebook = {
      ...target,
      activePageId: newPage.id,
      updatedAt: now,
      pages: [...target.pages, newPage],
    };
    setNotebooks((prev) => prev.map((n) => (n.id === nbId ? updatedNb : n)));
    setActiveNotebookId(nbId);
    setActivePageId(newPage.id);
    setUndoStack([]);
    setRedoStack([]);
    saveNotebook(updatedNb);
  };

  const handleDeletePage = (nbId: string, pageId: string) => {
    const target = notebooks.find((n) => n.id === nbId);
    if (!target || target.pages.length <= 1) return;
    const nextPages = target.pages.filter((p) => p.id !== pageId);
    const nextActive = target.activePageId === pageId ? nextPages[0].id : target.activePageId;
    const updatedNb: Notebook = {
      ...target,
      pages: nextPages,
      activePageId: nextActive,
      updatedAt: Date.now(),
    };
    setNotebooks((prev) => prev.map((n) => (n.id === nbId ? updatedNb : n)));
    if (activePageId === pageId) {
      setActivePageId(nextActive);
    }
    saveNotebook(updatedNb);
  };

  const handleRenamePage = (nbId: string, pageId: string, title: string) => {
    const target = notebooks.find((n) => n.id === nbId);
    if (!target) return;
    const updatedNb: Notebook = {
      ...target,
      pages: target.pages.map((p) => (p.id === pageId ? { ...p, title } : p)),
    };
    setNotebooks((prev) => prev.map((n) => (n.id === nbId ? updatedNb : n)));
    saveNotebook(updatedNb);
  };

  const handleInsert3DSnapshot = (dataUrl: string, caption: string) => {
    if (!activePage) return;
    const cam = activePage.camera;
    const worldX = (140 - cam.x) / cam.zoom;
    const worldY = (110 - cam.y) / cam.zoom;
    const imgEl: CanvasElement = {
      id: `img-${Date.now()}`,
      type: 'image',
      x: worldX,
      y: worldY,
      width: 320,
      height: 240,
      src: dataUrl,
      caption,
    };
    updateActivePage((els) => [...els, imgEl], true);
    setTool('select');
  };

  const handleInsertShapeTemplate = useCallback(
    (tpl: ShapeTemplate) => {
      if (!activePage) return;
      const cam = activePage.camera;
      const count = activePage.elements.filter((el) => el.type === 'diagram').length;
      const offset = (count % 5) * 28;
      const w = tpl.defaultWidth ?? 210;
      const h = tpl.defaultHeight ?? 175;
      const worldX = (140 + offset - cam.x) / cam.zoom;
      const worldY = (110 + offset - cam.y) / cam.zoom;
      const dg: DiagramElement = {
        id: `dg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'diagram',
        templateId: tpl.id,
        name: tpl.name,
        x: worldX,
        y: worldY,
        width: w,
        height: h,
        color: strokeColor,
        strokeWidth: Math.max(2, strokeSize * 0.65),
        lines: tpl.lines,
        circles: tpl.circles,
        arcs: tpl.arcs,
        dots: tpl.dots,
        curves: tpl.curves,
      };
      updateActivePage((els) => [...els, dg], true);
      setTool('select');
    },
    [activePage, strokeColor, strokeSize, updateActivePage]
  );

  return (
    <div className="relative h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {!writeOnlyMode && (
        <TopToolbar
          notebookTitle={activeNotebook?.title || 'Sổ tay'}
          pageTitle={activePage?.title || 'Trang 1'}
          isDark={isDark}
          onToggleDark={() => setIsDark((v) => !v)}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          viewer3DOpen={viewer3DOpen}
          onToggleViewer3D={() => setViewer3DOpen((v) => !v)}
          shapePaletteOpen={shapePaletteOpen}
          onToggleShapePalette={() => setShapePaletteOpen((v) => !v)}
          writeOnlyMode={writeOnlyMode}
          onToggleWriteOnlyMode={toggleWriteOnlyMode}
          tool={tool}
          onSelectTool={setTool}
          penStyle={penStyle}
          onSelectPenStyle={setPenStyle}
          strokeColor={strokeColor}
          onSelectColor={setStrokeColor}
          strokeSize={strokeSize}
          onSelectSize={setStrokeSize}
          paperStyle={activePage?.paperStyle || 'grid'}
          onSelectPaper={handleSelectPaper}
          snapEnabled={snapEnabled}
          onToggleSnap={() => setSnapEnabled((v) => !v)}
          palmRejection={palmRejection}
          onTogglePalmRejection={() => setPalmRejection((v) => !v)}
          showRuler={showRuler}
          onToggleRuler={() => setShowRuler((v) => !v)}
          showProtractor={showProtractor}
          onToggleProtractor={() => setShowProtractor((v) => !v)}
          onExportPNG={() => canvasHandleRef.current?.exportPNG()}
          onExportSVG={() => canvasHandleRef.current?.exportSVG()}
          onExportPDF={() => canvasHandleRef.current?.exportPDF()}
        />
      )}

      {writeOnlyMode && (
        <button
          type="button"
          onClick={() => setWriteOnlyMode(false)}
          className="fixed top-2.5 right-3 z-40 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 text-xs font-medium text-slate-700 dark:text-slate-200 opacity-65 hover:opacity-100 shadow-sm transition-opacity whitespace-nowrap shrink-0"
          title="Hiện lại thanh công cụ (Esc hoặc F)"
        >
          <PanelTopOpen className="w-3.5 h-3.5" />
          Hiện thanh công cụ
        </button>
      )}

      <main className="flex-1 min-h-0 flex overflow-hidden">
        {!writeOnlyMode && (
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            notebooks={notebooks}
            activeNotebookId={activeNotebook?.id || ''}
            activePageId={activePage?.id || ''}
            onSelectPage={handleSelectPage}
            onCreateNotebook={handleCreateNotebook}
            onDeleteNotebook={handleDeleteNotebook}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
            onRenamePage={handleRenamePage}
          />
        )}

        {/* 2D Infinite Math Canvas */}
        <div className="relative flex-1 min-w-0 h-full flex">
          {activePage && (
            <CanvasWorkspace
              pageId={activePage.id}
              paperStyle={activePage.paperStyle}
              elements={activePage.elements}
              camera={activePage.camera}
              isDark={isDark}
              tool={tool}
              penStyle={penStyle}
              strokeColor={strokeColor}
              strokeSize={strokeSize}
              snapEnabled={snapEnabled}
              palmRejection={palmRejection}
              showRuler={showRuler}
              showProtractor={showProtractor}
              writeOnlyMode={writeOnlyMode}
              canUndo={undoStack.length > 0}
              canRedo={redoStack.length > 0}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onChangeElements={handleChangeElements}
              onChangeCamera={handleChangeCamera}
              onOpenLatexModal={(pos, existing) => setLatexModalTarget({ pos, existing })}
              onOpenStickyModal={(pos) => setStickyModalPos(pos)}
              workspaceRef={canvasHandleRef}
            />
          )}
          <ShapePaletteBox
            isOpen={!writeOnlyMode && shapePaletteOpen}
            onClose={() => setShapePaletteOpen(false)}
            onInsertTemplate={handleInsertShapeTemplate}
          />
        </div>

        {/* Interactive 3D Geometry Studio Split Panel */}
        {!writeOnlyMode && viewer3DOpen && (
          <div className="w-[380px] lg:w-[440px] shrink-0 h-full">
            <Viewer3D isDark={isDark} onCaptureSnapshot={handleInsert3DSnapshot} />
          </div>
        )}
      </main>

      {latexModalTarget && (
        <LatexModal
          initialLatex={latexModalTarget.existing?.latex}
          onClose={() => setLatexModalTarget(null)}
          onSubmit={(latex) => {
            if (latexModalTarget.existing) {
              const targetId = latexModalTarget.existing.id;
              updateActivePage(
                (els) =>
                  els.map((el) =>
                    el.id === targetId && el.type === 'latex' ? { ...el, latex } : el
                  ),
                true
              );
            } else {
              const newLatex: LatexElement = {
                id: `ltx-${Date.now()}`,
                type: 'latex',
                x: latexModalTarget.pos.x,
                y: latexModalTarget.pos.y,
                latex,
                fontSize: 20,
                color: strokeColor,
              };
              updateActivePage((els) => [...els, newLatex], true);
            }
            setLatexModalTarget(null);
            setTool('select');
          }}
        />
      )}

      {stickyModalPos && (
        <StickyModal
          onClose={() => setStickyModalPos(null)}
          onSubmit={({ title, body, variant }) => {
            const newSticky: StickyElement = {
              id: `stk-note-${Date.now()}`,
              type: 'sticky',
              x: stickyModalPos.x,
              y: stickyModalPos.y,
              width: 300,
              title,
              body,
              variant,
            };
            updateActivePage((els) => [...els, newSticky], true);
            setStickyModalPos(null);
            setTool('select');
          }}
        />
      )}

      <OfflineIndicator />
    </div>
  );
}
