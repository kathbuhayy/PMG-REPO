import React, { useEffect, useRef } from "react";
import pmgWebsiteLogo from "../assets/brand/pmg-logo-nav.png";

export default function SplashScreen({ onComplete }) {
  const completedRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (completedRef.current) return;

      completedRef.current = true;
      onComplete?.();
    }, 3600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [onComplete]);

  const handleLoadingComplete = () => {
    if (completedRef.current) return;

    completedRef.current = true;
    onComplete?.();
  };

  return (
    <div
      className="pmg-clean-splash"
      role="status"
      aria-label="Loading PMG Printing House"
    >
      {/* ================================================
          VERY SUBTLE BACKGROUND
      ================================================= */}

      <div className="pmg-clean-background" aria-hidden="true">
        <div className="pmg-clean-grid" />
        <div className="pmg-clean-glow" />
        <div className="pmg-clean-sweep" />
      </div>

      {/* ================================================
          CENTER CONTENT
      ================================================= */}

      <main className="pmg-clean-content">

        {/* LOGO */}

        <div className="pmg-clean-logo">
          <div className="pmg-clean-logo-glow" />

          <img
            src={pmgWebsiteLogo}
            alt="PMG Printing House"
            draggable="false"
          />
        </div>

        {/* TAGLINE */}

        <h1>
          YOUR IDEAS.
          <span>PRINTED.</span>
        </h1>

        {/* SUBTITLE */}

        <p>
          Bringing your creative ideas to life...
        </p>

        {/* LOADING */}

        <div
          className="pmg-clean-loading"
          aria-label="Loading"
        >
          <span onAnimationEnd={handleLoadingComplete} />
        </div>

        <div className="pmg-clean-loading-label">
          PRINTING YOUR EXPERIENCE
        </div>

      </main>
    </div>
  );
}