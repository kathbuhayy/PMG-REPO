import React, { useState } from "react";
import { FaMagic, FaExclamationTriangle, FaCube } from "react-icons/fa";
import AIBuilder3DPreview from "./AIBuilder3DPreview";
import "./AIBuilder.css";

/**
 * AIGeneratePanel renders the AI design generator section
 * inside customizer sidebars. It allows users to prompt
 * FLUX.1 to generate images.
 */
export default function AIGeneratePanel({
  activeZone,
  productLabel,
  onGenerated,
  handleGenerate,
  generating,
  genError,
  setGenError,
  prompt: propPrompt,
  onPromptChange,
  lastPrompt: propLastPrompt,
  onLastPromptChange,
  handleGenerate3D,
  generating3D,
  gen3DError,
  setGen3DError,
  model3D,
  setModel3D,
  onUseModel3D,
}) {
  const [localPrompt, setLocalPrompt] = useState("");
  const [localLastPrompt, setLocalLastPrompt] = useState("");
  const [show3DPreview, setShow3DPreview] = useState(false);

  const prompt =
    propPrompt !== undefined ? propPrompt : localPrompt;

  const setPrompt =
    onPromptChange || setLocalPrompt;

  const lastPrompt =
    propLastPrompt !== undefined
      ? propLastPrompt
      : localLastPrompt;

  const setLastPrompt =
    onLastPromptChange || setLocalLastPrompt;

  /**
   * Triggers the AI generation handler and appends the resulting image
   * to the customizer's gallery and active canvas zone.
   */
  const onSubmit = async () => {
    if (!prompt.trim()) {
      setGenError("Please enter a description.");
      return;
    }

    setGenError("");

    // Pass the raw prompt through — style/background guidance is now
    // handled once, server-side, to avoid stacking instructions the
    // model's safety system can mistake for a prompt injection attempt.
    const item = await handleGenerate(
      prompt.trim(),
      activeZone
    );

    if (item && onGenerated) {
      onGenerated(item);
      setLastPrompt(prompt);
      setPrompt("");
    }
  };

  /**
   * Triggers actual 3D model generation via Tripo3D (separate from the
   * flat 2D image generation above). Result is a .glb model shown in
   * an inline 3D viewer, not added to the flat design canvas.
   */
  const onSubmit3D = async () => {
    if (!prompt.trim()) {
      setGen3DError("Please enter a description.");
      return;
    }

    setGen3DError("");
    const result = await handleGenerate3D(prompt.trim());
    if (result) {
      setShow3DPreview(true);
    }
  };

  return (
    <div className="tsc-sidebar-section ai-gen-panel">
      <div className="tsc-sidebar-header-row">
        <h4
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <FaMagic style={{ color: "#455073" }} />
          AI Generate
        </h4>
      </div>

      <div className="ai-gen-field">
        <label
          htmlFor="ai-prompt-input"
          className="ai-gen-label"
        >
          Describe the design you want:
        </label>

        <textarea
          id="ai-prompt-input"
          className="ai-gen-textarea"
          rows={3}
          maxLength={500}
          placeholder={
            "e.g. roaring lion with geometric shapes, " +
            "or a minimalist palm tree"
          }
          value={prompt}
          onChange={(e) =>
            setPrompt(e.target.value)
          }
          disabled={generating}
        />
      </div>

      {lastPrompt && (
        <div className="ai-last-prompt">
          <span className="ai-last-prompt-label">
            Previous Prompt:{" "}
          </span>

          <span className="ai-last-prompt-text">
            "{lastPrompt}"
          </span>
        </div>
      )}

      <div className="ai-gen-disclaimer">
        <span className="ai-disclaimer-title">
          <FaExclamationTriangle /> Copyright Disclaimer
        </span>

        <p className="ai-disclaimer-text">
          Avoid prompting for copyrighted characters, brand logos,
          or trademarked names (e.g Mickey Mouse)
        </p>
      </div>

      <button
        type="button"
        className="ai-gen-btn"
        onClick={onSubmit}
        disabled={
          generating || !prompt.trim()
        }
      >
        {generating ? (
          <>
            <span
              className="aib-spinner"
              style={{
                marginRight: "6px",
              }}
            />

            Generating...
          </>
        ) : (
          "Generate Design"
        )}
      </button>

      {genError && (
        <div className="ai-gen-error">
          {genError}
        </div>
      )}

      {handleGenerate3D && (
        <>
          <button
            type="button"
            className="ai-gen-btn"
            style={{ marginTop: "8px", background: "#2d3250" }}
            onClick={onSubmit3D}
            disabled={generating3D || !prompt.trim()}
          >
            {generating3D ? (
              <>
                <span
                  className="aib-spinner"
                  style={{ marginRight: "6px" }}
                />
                Generating 3D model…
              </>
            ) : (
              <>
                <FaCube style={{ marginRight: 6 }} />
                Generate 3D Model
              </>
            )}
          </button>

          {gen3DError && <div className="ai-gen-error">{gen3DError}</div>}
        </>
      )}

      {show3DPreview && model3D?.glbUrl && (
        <div
          className="aib-3d-modal"
          role="dialog"
          onClick={() => setShow3DPreview(false)}
        >
          <div
            className="aib-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="aib-modal-close"
              onClick={() => setShow3DPreview(false)}
            >
              Close
            </button>
            <div className="aib-3d-wrapper" style={{ height: 400 }}>
              <AIBuilder3DPreview
                designImage={model3D.glbUrl}
                prompt={model3D.prompt}
              />
            </div>

            {onUseModel3D ? (
              <>
                <button
                  type="button"
                  className="ai-gen-btn"
                  style={{ marginTop: "12px" }}
                  onClick={() => {
                    onUseModel3D(model3D);
                    setShow3DPreview(false);
                  }}
                >
                  <FaCube style={{ marginRight: 6 }} />
                  Use as Product Model
                </button>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#888",
                    textAlign: "center",
                    marginTop: "8px",
                  }}
                >
                  This model is saved permanently. Click above to preview it
                  on the product itself.
                </p>
              </>
            ) : (
              <p
                style={{
                  fontSize: "12px",
                  color: "#888",
                  textAlign: "center",
                  marginTop: "8px",
                }}
              >
                This model is saved permanently, though this product type
                doesn't have a 3D view to apply it to.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}