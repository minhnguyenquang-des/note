import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import getStroke from 'perfect-freehand';
import katex from 'katex';
import { jsPDF } from 'jspdf';
import {
  GripHorizontal,
  RotateCw,
  Trash2,
  ZoomIn,
  ZoomOut,
  LocateFixed,
  Undo2,
  Redo2,
  Edit3,
} from 'lucide-react';
import type {
  CameraState,
  CanvasElement,
  DiagramElement,
  ImageElement,
  LatexElement,
  PaperStyle,
  PenStyle,
  ShapeElement,
  ShapeKind,
  StickyElement,
  StrokeElement,
  StrokePoint,
  ToolType,
} from '../types/note';
import { findSnapPoint, recognizeShape, snapAngle15 } from '../utils/shapeRecognition';
import { SHAPE_TEMPLATES_100 } from '../utils/shapeLibrary100';

export interface CanvasWorkspaceHandle {
  exportPNG: () => void;
  exportSVG: () => void;
  exportPDF: () => void;
  resetView: () => void;
}

interface CanvasWorkspaceProps {
  pageId: string;
  paperStyle: PaperStyle;
  elements: CanvasElement[];
  camera: CameraState;
  isDark: boolean;
  tool: ToolType;
  penStyle: PenStyle;
  strokeColor: string;
  strokeSize: number;
  snapEnabled: boolean;
  palmRejection: boolean;
  showRuler: boolean;
  showProtractor: boolean;
  writeOnlyMode?: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onChangeElements: (next: CanvasElement[], recordHistory?: boolean) => void;
  onChangeCamera: (next: CameraState) => void;
  onOpenLatexModal: (worldPos: { x: number; y: number }, existing?: LatexElement) => void;
  onOpenStickyModal: (worldPos: { x: number; y: number }) => void;
  workspaceRef?: React.RefObject<CanvasWorkspaceHandle | null>;
}

function getSvgPathFromStroke(points: number[][]): string {
  if (!points.length) return '';
  if (points.length === 1) {
    const [x, y] = points[0];
    return `M ${x} ${y} a 1 1 0 1 0 0.01 0 Z`;
  }
  const d = points.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...points[0], 'Q']
  );
  d.push('Z');
  return d.join(' ');
}

function buildStrokePath2D(s: StrokeElement, isComplete: boolean): Path2D | null {
  const pts = s.points.map((p) => [p.x, p.y, p.pressure]);
  const hasUniformPressure = s.points.every((p) => Math.abs(p.pressure - 0.5) < 0.015);
  const style = s.penStyle;

  let options: Parameters<typeof getStroke>[1];
  if (style === 'fountain') {
    options = {
      size: s.size * 1.15,
      thinning: 0.72,
      smoothing: 0.62,
      streamline: 0.42,
      easing: (t) => Math.sin((t * Math.PI) / 2),
      start: {
        taper: Math.min(16, s.size * 2.1),
        easing: (t) => t * t,
        cap: true,
      },
      end: {
        taper: isComplete ? Math.min(22, s.size * 2.6) : 0,
        easing: (t) => --t * t * t + 1,
        cap: true,
      },
      simulatePressure: hasUniformPressure,
      last: isComplete,
    };
  } else if (style === 'calligraphy') {
    options = {
      size: s.size * 1.28,
      thinning: 0.86,
      smoothing: 0.46,
      streamline: 0.34,
      easing: (t) => t,
      start: {
        taper: Math.min(18, s.size * 2.2),
        easing: (t) => t * t,
        cap: true,
      },
      end: {
        taper: isComplete ? Math.min(24, s.size * 2.8) : 0,
        easing: (t) => --t * t * t + 1,
        cap: true,
      },
      simulatePressure: hasUniformPressure,
      last: isComplete,
    };
  } else if (style === 'highlighter') {
    options = {
      size: s.size * 3.4,
      thinning: 0,
      smoothing: 0.6,
      streamline: 0.5,
      simulatePressure: false,
      last: isComplete,
    };
  } else if (style === 'pencil') {
    options = {
      size: s.size * 0.92,
      thinning: 0.42,
      smoothing: 0.4,
      streamline: 0.3,
      simulatePressure: hasUniformPressure,
      last: isComplete,
    };
  } else {
    // ballpoint
    options = {
      size: s.size * 0.95,
      thinning: 0.16,
      smoothing: 0.55,
      streamline: 0.45,
      simulatePressure: hasUniformPressure,
      last: isComplete,
    };
  }

  const outline = getStroke(pts, options);
  const pathData = getSvgPathFromStroke(outline);
  return pathData ? new Path2D(pathData) : null;
}

function hitTestStroke(stroke: StrokeElement, wx: number, wy: number, radius = 14): boolean {
  const r2 = radius * radius;
  for (const p of stroke.points) {
    const dx = p.x - wx;
    const dy = p.y - wy;
    if (dx * dx + dy * dy <= r2) return true;
  }
  return false;
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function hitTestShape(shape: ShapeElement, wx: number, wy: number, tol = 12): boolean {
  const pts = shape.points;
  if (shape.shapeKind === 'line' || shape.shapeKind === 'dashed') {
    if (pts.length < 2) return false;
    return distToSegment(wx, wy, pts[0].x, pts[0].y, pts[1].x, pts[1].y) <= tol;
  }
  if (shape.shapeKind === 'circle' && pts.length >= 2) {
    const r = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    const d = Math.hypot(wx - pts[0].x, wy - pts[0].y);
    return Math.abs(d - r) <= tol || d <= r;
  }
  if (shape.shapeKind === 'rect' && pts.length >= 2) {
    const minX = Math.min(pts[0].x, pts[1].x);
    const maxX = Math.max(pts[0].x, pts[1].x);
    const minY = Math.min(pts[0].y, pts[1].y);
    const maxY = Math.max(pts[0].y, pts[1].y);
    return wx >= minX - tol && wx <= maxX + tol && wy >= minY - tol && wy <= maxY + tol;
  }
  if (shape.shapeKind === 'triangle' && pts.length >= 3) {
    for (let i = 0; i < 3; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % 3];
      if (distToSegment(wx, wy, a.x, a.y, b.x, b.y) <= tol) return true;
    }
  }
  return false;
}

function hitTestDiagramBounds(dg: DiagramElement, wx: number, wy: number, pad = 8): boolean {
  return (
    wx >= dg.x - pad &&
    wx <= dg.x + dg.width + pad &&
    wy >= dg.y - pad &&
    wy <= dg.y + dg.height + pad
  );
}

function hitTestDiagramPrimitives(dg: DiagramElement, wx: number, wy: number, tol = 14): boolean {
  if (!hitTestDiagramBounds(dg, wx, wy, tol)) return false;
  for (const ln of dg.lines) {
    const x1 = dg.x + ln.x1 * dg.width;
    const y1 = dg.y + ln.y1 * dg.height;
    const x2 = dg.x + ln.x2 * dg.width;
    const y2 = dg.y + ln.y2 * dg.height;
    if (distToSegment(wx, wy, x1, y1, x2, y2) <= tol) return true;
  }
  if (dg.circles) {
    for (const c of dg.circles) {
      const cx = dg.x + c.cx * dg.width;
      const cy = dg.y + c.cy * dg.height;
      const rx = Math.max(1, (c.rx ?? c.r) * dg.width);
      const ry = Math.max(1, (c.ry ?? c.r) * dg.height);
      const normD = Math.hypot((wx - cx) / rx, (wy - cy) / ry);
      const avgR = (rx + ry) / 2;
      if (Math.abs(normD - 1) * avgR <= tol) return true;
    }
  }
  if (dg.curves) {
    for (const cv of dg.curves) {
      for (let i = 1; i < cv.pts.length; i++) {
        const x1 = dg.x + cv.pts[i - 1][0] * dg.width;
        const y1 = dg.y + cv.pts[i - 1][1] * dg.height;
        const x2 = dg.x + cv.pts[i][0] * dg.width;
        const y2 = dg.y + cv.pts[i][1] * dg.height;
        if (distToSegment(wx, wy, x1, y1, x2, y2) <= tol) return true;
      }
    }
  }
  if (dg.dots) {
    for (const d of dg.dots) {
      const dx = dg.x + d.x * dg.width - wx;
      const dy = dg.y + d.y * dg.height - wy;
      if (dx * dx + dy * dy <= tol * tol) return true;
    }
  }
  if (dg.arcs) {
    for (const a of dg.arcs) {
      const cx = dg.x + a.cx * dg.width;
      const cy = dg.y + a.cy * dg.height;
      const rx = Math.max(1, (a.rx ?? a.r) * dg.width);
      const ry = Math.max(1, (a.ry ?? a.r) * dg.height);
      const normD = Math.hypot((wx - cx) / rx, (wy - cy) / ry);
      const avgR = (rx + ry) / 2;
      if (Math.abs(normD - 1) * avgR <= tol) return true;
    }
  }
  return false;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  pageId,
  paperStyle,
  elements,
  camera,
  isDark,
  tool,
  penStyle,
  strokeColor,
  strokeSize,
  snapEnabled,
  palmRejection,
  showRuler,
  showProtractor,
  writeOnlyMode = false,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onChangeElements,
  onChangeCamera,
  onOpenLatexModal,
  onOpenStickyModal,
  workspaceRef,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // High-frequency active ink stored in ref (zero React re-renders during writing)
  const activeStrokeRef = useRef<StrokeElement | null>(null);
  const lastInkSampleRef = useRef<{ x: number; y: number; ts: number }>({ x: 0, y: 0, ts: 0 });
  const drawRafRef = useRef<number>(0);
  const strokePathCacheRef = useRef<Map<string, { sig: string; path: Path2D }>>(new Map());

  const [draftShape, setDraftShape] = useState<{
    kind: ShapeKind;
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null>(null);
  const [snapFeedback, setSnapFeedback] = useState<{
    x: number;
    y: number;
    kind: 'vertex' | 'midpoint' | 'grid';
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recognitionToast, setRecognitionToast] = useState<string | null>(null);
  const [laserTrail, setLaserTrail] = useState<{ x: number; y: number; ts: number }[]>([]);

  // Ruler & Protractor interactive transforms (screen coordinates)
  const [rulerState, setRulerState] = useState({ x: 220, y: 420, angle: -8 });
  const [protractorState, setProtractorState] = useState({ x: 520, y: 340, angle: 0 });

  // Cached images for pasted 3D snapshots
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [imageTick, setImageTick] = useState(0);

  // Interaction pointer tracking
  const dragModeRef = useRef<{
    mode:
      | 'none'
      | 'pan'
      | 'draw'
      | 'shape'
      | 'erase'
      | 'laser'
      | 'move-element'
      | 'resize-image'
      | 'move-ruler'
      | 'rotate-ruler'
      | 'move-protractor'
      | 'rotate-protractor';
    penTool?: 'pen' | 'smartDraw';
    startScreen: { x: number; y: number };
    startCam: CameraState;
    targetId?: string;
    originElement?: CanvasElement;
    startToolTransform?: { x: number; y: number; angle: number };
  }>({
    mode: 'none',
    startScreen: { x: 0, y: 0 },
    startCam: camera,
  });

  // Preload image elements into cache
  useEffect(() => {
    elements.forEach((el) => {
      if (el.type === 'image' && !imageCacheRef.current.has(el.src)) {
        const img = new Image();
        img.onload = () => setImageTick((t) => t + 1);
        img.src = el.src;
        imageCacheRef.current.set(el.src, img);
      }
    });
  }, [elements]);

  // Fade out laser pointer trail
  useEffect(() => {
    if (laserTrail.length === 0) return;
    const timer = window.setInterval(() => {
      const cutoff = Date.now() - 1200;
      setLaserTrail((prev) => prev.filter((p) => p.ts > cutoff));
    }, 50);
    return () => window.clearInterval(timer);
  }, [laserTrail.length]);

  // Keyboard delete for selected element
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedId &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        onChangeElements(
          elements.filter((el) => el.id !== selectedId),
          true
        );
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, elements, onChangeElements]);

  // Collect snap anchors from all shapes and diagrams
  const snapAnchors = useMemo(() => {
    const list: { x: number; y: number; kind: 'vertex' | 'midpoint' }[] = [];
    for (const el of elements) {
      if (el.type === 'shape') {
        el.points.forEach((p) => list.push({ x: p.x, y: p.y, kind: 'vertex' }));
        if ((el.shapeKind === 'line' || el.shapeKind === 'dashed') && el.points.length >= 2) {
          list.push({
            x: (el.points[0].x + el.points[1].x) / 2,
            y: (el.points[0].y + el.points[1].y) / 2,
            kind: 'midpoint',
          });
        }
      } else if (el.type === 'diagram') {
        el.dots?.forEach((d) =>
          list.push({ x: el.x + d.x * el.width, y: el.y + d.y * el.height, kind: 'vertex' })
        );
      }
    }
    return list;
  }, [elements]);

  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const localX = sx - (rect?.left ?? 0);
      const localY = sy - (rect?.top ?? 0);
      return {
        x: (localX - camera.x) / camera.zoom,
        y: (localY - camera.y) / camera.zoom,
      };
    },
    [camera]
  );

  // Draw paper background + all vector elements onto HTML5 canvas
  const renderCanvas = useCallback(
    (targetCanvas?: HTMLCanvasElement, exportSize?: { width: number; height: number; cam: CameraState }) => {
      const canvas = targetCanvas || canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const width = exportSize?.width ?? container.clientWidth;
      const height = exportSize?.height ?? container.clientHeight;
      const cam = exportSize?.cam ?? camera;
      const dpr = exportSize ? 2 : Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      const ctx =
        canvas.getContext('2d', { desynchronized: true }) || canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Paper background fill
      const bgColors: Record<PaperStyle, string> = {
        plain: isDark ? '#0f172a' : '#ffffff',
        ruled: isDark ? '#0f172a' : '#ffffff',
        grid: isDark ? '#0f172a' : '#fcfcfd',
        dot: isDark ? '#0f172a' : '#ffffff',
        cream: isDark ? '#1c1917' : '#fefce8',
        chalkboard: '#14332b',
      };
      ctx.fillStyle = bgColors[paperStyle];
      ctx.fillRect(0, 0, width, height);

      // 2. Paper pattern in world coordinates
      const gridStep = 28;
      const startX = Math.floor((-cam.x / cam.zoom) / gridStep) * gridStep;
      const endX = Math.ceil(((width - cam.x) / cam.zoom) / gridStep) * gridStep;
      const startY = Math.floor((-cam.y / cam.zoom) / gridStep) * gridStep;
      const endY = Math.ceil(((height - cam.y) / cam.zoom) / gridStep) * gridStep;

      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.zoom, cam.zoom);

      if (paperStyle === 'grid' || paperStyle === 'cream') {
        ctx.strokeStyle =
          paperStyle === 'cream'
            ? isDark
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(180, 145, 70, 0.14)'
            : isDark
              ? 'rgba(148,163,184,0.12)'
              : 'rgba(148,163,184,0.22)';
        ctx.lineWidth = 1 / cam.zoom;
        ctx.beginPath();
        for (let x = startX; x <= endX; x += gridStep) {
          ctx.moveTo(x, startY);
          ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += gridStep) {
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
        }
        ctx.stroke();
      } else if (paperStyle === 'ruled') {
        ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.14)' : 'rgba(59,130,246,0.16)';
        ctx.lineWidth = 1 / cam.zoom;
        ctx.beginPath();
        for (let y = startY; y <= endY; y += gridStep * 1.15) {
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
        }
        ctx.stroke();
      } else if (paperStyle === 'dot') {
        ctx.fillStyle = isDark ? 'rgba(148,163,184,0.28)' : 'rgba(100,116,139,0.28)';
        const dotR = 1.1 / cam.zoom;
        for (let x = startX; x <= endX; x += gridStep) {
          for (let y = startY; y <= endY; y += gridStep) {
            ctx.beginPath();
            ctx.arc(x, y, dotR, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Helper to resolve adaptive ink color on dark/chalkboard
      const adaptColor = (c: string) => {
        if (paperStyle === 'chalkboard' && (c === '#1e293b' || c === '#334155' || c === '#0f172a')) {
          return '#f8fafc';
        }
        if (isDark && paperStyle !== 'cream' && (c === '#1e293b' || c === '#334155' || c === '#0f172a')) {
          return '#e2e8f0';
        }
        return c;
      };

      const drawStroke = (s: StrokeElement, isActive = false) => {
        if (s.points.length === 0) return;
        const color = adaptColor(s.color);
        ctx.save();

        if (s.penStyle === 'dashed') {
          ctx.strokeStyle = color;
          ctx.lineWidth = s.size;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.setLineDash([10, 7]);
          ctx.beginPath();
          ctx.moveTo(s.points[0].x, s.points[0].y);
          for (let i = 1; i < s.points.length; i++) {
            ctx.lineTo(s.points[i].x, s.points[i].y);
          }
          ctx.stroke();
          ctx.restore();
          return;
        }

        const isHighlighter = s.penStyle === 'highlighter';
        const isPencil = s.penStyle === 'pencil';

        ctx.globalAlpha = isHighlighter ? 0.28 : isPencil ? 0.76 : 1;
        ctx.fillStyle = color;

        if (isActive) {
          const path = buildStrokePath2D(s, false);
          if (path) ctx.fill(path);
        } else {
          const sig = `${s.points.length}-${s.size}-${s.penStyle}`;
          const cached = strokePathCacheRef.current.get(s.id);
          if (cached && cached.sig === sig) {
            ctx.fill(cached.path);
          } else {
            const path = buildStrokePath2D(s, true);
            if (path) {
              strokePathCacheRef.current.set(s.id, { sig, path });
              ctx.fill(path);
            }
          }
        }
        ctx.restore();
      };

      const drawShape = (sh: ShapeElement) => {
        const color = adaptColor(sh.color);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = sh.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (sh.shapeKind === 'dashed') {
          ctx.setLineDash([9, 6]);
        }

        const pts = sh.points;
        ctx.beginPath();
        if ((sh.shapeKind === 'line' || sh.shapeKind === 'dashed') && pts.length >= 2) {
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
        } else if (sh.shapeKind === 'triangle' && pts.length >= 3) {
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
          ctx.lineTo(pts[2].x, pts[2].y);
          ctx.closePath();
        } else if (sh.shapeKind === 'rect' && pts.length >= 2) {
          const x = Math.min(pts[0].x, pts[1].x);
          const y = Math.min(pts[0].y, pts[1].y);
          const w = Math.abs(pts[1].x - pts[0].x);
          const h = Math.abs(pts[1].y - pts[0].y);
          ctx.rect(x, y, w, h);
        } else if (sh.shapeKind === 'circle' && pts.length >= 2) {
          const r = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
          ctx.arc(pts[0].x, pts[0].y, r, 0, Math.PI * 2);
        }
        ctx.stroke();

        // Draw vertex anchor dots on clean geometry shapes
        if (sh.shapeKind !== 'circle') {
          ctx.setLineDash([]);
          ctx.fillStyle = color;
          pts.forEach((p) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(2.5, sh.strokeWidth * 0.9), 0, Math.PI * 2);
            ctx.fill();
          });
        }

        if (selectedId === sh.id && !exportSize) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.restore();
      };

      const drawDiagram = (dg: DiagramElement) => {
        const color = adaptColor(dg.color);
        const accentColor =
          paperStyle === 'chalkboard'
            ? '#a5b4fc'
            : isDark && paperStyle !== 'cream'
              ? '#818cf8'
              : '#4f46e5';

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const ln of dg.lines) {
          ctx.beginPath();
          ctx.strokeStyle = ln.accent ? accentColor : color;
          ctx.lineWidth = ln.accent ? Math.max(1.5, dg.strokeWidth * 0.9) : dg.strokeWidth;
          ctx.setLineDash(ln.dashed ? [8, 5] : []);
          ctx.moveTo(dg.x + ln.x1 * dg.width, dg.y + ln.y1 * dg.height);
          ctx.lineTo(dg.x + ln.x2 * dg.width, dg.y + ln.y2 * dg.height);
          ctx.stroke();
        }

        if (dg.circles) {
          for (const c of dg.circles) {
            ctx.beginPath();
            ctx.strokeStyle = c.accent ? accentColor : color;
            ctx.lineWidth = dg.strokeWidth;
            ctx.setLineDash(c.dashed ? [8, 5] : []);
            ctx.ellipse(
              dg.x + c.cx * dg.width,
              dg.y + c.cy * dg.height,
              Math.max(0.5, (c.rx ?? c.r) * dg.width),
              Math.max(0.5, (c.ry ?? c.r) * dg.height),
              0,
              0,
              Math.PI * 2
            );
            ctx.stroke();
          }
        }

        if (dg.arcs) {
          for (const a of dg.arcs) {
            ctx.beginPath();
            ctx.strokeStyle = a.accent ? accentColor : color;
            ctx.lineWidth = dg.strokeWidth;
            ctx.setLineDash(a.dashed ? [8, 5] : []);
            ctx.ellipse(
              dg.x + a.cx * dg.width,
              dg.y + a.cy * dg.height,
              Math.max(0.5, (a.rx ?? a.r) * dg.width),
              Math.max(0.5, (a.ry ?? a.r) * dg.height),
              0,
              a.startAngle,
              a.endAngle,
              a.endAngle < a.startAngle
            );
            ctx.stroke();
          }
        }

        if (dg.curves) {
          for (const cv of dg.curves) {
            if (cv.pts.length < 2) continue;
            ctx.beginPath();
            ctx.strokeStyle = cv.accent ? accentColor : color;
            ctx.lineWidth = dg.strokeWidth;
            ctx.setLineDash(cv.dashed ? [8, 5] : []);
            ctx.moveTo(dg.x + cv.pts[0][0] * dg.width, dg.y + cv.pts[0][1] * dg.height);
            for (let i = 1; i < cv.pts.length; i++) {
              ctx.lineTo(dg.x + cv.pts[i][0] * dg.width, dg.y + cv.pts[i][1] * dg.height);
            }
            ctx.stroke();
          }
        }

        if (dg.dots) {
          ctx.setLineDash([]);
          const dotR = Math.max(2.5, dg.strokeWidth * 0.95);
          ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
          for (const d of dg.dots) {
            const px = dg.x + d.x * dg.width;
            const py = dg.y + d.y * dg.height;
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.arc(px, py, dotR, 0, Math.PI * 2);
            ctx.fill();
            if (d.label) {
              ctx.fillStyle = color;
              ctx.fillText(d.label, px + (d.dx ?? 6), py + (d.dy ?? -5));
            }
          }
        }

        if (selectedId === dg.id && !exportSize) {
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(dg.x - 4, dg.y - 4, dg.width + 8, dg.height + 8);
        }
        ctx.restore();
      };

      // Render stored elements
      for (const el of elements) {
        if (el.type === 'image') {
          const img = imageCacheRef.current.get(el.src);
          if (img && img.complete) {
            ctx.drawImage(img, el.x, el.y, el.width, el.height);
          }
        } else if (el.type === 'diagram') {
          drawDiagram(el);
        } else if (el.type === 'shape') {
          drawShape(el);
        } else if (el.type === 'stroke') {
          drawStroke(el);
        } else if (el.type === 'label') {
          ctx.save();
          ctx.font = `600 ${el.fontSize}px "Plus Jakarta Sans", sans-serif`;
          ctx.fillStyle = adaptColor(el.color);
          ctx.fillText(el.text, el.x, el.y);
          ctx.restore();
        } else if (exportSize && el.type === 'sticky') {
          // Include sticky cards in exported PNG/PDF
          ctx.save();
          ctx.fillStyle = '#fef3c7';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.fillRect(el.x, el.y, el.width, 96);
          ctx.strokeRect(el.x, el.y, el.width, 96);
          ctx.fillStyle = '#78350f';
          ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(el.title, el.x + 12, el.y + 22);
          ctx.font = '400 12px "DM Sans", sans-serif';
          ctx.fillText(el.body.slice(0, 56), el.x + 12, el.y + 46);
          ctx.restore();
        } else if (exportSize && el.type === 'latex') {
          ctx.save();
          ctx.font = `500 ${el.fontSize}px "JetBrains Mono", monospace`;
          ctx.fillStyle = adaptColor(el.color);
          ctx.fillText(el.latex, el.x, el.y + el.fontSize);
          ctx.restore();
        }
      }

      // Render active freehand stroke directly from ref
      if (activeStrokeRef.current && !exportSize) {
        drawStroke(activeStrokeRef.current, true);
      }

      // Render draft 2D geometry shape + live measurement badge
      if (draftShape && !exportSize) {
        const s = draftShape.start;
        const c = draftShape.current;
        let pts: { x: number; y: number }[] = [s, c];
        if (draftShape.kind === 'triangle') {
          const midX = (s.x + c.x) / 2;
          const baseLen = Math.hypot(c.x - s.x, c.y - s.y);
          pts = [
            { x: midX, y: Math.min(s.y, c.y) - baseLen * 0.45 },
            { x: s.x, y: c.y },
            { x: c.x, y: c.y },
          ];
        }
        drawShape({
          id: 'draft',
          type: 'shape',
          shapeKind: draftShape.kind,
          points: pts,
          color: strokeColor,
          strokeWidth: Math.max(2, strokeSize * 0.7),
        });

        // Measurement label
        const dx = c.x - s.x;
        const dy = c.y - s.y;
        const pxLen = Math.hypot(dx, dy);
        const cm = (pxLen / 40).toFixed(2);
        const deg = Math.round((Math.atan2(-dy, dx) * 180) / Math.PI);
        ctx.save();
        ctx.font = '500 11px "JetBrains Mono", monospace';
        const labelText =
          draftShape.kind === 'circle'
            ? `R = ${cm} cm`
            : `${cm} cm · ${deg}°`;
        const tw = ctx.measureText(labelText).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(c.x + 12, c.y - 24, tw + 12, 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, c.x + 18, c.y - 10);
        ctx.restore();
      }

      // Snap feedback ring
      if (snapFeedback && !exportSize) {
        ctx.save();
        ctx.strokeStyle = snapFeedback.kind === 'vertex' ? '#4f46e5' : '#0ea5e9';
        ctx.lineWidth = 2 / cam.zoom;
        ctx.beginPath();
        ctx.arc(snapFeedback.x, snapFeedback.y, 7 / cam.zoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Laser pointer trail
      if (laserTrail.length > 1 && !exportSize) {
        const now = Date.now();
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 1; i < laserTrail.length; i++) {
          const p0 = laserTrail[i - 1];
          const p1 = laserTrail[i];
          const age = Math.max(0, 1 - (now - p1.ts) / 1100);
          ctx.strokeStyle = `rgba(239, 68, 68, ${age})`;
          ctx.lineWidth = 4 * age + 1;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        const tip = laserTrail[laserTrail.length - 1];
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
      ctx.restore();
    },
    [
      camera,
      paperStyle,
      isDark,
      elements,
      draftShape,
      snapFeedback,
      laserTrail,
      strokeColor,
      strokeSize,
      selectedId,
      imageTick,
    ]
  );

  const scheduleDraw = useCallback(() => {
    if (drawRafRef.current) return;
    drawRafRef.current = requestAnimationFrame(() => {
      drawRafRef.current = 0;
      renderCanvas();
    });
  }, [renderCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  useEffect(() => {
    return () => {
      if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => renderCanvas());
    ro.observe(container);
    return () => ro.disconnect();
  }, [renderCanvas]);

  // Expose PNG / SVG / PDF exports
  useEffect(() => {
    if (!workspaceRef) return;
    workspaceRef.current = {
      exportPNG: () => {
        const off = document.createElement('canvas');
        const w = 1400;
        const h = 960;
        renderCanvas(off, { width: w, height: h, cam: { x: 0, y: 0, zoom: 1 } });
        const url = off.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `HinhHocNote-${pageId}.png`;
        a.click();
      },
      exportPDF: () => {
        const off = document.createElement('canvas');
        const w = 1400;
        const h = 960;
        renderCanvas(off, { width: w, height: h, cam: { x: 0, y: 0, zoom: 1 } });
        const imgData = off.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [w, h] });
        pdf.addImage(imgData, 'PNG', 0, 0, w, h);
        pdf.save(`HinhHocNote-${pageId}.pdf`);
      },
      exportSVG: () => {
        const lines: string[] = [
          `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="960" viewBox="0 0 1400 960">`,
          `<rect width="1400" height="960" fill="${paperStyle === 'chalkboard' ? '#14332b' : paperStyle === 'cream' ? '#fefce8' : '#ffffff'}" />`,
        ];
        elements.forEach((el) => {
          if (el.type === 'shape') {
            const dash = el.shapeKind === 'dashed' ? ' stroke-dasharray="9 6"' : '';
            if ((el.shapeKind === 'line' || el.shapeKind === 'dashed') && el.points.length >= 2) {
              lines.push(
                `<line x1="${el.points[0].x}" y1="${el.points[0].y}" x2="${el.points[1].x}" y2="${el.points[1].y}" stroke="${el.color}" stroke-width="${el.strokeWidth}" stroke-linecap="round"${dash} />`
              );
            } else if (el.shapeKind === 'triangle' && el.points.length >= 3) {
              const ptsStr = el.points.map((p) => `${p.x},${p.y}`).join(' ');
              lines.push(
                `<polygon points="${ptsStr}" fill="none" stroke="${el.color}" stroke-width="${el.strokeWidth}" />`
              );
            } else if (el.shapeKind === 'rect' && el.points.length >= 2) {
              const x = Math.min(el.points[0].x, el.points[1].x);
              const y = Math.min(el.points[0].y, el.points[1].y);
              const w = Math.abs(el.points[1].x - el.points[0].x);
              const h = Math.abs(el.points[1].y - el.points[0].y);
              lines.push(
                `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${el.color}" stroke-width="${el.strokeWidth}" />`
              );
            } else if (el.shapeKind === 'circle' && el.points.length >= 2) {
              const r = Math.hypot(el.points[1].x - el.points[0].x, el.points[1].y - el.points[0].y);
              lines.push(
                `<circle cx="${el.points[0].x}" cy="${el.points[0].y}" r="${r}" fill="none" stroke="${el.color}" stroke-width="${el.strokeWidth}" />`
              );
            }
          } else if (el.type === 'stroke') {
            const outline = getStroke(
              el.points.map((p) => [p.x, p.y, p.pressure]),
              { size: el.size }
            );
            const path = getSvgPathFromStroke(outline);
            if (path) {
              lines.push(`<path d="${path}" fill="${el.color}" />`);
            }
          } else if (el.type === 'diagram') {
            el.lines.forEach((ln) => {
              const stroke = ln.accent ? '#4f46e5' : el.color;
              const dash = ln.dashed ? ' stroke-dasharray="8 5"' : '';
              lines.push(
                `<line x1="${el.x + ln.x1 * el.width}" y1="${el.y + ln.y1 * el.height}" x2="${el.x + ln.x2 * el.width}" y2="${el.y + ln.y2 * el.height}" stroke="${stroke}" stroke-width="${el.strokeWidth}" stroke-linecap="round"${dash} />`
              );
            });
            el.circles?.forEach((c) => {
              const stroke = c.accent ? '#4f46e5' : el.color;
              const dash = c.dashed ? ' stroke-dasharray="8 5"' : '';
              lines.push(
                `<ellipse cx="${el.x + c.cx * el.width}" cy="${el.y + c.cy * el.height}" rx="${(c.rx ?? c.r) * el.width}" ry="${(c.ry ?? c.r) * el.height}" fill="none" stroke="${stroke}" stroke-width="${el.strokeWidth}"${dash} />`
              );
            });
            el.arcs?.forEach((a) => {
              const rx = (a.rx ?? a.r) * el.width;
              const ry = (a.ry ?? a.r) * el.height;
              const cx = el.x + a.cx * el.width;
              const cy = el.y + a.cy * el.height;
              const x1 = cx + Math.cos(a.startAngle) * rx;
              const y1 = cy + Math.sin(a.startAngle) * ry;
              const x2 = cx + Math.cos(a.endAngle) * rx;
              const y2 = cy + Math.sin(a.endAngle) * ry;
              const diff = a.endAngle - a.startAngle;
              const largeArc = Math.abs(diff) > Math.PI ? 1 : 0;
              const sweep = diff >= 0 ? 1 : 0;
              const stroke = a.accent ? '#4f46e5' : el.color;
              const dash = a.dashed ? ' stroke-dasharray="8 5"' : '';
              lines.push(
                `<path d="M ${x1} ${y1} A ${rx} ${ry} 0 ${largeArc} ${sweep} ${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="${el.strokeWidth}"${dash} />`
              );
            });
            el.curves?.forEach((cv) => {
              if (cv.pts.length < 2) return;
              const d = cv.pts
                .map(
                  (pt, idx) =>
                    `${idx === 0 ? 'M' : 'L'} ${el.x + pt[0] * el.width} ${el.y + pt[1] * el.height}`
                )
                .join(' ');
              const stroke = cv.accent ? '#4f46e5' : el.color;
              const dash = cv.dashed ? ' stroke-dasharray="8 5"' : '';
              lines.push(
                `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${el.strokeWidth}" stroke-linecap="round"${dash} />`
              );
            });
            el.dots?.forEach((d) => {
              const px = el.x + d.x * el.width;
              const py = el.y + d.y * el.height;
              lines.push(`<circle cx="${px}" cy="${py}" r="3" fill="#4f46e5" />`);
              if (d.label) {
                lines.push(
                  `<text x="${px + (d.dx ?? 6)}" y="${py + (d.dy ?? -5)}" font-size="13" font-family="sans-serif" fill="${el.color}">${d.label}</text>`
                );
              }
            });
          } else if (el.type === 'label') {
            lines.push(
              `<text x="${el.x}" y="${el.y}" font-size="${el.fontSize}" font-family="sans-serif" fill="${el.color}">${el.text}</text>`
            );
          }
        });
        lines.push('</svg>');
        const blob = new Blob([lines.join('\n')], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HinhHocNote-${pageId}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      },
      resetView: () => onChangeCamera({ x: 0, y: 0, zoom: 1 }),
    };
  }, [workspaceRef, renderCanvas, pageId, paperStyle, elements, onChangeCamera]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey) || tool === 'pan') {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragModeRef.current = {
        mode: 'pan',
        startScreen: { x: e.clientX, y: e.clientY },
        startCam: { ...camera },
      };
      return;
    }

    // Palm rejection: when enabled, ignore bare finger touch for drawing tools (allow pan instead)
    if (palmRejection && e.pointerType === 'touch' && tool !== 'select') {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragModeRef.current = {
        mode: 'pan',
        startScreen: { x: e.clientX, y: e.clientY },
        startCam: { ...camera },
      };
      return;
    }

    const rawWorld = screenToWorld(e.clientX, e.clientY);

    if (tool === 'latex') {
      onOpenLatexModal(rawWorld);
      return;
    }

    if (tool === 'sticky') {
      onOpenStickyModal(rawWorld);
      return;
    }

    if (tool === 'label') {
      const nextLabels = ['A', 'B', 'C', 'D', 'S', 'M', 'N', 'H', 'I', 'O', "A'", "B'"];
      const existingCount = elements.filter((el) => el.type === 'label').length;
      const defaultLbl = nextLabels[existingCount % nextLabels.length];
      const lblEl: CanvasElement = {
        id: `lbl-${Date.now()}`,
        type: 'label',
        x: rawWorld.x,
        y: rawWorld.y,
        text: defaultLbl,
        color: strokeColor,
        fontSize: 17,
      };
      onChangeElements([...elements, lblEl], true);
      return;
    }

    if (tool === 'select') {
      // Hit test shapes & diagrams
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (
          (el.type === 'shape' && hitTestShape(el, rawWorld.x, rawWorld.y)) ||
          (el.type === 'diagram' && hitTestDiagramBounds(el, rawWorld.x, rawWorld.y))
        ) {
          setSelectedId(el.id);
          e.currentTarget.setPointerCapture(e.pointerId);
          dragModeRef.current = {
            mode: 'move-element',
            startScreen: rawWorld,
            startCam: camera,
            targetId: el.id,
            originElement: el,
          };
          return;
        }
      }
      setSelectedId(null);
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);

    if (tool === 'laser') {
      dragModeRef.current = { mode: 'laser', startScreen: rawWorld, startCam: camera };
      setLaserTrail([{ x: rawWorld.x, y: rawWorld.y, ts: Date.now() }]);
      return;
    }

    if (tool === 'eraser') {
      dragModeRef.current = { mode: 'erase', startScreen: rawWorld, startCam: camera };
      const next = elements.filter((el) => {
        if (el.type === 'stroke') return !hitTestStroke(el, rawWorld.x, rawWorld.y);
        if (el.type === 'shape') return !hitTestShape(el, rawWorld.x, rawWorld.y);
        if (el.type === 'diagram') return !hitTestDiagramPrimitives(el, rawWorld.x, rawWorld.y);
        if (el.type === 'label') {
          return Math.hypot(el.x - rawWorld.x, el.y - rawWorld.y) > 18;
        }
        return true;
      });
      if (next.length !== elements.length) {
        onChangeElements(next, true);
      }
      return;
    }

    if (tool === 'pen' || tool === 'smartDraw') {
      const pressure =
        e.pressure && e.pressure > 0 && Math.abs(e.pressure - 0.5) > 0.01
          ? e.pressure
          : 0.5;
      const stroke: StrokeElement = {
        id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'stroke',
        points: [{ x: rawWorld.x, y: rawWorld.y, pressure }],
        color: strokeColor,
        size: strokeSize,
        penStyle,
      };
      activeStrokeRef.current = stroke;
      lastInkSampleRef.current = { x: rawWorld.x, y: rawWorld.y, ts: performance.now() };
      dragModeRef.current = {
        mode: 'draw',
        penTool: tool,
        startScreen: rawWorld,
        startCam: camera,
      };
      scheduleDraw();
      return;
    }

    // 2D Geometry Shapes
    if (
      tool === 'line' ||
      tool === 'dashed' ||
      tool === 'triangle' ||
      tool === 'rect' ||
      tool === 'circle'
    ) {
      const snapped = snapEnabled
        ? findSnapPoint(rawWorld, snapAnchors, 28, true)
        : { x: rawWorld.x, y: rawWorld.y, snappedType: null };
      setSnapFeedback(
        snapped.snappedType ? { x: snapped.x, y: snapped.y, kind: snapped.snappedType } : null
      );
      setDraftShape({
        kind: tool,
        start: { x: snapped.x, y: snapped.y },
        current: { x: snapped.x, y: snapped.y },
      });
      dragModeRef.current = { mode: 'shape', startScreen: rawWorld, startCam: camera };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const mode = dragModeRef.current.mode;
    const rawWorld = screenToWorld(e.clientX, e.clientY);

    if (mode === 'none') {
      // Hover snap preview when geometry shape tool is active
      if (
        snapEnabled &&
        (tool === 'line' ||
          tool === 'dashed' ||
          tool === 'triangle' ||
          tool === 'rect' ||
          tool === 'circle')
      ) {
        const sn = findSnapPoint(rawWorld, snapAnchors, 28, true);
        setSnapFeedback(sn.snappedType ? { x: sn.x, y: sn.y, kind: sn.snappedType } : null);
      } else if (snapFeedback) {
        setSnapFeedback(null);
      }
      return;
    }

    if (mode === 'pan') {
      const dx = e.clientX - dragModeRef.current.startScreen.x;
      const dy = e.clientY - dragModeRef.current.startScreen.y;
      onChangeCamera({
        ...dragModeRef.current.startCam,
        x: dragModeRef.current.startCam.x + dx,
        y: dragModeRef.current.startCam.y + dy,
      });
      return;
    }

    if (mode === 'move-element' && dragModeRef.current.originElement) {
      const dx = rawWorld.x - dragModeRef.current.startScreen.x;
      const dy = rawWorld.y - dragModeRef.current.startScreen.y;
      const orig = dragModeRef.current.originElement;
      if (orig.type === 'shape') {
        const moved: ShapeElement = {
          ...orig,
          points: orig.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
        };
        onChangeElements(
          elements.map((el) => (el.id === orig.id ? moved : el)),
          false
        );
      } else if (orig.type === 'diagram') {
        const moved: DiagramElement = {
          ...orig,
          x: orig.x + dx,
          y: orig.y + dy,
        };
        onChangeElements(
          elements.map((el) => (el.id === orig.id ? moved : el)),
          false
        );
      }
      return;
    }

    if (mode === 'laser') {
      setLaserTrail((prev) => [...prev.slice(-45), { x: rawWorld.x, y: rawWorld.y, ts: Date.now() }]);
      return;
    }

    if (mode === 'erase') {
      const next = elements.filter((el) => {
        if (el.type === 'stroke') return !hitTestStroke(el, rawWorld.x, rawWorld.y);
        if (el.type === 'shape') return !hitTestShape(el, rawWorld.x, rawWorld.y);
        if (el.type === 'diagram') return !hitTestDiagramPrimitives(el, rawWorld.x, rawWorld.y);
        if (el.type === 'label') return Math.hypot(el.x - rawWorld.x, el.y - rawWorld.y) > 18;
        return true;
      });
      if (next.length !== elements.length) {
        onChangeElements(next, false);
      }
      return;
    }

    if (mode === 'draw' && activeStrokeRef.current) {
      const nativeEvt = e.nativeEvent as PointerEvent;
      const coalesced =
        typeof nativeEvt.getCoalescedEvents === 'function'
          ? nativeEvt.getCoalescedEvents()
          : [nativeEvt];
      const events = coalesced.length > 0 ? coalesced : [nativeEvt];
      const minStep = 1.1 / camera.zoom;
      const pts = activeStrokeRef.current.points;

      for (const ce of events) {
        const wPt = screenToWorld(ce.clientX, ce.clientY);
        const prev = lastInkSampleRef.current;
        const dist = Math.hypot(wPt.x - prev.x, wPt.y - prev.y);
        if (dist < minStep) continue;

        const nowTs = ce.timeStamp || performance.now();
        const dt = Math.max(1, nowTs - prev.ts);
        let p = ce.pressure;
        if (!p || p <= 0 || Math.abs(p - 0.5) < 0.01) {
          // Velocity-aware pressure simulation when stylus pressure isn't provided
          const velocity = dist / dt;
          p = Math.max(0.22, Math.min(0.88, 0.78 - velocity * 0.22));
        }

        pts.push({ x: wPt.x, y: wPt.y, pressure: p });
        lastInkSampleRef.current = { x: wPt.x, y: wPt.y, ts: nowTs };
      }
      scheduleDraw();
      return;
    }

    if (mode === 'shape' && draftShape) {
      let pt = rawWorld;
      if (snapEnabled) {
        const sn = findSnapPoint(rawWorld, snapAnchors, 28, true);
        if (sn.snappedType) {
          pt = { x: sn.x, y: sn.y };
          setSnapFeedback({ x: sn.x, y: sn.y, kind: sn.snappedType });
        } else {
          setSnapFeedback(null);
          if (draftShape.kind === 'line' || draftShape.kind === 'dashed') {
            pt = snapAngle15(draftShape.start, rawWorld);
          }
        }
      }
      setDraftShape((prev) => (prev ? { ...prev, current: pt } : null));
    }
  };

  const handlePointerUp = () => {
    const mode = dragModeRef.current.mode;
    const penTool = dragModeRef.current.penTool;
    dragModeRef.current.mode = 'none';
    dragModeRef.current.penTool = undefined;

    if (mode === 'move-element') {
      onChangeElements(elements, true);
      return;
    }

    if (mode === 'draw' && activeStrokeRef.current) {
      if (drawRafRef.current) {
        cancelAnimationFrame(drawRafRef.current);
        drawRafRef.current = 0;
      }
      const finalized = activeStrokeRef.current;
      activeStrokeRef.current = null;

      if (finalized.points.length === 1) {
        // Allow crisp single-tap ink dots
        const p0 = finalized.points[0];
        finalized.points.push({ x: p0.x + 0.5, y: p0.y + 0.5, pressure: p0.pressure });
      }
      if (finalized.points.length < 2) {
        renderCanvas();
        return;
      }

      // Only normalize shapes when explicitly in Shape Normalization mode ('smartDraw')
      if (penTool === 'smartDraw' && finalized.penStyle !== 'highlighter') {
        const recognized = recognizeShape(finalized.points);
        if (recognized) {
          const shapeEl: ShapeElement = {
            id: `shp-${Date.now()}`,
            type: 'shape',
            shapeKind: finalized.penStyle === 'dashed' ? 'dashed' : recognized.kind,
            points: recognized.points,
            color: finalized.color,
            strokeWidth: Math.max(2, finalized.size * 0.65),
          };
          onChangeElements([...elements, shapeEl], true);
          const names: Record<ShapeKind, string> = {
            line: 'Đoạn thẳng',
            dashed: 'Nét đứt',
            triangle: 'Tam giác',
            rect: 'Hình chữ nhật',
            circle: 'Hình tròn',
          };
          setRecognitionToast(`Đã chuẩn hoá: ${names[recognized.kind]}`);
          window.setTimeout(() => setRecognitionToast(null), 2200);
          return;
        }
      }

      onChangeElements([...elements, finalized], true);
      return;
    }

    if (mode === 'shape' && draftShape) {
      const s = draftShape.start;
      const c = draftShape.current;
      setDraftShape(null);
      setSnapFeedback(null);

      if (Math.hypot(c.x - s.x, c.y - s.y) < 6) return;

      let pts: { x: number; y: number }[] = [s, c];
      if (draftShape.kind === 'triangle') {
        const midX = (s.x + c.x) / 2;
        const baseLen = Math.hypot(c.x - s.x, c.y - s.y);
        pts = [
          { x: midX, y: Math.min(s.y, c.y) - baseLen * 0.45 },
          { x: s.x, y: c.y },
          { x: c.x, y: c.y },
        ];
      }

      const shapeEl: ShapeElement = {
        id: `shp-${Date.now()}`,
        type: 'shape',
        shapeKind: draftShape.kind,
        points: pts,
        color: strokeColor,
        strokeWidth: Math.max(2, strokeSize * 0.7),
      };
      onChangeElements([...elements, shapeEl], true);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        const mx = e.clientX - (rect?.left ?? 0);
        const my = e.clientY - (rect?.top ?? 0);
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        const nextZoom = Math.max(0.35, Math.min(3.5, camera.zoom * factor));
        const wx = (mx - camera.x) / camera.zoom;
        const wy = (my - camera.y) / camera.zoom;
        onChangeCamera({
          zoom: nextZoom,
          x: mx - wx * nextZoom,
          y: my - wy * nextZoom,
        });
      } else {
        onChangeCamera({
          ...camera,
          x: camera.x - e.deltaX,
          y: camera.y - e.deltaY,
        });
      }
    }
  };

  // Global window pointer handlers for DOM overlay drags (LaTeX, Sticky, Image, Ruler, Protractor)
  useEffect(() => {
    const onWinMove = (e: PointerEvent) => {
      const dm = dragModeRef.current;
      if (
        dm.mode === 'move-ruler' &&
        dm.startToolTransform
      ) {
        const dx = e.clientX - dm.startScreen.x;
        const dy = e.clientY - dm.startScreen.y;
        setRulerState({
          ...dm.startToolTransform,
          x: dm.startToolTransform.x + dx,
          y: dm.startToolTransform.y + dy,
        });
      } else if (dm.mode === 'rotate-ruler' && dm.startToolTransform) {
        const angle = Math.atan2(
          e.clientY - dm.startToolTransform.y,
          e.clientX - dm.startToolTransform.x
        );
        setRulerState((prev) => ({ ...prev, angle: (angle * 180) / Math.PI }));
      } else if (dm.mode === 'move-protractor' && dm.startToolTransform) {
        const dx = e.clientX - dm.startScreen.x;
        const dy = e.clientY - dm.startScreen.y;
        setProtractorState({
          ...dm.startToolTransform,
          x: dm.startToolTransform.x + dx,
          y: dm.startToolTransform.y + dy,
        });
      } else if (dm.mode === 'rotate-protractor' && dm.startToolTransform) {
        const angle = Math.atan2(
          e.clientY - dm.startToolTransform.y,
          e.clientX - dm.startToolTransform.x
        );
        setProtractorState((prev) => ({ ...prev, angle: (angle * 180) / Math.PI }));
      } else if (dm.mode === 'move-element' && dm.originElement) {
        const dx = (e.clientX - dm.startScreen.x) / camera.zoom;
        const dy = (e.clientY - dm.startScreen.y) / camera.zoom;
        const orig = dm.originElement;
        if (orig.type === 'latex' || orig.type === 'sticky' || orig.type === 'image') {
          onChangeElements(
            elements.map((el) =>
              el.id === orig.id ? { ...orig, x: orig.x + dx, y: orig.y + dy } : el
            ),
            false
          );
        }
      } else if (
        dm.mode === 'resize-image' &&
        (dm.originElement?.type === 'image' || dm.originElement?.type === 'diagram')
      ) {
        const dx = (e.clientX - dm.startScreen.x) / camera.zoom;
        const orig = dm.originElement;
        const ratio = orig.height / orig.width;
        const minW = orig.type === 'diagram' ? 72 : 120;
        const nextW = Math.max(minW, orig.width + dx);
        onChangeElements(
          elements.map((el) =>
            el.id === orig.id ? { ...orig, width: nextW, height: nextW * ratio } : el
          ),
          false
        );
      }
    };

    const onWinUp = () => {
      const dm = dragModeRef.current;
      if (dm.mode === 'move-element' || dm.mode === 'resize-image') {
        onChangeElements(elements, true);
      }
      if (
        dm.mode === 'move-ruler' ||
        dm.mode === 'rotate-ruler' ||
        dm.mode === 'move-protractor' ||
        dm.mode === 'rotate-protractor' ||
        dm.mode === 'move-element' ||
        dm.mode === 'resize-image'
      ) {
        dragModeRef.current.mode = 'none';
      }
    };

    window.addEventListener('pointermove', onWinMove);
    window.addEventListener('pointerup', onWinUp);
    return () => {
      window.removeEventListener('pointermove', onWinMove);
      window.removeEventListener('pointerup', onWinUp);
    };
  }, [camera.zoom, elements, onChangeElements]);

  const cursorClass =
    tool === 'pan'
      ? 'cursor-grab active:cursor-grabbing'
      : tool === 'select'
        ? 'cursor-default'
        : tool === 'eraser'
          ? 'cursor-cell'
          : 'cursor-crosshair';

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes('application/x-hinhhoc-shape')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const tplId = e.dataTransfer.getData('application/x-hinhhoc-shape');
    if (!tplId) return;
    e.preventDefault();
    const tpl = SHAPE_TEMPLATES_100.find((t) => t.id === tplId);
    if (!tpl) return;
    const world = screenToWorld(e.clientX, e.clientY);
    const w = tpl.defaultWidth ?? 210;
    const h = tpl.defaultHeight ?? 175;
    const dg: DiagramElement = {
      id: `dg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'diagram',
      templateId: tpl.id,
      name: tpl.name,
      x: world.x - w / 2,
      y: world.y - h / 2,
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
    onChangeElements([...elements, dg], true);
    setSelectedId(dg.id);
    setRecognitionToast(`Đã thả: ${tpl.name}`);
    window.setTimeout(() => setRecognitionToast(null), 1800);
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative flex-1 h-full overflow-hidden bg-slate-100 dark:bg-slate-950 select-none"
    >
      {/* Main Drawing Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`w-full h-full block canvas-touch-none ${cursorClass}`}
      />

      {/* World-Space DOM Layer (LaTeX formulas, Sticky notes, 3D Image handles) */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
            transformOrigin: '0 0',
          }}
          className="relative w-0 h-0"
        >
          {elements.map((el) => {
            if (el.type === 'latex') {
              let html = '';
              try {
                html = katex.renderToString(el.latex, { throwOnError: false });
              } catch {
                html = el.latex;
              }
              return (
                <div
                  key={el.id}
                  style={{
                    left: el.x,
                    top: el.y,
                    fontSize: el.fontSize,
                    color:
                      paperStyle === 'chalkboard'
                        ? '#f8fafc'
                        : isDark && paperStyle !== 'cream'
                          ? '#f1f5f9'
                          : el.color,
                  }}
                  onPointerDown={(ev) => {
                    ev.stopPropagation();
                    setSelectedId(el.id);
                    dragModeRef.current = {
                      mode: 'move-element',
                      startScreen: { x: ev.clientX, y: ev.clientY },
                      startCam: camera,
                      originElement: el,
                    };
                  }}
                  onDoubleClick={() => onOpenLatexModal({ x: el.x, y: el.y }, el)}
                  className={`pointer-events-auto group absolute rounded-lg px-2.5 py-1.5 cursor-move transition-shadow ${
                    selectedId === el.id
                      ? 'ring-2 ring-indigo-500 bg-white/80 dark:bg-slate-900/80'
                      : 'hover:bg-white/60 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <div dangerouslySetInnerHTML={{ __html: html }} />
                  <div className="absolute -top-2.5 -right-2.5 hidden group-hover:flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onOpenLatexModal({ x: el.x, y: el.y }, el);
                      }}
                      className="p-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm hover:text-indigo-600"
                      title="Sửa công thức"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onChangeElements(
                          elements.filter((item) => item.id !== el.id),
                          true
                        );
                      }}
                      className="p-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-500 shadow-sm hover:bg-rose-50"
                      title="Xoá công thức"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            }

            if (el.type === 'sticky') {
              const cardStyles: Record<StickyElement['variant'], string> = {
                theorem:
                  'bg-indigo-50/95 dark:bg-indigo-950/90 border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-100',
                step: 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-slate-100',
                note: 'bg-amber-50/95 dark:bg-amber-950/90 border-amber-200 dark:border-amber-800 text-slate-800 dark:text-slate-100',
              };
              return (
                <div
                  key={el.id}
                  style={{ left: el.x, top: el.y, width: el.width }}
                  onPointerDown={(ev) => {
                    ev.stopPropagation();
                    setSelectedId(el.id);
                    dragModeRef.current = {
                      mode: 'move-element',
                      startScreen: { x: ev.clientX, y: ev.clientY },
                      startCam: camera,
                      originElement: el,
                    };
                  }}
                  className={`pointer-events-auto group absolute rounded-xl border p-3.5 shadow-sm cursor-move ${cardStyles[el.variant]} ${
                    selectedId === el.id ? 'ring-2 ring-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-semibold">{el.title}</div>
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onChangeElements(
                          elements.filter((item) => item.id !== el.id),
                          true
                        );
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Xoá ghi chú"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed opacity-90 whitespace-pre-wrap">
                    {el.body}
                  </p>
                </div>
              );
            }

            if (el.type === 'image') {
              return (
                <div
                  key={el.id}
                  style={{
                    left: el.x,
                    top: el.y,
                    width: el.width,
                    height: el.height,
                  }}
                  onPointerDown={(ev) => {
                    ev.stopPropagation();
                    setSelectedId(el.id);
                    dragModeRef.current = {
                      mode: 'move-element',
                      startScreen: { x: ev.clientX, y: ev.clientY },
                      startCam: camera,
                      originElement: el,
                    };
                  }}
                  className={`pointer-events-auto group absolute rounded-lg cursor-move ${
                    selectedId === el.id ? 'ring-2 ring-indigo-500' : 'hover:ring-1 hover:ring-slate-400'
                  }`}
                >
                  {el.caption && (
                    <div className="absolute -bottom-6 left-0 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white/90 dark:bg-slate-900/90 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {el.caption}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onChangeElements(
                        elements.filter((item) => item.id !== el.id),
                        true
                      );
                    }}
                    className="absolute -top-2.5 -right-2.5 hidden group-hover:flex p-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-500 shadow-sm"
                    title="Xoá hình ảnh"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <div
                    onPointerDown={(ev) => {
                      ev.stopPropagation();
                      dragModeRef.current = {
                        mode: 'resize-image',
                        startScreen: { x: ev.clientX, y: ev.clientY },
                        startCam: camera,
                        originElement: el,
                      };
                    }}
                    className="hidden group-hover:block absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-sm bg-indigo-600 border-2 border-white cursor-nwse-resize"
                    title="Kéo để đổi kích thước"
                  />
                </div>
              );
            }

            if (el.type === 'diagram' && selectedId === el.id) {
              return (
                <div
                  key={`${el.id}-handles`}
                  style={{
                    left: el.x,
                    top: el.y,
                    width: el.width,
                    height: el.height,
                  }}
                  className="pointer-events-none absolute"
                >
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onChangeElements(
                        elements.filter((item) => item.id !== el.id),
                        true
                      );
                      setSelectedId(null);
                    }}
                    className="pointer-events-auto absolute -top-3 -right-3 flex p-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-500 shadow-sm"
                    title="Xoá hình mẫu"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <div
                    onPointerDown={(ev) => {
                      ev.stopPropagation();
                      dragModeRef.current = {
                        mode: 'resize-image',
                        startScreen: { x: ev.clientX, y: ev.clientY },
                        startCam: camera,
                        originElement: el,
                      };
                    }}
                    className="pointer-events-auto absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-sm bg-indigo-600 border-2 border-white cursor-nwse-resize"
                    title="Kéo để phóng to / thu nhỏ hình"
                  />
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>

      {/* Interactive 2D Ruler Overlay */}
      {showRuler && !writeOnlyMode && (
        <div
          style={{
            left: rulerState.x,
            top: rulerState.y,
            transform: `translate(-50%, -50%) rotate(${rulerState.angle}deg)`,
          }}
          className="absolute z-20 w-[440px] h-14 rounded-lg border border-indigo-400/70 bg-amber-100/70 dark:bg-slate-800/80 shadow-md flex flex-col justify-between select-none"
        >
          <div className="flex justify-between px-3 pt-0.5">
            {Array.from({ length: 11 }).map((_, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-px h-3 bg-slate-800 dark:bg-slate-200" />
                <span className="text-[10px] font-mono tabular-nums text-slate-800 dark:text-slate-200">
                  {idx}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-3 pb-1.5 text-[10px] text-slate-700 dark:text-slate-300">
            <div
              onPointerDown={(ev) => {
                ev.stopPropagation();
                dragModeRef.current = {
                  mode: 'move-ruler',
                  startScreen: { x: ev.clientX, y: ev.clientY },
                  startCam: camera,
                  startToolTransform: { ...rulerState },
                };
              }}
              className="flex items-center gap-1 cursor-move px-1.5 py-0.5 rounded bg-white/60 dark:bg-slate-900/60"
            >
              <GripHorizontal className="w-3 h-3" />
              <span>Thước 10 cm · {Math.round(rulerState.angle)}°</span>
            </div>
            <button
              type="button"
              onPointerDown={(ev) => {
                ev.stopPropagation();
                dragModeRef.current = {
                  mode: 'rotate-ruler',
                  startScreen: { x: ev.clientX, y: ev.clientY },
                  startCam: camera,
                  startToolTransform: { ...rulerState },
                };
              }}
              className="p-1 rounded bg-indigo-600 text-white cursor-grab"
              title="Kéo để xoay thước"
            >
              <RotateCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive 2D Protractor Overlay */}
      {showProtractor && !writeOnlyMode && (
        <div
          style={{
            left: protractorState.x,
            top: protractorState.y,
            transform: `translate(-50%, -100%) rotate(${protractorState.angle}deg)`,
            transformOrigin: '50% 100%',
          }}
          className="absolute z-20 w-64 h-32 rounded-t-full border-2 border-sky-500/80 bg-sky-100/55 dark:bg-slate-800/75 shadow-md flex flex-col items-center justify-end pb-1.5 select-none"
        >
          <svg viewBox="0 0 200 100" className="absolute inset-0 w-full h-full pointer-events-none">
            {Array.from({ length: 19 }).map((_, i) => {
              const deg = i * 10;
              const rad = (deg * Math.PI) / 180;
              const x1 = 100 - Math.cos(rad) * 95;
              const y1 = 100 - Math.sin(rad) * 95;
              const x2 = 100 - Math.cos(rad) * (i % 3 === 0 ? 80 : 87);
              const y2 = 100 - Math.sin(rad) * (i % 3 === 0 ? 80 : 87);
              return (
                <line
                  key={deg}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeWidth={i % 3 === 0 ? 1.5 : 0.8}
                  className="text-slate-700 dark:text-slate-200"
                />
              );
            })}
            <circle cx="100" cy="100" r="3.5" fill="#0284c7" />
          </svg>
          <div className="relative z-10 flex items-center gap-2 text-[10px] font-mono tabular-nums text-slate-800 dark:text-slate-100">
            <span
              onPointerDown={(ev) => {
                ev.stopPropagation();
                dragModeRef.current = {
                  mode: 'move-protractor',
                  startScreen: { x: ev.clientX, y: ev.clientY },
                  startCam: camera,
                  startToolTransform: { ...protractorState },
                };
              }}
              className="px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900/80 cursor-move"
            >
              Đo góc · {Math.round(protractorState.angle)}°
            </span>
            <button
              type="button"
              onPointerDown={(ev) => {
                ev.stopPropagation();
                dragModeRef.current = {
                  mode: 'rotate-protractor',
                  startScreen: { x: ev.clientX, y: ev.clientY },
                  startCam: camera,
                  startToolTransform: { ...protractorState },
                };
              }}
              className="p-1 rounded bg-sky-600 text-white cursor-grab"
              title="Kéo để xoay thước đo góc"
            >
              <RotateCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Shape recognition notification */}
      {recognitionToast && (
        <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-30 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 shadow-md">
          {recognitionToast}
        </div>
      )}

      {/* Bottom-left Quick Undo / Zoom HUD */}
      {!writeOnlyMode && (
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-1 shadow-sm">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 transition-colors"
          title="Hoàn tác (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 transition-colors"
          title="Làm lại (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
        <button
          type="button"
          onClick={() =>
            onChangeCamera({ ...camera, zoom: Math.max(0.35, camera.zoom - 0.15) })
          }
          className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Thu nhỏ"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="px-1.5 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
          {Math.round(camera.zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() =>
            onChangeCamera({ ...camera, zoom: Math.min(3.5, camera.zoom + 0.15) })
          }
          className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Phóng to"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onChangeCamera({ x: 0, y: 0, zoom: 1 })}
          className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Đưa về gốc toạ độ"
        >
          <LocateFixed className="w-4 h-4" />
        </button>
      </div>
      )}
    </div>
  );
};
