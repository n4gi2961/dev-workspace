/**
 * Lightweight in-app event bus for cross-screen data synchronization.
 * Works entirely in memory — no network dependency.
 *
 * Events:
 *  - boards:changed
 *  - nodes:changed
 *  - routines:changed
 *  - pages:changed
 */

type Listener = (sourceId?: string) => void;

const listeners = new Map<string, Set<Listener>>();

export const dataEvents = {
  on(event: string, listener: Listener): () => void {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      listeners.get(event)?.delete(listener);
    };
  },

  emit(event: string, sourceId?: string) {
    listeners.get(event)?.forEach((fn) => fn(sourceId));
  },
};
