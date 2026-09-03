// src/components/TshirtCustomizer/TshirtPreview3D.js
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
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { renderZoneLayersToCanvasElement } from "../../utils/fabricZoneRenderer";
import "./TshirtCustomizer.css";

const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin("anonymous");
const textureCache = {};

// Converts the legacy { design, texts } shape (imageUrl/x/y/w/h for the
// single image + an array of text layers) into the small layer array
// fabricZoneRenderer.js expects, so the front/back UV texture renders
// through the same shared Fabric renderer the 2D editor and the
// SudoMock/Printful export use - this is what makes text wrapping
// agree across all three instead of drifting.
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

// Mesh names and UV ranges below match FINAL.glb's per-mesh UV report:
// Front/Back are 0.17-0.84 (U) / 0.04-0.96 (V), each a single clean
// island with 0 triangles outside 0-1 - unlike the old model, these
// numbers come directly from the model's real unwrap, not a guess.
// All four zones now use the same UV-texture-painting approach - the
// old decal system (DecalGeometry projected onto the mesh surface) is
// gone entirely. It existed only because the old model's sleeve UVs
// were unusable; FINAL.glb's sleeves are clean single-island unwraps
// like front/back, so they get the same, simpler, proven treatment.
const FRONT_BODY_MESH = "Front";
const BACK_BODY_MESH = "Back";
const LEFT_SLEEVE_MESH = "Left";
const HEM_LEFT_MESH = "Hem_Left";
const RIGHT_SLEEVE_MESH = "Right";
const HEM_RIGHT_MESH = "Hem_Right";
const NECK_MESH = "Neck";
const HEM_FRONT_MESH = "Hem_Front";
const HEM_BACK_MESH = "Hem_Back";

const BODY_ZONES = {
  neck: {
    meshName: NECK_MESH,
    uMin: 0.04,
    uMax: 0.96,
    vMin: 0.92,
    vMax: 0.96,
  },
  front: {
    meshName: FRONT_BODY_MESH,
    uMin: 0.17,
    uMax: 0.84,
    vMin: 0.04,
    vMax: 0.96,
  },
  back: {
    meshName: BACK_BODY_MESH,
    uMin: 0.17,
    uMax: 0.84,
    vMin: 0.04,
    vMax: 0.96,
  },
  left_sleeve: {
    meshName: LEFT_SLEEVE_MESH,
    uMin: 0.04,
    uMax: 0.96,
    vMin: 0.47,
    vMax: 0.92,
  },
  left_hem: {
    meshName: HEM_LEFT_MESH ,
    uMin: 0.11,
    uMax: 0.89,
    vMin: 0.92,
    vMax: 0.96,
  },
  right_sleeve: {
    meshName: RIGHT_SLEEVE_MESH,
    uMin: 0.04,
    uMax: 0.96,
    vMin: 0.47,
    vMax: 0.92,
  },
  right_hem: {
    meshName: HEM_RIGHT_MESH ,
    uMin: 0.11,
    uMax: 0.89,
    vMin: 0.92,
    vMax: 0.96,
  },
    front_hem: {
    meshName: HEM_FRONT_MESH,
    uMin: 0.17,
    uMax: 0.84,
    vMin: 0.94,
    vMax: 0.96,
  },
  back_hem: {
    meshName: HEM_BACK_MESH,
    uMin: 0.17,
    uMax: 0.84,
    vMin: 0.94,
    vMax: 0.96,
  },
};

const meshNameToZone = {
  [NECK_MESH]: "neck",
  [FRONT_BODY_MESH]: "front",
  [BACK_BODY_MESH]: "back",
  [LEFT_SLEEVE_MESH]: "left_sleeve",
  [HEM_LEFT_MESH]: "left_hem",
  [RIGHT_SLEEVE_MESH]: "right_sleeve",
  [HEM_RIGHT_MESH]: "right_hem",
  [HEM_FRONT_MESH]: "front_hem",
  [HEM_BACK_MESH]: "back_hem",
};



const TshirtPreview3D = forwardRef(function TshirtPreview3D({
  modelPath,
  shirtColor = "#ffffff",
  zoneColors = {}, 
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
}, ref) {
  const mountRef = useRef(null);
  const modelRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
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
      const design = designsRef.current[zoneId];
      const texts = zoneTextsRef.current[zoneId] || [];
      const fullLayers = zoneLayersRef.current[zoneId];
      // Prefer the full layer stack (includes shapes/patterns) whenever
      // it's supplied - legacyZoneToLayers is now only a fallback for
      // callers that haven't been updated to pass zoneLayers yet.
      const layers = fullLayers && fullLayers.length > 0
        ? fullLayers
        : legacyZoneToLayers(design, texts);
      const target = model.getObjectByName(uv.meshName);

      if (!target?.material) continue;

      const isZoneActive =
        zonesRef.current.length === 0 ||
        zonesRef.current.includes(zoneId);

      const hasContent = layers.length > 0;

      if (!isZoneActive || !hasContent) {
        const oldUserData = target.material.userData;

        if (target.material.map) {
          target.material.map.dispose();
        }

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
      
      // Renders this zone's design+texts through the same shared Fabric
      // renderer the 2D editor and the SudoMock/Printful export use, so
      // text wraps identically here instead of drifting via a separate
      // hand-written fillText call.
      const boxCanvas = await renderZoneLayersToCanvasElement(layers, w, h);

      if (!modelRef.current) return;

      ctx.drawImage(boxCanvas, x, y, w, h);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      texture.flipY = false;

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
    }
  }, []);

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

    scene.background = new THREE.Color(0xeef1f5);

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

        model.rotation.y = 0;

        scene.add(model);

        applyColor(model, shirtColorRef.current, zoneColorsRef.current);

        updateZoneTextures();

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
      applyColor(modelRef.current, shirtColor, zoneColorsRef.current);
      updateZoneTextures();
    }
  }, [shirtColor, zoneColors, updateZoneTextures]);

  useEffect(() => {
    if (ready) {
      updateZoneTextures();
    }
  }, [ready, zoneDesigns, zoneTexts, zoneLayers, updateZoneTextures, zones, zoneColors]);
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

        if (oldMap && !isZoneTexture) {
          oldMap.dispose();
        }

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