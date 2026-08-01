import React, { useState } from "react";
import { FaMagic, FaExclamationTriangle } from "react-icons/fa";

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
}) {
  const [prompt, setPrompt] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");

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
    const item = await handleGenerate(prompt, activeZone);

    if (item && onGenerated) {
      onGenerated(item);
      setLastPrompt(prompt);
      setPrompt("");
    }
  };

  return (
    <div className="tsc-sidebar-section ai-gen-panel">
      <div className="tsc-sidebar-header-row">
        <h4 style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <FaMagic style={{ color: "#455073" }} />
          AI Generate
        </h4>
        <span className="aib-badge">Beta</span>
      </div>

      <div className="ai-gen-field">
        <label htmlFor="ai-prompt-input" className="ai-gen-label">
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
          onChange={(e) => setPrompt(e.target.value)}
          disabled={generating}
        />
      </div>

      {lastPrompt && (
        <div className="ai-last-prompt">
          <span className="ai-last-prompt-label">Previous Prompt: </span>
          <span className="ai-last-prompt-text">"{lastPrompt}"</span>
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
        disabled={generating || !prompt.trim()}
      >
        {generating ? (
          <>
            <span
              className="aib-spinner"
              style={{ marginRight: "6px" }}
            />
            Generating...
          </>
        ) : (
          "Generate Design"
        )}
      </button>

      {genError && <div className="ai-gen-error">{genError}</div>}
    </div>
  );
}
