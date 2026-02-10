import * as SecureStore from 'expo-secure-store';
import type { IStorage } from '@vision-board/supabase/types';

/**
 * SecureStore-based storage adapter for Supabase auth tokens.
 *
 * Uses iOS Keychain / Android EncryptedSharedPreferences
 * to store sensitive data (session tokens, refresh tokens) encrypted at rest.
 *
 * expo-secure-store has a 2048-byte value limit per key.
 * Supabase sessions can exceed this, so we chunk large values.
 */

const CHUNK_SIZE = 2000;

function chunkKey(key: string, index: number): string {
  return `${key}__chunk_${index}`;
}

export const secureStorage: IStorage = {
  async getItem(key: string): Promise<string | null> {
    const firstChunk = await SecureStore.getItemAsync(key);
    if (firstChunk === null) return null;

    // Check if value was chunked
    const secondChunk = await SecureStore.getItemAsync(chunkKey(key, 1));
    if (secondChunk === null) return firstChunk;

    // Reassemble chunked value
    let result = firstChunk;
    let index = 1;
    let chunk: string | null = secondChunk;
    while (chunk !== null) {
      result += chunk;
      index++;
      chunk = await SecureStore.getItemAsync(chunkKey(key, index));
    }
    return result;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      // Clean up any old chunks
      await SecureStore.deleteItemAsync(chunkKey(key, 1)).catch(() => {});
      return;
    }

    // Store in chunks
    const chunks = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }

    // First chunk goes to the main key
    await SecureStore.setItemAsync(key, chunks[0]);

    // Remaining chunks
    for (let i = 1; i < chunks.length; i++) {
      await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]);
    }

    // Clean up any extra old chunks beyond current length
    let cleanIndex = chunks.length;
    let oldChunk = await SecureStore.getItemAsync(chunkKey(key, cleanIndex)).catch(() => null);
    while (oldChunk !== null) {
      await SecureStore.deleteItemAsync(chunkKey(key, cleanIndex)).catch(() => {});
      cleanIndex++;
      oldChunk = await SecureStore.getItemAsync(chunkKey(key, cleanIndex)).catch(() => null);
    }
  },

  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key).catch(() => {});

    // Clean up any chunks
    let index = 1;
    let chunk = await SecureStore.getItemAsync(chunkKey(key, index)).catch(() => null);
    while (chunk !== null) {
      await SecureStore.deleteItemAsync(chunkKey(key, index)).catch(() => {});
      index++;
      chunk = await SecureStore.getItemAsync(chunkKey(key, index)).catch(() => null);
    }
  },
};
