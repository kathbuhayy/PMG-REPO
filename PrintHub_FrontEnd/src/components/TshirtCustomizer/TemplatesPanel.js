// PrintHub_FrontEnd/src/components/TshirtCustomizer/TemplatesPanel.js
/**
 * TemplatesPanel
 * Browse reusable starting-point designs for the current product category,
 * apply one into the active customizer state, and (staff/admin only) save
 * the current design as a new template.
 *
 * Props:
 *   category        {string}  - Product.category, used to filter templates
 *   isStaffOrAdmin  {boolean} - shows "Save current design as template" when true
 *   onApply         {fn(template)} - called when the customer picks a template
 *   getCurrentDesign {fn() => { zoneLayers, baseColor }} - reads live state
 *     to save, only called when "Save as template" is clicked
 */
import React, { useEffect, useState, useCallback } from "react";
import { buildApiUrl } from "../../config/api";
import { renderZoneLayersToDataURL } from "../../utils/fabricZoneRenderer";
import "./TshirtCustomizer.css";

function getUserId() {
  try {
    const u = localStorage.getItem("user");
    if (u) return JSON.parse(u).id;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Renders the first zone that actually has content into a small PNG and
 * uploads it via the existing asset-upload endpoint, returning a URL to
 * store as the template's thumbnailUrl. Non-fatal on any failure - a
 * template with no thumbnail just falls back to the "Aa" placeholder,
 * it's never a reason to block saving the template itself.
 */
async function buildAndUploadThumbnail(zoneLayers, userId) {
  const zoneWithContent = Object.entries(zoneLayers || {}).find(
    ([, layers]) => layers && layers.length > 0,
  );
  if (!zoneWithContent) return null;

  const [, layers] = zoneWithContent;
  try {
    const dataUrl = await renderZoneLayersToDataURL(layers, 300);
    const blob = await (await fetch(dataUrl)).blob();
    const formData = new FormData();
    formData.append("file", blob, "thumbnail.png");

    const res = await fetch(buildApiUrl("/api/builder/upload"), {
      method: "POST",
      headers: userId ? { "X-User-Id": String(userId) } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) return null;
    return data.url || null;
  } catch {
    return null;
  }
}

export default function TemplatesPanel({
  category,
  isStaffOrAdmin = false,
  onApply,
  getCurrentDesign,
}) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = buildApiUrl(
        `/api/templates${category ? `?category=${encodeURIComponent(category)}` : ""}`,
      );
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load templates");
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleSaveAsTemplate = async () => {
    if (!saveName.trim()) {
      setSaveError("Give the template a name first.");
      return;
    }
    const current = getCurrentDesign?.();
    if (!current || !current.zoneLayers) {
      setSaveError("Nothing to save yet.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const userId = getUserId();
      const thumbnailUrl = await buildAndUploadThumbnail(current.zoneLayers, userId);

      const res = await fetch(buildApiUrl("/api/templates"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { "X-User-Id": String(userId) } : {}),
        },
        body: JSON.stringify({
          name: saveName.trim(),
          category,
          zoneLayers: current.zoneLayers,
          baseColor: current.baseColor,
          thumbnailUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save template");
      setSaveName("");
      loadTemplates();
    } catch (err) {
      setSaveError(err.message || "Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tsc-sidebar-section">
      <div className="tsc-sidebar-header-row">
        <h4>Templates</h4>
      </div>

      {isStaffOrAdmin && (
        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #e5e7eb" }}>
          <label className="tsc-spec-label">Save current design as template</label>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <input
              className="tsc-text-input"
              placeholder="Template name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              maxLength={60}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="tsc-gallery-upload-btn"
              onClick={handleSaveAsTemplate}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          {saveError && (
            <p className="tsc-error" style={{ marginTop: 6 }}>
              {saveError}
            </p>
          )}
        </div>
      )}

      {loading && <span className="tsc-gallery-empty">Loading templates…</span>}
      {!loading && error && <p className="tsc-error">{error}</p>}
      {!loading && !error && templates.length === 0 && (
        <span className="tsc-gallery-empty" style={{ display: "block" }}>
          No templates yet for this product.
        </span>
      )}

      {!loading && templates.length > 0 && (
        <div className="mv-grid">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              className="mv-thumb"
              onClick={() => onApply?.(t)}
              title={`Apply "${t.name}"`}
            >
              <div className="mv-thumb-img">
                {t.thumbnailUrl ? (
                  <img src={t.thumbnailUrl} alt={t.name} />
                ) : (
                  <span className="mv-thumb-text-preview">Aa</span>
                )}
              </div>
              <span className="mv-thumb-label">{t.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}