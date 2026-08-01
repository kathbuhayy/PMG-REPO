// PrintHub Mobile Design System Tokens
export const COLORS = {
  primaryDark: "#07111f",
  secondaryDark: "#111c2f",
  cardDark: "#17253c",
  lightBg: "#f8fafc",
  accentCyan: "#06b6d4",
  accentGold: "#c8a24a",
  accentGoldLight: "#f8d47a",
  accentBlue: "#3b82f6",
  cardBg: "#ffffff",
  textPrimary: "#0f172a",
  textMuted: "#64748b",
  textLight: "#ffffff",
  borderLight: "#e2e8f0",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
};

export const COMMON_STYLES = {
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryBtn: {
    backgroundColor: COLORS.accentCyan,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: COLORS.textLight,
    fontWeight: "700",
    fontSize: 14,
  },
};
