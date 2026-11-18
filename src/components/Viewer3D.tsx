import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import katex from 'katex';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Eye,
  Layers,
  RotateCcw,
  Scissors,
  Box,
} from 'lucide-react';
import type { SolidType } from '../types/note';
import {
  SOLID_CATALOG,
  computePolyhedronCrossSection,
  type CrossSectionResult,
} from '../utils/solidGeometry3D';

interface Viewer3DProps {
  isDark: boolean;
  onCaptureSnapshot: (dataUrl: string, caption: string) => void;
}

interface ProjectedLabel {
  label: string;
  x: number;
  y: number;
  visible: boolean;
}

const SOLID_LIST: { id: SolidType; label: string }[] = [
  { id: 'pyramid_quad', label: 'Chóp tứ giác' },
  { id: 'pyramid_tri', label: 'Chóp tam giác' },
  { id: 'cube', label: 'Lập phương' },
  { id: 'cuboid', label: 'Hộp chữ nhật' },
  { id: 'prism_tri', label: 'Lăng trụ tam giác' },
  { id: 'tetrahedron', label: 'Tứ diện đều' },
  { id: 'octahedron', label: 'Bát diện đều' },
  { id: 'cone', label: 'Hình nón' },
  { id: 'cylinder', label: 'Hình trụ' },
  { id: 'sphere', label: 'Hình cầu' },
];

// Reusable math objects outside render loop (zero GC)
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _camLocal = new THREE.Vector3();
const _edge1 = new THREE.Vector3();
const _edge2 = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _centroid = new THREE.Vector3();
const _proj = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _axis = new THREE.Vector3();

function rotateAroundHinge(
  point: THREE.Vector3,
  hingeA: THREE.Vector3,
  hingeB: THREE.Vector3,
  angle: number
): THREE.Vector3 {
  _axis.copy(hingeB).sub(hingeA).normalize();
  _quat.setFromAxisAngle(_axis, angle);
  return point.clone().sub(hingeA).applyQuaternion(_quat).add(hingeA);
}

export const Viewer3D: React.FC<Viewer3DProps> = ({ isDark, onCaptureSnapshot }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [solidType, setSolidType] = useState<SolidType>('pyramid_quad');
  const [autoDashed, setAutoDashed] = useState(true);
  const [showFaces, setShowFaces] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showAxes, setShowAxes] = useState(false);

  // Cross-section slicing state
  const [sliceEnabled, setSliceEnabled] = useState(false);
  const [sliceHeight, setSliceHeight] = useState(0.15);
  const [sliceTiltX, setSliceTiltX] = useState(18);
  const [sliceTiltZ, setSliceTiltZ] = useState(-12);
  const [crossSectionInfo, setCrossSectionInfo] = useState<CrossSectionResult | null>(null);

  // Unfold net progress (0..1)
  const [unfoldTarget, setUnfoldTarget] = useState(0);

  // Collapsible bottom dock inside 3D viewport
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'solid' | 'slice' | 'net'>('solid');

  const [projectedLabels, setProjectedLabels] = useState<ProjectedLabel[]>([]);
  const [webglError, setWebglError] = useState<string | null>(null);

  const solidDef = SOLID_CATALOG[solidType];

  // Store reactive refs for Three.js loop without tearing down WebGL context
  const stateRef = useRef({
    solidType,
    autoDashed,
    showFaces,
    showLabels,
    showAxes,
    sliceEnabled,
    sliceHeight,
    sliceTiltX,
    sliceTiltZ,
    unfoldTarget,
    unfoldCurrent: 0,
    isDark,
  });

  stateRef.current = {
    solidType,
    autoDashed,
    showFaces,
    showLabels,
    showAxes,
    sliceEnabled,
    sliceHeight,
    sliceTiltX,
    sliceTiltZ,
    unfoldTarget,
    unfoldCurrent: stateRef.current.unfoldCurrent,
    isDark,
  };

  const sceneApiRef = useRef<{
    rebuildSolid: () => void;
    updateSlice: () => void;
    resetCamera: () => void;
    captureSnapshot: () => void;
    requestRender: () => void;
  } | null>(null);

  const formulaHtml = useMemo(() => {
    try {
      const vHtml = katex.renderToString(solidDef.formulaVolume, { throwOnError: false });
      const sHtml = katex.renderToString(solidDef.formulaArea, { throwOnError: false });
      return `${vHtml} &nbsp;·&nbsp; ${sHtml}`;
    } catch {
      return '';
    }
  }, [solidDef]);

  // Mount Three.js once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: true,
        preserveDrawingBuffer: false,
      });
    } catch {
      setWebglError('Trình duyệt không hỗ trợ WebGL cho chế độ 3D.');
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);
    renderer.setSize(width, height);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(4.1, 3.1, 4.7);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 2.4;
    controls.maxDistance = 12;
    controls.target.set(0, 0, 0);

    // 3-point warm/cool studio lighting
    const hemiLight = new THREE.HemisphereLight(0xe0e7ff, 0x334155, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.5);
    keyLight.position.set(4.5, 6.5, 4.5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
    rimLight.position.set(-4, 2, -5);
    scene.add(rimLight);

    // Subtle ground grid + contact shadow disc
    const gridHelper = new THREE.GridHelper(6, 12, 0x94a3b8, 0xcbd5e1);
    gridHelper.position.y = -1.25;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.25;
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(2.4);
    axesHelper.visible = stateRef.current.showAxes;
    scene.add(axesHelper);

    // Groups for solid geometry & cross-section
    const solidGroup = new THREE.Group();
    const sliceGroup = new THREE.Group();
    scene.add(solidGroup);
    scene.add(sliceGroup);

    // Reusable dynamic edge geometries for polyhedra
    let visibleLines: THREE.LineSegments | null = null;
    let hiddenLines: THREE.LineSegments | null = null;
    let faceMeshes: THREE.Mesh[] = [];
    let currentUnfoldableFaces: { mesh: THREE.Mesh; faceIndex: number }[] = [];

    const faceMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x6366f1,
      roughness: 0.28,
      metalness: 0.05,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const solidEdgeMat = new THREE.LineBasicMaterial({ color: 0x1e293b });
    const dashedEdgeMat = new THREE.LineDashedMaterial({
      color: 0x475569,
      dashSize: 0.12,
      gapSize: 0.09,
    });

    const slicePlaneMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const slicePolyMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const sliceBorderMat = new THREE.LineBasicMaterial({ color: 0xd97706 });

    function clearGroup(grp: THREE.Group) {
      while (grp.children.length > 0) {
        const child = grp.children[0];
        grp.remove(child);
        if ((child as THREE.Mesh).geometry) {
          (child as THREE.Mesh).geometry.dispose();
        }
      }
    }

    function updateEdgeVisibility() {
      const def = SOLID_CATALOG[stateRef.current.solidType];
      if (def.isCurved || !visibleLines || !hiddenLines) return;

      // Skip hidden-edge calculation when net is unfolding (all faces open)
      const isUnfolding = stateRef.current.unfoldCurrent > 0.02;

      _camLocal.copy(camera.position);
      solidGroup.worldToLocal(_camLocal);

      const frontFacing: boolean[] = def.faces.map((face) => {
        if (face.length < 3) return true;
        _vecA.set(...def.vertices[face[0]].pos);
        _vecB.set(...def.vertices[face[1]].pos);
        _vecC.set(...def.vertices[face[2]].pos);
        _edge1.copy(_vecB).sub(_vecA);
        _edge2.copy(_vecC).sub(_vecA);
        _normal.crossVectors(_edge1, _edge2).normalize();

        _centroid.set(0, 0, 0);
        for (const idx of face) {
          _centroid.x += def.vertices[idx].pos[0];
          _centroid.y += def.vertices[idx].pos[1];
          _centroid.z += def.vertices[idx].pos[2];
        }
        _centroid.divideScalar(face.length);
        return _normal.dot(_vecA.copy(_camLocal).sub(_centroid)) > 0;
      });

      const visPos: number[] = [];
      const hidPos: number[] = [];

      def.edges.forEach((edge) => {
        const pA = def.vertices[edge.a].pos;
        const pB = def.vertices[edge.b].pos;
        const anyFront =
          !stateRef.current.autoDashed ||
          isUnfolding ||
          edge.faces.some((fIdx) => frontFacing[fIdx]);

        if (anyFront) {
          visPos.push(pA[0], pA[1], pA[2], pB[0], pB[1], pB[2]);
        } else {
          hidPos.push(pA[0], pA[1], pA[2], pB[0], pB[1], pB[2]);
        }
      });

      visibleLines.geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(visPos, 3)
      );
      hiddenLines.geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(hidPos, 3)
      );
      visibleLines.geometry.computeBoundingSphere();
      hiddenLines.geometry.computeBoundingSphere();
      hiddenLines.computeLineDistances();
    }

    function applyUnfold(t: number) {
      const def = SOLID_CATALOG[stateRef.current.solidType];
      if (!def.supportsUnfold || !def.netFaces || currentUnfoldableFaces.length === 0) return;

      // Hide wireframe edges when unfolded > 2% so unfolded faces look crisp
      if (visibleLines && hiddenLines) {
        const showSolidWire = t < 0.02;
        visibleLines.visible = showSolidWire;
        hiddenLines.visible = showSolidWire;
      }

      const netMap = new Map(def.netFaces.map((nf) => [nf.faceIndex, nf]));

      currentUnfoldableFaces.forEach(({ mesh, faceIndex }) => {
        const face = def.faces[faceIndex];
        const posAttr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;

        const nf = netMap.get(faceIndex);
        const pts: THREE.Vector3[] = face.map((vi) => new THREE.Vector3(...def.vertices[vi].pos));

        if (nf) {
          const parentNf = nf.parentFaceIndex !== undefined ? netMap.get(nf.parentFaceIndex) : undefined;
          const hA = new THREE.Vector3(...nf.hingeA);
          const hB = new THREE.Vector3(...nf.hingeB);

          for (let i = 0; i < pts.length; i++) {
            let p = rotateAroundHinge(pts[i], hA, hB, nf.maxAngle * t);
            if (parentNf) {
              const pA = new THREE.Vector3(...parentNf.hingeA);
              const pB = new THREE.Vector3(...parentNf.hingeB);
              p = rotateAroundHinge(p, pA, pB, parentNf.maxAngle * t);
            }
            pts[i] = p;
          }
        }

        // Triangulate polygon fan
        let vIdx = 0;
        for (let i = 1; i < pts.length - 1; i++) {
          posAttr.setXYZ(vIdx++, pts[0].x, pts[0].y, pts[0].z);
          posAttr.setXYZ(vIdx++, pts[i].x, pts[i].y, pts[i].z);
          posAttr.setXYZ(vIdx++, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
        }
        posAttr.needsUpdate = true;
        mesh.geometry.computeVertexNormals();

        // Update face border child line loop if present
        const borderLine = mesh.children[0] as THREE.LineLoop | undefined;
        if (borderLine) {
          const bAttr = borderLine.geometry.getAttribute('position') as THREE.BufferAttribute;
          for (let i = 0; i < pts.length; i++) {
            bAttr.setXYZ(i, pts[i].x, pts[i].y, pts[i].z);
          }
          bAttr.needsUpdate = true;
        }
      });
    }

    function rebuildSolid() {
      clearGroup(solidGroup);
      faceMeshes = [];
      currentUnfoldableFaces = [];
      visibleLines = null;
      hiddenLines = null;

      const def = SOLID_CATALOG[stateRef.current.solidType];
      const dark = stateRef.current.isDark;
      solidEdgeMat.color.setHex(dark ? 0xe2e8f0 : 0x1e293b);
      dashedEdgeMat.color.setHex(dark ? 0x94a3b8 : 0x64748b);
      faceMaterial.color.setHex(dark ? 0x818cf8 : 0x4f46e5);
      faceMaterial.opacity = stateRef.current.showFaces ? (dark ? 0.24 : 0.18) : 0;

      if (!def.isCurved) {
        // Build individual face meshes (supports both translucent view & net unfolding)
        def.faces.forEach((face, fIdx) => {
          const triCount = face.length - 2;
          const posArr = new Float32Array(triCount * 9);
          let ptr = 0;
          const p0 = def.vertices[face[0]].pos;
          for (let i = 1; i < face.length - 1; i++) {
            const p1 = def.vertices[face[i]].pos;
            const p2 = def.vertices[face[i + 1]].pos;
            posArr[ptr++] = p0[0];
            posArr[ptr++] = p0[1];
            posArr[ptr++] = p0[2];
            posArr[ptr++] = p1[0];
            posArr[ptr++] = p1[1];
            posArr[ptr++] = p1[2];
            posArr[ptr++] = p2[0];
            posArr[ptr++] = p2[1];
            posArr[ptr++] = p2[2];
          }
          const fGeo = new THREE.BufferGeometry();
          fGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
          fGeo.computeVertexNormals();
          const mesh = new THREE.Mesh(fGeo, faceMaterial);
          mesh.visible = stateRef.current.showFaces || stateRef.current.unfoldCurrent > 0.02;

          // Attach crisp per-face border (useful when unfolding net)
          const borderPos = new Float32Array(face.length * 3);
          face.forEach((vi, i) => {
            const vp = def.vertices[vi].pos;
            borderPos[i * 3] = vp[0];
            borderPos[i * 3 + 1] = vp[1];
            borderPos[i * 3 + 2] = vp[2];
          });
          const bGeo = new THREE.BufferGeometry();
          bGeo.setAttribute('position', new THREE.BufferAttribute(borderPos, 3));
          const bLine = new THREE.LineLoop(bGeo, solidEdgeMat);
          bLine.visible = stateRef.current.unfoldCurrent > 0.02;
          mesh.add(bLine);

          solidGroup.add(mesh);
          faceMeshes.push(mesh);
          currentUnfoldableFaces.push({ mesh, faceIndex: fIdx });
        });

        // Dynamic visible & hidden dashed edge LineSegments
        visibleLines = new THREE.LineSegments(new THREE.BufferGeometry(), solidEdgeMat);
        hiddenLines = new THREE.LineSegments(new THREE.BufferGeometry(), dashedEdgeMat);
        solidGroup.add(visibleLines);
        solidGroup.add(hiddenLines);

        // Vertex anchor spheres
        const dotGeo = new THREE.SphereGeometry(0.042, 12, 12);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0x4f46e5 });
        def.vertices.forEach((v) => {
          const dot = new THREE.Mesh(dotGeo, dotMat);
          dot.position.set(...v.pos);
          solidGroup.add(dot);
        });

        updateEdgeVisibility();
        if (stateRef.current.unfoldCurrent > 0.01) {
          applyUnfold(stateRef.current.unfoldCurrent);
        }
      } else {
        // Curved solids: Cone, Cylinder, Sphere
        let geo: THREE.BufferGeometry;
        if (def.id === 'cone') {
          geo = new THREE.ConeGeometry(1.2, 2.3, 40, 1, false);
          geo.translate(0, 0.1, 0);
        } else if (def.id === 'cylinder') {
          geo = new THREE.CylinderGeometry(1.1, 1.1, 2.1, 40, 1, false);
        } else {
          geo = new THREE.SphereGeometry(1.3, 36, 24);
        }

        const mesh = new THREE.Mesh(geo, faceMaterial);
        mesh.visible = stateRef.current.showFaces;
        solidGroup.add(mesh);

        // Ring outlines & axis lines for Grade 11 curved geometry readability
        const ringMat = solidEdgeMat;
        if (def.id === 'cone' || def.id === 'cylinder') {
          const r = def.id === 'cone' ? 1.2 : 1.1;
          const yBot = -1.05;
          const pts: THREE.Vector3[] = [];
          for (let i = 0; i <= 64; i++) {
            const a = (i / 64) * Math.PI * 2;
            pts.push(new THREE.Vector3(Math.cos(a) * r, yBot, Math.sin(a) * r));
          }
          solidGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));

          if (def.id === 'cylinder') {
            const topPts = pts.map((p) => new THREE.Vector3(p.x, 1.05, p.z));
            solidGroup.add(
              new THREE.Line(new THREE.BufferGeometry().setFromPoints(topPts), ringMat)
            );
          }

          // Height axis SO / OO' dashed
          const axisPts =
            def.id === 'cone'
              ? [new THREE.Vector3(0, 1.25, 0), new THREE.Vector3(0, yBot, 0)]
              : [new THREE.Vector3(0, 1.05, 0), new THREE.Vector3(0, yBot, 0)];
          const axisLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(axisPts),
            dashedEdgeMat
          );
          axisLine.computeLineDistances();
          solidGroup.add(axisLine);

          // Radius line
          const radPts = [new THREE.Vector3(0, yBot, 0), new THREE.Vector3(-r, yBot, 0)];
          const radLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(radPts),
            dashedEdgeMat
          );
          radLine.computeLineDistances();
          solidGroup.add(radLine);
        } else {
          // Equator & meridian rings for Sphere
          const eqPts: THREE.Vector3[] = [];
          const merPts: THREE.Vector3[] = [];
          for (let i = 0; i <= 64; i++) {
            const a = (i / 64) * Math.PI * 2;
            eqPts.push(new THREE.Vector3(Math.cos(a) * 1.3, 0, Math.sin(a) * 1.3));
            merPts.push(new THREE.Vector3(Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0));
          }
          solidGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(eqPts), ringMat));
          solidGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(merPts), dashedEdgeMat));
        }
      }
    }

    function updateSlice() {
      clearGroup(sliceGroup);
      if (!stateRef.current.sliceEnabled) {
        setCrossSectionInfo(null);
        return;
      }

      const def = SOLID_CATALOG[stateRef.current.solidType];
      const rx = THREE.MathUtils.degToRad(stateRef.current.sliceTiltX);
      const rz = THREE.MathUtils.degToRad(stateRef.current.sliceTiltZ);
      const normal = new THREE.Vector3(0, 1, 0)
        .applyAxisAngle(new THREE.Vector3(1, 0, 0), rx)
        .applyAxisAngle(new THREE.Vector3(0, 0, 1), rz)
        .normalize();
      const offset = stateRef.current.sliceHeight;

      // Translucent cutting plane quad
      const planeGeo = new THREE.PlaneGeometry(3.8, 3.8);
      const planeMesh = new THREE.Mesh(planeGeo, slicePlaneMat);
      const up = new THREE.Vector3(0, 0, 1);
      planeMesh.quaternion.setFromUnitVectors(up, normal);
      planeMesh.position.copy(normal).multiplyScalar(offset);
      sliceGroup.add(planeMesh);

      // Border around cutting plane
      const planeEdges = new THREE.EdgesGeometry(planeGeo);
      const planeWire = new THREE.LineSegments(
        planeEdges,
        new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.45 })
      );
      planeWire.quaternion.copy(planeMesh.quaternion);
      planeWire.position.copy(planeMesh.position);
      sliceGroup.add(planeWire);

      if (!def.isCurved) {
        const res = computePolyhedronCrossSection(def, normal, offset);
        setCrossSectionInfo(res);
        if (res && res.points.length >= 3) {
          const triCount = res.points.length - 2;
          const arr = new Float32Array(triCount * 9);
          let ptr = 0;
          const p0 = res.points[0];
          for (let i = 1; i < res.points.length - 1; i++) {
            const p1 = res.points[i];
            const p2 = res.points[i + 1];
            arr[ptr++] = p0.x;
            arr[ptr++] = p0.y;
            arr[ptr++] = p0.z;
            arr[ptr++] = p1.x;
            arr[ptr++] = p1.y;
            arr[ptr++] = p1.z;
            arr[ptr++] = p2.x;
            arr[ptr++] = p2.y;
            arr[ptr++] = p2.z;
          }
          const polyGeo = new THREE.BufferGeometry();
          polyGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
          sliceGroup.add(new THREE.Mesh(polyGeo, slicePolyMat));

          const loopPts = [...res.points, res.points[0]];
          const borderGeo = new THREE.BufferGeometry().setFromPoints(loopPts);
          sliceGroup.add(new THREE.Line(borderGeo, sliceBorderMat));
        }
      } else if (def.id === 'sphere') {
        const R = 1.3;
        if (Math.abs(offset) < R) {
          const r = Math.sqrt(R * R - offset * offset);
          const circleGeo = new THREE.CircleGeometry(r, 48);
          const circleMesh = new THREE.Mesh(circleGeo, slicePolyMat);
          circleMesh.quaternion.copy(planeMesh.quaternion);
          circleMesh.position.copy(planeMesh.position);
          sliceGroup.add(circleMesh);
          setCrossSectionInfo({
            points: [],
            shapeName: 'Hình tròn',
            area: Math.PI * r * r,
            perimeter: 2 * Math.PI * r,
          });
        } else {
          setCrossSectionInfo(null);
        }
      } else {
        setCrossSectionInfo({
          points: [],
          shapeName: 'Thiết diện Elip / Tròn',
          area: 0,
          perimeter: 0,
        });
      }
    }

    function updateProjectedLabels() {
      if (!stateRef.current.showLabels || stateRef.current.unfoldCurrent > 0.05) {
        setProjectedLabels([]);
        return;
      }
      const def = SOLID_CATALOG[stateRef.current.solidType];
      const w = renderer.domElement.clientWidth;
      const h = renderer.domElement.clientHeight;
      const next: ProjectedLabel[] = def.vertices.map((v) => {
        _proj.set(...v.pos);
        solidGroup.localToWorld(_proj);
        _proj.project(camera);
        return {
          label: v.label,
          x: ((_proj.x + 1) / 2) * w,
          y: ((-_proj.y + 1) / 2) * h,
          visible: _proj.z < 1 && _proj.z > -1,
        };
      });
      setProjectedLabels(next);
    }

    // Coalesced on-demand renderer
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const poll = () => {
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        renderDirty = false;
        const delta = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        // Smoothly damp net unfolding
        const diff = stateRef.current.unfoldTarget - stateRef.current.unfoldCurrent;
        if (Math.abs(diff) > 0.002) {
          stateRef.current.unfoldCurrent = THREE.MathUtils.damp(
            stateRef.current.unfoldCurrent,
            stateRef.current.unfoldTarget,
            8,
            Math.max(delta, 0.016)
          );
          const isUnfolding = stateRef.current.unfoldCurrent > 0.02;
          faceMeshes.forEach((m) => {
            m.visible = stateRef.current.showFaces || isUnfolding;
            const bLine = m.children[0] as THREE.LineLoop | undefined;
            if (bLine) bLine.visible = isUnfolding;
          });
          applyUnfold(stateRef.current.unfoldCurrent);
          renderDirty = true;
        }

        const dampingChanged = controls.update();
        if (dampingChanged) renderDirty = true;

        axesHelper.visible = stateRef.current.showAxes;
        updateEdgeVisibility();
        renderer.render(scene, camera);
        updateProjectedLabels();

        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    controls.addEventListener('change', requestRender);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError('WebGL context tạm ngưng. Đang khôi phục...');
    };
    const onContextRestored = () => {
      setWebglError(null);
      requestRender();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const resizeObserver = new ResizeObserver(() => {
      const cw = Math.max(container.clientWidth, 100);
      const ch = Math.max(container.clientHeight, 100);
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
      requestRender();
    });
    resizeObserver.observe(container);

    sceneApiRef.current = {
      rebuildSolid: () => {
        rebuildSolid();
        requestRender();
      },
      updateSlice: () => {
        updateSlice();
        requestRender();
      },
      resetCamera: () => {
        camera.position.set(4.1, 3.1, 4.7);
        controls.target.set(0, 0, 0);
        controls.update();
        requestRender();
      },
      captureSnapshot: () => {
        // Render cleanly right before reading drawing buffer
        renderer.render(scene, camera);
        const w = renderer.domElement.width;
        const h = renderer.domElement.height;
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const ctx = off.getContext('2d');
        if (!ctx) return;

        // Clean paper-friendly background
        ctx.fillStyle = stateRef.current.isDark ? '#0f172a' : '#f8fafc';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(renderer.domElement, 0, 0);

        // Draw crisp vertex labels onto snapshot
        const def = SOLID_CATALOG[stateRef.current.solidType];
        if (stateRef.current.showLabels && stateRef.current.unfoldCurrent <= 0.05) {
          const dpr = renderer.getPixelRatio();
          ctx.font = `600 ${Math.round(14 * dpr)}px "Plus Jakarta Sans", sans-serif`;
          ctx.textBaseline = 'middle';
          def.vertices.forEach((v) => {
            _proj.set(...v.pos);
            solidGroup.localToWorld(_proj);
            _proj.project(camera);
            if (_proj.z < 1 && _proj.z > -1) {
              const px = ((_proj.x + 1) / 2) * w;
              const py = ((-_proj.y + 1) / 2) * h - 12 * dpr;
              ctx.fillStyle = stateRef.current.isDark ? '#f8fafc' : '#1e293b';
              ctx.fillText(v.label, px + 4 * dpr, py);
            }
          });
        }

        const dataUrl = off.toDataURL('image/png');
        onCaptureSnapshot(dataUrl, def.name);
      },
      requestRender,
    };

    rebuildSolid();
    updateSlice();
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    requestRender();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      clearGroup(solidGroup);
      clearGroup(sliceGroup);
      faceMaterial.dispose();
      solidEdgeMat.dispose();
      dashedEdgeMat.dispose();
      slicePlaneMat.dispose();
      slicePolyMat.dispose();
      sliceBorderMat.dispose();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync reactive controls to Three.js scene without recreating WebGL context
  useEffect(() => {
    stateRef.current.unfoldCurrent = 0;
    setUnfoldTarget(0);
    sceneApiRef.current?.rebuildSolid();
    sceneApiRef.current?.updateSlice();
  }, [solidType]);

  useEffect(() => {
    sceneApiRef.current?.rebuildSolid();
  }, [autoDashed, showFaces, isDark]);

  useEffect(() => {
    sceneApiRef.current?.updateSlice();
  }, [sliceEnabled, sliceHeight, sliceTiltX, sliceTiltZ]);

  useEffect(() => {
    sceneApiRef.current?.requestRender();
  }, [unfoldTarget, showLabels, showAxes]);

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-100 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 select-none overflow-hidden">
      {/* Top compact header bar */}
      <div className="z-10 flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
            {solidDef.name}
          </div>
          <div
            className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5"
            dangerouslySetInnerHTML={{ __html: formulaHtml }}
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => sceneApiRef.current?.resetCamera()}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Đặt lại góc nhìn"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => sceneApiRef.current?.captureSnapshot()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
            title="Chụp ảnh khối 3D và dán vào trang ghi chú 2D"
          >
            <Camera className="w-3.5 h-3.5" />
            Dán vào 2D
          </button>
        </div>
      </div>

      {/* Central 3D Viewport (100% unobstructed) */}
      <div className="relative flex-1 min-h-0">
        <div ref={mountRef} className="w-full h-full" />

        {/* Projected 3D Vertex Labels */}
        {showLabels &&
          projectedLabels.map(
            (lbl) =>
              lbl.visible && (
                <div
                  key={lbl.label}
                  style={{
                    transform: `translate(${Math.round(lbl.x)}px, ${Math.round(lbl.y - 14)}px)`,
                  }}
                  className="pointer-events-none absolute top-0 left-0 -translate-x-1/2 px-1.5 py-0.5 rounded bg-white/85 dark:bg-slate-900/85 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-900 dark:text-slate-100 shadow-xs"
                >
                  {lbl.label}
                </div>
              )
          )}

        {/* Cross-section metric readout */}
        {sliceEnabled && (
          <div className="pointer-events-none absolute top-3 left-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-white/95 dark:bg-slate-900/95 px-3 py-2 shadow-sm text-xs">
            <div className="font-semibold text-amber-700 dark:text-amber-400">
              {crossSectionInfo
                ? `Thiết diện: ${crossSectionInfo.shapeName}`
                : 'Mặt phẳng không cắt khối'}
            </div>
            {crossSectionInfo && crossSectionInfo.area > 0 && (
              <div className="text-[11px] text-slate-600 dark:text-slate-300 tabular-nums mt-0.5">
                S ≈ {crossSectionInfo.area.toFixed(2)} đvdt · P ≈{' '}
                {crossSectionInfo.perimeter.toFixed(2)} đvđd
              </div>
            )}
          </div>
        )}

        {webglError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100/90 dark:bg-slate-900/90 p-6 text-center text-xs text-slate-600 dark:text-slate-300">
            {webglError}
          </div>
        )}
      </div>

      {/* Collapsible Bottom Control Dock (no backdrop-filter over WebGL) */}
      <div className="z-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1">
            {(
              [
                { id: 'solid', label: 'Thư viện khối', icon: Box },
                { id: 'slice', label: 'Cắt thiết diện', icon: Scissors },
                { id: 'net', label: 'Mở mạng & Hiển thị', icon: Layers },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setDockCollapsed(false);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            title={dockCollapsed ? 'Mở bảng điều khiển 3D' : 'Thu gọn bảng điều khiển 3D'}
          >
            {dockCollapsed ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {!dockCollapsed && (
          <div className="p-3 space-y-2.5 max-h-48 overflow-y-auto">
            {activeTab === 'solid' && (
              <div className="grid grid-cols-2 gap-1.5">
                {SOLID_LIST.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSolidType(item.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-left text-xs font-medium truncate transition-colors border ${
                      solidType === item.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'slice' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    Bật mặt phẳng cắt (α)
                  </span>
                  <button
                    type="button"
                    onClick={() => setSliceEnabled((v) => !v)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      sliceEnabled
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {sliceEnabled ? 'Đang cắt' : 'Bật cắt'}
                  </button>
                </div>

                {sliceEnabled && (
                  <div className="space-y-1.5 text-xs">
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-slate-600 dark:text-slate-400 w-24 shrink-0">
                        Độ cao h: {sliceHeight.toFixed(2)}
                      </span>
                      <input
                        type="range"
                        min={-1.1}
                        max={1.1}
                        step={0.05}
                        value={sliceHeight}
                        onChange={(e) => setSliceHeight(Number(e.target.value))}
                        className="flex-1 accent-amber-500"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-slate-600 dark:text-slate-400 w-24 shrink-0">
                        Nghiêng X: {sliceTiltX}°
                      </span>
                      <input
                        type="range"
                        min={-65}
                        max={65}
                        step={1}
                        value={sliceTiltX}
                        onChange={(e) => setSliceTiltX(Number(e.target.value))}
                        className="flex-1 accent-amber-500"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-slate-600 dark:text-slate-400 w-24 shrink-0">
                        Nghiêng Z: {sliceTiltZ}°
                      </span>
                      <input
                        type="range"
                        min={-65}
                        max={65}
                        step={1}
                        value={sliceTiltZ}
                        onChange={(e) => setSliceTiltZ(Number(e.target.value))}
                        className="flex-1 accent-amber-500"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'net' && (
              <div className="space-y-2.5">
                {solidDef.supportsUnfold ? (
                  <label className="block space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        Mở mạng (Unfold Net)
                      </span>
                      <span className="font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                        {Math.round(unfoldTarget * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={unfoldTarget}
                      onChange={(e) => setUnfoldTarget(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </label>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Khối này không hỗ trợ mở mạng phẳng. Chọn Lập phương, Hộp chữ nhật, Lăng trụ hoặc Chóp đều để mở mạng.
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setAutoDashed((v) => !v)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      autoDashed
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    Nét khuất tự động
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFaces((v) => !v)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      showFaces
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Tô mặt phẳng
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLabels((v) => !v)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      showLabels
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Nhãn đỉnh
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAxes((v) => !v)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      showAxes
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Hệ trục Oxyz
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
