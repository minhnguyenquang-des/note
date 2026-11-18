import * as THREE from 'three';
import type { SolidType } from '../types/note';

export interface SolidVertex {
  label: string;
  pos: [number, number, number];
}

export interface SolidEdge {
  a: number;
  b: number;
  faces: number[]; // adjacent face indices
}

export interface NetFaceTransform {
  faceIndex: number;
  hingeA: [number, number, number];
  hingeB: [number, number, number];
  maxAngle: number; // radians to unfold flat
  parentFaceIndex?: number;
}

export interface SolidDefinition {
  id: SolidType;
  name: string;
  shortDesc: string;
  formulaVolume: string;
  formulaArea: string;
  isCurved: boolean;
  supportsUnfold: boolean;
  vertices: SolidVertex[];
  faces: number[][]; // CCW winding from outside
  edges: SolidEdge[];
  netFaces?: NetFaceTransform[];
  baseFaceIndex?: number;
}

function buildEdges(faces: number[][]): SolidEdge[] {
  const edgeMap = new Map<string, SolidEdge>();
  faces.forEach((face, fIdx) => {
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const min = Math.min(a, b);
      const max = Math.max(a, b);
      const key = `${min}-${max}`;
      const existing = edgeMap.get(key);
      if (existing) {
        if (!existing.faces.includes(fIdx)) existing.faces.push(fIdx);
      } else {
        edgeMap.set(key, { a: min, b: max, faces: [fIdx] });
      }
    }
  });
  return Array.from(edgeMap.values());
}

export const SOLID_CATALOG: Record<SolidType, SolidDefinition> = {
  pyramid_quad: (() => {
    const h = 2.2;
    const s = 1.25;
    const y0 = -0.9;
    const vertices: SolidVertex[] = [
      { label: 'S', pos: [0, y0 + h, 0] },
      { label: 'A', pos: [-s, y0, -s] },
      { label: 'B', pos: [-s, y0, s] },
      { label: 'C', pos: [s, y0, s] },
      { label: 'D', pos: [s, y0, -s] },
    ];
    // Outward CCW faces
    const faces = [
      [1, 4, 3, 2], // Base ABCD (normal -Y)
      [0, 1, 2], // SAB
      [0, 2, 3], // SBC
      [0, 3, 4], // SCD
      [0, 4, 1], // SDA
    ];
    const slantAngle = Math.atan2(h, s); // angle from base plane to side face
    const unfoldAngle = Math.PI - slantAngle;
    return {
      id: 'pyramid_quad',
      name: 'Hình chóp tứ giác đều S.ABCD',
      shortDesc: 'Đáy là hình vuông, chân đường cao trùng tâm O',
      formulaVolume: 'V = \\frac{1}{3} a^2 h',
      formulaArea: 'S_{xq} = 2 a \\cdot d',
      isCurved: false,
      supportsUnfold: true,
      vertices,
      faces,
      edges: buildEdges(faces),
      baseFaceIndex: 0,
      netFaces: [
        { faceIndex: 1, hingeA: [-s, y0, -s], hingeB: [-s, y0, s], maxAngle: -unfoldAngle },
        { faceIndex: 2, hingeA: [-s, y0, s], hingeB: [s, y0, s], maxAngle: -unfoldAngle },
        { faceIndex: 3, hingeA: [s, y0, s], hingeB: [s, y0, -s], maxAngle: -unfoldAngle },
        { faceIndex: 4, hingeA: [s, y0, -s], hingeB: [-s, y0, -s], maxAngle: -unfoldAngle },
      ],
    };
  })(),

  pyramid_tri: (() => {
    const r = 1.45;
    const y0 = -0.85;
    const h = 2.25;
    const aPos: [number, number, number] = [0, y0, -r];
    const bPos: [number, number, number] = [-r * Math.cos(Math.PI / 6), y0, r * Math.sin(Math.PI / 6)];
    const cPos: [number, number, number] = [r * Math.cos(Math.PI / 6), y0, r * Math.sin(Math.PI / 6)];
    const vertices: SolidVertex[] = [
      { label: 'S', pos: [0, y0 + h, 0] },
      { label: 'A', pos: aPos },
      { label: 'B', pos: bPos },
      { label: 'C', pos: cPos },
    ];
    const faces = [
      [1, 3, 2], // ABC (normal -Y)
      [0, 1, 2], // SAB
      [0, 2, 3], // SBC
      [0, 3, 1], // SCA
    ];
    const apothem = r * Math.sin(Math.PI / 6);
    const unfoldAngle = Math.PI - Math.atan2(h, apothem);
    return {
      id: 'pyramid_tri',
      name: 'Hình chóp tam giác đều S.ABC',
      shortDesc: 'Đáy là tam giác đều, các cạnh bên bằng nhau',
      formulaVolume: 'V = \\frac{1}{3} S_{\\triangle ABC} \\cdot h',
      formulaArea: 'S_{xq} = \\frac{3}{2} a \\cdot d',
      isCurved: false,
      supportsUnfold: true,
      vertices,
      faces,
      edges: buildEdges(faces),
      baseFaceIndex: 0,
      netFaces: [
        { faceIndex: 1, hingeA: aPos, hingeB: bPos, maxAngle: -unfoldAngle },
        { faceIndex: 2, hingeA: bPos, hingeB: cPos, maxAngle: -unfoldAngle },
        { faceIndex: 3, hingeA: cPos, hingeB: aPos, maxAngle: -unfoldAngle },
      ],
    };
  })(),

  cube: (() => {
    const s = 1.05;
    const vertices: SolidVertex[] = [
      { label: 'A', pos: [-s, -s, -s] },
      { label: 'B', pos: [-s, -s, s] },
      { label: 'C', pos: [s, -s, s] },
      { label: 'D', pos: [s, -s, -s] },
      { label: "A'", pos: [-s, s, -s] },
      { label: "B'", pos: [-s, s, s] },
      { label: "C'", pos: [s, s, s] },
      { label: "D'", pos: [s, s, -s] },
    ];
    const faces = [
      [0, 3, 2, 1], // Bottom ABCD
      [4, 5, 6, 7], // Top A'B'C'D'
      [0, 1, 5, 4], // Left ABB'A'
      [1, 2, 6, 5], // Front BCC'B'
      [2, 3, 7, 6], // Right CDD'C'
      [3, 0, 4, 7], // Back DAA'D'
    ];
    return {
      id: 'cube',
      name: "Hình lập phương ABCD.A'B'C'D'",
      shortDesc: '6 mặt là hình vuông bằng nhau, 12 cạnh bằng a',
      formulaVolume: 'V = a^3',
      formulaArea: 'S_{tp} = 6 a^2',
      isCurved: false,
      supportsUnfold: true,
      vertices,
      faces,
      edges: buildEdges(faces),
      baseFaceIndex: 0,
      netFaces: [
        { faceIndex: 2, hingeA: [-s, -s, -s], hingeB: [-s, -s, s], maxAngle: -Math.PI / 2 },
        { faceIndex: 3, hingeA: [-s, -s, s], hingeB: [s, -s, s], maxAngle: -Math.PI / 2 },
        { faceIndex: 4, hingeA: [s, -s, s], hingeB: [s, -s, -s], maxAngle: -Math.PI / 2 },
        { faceIndex: 5, hingeA: [s, -s, -s], hingeB: [-s, -s, -s], maxAngle: -Math.PI / 2 },
        {
          faceIndex: 1,
          hingeA: [-s, s, s],
          hingeB: [s, s, s],
          maxAngle: -Math.PI / 2,
          parentFaceIndex: 3,
        },
      ],
    };
  })(),

  cuboid: (() => {
    const sx = 1.35;
    const sy = 0.9;
    const sz = 0.85;
    const vertices: SolidVertex[] = [
      { label: 'A', pos: [-sx, -sy, -sz] },
      { label: 'B', pos: [-sx, -sy, sz] },
      { label: 'C', pos: [sx, -sy, sz] },
      { label: 'D', pos: [sx, -sy, -sz] },
      { label: "A'", pos: [-sx, sy, -sz] },
      { label: "B'", pos: [-sx, sy, sz] },
      { label: "C'", pos: [sx, sy, sz] },
      { label: "D'", pos: [sx, sy, -sz] },
    ];
    const faces = [
      [0, 3, 2, 1],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [1, 2, 6, 5],
      [2, 3, 7, 6],
      [3, 0, 4, 7],
    ];
    return {
      id: 'cuboid',
      name: "Hình hộp chữ nhật ABCD.A'B'C'D'",
      shortDesc: '6 mặt là hình chữ nhật, các cạnh bên vuông góc đáy',
      formulaVolume: 'V = a \\cdot b \\cdot c',
      formulaArea: 'S_{tp} = 2(ab + bc + ca)',
      isCurved: false,
      supportsUnfold: true,
      vertices,
      faces,
      edges: buildEdges(faces),
      baseFaceIndex: 0,
      netFaces: [
        { faceIndex: 2, hingeA: [-sx, -sy, -sz], hingeB: [-sx, -sy, sz], maxAngle: -Math.PI / 2 },
        { faceIndex: 3, hingeA: [-sx, -sy, sz], hingeB: [sx, -sy, sz], maxAngle: -Math.PI / 2 },
        { faceIndex: 4, hingeA: [sx, -sy, sz], hingeB: [sx, -sy, -sz], maxAngle: -Math.PI / 2 },
        { faceIndex: 5, hingeA: [sx, -sy, -sz], hingeB: [-sx, -sy, -sz], maxAngle: -Math.PI / 2 },
        {
          faceIndex: 1,
          hingeA: [-sx, sy, sz],
          hingeB: [sx, sy, sz],
          maxAngle: -Math.PI / 2,
          parentFaceIndex: 3,
        },
      ],
    };
  })(),

  prism_tri: (() => {
    const r = 1.3;
    const h = 1.0;
    const a0: [number, number, number] = [0, -h, -r];
    const b0: [number, number, number] = [-r * Math.cos(Math.PI / 6), -h, r * Math.sin(Math.PI / 6)];
    const c0: [number, number, number] = [r * Math.cos(Math.PI / 6), -h, r * Math.sin(Math.PI / 6)];
    const a1: [number, number, number] = [0, h, -r];
    const b1: [number, number, number] = [-r * Math.cos(Math.PI / 6), h, r * Math.sin(Math.PI / 6)];
    const c1: [number, number, number] = [r * Math.cos(Math.PI / 6), h, r * Math.sin(Math.PI / 6)];
    const vertices: SolidVertex[] = [
      { label: 'A', pos: a0 },
      { label: 'B', pos: b0 },
      { label: 'C', pos: c0 },
      { label: "A'", pos: a1 },
      { label: "B'", pos: b1 },
      { label: "C'", pos: c1 },
    ];
    const faces = [
      [0, 2, 1], // Bottom ABC
      [3, 4, 5], // Top A'B'C'
      [0, 1, 4, 3], // ABB'A'
      [1, 2, 5, 4], // BCC'B'
      [2, 0, 3, 5], // CAA'C'
    ];
    return {
      id: 'prism_tri',
      name: "Lăng trụ đứng tam giác ABC.A'B'C'",
      shortDesc: '2 đáy tam giác bằng nhau, các mặt bên là hình chữ nhật',
      formulaVolume: 'V = S_{ABC} \\cdot h',
      formulaArea: 'S_{xq} = 2p \\cdot h',
      isCurved: false,
      supportsUnfold: true,
      vertices,
      faces,
      edges: buildEdges(faces),
      baseFaceIndex: 0,
      netFaces: [
        { faceIndex: 2, hingeA: a0, hingeB: b0, maxAngle: -Math.PI / 2 },
        { faceIndex: 3, hingeA: b0, hingeB: c0, maxAngle: -Math.PI / 2 },
        { faceIndex: 4, hingeA: c0, hingeB: a0, maxAngle: -Math.PI / 2 },
        {
          faceIndex: 1,
          hingeA: b1,
          hingeB: c1,
          maxAngle: -Math.PI / 2,
          parentFaceIndex: 3,
        },
      ],
    };
  })(),

  tetrahedron: (() => {
    const r = 1.45;
    const y0 = -0.75;
    const aPos: [number, number, number] = [0, y0, -r];
    const bPos: [number, number, number] = [-r * Math.cos(Math.PI / 6), y0, r * Math.sin(Math.PI / 6)];
    const cPos: [number, number, number] = [r * Math.cos(Math.PI / 6), y0, r * Math.sin(Math.PI / 6)];
    const side = Math.sqrt(3) * r;
    const h = side * Math.sqrt(2 / 3);
    const vertices: SolidVertex[] = [
      { label: 'A', pos: [0, y0 + h, 0] },
      { label: 'B', pos: aPos },
      { label: 'C', pos: bPos },
      { label: 'D', pos: cPos },
    ];
    const faces = [
      [1, 3, 2], // BCD
      [0, 1, 2], // ABC
      [0, 2, 3], // ACD
      [0, 3, 1], // ADB
    ];
    const apothem = r * 0.5;
    const unfoldAngle = Math.PI - Math.atan2(h, apothem);
    return {
      id: 'tetrahedron',
      name: 'Tứ diện đều ABCD',
      shortDesc: '4 mặt là tam giác đều bằng nhau, thuộc khối Platonic',
      formulaVolume: 'V = \\frac{a^3\\sqrt{2}}{12}',
      formulaArea: 'S_{tp} = a^2\\sqrt{3}',
      isCurved: false,
      supportsUnfold: true,
      vertices,
      faces,
      edges: buildEdges(faces),
      baseFaceIndex: 0,
      netFaces: [
        { faceIndex: 1, hingeA: aPos, hingeB: bPos, maxAngle: -unfoldAngle },
        { faceIndex: 2, hingeA: bPos, hingeB: cPos, maxAngle: -unfoldAngle },
        { faceIndex: 3, hingeA: cPos, hingeB: aPos, maxAngle: -unfoldAngle },
      ],
    };
  })(),

  octahedron: (() => {
    const r = 1.5;
    const vertices: SolidVertex[] = [
      { label: 'S', pos: [0, r, 0] },
      { label: 'A', pos: [r, 0, 0] },
      { label: 'B', pos: [0, 0, r] },
      { label: 'C', pos: [-r, 0, 0] },
      { label: 'D', pos: [0, 0, -r] },
      { label: "S'", pos: [0, -r, 0] },
    ];
    const faces = [
      [0, 1, 2],
      [0, 2, 3],
      [0, 3, 4],
      [0, 4, 1],
      [5, 2, 1],
      [5, 3, 2],
      [5, 4, 3],
      [5, 1, 4],
    ];
    return {
      id: 'octahedron',
      name: 'Bát diện đều',
      shortDesc: '8 mặt tam giác đều, 6 đỉnh, 12 cạnh',
      formulaVolume: 'V = \\frac{a^3\\sqrt{2}}{3}',
      formulaArea: 'S_{tp} = 2a^2\\sqrt{3}',
      isCurved: false,
      supportsUnfold: false,
      vertices,
      faces,
      edges: buildEdges(faces),
    };
  })(),

  cone: {
    id: 'cone',
    name: 'Hình nón tròn xoay',
    shortDesc: 'Đỉnh S, bán kính đáy r, chiều cao h, đường sinh l',
    formulaVolume: 'V = \\frac{1}{3}\\pi r^2 h',
    formulaArea: 'S_{xq} = \\pi r l',
    isCurved: true,
    supportsUnfold: false,
    vertices: [
      { label: 'S', pos: [0, 1.25, 0] },
      { label: 'O', pos: [0, -1.05, 0] },
      { label: 'A', pos: [-1.2, -1.05, 0] },
      { label: 'B', pos: [1.2, -1.05, 0] },
    ],
    faces: [],
    edges: [],
  },

  cylinder: {
    id: 'cylinder',
    name: 'Hình trụ tròn xoay',
    shortDesc: '2 đáy hình tròn bán kính r, trục OO\' vuông góc đáy',
    formulaVolume: 'V = \\pi r^2 h',
    formulaArea: 'S_{xq} = 2\\pi r h',
    isCurved: true,
    supportsUnfold: false,
    vertices: [
      { label: "O'", pos: [0, 1.05, 0] },
      { label: 'O', pos: [0, -1.05, 0] },
      { label: 'A', pos: [-1.1, -1.05, 0] },
      { label: "A'", pos: [-1.1, 1.05, 0] },
    ],
    faces: [],
    edges: [],
  },

  sphere: {
    id: 'sphere',
    name: 'Mặt cầu tâm O bán kính R',
    shortDesc: 'Tập hợp các điểm cách tâm O một khoảng không đổi R',
    formulaVolume: 'V = \\frac{4}{3}\\pi R^3',
    formulaArea: 'S = 4\\pi R^2',
    isCurved: true,
    supportsUnfold: false,
    vertices: [
      { label: 'O', pos: [0, 0, 0] },
      { label: 'N', pos: [0, 1.3, 0] },
      { label: 'S', pos: [0, -1.3, 0] },
    ],
    faces: [],
    edges: [],
  },
};

export interface CrossSectionResult {
  points: THREE.Vector3[];
  shapeName: string;
  area: number;
  perimeter: number;
}

/**
 * Computes exact mathematical intersection polygon between a plane (normal · p = offset)
 * and a convex polyhedron.
 */
export function computePolyhedronCrossSection(
  solid: SolidDefinition,
  planeNormal: THREE.Vector3,
  planeOffset: number
): CrossSectionResult | null {
  if (solid.isCurved || solid.edges.length === 0) return null;

  const n = planeNormal.clone().normalize();
  const hits: THREE.Vector3[] = [];

  for (const edge of solid.edges) {
    const pA = new THREE.Vector3(...solid.vertices[edge.a].pos);
    const pB = new THREE.Vector3(...solid.vertices[edge.b].pos);
    const dA = n.dot(pA) - planeOffset;
    const dB = n.dot(pB) - planeOffset;

    if (Math.abs(dA) < 1e-4 && Math.abs(dB) < 1e-4) {
      hits.push(pA, pB);
    } else if (dA * dB <= 0 && Math.abs(dA - dB) > 1e-6) {
      const t = dA / (dA - dB);
      const pt = pA.clone().lerp(pB, Math.max(0, Math.min(1, t)));
      hits.push(pt);
    }
  }

  // Deduplicate close vertices
  const unique: THREE.Vector3[] = [];
  for (const p of hits) {
    if (!unique.some((u) => u.distanceToSquared(p) < 1e-5)) {
      unique.push(p);
    }
  }

  if (unique.length < 3) return null;

  // Compute centroid
  const centroid = new THREE.Vector3();
  for (const p of unique) centroid.add(p);
  centroid.divideScalar(unique.length);

  // Build orthonormal basis (u, v) on the plane
  const ref = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(ref, n).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();

  // Sort angularly around centroid
  const withAngle = unique.map((p) => {
    const rel = p.clone().sub(centroid);
    const x = rel.dot(u);
    const y = rel.dot(v);
    return { p, x, y, angle: Math.atan2(y, x) };
  });
  withAngle.sort((a, b) => a.angle - b.angle);

  // Shoelace area & perimeter
  let area2 = 0;
  let perimeter = 0;
  for (let i = 0; i < withAngle.length; i++) {
    const curr = withAngle[i];
    const next = withAngle[(i + 1) % withAngle.length];
    area2 += curr.x * next.y - next.x * curr.y;
    perimeter += curr.p.distanceTo(next.p);
  }
  const area = Math.abs(area2) / 2;
  if (area < 1e-4) return null;

  const count = withAngle.length;
  const shapeNames: Record<number, string> = {
    3: 'Tam giác',
    4: 'Tứ giác',
    5: 'Ngũ giác',
    6: 'Lục giác',
    7: 'Thất giác',
    8: 'Bát giác',
  };

  return {
    points: withAngle.map((w) => w.p),
    shapeName: shapeNames[count] || `Đa giác ${count} cạnh`,
    area,
    perimeter,
  };
}
