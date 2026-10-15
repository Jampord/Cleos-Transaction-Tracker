import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Appearance, type ViewStyle } from "react-native";

export type IconName = ComponentProps<typeof Ionicons>["name"];
export type ThemeMode = "light" | "dark" | "system";
// ensure the hook is called so the app re-renders when the system theme changes

const light = {
  bg: "#F3F5F9",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
  track: "#E8EDF4", // background of a toggle
  trackOn: "#FFFFFF", // the selected option of a toggle
  chip: "#EEF2F7",
  readonly: "#F1F5F9",
  placeholder: "#94A3B8",
  onFill: "#FFFFFF", // text on a filled button
  primary: "#2563EB",
  success: "#059669",
  successBg: "#D1FAE5",
  danger: "#DC2626",
  dangerBg: "#FEE2E2",
  warning: "#B45309",
  warningBg: "#FEF3C7",
  warningBorder: "#F5D78A",
  info: "#2563EB",
  infoBg: "#DBEAFE",
  cashIn: "#059669",
  cashOut: "#EA580C",
  load: "#7C3AED",
  water: "#0891B2",
};

const dark: typeof light = {
  bg: "#0B1220",
  surface: "#151E2E",
  border: "#263247",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  track: "#0E1624",
  trackOn: "#2A3A55",
  chip: "#1F2A3D",
  readonly: "#101826",
  placeholder: "#64748B",
  onFill: "#0B1220",
  primary: "#60A5FA",
  success: "#34D399",
  successBg: "#0F3D2E",
  danger: "#F87171",
  dangerBg: "#4A1D1D",
  warning: "#FBBF24",
  warningBg: "#3B2F0B",
  warningBorder: "#6B5415",
  info: "#60A5FA",
  infoBg: "#16294A",
  cashIn: "#34D399",
  cashOut: "#FB923C",
  load: "#A78BFA",
  water: "#22D3EE",
};

// One shared object. applyScheme() swaps its values, so every file that
// imports `colors` sees the new palette the next time it renders.
export const colors = { ...light };

export function applyScheme(scheme: "light" | "dark") {
  Object.assign(colors, scheme === "dark" ? dark : light);
}

// Ask Android to use this mode too, so alerts and the keyboard match.
export function applyMode(mode: ThemeMode) {
  Appearance.setColorScheme(mode === "system" ? "unspecified" : mode);
}

// 10% version of a color, for icon backgrounds.
export const tint = (hex: string) => hex + "1A";

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
export const font = { caption: 13, body: 16, bodyLg: 18, title: 20, h1: 28, display: 34 };

export const shadow: ViewStyle = {
  shadowColor: "#0F172A",
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

// The color is a getter so it follows the current palette.
export const typeMeta = {
  cash_in: {
    label: "Cash-in",
    icon: "arrow-down-circle" as IconName,
    get color() {
      return colors.cashIn;
    },
  },
  cash_out: {
    label: "Cash-out",
    icon: "arrow-up-circle" as IconName,
    get color() {
      return colors.cashOut;
    },
  },
  load: {
    label: "Load",
    icon: "phone-portrait" as IconName,
    get color() {
      return colors.load;
    },
  },
  water: {
    label: "Water sale",
    icon: "water" as IconName,
    get color() {
      return colors.water;
    },
  },
};
