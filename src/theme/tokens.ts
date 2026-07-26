/**
 * Design tokens — ported 1:1 from the web brand (globals.css) and the two
 * mobile mockups (tadaa-mobile-prototype.html / tadaa-mobile-screens-live.html).
 * One "hand" across web + mobile: warm cream ground, rose primary, gold accent.
 */
import { Platform } from "react-native";

export const colors = {
  cream: "#FFF8F0",
  creamDark: "#F5EDE3",
  appBg: "#E7DCCD", // mockup body background behind device
  rose: "#C4686D",
  roseLight: "#E8A5A8",
  roseDeep: "#9B3D42",
  gold: "#C9A96E",
  goldLight: "#E8D5A8",
  charcoal: "#2D2926",
  warmGray: "#6B5E57",
  lightGray: "#D4CBC3",
  hair: "#ECE3D8",
  white: "#FFFFFF",

  // chip surfaces
  roseChipBg: "#FBEDED",
  roseChipBorder: "#F2D6D7",
  goldChipBg: "#FAF3E2",
  goldChipText: "#8A6D34",
  goldChipBorder: "#EAD9B4",
  greenChipBg: "#E9F4EC",
  greenChipText: "#3B7A52",
  greenChipBorder: "#CFE7D6",
} as const;

/** Primary rose gradient (buttons, FAB, logo). Use with expo-linear-gradient. */
export const gradients = {
  rose: ["#C4686D", "#9B3D42"] as [string, string],
  gold: ["#E8D5A8", "#C9A96E"] as [string, string],
} as const;

export const fonts = {
  /** Bricolage Grotesque — headings. */
  heading: "Bricolage_800ExtraBold",
  headingSemi: "Bricolage_600SemiBold",
  /** DM Sans — body/UI. */
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodyBold: "DMSans_700Bold",
  /** Caveat — handwritten accents (eyebrows, polaroid captions). */
  hand: "Caveat_700Bold",
} as const;

export const radii = {
  sm: 11,
  md: 13,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

/** Cross-platform elevation presets matching the mockup's soft warm shadows. */
export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: "#2D2926",
      shadowOpacity: 0.06,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
    },
    android: { elevation: 1 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: "#2D2926",
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 4 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: "#2D2926",
      shadowOpacity: 0.18,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 14 },
    },
    android: { elevation: 10 },
    default: {},
  }),
} as const;

export const theme = { colors, gradients, fonts, radii, spacing, shadows } as const;
export type AppTheme = typeof theme;
