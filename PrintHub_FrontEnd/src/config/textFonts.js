// src/config/textFonts.js  (new file)
/**
 * textFonts
 * Categorized font library for the Text tab, matching Printify-style
 * Display/Handwriting/Monospace/Serif/Sans groupings with search.
 *
 * System fonts (isGoogleFont: false) need no loading - they're already on
 * the OS. Google Fonts (isGoogleFont: true) are loaded on demand via
 * loadGoogleFonts() the first time the Text tab is opened, not on initial
 * page load, so most visitors who never touch the customizer never pay
 * for this.
 */

export const FONT_CATEGORIES = ["Sans", "Serif", "Display", "Handwriting", "Monospace"];

export const TEXT_FONTS = [
  { name: "Arial", category: "Sans", isGoogleFont: false },
  { name: "Helvetica", category: "Sans", isGoogleFont: false },
  { name: "Verdana", category: "Sans", isGoogleFont: false },
  { name: "Trebuchet MS", category: "Sans", isGoogleFont: false },
  { name: "Roboto", category: "Sans", isGoogleFont: true },
  { name: "Open Sans", category: "Sans", isGoogleFont: true },
  { name: "Lato", category: "Sans", isGoogleFont: true },
  { name: "Montserrat", category: "Sans", isGoogleFont: true },
  { name: "Poppins", category: "Sans", isGoogleFont: true },
  { name: "Inter", category: "Sans", isGoogleFont: true },

  { name: "Times New Roman", category: "Serif", isGoogleFont: false },
  { name: "Georgia", category: "Serif", isGoogleFont: false },
  { name: "Playfair Display", category: "Serif", isGoogleFont: true },
  { name: "Merriweather", category: "Serif", isGoogleFont: true },
  { name: "Lora", category: "Serif", isGoogleFont: true },

  { name: "Impact", category: "Display", isGoogleFont: false },
  { name: "Bebas Neue", category: "Display", isGoogleFont: true },
  { name: "Anton", category: "Display", isGoogleFont: true },
  { name: "Oswald", category: "Display", isGoogleFont: true },
  { name: "Righteous", category: "Display", isGoogleFont: true },
  { name: "Bungee", category: "Display", isGoogleFont: true },
  { name: "Fredoka", category: "Display", isGoogleFont: true },

  { name: "Comic Sans MS", category: "Handwriting", isGoogleFont: false },
  { name: "Pacifico", category: "Handwriting", isGoogleFont: true },
  { name: "Caveat", category: "Handwriting", isGoogleFont: true },
  { name: "Dancing Script", category: "Handwriting", isGoogleFont: true },
  { name: "Satisfy", category: "Handwriting", isGoogleFont: true },
  { name: "Shadows Into Light", category: "Handwriting", isGoogleFont: true },

  { name: "Courier New", category: "Monospace", isGoogleFont: false },
  { name: "Roboto Mono", category: "Monospace", isGoogleFont: true },
  { name: "Space Mono", category: "Monospace", isGoogleFont: true },
  { name: "JetBrains Mono", category: "Monospace", isGoogleFont: true },
];

let fontsLinkInjected = false;

/**
 * Injects a single Google Fonts stylesheet <link> covering every Google
 * font in the list above, exactly once per page load. Safe to call
 * repeatedly - only the first call does anything.
 */
export function loadGoogleFonts() {
  if (fontsLinkInjected || typeof document === "undefined") return;
  fontsLinkInjected = true;

  const families = TEXT_FONTS.filter((f) => f.isGoogleFont)
    .map((f) => `family=${f.name.replace(/ /g, "+")}:wght@400;700`)
    .join("&");

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.appendChild(link);
}