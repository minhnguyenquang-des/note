import type {
  DiagramArc,
  DiagramCircle,
  DiagramCurve,
  DiagramDot,
  DiagramLine,
} from '../types/note';

export type ShapeCategory =
  | 'Tất cả'
  | 'Cơ bản & Góc'
  | 'Tam giác'
  | 'Tứ giác & Đa giác'
  | 'Đường tròn & Đồ thị'
  | 'Hình chóp & Tứ diện'
  | 'Lăng trụ & Tròn xoay';

export interface ShapeTemplate {
  id: string;
  name: string;
  category: Exclude<ShapeCategory, 'Tất cả'>;
  defaultWidth?: number;
  defaultHeight?: number;
  lines: DiagramLine[];
  circles?: DiagramCircle[];
  arcs?: DiagramArc[];
  dots?: DiagramDot[];
  curves?: DiagramCurve[];
}

export const SHAPE_CATEGORIES: ShapeCategory[] = [
  'Tất cả',
  'Cơ bản & Góc',
  'Tam giác',
  'Tứ giác & Đa giác',
  'Đường tròn & Đồ thị',
  'Hình chóp & Tứ diện',
  'Lăng trụ & Tròn xoay',
];

function polyLines(
  pts: [number, number][],
  dashedIndices: number[] = []
): DiagramLine[] {
  const out: DiagramLine[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    out.push({
      x1: a[0],
      y1: a[1],
      x2: b[0],
      y2: b[1],
      dashed: dashedIndices.includes(i),
    });
  }
  return out;
}

function regularPolygonPts(n: number, cx = 0.5, cy = 0.5, r = 0.36, rot = -Math.PI / 2): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i * Math.PI * 2) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
}

function sampleCurve(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  steps: number,
  mapX: (x: number) => number,
  mapY: (y: number) => number
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = xMin + (i / steps) * (xMax - xMin);
    const y = fn(x);
    const px = mapX(x);
    const py = mapY(y);
    if (py >= 0.05 && py <= 0.95) {
      pts.push([px, py]);
    }
  }
  return pts;
}

export const SHAPE_TEMPLATES_100: ShapeTemplate[] = [
  // ==================== 1. CƠ BẢN & GÓC (14) ====================
  {
    id: 'basic-point',
    name: 'Điểm A',
    category: 'Cơ bản & Góc',
    defaultWidth: 120,
    defaultHeight: 100,
    lines: [],
    dots: [{ x: 0.5, y: 0.5, label: 'A', dx: 8, dy: -8 }],
  },
  {
    id: 'basic-segment',
    name: 'Đoạn thẳng AB',
    category: 'Cơ bản & Góc',
    lines: [{ x1: 0.14, y1: 0.5, x2: 0.86, y2: 0.5 }],
    dots: [
      { x: 0.14, y: 0.5, label: 'A', dx: -4, dy: -10 },
      { x: 0.86, y: 0.5, label: 'B', dx: -4, dy: -10 },
    ],
  },
  {
    id: 'basic-ray',
    name: 'Tia Ox',
    category: 'Cơ bản & Góc',
    lines: [
      { x1: 0.15, y1: 0.55, x2: 0.88, y2: 0.42 },
      { x1: 0.82, y1: 0.39, x2: 0.88, y2: 0.42 },
      { x1: 0.83, y1: 0.46, x2: 0.88, y2: 0.42 },
    ],
    dots: [{ x: 0.15, y: 0.55, label: 'O', dx: -6, dy: 14 }],
  },
  {
    id: 'basic-line',
    name: 'Đường thẳng d',
    category: 'Cơ bản & Góc',
    lines: [{ x1: 0.08, y1: 0.65, x2: 0.92, y2: 0.35 }],
    dots: [{ x: 0.86, y: 0.37, label: 'd', dx: 4, dy: -10 }],
  },
  {
    id: 'basic-parallel',
    name: 'Hai đường song song',
    category: 'Cơ bản & Góc',
    lines: [
      { x1: 0.1, y1: 0.34, x2: 0.9, y2: 0.34 },
      { x1: 0.1, y1: 0.66, x2: 0.9, y2: 0.66 },
    ],
    dots: [
      { x: 0.14, y: 0.34, label: 'a', dx: 0, dy: -10 },
      { x: 0.14, y: 0.66, label: 'b', dx: 0, dy: 14 },
    ],
  },
  {
    id: 'basic-perp',
    name: 'Hai đường vuông góc',
    category: 'Cơ bản & Góc',
    lines: [
      { x1: 0.12, y1: 0.68, x2: 0.88, y2: 0.68 },
      { x1: 0.5, y1: 0.14, x2: 0.5, y2: 0.86 },
      { x1: 0.5, y1: 0.58, x2: 0.6, y2: 0.58, accent: true },
      { x1: 0.6, y1: 0.58, x2: 0.6, y2: 0.68, accent: true },
    ],
  },
  {
    id: 'basic-intersect',
    name: 'Hai đường cắt nhau',
    category: 'Cơ bản & Góc',
    lines: [
      { x1: 0.12, y1: 0.72, x2: 0.88, y2: 0.28 },
      { x1: 0.16, y1: 0.24, x2: 0.84, y2: 0.76 },
    ],
    dots: [{ x: 0.5, y: 0.5, label: 'I', dx: 8, dy: -8 }],
  },
  {
    id: 'angle-acute',
    name: 'Góc nhọn',
    category: 'Cơ bản & Góc',
    lines: [
      { x1: 0.18, y1: 0.74, x2: 0.86, y2: 0.74 },
      { x1: 0.18, y1: 0.74, x2: 0.72, y2: 0.24 },
    ],
    arcs: [{ cx: 0.18, cy: 0.74, r: 0.18, startAngle: -0.74, endAngle: 0, accent: true }],
    dots: [{ x: 0.18, y: 0.74, label: 'O', dx: -12, dy: 12 }],
  },
  {
    id: 'angle-right',
    name: 'Góc vuông',
    category: 'Cơ bản & Góc',
    lines: [
      { x1: 0.22, y1: 0.78, x2: 0.86, y2: 0.78 },
      { x1: 0.22, y1: 0.78, x2: 0.22, y2: 0.18 },
      { x1: 0.22, y1: 0.66, x2: 0.34, y2: 0.66, accent: true },
      { x1: 0.34, y1: 0.66, x2: 0.34, y2: 0.78, accent: true },
    ],
    dots: [{ x: 0.22, y: 0.78 }],
  },
  {
    id: 'angle-obtuse',
    name: 'Góc tù',
    category: 'Cơ bản & Góc',
    lines: [
      { x1: 0.44, y1: 0.74, x2: 0.9, y2: 0.74 },
      { x1: 0.44, y1: 0.74, x2: 0.14, y2: 0.28 },
    ],
    arcs: [{ cx: 0.44, cy: 0.74, r: 0.16, startAngle: -2.15, endAngle: 0, accent: true }],
    dots: [{ x: 0.44, y: 0.74, label: 'O', dx: -4, dy: 14 }],
  },
  {
    id: 'angle-straight',
    name: 'Góc bẹt',
    category: 'Cơ bản & Góc',
    lines: [{ x1: 0.1, y1: 0.62, x2: 0.9, y2: 0.62 }],
    arcs: [{ cx: 0.5, cy: 0.62, r: 0.16, startAngle: -Math.PI, endAngle: 0, accent: true }],
    dots: [{ x: 0.5, y: 0.62, label: 'O', dx: -4, dy: 14 }],
  },
  {
    id: 'angle-supplementary',
    name: 'Hai góc kề bù',
    category: 'Cơ bản & Góc',
    lines: [
      { x1: 0.1, y1: 0.72, x2: 0.9, y2: 0.72 },
      { x1: 0.48, y1: 0.72, x2: 0.74, y2: 0.26 },
    ],
    arcs: [
      { cx: 0.48, cy: 0.72, r: 0.14, startAngle: -1.05, endAngle: 0, accent: true },
      { cx: 0.48, cy: 0.72, r: 0.18, startAngle: -Math.PI, endAngle: -1.05 },
    ],
    dots: [{ x: 0.48, y: 0.72 }],
  },
  {
    id: 'angle-vertical',
    name: 'Hai góc đối đỉnh',
    category: 'Cơ bản & Góc',
    lines: [
      { x1: 0.12, y1: 0.76, x2: 0.88, y2: 0.24 },
      { x1: 0.12, y1: 0.24, x2: 0.88, y2: 0.76 },
    ],
    arcs: [
      { cx: 0.5, cy: 0.5, r: 0.16, startAngle: -0.6, endAngle: 0.6, accent: true },
      { cx: 0.5, cy: 0.5, r: 0.16, startAngle: Math.PI - 0.6, endAngle: Math.PI + 0.6, accent: true },
    ],
  },
  {
    id: 'angle-bisector',
    name: 'Tia phân giác góc',
    category: 'Cơ bản & Góc',
    lines: [
      { x1: 0.16, y1: 0.76, x2: 0.86, y2: 0.76 },
      { x1: 0.16, y1: 0.76, x2: 0.68, y2: 0.22 },
      { x1: 0.16, y1: 0.76, x2: 0.82, y2: 0.48, dashed: true, accent: true },
    ],
    arcs: [{ cx: 0.16, cy: 0.76, r: 0.18, startAngle: -0.8, endAngle: 0, accent: true }],
  },

  // ==================== 2. TAM GIÁC (18) ====================
  {
    id: 'tri-scalene',
    name: 'Tam giác thường ABC',
    category: 'Tam giác',
    lines: polyLines([[0.36, 0.18], [0.14, 0.82], [0.86, 0.82]]),
    dots: [
      { x: 0.36, y: 0.18, label: 'A', dx: -4, dy: -8 },
      { x: 0.14, y: 0.82, label: 'B', dx: -12, dy: 8 },
      { x: 0.86, y: 0.82, label: 'C', dx: 6, dy: 8 },
    ],
  },
  {
    id: 'tri-acute',
    name: 'Tam giác nhọn',
    category: 'Tam giác',
    lines: polyLines([[0.54, 0.16], [0.16, 0.82], [0.84, 0.82]]),
  },
  {
    id: 'tri-obtuse',
    name: 'Tam giác tù',
    category: 'Tam giác',
    lines: polyLines([[0.18, 0.22], [0.32, 0.8], [0.88, 0.8]]),
  },
  {
    id: 'tri-right-h',
    name: 'Tam giác vuông ngang',
    category: 'Tam giác',
    lines: [
      ...polyLines([[0.2, 0.2], [0.2, 0.82], [0.86, 0.82]]),
      { x1: 0.2, y1: 0.72, x2: 0.3, y2: 0.72, accent: true },
      { x1: 0.3, y1: 0.72, x2: 0.3, y2: 0.82, accent: true },
    ],
    dots: [
      { x: 0.2, y: 0.2, label: 'B', dx: -12, dy: -4 },
      { x: 0.2, y: 0.82, label: 'A', dx: -12, dy: 10 },
      { x: 0.86, y: 0.82, label: 'C', dx: 6, dy: 10 },
    ],
  },
  {
    id: 'tri-right-top',
    name: 'Tam giác vuông tại A',
    category: 'Tam giác',
    lines: [
      ...polyLines([[0.36, 0.26], [0.14, 0.8], [0.86, 0.8]]),
      { x1: 0.31, y1: 0.38, x2: 0.42, y2: 0.43, accent: true },
      { x1: 0.42, y1: 0.43, x2: 0.47, y2: 0.32, accent: true },
    ],
  },
  {
    id: 'tri-right-iso',
    name: 'Tam giác vuông cân',
    category: 'Tam giác',
    lines: [
      ...polyLines([[0.24, 0.2], [0.24, 0.82], [0.86, 0.82]]),
      { x1: 0.24, y1: 0.72, x2: 0.34, y2: 0.72, accent: true },
      { x1: 0.34, y1: 0.72, x2: 0.34, y2: 0.82, accent: true },
      { x1: 0.2, y1: 0.51, x2: 0.28, y2: 0.51, accent: true },
      { x1: 0.55, y1: 0.78, x2: 0.55, y2: 0.86, accent: true },
    ],
  },
  {
    id: 'tri-isosceles',
    name: 'Tam giác cân tại A',
    category: 'Tam giác',
    lines: [
      ...polyLines([[0.5, 0.16], [0.2, 0.84], [0.8, 0.84]]),
      { x1: 0.31, y1: 0.48, x2: 0.39, y2: 0.52, accent: true },
      { x1: 0.69, y1: 0.48, x2: 0.61, y2: 0.52, accent: true },
    ],
    dots: [
      { x: 0.5, y: 0.16, label: 'A', dx: -4, dy: -8 },
      { x: 0.2, y: 0.84, label: 'B', dx: -12, dy: 8 },
      { x: 0.8, y: 0.84, label: 'C', dx: 6, dy: 8 },
    ],
  },
  {
    id: 'tri-equilateral',
    name: 'Tam giác đều ABC',
    category: 'Tam giác',
    lines: [
      ...polyLines([[0.5, 0.18], [0.16, 0.82], [0.84, 0.82]]),
      { x1: 0.3, y1: 0.48, x2: 0.36, y2: 0.52, accent: true },
      { x1: 0.7, y1: 0.48, x2: 0.64, y2: 0.52, accent: true },
      { x1: 0.5, y1: 0.78, x2: 0.5, y2: 0.86, accent: true },
    ],
  },
  {
    id: 'tri-altitude',
    name: 'Tam giác + Đường cao AH',
    category: 'Tam giác',
    lines: [
      ...polyLines([[0.4, 0.16], [0.14, 0.82], [0.86, 0.82]]),
      { x1: 0.4, y1: 0.16, x2: 0.4, y2: 0.82, dashed: true, accent: true },
      { x1: 0.4, y1: 0.73, x2: 0.49, y2: 0.73, accent: true },
      { x1: 0.49, y1: 0.73, x2: 0.49, y2: 0.82, accent: true },
    ],
    dots: [
      { x: 0.4, y: 0.16, label: 'A', dx: -4, dy: -8 },
      { x: 0.4, y: 0.82, label: 'H', dx: -4, dy: 14 },
    ],
  },
  {
    id: 'tri-orthocenter',
    name: 'Trực tâm H (3 đường cao)',
    category: 'Tam giác',
    lines: [
      ...polyLines([[0.42, 0.16], [0.14, 0.82], [0.86, 0.82]]),
      { x1: 0.42, y1: 0.16, x2: 0.42, y2: 0.82, dashed: true, accent: true },
      { x1: 0.14, y1: 0.82, x2: 0.58, y2: 0.4, dashed: true, accent: true },
      { x1: 0.86, y1: 0.82, x2: 0.31, y2: 0.42, dashed: true, accent: true },
    ],
    dots: [{ x: 0.42, y: 0.56, label: 'H', dx: 6, dy: -6 }],
  },
  {
    id: 'tri-median',
    name: 'Tam giác + Trung tuyến AM',
    category: 'Tam giác',
    lines: [
      ...polyLines([[0.36, 0.18], [0.14, 0.82], [0.86, 0.82]]),
      { x1: 0.36, y1: 0.18, x2: 0.5, y2: 0.82, accent: true },
    ],
    dots: [
      { x: 0.36, y: 0.18, label: 'A', dx: -4, dy: -8 },
      { x: 0.5, y: 0.82, label: 'M', dx: -4, dy: 14 },
    ],
  },
  {
    id: 'tri-centroid',
    name: 'Trọng tâm G (3 trung tuyến)',
    category: 'Tam giác',
    lines: [
      ...polyLines([[0.42, 0.16], [0.14, 0.82], [0.86, 0.82]]),
      { x1: 0.42, y1: 0.16, x2: 0.5, y2: 0.82, dashed: true, accent: true },
      { x1: 0.14, y1: 0.82, x2: 0.64, y2: 0.49, dashed: true, accent: true },
      { x1: 0.86, y1: 0.82, x2: 0.28, y2: 0.49, dashed: true, accent: true },
    ],
    dots: [{ x: 0.473, y: 0.6, label: 'G', dx: 6, dy: -6 }],
  },
  {
    id: 'tri-midsegment',
    name: 'Đường trung bình MN',
    category: 'Tam giác',
    lines: [
      ...polyLines([[0.42, 0.16], [0.14, 0.82], [0.86, 0.82]]),
      { x1: 0.28, y1: 0.49, x2: 0.64, y2: 0.49, accent: true },
    ],
    dots: [
      { x: 0.28, y: 0.49, label: 'M', dx: -14, dy: 2 },
      { x: 0.64, y: 0.49, label: 'N', dx: 6, dy: 2 },
    ],
  },
  {
    id: 'tri-bisector',
    name: 'Đường phân giác AD',
    category: 'Tam giác',
    lines: [
      ...polyLines([[0.38, 0.16], [0.14, 0.82], [0.86, 0.82]]),
      { x1: 0.38, y1: 0.16, x2: 0.44, y2: 0.82, accent: true },
    ],
    arcs: [{ cx: 0.38, cy: 0.16, r: 0.14, startAngle: 1.0, endAngle: 1.92, accent: true }],
    dots: [{ x: 0.44, y: 0.82, label: 'D', dx: -4, dy: 14 }],
  },
  {
    id: 'tri-circumcenter',
    name: 'Đường tròn ngoại tiếp △',
    category: 'Tam giác',
    lines: polyLines([[0.5, 0.15], [0.2, 0.68], [0.8, 0.68]]),
    circles: [{ cx: 0.5, cy: 0.5, r: 0.35, accent: true }],
    dots: [{ x: 0.5, cy: 0.5, y: 0.5, label: 'O', dx: 6, dy: -6 } as DiagramDot],
  },
  {
    id: 'tri-incircle',
    name: 'Đường tròn nội tiếp △',
    category: 'Tam giác',
    lines: polyLines([[0.5, 0.16], [0.16, 0.82], [0.84, 0.82]]),
    circles: [{ cx: 0.5, cy: 0.61, r: 0.21, accent: true }],
    dots: [{ x: 0.5, y: 0.61, label: 'I', dx: 6, dy: -4 }],
  },
  {
    id: 'tri-metric',
    name: 'Hệ thức lượng △ vuông',
    category: 'Tam giác',
    lines: [
      ...polyLines([[0.36, 0.28], [0.12, 0.78], [0.88, 0.78]]),
      { x1: 0.36, y1: 0.28, x2: 0.36, y2: 0.78, accent: true },
      { x1: 0.36, y1: 0.69, x2: 0.45, y2: 0.69, accent: true },
      { x1: 0.45, y1: 0.69, x2: 0.45, y2: 0.78, accent: true },
    ],
    dots: [
      { x: 0.36, y: 0.28, label: 'A', dx: -4, dy: -8 },
      { x: 0.36, y: 0.78, label: 'H', dx: -4, dy: 14 },
    ],
  },
  {
    id: 'tri-similar',
    name: 'Hai tam giác đồng dạng',
    category: 'Tam giác',
    lines: [
      ...polyLines([[0.28, 0.22], [0.1, 0.8], [0.46, 0.8]]),
      ...polyLines([[0.72, 0.36], [0.58, 0.8], [0.9, 0.8]]),
    ],
  },

  // ==================== 3. TỨ GIÁC & ĐA GIÁC (18) ====================
  {
    id: 'quad-square',
    name: 'Hình vuông ABCD',
    category: 'Tứ giác & Đa giác',
    lines: polyLines([[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]]),
    dots: [
      { x: 0.2, y: 0.2, label: 'A', dx: -12, dy: -6 },
      { x: 0.8, y: 0.2, label: 'B', dx: 6, dy: -6 },
      { x: 0.8, y: 0.8, label: 'C', dx: 6, dy: 10 },
      { x: 0.2, y: 0.8, label: 'D', dx: -12, dy: 10 },
    ],
  },
  {
    id: 'quad-square-diag',
    name: 'Hình vuông + 2 đường chéo',
    category: 'Tứ giác & Đa giác',
    lines: [
      ...polyLines([[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]]),
      { x1: 0.2, y1: 0.2, x2: 0.8, y2: 0.8, dashed: true, accent: true },
      { x1: 0.8, y1: 0.2, x2: 0.2, y2: 0.8, dashed: true, accent: true },
    ],
    dots: [{ x: 0.5, y: 0.5, label: 'O', dx: 8, dy: -6 }],
  },
  {
    id: 'quad-rect',
    name: 'Hình chữ nhật ABCD',
    category: 'Tứ giác & Đa giác',
    lines: polyLines([[0.14, 0.26], [0.86, 0.26], [0.86, 0.74], [0.14, 0.74]]),
  },
  {
    id: 'quad-rect-diag',
    name: 'Chữ nhật + 2 đường chéo',
    category: 'Tứ giác & Đa giác',
    lines: [
      ...polyLines([[0.14, 0.26], [0.86, 0.26], [0.86, 0.74], [0.14, 0.74]]),
      { x1: 0.14, y1: 0.26, x2: 0.86, y2: 0.74, dashed: true, accent: true },
      { x1: 0.86, y1: 0.26, x2: 0.14, y2: 0.74, dashed: true, accent: true },
    ],
  },
  {
    id: 'quad-parallelogram',
    name: 'Hình bình hành ABCD',
    category: 'Tứ giác & Đa giác',
    lines: polyLines([[0.28, 0.26], [0.88, 0.26], [0.72, 0.74], [0.12, 0.74]]),
  },
  {
    id: 'quad-parallelogram-diag',
    name: 'Hình bình hành + 2 chéo',
    category: 'Tứ giác & Đa giác',
    lines: [
      ...polyLines([[0.28, 0.26], [0.88, 0.26], [0.72, 0.74], [0.12, 0.74]]),
      { x1: 0.28, y1: 0.26, x2: 0.72, y2: 0.74, dashed: true, accent: true },
      { x1: 0.88, y1: 0.26, x2: 0.12, y2: 0.74, dashed: true, accent: true },
    ],
    dots: [{ x: 0.5, y: 0.5, label: 'O', dx: 8, dy: -6 }],
  },
  {
    id: 'quad-rhombus',
    name: 'Hình thoi ABCD',
    category: 'Tứ giác & Đa giác',
    lines: polyLines([[0.5, 0.14], [0.84, 0.5], [0.5, 0.86], [0.16, 0.5]]),
  },
  {
    id: 'quad-rhombus-diag',
    name: 'Hình thoi + 2 chéo ⊥',
    category: 'Tứ giác & Đa giác',
    lines: [
      ...polyLines([[0.5, 0.14], [0.84, 0.5], [0.5, 0.86], [0.16, 0.5]]),
      { x1: 0.5, y1: 0.14, x2: 0.5, y2: 0.86, dashed: true, accent: true },
      { x1: 0.16, y1: 0.5, x2: 0.84, y2: 0.5, dashed: true, accent: true },
      { x1: 0.5, y1: 0.42, x2: 0.58, y2: 0.42, accent: true },
      { x1: 0.58, y1: 0.42, x2: 0.58, y2: 0.5, accent: true },
    ],
  },
  {
    id: 'quad-trapezoid',
    name: 'Hình thang thường',
    category: 'Tứ giác & Đa giác',
    lines: polyLines([[0.28, 0.24], [0.68, 0.24], [0.88, 0.78], [0.12, 0.78]]),
  },
  {
    id: 'quad-trapezoid-right',
    name: 'Hình thang vuông',
    category: 'Tứ giác & Đa giác',
    lines: [
      ...polyLines([[0.18, 0.24], [0.62, 0.24], [0.86, 0.78], [0.18, 0.78]]),
      { x1: 0.18, y1: 0.68, x2: 0.28, y2: 0.68, accent: true },
      { x1: 0.28, y1: 0.68, x2: 0.28, y2: 0.78, accent: true },
    ],
  },
  {
    id: 'quad-trapezoid-iso',
    name: 'Hình thang cân',
    category: 'Tứ giác & Đa giác',
    lines: [
      ...polyLines([[0.28, 0.24], [0.72, 0.24], [0.88, 0.78], [0.12, 0.78]]),
      { x1: 0.16, y1: 0.5, x2: 0.24, y2: 0.52, accent: true },
      { x1: 0.84, y1: 0.5, x2: 0.76, y2: 0.52, accent: true },
    ],
  },
  {
    id: 'quad-trapezoid-mid',
    name: 'Hình thang + Trung bình MN',
    category: 'Tứ giác & Đa giác',
    lines: [
      ...polyLines([[0.28, 0.24], [0.68, 0.24], [0.88, 0.78], [0.12, 0.78]]),
      { x1: 0.2, y1: 0.51, x2: 0.78, y2: 0.51, dashed: true, accent: true },
    ],
    dots: [
      { x: 0.2, y: 0.51, label: 'M', dx: -14, dy: 2 },
      { x: 0.78, y: 0.51, label: 'N', dx: 6, dy: 2 },
    ],
  },
  {
    id: 'quad-convex',
    name: 'Tứ giác lồi bất kỳ',
    category: 'Tứ giác & Đa giác',
    lines: polyLines([[0.24, 0.22], [0.76, 0.18], [0.86, 0.76], [0.16, 0.82]]),
  },
  {
    id: 'quad-concave',
    name: 'Tứ giác lõm',
    category: 'Tứ giác & Đa giác',
    lines: polyLines([[0.5, 0.16], [0.84, 0.82], [0.5, 0.56], [0.16, 0.82]]),
  },
  {
    id: 'quad-cyclic',
    name: 'Tứ giác nội tiếp',
    category: 'Tứ giác & Đa giác',
    lines: polyLines([[0.32, 0.2], [0.74, 0.25], [0.82, 0.64], [0.22, 0.7]]),
    circles: [{ cx: 0.5, cy: 0.5, r: 0.35, accent: true }],
  },
  {
    id: 'poly-pentagon',
    name: 'Ngũ giác đều',
    category: 'Tứ giác & Đa giác',
    lines: polyLines(regularPolygonPts(5)),
  },
  {
    id: 'poly-hexagon',
    name: 'Lục giác đều',
    category: 'Tứ giác & Đa giác',
    lines: polyLines(regularPolygonPts(6)),
  },
  {
    id: 'poly-octagon',
    name: 'Bát giác đều',
    category: 'Tứ giác & Đa giác',
    lines: polyLines(regularPolygonPts(8, 0.5, 0.5, 0.36, -Math.PI / 8)),
  },

  // ==================== 4. ĐƯỜNG TRÒN & ĐỒ THỊ (18) ====================
  {
    id: 'circle-basic',
    name: 'Đường tròn tâm O',
    category: 'Đường tròn & Đồ thị',
    lines: [{ x1: 0.5, y1: 0.5, x2: 0.84, y2: 0.5, dashed: true, accent: true }],
    circles: [{ cx: 0.5, cy: 0.5, r: 0.34 }],
    dots: [{ x: 0.5, y: 0.5, label: 'O', dx: -12, dy: -6 }],
  },
  {
    id: 'circle-diameter',
    name: 'Đường tròn + Đường kính AB',
    category: 'Đường tròn & Đồ thị',
    lines: [{ x1: 0.16, y1: 0.5, x2: 0.84, y2: 0.5, accent: true }],
    circles: [{ cx: 0.5, cy: 0.5, r: 0.34 }],
    dots: [
      { x: 0.5, y: 0.5, label: 'O', dx: -4, dy: -10 },
      { x: 0.16, y: 0.5, label: 'A', dx: -14, dy: 4 },
      { x: 0.84, y: 0.5, label: 'B', dx: 6, dy: 4 },
    ],
  },
  {
    id: 'circle-chord',
    name: 'Dây cung AB & Khoảng cách OH',
    category: 'Đường tròn & Đồ thị',
    lines: [
      { x1: 0.24, y1: 0.28, x2: 0.76, y2: 0.28 },
      { x1: 0.5, y1: 0.5, x2: 0.5, y2: 0.28, dashed: true, accent: true },
    ],
    circles: [{ cx: 0.5, cy: 0.5, r: 0.34 }],
    dots: [
      { x: 0.5, y: 0.5, label: 'O', dx: -4, dy: 14 },
      { x: 0.5, y: 0.28, label: 'H', dx: -4, dy: -10 },
    ],
  },
  {
    id: 'circle-tangent',
    name: 'Tiếp tuyến đường tròn',
    category: 'Đường tròn & Đồ thị',
    lines: [
      { x1: 0.5, y1: 0.5, x2: 0.5, y2: 0.22, dashed: true, accent: true },
      { x1: 0.12, y1: 0.22, x2: 0.88, y2: 0.22, accent: true },
    ],
    circles: [{ cx: 0.5, cy: 0.5, r: 0.28 }],
    dots: [
      { x: 0.5, y: 0.5, label: 'O', dx: -4, dy: 14 },
      { x: 0.5, y: 0.22, label: 'M', dx: -4, dy: -10 },
    ],
  },
  {
    id: 'circle-2tangents',
    name: 'Hai tiếp tuyến cắt nhau',
    category: 'Đường tròn & Đồ thị',
    lines: [
      { x1: 0.14, y1: 0.5, x2: 0.47, y2: 0.24 },
      { x1: 0.14, y1: 0.5, x2: 0.47, y2: 0.76 },
      { x1: 0.58, y1: 0.5, x2: 0.47, y2: 0.24, dashed: true, accent: true },
      { x1: 0.58, y1: 0.5, x2: 0.47, y2: 0.76, dashed: true, accent: true },
    ],
    circles: [{ cx: 0.58, cy: 0.5, r: 0.28 }],
    dots: [
      { x: 0.14, y: 0.5, label: 'M', dx: -14, dy: 4 },
      { x: 0.58, y: 0.5, label: 'O', dx: 6, dy: 4 },
    ],
  },
  {
    id: 'circle-inscribed-angle',
    name: 'Góc nội tiếp chắn cung',
    category: 'Đường tròn & Đồ thị',
    lines: [
      { x1: 0.5, y1: 0.16, x2: 0.24, y2: 0.72 },
      { x1: 0.5, y1: 0.16, x2: 0.78, y2: 0.7 },
    ],
    circles: [{ cx: 0.5, cy: 0.5, r: 0.34 }],
    dots: [{ x: 0.5, y: 0.5, label: 'O', dx: 6, dy: 4 }],
  },
  {
    id: 'circle-central-angle',
    name: 'Góc ở tâm',
    category: 'Đường tròn & Đồ thị',
    lines: [
      { x1: 0.5, y1: 0.5, x2: 0.8, y2: 0.34, accent: true },
      { x1: 0.5, y1: 0.5, x2: 0.78, y2: 0.7, accent: true },
    ],
    circles: [{ cx: 0.5, cy: 0.5, r: 0.34 }],
    arcs: [{ cx: 0.5, cy: 0.5, r: 0.12, startAngle: -0.5, endAngle: 0.62, accent: true }],
  },
  {
    id: 'circle-arc',
    name: 'Cung tròn',
    category: 'Đường tròn & Đồ thị',
    lines: [],
    arcs: [{ cx: 0.5, cy: 0.72, r: 0.42, startAngle: -Math.PI * 0.85, endAngle: -Math.PI * 0.15 }],
  },
  {
    id: 'circle-sector',
    name: 'Hình quạt tròn',
    category: 'Đường tròn & Đồ thị',
    lines: [
      { x1: 0.5, y1: 0.76, x2: 0.2, y2: 0.36 },
      { x1: 0.5, y1: 0.76, x2: 0.8, y2: 0.36 },
    ],
    arcs: [{ cx: 0.5, cy: 0.76, r: 0.5, startAngle: -2.21, endAngle: -0.93 }],
    dots: [{ x: 0.5, y: 0.76, label: 'O', dx: -4, dy: 14 }],
  },
  {
    id: 'circle-annulus',
    name: 'Hình vành khăn',
    category: 'Đường tròn & Đồ thị',
    lines: [],
    circles: [
      { cx: 0.5, cy: 0.5, r: 0.36 },
      { cx: 0.5, cy: 0.5, r: 0.18, accent: true },
    ],
  },
  {
    id: 'circle-2intersect',
    name: 'Hai đường tròn cắt nhau',
    category: 'Đường tròn & Đồ thị',
    lines: [{ x1: 0.36, y1: 0.5, x2: 0.64, y2: 0.5, dashed: true, accent: true }],
    circles: [
      { cx: 0.36, cy: 0.5, r: 0.25 },
      { cx: 0.64, cy: 0.5, r: 0.25 },
    ],
  },
  {
    id: 'circle-tangent-ext',
    name: 'Tiếp xúc ngoài',
    category: 'Đường tròn & Đồ thị',
    lines: [{ x1: 0.3, y1: 0.5, x2: 0.72, y2: 0.5, dashed: true, accent: true }],
    circles: [
      { cx: 0.3, cy: 0.5, r: 0.2 },
      { cx: 0.72, cy: 0.5, r: 0.22 },
    ],
  },
  {
    id: 'circle-tangent-int',
    name: 'Tiếp xúc trong',
    category: 'Đường tròn & Đồ thị',
    lines: [],
    circles: [
      { cx: 0.5, cy: 0.5, r: 0.34 },
      { cx: 0.64, cy: 0.5, r: 0.2, accent: true },
    ],
  },
  {
    id: 'circle-ellipse',
    name: 'Elip (Ellipse)',
    category: 'Đường tròn & Đồ thị',
    lines: [
      { x1: 0.12, y1: 0.5, x2: 0.88, y2: 0.5, dashed: true, accent: true },
      { x1: 0.5, y1: 0.24, x2: 0.5, y2: 0.76, dashed: true, accent: true },
    ],
    circles: [{ cx: 0.5, cy: 0.5, r: 0.38, rx: 0.38, ry: 0.26 }],
  },
  {
    id: 'graph-axes',
    name: 'Hệ trục toạ độ Oxy',
    category: 'Đường tròn & Đồ thị',
    lines: [
      { x1: 0.1, y1: 0.5, x2: 0.9, y2: 0.5 },
      { x1: 0.86, y1: 0.46, x2: 0.9, y2: 0.5 },
      { x1: 0.86, y1: 0.54, x2: 0.9, y2: 0.5 },
      { x1: 0.5, y1: 0.9, x2: 0.5, y2: 0.1 },
      { x1: 0.46, y1: 0.14, x2: 0.5, y2: 0.1 },
      { x1: 0.54, y1: 0.14, x2: 0.5, y2: 0.1 },
    ],
    dots: [{ x: 0.5, y: 0.5, label: 'O', dx: -12, dy: 12 }],
  },
  {
    id: 'graph-parabola',
    name: 'Đồ thị Parabol y = x²',
    category: 'Đường tròn & Đồ thị',
    lines: [
      { x1: 0.1, y1: 0.74, x2: 0.9, y2: 0.74 },
      { x1: 0.5, y1: 0.9, x2: 0.5, y2: 0.1 },
    ],
    curves: [
      {
        pts: sampleCurve(
          (x) => x * x,
          -1.4,
          1.4,
          28,
          (x) => 0.5 + x * 0.24,
          (y) => 0.74 - y * 0.3
        ),
        accent: true,
      },
    ],
  },
  {
    id: 'graph-cubic',
    name: 'Đồ thị hàm bậc 3',
    category: 'Đường tròn & Đồ thị',
    lines: [
      { x1: 0.1, y1: 0.5, x2: 0.9, y2: 0.5 },
      { x1: 0.5, y1: 0.9, x2: 0.5, y2: 0.1 },
    ],
    curves: [
      {
        pts: sampleCurve(
          (x) => x * x * x - 1.5 * x,
          -1.5,
          1.5,
          36,
          (x) => 0.5 + x * 0.24,
          (y) => 0.5 - y * 0.24
        ),
        accent: true,
      },
    ],
  },
  {
    id: 'graph-rational',
    name: 'Đồ thị phân thức (2 tiệm cận)',
    category: 'Đường tròn & Đồ thị',
    lines: [
      { x1: 0.1, y1: 0.5, x2: 0.9, y2: 0.5, dashed: true },
      { x1: 0.5, y1: 0.9, x2: 0.5, y2: 0.1, dashed: true },
    ],
    curves: [
      {
        pts: sampleCurve(
          (x) => 0.35 / x,
          -1.6,
          -0.25,
          20,
          (x) => 0.5 + x * 0.24,
          (y) => 0.5 - y * 0.24
        ),
        accent: true,
      },
      {
        pts: sampleCurve(
          (x) => 0.35 / x,
          0.25,
          1.6,
          20,
          (x) => 0.5 + x * 0.24,
          (y) => 0.5 - y * 0.24
        ),
        accent: true,
      },
    ],
  },

  // ==================== 5. HÌNH CHÓP & TỨ DIỆN (16) ====================
  {
    id: 'pyr-tri',
    name: 'Chóp tam giác S.ABC',
    category: 'Hình chóp & Tứ diện',
    lines: [
      { x1: 0.46, y1: 0.14, x2: 0.14, y2: 0.72 },
      { x1: 0.46, y1: 0.14, x2: 0.52, y2: 0.86 },
      { x1: 0.46, y1: 0.14, x2: 0.86, y2: 0.68 },
      { x1: 0.14, y1: 0.72, x2: 0.52, y2: 0.86 },
      { x1: 0.52, y1: 0.86, x2: 0.86, y2: 0.68 },
      { x1: 0.14, y1: 0.72, x2: 0.86, y2: 0.68, dashed: true },
    ],
    dots: [
      { x: 0.46, y: 0.14, label: 'S', dx: -4, dy: -8 },
      { x: 0.14, y: 0.72, label: 'A', dx: -12, dy: 4 },
      { x: 0.52, y: 0.86, label: 'B', dx: -4, dy: 14 },
      { x: 0.86, y: 0.68, label: 'C', dx: 6, dy: 4 },
    ],
  },
  {
    id: 'pyr-tri-regular',
    name: 'Chóp tam giác đều (SH ⊥ đáy)',
    category: 'Hình chóp & Tứ diện',
    lines: [
      { x1: 0.5, y1: 0.12, x2: 0.14, y2: 0.74 },
      { x1: 0.5, y1: 0.12, x2: 0.5, y2: 0.88 },
      { x1: 0.5, y1: 0.12, x2: 0.86, y2: 0.74 },
      { x1: 0.14, y1: 0.74, x2: 0.5, y2: 0.88 },
      { x1: 0.5, y1: 0.88, x2: 0.86, y2: 0.74 },
      { x1: 0.14, y1: 0.74, x2: 0.86, y2: 0.74, dashed: true },
      { x1: 0.5, y1: 0.12, x2: 0.5, y2: 0.78, dashed: true, accent: true },
    ],
    dots: [
      { x: 0.5, y: 0.12, label: 'S', dx: -4, dy: -8 },
      { x: 0.5, y: 0.78, label: 'G', dx: 6, dy: 4 },
    ],
  },
  {
    id: 'pyr-tri-sa-perp',
    name: 'Chóp S.ABC có SA ⊥ (ABC)',
    category: 'Hình chóp & Tứ diện',
    lines: [
      { x1: 0.24, y1: 0.16, x2: 0.24, y2: 0.72 },
      { x1: 0.24, y1: 0.16, x2: 0.54, y2: 0.88 },
      { x1: 0.24, y1: 0.16, x2: 0.86, y2: 0.68 },
      { x1: 0.24, y1: 0.72, x2: 0.54, y2: 0.88 },
      { x1: 0.54, y1: 0.88, x2: 0.86, y2: 0.68 },
      { x1: 0.24, y1: 0.72, x2: 0.86, y2: 0.68, dashed: true },
      { x1: 0.24, y1: 0.64, x2: 0.31, y2: 0.67, accent: true },
      { x1: 0.31, y1: 0.67, x2: 0.31, y2: 0.75, accent: true },
    ],
    dots: [
      { x: 0.24, y: 0.16, label: 'S', dx: -10, dy: -6 },
      { x: 0.24, y: 0.72, label: 'A', dx: -12, dy: 4 },
    ],
  },
  {
    id: 'pyr-tri-section',
    name: 'Chóp tam giác + Thiết diện',
    category: 'Hình chóp & Tứ diện',
    lines: [
      { x1: 0.5, y1: 0.12, x2: 0.14, y2: 0.74 },
      { x1: 0.5, y1: 0.12, x2: 0.52, y2: 0.88 },
      { x1: 0.5, y1: 0.12, x2: 0.86, y2: 0.7 },
      { x1: 0.14, y1: 0.74, x2: 0.52, y2: 0.88 },
      { x1: 0.52, y1: 0.88, x2: 0.86, y2: 0.7 },
      { x1: 0.14, y1: 0.74, x2: 0.86, y2: 0.7, dashed: true },
      { x1: 0.32, y1: 0.43, x2: 0.51, y2: 0.56, accent: true },
      { x1: 0.51, y1: 0.56, x2: 0.72, y2: 0.48, accent: true },
      { x1: 0.32, y1: 0.43, x2: 0.72, y2: 0.48, dashed: true, accent: true },
    ],
  },
  {
    id: 'tet-diagonals',
    name: 'Tứ diện + Hai đoạn đối',
    category: 'Hình chóp & Tứ diện',
    lines: [
      { x1: 0.48, y1: 0.14, x2: 0.14, y2: 0.74 },
      { x1: 0.48, y1: 0.14, x2: 0.5, y2: 0.88 },
      { x1: 0.48, y1: 0.14, x2: 0.86, y2: 0.7 },
      { x1: 0.14, y1: 0.74, x2: 0.5, y2: 0.88 },
      { x1: 0.5, y1: 0.88, x2: 0.86, y2: 0.7 },
      { x1: 0.14, y1: 0.74, x2: 0.86, y2: 0.7, dashed: true },
      { x1: 0.49, y1: 0.51, x2: 0.5, y2: 0.72, dashed: true, accent: true },
    ],
  },
  {
    id: 'tet-trirect',
    name: 'Tứ diện vuông tại O',
    category: 'Hình chóp & Tứ diện',
    lines: [
      { x1: 0.3, y1: 0.68, x2: 0.3, y2: 0.16, dashed: true },
      { x1: 0.3, y1: 0.68, x2: 0.14, y2: 0.86, dashed: true },
      { x1: 0.3, y1: 0.68, x2: 0.86, y2: 0.68, dashed: true },
      { x1: 0.3, y1: 0.16, x2: 0.14, y2: 0.86 },
      { x1: 0.3, y1: 0.16, x2: 0.86, y2: 0.68 },
      { x1: 0.14, y1: 0.86, x2: 0.86, y2: 0.68 },
    ],
    dots: [{ x: 0.3, y: 0.68, label: 'O', dx: -12, dy: -6 }],
  },
  {
    id: 'pyr-quad',
    name: 'Chóp tứ giác S.ABCD',
    category: 'Hình chóp & Tứ diện',
    lines: [
      { x1: 0.42, y1: 0.14, x2: 0.28, y2: 0.64 },
      { x1: 0.42, y1: 0.14, x2: 0.14, y2: 0.86 },
      { x1: 0.42, y1: 0.14, x2: 0.7, y2: 0.86 },
      { x1: 0.42, y1: 0.14, x2: 0.86, y2: 0.64 },
      { x1: 0.28, y1: 0.64, x2: 0.14, y2: 0.86, dashed: true },
      { x1: 0.28, y1: 0.64, x2: 0.86, y2: 0.64, dashed: true },
      { x1: 0.14, y1: 0.86, x2: 0.7, y2: 0.86 },
      { x1: 0.7, y1: 0.86, x2: 0.86, y2: 0.64 },
    ],
    dots: [
      { x: 0.42, y: 0.14, label: 'S', dx: -4, dy: -8 },
      { x: 0.28, y: 0.64, label: 'A', dx: -12, dy: -4 },
      { x: 0.14, y: 0.86, label: 'B', dx: -12, dy: 8 },
      { x: 0.7, y: 0.86, label: 'C', dx: 6, dy: 8 },
      { x: 0.86, y: 0.64, label: 'D', dx: 6, dy: 2 },
    ],
  },
  {
    id: 'pyr-quad-regular',
    name: 'Chóp tứ giác đều (SO ⊥ đáy)',
    category: 'Hình chóp & Tứ diện',
    lines: [
      { x1: 0.5, y1: 0.12, x2: 0.28, y2: 0.64, dashed: true },
      { x1: 0.5, y1: 0.12, x2: 0.14, y2: 0.86 },
      { x1: 0.5, y1: 0.12, x2: 0.72, y2: 0.86 },
      { x1: 0.5, y1: 0.12, x2: 0.86, y2: 0.64 },
      { x1: 0.28, y1: 0.64, x2: 0.14, y2: 0.86, dashed: true },
      { x1: 0.28, y1: 0.64, x2: 0.86, y2: 0.64, dashed: true },
      { x1: 0.14, y1: 0.86, x2: 0.72, y2: 0.86 },
      { x1: 0.72, y1: 0.86, x2: 0.86, y2: 0.64 },
      { x1: 0.28, y1: 0.64, x2: 0.72, y2: 0.86, dashed: true },
      { x1: 0.14, y1: 0.86, x2: 0.86, y2: 0.64, dashed: true },
      { x1: 0.5, y1: 0.12, x2: 0.5, y2: 0.75, dashed: true, accent: true },
    ],
    dots: [{ x: 0.5, y: 0.75, label: 'O', dx: 6, dy: 4 }],
  },
  {
    id: 'pyr-quad-sa-perp',
    name: 'Chóp S.ABCD có SA ⊥ đáy',
    category: 'Hình chóp & Tứ diện',
    lines: [
      { x1: 0.24, y1: 0.14, x2: 0.24, y2: 0.64, dashed: true },
      { x1: 0.24, y1: 0.14, x2: 0.14, y2: 0.86 },
      { x1: 0.24, y1: 0.14, x2: 0.74, y2: 0.86 },
      { x1: 0.24, y1: 0.14, x2: 0.86, y2: 0.64 },
      { x1: 0.24, y1: 0.64, x2: 0.14, y2: 0.86, dashed: true },
      { x1: 0.24, y1: 0.64, x2: 0.86, y2: 0.64, dashed: true },
      { x1: 0.14, y1: 0.86, x2: 0.74, y2: 0.86 },
      { x1: 0.74, y1: 0.86, x2: 0.86, y2: 0.64 },
      { x1: 0.24, y1: 0.56, x2: 0.32, y2: 0.56, accent: true },
      { x1: 0.32, y1: 0.56, x2: 0.32, y2: 0.64, accent: true },
    ],
  },
  {
    id: 'pyr-quad-trapezoid',
    name: 'Chóp đáy hình thang vuông',
    category: 'Hình chóp & Tứ diện',
    lines: [
      { x1: 0.26, y1: 0.14, x2: 0.26, y2: 0.64, dashed: true },
      { x1: 0.26, y1: 0.14, x2: 0.14, y2: 0.86 },
      { x1: 0.26, y1: 0.14, x2: 0.56, y2: 0.86 },
      { x1: 0.26, y1: 0.14, x2: 0.88, y2: 0.64 },
      { x1: 0.26, y1: 0.64, x2: 0.14, y2: 0.86, dashed: true },
      { x1: 0.26, y1: 0.64, x2: 0.88, y2: 0.64, dashed: true },
      { x1: 0.14, y1: 0.86, x2: 0.56, y2: 0.86 },
      { x1: 0.56, y1: 0.86, x2: 0.88, y2: 0.64 },
    ],
  },
  {
    id: 'pyr-quad-slant-height',
    name: 'Chóp S.ABCD (SH ⊥ AB)',
    category: 'Hình chóp & Tứ diện',
    lines: [
      { x1: 0.22, y1: 0.14, x2: 0.28, y2: 0.64, dashed: true },
      { x1: 0.22, y1: 0.14, x2: 0.14, y2: 0.86 },
      { x1: 0.22, y1: 0.14, x2: 0.72, y2: 0.86 },
      { x1: 0.22, y1: 0.14, x2: 0.86, y2: 0.64 },
      { x1: 0.28, y1: 0.64, x2: 0.14, y2: 0.86, dashed: true },
      { x1: 0.28, y1: 0.64, x2: 0.86, y2: 0.64, dashed: true },
      { x1: 0.14, y1: 0.86, x2: 0.72, y2: 0.86 },
      { x1: 0.72, y1: 0.86, x2: 0.86, y2: 0.64 },
      { x1: 0.22, y1: 0.14, x2: 0.21, y2: 0.75, dashed: true, accent: true },
    ],
    dots: [{ x: 0.21, y: 0.75, label: 'H', dx: -12, dy: 4 }],
  },
  {
    id: 'pyr-quad-section',
    name: 'Chóp S.ABCD + Thiết diện MNPQ',
    category: 'Hình chóp & Tứ diện',
    lines: [
      { x1: 0.48, y1: 0.12, x2: 0.28, y2: 0.64, dashed: true },
      { x1: 0.48, y1: 0.12, x2: 0.14, y2: 0.86 },
      { x1: 0.48, y1: 0.12, x2: 0.72, y2: 0.86 },
      { x1: 0.48, y1: 0.12, x2: 0.86, y2: 0.64 },
      { x1: 0.28, y1: 0.64, x2: 0.14, y2: 0.86, dashed: true },
      { x1: 0.28, y1: 0.64, x2: 0.86, y2: 0.64, dashed: true },
      { x1: 0.14, y1: 0.86, x2: 0.72, y2: 0.86 },
      { x1: 0.72, y1: 0.86, x2: 0.86, y2: 0.64 },
      { x1: 0.36, y1: 0.42, x2: 0.27, y2: 0.56, dashed: true, accent: true },
      { x1: 0.27, y1: 0.56, x2: 0.62, y2: 0.56, accent: true },
      { x1: 0.62, y1: 0.56, x2: 0.71, y2: 0.42, accent: true },
      { x1: 0.71, y1: 0.42, x2: 0.36, y2: 0.42, dashed: true, accent: true },
    ],
  },
  {
    id: 'pyr-frustum-tri',
    name: 'Chóp cụt tam giác',
    category: 'Hình chóp & Tứ diện',
    lines: [
      ...polyLines([[0.32, 0.28], [0.5, 0.36], [0.68, 0.26]], [2]),
      ...polyLines([[0.16, 0.74], [0.5, 0.88], [0.84, 0.7]], [2]),
      { x1: 0.32, y1: 0.28, x2: 0.16, y2: 0.74 },
      { x1: 0.5, y1: 0.36, x2: 0.5, y2: 0.88 },
      { x1: 0.68, y1: 0.26, x2: 0.84, y2: 0.7 },
    ],
  },
  {
    id: 'pyr-frustum-quad',
    name: 'Chóp cụt tứ giác',
    category: 'Hình chóp & Tứ diện',
    lines: [
      ...polyLines([[0.36, 0.24], [0.7, 0.24], [0.64, 0.36], [0.3, 0.36]]),
      ...polyLines([[0.28, 0.66], [0.86, 0.66], [0.72, 0.86], [0.14, 0.86]], [0, 3]),
      { x1: 0.36, y1: 0.24, x2: 0.28, y2: 0.66, dashed: true },
      { x1: 0.7, y1: 0.24, x2: 0.86, y2: 0.66 },
      { x1: 0.64, y1: 0.36, x2: 0.72, y2: 0.86 },
      { x1: 0.3, y1: 0.36, x2: 0.14, y2: 0.86 },
    ],
  },
  {
    id: 'pyr-pentagon',
    name: 'Chóp ngũ giác S.ABCDE',
    category: 'Hình chóp & Tứ diện',
    lines: [
      { x1: 0.5, y1: 0.12, x2: 0.24, y2: 0.68, dashed: true },
      { x1: 0.5, y1: 0.12, x2: 0.68, y2: 0.66, dashed: true },
      { x1: 0.5, y1: 0.12, x2: 0.14, y2: 0.8 },
      { x1: 0.5, y1: 0.12, x2: 0.46, y2: 0.88 },
      { x1: 0.5, y1: 0.12, x2: 0.86, y2: 0.78 },
      { x1: 0.24, y1: 0.68, x2: 0.68, y2: 0.66, dashed: true },
      { x1: 0.24, y1: 0.68, x2: 0.14, y2: 0.8 },
      { x1: 0.14, y1: 0.8, x2: 0.46, y2: 0.88 },
      { x1: 0.46, y1: 0.88, x2: 0.86, y2: 0.78 },
      { x1: 0.86, y1: 0.78, x2: 0.68, y2: 0.66 },
    ],
  },
  {
    id: 'pyr-hexagon',
    name: 'Chóp lục giác S.ABCDEF',
    category: 'Hình chóp & Tứ diện',
    lines: [
      { x1: 0.5, y1: 0.12, x2: 0.34, y2: 0.64, dashed: true },
      { x1: 0.5, y1: 0.12, x2: 0.66, y2: 0.64, dashed: true },
      { x1: 0.5, y1: 0.12, x2: 0.14, y2: 0.76 },
      { x1: 0.5, y1: 0.12, x2: 0.34, y2: 0.88 },
      { x1: 0.5, y1: 0.12, x2: 0.66, y2: 0.88 },
      { x1: 0.5, y1: 0.12, x2: 0.86, y2: 0.76 },
      { x1: 0.34, y1: 0.64, x2: 0.66, y2: 0.64, dashed: true },
      { x1: 0.34, y1: 0.64, x2: 0.14, y2: 0.76, dashed: true },
      { x1: 0.66, y1: 0.64, x2: 0.86, y2: 0.76, dashed: true },
      { x1: 0.14, y1: 0.76, x2: 0.34, y2: 0.88 },
      { x1: 0.34, y1: 0.88, x2: 0.66, y2: 0.88 },
      { x1: 0.66, y1: 0.88, x2: 0.86, y2: 0.76 },
    ],
  },

  // ==================== 6. LĂNG TRỤ, HỘP & TRÒN XOAY (16) ====================
  {
    id: 'prism-cube',
    name: 'Hình lập phương',
    category: 'Lăng trụ & Tròn xoay',
    lines: [
      { x1: 0.18, y1: 0.34, x2: 0.64, y2: 0.34 },
      { x1: 0.64, y1: 0.34, x2: 0.64, y2: 0.82 },
      { x1: 0.64, y1: 0.82, x2: 0.18, y2: 0.82 },
      { x1: 0.18, y1: 0.82, x2: 0.18, y2: 0.34 },
      { x1: 0.36, y1: 0.16, x2: 0.82, y2: 0.16 },
      { x1: 0.82, y1: 0.16, x2: 0.82, y2: 0.64 },
      { x1: 0.18, y1: 0.34, x2: 0.36, y2: 0.16 },
      { x1: 0.64, y1: 0.34, x2: 0.82, y2: 0.16 },
      { x1: 0.64, y1: 0.82, x2: 0.82, y2: 0.64 },
      { x1: 0.36, y1: 0.16, x2: 0.36, y2: 0.64, dashed: true },
      { x1: 0.36, y1: 0.64, x2: 0.82, y2: 0.64, dashed: true },
      { x1: 0.36, y1: 0.64, x2: 0.18, y2: 0.82, dashed: true },
    ],
  },
  {
    id: 'prism-cube-diag',
    name: 'Lập phương + Đường chéo',
    category: 'Lăng trụ & Tròn xoay',
    lines: [
      { x1: 0.18, y1: 0.34, x2: 0.64, y2: 0.34 },
      { x1: 0.64, y1: 0.34, x2: 0.64, y2: 0.82 },
      { x1: 0.64, y1: 0.82, x2: 0.18, y2: 0.82 },
      { x1: 0.18, y1: 0.82, x2: 0.18, y2: 0.34 },
      { x1: 0.36, y1: 0.16, x2: 0.82, y2: 0.16 },
      { x1: 0.82, y1: 0.16, x2: 0.82, y2: 0.64 },
      { x1: 0.18, y1: 0.34, x2: 0.36, y2: 0.16 },
      { x1: 0.64, y1: 0.34, x2: 0.82, y2: 0.16 },
      { x1: 0.64, y1: 0.82, x2: 0.82, y2: 0.64 },
      { x1: 0.36, y1: 0.16, x2: 0.36, y2: 0.64, dashed: true },
      { x1: 0.36, y1: 0.64, x2: 0.82, y2: 0.64, dashed: true },
      { x1: 0.36, y1: 0.64, x2: 0.18, y2: 0.82, dashed: true },
      { x1: 0.18, y1: 0.82, x2: 0.82, y2: 0.16, dashed: true, accent: true },
      { x1: 0.18, y1: 0.82, x2: 0.82, y2: 0.64, dashed: true, accent: true },
    ],
  },
  {
    id: 'prism-cuboid',
    name: 'Hình hộp chữ nhật',
    category: 'Lăng trụ & Tròn xoay',
    lines: [
      { x1: 0.12, y1: 0.38, x2: 0.7, y2: 0.38 },
      { x1: 0.7, y1: 0.38, x2: 0.7, y2: 0.82 },
      { x1: 0.7, y1: 0.82, x2: 0.12, y2: 0.82 },
      { x1: 0.12, y1: 0.82, x2: 0.12, y2: 0.38 },
      { x1: 0.3, y1: 0.2, x2: 0.88, y2: 0.2 },
      { x1: 0.88, y1: 0.2, x2: 0.88, y2: 0.64 },
      { x1: 0.12, y1: 0.38, x2: 0.3, y2: 0.2 },
      { x1: 0.7, y1: 0.38, x2: 0.88, y2: 0.2 },
      { x1: 0.7, y1: 0.82, x2: 0.88, y2: 0.64 },
      { x1: 0.3, y1: 0.2, x2: 0.3, y2: 0.64, dashed: true },
      { x1: 0.3, y1: 0.64, x2: 0.88, y2: 0.64, dashed: true },
      { x1: 0.3, y1: 0.64, x2: 0.12, y2: 0.82, dashed: true },
    ],
  },
  {
    id: 'prism-oblique-box',
    name: 'Hình hộp xiên',
    category: 'Lăng trụ & Tròn xoay',
    lines: [
      { x1: 0.26, y1: 0.36, x2: 0.74, y2: 0.36 },
      { x1: 0.42, y1: 0.18, x2: 0.9, y2: 0.18 },
      { x1: 0.26, y1: 0.36, x2: 0.42, y2: 0.18 },
      { x1: 0.74, y1: 0.36, x2: 0.9, y2: 0.18 },
      { x1: 0.12, y1: 0.84, x2: 0.6, y2: 0.84 },
      { x1: 0.6, y1: 0.84, x2: 0.76, y2: 0.66 },
      { x1: 0.26, y1: 0.36, x2: 0.12, y2: 0.84 },
      { x1: 0.74, y1: 0.36, x2: 0.6, y2: 0.84 },
      { x1: 0.9, y1: 0.18, x2: 0.76, y2: 0.66 },
      { x1: 0.42, y1: 0.18, x2: 0.28, y2: 0.66, dashed: true },
      { x1: 0.28, y1: 0.66, x2: 0.76, y2: 0.66, dashed: true },
      { x1: 0.28, y1: 0.66, x2: 0.12, y2: 0.84, dashed: true },
    ],
  },
  {
    id: 'prism-tri-right',
    name: 'Lăng trụ đứng tam giác',
    category: 'Lăng trụ & Tròn xoay',
    lines: [
      ...polyLines([[0.18, 0.26], [0.5, 0.38], [0.82, 0.24]]),
      ...polyLines([[0.18, 0.72], [0.5, 0.86], [0.82, 0.7]], [2]),
      { x1: 0.18, y1: 0.26, x2: 0.18, y2: 0.72 },
      { x1: 0.5, y1: 0.38, x2: 0.5, y2: 0.86 },
      { x1: 0.82, y1: 0.24, x2: 0.82, y2: 0.7 },
    ],
  },
  {
    id: 'prism-tri-oblique',
    name: 'Lăng trụ xiên tam giác',
    category: 'Lăng trụ & Tròn xoay',
    lines: [
      ...polyLines([[0.3, 0.22], [0.6, 0.34], [0.88, 0.2]]),
      ...polyLines([[0.14, 0.74], [0.44, 0.86], [0.72, 0.72]], [2]),
      { x1: 0.3, y1: 0.22, x2: 0.14, y2: 0.74 },
      { x1: 0.6, y1: 0.34, x2: 0.44, y2: 0.86 },
      { x1: 0.88, y1: 0.2, x2: 0.72, y2: 0.72 },
    ],
  },
  {
    id: 'prism-quad',
    name: 'Lăng trụ tứ giác',
    category: 'Lăng trụ & Tròn xoay',
    lines: [
      ...polyLines([[0.32, 0.18], [0.84, 0.18], [0.72, 0.34], [0.2, 0.34]]),
      ...polyLines([[0.28, 0.68], [0.8, 0.68], [0.68, 0.86], [0.16, 0.86]], [0, 3]),
      { x1: 0.32, y1: 0.18, x2: 0.28, y2: 0.68, dashed: true },
      { x1: 0.84, y1: 0.18, x2: 0.8, y2: 0.68 },
      { x1: 0.72, y1: 0.34, x2: 0.68, y2: 0.86 },
      { x1: 0.2, y1: 0.34, x2: 0.16, y2: 0.86 },
    ],
  },
  {
    id: 'prism-hex',
    name: 'Lăng trụ lục giác đều',
    category: 'Lăng trụ & Tròn xoay',
    lines: [
      ...polyLines([
        [0.34, 0.14],
        [0.66, 0.14],
        [0.84, 0.24],
        [0.66, 0.34],
        [0.34, 0.34],
        [0.16, 0.24],
      ]),
      { x1: 0.16, y1: 0.24, x2: 0.16, y2: 0.76 },
      { x1: 0.34, y1: 0.34, x2: 0.34, y2: 0.86 },
      { x1: 0.66, y1: 0.34, x2: 0.66, y2: 0.86 },
      { x1: 0.84, y1: 0.24, x2: 0.84, y2: 0.76 },
      { x1: 0.16, y1: 0.76, x2: 0.34, y2: 0.86 },
      { x1: 0.34, y1: 0.86, x2: 0.66, y2: 0.86 },
      { x1: 0.66, y1: 0.86, x2: 0.84, y2: 0.76 },
      { x1: 0.34, y1: 0.14, x2: 0.34, y2: 0.66, dashed: true },
      { x1: 0.66, y1: 0.14, x2: 0.66, y2: 0.66, dashed: true },
      { x1: 0.16, y1: 0.76, x2: 0.34, y2: 0.66, dashed: true },
      { x1: 0.34, y1: 0.66, x2: 0.66, y2: 0.66, dashed: true },
      { x1: 0.66, y1: 0.66, x2: 0.84, y2: 0.76, dashed: true },
    ],
  },
  {
    id: 'solid-cone',
    name: 'Hình nón tròn xoay',
    category: 'Lăng trụ & Tròn xoay',
    lines: [
      { x1: 0.5, y1: 0.14, x2: 0.18, y2: 0.76 },
      { x1: 0.5, y1: 0.14, x2: 0.82, y2: 0.76 },
      { x1: 0.5, y1: 0.14, x2: 0.5, y2: 0.76, dashed: true, accent: true },
      { x1: 0.5, y1: 0.76, x2: 0.82, y2: 0.76, dashed: true, accent: true },
    ],
    arcs: [
      { cx: 0.5, cy: 0.76, r: 0.32, rx: 0.32, ry: 0.11, startAngle: 0, endAngle: Math.PI },
      { cx: 0.5, cy: 0.76, r: 0.32, rx: 0.32, ry: 0.11, startAngle: Math.PI, endAngle: Math.PI * 2, dashed: true },
    ],
    dots: [
      { x: 0.5, y: 0.14, label: 'S', dx: -4, dy: -8 },
      { x: 0.5, y: 0.76, label: 'O', dx: -10, dy: 12 },
    ],
  },
  {
    id: 'solid-frustum-cone',
    name: 'Hình nón cụt',
    category: 'Lăng trụ & Tròn xoay',
    lines: [
      { x1: 0.32, y1: 0.24, x2: 0.16, y2: 0.76 },
      { x1: 0.68, y1: 0.24, x2: 0.84, y2: 0.76 },
      { x1: 0.5, y1: 0.24, x2: 0.5, y2: 0.76, dashed: true, accent: true },
    ],
    circles: [{ cx: 0.5, cy: 0.24, r: 0.18, rx: 0.18, ry: 0.06 }],
    arcs: [
      { cx: 0.5, cy: 0.76, r: 0.34, rx: 0.34, ry: 0.11, startAngle: 0, endAngle: Math.PI },
      { cx: 0.5, cy: 0.76, r: 0.34, rx: 0.34, ry: 0.11, startAngle: Math.PI, endAngle: Math.PI * 2, dashed: true },
    ],
  },
  {
    id: 'solid-cylinder',
    name: 'Hình trụ tròn xoay',
    category: 'Lăng trụ & Tròn xoay',
    lines: [
      { x1: 0.2, y1: 0.24, x2: 0.2, y2: 0.76 },
      { x1: 0.8, y1: 0.24, x2: 0.8, y2: 0.76 },
      { x1: 0.5, y1: 0.24, x2: 0.5, y2: 0.76, dashed: true, accent: true },
    ],
    circles: [{ cx: 0.5, cy: 0.24, r: 0.3, rx: 0.3, ry: 0.1 }],
    arcs: [
      { cx: 0.5, cy: 0.76, r: 0.3, rx: 0.3, ry: 0.1, startAngle: 0, endAngle: Math.PI },
      { cx: 0.5, cy: 0.76, r: 0.3, rx: 0.3, ry: 0.1, startAngle: Math.PI, endAngle: Math.PI * 2, dashed: true },
    ],
    dots: [
      { x: 0.5, y: 0.24, label: "O'", dx: 6, dy: 4 },
      { x: 0.5, y: 0.76, label: 'O', dx: 6, dy: 4 },
    ],
  },
  {
    id: 'solid-cylinder-section',
    name: 'Hình trụ + Thiết diện trục',
    category: 'Lăng trụ & Tròn xoay',
    lines: [
      { x1: 0.2, y1: 0.24, x2: 0.2, y2: 0.76 },
      { x1: 0.8, y1: 0.24, x2: 0.8, y2: 0.76 },
      { x1: 0.2, y1: 0.24, x2: 0.8, y2: 0.24, dashed: true, accent: true },
      { x1: 0.2, y1: 0.76, x2: 0.8, y2: 0.76, dashed: true, accent: true },
    ],
    circles: [{ cx: 0.5, cy: 0.24, r: 0.3, rx: 0.3, ry: 0.1 }],
    arcs: [
      { cx: 0.5, cy: 0.76, r: 0.3, rx: 0.3, ry: 0.1, startAngle: 0, endAngle: Math.PI },
      { cx: 0.5, cy: 0.76, r: 0.3, rx: 0.3, ry: 0.1, startAngle: Math.PI, endAngle: Math.PI * 2, dashed: true },
    ],
  },
  {
    id: 'solid-sphere',
    name: 'Hình cầu tâm O',
    category: 'Lăng trụ & Tròn xoay',
    lines: [{ x1: 0.5, y1: 0.5, x2: 0.84, y2: 0.5, dashed: true, accent: true }],
    circles: [{ cx: 0.5, cy: 0.5, r: 0.34 }],
    arcs: [
      { cx: 0.5, cy: 0.5, r: 0.34, rx: 0.34, ry: 0.12, startAngle: 0, endAngle: Math.PI },
      { cx: 0.5, cy: 0.5, r: 0.34, rx: 0.34, ry: 0.12, startAngle: Math.PI, endAngle: Math.PI * 2, dashed: true },
    ],
    dots: [{ x: 0.5, y: 0.5, label: 'O', dx: -12, dy: -4 }],
  },
  {
    id: 'solid-octahedron',
    name: 'Bát diện đều',
    category: 'Lăng trụ & Tròn xoay',
    lines: [
      { x1: 0.5, y1: 0.1, x2: 0.16, y2: 0.5 },
      { x1: 0.5, y1: 0.1, x2: 0.42, y2: 0.62 },
      { x1: 0.5, y1: 0.1, x2: 0.84, y2: 0.5 },
      { x1: 0.5, y1: 0.1, x2: 0.58, y2: 0.38, dashed: true },
      { x1: 0.5, y1: 0.9, x2: 0.16, y2: 0.5 },
      { x1: 0.5, y1: 0.9, x2: 0.42, y2: 0.62 },
      { x1: 0.5, y1: 0.9, x2: 0.84, y2: 0.5 },
      { x1: 0.5, y1: 0.9, x2: 0.58, y2: 0.38, dashed: true },
      { x1: 0.16, y1: 0.5, x2: 0.42, y2: 0.62 },
      { x1: 0.42, y1: 0.62, x2: 0.84, y2: 0.5 },
      { x1: 0.84, y1: 0.5, x2: 0.58, y2: 0.38, dashed: true },
      { x1: 0.58, y1: 0.38, x2: 0.16, y2: 0.5, dashed: true },
    ],
  },
  {
    id: 'space-plane',
    name: 'Mặt phẳng (P)',
    category: 'Lăng trụ & Tròn xoay',
    lines: polyLines([[0.28, 0.3], [0.88, 0.3], [0.72, 0.7], [0.12, 0.7]]),
    dots: [{ x: 0.22, y: 0.62, label: 'P', dx: 2, dy: 0 }],
  },
  {
    id: 'space-2planes-line',
    name: 'Giao tuyến 2 mặt phẳng',
    category: 'Lăng trụ & Tròn xoay',
    lines: [
      { x1: 0.16, y1: 0.62, x2: 0.86, y2: 0.42, accent: true },
      { x1: 0.16, y1: 0.62, x2: 0.26, y2: 0.22 },
      { x1: 0.26, y1: 0.22, x2: 0.94, y2: 0.14 },
      { x1: 0.94, y1: 0.14, x2: 0.86, y2: 0.42 },
      { x1: 0.16, y1: 0.62, x2: 0.1, y2: 0.84 },
      { x1: 0.1, y1: 0.84, x2: 0.78, y2: 0.72 },
      { x1: 0.78, y1: 0.72, x2: 0.86, y2: 0.42 },
    ],
    dots: [{ x: 0.5, y: 0.52, label: 'd', dx: 0, dy: -8 }],
  },
];
