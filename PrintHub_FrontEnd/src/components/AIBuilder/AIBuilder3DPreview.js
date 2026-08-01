import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import "./AIBuilder.css";

export default function AIBuilder3DPreview({ designImage, prompt }) {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load and display 3D GLB model
  useEffect(() => {
    if (!designImage || !mountRef.current) return undefined;

    setError("");

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f2f5);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 3);

    const ambient = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 7.5);
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 4;

    // Load GLB model
    const loader = new GLTFLoader();
    let model = null;

    loader.load(
      designImage,
      (gltf) => {
        model = gltf.scene;
        scene.add(model);

        // Auto-fit camera to model
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = maxDim / 2 / Math.tan(fov / 2);
        cameraZ *= 1.5; // Add padding
        camera.position.z = cameraZ;
        camera.lookAt(model.position);
        controls.target.copy(box.getCenter(new THREE.Vector3()));
        controls.update();

        setLoading(false);
      },
      undefined,
      (err) => {
        console.warn("GLB load failed:", err);
        setError("Failed to load 3D model");
        setLoading(false);
      },
    );

    let rafId = null;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    // cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafId) cancelAnimationFrame(rafId);
      controls.dispose();
      if (model) {
        model.traverse((node) => {
          if (node.geometry) node.geometry.dispose();
          if (node.material) {
            if (Array.isArray(node.material)) {
              node.material.forEach((m) => m.dispose());
            } else {
              node.material.dispose();
            }
          }
        });
      }
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [designImage]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            zIndex: 10,
            background: "rgba(255, 255, 255, 0.9)",
            padding: "20px 30px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              margin: "0 auto 12px",
              border: "3px solid #ddd",
              borderTop: "3px solid #455073",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <div style={{ fontSize: "13px", color: "#455073" }}>
            Loading 3D preview…
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            zIndex: 10,
            background: "rgba(255, 255, 255, 0.95)",
            padding: "20px 30px",
            borderRadius: "8px",
            color: "#c0392b",
            fontSize: "13px",
            maxWidth: "300px",
          }}
        >
          {error}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div
        className="aib-3d-canvas"
        ref={mountRef}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
