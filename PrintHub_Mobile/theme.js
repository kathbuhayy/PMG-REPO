// ============================================================
// PMG MOBILE DESIGN SYSTEM
// Matches the PMG Web visual language
// ============================================================

export const COLORS = {
  // ==========================================================
  // BRAND
  // ==========================================================

  primary: "#B6FF00",
  primaryBright: "#C8FF00",
  primaryDark: "#91EB00",

  // ==========================================================
  // DARK BRAND BACKGROUNDS
  // ==========================================================

  background: "#020F09",
  backgroundDeep: "#010806",
  sectionDark: "#03160C",
  surfaceDark: "#061D10",
  surfaceDarkAlt: "#082D15",
  cardDark: "#092317",

  // ==========================================================
  // LIGHT SURFACES
  // Used only where a light UI is appropriate
  // ==========================================================

  white: "#FFFFFF",
  cardBg: "#FFFFFF",
  lightBg: "#F6F8F6",

  // ==========================================================
  // TEXT
  // ==========================================================

  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.70)",
  textMuted: "rgba(255,255,255,0.52)",
  textDim: "rgba(255,255,255,0.36)",
  textDark: "#071000",

  // ==========================================================
  // BORDERS
  // ==========================================================

  border: "rgba(182,255,0,0.17)",
  borderStrong: "rgba(182,255,0,0.52)",
  borderBright: "rgba(182,255,0,0.72)",

  borderDark: "rgba(255,255,255,0.10)",
  borderLight: "#E5E7EB",

  // ==========================================================
  // INPUTS
  // ==========================================================

  inputBackground: "#061D10",
  inputBorder: "rgba(182,255,0,0.20)",
  inputPlaceholder: "rgba(255,255,255,0.40)",

  // ==========================================================
  // STATUS
  // ==========================================================

  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",

  // ==========================================================
  // EFFECTS
  // ==========================================================

  glow: "rgba(182,255,0,0.18)",
  glowStrong: "rgba(182,255,0,0.30)",
  overlay: "rgba(1,10,6,0.90)",
};


// ============================================================
// TYPOGRAPHY
// ============================================================

export const TYPOGRAPHY = {
  hero: {
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 42,
    letterSpacing: 0.5,
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
  },

  heading: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },

  subheading: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 23,
  },

  body: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 21,
  },

  bodyStrong: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
  },

  caption: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    letterSpacing: 0.5,
  },

  button: {
    fontSize: 14,
    fontWeight: "800",
  },
};


// ============================================================
// SPACING
// ============================================================

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};


// ============================================================
// BORDER RADIUS
// ============================================================

export const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};


// ============================================================
// COMMON STYLES
// ============================================================

export const COMMON_STYLES = {

  // ----------------------------------------------------------
  // SCREEN
  // ----------------------------------------------------------

  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },


  // ----------------------------------------------------------
  // DARK CARD
  // ----------------------------------------------------------

  card: {
    backgroundColor: COLORS.surfaceDark,
    borderRadius: RADII.lg,

    borderWidth: 1,
    borderColor: COLORS.border,

    padding: SPACING.lg,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.25,
    shadowRadius: 24,

    elevation: 4,
  },


  // ----------------------------------------------------------
  // PRIMARY BUTTON
  // ----------------------------------------------------------

  primaryBtn: {
    backgroundColor: COLORS.primary,

    paddingVertical: 14,
    paddingHorizontal: 22,

    borderRadius: RADII.pill,

    alignItems: "center",
    justifyContent: "center",

    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.20,
    shadowRadius: 16,

    elevation: 3,
  },


  primaryBtnText: {
    color: COLORS.textDark,
    fontSize: 14,
    fontWeight: "800",
  },


  // ----------------------------------------------------------
  // SECONDARY / OUTLINE BUTTON
  // ----------------------------------------------------------

  secondaryBtn: {
    backgroundColor: "rgba(182,255,0,0.04)",

    paddingVertical: 13,
    paddingHorizontal: 20,

    borderRadius: RADII.pill,

    borderWidth: 1,
    borderColor: COLORS.borderStrong,

    alignItems: "center",
    justifyContent: "center",
  },


  secondaryBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "800",
  },


  // ----------------------------------------------------------
  // PILL
  // ----------------------------------------------------------

  badge: {
    paddingHorizontal: 12,
    paddingVertical: 7,

    borderRadius: RADII.pill,

    borderWidth: 1,
    borderColor: COLORS.borderStrong,

    backgroundColor: "rgba(182,255,0,0.04)",

    alignSelf: "flex-start",
  },


  badgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },


  // ----------------------------------------------------------
  // INPUT
  // ----------------------------------------------------------

  input: {
    backgroundColor: COLORS.inputBackground,

    borderWidth: 1,
    borderColor: COLORS.inputBorder,

    borderRadius: RADII.md,

    height: 48,

    paddingHorizontal: 15,

    color: COLORS.textPrimary,

    fontSize: 14,
  },
};