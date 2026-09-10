import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children into an open Shadow DOM host appended to <body>.
 *
 * Used for the Change Password modal specifically because browser
 * extensions and built-in browser password-manager heuristics find
 * password-shaped fields by scanning the main document with plain
 * DOM queries (document.querySelectorAll and the like), which do not
 * cross a shadow boundary — and can otherwise inject their own UI
 * (autofill icons, "passwords don't match" hints, colored borders)
 * directly into the page's DOM. Rendering inside a shadow root keeps
 * this form's own UI exactly as written regardless of what's running
 * in the user's browser.
 *
 * Deliberately `mode: "open"` rather than "closed": closed roots also
 * block legitimate tooling that needs `element.shadowRoot` to work
 * (browser devtools element targeting, and Playwright's own locator
 * engine, which is how this component is tested) without meaningfully
 * raising the bar — a script determined enough to specifically walk
 * `.shadowRoot` for every element would have to do that regardless of
 * open vs. closed once it also handles the closed-root case, and the
 * extensions/heuristics this is actually defending against don't do
 * that at all, open or closed.
 *
 * `styles` is plain CSS text injected via a <style> tag inside the
 * shadow root, since stylesheets from the main document do not cross
 * the shadow boundary.
 */
function ShadowPortal({ children, styles }) {
  const [shadowRoot, setShadowRoot] = useState(null);

  useEffect(() => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: "open" });
    setShadowRoot(root);

    return () => {
      document.body.removeChild(host);
    };
  }, []);

  if (!shadowRoot) return null;

  return createPortal(
    <>
      <style>{styles}</style>
      {children}
    </>,
    shadowRoot
  );
}

export default ShadowPortal;
