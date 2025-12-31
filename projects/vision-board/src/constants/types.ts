// Block types
export const BLOCK_TYPES = {
  HEADING: 'heading',
  TEXT: 'text',
  TOGGLE: 'toggle',
  CHECKBOX: 'checkbox',
} as const;

// Node types
export const NODE_TYPES = {
  IMAGE: 'image',
  TEXT: 'text',
} as const;

// Image shapes
export const IMAGE_SHAPES = {
  FREE: 'free',
  SQUARE: 'square',
  LANDSCAPE: 'landscape',
  PORTRAIT: 'portrait',
} as const;

// Hover font sizes
export const HOVER_FONT_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
} as const;

// Hover text colors
export const HOVER_TEXT_COLORS = {
  WHITE: 'white',
  BLACK: 'black',
} as const;
