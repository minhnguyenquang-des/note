export type PaperStyle = 'plain' | 'ruled' | 'grid' | 'dot' | 'cream' | 'chalkboard';

export type PenStyle =
  | 'fountain'
  | 'calligraphy'
  | 'ballpoint'
  | 'pencil'
  | 'highlighter'
  | 'dashed';

export type ToolType =
  | 'select'
  | 'pan'
  | 'pen'
  | 'smartDraw'
  | 'eraser'
  | 'line'
  | 'dashed'
  | 'triangle'
  | 'rect'
  | 'circle'
  | 'label'
  | 'latex'
  | 'sticky'
  | 'laser';

export type ShapeKind = 'line' | 'dashed' | 'triangle' | 'rect' | 'circle';

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
}

export interface StrokeElement {
  id: string;
  type: 'stroke';
  points: StrokePoint[];
  color: string;
  size: number;
  penStyle: PenStyle;
}

export interface ShapeElement {
  id: string;
  type: 'shape';
  shapeKind: ShapeKind;
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  labels?: string[];
}

export interface DiagramLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dashed?: boolean;
  accent?: boolean;
}

export interface DiagramCircle {
  cx: number;
  cy: number;
  r: number;
  rx?: number;
  ry?: number;
  dashed?: boolean;
  accent?: boolean;
}

export interface DiagramArc {
  cx: number;
  cy: number;
  r: number;
  rx?: number;
  ry?: number;
  startAngle: number;
  endAngle: number;
  dashed?: boolean;
  accent?: boolean;
}

export interface DiagramDot {
  x: number;
  y: number;
  label?: string;
  dx?: number;
  dy?: number;
}

export interface DiagramCurve {
  pts: [number, number][];
  dashed?: boolean;
  accent?: boolean;
}

export interface DiagramElement {
  id: string;
  type: 'diagram';
  templateId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  lines: DiagramLine[];
  circles?: DiagramCircle[];
  arcs?: DiagramArc[];
  dots?: DiagramDot[];
  curves?: DiagramCurve[];
}

export interface LatexElement {
  id: string;
  type: 'latex';
  x: number;
  y: number;
  latex: string;
  fontSize: number;
  color: string;
}

export interface StickyElement {
  id: string;
  type: 'sticky';
  x: number;
  y: number;
  width: number;
  title: string;
  body: string;
  variant: 'theorem' | 'step' | 'note';
}

export interface LabelElement {
  id: string;
  type: 'label';
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
}

export interface ImageElement {
  id: string;
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  caption?: string;
}

export type CanvasElement =
  | StrokeElement
  | ShapeElement
  | DiagramElement
  | LatexElement
  | StickyElement
  | LabelElement
  | ImageElement;

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface NotePage {
  id: string;
  title: string;
  paperStyle: PaperStyle;
  elements: CanvasElement[];
  camera: CameraState;
  updatedAt: number;
}

export interface Notebook {
  id: string;
  title: string;
  subject: 'Hình học không gian' | 'Đại số & Giải tích' | 'Đề ôn tập';
  tags: string[];
  pages: NotePage[];
  activePageId: string;
  createdAt: number;
  updatedAt: number;
}

export type SolidType =
  | 'pyramid_quad'
  | 'pyramid_tri'
  | 'cube'
  | 'cuboid'
  | 'prism_tri'
  | 'tetrahedron'
  | 'octahedron'
  | 'cone'
  | 'cylinder'
  | 'sphere';
