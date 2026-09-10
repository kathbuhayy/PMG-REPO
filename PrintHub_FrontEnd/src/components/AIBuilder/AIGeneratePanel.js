import React, { useState } from "react";
import { FaMagic, FaExclamationTriangle } from "react-icons/fa";
import "./AIBuilder.css";

/**
 * AIGeneratePanel renders the AI design generator section
 * inside customizer sidebars.
 *
 * AI-generated designs are requested as isolated artwork
 * with a transparent background, suitable for printing.
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
}) {
  const [localPrompt, setLocalPrompt] = useState("");
  const [localLastPrompt, setLocalLastPrompt] = useState("");

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
   * Generate an AI design.
   *
   * The user's prompt is preserved, while additional instructions
   * tell the AI to create isolated artwork suitable for printing.
   *
   * IMPORTANT:
   * These instructions alone do NOT technically create transparency.
   * The backend must remove the generated background and return
   * a PNG with an alpha channel.
   */
  const onSubmit = async () => {
    if (!prompt.trim()) {
      setGenError("Please enter a description.");
      return;
    }

    setGenError("");

    const transparentPrompt = `${prompt.trim()}

IMPORTANT:
Create ONLY the requested main design or subject.
The design must be an isolated printable artwork.
Use a completely transparent background.
Do NOT include scenery, environment, room, landscape, sky, floor,
backdrop, surrounding objects, or decorative background elements.
Do NOT add a white, black, colored, gradient, or textured background.
Do NOT place the design inside a rectangle, square, frame, poster,
mockup, canvas, or scene.
Keep the area surrounding the main subject completely empty.
Create clean edges around the artwork.
Center the main design.
Make the artwork suitable for printing on a T-shirt.`;

    try {
      const item = await handleGenerate(
        transparentPrompt,
        activeZone
      );

      if (item && onGenerated) {
        onGenerated(item);

        // Keep the original user prompt as the previous prompt.
        setLastPrompt(prompt);

        // Clear the input after successful generation.
        setPrompt("");
      }
    } catch (error) {
      console.error("[AI Generate] Generation failed:", error);

      setGenError(
        error?.message ||
          "Failed to generate the AI design. Please try again."
      );
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
          onChange={(e) => setPrompt(e.target.value)}
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
        disabled={generating || !prompt.trim()}
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
          <>
            <FaMagic style={{ marginRight: "6px" }} />
            Generate Design
          </>
        )}
      </button>

      {genError && (
        <div className="ai-gen-error">
          {genError}
        </div>
      )}
    </div>
  );
}