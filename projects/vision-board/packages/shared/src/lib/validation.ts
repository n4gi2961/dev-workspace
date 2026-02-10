/**
 * Shared validation utilities for Vision Board
 * Used by both mobile and web apps
 */

// --- Email ---

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

// --- Password ---

const MIN_PASSWORD_LENGTH = 8;

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`${MIN_PASSWORD_LENGTH}文字以上で入力してください`);
  }
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('英字を含めてください');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('数字を含めてください');
  }

  return { isValid: errors.length === 0, errors };
}

// --- Text fields ---

const MAX_BOARD_NAME_LENGTH = 100;
const MAX_NODE_TEXT_LENGTH = 1000;
const MAX_ROUTINE_TITLE_LENGTH = 100;
const MAX_DISPLAY_NAME_LENGTH = 50;

export function isValidBoardName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_BOARD_NAME_LENGTH;
}

export function isValidNodeText(text: string): boolean {
  return text.length <= MAX_NODE_TEXT_LENGTH;
}

export function isValidRoutineTitle(title: string): boolean {
  const trimmed = title.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_ROUTINE_TITLE_LENGTH;
}

export function isValidDisplayName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_DISPLAY_NAME_LENGTH;
}

// --- Image files ---

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface ImageValidation {
  isValid: boolean;
  error?: string;
}

export function validateImageFile(
  mimeType: string,
  sizeBytes: number
): ImageValidation {
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return {
      isValid: false,
      error: `対応形式: ${ALLOWED_IMAGE_TYPES.map((t) => t.split('/')[1]).join(', ')}`,
    };
  }

  if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `ファイルサイズは${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB以下にしてください`,
    };
  }

  return { isValid: true };
}

// --- UUID ---

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

// --- Constants (re-export for external use) ---

export const VALIDATION_LIMITS = {
  MIN_PASSWORD_LENGTH,
  MAX_BOARD_NAME_LENGTH,
  MAX_NODE_TEXT_LENGTH,
  MAX_ROUTINE_TITLE_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_IMAGE_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
} as const;
