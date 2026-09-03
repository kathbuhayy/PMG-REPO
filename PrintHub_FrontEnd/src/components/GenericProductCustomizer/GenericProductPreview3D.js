import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import "../TshirtCustomizer/TshirtCustomizer.css";

const ZONE_FACE = {
  front: "front",
  back: "back",
  left_sleeve: "left",
  right_sleeve: "right",
  front_cover: "front",
  back_cover: "back",
  outside: "front",
  inside: "back",
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

const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin("anonymous");
const textureCache = {};

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

const EMPTY_OBJECT = Object.freeze({});

export default function GenericProductPreview3D({
  modelPath,
  shirtColor = "#ffffff",
  zoneDesigns = EMPTY_OBJECT,
  zoneFaceMap = EMPTY_OBJECT,
  decalScale = EMPTY_OBJECT,
  zoneTexts,
  projectionMode = "decal",
  flatShape = null,
  selectedSide = "",
  zones = [],
  fillParent = false,
  modelRotationY = 0,
  cylindricalUpAxis = null,
  cylindricalFrontOffsetDeg = null,
  cylindricalBackOffsetDeg = null,
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
  const persistentCanvasRef = useRef(null);
  const persistentTextureRef = useRef(null);

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

  const zoneFaceMapRef = useRef(zoneFaceMap);
  zoneFaceMapRef.current = zoneFaceMap;

  // Cylindrical wrap placement (u/v crop box) is driven by decalScale so
  // it's actually configurable per product, instead of a hardcoded box.
  // w/h are fractions of the full circumference/height (0-1); x/y are
  // center offsets as a fraction (-0.5..0.5). Defaults reproduce the old
  // hardcoded box (0.2-0.8 / 0.1-0.9).
  const getWrapUVBounds = useCallback((zoneId) => {
    const scale = decalScaleRef.current[zoneId] || {};
    const wrapW = scale.w ?? 0.6;
    const wrapH = scale.h ?? 0.8;
    const centerU = 0.5 + (scale.x ?? 0);
    const centerV = 0.5 - (scale.y ?? 0);
    const uMin = Math.max(0, centerU - wrapW / 2);
    const uMax = Math.min(1, centerU + wrapW / 2);

    const vMin = Math.max(0, centerV - wrapH / 2);
    const vMax = Math.min(1, centerV + wrapH / 2);

    return {
      uMin,
      uMax,
      vMin,
      vMax,
    };
  }, []);

  const clearDecals = useCallback(() => {
    Object.values(decalsRef.current).forEach((mesh) => {
      mesh.parent?.remove(mesh);
      mesh.geometry?.dispose();

      if (mesh.material?.map) {
        mesh.material.map.dispose();
      }

      mesh.material?.dispose();
    });

    decalsRef.current = {};
  }, []);

  const clearDecal = useCallback((zoneId) => {
    const mesh = decalsRef.current[zoneId];

    if (!mesh) return;

    mesh.parent?.remove(mesh);
    mesh.geometry?.dispose();

    if (mesh.material?.map) {
      mesh.material.map.dispose();
    }

    mesh.material?.dispose();

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

        // Reset metallic factors to allow proper diffuse color rendering
        if (node.material.metalness !== undefined) {
          node.material.metalness = 0.0;
        }

        if (node.material.roughness !== undefined) {
          node.material.roughness = 0.7;
        }

        if (node.material.color) {
          node.material.color = color;
          node.material.needsUpdate = true;
        }
      }
    });
  }, []);

  const getTargetMesh = useCallback((model) => {
    // For the mug, the UV report shows a dedicated outer "body"
    // mesh. Always prefer that over the handle, bottom, or inside.
    const mugBodyNames = [
      "body"
    ];

    for (const name of mugBodyNames) {
      const mesh = model.getObjectByName(name);

      if (mesh?.isMesh) {
        return mesh;
      }
    }

    // Fallback for products that do not have a named body mesh.
    let target = null;
    let bestVolume = -Infinity;

    model.traverse((node) => {
      if (!node.isMesh) return;

      const box = new THREE.Box3().setFromObject(node);
      const size = box.getSize(new THREE.Vector3());
      const volume = size.x * size.y * size.z;

      if (volume > bestVolume) {
        bestVolume = volume;
        target = node;
      }
    });

    return target;
  }, []);

  // Generates cylindrical UV mapping coordinates on a geometry.
  const addCylindricalUVs = useCallback((mesh) => {
    let geometry = mesh.geometry;

    // Each triangle needs its own private vertices so the seam fix below
    // (which shifts u values per-triangle) can't leak into unrelated
    // triangles that happen to share a vertex across the wrap boundary.
    if (geometry.index) {
      const nonIndexed = geometry.toNonIndexed();
      nonIndexed.userData = geometry.userData;
      geometry.dispose();
      geometry = nonIndexed;
      mesh.geometry = geometry;
    }

    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    let heightAxis = "y";
    if (geometry.userData.forcedAxis) {
      heightAxis = geometry.userData.forcedAxis;
    } else if (size.x > size.y && size.x > size.z) {
      heightAxis = "x";
    } else if (size.z > size.x && size.z > size.y) {
      heightAxis = "z";
    }

    const cx = center.x;
    const cy = center.y;
    const cz = center.z;

    const pos = geometry.attributes.position;
    if (!pos) return;
    const uvs = [];

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      let u = 0;
      let v = 0;

      if (heightAxis === "y") {
        const theta = Math.atan2(cx - x, z - cz);
        u = (theta + Math.PI) / (2 * Math.PI);
        v = (y - cy) / size.y + 0.5;
      } else if (heightAxis === "z") {
        const adjustmentDegrees = geometry.userData.frontOffsetDeg ?? -15;
        const adjustmentRadians = (adjustmentDegrees * Math.PI) / 180;
        let theta =
          Math.atan2(cx - x, y - cy) - Math.PI / 2 + adjustmentRadians;
        u = (theta + Math.PI) / (2 * Math.PI);
        v = (z - cz) / size.z + 0.5;
      } else {
        const theta = Math.atan2(y - cy, z - cz) - (Math.PI / 2) + 3;
        u = (theta + Math.PI) / (2 * Math.PI);
        v = (x - cx) / size.x + 0.5;
      }

      uvs.push(u, v);
    }

    // Seam fix: geometry is now non-indexed, so every 3 consecutive
    // vertices form one triangle with its own private UVs. atan2 wraps u
    // from ~1.0 back to ~0.0 at one angle around the mug. A triangle that
    // straddles that angle ends up with vertices like [0.98, 0.02, 0.99] -
    // the GPU interpolates across the shorter *numeric* gap, stretching
    // whatever's near u=0.5 across almost the whole texture for that
    // triangle. Fix: for each triangle, if its u values span more than
    // half the texture width, push the low-side ones up by 1.0 so
    // interpolation goes the short way around the seam instead.
    for (let t = 0; t < uvs.length / 2; t += 3) {
      const uA = uvs[t * 2];
      const uB = uvs[(t + 1) * 2];
      const uC = uvs[(t + 2) * 2];
      const maxU = Math.max(uA, uB, uC);
      const minU = Math.min(uA, uB, uC);
      if (maxU - minU > 0.5) {
        if (uA < 0.5) uvs[t * 2] += 1;
        if (uB < 0.5) uvs[(t + 1) * 2] += 1;
        if (uC < 0.5) uvs[(t + 2) * 2] += 1;
      }
    }

    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.attributes.uv.needsUpdate = true;
  }, []);

  const createFlatModel = useCallback((shapeConfig = {}) => {
    const {
      width = 2.1,
      height = 2.97,
      depth = 0.035,
      radius = 0,
      foldLines = 0,
      hole = false,
    } = shapeConfig;

    let geometry;
    if (radius > 0) {
      geometry = new THREE.CylinderGeometry(width / 2, width / 2, depth, 96);
      geometry.rotateX(Math.PI / 2);
      geometry.scale(1, height / width, 1);
    } else {
      geometry = new THREE.BoxGeometry(width, height, depth);
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorRef.current),
      roughness: 0.72,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const model = new THREE.Group();
    const body = new THREE.Mesh(geometry, material);
    body.name = "flat-print-body";
    model.add(body);

    if (foldLines > 0) {
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x9aa4b2,
        transparent: true,
        opacity: 0.75,
      });
      for (let i = 1; i <= foldLines; i += 1) {
        const x = -width / 2 + (width / (foldLines + 1)) * i;
        const points = [
          new THREE.Vector3(x, -height / 2, depth / 2 + 0.003),
          new THREE.Vector3(x, height / 2, depth / 2 + 0.003),
        ];
        model.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            lineMaterial,
          ),
        );
      }
    }

    if (hole) {
      const holeGeometry = new THREE.RingGeometry(
        width * 0.045,
        width * 0.075,
        48,
      );
      const holeMaterial = new THREE.MeshBasicMaterial({
        color: 0x1e2433,
        side: THREE.DoubleSide,
      });
      const holeMesh = new THREE.Mesh(holeGeometry, holeMaterial);
      holeMesh.position.set(0, height * 0.38, depth / 2 + 0.004);
      model.add(holeMesh);
    }

    return model;
  }, []);

  const getZoneProjectionMode = useCallback(
    (zoneId) =>
      typeof projectionMode === "string"
        ? projectionMode
        : projectionMode[zoneId] || projectionMode.default || "decal",
    [projectionMode],
  );

  const createPlaneOverlay = useCallback(
    ({ face, texture, design, box, size, center, scale }) => {
      const designX = design.x ?? 10;
      const designY = design.y ?? 10;
      const designW = design.w ?? 80;
      const designH = design.h ?? 80;
      const isSide = face === "left" || face === "right";
      const zoneW = (isSide ? size.z : size.x) * (scale.w ?? 0.56);
      const zoneH = size.y * (scale.h ?? 0.5);
      const offsetA = ((designX + designW / 2) / 100 - 0.5) * zoneW;
      const offsetY = (0.5 - (designY + designH / 2) / 100) * zoneH;
      const position = center.clone();
      let rotation = new THREE.Euler(0, 0, 0);
      let width = zoneW * (designW / 100);
      let height = zoneH * (designH / 100);

      if (face === "back") {
        position.z = box.min.z - size.z * (scale.surfaceOffset ?? 0.02);
        position.x += offsetA;
        position.y += offsetY;
        rotation = new THREE.Euler(0, Math.PI, 0);
      } else if (face === "left") {
        position.x = box.min.x - size.x * (scale.surfaceOffset ?? 0.02);
        position.z += offsetA;
        position.y += offsetY;
        rotation = new THREE.Euler(0, -Math.PI / 2, 0);
      } else if (face === "right") {
        position.x = box.max.x + size.x * (scale.surfaceOffset ?? 0.02);
        position.z += offsetA;
        position.y += offsetY;
        rotation = new THREE.Euler(0, Math.PI / 2, 0);
      } else {
        position.z = box.max.z + size.z * (scale.surfaceOffset ?? 0.02);
        position.x += offsetA;
        position.y += offsetY;
      }

      position.x += (scale.x ?? 0) * size.x;
      position.y += (scale.y ?? 0) * size.y;
      position.z += (scale.z ?? 0) * size.z;

      if (isSide) {
        width = zoneW * (designW / 100);
        height = zoneH * (designH / 100);
      }

      const geometry = new THREE.PlaneGeometry(width, height);
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
      const plane = new THREE.Mesh(geometry, material);
      plane.position.copy(position);
      plane.rotation.copy(rotation);
      return plane;
    },
    [],
  );

  const rebuildDecals = useCallback(() => {
    const model = modelRef.current;
    const scene = sceneRef.current;
    if (!model || !scene) return;

    const currentRebuildId = ++rebuildIdRef.current;
    model.updateMatrixWorld(true);
    const target = getTargetMesh(model);
    if (!target) return;
    target.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(target);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const cylZoneEntry = Object.keys({ ...designsRef.current, ...zoneTextsRef.current }).find(
      (zId) => {
        const hasImage = designsRef.current[zId]?.imageUrl;
        const hasText = (zoneTextsRef.current[zId] || []).length > 0;
        return (
          (hasImage || hasText) &&
          getZoneProjectionMode(zId) === "cylindrical" &&
          (!zones || zones.length === 0 || zones.includes(zId))
        );
      }
    );

    if (cylZoneEntry) {
      const zoneId = cylZoneEntry;
      const design = designsRef.current[zoneId] || null;

            if (!persistentCanvasRef.current) {
        const canvas = document.createElement("canvas");
        canvas.width = 2048;
        canvas.height = 2048;
        persistentCanvasRef.current = canvas;
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        // Required by the seam-safe UVs in addCylindricalUVs, which push
        // some triangles' u values past 1.0 so they interpolate the short
        // way around the seam. Without RepeatWrapping, u > 1 clamps to the
        // canvas's right-edge pixel instead of wrapping - showing up as a
        // flat, wrong-colored vertical bar right at the seam.
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        persistentTextureRef.current = texture;
      }

      const paintCanvas = (img) => {
        if (currentRebuildId !== rebuildIdRef.current) return;
        if (!modelRef.current || !sceneRef.current) return;

        const canvas = persistentCanvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = colorRef.current;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const { uMin, uMax, vMin, vMax } = getWrapUVBounds(zoneId);
        console.log("[MUG UV PRINT AREA]", {
          zoneId,
          uMin,
          uMax,
          vMin,
          vMax,
          widthPercent: (uMax - uMin) * 100,
          heightPercent: (vMax - vMin) * 100,
        });
        const x = uMin * canvas.width;
        const y = vMin * canvas.height;
        const w = (uMax - uMin) * canvas.width;
        const h = (vMax - vMin) * canvas.height;

        if (img && design) {
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
        }

        const cylTexts = zoneTextsRef.current[zoneId] || [];
        cylTexts.forEach((t) => drawTextLayer(ctx, t, x, y, w, h));

        persistentTextureRef.current.needsUpdate = true;

        if (target.material.map !== persistentTextureRef.current) {
          if (target.material.map && target.material.map !== persistentTextureRef.current) {
            target.material.map.dispose();
          }
          target.material.map = persistentTextureRef.current;
          target.material.userData.isZoneTexture = true;
          target.material.color = new THREE.Color("#ffffff");
          target.material.needsUpdate = true;
        }
      };

      if (design?.imageUrl) {
        loadImageCached(design.imageUrl, paintCanvas);
      } else {
        paintCanvas(null);
      }
    } else {
      if (target.material.map && target.material.userData.isZoneTexture) {
        if (target.material.map !== persistentTextureRef.current) {
          target.material.map.dispose();
        }
        target.material.map = null;
        target.material.userData.isZoneTexture = false;
        target.material.color = new THREE.Color(colorRef.current);
        target.material.needsUpdate = true;
      }
    }

    const activeZoneIds = new Set([
      ...Object.keys(designsRef.current).filter(
        (z) => designsRef.current[z]?.imageUrl
      ),
      ...Object.keys(zoneTextsRef.current).filter(
        (z) => (zoneTextsRef.current[z] || []).length > 0
      ),
    ]);

    const decalZoneIds = Array.from(activeZoneIds).filter(
      (zoneId) =>
        (!zones || zones.length === 0 || zones.includes(zoneId)) &&
        getZoneProjectionMode(zoneId) !== "cylindrical"
    );

    // drop meshes for zones that no longer have image or text
    Object.keys(decalsRef.current).forEach((zoneId) => {
      if (!decalZoneIds.includes(zoneId)) clearDecal(zoneId);
    });

    if (decalZoneIds.length === 0) return;

    decalZoneIds.forEach((zoneId) => {
      const design = designsRef.current[zoneId] || null;
      const texts = zoneTextsRef.current[zoneId] || [];
      const face = zoneFaceMapRef.current[zoneId] || ZONE_FACE[zoneId] || "front";
      const scale = decalScaleRef.current[zoneId] || {};
      const { canvas, texture } = getZoneCanvas(zoneId);
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

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
        const zoneW = (isSide ? size.z : size.x) * (scale.w ?? 0.56);
        const zoneH = size.y * (scale.h ?? 0.5);
        const position = center.clone();
        let orientation;

        if (face === "back") {
          position.z = box.min.z + size.z * (scale.surfaceOffset ?? 0.02);
          orientation = new THREE.Euler(0, Math.PI, 0);
        } else if (face === "left") {
          position.x = box.min.x + size.x * (scale.surfaceOffset ?? 0.02);
          orientation = new THREE.Euler(0, Math.PI / 2, 0);
        } else if (face === "right") {
          position.x = box.max.x - size.x * (scale.surfaceOffset ?? 0.02);
          orientation = new THREE.Euler(0, -Math.PI / 2, 0);
        } else {
          position.z = box.max.z - size.z * (scale.surfaceOffset ?? 0.02);
          orientation = new THREE.Euler(0, 0, 0);
        }
        position.x += (scale.x ?? 0) * size.x;
        position.y += (scale.y ?? 0) * size.y;
        position.z += (scale.z ?? 0) * size.z;

        const depthAxisSize = isSide ? size.x : size.z;
        const decalSize = new THREE.Vector3(
          zoneW,
          zoneH,
          Math.max(depthAxisSize * (scale.depth ?? 0.22), 0.01)
        );

        const mode = getZoneProjectionMode(zoneId);
        let mesh;
        if (mode === "plane") {
          mesh = createPlaneOverlay({
            face,
            texture,
            design: { x: 0, y: 0, w: 100, h: 100 },
            box,
            size,
            center,
            scale,
          });
        } else {
          const geometry = new DecalGeometry(target, position, orientation, decalSize);
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
          mesh = new THREE.Mesh(geometry, material);
        }

        clearDecal(zoneId);
        scene.add(mesh);
        decalsRef.current[zoneId] = mesh;
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
            (designH / 100) * canvas.height
          );
          placeMesh();
        });
      } else {
        placeMesh();
      }
    });
  }, [
    clearDecal,
    clearDecals,
    createPlaneOverlay,
    getTargetMesh,
    getWrapUVBounds,
    getZoneProjectionMode,
    zones,
  ]);

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
    if (!mountRef.current || (!modelPath && !flatShape)) return;

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

    // raycast a decal mesh (non-cylindrical zones) and turn its hit UV
    // directly into zone percent — DecalGeometry UVs are already 0-1
    // across the decal's own footprint.
    const raycastDecal = (clientX, clientY) => {
      const meshes = Object.entries(decalsRef.current).map(([zoneId, mesh]) => ({ zoneId, mesh }));
      if (!meshes.length) return null;
      getNDC(clientX, clientY);
      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObjects(meshes.map((m) => m.mesh), false);
      if (!hits.length || !hits[0].uv) return null;
      const hitMesh = hits[0].object;
      const found = meshes.find((m) => m.mesh === hitMesh);
      if (!found) return null;
      const pctX = hits[0].uv.x * 100;
      const pctY = (1 - hits[0].uv.y) * 100;
      return { zoneId: found.zoneId, pct: { x: pctX, y: pctY } };
    };

    // raycast the cylindrical (mug) target mesh using its known uv slice
    const raycastCylindrical = (clientX, clientY) => {
      const model = modelRef.current;
      if (!model) return null;
      const target = getTargetMesh(model);
      if (!target?.material?.userData?.isZoneTexture) return null;
      getNDC(clientX, clientY);
      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObject(target, false);
      if (!hits.length || !hits[0].uv) return null;
      const zoneId = Object.keys({ ...designsRef.current, ...zoneTextsRef.current }).find(
        (zId) => getZoneProjectionMode(zId) === "cylindrical"
      );
      if (!zoneId) return null;
      const { uMin, uMax, vMin, vMax } = getWrapUVBounds(zoneId);
      const pctX = ((hits[0].uv.x - uMin) / (uMax - uMin)) * 100;
      const pctY = (1 - ((hits[0].uv.y - vMin) / (vMax - vMin))) * 100;
      return { zoneId, pct: { x: pctX, y: pctY } };
    };

    const onPointerMove = (e) => {
      if (!dragState) return;
      const hit = dragState.mode === "cylindrical"
        ? raycastCylindrical(e.clientX, e.clientY)
        : raycastDecal(e.clientX, e.clientY);
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

      let hit = raycastDecal(e.clientX, e.clientY);
      let mode = "decal";
      if (!hit) {
        hit = raycastCylindrical(e.clientX, e.clientY);
        mode = "cylindrical";
      }
      if (!hit) return;

      const target = findHitTarget(hit.zoneId, hit.pct.x, hit.pct.y);
      if (!target) return;

      e.stopImmediatePropagation();
      e.preventDefault();
      controls.enabled = false;
      dragState = {
        mode,
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

    if (flatShape) {
      const model = createFlatModel(flatShape);
      modelRef.current = model;
      scene.add(model);
      model.rotation.y = modelRotationY;
      applyBaseColor();

      const target = getTargetMesh(model);
      if (target && target.geometry) {
        if (cylindricalUpAxis) {
          target.geometry.userData.forcedAxis = cylindricalUpAxis;
        } 
        if (cylindricalFrontOffsetDeg !== null) {
          target.geometry.userData.frontOffsetDeg = cylindricalFrontOffsetDeg;
        }
        if (cylindricalBackOffsetDeg !== null) {
          target.geometry.userData.backOffsetDeg = cylindricalBackOffsetDeg;
        }
        const hasCyl = Object.values(projectionMode).some(
          (mode) => mode === "cylindrical"
        );
         if (hasCyl) {
          addCylindricalUVs(target);   // was: addCylindricalUVs(target.geometry)
        }
      }

      rebuildDecals();
      fitCameraToModel(model);
      setReady(true);
    } else {
      new GLTFLoader().load(
        modelPath,
        (gltf) => {
          const model = gltf.scene;
          modelRef.current = model;
          scene.add(model);
          model.rotation.y = modelRotationY;
          applyBaseColor();

          const target = getTargetMesh(model);
          if (target && target.geometry) {
            if (cylindricalUpAxis) {
              target.geometry.userData.forcedAxis = cylindricalUpAxis;
            }
            if (cylindricalFrontOffsetDeg !== null) {
              target.geometry.userData.frontOffsetDeg = cylindricalFrontOffsetDeg;
            }
            if (cylindricalBackOffsetDeg !== null) {
          target.geometry.userData.backOffsetDeg = cylindricalBackOffsetDeg;
        }
            const hasCyl = Object.values(projectionMode).some(
              (mode) => mode === "cylindrical"
            );
             if (hasCyl) {
          addCylindricalUVs(target);   // was: addCylindricalUVs(target.geometry)
        }
          }

          rebuildDecals();
          fitCameraToModel(model);
          setReady(true);
        },
        undefined,
        () => setError(`Failed to load 3D model: ${modelPath}`),
      );
    }

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
          const materials = Array.isArray(node.material)
            ? node.material
            : [node.material];
          materials.forEach((m) => m?.dispose());
        });
      }
      modelRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createFlatModel, flatShape, modelPath]);

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

  // Resets the camera view to its initial position and target settings.
  const resetCameraView = useCallback(() => {
    if (
      !controlsRef.current ||
      !cameraRef.current ||
      !initialCameraPosRef.current
    ) {
      return;
    }
    cameraRef.current.position.copy(initialCameraPosRef.current);
    controlsRef.current.target.copy(initialTargetRef.current);
    setZoom(100);
    controlsRef.current.update();
  }, []);

  // Reset camera view when the selected print side changes.
  useEffect(() => {
    resetCameraView();
  }, [selectedSide, resetCameraView]);

  return (
    <div
      style={
        fillParent
          ? { display: "flex", flexDirection: "column", height: "100%" }
          : {}
      }
    >
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
        <button
          type="button"
          className="tsc-zoom-btn"
          onClick={() => setZoom((z) => Math.max(50, z - 25))}
        >
          -
        </button>
        <span>{zoom}%</span>
        <button
          type="button"
          className="tsc-zoom-btn"
          onClick={() => setZoom((z) => Math.min(200, z + 25))}
        >
          +
        </button>
        <button
          type="button"
          className="tsc-pan-btn"
          onClick={resetCameraView}
          title="Reset View"
        >
          ⟳
        </button>
      </div>

      <div className="pd-3d-disclaimer">
        ⓘ The model thickness is only a representation of the product.
      </div>
    </div>
  );
}