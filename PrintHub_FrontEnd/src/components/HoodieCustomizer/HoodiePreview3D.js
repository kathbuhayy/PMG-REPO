// src/components/HoodieCustomizer/HoodiePreview3D.js
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { renderZoneLayersToCanvasElement } from "../../utils/fabricZoneRenderer";
import "../TshirtCustomizer/TshirtCustomizer.css";

// Converts the legacy { design, texts } shape into the layer array
// fabricZoneRenderer.js expects - same fallback pattern as TshirtPreview3D,
// used only if a caller hasn't been updated to pass zoneLayers yet.
function legacyZoneToLayers(design, texts) {
  const layers = [];
  if (design?.imageUrl) {
    layers.push({
      kind: "image",
      imageUrl: design.imageUrl,
      x: design.x ?? 10,
      y: design.y ?? 10,
      w: design.w ?? 80,
      h: design.h ?? 80,
      rotation: design.rotation ?? 0,
    });
  }
  (texts || []).forEach((t) => {
    layers.push({ ...t, kind: "text" });
  });
  return layers;
}

// ── Hoodie-specific mesh + UV map ───────────────────────────────────
// Real mesh names and UV bounds inside hoodie.glb, straight from its
// per-mesh UV report. Note: HEM_R_1 is the right sleeve/arm mesh
// (mislabeled during export - matches ARM_L's triangle count, not the
// small HEM_R/HEM_L cuff rings, same quirk as sweatshirt.glb).
// The hood is two separate panels (HOOD_L/HOOD_R) sharing one zone.
// No NECK mesh exists on this model (hood replaces the neckline).
// Update THIS block (and nowhere else) whenever the model is re-exported.
const FRONT_MESH = "FRONT";
const BACK_MESH = "BACK";
const LEFT_SLEEVE_MESH = "ARM_L";
const RIGHT_SLEEVE_MESH = "HEM_R_1";
const HOOD_LEFT_MESH = "HOOD_L";
const HOOD_RIGHT_MESH = "HOOD_R";
const LEFT_HEM_MESH = "HEM_L";
const RIGHT_HEM_MESH = "HEM_R";
const BOTTOM_HEM_MESH = "HEM_BTTM";

// Each zone lists one or more mesh names - a zone with multiple meshes
// (like "hood") gets the same painted texture applied to every mesh in
// its list, matching Cap's multi-panel decal approach.
const BODY_ZONES = {
  front: { meshNames: [FRONT_MESH], uMin: 0.01, uMax: 0.98, vMin: 0.01, vMax: 0.99 },
  back: { meshNames: [BACK_MESH], uMin: 0.01, uMax: 0.98, vMin: 0.01, vMax: 0.99 },
  left_sleeve: { meshNames: [LEFT_SLEEVE_MESH], uMin: 0.01, uMax: 0.84, vMin: 0.01, vMax: 0.99 },
  right_sleeve: { meshNames: [RIGHT_SLEEVE_MESH], uMin: 0.01, uMax: 0.77, vMin: 0.01, vMax: 0.99 },
  hood: { meshNames: [HOOD_LEFT_MESH, HOOD_RIGHT_MESH], uMin: 0.01, uMax: 0.81, vMin: 0.01, vMax: 0.99 },
  left_hem: { meshNames: [LEFT_HEM_MESH], uMin: 0.01, uMax: 0.97, vMin: 0.87, vMax: 0.99 },
  right_hem: { meshNames: [RIGHT_HEM_MESH], uMin: 0.01, uMax: 0.97, vMin: 0.86, vMax: 0.99 },
  bottom_hem: { meshNames: [BOTTOM_HEM_MESH], uMin: 0.01, uMax: 0.97, vMin: 0.94, vMax: 0.99 },
};

// Only these zones are ever decal/text-printable (hems are color-only,
// matching tshirt's hem behavior - see HEM_ZONE_OPTIONS in TshirtCustomizerPanel).
const PRINTABLE_ZONE_IDS = ["front", "back", "left_sleeve", "right_sleeve", "hood"];

// Reverse lookup: mesh name -> zone id (each mesh belongs to exactly one zone)
const meshNameToZone = {};
Object.entries(BODY_ZONES).forEach(([zoneId, cfg]) => {
  cfg.meshNames.forEach((name) => {
    meshNameToZone[name] = zoneId;
  });
});

export default function HoodiePreview3D({
  modelPath,
  shirtColor = "#ffffff",
  zoneColors = {}, // { left_hem, right_hem, bottom_hem } -> hex overrides
  zoneDesigns = {},
  zoneTexts = {},
  zoneLayers = {},
  zones = [],
  onZoneDesignChange,
  onTextChange,
  onZoneSelect,
  onTextSelect,
  selectedLayer = null,
  onLayerSelect,
}) {
  const mountRef = useRef(null);
  const modelRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(100);

  const zoneTextsRef = useRef(zoneTexts);
  zoneTextsRef.current = zoneTexts;

  const onZoneDesignChangeRef = useRef(onZoneDesignChange);
  onZoneDesignChangeRef.current = onZoneDesignChange;

  const onTextChangeRef = useRef(onTextChange);
  onTextChangeRef.current = onTextChange;

  const onZoneSelectRef = useRef(onZoneSelect);
  onZoneSelectRef.current = onZoneSelect;

  const onTextSelectRef = useRef(onTextSelect);
  onTextSelectRef.current = onTextSelect;

  const onLayerSelectRef = useRef(onLayerSelect);
  onLayerSelectRef.current = onLayerSelect;

  const shirtColorRef = useRef(shirtColor);
  shirtColorRef.current = shirtColor;

  const zoneColorsRef = useRef(zoneColors);
  zoneColorsRef.current = zoneColors;

  const designsRef = useRef(zoneDesigns);
  designsRef.current = zoneDesigns;

  const zoneLayersRef = useRef(zoneLayers);
  zoneLayersRef.current = zoneLayers;

  const zonesRef = useRef(zones);
  zonesRef.current = zones;

  const updateZoneTextures = useCallback(async () => {
    const model = modelRef.current;
    if (!model) return;

    for (const [zoneId, uv] of Object.entries(BODY_ZONES)) {
      const targets = uv.meshNames
        .map((name) => model.getObjectByName(name))
        .filter((m) => m?.material);
      if (!targets.length) continue;

      const isPrintable = PRINTABLE_ZONE_IDS.includes(zoneId);
      const design = designsRef.current[zoneId];
      const texts = zoneTextsRef.current[zoneId] || [];
      const fullLayers = zoneLayersRef.current[zoneId];
      const layers =
        isPrintable
          ? fullLayers && fullLayers.length > 0
            ? fullLayers
            : legacyZoneToLayers(design, texts)
          : [];

      const isZoneActive =
        zonesRef.current.length === 0 || zonesRef.current.includes(zoneId);

      const hasContent = isPrintable && layers.length > 0;

      if (!isZoneActive || !hasContent) {
        targets.forEach((target) => {
          const oldUserData = target.material.userData;
          if (target.material.map) target.material.map.dispose();

          const newMat = new THREE.MeshPhongMaterial({
            color: new THREE.Color(zoneColorsRef.current[zoneId] || shirtColorRef.current),
            map: null,
            shininess: 10,
            side: THREE.DoubleSide,
          });
          newMat.userData = oldUserData || {};
          newMat.userData.isZoneTexture = false;

          target.material.dispose();
          target.material = newMat;
        });
        continue;
      }

      const canvas = document.createElement("canvas");
      canvas.width = 2048;
      canvas.height = 2048;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = zoneColorsRef.current[zoneId] || shirtColorRef.current;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const x = uv.uMin * canvas.width;
      const y = uv.vMin * canvas.height;
      const w = (uv.uMax - uv.uMin) * canvas.width;
      const h = (uv.vMax - uv.vMin) * canvas.height;

      const boxCanvas = await renderZoneLayersToCanvasElement(layers, w, h);
      if (!modelRef.current) return;

      ctx.drawImage(boxCanvas, x, y, w, h);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      texture.flipY = false;

      targets.forEach((target) => {
        const oldUserData = target.material.userData;
        if (target.material.map) target.material.map.dispose();

        const newMat = new THREE.MeshPhongMaterial({
          color: new THREE.Color("#ffffff"),
          map: texture,
          shininess: 10,
          side: THREE.DoubleSide,
        });
        newMat.userData = oldUserData || {};
        newMat.userData.isZoneTexture = true;

        target.material.dispose();
        target.material = newMat;
      });
    }
  }, []);

  useEffect(() => {
    if (!mountRef.current || !modelPath) return;

    setReady(false);
    setError("");

    const container = mountRef.current;
    const w0 = container.offsetWidth || 260;
    const h0 = container.offsetHeight || 340;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(w0, h0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xeef1f5);

    const camera = new THREE.PerspectiveCamera(45, w0 / h0, 0.1, 1000);
    camera.position.set(0, 0, 3);
    camera.zoom = zoom / 100;
    camera.updateProjectionMatrix();
    cameraRef.current = camera;

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(5, 10, 7.5);
    scene.add(dir);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.8));

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;

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

    const uvToZonePercent = (uv, zoneCfg) => {
      const x = (uv.x - zoneCfg.uMin) / (zoneCfg.uMax - zoneCfg.uMin);
      const canvasYFrac = 1 - uv.y;
      const y = (canvasYFrac - zoneCfg.vMin) / (zoneCfg.vMax - zoneCfg.vMin);
      return { x: x * 100, y: y * 100 };
    };

    const raycastBodyZone = (clientX, clientY) => {
      const model = modelRef.current;
      if (!model) return null;
      getNDC(clientX, clientY);
      raycaster.setFromCamera(pointerNDC, camera);

      const targets = PRINTABLE_ZONE_IDS
        .flatMap((zoneId) =>
          BODY_ZONES[zoneId].meshNames.map((name) => model.getObjectByName(name)),
        )
        .filter(Boolean);

      const hits = raycaster.intersectObjects(targets, false);
      if (!hits.length || !hits[0].uv) return null;

      const zoneId = meshNameToZone[hits[0].object.name];
      const zoneCfg = BODY_ZONES[zoneId];
      if (!zoneCfg) return null;

      return { zoneId, pct: uvToZonePercent(hits[0].uv, zoneCfg) };
    };

    const findHitTarget = (zoneId, pctX, pctY) => {
      const texts = zoneTextsRef.current[zoneId] || [];
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

    const onPointerMove = (e) => {
      if (!dragState) return;
      const hit = raycastBodyZone(e.clientX, e.clientY);
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

    const startDrag = (state, zoneId, id) => {
      controls.enabled = false;
      dragState = state;
      renderer.domElement.style.cursor = "grabbing";
      onLayerSelectRef.current?.({ kind: state.kind, zoneId, ...(id ? { id } : {}) });
      onZoneSelectRef.current?.(zoneId);
      if (id) onTextSelectRef.current?.(zoneId, id);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    };

    const onPointerDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const bodyHit = raycastBodyZone(e.clientX, e.clientY);
      if (!bodyHit) return;
      const target = findHitTarget(bodyHit.zoneId, bodyHit.pct.x, bodyHit.pct.y);
      if (!target) return;

      e.stopImmediatePropagation();
      e.preventDefault();
      startDrag(
        {
          mode: "body",
          kind: target.kind,
          zoneId: target.zoneId,
          id: target.id,
          w: target.w,
          h: target.h,
          grabDX: bodyHit.pct.x - target.x,
          grabDY: bodyHit.pct.y - target.y,
        },
        target.zoneId,
        target.id,
      );
    };

    const onHoverMove = (e) => {
      if (dragState) return;
      const bodyHit = raycastBodyZone(e.clientX, e.clientY);
      const hit = bodyHit && findHitTarget(bodyHit.zoneId, bodyHit.pct.x, bodyHit.pct.y);
      renderer.domElement.style.cursor = hit ? "grab" : "auto";
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown, true);
    renderer.domElement.addEventListener("pointermove", onHoverMove);

    new GLTFLoader().load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        modelRef.current = model;
        model.rotation.y = 0;
        scene.add(model);

        applyColor(model, shirtColorRef.current, zoneColorsRef.current);
        updateZoneTextures();

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        const dist = (maxDim / 2 / Math.tan(fov / 2)) * 1.8;

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
      renderer.domElement.removeEventListener("pointerdown", onPointerDown, true);
      renderer.domElement.removeEventListener("pointermove", onHoverMove);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      cancelAnimationFrame(rafId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      if (modelRef.current) {
        modelRef.current.traverse((node) => {
          if (node.isMesh) {
            node.geometry?.dispose();
            (Array.isArray(node.material) ? node.material : [node.material]).forEach((m) => m?.dispose());
          }
        });
        modelRef.current = null;
      }
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
    if (modelRef.current) {
      applyColor(modelRef.current, shirtColor, zoneColorsRef.current);
      updateZoneTextures();
    }
  }, [shirtColor, zoneColors, updateZoneTextures]);

  useEffect(() => {
    if (ready) updateZoneTextures();
  }, [ready, zoneDesigns, zoneTexts, zoneLayers, updateZoneTextures, zones, zoneColors]);

  return (
    <div className="tsc-preview-panel">
      <div className="tsc-preview-3d" ref={mountRef}>
        {!ready && !error && (
          <div className="tsc-preview-loading">
            <span
              className="tsc-spinner"
              style={{ borderTopColor: "#455073", borderColor: "rgba(69,80,115,0.2)" }}
            />
            <span>Loading 3D preview…</span>
          </div>
        )}
        {error && <div className="tsc-preview-error">{error}</div>}
      </div>

      <div className="tsc-zoom-row">
        <button type="button" className="tsc-zoom-btn" onClick={() => setZoom((z) => Math.max(50, z - 25))}>
          −
        </button>
        <span>{zoom}%</span>
        <button type="button" className="tsc-zoom-btn" onClick={() => setZoom((z) => Math.min(200, z + 25))}>
          +
        </button>
      </div>
    </div>
  );
}

function applyColor(model, hexColor, zoneColors = {}) {
  const color = new THREE.Color(hexColor);

  model.traverse((node) => {
    if (node.isMesh && !node.userData?.isDesignDecal) {
      if (node.geometry.hasAttribute("color")) {
        node.geometry.deleteAttribute("color");
      }
      if (node.material) {
        const oldMap = node.material.map;
        const oldUserData = node.material.userData;
        const isZoneTexture = oldUserData?.isZoneTexture;

        const zoneId = meshNameToZone[node.name];
        const override = zoneId && zoneColors[zoneId];
        const baseColor = override ? new THREE.Color(override) : color;

        if (oldMap && !isZoneTexture) oldMap.dispose();

        const newMat = new THREE.MeshPhongMaterial({
          color: isZoneTexture ? new THREE.Color("#ffffff") : baseColor,
          map: isZoneTexture ? oldMap : null,
          shininess: 10,
          side: THREE.DoubleSide,
        });
        newMat.userData = oldUserData || {};

        node.material.dispose();
        node.material = newMat;
      }
    }
  });
}