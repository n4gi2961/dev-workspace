/**
 * Design token colors from .pen theme variables.
 * Use Tailwind classes (e.g. `text-txt-primary`) when possible.
 * Import these constants only when dynamic style props are needed.
 */

export const colors = {
  accent: {
    primary: '#0095F6',
    light: '#EFF6FF',
  },
  destructive: '#EF4444',
  background: {
    primary: '#000000',
    surface: '#1F2937',
    canvas: '#111827',
  },
  border: {
    default: '#374151',
    light: '#E4E4E7',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#D1D5DB',
    tertiary: '#A1A1AA',
    muted: '#D4D4D8',
  },
} as const;

/**
 * Legacy default export for backward compatibility with existing components.
 * New code should use the named `colors` export instead.
 */
export default {
  light: {
    text: '#18181B',
    background: '#FFFFFF',
    tint: colors.accent.primary,
    tabIconDefault: colors.text.tertiary,
    tabIconSelected: colors.accent.primary,
  },
  dark: {
    text: colors.text.primary,
    background: '#000000',
    tint: colors.text.primary,
    tabIconDefault: colors.text.tertiary,
    tabIconSelected: colors.text.primary,
  },
};
