//PaperPreview3D.js
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import "../TshirtCustomizer/TshirtCustomizer.css";

// From paper.glb's UV report: one mesh, "FRONT", 100% coverage,
// U range 0.00-1.00 / V range 0.00-1.00 — a clean full-bleed island.
const FRONT_MESH = "FRONT";
const ZONE_UV = { uMin: 0, uMax: 1, vMin: 0, vMax: 1 };
const CANVAS_W = 2048;
const CANVAS_H = 1170; // business-card proportions, 3.5 x 2
const DEFAULT_MODEL_PATH = "/models/paper.glb";
function drawTextLayer(ctx, t, zoneW, zoneH) {
  const boxX = (t.x / 100) * zoneW;
  const boxY = (t.y / 100) * zoneH;
  const boxW = (t.w / 100) * zoneW;
  const boxH = (t.h / 100) * zoneH;
  const fontPx = (t.fontSize / 100) * zoneH;

  ctx.save();
  ctx.font = `${t.italic ? "italic " : ""}${t.bold ? "700" : "400"} ${fontPx}px ${t.fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = t.align === "left" ? "left" : t.align === "right" ? "right" : "center";
  let drawX = boxX + boxW / 2;
  if (t.align === "left") drawX = boxX;
  if (t.align === "right") drawX = boxX + boxW;
  const drawY = boxY + boxH / 2;

  if (t.shadow) {
    ctx.shadowColor = t.shadowColor;
    ctx.shadowBlur = (t.shadowBlur / 100) * zoneH;
  }
  if (t.outline) {
    ctx.lineWidth = (t.outlineWidth / 100) * zoneH;
    ctx.strokeStyle = t.outlineColor;
    ctx.strokeText(t.text || "", drawX, drawY);
  }
  ctx.fillStyle = t.color;
  ctx.fillText(t.text || "", drawX, drawY);
  ctx.restore();
}

const imageCache = {};
function loadImageCached(url, onLoad) {
  if (imageCache[url]) return onLoad(imageCache[url]);
  const img = new Image();
  if (!url.startsWith("blob:") && !url.startsWith("data:")) img.crossOrigin = "Anonymous";
  img.onload = () => { imageCache[url] = img; onLoad(img); };
  img.onerror = (e) => console.error("Failed to load image:", url, e);
  img.src = url;
}

export default function PaperPreview3D({
  modelPath = "/models/paper.glb",
  shirtColor = "#ffffff",
  zoneDesigns = {},
  zoneTexts = {},
  onZoneDesignChange,
  onTextChange,
  onZoneSelect,
  onTextSelect,
}) {
  const mountRef = useRef(null);
  const modelRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(100);

  const colorRef = useRef(shirtColor); colorRef.current = shirtColor;
  const designsRef = useRef(zoneDesigns); designsRef.current = zoneDesigns;
  const zoneTextsRef = useRef(zoneTexts); zoneTextsRef.current = zoneTexts;
  const onZoneDesignChangeRef = useRef(onZoneDesignChange); onZoneDesignChangeRef.current = onZoneDesignChange;
  const onTextChangeRef = useRef(onTextChange); onTextChangeRef.current = onTextChange;
  const onZoneSelectRef = useRef(onZoneSelect); onZoneSelectRef.current = onZoneSelect;
  const onTextSelectRef = useRef(onTextSelect); onTextSelectRef.current = onTextSelect;

  const updateTexture = useCallback(() => {
    const model = modelRef.current;
    if (!model) return;
    const target = model.getObjectByName(FRONT_MESH);
    if (!target?.material) return;

    const design = designsRef.current.front;
    const texts = zoneTextsRef.current.front || [];
    const hasContent = design?.imageUrl || texts.length > 0;

    if (!hasContent) {
      if (target.material.map) target.material.map.dispose();
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorRef.current),
        roughness: 0.72,
        metalness: 0.02,
        side: THREE.DoubleSide,
      });
      target.material.dispose();
      target.material = mat;
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = colorRef.current;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const paint = () => {
      texts.forEach((t) => drawTextLayer(ctx, t, canvas.width, canvas.height));
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      if (target.material.map) target.material.map.dispose();
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#ffffff"),
        map: texture,
        roughness: 0.72,
        metalness: 0.02,
        side: THREE.DoubleSide,
      });
      target.material.dispose();
      target.material = mat;
    };

    if (design?.imageUrl) {
      loadImageCached(design.imageUrl, (img) => {
        const x = design.x ?? 10, y = design.y ?? 10, w = design.w ?? 80, h = design.h ?? 80;
        ctx.drawImage(img, (x / 100) * canvas.width, (y / 100) * canvas.height, (w / 100) * canvas.width, (h / 100) * canvas.height);
        paint();
      });
    } else {
      paint();
    }
  }, []);

  useEffect(() => {
    if (!mountRef.current || !modelPath) return;
    setReady(false);
    setError("");
    const container = mountRef.current;
    const width = container.offsetWidth || 260;
    const height = container.offsetHeight || 340;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x1e2433);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 3);
    camera.zoom = zoom / 100;
    camera.updateProjectionMatrix();
    cameraRef.current = camera;

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(5, 10, 7.5);
    scene.add(dir);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.8));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controlsRef.current = controls;

    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();
    let dragState = null;
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const getNDC = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      return pointerNDC;
    };

    const raycastFront = (clientX, clientY) => {
      const model = modelRef.current;
      if (!model) return null;
      const target = model.getObjectByName(FRONT_MESH);
      if (!target) return null;
      getNDC(clientX, clientY);
      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObject(target, false);
      if (!hits.length || !hits[0].uv) return null;
      const { uMin, uMax, vMin, vMax } = ZONE_UV;
      const pctX = ((hits[0].uv.x - uMin) / (uMax - uMin)) * 100;
      const pctY = (1 - ((hits[0].uv.y - vMin) / (vMax - vMin))) * 100;
      return { pct: { x: pctX, y: pctY } };
    };

    const findHitTarget = (pctX, pctY) => {
      const texts = zoneTextsRef.current.front || [];
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i];
        if (pctX >= t.x && pctX <= t.x + t.w && pctY >= t.y && pctY <= t.y + t.h) {
          return { kind: "text", id: t.id, w: t.w, h: t.h, x: t.x, y: t.y };
        }
      }
      const d = designsRef.current.front;
      if (d?.imageUrl) {
        const dx = d.x ?? 10, dy = d.y ?? 10, dw = d.w ?? 80, dh = d.h ?? 80;
        if (pctX >= dx && pctX <= dx + dw && pctY >= dy && pctY <= dy + dh) {
          return { kind: "image", w: dw, h: dh, x: dx, y: dy };
        }
      }
      return null;
    };

    const applyDrag = (x, y) => {
      if (!dragState) return;
      if (dragState.kind === "image") {
        const design = designsRef.current.front || {};
        onZoneDesignChangeRef.current?.("front", { ...design, x, y });
      } else {
        onTextChangeRef.current?.("front", dragState.id, { x, y });
      }
    };

    const onPointerMove = (e) => {
      if (!dragState) return;
      const hit = raycastFront(e.clientX, e.clientY);
      if (!hit) return;
      applyDrag(
        clamp(hit.pct.x - dragState.grabDX, 0, 100 - dragState.w),
        clamp(hit.pct.y - dragState.grabDY, 0, 100 - dragState.h),
      );
    };

    const onPointerUp = () => {
      dragState = null;
      controls.enabled = true;
      renderer.domElement.style.cursor = "auto";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    const onPointerDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const hit = raycastFront(e.clientX, e.clientY);
      if (!hit) return;
      const target = findHitTarget(hit.pct.x, hit.pct.y);
      if (!target) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      controls.enabled = false;
      dragState = { kind: target.kind, id: target.id, w: target.w, h: target.h, grabDX: hit.pct.x - target.x, grabDY: hit.pct.y - target.y };
      renderer.domElement.style.cursor = "grabbing";
      onZoneSelectRef.current?.("front");
      if (target.id) onTextSelectRef.current?.("front", target.id);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown, true);

    new GLTFLoader().load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        modelRef.current = model;
        scene.add(model);
        updateTexture();

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        const dist = (maxDim / 2 / Math.tan(fov / 2)) * 2;
        camera.position.set(center.x, center.y, center.z + dist);
        camera.near = dist / 100;
        camera.far = dist * 100;
        camera.updateProjectionMatrix();
        controls.target.copy(center);
        controls.update();
        setReady(true);
      },
      undefined,
      () => setError(`Failed to load 3D model: ${modelPath}`),
    );

    let rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = container.offsetWidth || 260;
      const h = container.offsetHeight || 340;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown, true);
      ro.disconnect();
      cancelAnimationFrame(rafId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      if (modelRef.current) {
        modelRef.current.traverse((node) => {
          if (!node.isMesh) return;
          node.geometry?.dispose();
          (Array.isArray(node.material) ? node.material : [node.material]).forEach((m) => m?.dispose());
        });
      }
      modelRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelPath]);

  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.zoom = zoom / 100;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [zoom]);

  useEffect(() => {
    if (ready) updateTexture();
  }, [ready, zoneDesigns, zoneTexts, shirtColor, updateTexture]);

  return (
    <div className="tsc-preview-panel">
      <div className="tsc-preview-3d" ref={mountRef}>
        {!ready && !error && (
          <div className="tsc-preview-loading">
            <span className="tsc-spinner" />
            <span>Loading 3D preview...</span>
          </div>
        )}
        {error && <div className="tsc-preview-error">{error}</div>}
      </div>
      <div className="tsc-zoom-row">
        <button type="button" className="tsc-zoom-btn" onClick={() => setZoom((z) => Math.max(50, z - 25))}>-</button>
        <span>{zoom}%</span>
        <button type="button" className="tsc-zoom-btn" onClick={() => setZoom((z) => Math.min(200, z + 25))}>+</button>
      </div>
    </div>
  );
}