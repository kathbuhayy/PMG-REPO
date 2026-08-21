// src/components/TshirtCustomizer/TshirtPreview3D.js  (replace entire file)
// TshirtPreview3D

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import "./TshirtCustomizer.css";

const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin("anonymous");
const textureCache = {};

function drawTextLayer(ctx, t, zoneX, zoneY, zoneW, zoneH) {
  const boxX = zoneX + (t.x / 100) * zoneW;
  const boxY = zoneY + (t.y / 100) * zoneH;
  const boxW = (t.w / 100) * zoneW;
  const boxH = (t.h / 100) * zoneH;
  const fontPx = (t.fontSize / 100) * zoneH;

  ctx.save();
  ctx.font = `${t.italic ? "italic " : ""}${t.bold ? "700" : "400"} ${fontPx}px ${t.fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.textAlign =
    t.align === "left" ? "left" : t.align === "right" ? "right" : "center";

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

function loadTextureCached(url, onLoad) {
  if (textureCache[url]) {
    onLoad(textureCache[url]);
    return;
  }

  textureLoader.load(url, (texture) => {
    textureCache[url] = texture;
    onLoad(texture);
  });
}

const FRONT_BODY_MESH = "Material1718";
const BACK_BODY_MESH = "Material1722";
const SLEEVE_MESH_NAMES = new Set(["Material1724"]);

const BODY_ZONES = {
  front: {
    meshName: FRONT_BODY_MESH,
    uMin: 0.25,
    uMax: 0.75,
    vMin: 0.01,
    vMax: 0.6,
  },
  back: {
    meshName: BACK_BODY_MESH,
    uMin: 0.25,
    uMax: 0.75,
    vMin: 0.01,
    vMax: 0.6,
  },
};

const SLEEVE_DECALS = {
  left_sleeve: {
    side: -1,
    ry: Math.PI / 2,
    sw: 0.30,
    sh: 0.26,
    y: -0.15,
    z: 0.1,
    depth: 0.2,
  },
  right_sleeve: {
    side: 1,
    ry: -Math.PI / 2,
    sw: 0.18,
    sh: 0.16,
    y: 0,
    z: 0.0,
    depth: 0.2,
  },
};

const TshirtPreview3D = forwardRef(function TshirtPreview3D({
  modelPath,
  shirtColor = "#ffffff",
  zoneDesigns = {},
  zoneTexts = {},
  zones = [],
  onZoneDesignChange,
  onTextChange,
  onZoneSelect,
  onTextSelect,
  selectedLayer = null,
  onLayerSelect,
}, ref) {
  const mountRef = useRef(null);
  const modelRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const meshesRef = useRef([]);
  const cameraRef = useRef(null);
  // Mockup-view support: OrbitControls instance, the model's fitted
  // center/distance (so preset angles orbit at the same radius the
  // auto-fit logic already computed), and an in-flight camera transition.
  const controlsRef = useRef(null);
  const frameRef = useRef({ center: new THREE.Vector3(), dist: 3 });
  const viewTransitionRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(100);

  const rebuildSleeveDecalsPendingRef = useRef(false);
  const rebuildSleeveDecalsQueuedRef = useRef(false);

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

  const designsRef = useRef(zoneDesigns);
  designsRef.current = zoneDesigns;

  const zonesRef = useRef(zones);
  zonesRef.current = zones;

  const clearDecals = useCallback(() => {
    const model = modelRef.current;
    if (!model) return;

    meshesRef.current.forEach((m) => {
      m.parent?.remove(m);
      m.geometry.dispose();

      if (m.material.map) {
        m.material.map.dispose();
      }

      m.material.dispose();
    });

    meshesRef.current = [];
  }, []);

  const updateZoneTextures = useCallback(() => {
    const model = modelRef.current;
    if (!model) return;

    Object.entries(BODY_ZONES).forEach(([zoneId, uv]) => {
      const design = designsRef.current[zoneId];
      const texts = zoneTextsRef.current[zoneId] || [];
      const target = model.getObjectByName(uv.meshName);

      if (!target?.material) return;

      const isZoneActive =
        zonesRef.current.length === 0 ||
        zonesRef.current.includes(zoneId);

      const hasContent =
        Boolean(design?.imageUrl) ||
        texts.length > 0;

      if (!isZoneActive || !hasContent) {
        const oldUserData = target.material.userData;

        if (target.material.map) {
          target.material.map.dispose();
        }

        const newMat = new THREE.MeshPhongMaterial({
          color: new THREE.Color(shirtColorRef.current),
          map: null,
          shininess: 10,
          side: THREE.DoubleSide,
        });

        newMat.userData = oldUserData || {};
        newMat.userData.isZoneTexture = false;

        target.material.dispose();
        target.material = newMat;

        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = 2048;
      canvas.height = 2048;

      const ctx = canvas.getContext("2d");

      ctx.fillStyle = shirtColorRef.current;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const x = uv.uMin * canvas.width;
      const y = uv.vMin * canvas.height;
      const w = (uv.uMax - uv.uMin) * canvas.width;
      const h = (uv.vMax - uv.vMin) * canvas.height;

      const finalize = () => {
        texts.forEach((t) => {
          drawTextLayer(ctx, t, x, y, w, h);
        });

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;

        const oldUserData = target.material.userData;

        if (target.material.map) {
          target.material.map.dispose();
        }

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
      };

      if (design?.imageUrl) {
        const img = new Image();
        img.crossOrigin = "Anonymous";

        img.onload = () => {
          if (!modelRef.current) return;

          const designX = design.x ?? 10;
          const designY = design.y ?? 10;
          const designW = design.w ?? 80;
          const designH = design.h ?? 80;

          ctx.drawImage(
            img,
            x + (designX / 100) * w,
            y + (designY / 100) * h,
            (designW / 100) * w,
            (designH / 100) * h
          );

          finalize();
        };

        img.src = design.imageUrl;
      } else {
        finalize();
      }
    });
  }, []);

  const rebuildSleeveDecals = useCallback(() => {
    const model = modelRef.current;
    const scene = sceneRef.current;

    if (!model || !scene) return;

    clearDecals();

    model.updateMatrixWorld(true);

    const sleeveMesh = Array.from(SLEEVE_MESH_NAMES)
      .map((name) => model.getObjectByName(name))
      .find(Boolean);

    if (!sleeveMesh) return;

    sleeveMesh.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(sleeveMesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    Object.entries(SLEEVE_DECALS)
      .filter(([zoneId]) => {
        return (
          zonesRef.current.length === 0 ||
          zonesRef.current.includes(zoneId)
        );
      })
      .forEach(([zoneId, cfg]) => {
        const design = designsRef.current[zoneId];
        const texts = zoneTextsRef.current[zoneId] || [];

        const hasContent =
          Boolean(design?.imageUrl) ||
          texts.length > 0;

        if (!hasContent) return;

        const buildDecal = (tex) => {
          if (!modelRef.current) return;

          const canvas = document.createElement("canvas");
          canvas.width = 1024;
          canvas.height = 1024;

          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (tex && design) {
            ctx.drawImage(
              tex.image,
              0,
              0,
              canvas.width,
              canvas.height
            );
          }

          texts.forEach((t) => {
            drawTextLayer(
              ctx,
              t,
              0,
              0,
              canvas.width,
              canvas.height
            );
          });

          const finalTexture = new THREE.CanvasTexture(canvas);

          finalTexture.colorSpace = THREE.SRGBColorSpace;
          finalTexture.wrapS = THREE.RepeatWrapping;
          finalTexture.repeat.x = -1;
          finalTexture.needsUpdate = true;

          const designX = design?.x ?? 10;
          const designY = design?.y ?? 10;
          const designW = design?.w ?? 80;
          const designH = design?.h ?? 80;

          const zoneW = size.z * cfg.sw;
          const zoneH = size.y * cfg.sh;

          const actualW = zoneW * (designW / 100);
          const actualH = zoneH * (designH / 100);

          const offsetZ =
            ((designX + designW / 2) / 100 - 0.5) *
            zoneW;

          const offsetY =
            (0.5 - (designY + designH / 2) / 100) *
            zoneH;

          const position = new THREE.Vector3(
            cfg.side > 0
              ? box.max.x - size.x * 0.05
              : box.min.x + size.x * 0.05,
            center.y + size.y * cfg.y + offsetY,
            center.z + size.z * cfg.z + offsetZ
          );

          const orientation = new THREE.Euler(
            0,
            cfg.ry,
            0
          );

          const decalSize = new THREE.Vector3(
            actualW,
            actualH,
            size.x * cfg.depth
          );

          const geometry = new DecalGeometry(
            sleeveMesh,
            position,
            orientation,
            decalSize
          );

          const material = new THREE.MeshBasicMaterial({
            map: finalTexture,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -4,
            polygonOffsetUnits: -4,
          });

          const mesh = new THREE.Mesh(
            geometry,
            material
          );

          mesh.userData.isDesignDecal = true;
          mesh.userData.zoneId = zoneId;

          scene.add(mesh);
          meshesRef.current.push(mesh);
        };

        if (design?.imageUrl) {
          loadTextureCached(design.imageUrl, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            buildDecal(tex);
          });
        } else {
          buildDecal(null);
        }
      });
  }, [clearDecals]);

  const rebuildSleeveDecalsThrottled = useCallback(() => {
    if (rebuildSleeveDecalsPendingRef.current) {
      rebuildSleeveDecalsQueuedRef.current = true;
      return;
    }

    rebuildSleeveDecalsPendingRef.current = true;

    rebuildSleeveDecals();

    setTimeout(() => {
      rebuildSleeveDecalsPendingRef.current = false;

      if (rebuildSleeveDecalsQueuedRef.current) {
        rebuildSleeveDecalsQueuedRef.current = false;
        rebuildSleeveDecalsThrottled();
      }
    }, 60);
  }, [rebuildSleeveDecals]);

  // =========================================================
  // THREE.JS SETUP
  // =========================================================

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
      // Required so captureSnapshot() (renderer.domElement.toDataURL)
      // reads the actual last-rendered frame instead of a blank buffer.
      preserveDrawingBuffer: true,
    });

    renderer.setPixelRatio(
      window.devicePixelRatio || 1
    );

    renderer.setSize(w0, h0);

    container.appendChild(renderer.domElement);

    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    scene.background = new THREE.Color(0x1e2433);

    const camera = new THREE.PerspectiveCamera(
      45,
      w0 / h0,
      0.1,
      1000
    );

    camera.position.set(0, 0, 3);
    camera.zoom = zoom / 100;
    camera.updateProjectionMatrix();

    cameraRef.current = camera;

    scene.add(
      new THREE.AmbientLight(0xffffff, 1.5)
    );

    const dir = new THREE.DirectionalLight(
      0xffffff,
      1.0
    );

    dir.position.set(5, 10, 7.5);
    scene.add(dir);

    scene.add(
      new THREE.HemisphereLight(
        0xffffff,
        0x444444,
        0.8
      )
    );

    const controls = new OrbitControls(
      camera,
      renderer.domElement
    );
    controlsRef.current = controls;

    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 2.5;

    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();

    let dragState = null;

    const meshNameToZone = {
      [FRONT_BODY_MESH]: "front",
      [BACK_BODY_MESH]: "back",
    };

    const clamp = (v, min, max) =>
      Math.max(min, Math.min(max, v));

    const getNDC = (clientX, clientY) => {
      const rect =
        renderer.domElement.getBoundingClientRect();

      pointerNDC.x =
        ((clientX - rect.left) / rect.width) * 2 - 1;

      pointerNDC.y =
        -((clientY - rect.top) / rect.height) * 2 + 1;

      return pointerNDC;
    };

    const uvToZonePercent = (uv, zoneCfg) => {
      const x =
        (uv.x - zoneCfg.uMin) /
        (zoneCfg.uMax - zoneCfg.uMin);

      const canvasYFrac = 1 - uv.y;

      const y =
        (canvasYFrac - zoneCfg.vMin) /
        (zoneCfg.vMax - zoneCfg.vMin);

      return {
        x: x * 100,
        y: y * 100,
      };
    };

    const raycastBodyZone = (
      clientX,
      clientY
    ) => {
      const model = modelRef.current;

      if (!model) return null;

      getNDC(clientX, clientY);

      raycaster.setFromCamera(
        pointerNDC,
        camera
      );

      const targets = Object.keys(meshNameToZone)
        .map((name) =>
          model.getObjectByName(name)
        )
        .filter(Boolean);

      const hits =
        raycaster.intersectObjects(
          targets,
          false
        );

      if (!hits.length || !hits[0].uv) {
        return null;
      }

      const zoneId =
        meshNameToZone[
          hits[0].object.name
        ];

      const zoneCfg = BODY_ZONES[zoneId];

      if (!zoneCfg) return null;

      return {
        zoneId,
        pct: uvToZonePercent(
          hits[0].uv,
          zoneCfg
        ),
      };
    };

    const raycastSleeveDecal = (
      clientX,
      clientY
    ) => {
      if (!meshesRef.current.length) {
        return null;
      }

      getNDC(clientX, clientY);

      raycaster.setFromCamera(
        pointerNDC,
        camera
      );

      const hits =
        raycaster.intersectObjects(
          meshesRef.current.filter(
            (m) =>
              m.userData.isDesignDecal
          ),
          false
        );

      return hits[0] || null;
    };

    const findHitTarget = (
      zoneId,
      pctX,
      pctY
    ) => {
      const texts =
        zoneTextsRef.current[zoneId] || [];

      for (
        let i = texts.length - 1;
        i >= 0;
        i--
      ) {
        const t = texts[i];

        if (
          pctX >= t.x &&
          pctX <= t.x + t.w &&
          pctY >= t.y &&
          pctY <= t.y + t.h
        ) {
          return {
            kind: "text",
            zoneId,
            id: t.id,
            w: t.w,
            h: t.h,
            x: t.x,
            y: t.y,
          };
        }
      }

      const d =
        designsRef.current[zoneId];

      if (d?.imageUrl) {
        const dx = d.x ?? 10;
        const dy = d.y ?? 10;
        const dw = d.w ?? 80;
        const dh = d.h ?? 80;

        if (
          pctX >= dx &&
          pctX <= dx + dw &&
          pctY >= dy &&
          pctY <= dy + dh
        ) {
          return {
            kind: "image",
            zoneId,
            w: dw,
            h: dh,
            x: dx,
            y: dy,
          };
        }
      }

      return null;
    };

    const applyDrag = (x, y) => {
      if (!dragState) return;

      if (dragState.kind === "image") {
        const design =
          designsRef.current[
            dragState.zoneId
          ] || {};

        onZoneDesignChangeRef.current?.(
          dragState.zoneId,
          {
            ...design,
            x,
            y,
          }
        );
      } else {
        onTextChangeRef.current?.(
          dragState.zoneId,
          dragState.id,
          {
            x,
            y,
          }
        );
      }
    };

    const onPointerMove = (e) => {
      if (!dragState) return;

      if (dragState.mode === "body") {
        const hit = raycastBodyZone(
          e.clientX,
          e.clientY
        );

        if (
          !hit ||
          hit.zoneId !==
            dragState.zoneId
        ) {
          return;
        }

        applyDrag(
          clamp(
            hit.pct.x -
              dragState.grabDX,
            0,
            100 - dragState.w
          ),
          clamp(
            hit.pct.y -
              dragState.grabDY,
            0,
            100 - dragState.h
          )
        );
      } else {
        const SENSITIVITY = 220;

        const rect =
          renderer.domElement.getBoundingClientRect();

        const dxPct =
          ((e.clientX -
            dragState.startX) /
            rect.width) *
          SENSITIVITY;

        const dyPct =
          ((e.clientY -
            dragState.startY) /
            rect.height) *
          SENSITIVITY;

        applyDrag(
          clamp(
            dragState.origX + dxPct,
            0,
            100 - dragState.w
          ),
          clamp(
            dragState.origY - dyPct,
            0,
            100 - dragState.h
          )
        );
      }
    };

    const onPointerUp = () => {
      dragState = null;

      controls.enabled = true;

      renderer.domElement.style.cursor =
        "auto";

      window.removeEventListener(
        "pointermove",
        onPointerMove
      );

      window.removeEventListener(
        "pointerup",
        onPointerUp
      );
    };

    const startDrag = (
      state,
      zoneId,
      id
    ) => {
      controls.enabled = false;

      dragState = state;

      renderer.domElement.style.cursor =
        "grabbing";

      onLayerSelectRef.current?.({
        kind: state.kind,
        zoneId,
        ...(id ? { id } : {}),
      });

      onZoneSelectRef.current?.(
        zoneId
      );

      if (id) {
        onTextSelectRef.current?.(
          zoneId,
          id
        );
      }

      window.addEventListener(
        "pointermove",
        onPointerMove
      );

      window.addEventListener(
        "pointerup",
        onPointerUp
      );
    };

    const onPointerDown = (e) => {
      if (
        e.button !== undefined &&
        e.button !== 0
      ) {
        return;
      }

      const bodyHit =
        raycastBodyZone(
          e.clientX,
          e.clientY
        );

      if (bodyHit) {
        const target =
          findHitTarget(
            bodyHit.zoneId,
            bodyHit.pct.x,
            bodyHit.pct.y
          );

        if (target) {
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
              grabDX:
                bodyHit.pct.x -
                target.x,
              grabDY:
                bodyHit.pct.y -
                target.y,
            },
            target.zoneId,
            target.id
          );
        }

        return;
      }

      const sleeveHit =
        raycastSleeveDecal(
          e.clientX,
          e.clientY
        );

      const zoneId =
        sleeveHit?.object?.userData
          ?.zoneId;

      const design = zoneId
        ? designsRef.current[
            zoneId
          ]
        : null;

      if (
        zoneId &&
        design?.imageUrl
      ) {
        e.stopImmediatePropagation();
        e.preventDefault();

        startDrag(
          {
            mode: "sleeve",
            kind: "image",
            zoneId,
            w: design.w ?? 80,
            h: design.h ?? 80,
            startX: e.clientX,
            startY: e.clientY,
            origX: design.x ?? 10,
            origY: design.y ?? 10,
          },
          zoneId
        );
      }
    };

    const onHoverMove = (e) => {
      if (dragState) return;

      const bodyHit =
        raycastBodyZone(
          e.clientX,
          e.clientY
        );

      const hit =
        bodyHit &&
        findHitTarget(
          bodyHit.zoneId,
          bodyHit.pct.x,
          bodyHit.pct.y
        );

      renderer.domElement.style.cursor =
        hit ? "grab" : "auto";
    };

    renderer.domElement.addEventListener(
      "pointerdown",
      onPointerDown,
      true
    );

    renderer.domElement.addEventListener(
      "pointermove",
      onHoverMove
    );

    new GLTFLoader().load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;

        modelRef.current = model;

        model.rotation.y = 5;

        scene.add(model);

        applyColor(
          model,
          shirtColorRef.current
        );

        updateZoneTextures();

        rebuildSleeveDecals();

        const box =
          new THREE.Box3().setFromObject(
            model
          );

        const center =
          box.getCenter(
            new THREE.Vector3()
          );

        const size =
          box.getSize(
            new THREE.Vector3()
          );

        const maxDim =
          Math.max(
            size.x,
            size.y,
            size.z
          );

        const fov =
          camera.fov *
          (Math.PI / 180);

        const dist =
          (maxDim /
            2 /
            Math.tan(
              fov / 2
            )) *
          1.8;

        camera.position.set(
          center.x,
          center.y,
          center.z + dist
        );

        camera.near = dist / 100;
        camera.far = dist * 100;

        camera.updateProjectionMatrix();

        controls.target.copy(center);
        controls.update();

        // Remember the auto-fit framing so setView() can orbit preset
        // angles (front/back/left/right) at the same radius.
        frameRef.current = { center: center.clone(), dist };

        setReady(true);
      },
      undefined,
      () => {
        setError(
          "Failed to load 3D model. Place shirt.glb in public/models/."
        );
      }
    );

    let rafId;

    const animate = () => {
      rafId =
        requestAnimationFrame(
          animate
        );

      // Smoothly interpolate an in-flight setView() transition, if any.
      const transition = viewTransitionRef.current;
      if (transition) {
        const t = Math.min(
          1,
          (performance.now() - transition.start) / transition.duration
        );
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        camera.position.lerpVectors(
          transition.fromPos,
          transition.toPos,
          eased
        );
        controls.target.lerpVectors(
          transition.fromTarget,
          transition.toTarget,
          eased
        );
        if (t >= 1) viewTransitionRef.current = null;
      }

      controls.update();

      renderer.render(
        scene,
        camera
      );
    };

    animate();

    const onResize = () => {
      const w =
        container.offsetWidth || 260;

      const h =
        container.offsetHeight || 340;

      renderer.setSize(w, h);

      camera.aspect = w / h;

      camera.updateProjectionMatrix();
    };

    window.addEventListener(
      "resize",
      onResize
    );

    const ro =
      new ResizeObserver(
        onResize
      );

    ro.observe(container);

    return () => {
      renderer.domElement.removeEventListener(
        "pointerdown",
        onPointerDown,
        true
      );

      renderer.domElement.removeEventListener(
        "pointermove",
        onHoverMove
      );

      window.removeEventListener(
        "pointermove",
        onPointerMove
      );

      window.removeEventListener(
        "pointerup",
        onPointerUp
      );

      window.removeEventListener(
        "resize",
        onResize
      );

      ro.disconnect();

      cancelAnimationFrame(rafId);

      controls.dispose();
      renderer.dispose();

      if (
        container.contains(
          renderer.domElement
        )
      ) {
        container.removeChild(
          renderer.domElement
        );
      }

      meshesRef.current.forEach(
        (m) => {
          m.parent?.remove(m);
          m.geometry.dispose();

          if (m.material.map) {
            m.material.map.dispose();
          }

          m.material.dispose();
        }
      );

      meshesRef.current = [];

      if (modelRef.current) {
        modelRef.current.traverse(
          (node) => {
            if (node.isMesh) {
              node.geometry?.dispose();

              (
                Array.isArray(
                  node.material
                )
                  ? node.material
                  : [node.material]
              ).forEach((m) =>
                m?.dispose()
              );
            }
          }
        );

        modelRef.current = null;
      }

      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, [modelPath]);

  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.zoom =
        zoom / 100;

      cameraRef.current.updateProjectionMatrix();
    }
  }, [zoom]);

  useEffect(() => {
    if (modelRef.current) {
      applyColor(
        modelRef.current,
        shirtColor
      );

      updateZoneTextures();

      rebuildSleeveDecalsThrottled();
    }
  }, [
    shirtColor,
    updateZoneTextures,
    rebuildSleeveDecalsThrottled,
  ]);

  useEffect(() => {
    if (ready) {
      updateZoneTextures();
      rebuildSleeveDecalsThrottled();
    }
  }, [
    ready,
    zoneDesigns,
    zoneTexts,
    updateZoneTextures,
    rebuildSleeveDecalsThrottled,
    zones,
  ]);

  // Mockup-view API for the parent (Preview mode's angle switcher /
  // "Download mockup" button). Exposed via ref since the 3D scene is
  // managed with plain Three.js objects, not React state.
  useImperativeHandle(
    ref,
    () => ({
      setView: (view) => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (!camera || !controls) return;

        const { center, dist } = frameRef.current;
        const offsets = {
          front: new THREE.Vector3(0, 0, dist),
          back: new THREE.Vector3(0, 0, -dist),
          left: new THREE.Vector3(-dist, 0, 0),
          right: new THREE.Vector3(dist, 0, 0),
        };
        const toPos = center
          .clone()
          .add(offsets[view] || offsets.front);

        viewTransitionRef.current = {
          fromPos: camera.position.clone(),
          toPos,
          fromTarget: controls.target.clone(),
          toTarget: center.clone(),
          start: performance.now(),
          duration: 600,
        };
      },
      captureSnapshot: () => {
        const renderer = rendererRef.current;
        if (!renderer) return null;
        try {
          return renderer.domElement.toDataURL("image/png");
        } catch {
          return null;
        }
      },
      // Renders each preset angle in turn, grabs a still, then restores
      // the camera to where it was. All renders happen synchronously in
      // one JS task, so the canvas only ever visibly shows the final
      // (restored) frame - no flashing through angles on screen.
      captureAllViews: () => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        if (!camera || !controls || !renderer || !scene) return null;

        const { center, dist } = frameRef.current;
        const offsets = {
          front: new THREE.Vector3(0, 0, dist),
          back: new THREE.Vector3(0, 0, -dist),
          left: new THREE.Vector3(-dist, 0, 0),
          right: new THREE.Vector3(dist, 0, 0),
        };

        const originalPos = camera.position.clone();
        const originalTarget = controls.target.clone();

        const shots = {};
        try {
          Object.entries(offsets).forEach(([view, offset]) => {
            camera.position.copy(center.clone().add(offset));
            controls.target.copy(center);
            camera.lookAt(center);
            controls.update();
            renderer.render(scene, camera);
            shots[view] = renderer.domElement.toDataURL("image/png");
          });
        } finally {
          camera.position.copy(originalPos);
          controls.target.copy(originalTarget);
          camera.lookAt(originalTarget);
          controls.update();
          renderer.render(scene, camera);
        }

        return shots;
      },
    }),
    [],
  );

  return (
    <div className="tsc-preview-panel">
      <div
        className="tsc-preview-3d"
        ref={mountRef}
      >
        {!ready && !error && (
          <div className="tsc-preview-loading">
            <span
              className="tsc-spinner"
              style={{
                borderTopColor:
                  "#455073",
                borderColor:
                  "rgba(69,80,115,0.2)",
              }}
            />

            <span>
              Loading 3D preview…
            </span>
          </div>
        )}

        {error && (
          <div className="tsc-preview-error">
            {error}
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="tsc-zoom-row">
        <button
          type="button"
          className="tsc-zoom-btn"
          onClick={() => {
            setZoom((z) =>
              Math.max(
                50,
                z - 25
              )
            );
          }}
        >
          −
        </button>

        <span>{zoom}%</span>

        <button
          type="button"
          className="tsc-zoom-btn"
          onClick={() => {
            setZoom((z) =>
              Math.min(
                200,
                z + 25
              )
            );
          }}
        >
          +
        </button>
      </div>
    </div>
  );
});

TshirtPreview3D.displayName = "TshirtPreview3D";

export default TshirtPreview3D;

function applyColor(
  model,
  hexColor
) {
  const color =
    new THREE.Color(hexColor);

  model.traverse((node) => {
    if (
      node.isMesh &&
      !node.userData?.isDesignDecal
    ) {
      if (
        node.geometry.hasAttribute(
          "color"
        )
      ) {
        node.geometry.deleteAttribute(
          "color"
        );
      }

      if (node.material) {
        const oldMap =
          node.material.map;

        const oldUserData =
          node.material.userData;

        const isZoneTexture =
          oldUserData?.isZoneTexture;

        if (
          oldMap &&
          !isZoneTexture
        ) {
          oldMap.dispose();
        }

        const newMat =
          new THREE.MeshPhongMaterial({
            color: isZoneTexture
              ? new THREE.Color(
                  "#ffffff"
                )
              : color,
            map: isZoneTexture
              ? oldMap
              : null,
            shininess: 10,
            side: THREE.DoubleSide,
          });

        newMat.userData =
          oldUserData || {};

        node.material.dispose();

        node.material = newMat;
      }
    }
  });
}