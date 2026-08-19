import React from "react";
import "./PrePress.css";

/**
 * ResolutionWarning
 * Small inline badge showing the result of assessImageResolution().
 * Renders nothing for "good" images — only surfaces when there's
 * something worth telling the customer about.
 *
 * Props:
 *   result {{ level: "good"|"acceptable"|"poor", message: string, dpi: number }}
 */
function ResolutionWarning({ result }) {
  if (!result || result.level === "good") return null;

  return (
    <div className={`pp-resolution-warning pp-${result.level}`}>
      <span className="pp-resolution-icon">
        {result.level === "poor" ? "⚠" : "ℹ"}
      </span>
      <span className="pp-resolution-text">{result.message}</span>
    </div>
  );
}

export default ResolutionWarning;