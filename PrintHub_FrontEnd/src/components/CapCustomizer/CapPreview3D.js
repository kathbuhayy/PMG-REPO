import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import "../TshirtCustomizer/TshirtCustomizer.css";

// ── Cap-specific mesh map ──────────────────────────────────────────
// Real mesh/node names inside base_cap.glb, grouped by logical zone.
// Update THIS list (and nowhere else) whenever the cap model is re-exported.
const CAP_ZONE_MESH_MAP = {
  front: ["BODY_F_R", "BODY_F_L", "F_OL_R", "F_OL_L"],
  back: ["BODY_B_L", "BODY_B_R", "B_OL_R", "B_OL_L"],
  left_side: ["BODY_L", "L_OL"],
  right_side: ["RIGHT_BODY", "R_OL"],
};

const ZONE_FACE = {
  front: "front",
  back: "back",
  left_side: "left",
  right_side: "right",
};

function drawTextLayer(ctx, t, zoneX, zoneY, zoneW, zoneH) {
  const boxX = zoneX + (t.x / 100) * zoneW;
  const boxY = zoneY + (t.y / 100) * zoneH;
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
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
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
function loadImageCached(url, onLoad, onError) {
  if (imageCache[url]) {
    onLoad(imageCache[url]);
    return;
  }
  const img = new Image();
  if (!url.startsWith("blob:") && !url.startsWith("data:")) {
    img.crossOrigin = "Anonymous";
  }
  img.onload = () => {
    imageCache[url] = img;
    onLoad(img);
  };
  img.onerror = (err) => {
    console.error("Failed to load image:", url, err);
    if (onError) onError(err);
  };
  img.src = url;
}

function disposeDecalMesh(mesh) {
  mesh.parent?.remove(mesh);
  mesh.geometry?.dispose();
  if (mesh.material?.map) {
    mesh.material.map.dispose();
  }
  mesh.material?.dispose();
}

const EMPTY_OBJECT = Object.freeze({});

export default function CapPreview3D({
  modelPath,
  shirtColor = "#ffffff",
  zoneDesigns = EMPTY_OBJECT,
  decalScale = EMPTY_OBJECT,
  zoneTexts,
  selectedSide = "",
  zones = [],
  fillParent = false,
  modelRotationY = 0,
  onZoneDesignChange,
  onTextChange,
  onZoneSelect,
  onTextSelect,
}) {
  const mountRef = useRef(null);
  const modelRef = useRef(null);
  const sceneRef = useRef(null);
  const decalsRef = useRef({});
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const initialCameraPosRef = useRef(null);
  const initialTargetRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(100);
  const rebuildPendingRef = useRef(false);
  const rebuildQueuedRef = useRef(false);
  const rebuildIdRef = useRef(0);

  const onZoneDesignChangeRef = useRef(onZoneDesignChange);
  onZoneDesignChangeRef.current = onZoneDesignChange;
  const onTextChangeRef = useRef(onTextChange);
  onTextChangeRef.current = onTextChange;
  const onZoneSelectRef = useRef(onZoneSelect);
  onZoneSelectRef.current = onZoneSelect;
  const onTextSelectRef = useRef(onTextSelect);
  onTextSelectRef.current = onTextSelect;

  const zoneTextsRef = useRef(zoneTexts);
  zoneTextsRef.current = zoneTexts;

  const colorRef = useRef(shirtColor);
  colorRef.current = shirtColor;

  const designsRef = useRef(zoneDesigns);
  designsRef.current = zoneDesigns;

  const decalScaleRef = useRef(decalScale);
  decalScaleRef.current = decalScale;

  const zoneCanvasRef = useRef({});
  const getZoneCanvas = (zoneId) => {
    if (!zoneCanvasRef.current[zoneId]) {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      zoneCanvasRef.current[zoneId] = { canvas, texture };
    }
    return zoneCanvasRef.current[zoneId];
  };

  const clearDecals = useCallback(() => {
    Object.values(decalsRef.current).forEach((entry) => {
      const meshes = Array.isArray(entry) ? entry : [entry];
      meshes.forEach(disposeDecalMesh);
    });
    decalsRef.current = {};
  }, []);

  const clearDecal = useCallback((zoneId) => {
    const entry = decalsRef.current[zoneId];
    if (!entry) return;
    const meshes = Array.isArray(entry) ? entry : [entry];
    meshes.forEach(disposeDecalMesh);
    delete decalsRef.current[zoneId];
  }, []);

  const applyBaseColor = useCallback(() => {
    const model = modelRef.current;
    if (!model) return;
    const color = new THREE.Color(colorRef.current);
    model.traverse((node) => {
      if (!node.isMesh) return;
      if (node.geometry.hasAttribute("color")) {
        node.geometry.deleteAttribute("color");
      }
      if (node.material) {
        if (!node.material.userData.isCloned) {
          node.material = node.material.clone();
          node.material.userData.isCloned = true;
        }
        if (node.material.map) {
          node.material.map.dispose();
          node.material.map = null;
        }
        if (node.material.metalness !== undefined) node.material.metalness = 0.0;
        if (node.material.roughness !== undefined) node.material.roughness = 0.7;
        if (node.material.color) {
          node.material.color = color;
          node.material.needsUpdate = true;
        }
      }
    });
  }, []);

  const getZoneTargetMeshes = useCallback((model, zoneId) => {
    const names = CAP_ZONE_MESH_MAP[zoneId];
    if (!names || !names.length) return [];
    return names.map((n) => model.getObjectByName(n)).filter((m) => m?.isMesh);
  }, []);

  const rebuildDecals = useCallback(() => {
    const model = modelRef.current;
    const scene = sceneRef.current;
    if (!model || !scene) return;

    const currentRebuildId = ++rebuildIdRef.current;
    model.updateMatrixWorld(true);

    const activeZoneIds = new Set([
      ...Object.keys(designsRef.current).filter((z) => designsRef.current[z]?.imageUrl),
      ...Object.keys(zoneTextsRef.current || {}).filter(
        (z) => (zoneTextsRef.current[z] || []).length > 0,
      ),
    ]);

    const decalZoneIds = Array.from(activeZoneIds).filter(
      (zoneId) => !zones || zones.length === 0 || zones.includes(zoneId),
    );

    Object.keys(decalsRef.current).forEach((zoneId) => {
      if (!decalZoneIds.includes(zoneId)) clearDecal(zoneId);
    });

    if (decalZoneIds.length === 0) return;

    decalZoneIds.forEach((zoneId) => {
      const design = designsRef.current[zoneId] || null;
      const texts = (zoneTextsRef.current || {})[zoneId] || [];
      const face = ZONE_FACE[zoneId] || "front";
      const scale = decalScaleRef.current[zoneId] || {};
      const { canvas, texture } = getZoneCanvas(zoneId);
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const zoneTargetMeshes = getZoneTargetMeshes(model, zoneId);
      if (!zoneTargetMeshes.length) return;
      const zoneBox = new THREE.Box3();
      zoneTargetMeshes.forEach((m) => zoneBox.expandByObject(m));
      const zoneSize = zoneBox.getSize(new THREE.Vector3());
      const zoneCenter = zoneBox.getCenter(new THREE.Vector3());

      const placeMesh = () => {
        texts.forEach((t) => drawTextLayer(ctx, t, 0, 0, canvas.width, canvas.height));
        texture.needsUpdate = true;
        if (face === "left" || face === "right") {
          texture.wrapS = THREE.RepeatWrapping;
          texture.repeat.x = -1;
        } else {
          texture.repeat.x = 1;
        }

        if (currentRebuildId !== rebuildIdRef.current) return;
        if (!modelRef.current || !sceneRef.current) return;

        const isSide = face === "left" || face === "right";
        const zoneW = (isSide ? zoneSize.z : zoneSize.x) * (scale.w ?? 0.56);
        const zoneH = zoneSize.y * (scale.h ?? 0.5);
        const position = zoneCenter.clone();
        let orientation;

        if (face === "back") {
          position.z = zoneBox.min.z + zoneSize.z * (scale.surfaceOffset ?? 0.02);
          orientation = new THREE.Euler(0, Math.PI, 0);
        } else if (face === "left") {
          position.x = zoneBox.min.x + zoneSize.x * (scale.surfaceOffset ?? 0.02);
          orientation = new THREE.Euler(0, Math.PI / 2, 0);
        } else if (face === "right") {
          position.x = zoneBox.max.x - zoneSize.x * (scale.surfaceOffset ?? 0.02);
          orientation = new THREE.Euler(0, -Math.PI / 2, 0);
        } else {
          position.z = zoneBox.max.z - zoneSize.z * (scale.surfaceOffset ?? 0.02);
          orientation = new THREE.Euler(0, 0, 0);
        }
        position.x += (scale.x ?? 0) * zoneSize.x;
        position.y += (scale.y ?? 0) * zoneSize.y;
        position.z += (scale.z ?? 0) * zoneSize.z;

        const depthAxisSize = isSide ? zoneSize.x : zoneSize.z;
        const decalSize = new THREE.Vector3(
          zoneW,
          zoneH,
          Math.max(depthAxisSize * (scale.depth ?? 0.22), 0.01),
        );

        const meshes = zoneTargetMeshes.map((targetMesh) => {
          const geometry = new DecalGeometry(targetMesh, position, orientation, decalSize);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -4,
            polygonOffsetUnits: -4,
          });
          return new THREE.Mesh(geometry, material);
        });

        clearDecal(zoneId);
        meshes.forEach((m) => scene.add(m));
        decalsRef.current[zoneId] = meshes;
      };

      if (design?.imageUrl) {
        loadImageCached(design.imageUrl, (img) => {
          if (currentRebuildId !== rebuildIdRef.current) return;
          const designX = design.x ?? 10;
          const designY = design.y ?? 10;
          const designW = design.w ?? 80;
          const designH = design.h ?? 80;
          ctx.drawImage(
            img,
            (designX / 100) * canvas.width,
            (designY / 100) * canvas.height,
            (designW / 100) * canvas.width,
            (designH / 100) * canvas.height,
          );
          placeMesh();
        });
      } else {
        placeMesh();
      }
    });
  }, [clearDecal, getZoneTargetMeshes, zones]);

  const rebuildDecalsThrottled = useCallback(() => {
    if (rebuildPendingRef.current) {
      rebuildQueuedRef.current = true;
      return;
    }
    rebuildPendingRef.current = true;
    rebuildDecals();
    setTimeout(() => {
      rebuildPendingRef.current = false;
      if (rebuildQueuedRef.current) {
        rebuildQueuedRef.current = false;
        rebuildDecalsThrottled();
      }
    }, 60);
  }, [rebuildDecals]);

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

    const findHitTarget = (zoneId, pctX, pctY) => {
      const texts = (zoneTextsRef.current || {})[zoneId] || [];
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i];
        if (pctX >= t.x && pctX <= t.x + t.w && pctY >= t.y && pctY <= t.y + t.h) {
          return { kind: "text", zoneId, id: t.id, w: t.w, h: t.h, x: t.x, y: t.y };
        }
      }
      const d = designsRef.current[zoneId];
      if (d?.imageUrl) {
        const dx = d.x ?? 10, dy = d.y ?? 10, dw = d.w ?? 80, dh = d.h ?? 80;
        if (pctX >= dx && pctX <= dx + dw && pctY >= dy && pctY <= dy + dh) {
          return { kind: "image", zoneId, w: dw, h: dh, x: dx, y: dy };
        }
      }
      return null;
    };

    const applyDrag = (x, y) => {
      if (!dragState) return;
      if (dragState.kind === "image") {
        const design = designsRef.current[dragState.zoneId] || {};
        onZoneDesignChangeRef.current?.(dragState.zoneId, { ...design, x, y });
      } else {
        onTextChangeRef.current?.(dragState.zoneId, dragState.id, { x, y });
      }
    };

    const raycastDecal = (clientX, clientY) => {
      const entries = [];
      Object.entries(decalsRef.current).forEach(([zoneId, entry]) => {
        const meshList = Array.isArray(entry) ? entry : [entry];
        meshList.forEach((mesh) => entries.push({ zoneId, mesh }));
      });
      if (!entries.length) return null;
      getNDC(clientX, clientY);
      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObjects(entries.map((m) => m.mesh), false);
      if (!hits.length || !hits[0].uv) return null;
      const hitMesh = hits[0].object;
      const found = entries.find((m) => m.mesh === hitMesh);
      if (!found) return null;
      const pctX = hits[0].uv.x * 100;
      const pctY = (1 - hits[0].uv.y) * 100;
      return { zoneId: found.zoneId, pct: { x: pctX, y: pctY } };
    };

    const onPointerMove = (e) => {
      if (!dragState) return;
      const hit = raycastDecal(e.clientX, e.clientY);
      if (!hit || hit.zoneId !== dragState.zoneId) return;
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
      const hit = raycastDecal(e.clientX, e.clientY);
      if (!hit) return;

      const target = findHitTarget(hit.zoneId, hit.pct.x, hit.pct.y);
      if (!target) return;

      e.stopImmediatePropagation();
      e.preventDefault();
      controls.enabled = false;
      dragState = {
        kind: target.kind,
        zoneId: target.zoneId,
        id: target.id,
        w: target.w,
        h: target.h,
        grabDX: hit.pct.x - target.x,
        grabDY: hit.pct.y - target.y,
      };
      renderer.domElement.style.cursor = "grabbing";
      onZoneSelectRef.current?.(target.zoneId);
      if (target.id) onTextSelectRef.current?.(target.zoneId, target.id);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown, true);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controlsRef.current = controls;

    const fitCameraToModel = (model) => {
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

      initialCameraPosRef.current = camera.position.clone();
      initialTargetRef.current = center.clone();
    };

    new GLTFLoader().load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        modelRef.current = model;
        scene.add(model);
        model.rotation.y = modelRotationY;
        applyBaseColor();
        rebuildDecals();
        fitCameraToModel(model);
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
      const nextWidth = container.offsetWidth || 260;
      const nextHeight = container.offsetHeight || 340;
      renderer.setSize(nextWidth, nextHeight);
      camera.aspect = nextWidth / nextHeight;
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
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      clearDecals();
      if (modelRef.current) {
        modelRef.current.traverse((node) => {
          if (!node.isMesh) return;
          node.geometry?.dispose();
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((m) => m?.dispose());
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
    if (!modelRef.current) return;
    applyBaseColor();
    rebuildDecalsThrottled();
  }, [applyBaseColor, rebuildDecalsThrottled, shirtColor]);

  useEffect(() => {
    if (ready) rebuildDecalsThrottled();
  }, [ready, rebuildDecalsThrottled, zoneDesigns, zoneTexts, zones]);

  const resetCameraView = useCallback(() => {
    if (!controlsRef.current || !cameraRef.current || !initialCameraPosRef.current) return;
    cameraRef.current.position.copy(initialCameraPosRef.current);
    controlsRef.current.target.copy(initialTargetRef.current);
    setZoom(100);
    controlsRef.current.update();
  }, []);

  useEffect(() => {
    resetCameraView();
  }, [selectedSide, resetCameraView]);

  return (
    <div style={fillParent ? { display: "flex", flexDirection: "column", height: "100%" } : {}}>
      <div
        className="tsc-preview-3d"
        ref={mountRef}
        style={fillParent ? { flex: 1, height: "100%", minHeight: 0 } : {}}
      >
        {!ready && !error && (
          <div className="tsc-preview-loading">
            <span className="tsc-spinner" />
            <span>Loading 3D preview...</span>
          </div>
        )}
        {error && <div className="tsc-preview-error">{error}</div>}
      </div>

      <div className="tsc-zoom-row">
        <button type="button" className="tsc-zoom-btn" onClick={() => setZoom((z) => Math.max(50, z - 25))}>
          -
        </button>
        <span>{zoom}%</span>
        <button type="button" className="tsc-zoom-btn" onClick={() => setZoom((z) => Math.min(200, z + 25))}>
          +
        </button>
        <button type="button" className="tsc-pan-btn" onClick={resetCameraView} title="Reset View">
          ⟳
        </button>
      </div>

      <div className="pd-3d-disclaimer">
        ⓘ The model thickness is only a representation of the product.
      </div>
    </div>
  );
}