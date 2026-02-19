import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { loadTextureAsync } from 'expo-three';

// Metro bundler がアセットを含めるために require() で参照
const ASSETS = {
  sky: require('../assets/images/star-stack/bg_sky.png'),
  window: require('../assets/images/star-stack/bg_window.png'),
  shelf: require('../assets/images/star-stack/bg_shelf.png'),
};

export interface SceneTextures {
  sky: THREE.Texture | null;
  window: THREE.Texture | null;
  shelf: THREE.Texture | null;
  loaded: boolean;
}

/**
 * StarStack 背景テクスチャを読み込むフック
 * expo-three の loadTextureAsync を使用（内部で expo-asset-utils を経由）
 * WebGL1制約: ClampToEdgeWrapping + LinearFilter
 */
export function useSceneTextures(): SceneTextures {
  const [textures, setTextures] = useState<SceneTextures>({
    sky: null,
    window: null,
    shelf: null,
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [sky, win, shelf] = await Promise.all([
          loadTextureAsync({ asset: ASSETS.sky }),
          loadTextureAsync({ asset: ASSETS.window }),
          loadTextureAsync({ asset: ASSETS.shelf }),
        ]);

        if (cancelled) return;

        // WebGL1: NPOT テクスチャは ClampToEdge + LinearFilter 必須
        for (const tex of [sky, win, shelf]) {
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
        }

        setTextures({ sky, window: win, shelf, loaded: true });
      } catch (e) {
        console.warn('[useSceneTextures] Failed to load textures:', e);
        // フォールバック: loaded=false のまま → WindowScene が表示される
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return textures;
}
