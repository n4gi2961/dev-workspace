/**
 * Star color palette
 */
export const STAR_COLORS = [
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
] as const;

export type StarColorHex = (typeof STAR_COLORS)[number];

/**
 * Returns a random star color hex string
 */
export function getRandomStarColorHex(): StarColorHex {
  return STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
}
