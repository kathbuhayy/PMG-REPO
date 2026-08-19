import React, { useState, useRef } from "react";
import MockupAreaCalibrator from "./MockupAreaCalibrator";
import { adminFetch } from "../../utils/adminFetch";
import { buildApiUrl } from "../../config/api";
import "./MockupCalibration.css";

/**
 * AdminMockupViews
 * Manages the mockupViews array for a product: upload a photo (or paste
 * a URL), label it, pick which design side it should show (front/back),
 * then drag/resize a box on the photo to mark the print area.
 *
 * Props:
 *   views    {array}  — current product.mockupViews
 *   onChange {fn}     — (views) => void, caller persists via PUT /api/products/:id
 */
function AdminMockupViews({ views = [], onChange }) {
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newSide, setNewSide] = useState("front");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await adminFetch(buildApiUrl("/api/products/upload"), {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      setNewUrl(data.url);
    } catch (err) {
      alert(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addView = () => {
    if (!newLabel || !newUrl) return;
    const view = {
      id: `v${Date.now()}`,
      label: newLabel,
      imageUrl: newUrl,
      side: newSide,
      printArea: { x: 30, y: 30, w: 40, h: 35 },
    };
    onChange([...views, view]);
    setNewLabel("");
    setNewUrl("");
  };

  const updateArea = (viewId, area) => {
    onChange(views.map((v) => (v.id === viewId ? { ...v, printArea: area } : v)));
  };

  const removeView = (viewId) => {
    onChange(views.filter((v) => v.id !== viewId));
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="dashform-group" style={{ margin: 0 }}>
          <label>Label</label>
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Folded"
          />
        </div>

        <div className="dashform-group" style={{ margin: 0, minWidth: "220px" }}>
          <label>Photo</label>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Upload or paste URL"
              style={{ flex: 1 }}
            />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: "none" }}
              id="mockup-file-input"
            />
            <button
              type="button"
              className="row-btn"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>

        <div className="dashform-group" style={{ margin: 0 }}>
          <label>Shows design for</label>
          <select value={newSide} onChange={(e) => setNewSide(e.target.value)}>
            <option value="front">Front</option>
            <option value="back">Back</option>
          </select>
        </div>

        <button type="button" className="row-btn" onClick={addView} disabled={!newLabel || !newUrl}>
          + Add View
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
        {views.map((view) => (
          <div key={view.id} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <strong style={{ fontSize: "13px" }}>
                {view.label} <span style={{ color: "#94a3b8", fontWeight: 400 }}>({view.side})</span>
              </strong>
              <button
                type="button"
                onClick={() => removeView(view.id)}
                style={{ border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: "12px" }}
              >
                Remove
              </button>
            </div>
            <MockupAreaCalibrator
              imageUrl={view.imageUrl}
              area={view.printArea}
              onChange={(area) => updateArea(view.id, area)}
            />
            <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>
              Drag the box to position it, drag the corner to resize.
            </p>
          </div>
        ))}
      </div>

      {views.length === 0 && (
        <p style={{ color: "#94a3b8", fontSize: "13px" }}>
          No mockup views yet. Upload a photo above to get started.
        </p>
      )}
    </div>
  );
}

export default AdminMockupViews;