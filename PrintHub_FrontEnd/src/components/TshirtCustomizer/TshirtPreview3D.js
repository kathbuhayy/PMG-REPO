import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import * as THREE from "three";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry";


// =========================================================
// NEW tshirt.glb CONFIGURATION
// =========================================================

// Your new GLB contains:
//
// tripo_part_0
// tripo_part_1
// tripo_part_2
// tripo_part_3
// tripo_part_4

const TSHIRT_MESH_NAMES = [
  "tripo_part_0",
  "tripo_part_1",
  "tripo_part_2",
  "tripo_part_3",
  "tripo_part_4",
];


// =========================================================
// DECAL CONFIGURATION
// =========================================================

const ZONE_CONFIG = {
  front: {
    type: "body",
    direction: 1,
  },

  back: {
    type: "body",
    direction: -1,
  },

  left_sleeve: {
    type: "sleeve",
    side: -1,
  },

  right_sleeve: {
    type: "sleeve",
    side: 1,
  },
};


// =========================================================
// DECAL PROJECTION DEPTH
// =========================================================

// How deep the front/back decal projection box reaches into
// the shirt surface. Too large = bleeds through to the other
// side. Too small = design gets clipped on curved areas.
const BODY_DECAL_DEPTH_RATIO = 0.6;

// How wide/tall the front/back decal covers relative to the
// whole shirt. Push these toward 1.0 for a full all-over
// front/back print (edge-to-edge); keep them smaller for a
// chest-pocket-sized logo/design. Height is kept back from 1.0
// so the decal doesn't reach into the neckline curve, where a
// flat projection distorts and leaves gaps.
const BODY_DECAL_WIDTH_RATIO = 0.85;
const BODY_DECAL_HEIGHT_RATIO = 0.75;

// The sleeve is a narrow cylinder, not a flat panel — a decal
// as wide as the torso wraps past the visible side of the arm
// and onto the underside, which causes a warped/mirrored look.
// Keeping width/height closer to the sleeve's actual diameter
// keeps the decal on the front-facing arc only.
const SLEEVE_DECAL_WIDTH_RATIO = 0.28;
const SLEEVE_DECAL_HEIGHT_RATIO = 0.3;
const SLEEVE_DECAL_DEPTH_RATIO = 0.08;


// =========================================================
// COMPONENT
// =========================================================

const TshirtPreview3D = forwardRef(
  function TshirtPreview3D(
    {
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
    },
    ref
  ) {

    const mountRef = useRef(null);

    const modelRef = useRef(null);

    const sceneRef = useRef(null);

    const rendererRef = useRef(null);

    const cameraRef = useRef(null);

    const controlsRef = useRef(null);

    const frameRef = useRef({
      center: new THREE.Vector3(),
      dist: 3,
    });


    // All design decals
    const decalsRef = useRef([]);


    // Refs for latest React values
    const designsRef = useRef(zoneDesigns);

    const zoneTextsRef = useRef(zoneTexts);

    const zonesRef = useRef(zones);

    const shirtColorRef = useRef(shirtColor);

    const onZoneDesignChangeRef =
      useRef(onZoneDesignChange);

    const onTextChangeRef =
      useRef(onTextChange);

    const onZoneSelectRef =
      useRef(onZoneSelect);

    const onTextSelectRef =
      useRef(onTextSelect);

    const onLayerSelectRef =
      useRef(onLayerSelect);


    designsRef.current = zoneDesigns;

    zoneTextsRef.current = zoneTexts;

    zonesRef.current = zones;

    shirtColorRef.current = shirtColor;

    onZoneDesignChangeRef.current =
      onZoneDesignChange;

    onTextChangeRef.current =
      onTextChange;

    onZoneSelectRef.current =
      onZoneSelect;

    onTextSelectRef.current =
      onTextSelect;

    onLayerSelectRef.current =
      onLayerSelect;


    const [ready, setReady] =
      useState(false);

    const [error, setError] =
      useState("");

    const [zoom, setZoom] =
      useState(100);


    // =====================================================
    // REMOVE OLD DECALS
    // =====================================================

    const clearDecals = useCallback(() => {

      decalsRef.current.forEach(
        (decal) => {

          if (!decal) return;

          decal.parent?.remove(decal);

          if (decal.geometry) {
            decal.geometry.dispose();
          }

          if (decal.material) {

            if (decal.material.map) {
              decal.material.map.dispose();
            }

            decal.material.dispose();
          }
        }
      );

      decalsRef.current = [];

    }, []);


    // =====================================================
    // GET ALL NEW TSHIRT MESHES
    // =====================================================

    const getTshirtMeshes =
      useCallback(() => {

        const model =
          modelRef.current;

        if (!model) {
          return [];
        }

        const meshes = [];

        model.traverse(
          (child) => {

            if (
              child.isMesh &&
              TSHIRT_MESH_NAMES.includes(
                child.name
              )
            ) {
              meshes.push(child);
            }
          }
        );

        return meshes;

      }, []);


    // =====================================================
    // CREATE DESIGN CANVAS
    // =====================================================

    const createDesignTexture =
      useCallback(
        (
          zoneId,
          design,
          texts,
          callback
        ) => {

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width = 2048;

          canvas.height = 2048;


          const ctx =
            canvas.getContext("2d");


          if (!ctx) {
            callback(null);
            return;
          }


          // Transparent background
          ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
          );


          const finalize = () => {

            // Add text layers
            texts.forEach(
              (textLayer) => {

                drawTextLayer(
                  ctx,
                  textLayer,
                  0,
                  0,
                  canvas.width,
                  canvas.height
                );
              }
            );


            const texture =
              new THREE.CanvasTexture(
                canvas
              );


            texture.colorSpace =
              THREE.SRGBColorSpace;

            texture.needsUpdate = true;


            callback(texture);
          };


          // Image design
          if (design?.imageUrl) {

            const image =
              new Image();

            image.crossOrigin =
              "anonymous";


            image.onload = () => {

              const x =
                design.x ?? 0;

              const y =
                design.y ?? 0;

              const w =
                design.w ?? 100;

              const h =
                design.h ?? 100;


              ctx.drawImage(
                image,

                (x / 100) *
                  canvas.width,

                (y / 100) *
                  canvas.height,

                (w / 100) *
                  canvas.width,

                (h / 100) *
                  canvas.height
              );


              finalize();
            };


            image.onerror = () => {

              console.error(
                `[3D preview] Failed to load ${zoneId} design`
              );

              finalize();
            };


            image.src =
              design.imageUrl;

          } else {

            finalize();
          }
        },
        []
      );


    // =====================================================
    // CREATE BODY DECAL
    // =====================================================

    const createBodyDecal =
      useCallback(
        (
          zoneId,
          texture,
          meshes
        ) => {

          const scene =
            sceneRef.current;

          if (
            !scene ||
            !texture ||
            meshes.length === 0
          ) {
            return;
          }


          // Get entire shirt dimensions
          const model =
            modelRef.current;

          model.updateMatrixWorld(
            true
          );


          const box =
            new THREE.Box3()
              .setFromObject(
                model
              );


          const size =
            box.getSize(
              new THREE.Vector3()
            );


          const center =
            box.getCenter(
              new THREE.Vector3()
            );


          const direction =
            ZONE_CONFIG[
              zoneId
            ].direction;


          /*
           * FRONT/BACK DECAL SIZE
           *
           * width:
           * shirt width
           *
           * height:
           * printable shirt area
           */

          const decalWidth =
            size.x * BODY_DECAL_WIDTH_RATIO;

          const decalHeight =
            size.y * BODY_DECAL_HEIGHT_RATIO;


          // Offset slightly away from shirt surface
          const zOffset =
            size.z * 0.55;


          const position =
            new THREE.Vector3(
              center.x,
              center.y +
                size.y * 0.02,
              center.z +
                direction * zOffset
            );


          // Front faces camera
          const orientation =
            new THREE.Euler(
              0,
              direction === 1
                ? 0
                : Math.PI,
              0
            );


          // NOTE: the "depth" axis (z) used to be size.z * 2,
          // which is TWICE the whole garment's depth — that
          // made the projection box swallow the entire shirt,
          // so the decal painted through to the opposite side.
          // Keeping this shallow so it only hugs the surface
          // near the projection point fixes the bleed-through.
          const decalSize =
            new THREE.Vector3(
              decalWidth,
              decalHeight,
              size.z * BODY_DECAL_DEPTH_RATIO
            );


          // Try decal on every shirt mesh.
          // Only geometry intersecting the decal
          // projection receives it.

          meshes.forEach(
            (mesh) => {

              const geometry =
                new DecalGeometry(
                  mesh,
                  position,
                  orientation,
                  decalSize
                );


              if (
                !geometry ||
                !geometry.attributes
                  ?.position ||
                geometry.attributes
                  .position.count === 0
              ) {
                geometry?.dispose();
                return;
              }


              const material =
                new THREE.MeshBasicMaterial({
                  map: texture.clone(),

                  transparent: true,

                  side:
                    THREE.DoubleSide,

                  depthTest: true,

                  depthWrite: false,

                  polygonOffset: true,

                  polygonOffsetFactor: -4,

                  polygonOffsetUnits: -4,
                });


              material.map.needsUpdate =
                true;


              const decal =
                new THREE.Mesh(
                  geometry,
                  material
                );


              decal.renderOrder = 10;

              decal.userData =
                {
                  isDesignDecal: true,

                  zoneId,
                };


              scene.add(
                decal
              );


              decalsRef.current.push(
                decal
              );
            }
          );

        },
        []
      );


    // =====================================================
    // CREATE SLEEVE DECAL
    // =====================================================

    const createSleeveDecal =
      useCallback(
        (
          zoneId,
          texture,
          meshes
        ) => {

          const scene =
            sceneRef.current;

          const model =
            modelRef.current;


          if (
            !scene ||
            !model ||
            !texture ||
            meshes.length === 0
          ) {
            return;
          }


          model.updateMatrixWorld(
            true
          );


          const box =
            new THREE.Box3()
              .setFromObject(
                model
              );


          const size =
            box.getSize(
              new THREE.Vector3()
            );


          const center =
            box.getCenter(
              new THREE.Vector3()
            );


          const side =
            ZONE_CONFIG[
              zoneId
            ].side;


          const position =
            new THREE.Vector3(
              side < 0
                ? box.min.x +
                  size.x * 0.12
                : box.max.x -
                  size.x * 0.12,

              center.y +
                size.y * 0.18,

              center.z
            );


          const orientation =
            new THREE.Euler(
              0,

              side < 0
                ? Math.PI / 2
                : -Math.PI / 2,

              0
            );


          // NOTE: the depth axis (z, which becomes world X
          // after the 90° rotation above) used to be
          // size.x * 0.25 — a quarter of the shirt's total
          // width. That reached clear across into the torso
          // mesh, which is why the design showed up on the
          // front/back too. Shrinking it to a thin shell
          // around the sleeve surface fixes the bleed.
          const decalSize =
            new THREE.Vector3(
              size.z * SLEEVE_DECAL_WIDTH_RATIO,

              size.y * SLEEVE_DECAL_HEIGHT_RATIO,

              size.x * SLEEVE_DECAL_DEPTH_RATIO
            );


          meshes.forEach(
            (mesh) => {

              const geometry =
                new DecalGeometry(
                  mesh,
                  position,
                  orientation,
                  decalSize
                );


              if (
                !geometry ||
                !geometry.attributes
                  ?.position ||
                geometry.attributes
                  .position.count === 0
              ) {
                geometry?.dispose();
                return;
              }


              const material =
                new THREE.MeshBasicMaterial({
                  map: texture.clone(),

                  transparent: true,

                  side:
                    THREE.DoubleSide,

                  depthTest: true,

                  depthWrite: false,

                  polygonOffset: true,

                  polygonOffsetFactor: -4,

                  polygonOffsetUnits: -4,
                });


              material.map.needsUpdate =
                true;


              const decal =
                new THREE.Mesh(
                  geometry,
                  material
                );


              decal.renderOrder = 10;

              decal.userData =
                {
                  isDesignDecal: true,

                  zoneId,
                };


              scene.add(
                decal
              );


              decalsRef.current.push(
                decal
              );
            }
          );

        },
        []
      );


    // =====================================================
    // REBUILD ALL DESIGN DECALS
    // =====================================================

    const rebuildAllDecals =
      useCallback(() => {

        const model =
          modelRef.current;


        if (!model) {
          return;
        }


        clearDecals();


        const meshes =
          getTshirtMeshes();


        console.log(
          "[3D preview] shirt meshes:",
          meshes.map(
            (mesh) => mesh.name
          )
        );


        const zoneIds = [
          "front",
          "back",
          "left_sleeve",
          "right_sleeve",
        ];


        zoneIds.forEach(
          (zoneId) => {

            const isActive =
              zonesRef.current.length === 0 ||
              zonesRef.current.includes(
                zoneId
              );


            if (!isActive) {
              return;
            }


            const design =
              designsRef.current[
                zoneId
              ];


            const texts =
              zoneTextsRef.current[
                zoneId
              ] || [];


            const hasContent =
              Boolean(
                design?.imageUrl
              ) ||
              texts.length > 0;


            if (!hasContent) {
              return;
            }


            console.log(
              `[3D preview] building ${zoneId}`,
              {
                hasImage:
                  Boolean(
                    design?.imageUrl
                  ),

                imageUrl:
                  design?.imageUrl
                    ? design.imageUrl.slice(
                        0,
                        80
                      )
                    : null,

                textCount:
                  texts.length,
              }
            );


            createDesignTexture(
              zoneId,

              design,

              texts,

              (texture) => {

                if (
                  !texture ||
                  !modelRef.current
                ) {
                  texture?.dispose();
                  return;
                }


                if (
                  zoneId === "front" ||
                  zoneId === "back"
                ) {

                  createBodyDecal(
                    zoneId,

                    texture,

                    meshes
                  );

                } else {

                  createSleeveDecal(
                    zoneId,

                    texture,

                    meshes
                  );
                }


                texture.dispose();
              }
            );
          }
        );

      },
      [
        clearDecals,

        getTshirtMeshes,

        createDesignTexture,

        createBodyDecal,

        createSleeveDecal,
      ]
    );


    // =====================================================
    // APPLY SHIRT COLOR
    // =====================================================

    const updateShirtColor =
      useCallback(
        (color) => {

          const model =
            modelRef.current;

          if (!model) {
            return;
          }


          const newColor =
            new THREE.Color(
              color
            );


          model.traverse(
            (node) => {

              if (
                !node.isMesh ||
                node.userData
                  ?.isDesignDecal
              ) {
                return;
              }


              const materials =
                Array.isArray(
                  node.material
                )
                  ? node.material
                  : [
                      node.material,
                    ];


              materials.forEach(
                (material) => {

                  if (
                    !material ||
                    !material.color
                  ) {
                    return;
                  }


                  material.color.copy(
                    newColor
                  );

                  material.needsUpdate =
                    true;
                }
              );
            }
          );

        },
        []
      );


    // =====================================================
    // THREE.JS SETUP
    // =====================================================

    useEffect(() => {

      if (
        !mountRef.current ||
        !modelPath
      ) {
        return;
      }


      setReady(false);

      setError("");


      const container =
        mountRef.current;


      const width =
        container.offsetWidth ||
        260;

      const height =
        container.offsetHeight ||
        340;


      // Renderer
      const renderer =
        new THREE.WebGLRenderer({
          antialias: true,

          alpha: true,

          preserveDrawingBuffer: true,
        });


      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio || 1,
          2
        )
      );


      renderer.setSize(
        width,
        height
      );


      renderer.outputColorSpace =
        THREE.SRGBColorSpace;


      container.appendChild(
        renderer.domElement
      );


      rendererRef.current =
        renderer;


      // Scene
      const scene =
        new THREE.Scene();


      scene.background =
        new THREE.Color(
          0x1e2433
        );


      sceneRef.current =
        scene;


      // Camera
      const camera =
        new THREE.PerspectiveCamera(
          45,

          width / height,

          0.01,

          1000
        );


      camera.position.set(
        0,
        0,
        3
      );


      cameraRef.current =
        camera;


      // Lights
      const ambient =
        new THREE.AmbientLight(
          0xffffff,
          1.8
        );


      scene.add(
        ambient
      );


      const mainLight =
        new THREE.DirectionalLight(
          0xffffff,
          2.2
        );


      mainLight.position.set(
        4,
        7,
        6
      );


      scene.add(
        mainLight
      );


      const fillLight =
        new THREE.DirectionalLight(
          0xffffff,
          1.0
        );


      fillLight.position.set(
        -5,
        2,
        4
      );


      scene.add(
        fillLight
      );


      const hemi =
        new THREE.HemisphereLight(
          0xffffff,
          0x444444,
          1.0
        );


      scene.add(
        hemi
      );


      // Controls
      const controls =
        new OrbitControls(
          camera,
          renderer.domElement
        );


      controls.enableDamping =
        true;

      controls.dampingFactor =
        0.07;


      controlsRef.current =
        controls;


      // =================================================
      // LOAD NEW GLB
      // =================================================

      const loader =
        new GLTFLoader();


      loader.load(

        modelPath,


        (gltf) => {

          const model =
            gltf.scene;


          // IMPORTANT:
          // Your old code had:
          //
          // model.rotation.y = 5;
          //
          // That rotates the shirt almost
          // completely sideways.
          //
          // We keep the shirt facing front.

          model.rotation.set(
            0,
            0,
            0
          );


          model.updateMatrixWorld(
            true
          );


          // Debug meshes
          console.log(
            "========== NEW TSHIRT GLB =========="
          );


          model.traverse(
            (child) => {

              if (
                child.isMesh
              ) {

                console.log(
                  "MESH:",

                  child.name,

                  "| MATERIAL:",

                  Array.isArray(
                    child.material
                  )
                    ? child.material.map(
                        (m) =>
                          m?.name
                      )
                    : child.material
                        ?.name
                );


                // Ensure decals can render
                if (
                  child.material
                ) {

                  const materials =
                    Array.isArray(
                      child.material
                    )
                      ? child.material
                      : [
                          child.material,
                        ];


                  materials.forEach(
                    (material) => {

                      if (!material) {
                        return;
                      }


                      material.side =
                        THREE.FrontSide;

                      material.needsUpdate =
                        true;
                    }
                  );
                }
              }
            }
          );


          console.log(
            "===================================="
          );


          modelRef.current =
            model;


          scene.add(
            model
          );


          // Apply shirt color
          updateShirtColor(
            shirtColorRef.current
          );


          // Fit camera
          const box =
            new THREE.Box3()
              .setFromObject(
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


          const maxDimension =
            Math.max(
              size.x,
              size.y,
              size.z
            );


          const fov =
            camera.fov *
            (
              Math.PI / 180
            );


          const distance =
            (
              maxDimension /
              (
                2 *
                Math.tan(
                  fov / 2
                )
              )
            ) *
            1.8;


          camera.position.set(
            center.x,
            center.y,
            center.z + distance
          );


          camera.near =
            distance / 100;


          camera.far =
            distance * 100;


          camera.updateProjectionMatrix();


          controls.target.copy(
            center
          );


          controls.update();


          frameRef.current =
            {
              center:
                center.clone(),

              dist:
                distance,
            };


          setReady(true);


          // Build designs AFTER
          // model is fully loaded

          setTimeout(
            () => {

              rebuildAllDecals();

            },
            50
          );
        },


        undefined,


        (loadError) => {

          console.error(
            loadError
          );


          setError(
            "Failed to load 3D model. Check the model path."
          );
        }
      );


      // =================================================
      // ANIMATION
      // =================================================

      let animationFrame;


      const animate = () => {

        animationFrame =
          requestAnimationFrame(
            animate
          );


        controls.update();


        renderer.render(
          scene,
          camera
        );
      };


      animate();


      // =================================================
      // RESIZE
      // =================================================

      const onResize = () => {

        const newWidth =
          container.offsetWidth ||
          260;

        const newHeight =
          container.offsetHeight ||
          340;


        renderer.setSize(
          newWidth,
          newHeight
        );


        camera.aspect =
          newWidth /
          newHeight;


        camera.updateProjectionMatrix();
      };


      window.addEventListener(
        "resize",
        onResize
      );


      const resizeObserver =
        new ResizeObserver(
          onResize
        );


      resizeObserver.observe(
        container
      );


      // =================================================
      // CLEANUP
      // =================================================

      return () => {

        clearDecals();


        cancelAnimationFrame(
          animationFrame
        );


        resizeObserver.disconnect();


        window.removeEventListener(
          "resize",
          onResize
        );


        controls.dispose();


        if (
          modelRef.current
        ) {

          modelRef.current.traverse(
            (node) => {

              if (
                node.isMesh
              ) {

                node.geometry?.dispose();


                const materials =
                  Array.isArray(
                    node.material
                  )
                    ? node.material
                    : [
                        node.material,
                      ];


                materials.forEach(
                  (material) => {

                    if (
                      material?.map
                    ) {

                      material.map.dispose();
                    }


                    material?.dispose();
                  }
                );
              }
            }
          );


          scene.remove(
            modelRef.current
          );


          modelRef.current =
            null;
        }


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


        rendererRef.current =
          null;

        sceneRef.current =
          null;

        cameraRef.current =
          null;

        controlsRef.current =
          null;
      };

    },
    [
      modelPath,

      clearDecals,

      rebuildAllDecals,

      updateShirtColor,
    ]
    );


    // =====================================================
    // UPDATE SHIRT COLOR
    // =====================================================

    useEffect(() => {

      if (
        !modelRef.current
      ) {
        return;
      }


      updateShirtColor(
        shirtColor
      );

    },
    [
      shirtColor,
      updateShirtColor,
    ]
    );


    // =====================================================
    // UPDATE DESIGNS
    // =====================================================

    useEffect(() => {

      if (
        !ready ||
        !modelRef.current
      ) {
        return;
      }


      rebuildAllDecals();

    },
    [
      ready,

      zoneDesigns,

      zoneTexts,

      zones,

      rebuildAllDecals,
    ]
    );


    // =====================================================
    // ZOOM
    // =====================================================

    useEffect(() => {

      const camera =
        cameraRef.current;


      if (!camera) {
        return;
      }


      camera.zoom =
        zoom / 100;


      camera.updateProjectionMatrix();

    },
    [zoom]
    );


    // =====================================================
    // EXPOSE METHODS TO PARENT
    // =====================================================

    useImperativeHandle(
      ref,

      () => ({

        setView: (
          view
        ) => {

          const camera =
            cameraRef.current;

          const controls =
            controlsRef.current;


          if (
            !camera ||
            !controls
          ) {
            return;
          }


          const {
            center,
            dist,
          } =
            frameRef.current;


          const offsets = {

            front:
              new THREE.Vector3(
                0,
                0,
                dist
              ),

            back:
              new THREE.Vector3(
                0,
                0,
                -dist
              ),

            left:
              new THREE.Vector3(
                -dist,
                0,
                0
              ),

            right:
              new THREE.Vector3(
                dist,
                0,
                0
              ),
          };


          const offset =
            offsets[view] ||
            offsets.front;


          camera.position.copy(
            center
              .clone()
              .add(
                offset
              )
          );


          controls.target.copy(
            center
          );


          camera.lookAt(
            center
          );


          controls.update();
        },


        captureSnapshot: () => {

          const renderer =
            rendererRef.current;


          if (!renderer) {
            return null;
          }


          try {

            return renderer.domElement.toDataURL(
              "image/png"
            );

          } catch {

            return null;
          }
        },


        captureAllViews: () => {

          const camera =
            cameraRef.current;

          const controls =
            controlsRef.current;

          const renderer =
            rendererRef.current;

          const scene =
            sceneRef.current;


          if (
            !camera ||
            !controls ||
            !renderer ||
            !scene
          ) {
            return null;
          }


          const {
            center,
            dist,
          } =
            frameRef.current;


          const views = {

            front:
              new THREE.Vector3(
                0,
                0,
                dist
              ),

            back:
              new THREE.Vector3(
                0,
                0,
                -dist
              ),

            left:
              new THREE.Vector3(
                -dist,
                0,
                0
              ),

            right:
              new THREE.Vector3(
                dist,
                0,
                0
              ),
          };


          const originalPosition =
            camera.position.clone();


          const originalTarget =
            controls.target.clone();


          const screenshots =
            {};


          try {

            Object.entries(
              views
            ).forEach(
              (
                [
                  view,
                  offset,
                ]
              ) => {

                camera.position.copy(
                  center
                    .clone()
                    .add(
                      offset
                    )
                );


                controls.target.copy(
                  center
                );


                camera.lookAt(
                  center
                );


                controls.update();


                renderer.render(
                  scene,
                  camera
                );


                screenshots[
                  view
                ] =
                  renderer.domElement.toDataURL(
                    "image/png"
                  );
              }
            );

          } finally {

            camera.position.copy(
              originalPosition
            );


            controls.target.copy(
              originalTarget
            );


            camera.lookAt(
              originalTarget
            );


            controls.update();


            renderer.render(
              scene,
              camera
            );
          }


          return screenshots;
        },
      }),

      []
    );


    // =====================================================
    // UI
    // =====================================================

    return (

      <div className="tsc-preview-panel">

        <div
          className="tsc-preview-3d"
          ref={mountRef}
        >

          {!ready &&
            !error && (

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


        <div className="tsc-zoom-row">

          <button
            type="button"
            className="tsc-zoom-btn"

            onClick={() => {

              setZoom(
                (currentZoom) =>
                  Math.max(
                    50,

                    currentZoom -
                      25
                  )
              );

            }}
          >
            −
          </button>


          <span>
            {zoom}%
          </span>


          <button
            type="button"
            className="tsc-zoom-btn"

            onClick={() => {

              setZoom(
                (currentZoom) =>
                  Math.min(
                    200,

                    currentZoom +
                      25
                  )
              );

            }}
          >
            +
          </button>

        </div>

      </div>
    );
  }
);


TshirtPreview3D.displayName =
  "TshirtPreview3D";


export default TshirtPreview3D;


// =========================================================
// TEXT DRAWING HELPER
// =========================================================

function drawTextLayer(
  ctx,
  textLayer,
  offsetX = 0,
  offsetY = 0,
  width = 2048,
  height = 2048
) {

  if (
    !textLayer ||
    !textLayer.text
  ) {
    return;
  }


  const x =
    offsetX +
    (
      (
        textLayer.x ?? 0
      ) /
      100
    ) *
    width;


  const y =
    offsetY +
    (
      (
        textLayer.y ?? 0
      ) /
      100
    ) *
    height;


  const textWidth =
    (
      (
        textLayer.w ?? 50
      ) /
      100
    ) *
    width;


  const textHeight =
    (
      (
        textLayer.h ?? 10
      ) /
      100
    ) *
    height;


  const fontSize =
    Math.max(
      12,
      textHeight * 0.8
    );


  ctx.save();


  ctx.fillStyle =
    textLayer.color ||
    "#000000";


  ctx.font =
    `${textLayer.fontWeight || "normal"} ` +
    `${fontSize}px ` +
    `${textLayer.fontFamily || "Arial"}`;


  ctx.textAlign =
    textLayer.textAlign ||
    "center";


  ctx.textBaseline =
    "middle";


  const centerX =
    x +
    textWidth / 2;


  const centerY =
    y +
    textHeight / 2;


  ctx.translate(
    centerX,
    centerY
  );


  if (
    textLayer.rotation
  ) {

    ctx.rotate(
      (
        textLayer.rotation *
        Math.PI
      ) /
      180
    );
  }


  if (
    textLayer.strokeColor
  ) {

    ctx.strokeStyle =
      textLayer.strokeColor;


    ctx.lineWidth =
      textLayer.strokeWidth ||
      1;


    ctx.strokeText(
      textLayer.text,
      0,
      0
    );
  }


  ctx.fillText(
    textLayer.text,
    0,
    0
  );


  ctx.restore();
}