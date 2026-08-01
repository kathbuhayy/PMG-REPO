/**
 * AIBuilderPanel — the top-level AI builder section embedded in product detail.
 *
 * Props:
 *   product      {object}  – current product from Products-data
 *   productImage {string}  – current selected product gallery image
 *   onDesignReady {fn}     – called with final designMeta when user clicks "Use this design"
 *   onClear       {fn}     – called when user removes an active design
 *   activeDesign  {object|null} – currently applied designMeta (or null)
 */
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCloudUploadAlt,
  FaMagic,
  FaCheckCircle,
  FaCube,
} from "react-icons/fa";
import { buildApiUrl } from "../../config/api";
import TshirtPreview3D from "../TshirtCustomizer/TshirtPreview3D";
import { saveGuestDesign, removeGuestDesign } from "../../utils/guestDesigns";
import "./AIBuilder.css";

export default function AIBuilderPanel({
  product,
  productImage,
  onDesignReady,
  onClear,
  activeDesign,
  ai_prompt_rules,
}) {
  // ── mode: "generate" | "upload" (upload tab re-enabled)
  const [mode, setMode] = useState("generate");

  // ── generate state ──────────────────────────────────────────────
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [cooldownMsg, setCooldownMsg] = useState("");

  // ── upload state ────────────────────────────────────────────────
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadedMeta, setUploadedMeta] = useState(null); // temporarily holds uploaded image
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadGenerating, setUploadGenerating] = useState(false);
  const fileInputRef = useRef(null);

  // ── result / editor state ───────────────────────────────────────
  // resultMeta: { imageUrl, url, width, height, prompt, stored, path } | null
  const [resultMeta, setResultMeta] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const navigate = useNavigate();

  // ── helper to get current user id ──────────────────────────────
  const getUserId = () => {
    try {
      const u = localStorage.getItem("user");
      if (u) return JSON.parse(u).id;
    } catch {
      /* ignore */
    }
    return parseInt(localStorage.getItem("userId"), 10) || null;
  };

  // ── guest generation counter (limit to 3) ──────────────────────
  const GUEST_GEN_KEY = "ai_guest_generations";
  const getGuestGenCount = () => {
    try {
      return parseInt(localStorage.getItem(GUEST_GEN_KEY) || "0", 10) || 0;
    } catch {
      return 0;
    }
  };
  const incrementGuestGenCount = () => {
    try {
      const v = getGuestGenCount() + 1;
      localStorage.setItem(GUEST_GEN_KEY, String(v));
      return v;
    } catch {
      return getGuestGenCount();
    }
  };
  const GUEST_LIMIT = 3;
  const guestCount = getGuestGenCount();
  const guestRemaining = Math.max(0, GUEST_LIMIT - guestCount);

  // ── helper to remove design rules from display text ─────────────
  const getDisplayPrompt = (text) => {
    if (!text) return "";
    // Remove [Design Rules] section and everything after it
    return text.replace(/\n\n\[Design Rules\]:[\s\S]*$/i, "").trim();
  };

  // ── Generate ────────────────────────────────────────────────────
  const handleGenerate = async () => {
    const userId = getUserId();
    const isGuest = !userId;
    if (isGuest) {
      const count = getGuestGenCount();
      if (count >= 3) {
        setGenError(
          "Guests are limited to 3 AI generations. Please sign up to continue.",
        );
        return;
      }
    }
    if (!prompt.trim()) {
      setGenError("Please enter a prompt first.");
      return;
    }

    setGenerating(true);
    setGenError("");
    setCooldownMsg("");
    setResultMeta(null);
    setShowEditor(false);

    try {
      // Purely prompt for the graphic design without item context to avoid confusing the AI
      const displayPrompt = `${prompt.trim()}, flat graphic design, transparent background, high quality`;

      // Full prompt with rules for API (hidden from frontend)
      let fullPrompt = displayPrompt;
      if (ai_prompt_rules && ai_prompt_rules.trim()) {
        fullPrompt += `\n\n[Design Rules]: ${ai_prompt_rules}`;
      }

      const res = await fetch(buildApiUrl("/api/builder/generate-image"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { "X-User-Id": String(userId) } : {}),
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          imageSize: "square_hd",
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setCooldownMsg(data.message || "Please wait before generating again.");
        return;
      }
      if (!res.ok) throw new Error(data.message || "Generation failed");

      // if guest, increment local guest counter (successful generation)
      if (isGuest) {
        incrementGuestGenCount();
        saveGuestDesign({
          id: `gen-${Date.now()}`,
          imageUrl: data.imageUrl || data.url,
          prompt: prompt.trim(),
          productLabel: product?.title || "Product",
          generatedAt: new Date().toISOString(),
        });
      }

      // Store display prompt (without rules) for UI and original user input for intent
      setResultMeta({
        ...data,
        prompt: displayPrompt,
        userPrompt: prompt.trim(),
        source: "generated",
      });
      setShowEditor(true);
    } catch (e) {
      setGenError(e.message || "Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Upload ──────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const userId = getUserId();
    if (!userId) {
      setUploadError("You must be logged in to upload assets.");
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setUploadError("Only JPEG, PNG, WebP, and GIF images are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File is too large. Maximum size is 10 MB.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setResultMeta(null);
    setShowEditor(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // User-visible description (without design rules)
      const displayDescription = uploadDescription.trim();

      // Full description with rules for backend (hidden from frontend)
      let fullDescription = displayDescription;
      if (ai_prompt_rules && ai_prompt_rules.trim()) {
        fullDescription += fullDescription
          ? `\n\n[Design Rules]: ${ai_prompt_rules}`
          : `[Design Rules]: ${ai_prompt_rules}`;
      }

      if (fullDescription) {
        formData.append("description", fullDescription);
      }

      const res = await fetch(buildApiUrl("/api/builder/upload"), {
        method: "POST",
        headers: { "X-User-Id": String(userId) },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      // Store uploaded image temporarily with user-visible description (no rules)
      setUploadedMeta({
        ...data,
        description: displayDescription || null,
      });
      setUploadError("");
    } catch (e) {
      setUploadError(e.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      // reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Generate from uploaded image ───────────────────────────────
  const handleGenerateFromUpload = async () => {
    if (!uploadedMeta) return;

    const userId = getUserId();
    if (!userId) {
      setUploadError("You must be logged in.");
      return;
    }

    setUploadGenerating(true);
    setUploadError("");

    try {
      // User-visible description (without design rules)
      const displayDescription =
        uploadedMeta.description || "Refine and enhance this design.";

      // Full description with rules for API (hidden from frontend)
      let fullDescription = displayDescription;
      if (ai_prompt_rules && ai_prompt_rules.trim()) {
        fullDescription += `\n\n[Design Rules]: ${ai_prompt_rules}`;
      }

      const res = await fetch(buildApiUrl("/api/builder/generate-image"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": String(userId),
        },
        body: JSON.stringify({
          prompt: fullDescription,
          imageSize: "square_hd",
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setUploadError(data.message || "Please wait before generating again.");
        return;
      }
      if (!res.ok) throw new Error(data.message || "Generation failed");

      // Store display description (without rules) for UI
      setResultMeta({
        ...data,
        prompt: displayDescription,
        userPrompt: displayDescription,
        source: "generated",
      });
      setShowEditor(true);
      setUploadedMeta(null);
    } catch (e) {
      setUploadError(e.message || "Something went wrong. Please try again.");
    } finally {
      setUploadGenerating(false);
    }
  };

  // ── Discard uploaded image ────────────────────────────────────
  const handleDiscardUpload = () => {
    setUploadedMeta(null);
    setUploadDescription("");
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Use uploaded image directly (no generation) ─────────────────
  const handleUseUploaded = () => {
    if (!uploadedMeta) return;

    setResultMeta({
      ...uploadedMeta,
      prompt: uploadedMeta.description || null,
      userPrompt: uploadedMeta.description || uploadedMeta.prompt || null,
      source: "upload",
    });
    setShowEditor(true);
    setUploadedMeta(null);
  };

  // ── Use this design ──────────────────────────────────────────
  const handleUseDesign = async () => {
    if (!resultMeta) return;
    setGenerating(true);

    let imageUrl = resultMeta.imageUrl || resultMeta.url;
    let path = resultMeta.path || null;
    const userId = getUserId();

    // Persist remote AI-generated image permanently if logged in
    if (
      userId &&
      (imageUrl.includes("pollinations.ai") ||
        imageUrl.includes("fal.run") ||
        imageUrl.includes("fal.media"))
    ) {
      try {
        const res = await fetch(buildApiUrl("/api/builder/upload-url"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": String(userId),
          },
          body: JSON.stringify({ imageUrl }),
        });
        const data = await res.json();
        if (res.ok && data.url) {
          imageUrl = data.url;
          path = data.path;
        }
      } catch (e) {
        console.warn("Failed to persist design to Supabase", e);
      }
    }

    const designMeta = {
      generatedImageUrl: imageUrl,
      prompt: resultMeta.prompt || null,
      source: resultMeta.source,
      storagePath: path,
      generatedAt: new Date().toISOString(),
    };

    onDesignReady(designMeta);
    // Close editor but stay in AI Builder tab to show applied design
    setShowEditor(false);
    setResultMeta(null);
    setGenerating(false);
  };

  // ── Discard result ──────────────────────────────────────────────
  const handleDiscard = () => {
    if (resultMeta && !getUserId()) {
      removeGuestDesign(resultMeta.imageUrl || resultMeta.url);
    }

    setResultMeta(null);
    setShowEditor(false);
    setUploadDescription("");
  };

  return (
    <div className="aib-root">
      {/* Header */}
      <div className="aib-header">
        <FaMagic style={{ color: "#455073", fontSize: 18 }} />
        <h3>AI Design Builder</h3>
        <span className="aib-badge">Beta</span>
      </div>

      {/* Active design badge */}
      {activeDesign && !showEditor && (
        <div className="aib-design-badge">
          <img src={activeDesign.generatedImageUrl} alt="active design" />
          <span>Design attached to this item</span>
          <button
            className="aib-design-badge-clear"
            onClick={onClear}
            type="button"
          >
            Remove
          </button>
        </div>
      )}

      {/* Mode tabs */}
      {!showEditor && (
        <div className="aib-mode-tabs">
          <button
            type="button"
            className={`aib-mode-tab ${mode === "generate" ? "active" : ""}`}
            onClick={() => setMode("generate")}
          >
            Generate 3D Model
          </button>
          <button
            type="button"
            className={`aib-mode-tab ${mode === "upload" ? "active" : ""}`}
            onClick={() => setMode("upload")}
          >
            Upload Reference Image
          </button>
        </div>
      )}

      {/* ── Generate mode ── */}
      {!showEditor && mode === "generate" && (
        <>
          <div className="aib-field">
            <label htmlFor="aib-prompt">Describe your 3D model</label>
            <textarea
              id="aib-prompt"
              className="aib-textarea"
              rows={3}
              maxLength={1000}
              placeholder={`e.g. "geometric cube with smooth edges and gold accents" — ${product?.title ? `will be generated as a 3D model for ${product.title}` : "product name added automatically"}`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {/* Guest remaining counter / CTA */}
          {!getUserId() && (
            <div style={{ fontSize: 13, color: "#475569", marginTop: 8 }}>
              {guestRemaining > 0 ? (
                <>
                  You have <strong>{guestRemaining}</strong> free AI generation
                  {guestRemaining > 1 ? "s" : ""} remaining.
                  <button
                    type="button"
                    onClick={() => navigate("/user-register")}
                    style={{
                      marginLeft: 8,
                      border: "none",
                      background: "transparent",
                      color: "#2b6cb0",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Register
                  </button>{" "}
                  to get more.
                </>
              ) : (
                <>
                  You have used all free AI generations.
                  <button
                    type="button"
                    onClick={() => navigate("/user-register")}
                    style={{
                      marginLeft: 8,
                      border: "none",
                      background: "transparent",
                      color: "#2b6cb0",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Register
                  </button>{" "}
                  to continue generating.
                </>
              )}
            </div>
          )}

          <div className="aib-row">
            <button
              type="button"
              className="aib-btn-generate"
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
            >
              {generating ? "Generating 3D Model…" : "Generate Model"}
            </button>
          </div>

          {generating && (
            <div className="aib-status">
              <span className="aib-spinner" />
              Generating your 3D model with AI, please wait…
            </div>
          )}
          {cooldownMsg && <div className="aib-cooldown">{cooldownMsg}</div>}
          {genError && <div className="aib-error">{genError}</div>}
        </>
      )}

      {/* ── Upload mode ── */}
      {!showEditor && mode === "upload" && (
        <>
          <div className="aib-field">
            <label htmlFor="aib-upload-desc">
              Describe how to generate from image (optional)
            </label>
            <textarea
              id="aib-upload-desc"
              className="aib-textarea"
              rows={3}
              maxLength={1000}
              placeholder="e.g. 'Convert this to a 3D model with smooth surfaces and add metallic finish' — design rules will be applied automatically"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
            />
          </div>

          <div
            className="aib-upload-zone"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) =>
              e.key === "Enter" && fileInputRef.current?.click()
            }
          >
            <div className="aib-upload-icon">
              <FaCloudUploadAlt />
            </div>
            <p>Click to upload a reference image</p>
            <p>JPEG, PNG, WebP, GIF — up to 10 MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {uploading && (
            <div className="aib-status">
              <span className="aib-spinner" />
              Uploading…
            </div>
          )}
          {uploadError && <div className="aib-error">{uploadError}</div>}

          {/* Show uploaded image with Generate button */}
          {uploadedMeta && !uploading && (
            <>
              <div className="aib-upload-preview">
                <img src={uploadedMeta.url} alt="uploaded design" />
                <div className="aib-preview-label">Uploaded Image</div>
              </div>

              {uploadedMeta.description && (
                <div className="aib-upload-description">
                  <div className="aib-desc-label">Design Intent:</div>
                  <div className="aib-desc-text">
                    {getDisplayPrompt(uploadedMeta.description)}
                  </div>
                </div>
              )}

              <div className="aib-upload-actions">
                <button
                  type="button"
                  className="aib-btn-use"
                  onClick={handleUseUploaded}
                  disabled={uploadGenerating}
                >
                  <FaCheckCircle style={{ marginRight: 6 }} />
                  Use This Image
                </button>
                <button
                  type="button"
                  className="aib-btn-generate"
                  onClick={handleGenerateFromUpload}
                  disabled={uploadGenerating}
                >
                  {uploadGenerating ? "Generating…" : "Generate AI Image"}
                </button>
                <button
                  type="button"
                  className="aib-btn-discard"
                  onClick={handleDiscardUpload}
                  disabled={uploadGenerating}
                >
                  Upload Different
                </button>
              </div>

              {uploadGenerating && (
                <div className="aib-status">
                  <span className="aib-spinner" />
                  Generating AI image from your reference…
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Result + 3D Preview ── */}
      {showEditor && resultMeta && (
        <>
          {resultMeta.prompt && (
            <div className="aib-editor-info">
              <div className="aib-info-label">Model Description:</div>
              <div className="aib-info-text">
                {getDisplayPrompt(resultMeta.userPrompt || resultMeta.prompt)}
              </div>
            </div>
          )}

          {/* Show design applied to the product 3D model */}
          <div style={{ minHeight: 300, marginBottom: 16 }}>
            <TshirtPreview3D
              modelPath="/models/tshirt.glb"
              zoneDesigns={{
                front: { imageUrl: resultMeta.imageUrl || resultMeta.url },
              }}
            />
          </div>

          <div className="aib-result-actions">
            <button
              type="button"
              className="aib-btn-use"
              onClick={handleUseDesign}
            >
              <FaCheckCircle style={{ marginRight: 6 }} />
              Use this design
            </button>
            <button
              type="button"
              className="aib-btn-3d"
              onClick={() => setShow3D(true)}
            >
              <FaCube style={{ marginRight: 6 }} />
              View 3D
            </button>
            <button
              type="button"
              className="aib-btn-discard"
              onClick={handleDiscard}
            >
              Discard
            </button>
          </div>
        </>
      )}

      {/* 3D Preview modal */}
      {show3D && resultMeta && (
        <div
          className="aib-3d-modal"
          role="dialog"
          onClick={() => setShow3D(false)}
        >
          <div
            className="aib-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="aib-modal-close"
              onClick={() => setShow3D(false)}
            >
              Close
            </button>
            <div className="aib-3d-wrapper">
              <TshirtPreview3D
                modelPath="/models/tshirt.glb"
                zoneDesigns={{
                  front: { imageUrl: resultMeta.imageUrl || resultMeta.url },
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
