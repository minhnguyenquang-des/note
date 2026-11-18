import type { ShapeKind, StrokePoint } from '../types/note';

export interface RecognizedShape {
  kind: ShapeKind;
  points: { x: number; y: number }[];
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function perpDistance(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return dist(p, a);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

function rdpSimplify(pts: { x: number; y: number }[], epsilon: number): { x: number; y: number }[] {
  if (pts.length <= 2) return pts;
  let maxDist = 0;
  let maxIdx = 0;
  const first = pts[0];
  const last = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDistance(pts[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }
  if (maxDist > epsilon) {
    const left = rdpSimplify(pts.slice(0, maxIdx + 1), epsilon);
    const right = rdpSimplify(pts.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

export function snapAngle15(
  start: { x: number; y: number },
  end: { x: number; y: number }
): { x: number; y: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 6) return end;
  const angle = Math.atan2(dy, dx);
  const step = Math.PI / 12; // 15 degrees
  const snapped = Math.round(angle / step) * step;
  if (Math.abs(angle - snapped) < 0.12) {
    return {
      x: start.x + Math.cos(snapped) * len,
      y: start.y + Math.sin(snapped) * len,
    };
  }
  return end;
}

/**
 * Recognizes freehand ink into clean 2D geometry primitives:
 * straight line segment, circle, triangle, or rectangle.
 */
export function recognizeShape(raw: StrokePoint[]): RecognizedShape | null {
  if (raw.length < 6) return null;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  let pathLen = 0;
  for (let i = 0; i < raw.length; i++) {
    const p = raw[i];
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
    if (i > 0) pathLen += dist(raw[i - 1], p);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const diag = Math.hypot(width, height);
  if (diag < 28 || pathLen < 28) return null;

  const start = raw[0];
  const end = raw[raw.length - 1];
  const endToEnd = dist(start, end);

  // 1. Straight line check: endToEnd / pathLen close to 1 and low perpendicular deviation
  if (endToEnd / pathLen > 0.88 && endToEnd > diag * 0.75) {
    let maxDev = 0;
    for (const p of raw) {
      const d = perpDistance(p, start, end);
      if (d > maxDev) maxDev = d;
    }
    if (maxDev < Math.max(14, diag * 0.08)) {
      const snappedEnd = snapAngle15(start, end);
      return {
        kind: 'line',
        points: [
          { x: start.x, y: start.y },
          { x: snappedEnd.x, y: snappedEnd.y },
        ],
      };
    }
  }

  // Closed shapes check
  const isClosed = endToEnd < Math.max(42, diag * 0.28);
  if (!isClosed) return null;

  // 2. Circle check: uniform radius around centroid
  const cx = raw.reduce((s, p) => s + p.x, 0) / raw.length;
  const cy = raw.reduce((s, p) => s + p.y, 0) / raw.length;
  const center = { x: cx, y: cy };
  const radii = raw.map((p) => dist(p, center));
  const avgR = radii.reduce((s, r) => s + r, 0) / radii.length;
  const stdR = Math.sqrt(
    radii.reduce((s, r) => s + (r - avgR) * (r - avgR), 0) / radii.length
  );
  if (avgR > 16 && stdR / avgR < 0.14 && Math.abs(width - height) / Math.max(width, height) < 0.25) {
    return {
      kind: 'circle',
      points: [center, { x: center.x + avgR, y: center.y }],
    };
  }

  // 3. Polygon simplification via RDP (triangle or rectangle)
  const closedPts = [...raw.map((p) => ({ x: p.x, y: p.y })), { x: start.x, y: start.y }];
  const simplified = rdpSimplify(closedPts, Math.max(12, diag * 0.065));
  // Remove closing duplicate vertex
  const vertices =
    simplified.length > 2 && dist(simplified[0], simplified[simplified.length - 1]) < Math.max(24, diag * 0.12)
      ? simplified.slice(0, -1)
      : simplified;

  if (vertices.length === 3) {
    return {
      kind: 'triangle',
      points: vertices,
    };
  }

  if (vertices.length === 4) {
    // Check if near axis-aligned rectangle
    const rectArea = width * height;
    // Compute polygon area
    let polyArea = 0;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      polyArea += vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
    }
    polyArea = Math.abs(polyArea) / 2;
    if (polyArea / Math.max(1, rectArea) > 0.72) {
      return {
        kind: 'rect',
        points: [
          { x: minX, y: minY },
          { x: maxX, y: maxY },
        ],
      };
    }
  }

  return null;
}

export interface SnapResult {
  x: number;
  y: number;
  snappedType: 'vertex' | 'midpoint' | 'grid' | null;
}

export function findSnapPoint(
  pos: { x: number; y: number },
  anchors: { x: number; y: number; kind: 'vertex' | 'midpoint' }[],
  gridSize: number,
  enableGridSnap: boolean
): SnapResult {
  const threshold = 14;
  let bestDist = threshold;
  let best: SnapResult = { x: pos.x, y: pos.y, snappedType: null };

  for (const a of anchors) {
    const d = Math.hypot(pos.x - a.x, pos.y - a.y);
    if (d < bestDist) {
      bestDist = d;
      best = { x: a.x, y: a.y, snappedType: a.kind };
    }
  }

  if (best.snappedType) return best;

  if (enableGridSnap && gridSize > 4) {
    const gx = Math.round(pos.x / gridSize) * gridSize;
    const gy = Math.round(pos.y / gridSize) * gridSize;
    if (Math.hypot(pos.x - gx, pos.y - gy) < 8) {
      return { x: gx, y: gy, snappedType: 'grid' };
    }
  }

  return best;
}
