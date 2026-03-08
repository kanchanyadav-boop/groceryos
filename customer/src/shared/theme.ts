// customer/src/shared/theme.ts
// Centralised colour tokens — import this instead of hardcoding hex strings.

export const LightTheme = {
  bg: "#F9FAFB",       // Soft white/grey background
  surface: "#FFFFFF",  // Pure white card surface
  surfaceAlt: "#F3F4F6", // Off-white for inputs/alt sections
  border: "#E5E7EB",   // Subtle grey border
  borderFaint: "#F3F4F6",

  textPrimary: "#111827", // Near black for primary text
  textSecondary: "#4B5563", // Muted grey for secondary text
  textTertiary: "#9CA3AF",  // Placeholder/disabled text

  green: "#008A50",    // Richer brand green for light mode
  greenDim: "#008A5010",
  greenBorder: "#008A5020",

  red: "#EF4444",
  amber: "#F59E0B",
  blue: "#3B82F6",
  purple: "#8B5CF6",
  tabBarBg: "#F0FDF4", // Very subtle emerald tint for light mode
} as const;

export const DarkTheme = {
  bg: "#060A12",       // Deep dark background (slightly lightened from total black)
  surface: "#12141C",  // Dark card surface
  surfaceAlt: "#1E2028", // Elevated surface for inputs
  border: "#262830",   // Subtle dark border
  borderFaint: "#1D1F27",

  textPrimary: "#F0F0F5", // Soft white text
  textSecondary: "#8A8A9A", // Muted purple-grey text
  textTertiary: "#4E4E60",  // Dark placeholder text

  green: "#2ECC71",    // Softer green for dark mode eyes
  greenDim: "#2ECC7115",
  greenBorder: "#2ECC7130",

  red: "#E05252",
  amber: "#D4962A",
  blue: "#3B82F6",
  purple: "#8B5CF6",
  tabBarBg: "#0B0F19", // Slightly deeper than bg for dark mode
} as const;

// Legacy export for backward compatibility during refactor
export const C = DarkTheme;
