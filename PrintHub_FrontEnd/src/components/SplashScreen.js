import React, { useEffect } from "react";
import pmgWebsiteLogo from "../assets/brand/pmg-mark.png";

export default function SplashScreen({ onComplete }) {
  useEffect(() => {
    const fallback = window.setTimeout(onComplete, 3600);
    return () => window.clearTimeout(fallback);
  }, [onComplete]);

  const colors = ["#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"];
  const splatters = [
    { x: -44, y: 48, size: 16 },
    { x: -26, y: 74, size: 24 },
    { x: 8, y: 62, size: 14 },
    { x: 34, y: 88, size: 20 },
    { x: 52, y: 54, size: 12 },
    { x: -58, y: 92, size: 11 },
    { x: 20, y: 116, size: 15 },
    { x: 66, y: 102, size: 18 },
  ];
  const floatingDrops = [
    { left: 8, top: 18, size: 14, color: colors[0] },
    { left: 18, top: 78, size: 22, color: colors[1] },
    { left: 31, top: 12, size: 16, color: colors[2] },
    { left: 43, top: 84, size: 12, color: colors[3] },
    { left: 56, top: 22, size: 26, color: colors[4] },
    { left: 68, top: 72, size: 18, color: colors[0] },
    { left: 79, top: 16, size: 12, color: colors[1] },
    { left: 88, top: 64, size: 24, color: colors[2] },
    { left: 14, top: 42, size: 10, color: colors[3] },
    { left: 36, top: 58, size: 18, color: colors[4] },
    { left: 72, top: 38, size: 14, color: colors[0] },
    { left: 94, top: 28, size: 20, color: colors[3] },
  ];

  return (
    <div
      className="pmg-paint-splash"
      role="status"
      aria-label="Loading PMG Printing"
    >
      <div className="pmg-paint-drips" aria-hidden="true">
        {colors.map((color, index) => (
          <div
            key={color}
            className="pmg-paint-drip"
            style={{
              "--paint-color": color,
              "--paint-left": `${15 + index * 18}%`,
              "--paint-delay": `${index * 0.15}s`,
            }}
          >
            <span className="pmg-paint-drop" />
            {splatters.map((splatter, splatterIndex) => (
              <span
                key={splatterIndex}
                className="pmg-paint-splatter"
                style={{
                  "--splatter-x": `${splatter.x}px`,
                  "--splatter-y": `${splatter.y}px`,
                  "--splatter-size": `${splatter.size}px`,
                  "--splatter-delay": `${index * 0.15 + 1.2}s`,
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {floatingDrops.map((drop, index) => (
        <span
          key={index}
          className="pmg-floating-drop"
          aria-hidden="true"
          style={{
            "--drop-color": drop.color,
            "--drop-left": `${drop.left}%`,
            "--drop-top": `${drop.top}%`,
            "--drop-size": `${drop.size}px`,
            "--drop-delay": `${1 + index * 0.06}s`,
          }}
        />
      ))}

      <div className="pmg-splash-center">
        <div className="pmg-splash-icon" aria-hidden="true">
          <img src={pmgWebsiteLogo} alt="" />
        </div>
        <h1>PMG PRINTING HOUSE</h1>
        <p>CUSTOM PRINTS, APPAREL, PACKAGING & SIGNAGE</p>
        <div className="pmg-splash-loading" aria-hidden="true">
          <span onAnimationEnd={onComplete} />
        </div>
      </div>
    </div>
  );
}
