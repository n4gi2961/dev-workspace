// React Native entry point

// Client exports (native implementation)
export {
  createClient,
  setStorageAdapter,
  setupAppStateListener,
  resetClient,
} from './client.native';

// Types
export type { IStorage } from './types';

// Storage exports (shared between web and native)
export { uploadImage, deleteImage, isStorageUrl } from './storage';

// Hooks re-export
export * from './hooks';
