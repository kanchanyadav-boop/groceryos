// customer/src/shared/theme.ts
// Centralised colour tokens — import this instead of hardcoding hex strings.

export const C = {
  // ─── Backgrounds ────────────────────────────────────────────────────────────
  bg:        "#0F1117",   // page / screen background
  surface:   "#16181F",   // card / sheet surface
  surfaceAlt:"#1E2028",   // elevated card, input background
  border:    "#262830",   // subtle border
  borderFaint:"#1D1F27",  // very faint separator

  // ─── Brand ──────────────────────────────────────────────────────────────────
  green:     "#2ECC71",   // primary CTA, price, active indicator  (softer than #10B981)
  greenDim:  "#2ECC7115", // ghost button fill
  greenBorder:"#2ECC7130",// ghost button border / card highlight border

  // ─── Text ───────────────────────────────────────────────────────────────────
  textPrimary:   "#F0F0F5",  // headings, primary values  (soft white, not pure)
  textSecondary: "#8A8A9A",  // labels, subtitles         (muted purple-grey)
  textTertiary:  "#4E4E60",  // placeholders, disabled

  // ─── Semantic ───────────────────────────────────────────────────────────────
  red:       "#E05252",   // discount badge, error       (less saturated)
  amber:     "#D4962A",   // packed status
  blue:      "#3B82F6",   // confirmed status
  purple:    "#8B5CF6",   // dispatched status
} as const;
