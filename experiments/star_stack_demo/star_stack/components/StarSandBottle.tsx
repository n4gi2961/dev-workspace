'use client';

import React, { Suspense, useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMatcapTexture, Environment, OrbitControls } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider, BallCollider, InstancedRigidBodies, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';

// ============================================
// STAR GEOMETRY GENERATOR
// Creates a 4-pointed star bipyramid (Gemini-style)
// ============================================
function createStarGeometry(
  outerRadius: number = 0.08,
  innerRadius: number = 0.03,
  height: number = 0.06
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  
  // Vertices:
  // - Center top apex (0)
  // - Center bottom apex (1)
  // - 4 outer points on equator (2, 3, 4, 5)
  // - 4 inner (concave) points on equator (6, 7, 8, 9)
  
  const topApex = new THREE.Vector3(0, height, 0);
  const bottomApex = new THREE.Vector3(0, -height, 0);
  
  const outerPoints: THREE.Vector3[] = [];
  const innerPoints: THREE.Vector3[] = [];
  
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const innerAngle = angle + Math.PI / 4;
    
    outerPoints.push(new THREE.Vector3(
      Math.cos(angle) * outerRadius,
      0,
      Math.sin(angle) * outerRadius
    ));
    
    innerPoints.push(new THREE.Vector3(
      Math.cos(innerAngle) * innerRadius,
      0,
      Math.sin(innerAngle) * innerRadius
    ));
  }
  
  // Build triangles
  const vertices: number[] = [];
  const normals: number[] = [];
  
  const addTriangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ac = new THREE.Vector3().subVectors(c, a);
    const normal = new THREE.Vector3().crossVectors(ab, ac).normalize();
    
    vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    normals.push(normal.x, normal.y, normal.z, normal.x, normal.y, normal.z, normal.x, normal.y, normal.z);
  };
  
  // Create faces connecting apexes to equator points
  for (let i = 0; i < 4; i++) {
    const nextI = (i + 1) % 4;
    
    // Top half - outer to inner
    addTriangle(topApex, outerPoints[i], innerPoints[i]);
    addTriangle(topApex, innerPoints[i], outerPoints[nextI]);
    
    // Bottom half - inner to outer (reversed winding)
    addTriangle(bottomApex, innerPoints[i], outerPoints[i]);
    addTriangle(bottomApex, outerPoints[nextI], innerPoints[i]);
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeVertexNormals();
  
  return geometry;
}

// ============================================
// BOTTLE CONTAINER COMPONENT
// ============================================
interface BottleProps {
  height?: number;
  radius?: number;
  wallThickness?: number;
}

function Bottle({ height = 2.5, radius = 0.6, wallThickness = 0.05 }: BottleProps) {
  const [glassMatcap] = useMatcapTexture('C7C0AC_2E181B_543B30_6B6270', 256);
  
  const bodyHeight = 1.8;           // メインボトル部分
  const shoulderHeight = 0.3;       // 斜めの肩部分
  const neckHeight = 0.5;           // 縦に伸びる首部分
  const lipHeight = 0.15;           // 口の丸い部分
  const neckRadius = radius * 0.35;
  const lipRadius = neckRadius * 1.3;
  
  return (
    <group>
      {/* Back of bottle (rendered first) */}
      <mesh position={[0, bodyHeight / 2, 0]} renderOrder={0}>
        <cylinderGeometry args={[neckRadius, radius, shoulderHeight, 32, 1, true]} />
        <meshMatcapMaterial 
          matcap={glassMatcap} 
          side={THREE.BackSide}
          color="#8b9aa3"
          transparent
          opacity={0.5}
        />
      </mesh>
      
      {/* Bottle neck back */}
      <mesh position={[0, bodyHeight + shoulderHeight / 2, 0]} renderOrder={0}>
        <cylinderGeometry args={[neckRadius*1.2, radius, shoulderHeight*1.7, 32, 1, true]} />
        <meshMatcapMaterial 
          matcap={glassMatcap} 
          side={THREE.BackSide}
          color="#8b9aa3"
          transparent
          opacity={0.5}
        />
      </mesh>
      
      {/* Bottom of bottle */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={0}>
        <circleGeometry args={[neckRadius*0.08, neckRadius, neckHeight, 32, 1, true]} />
        <meshMatcapMaterial 
          matcap={glassMatcap}
          side={THREE.DoubleSide}
          color="#8b9aa3"
          transparent
          opacity={0.4}
        />
      </mesh>
      
      {/* Front of bottle (rendered last for transparency) */}
      <mesh position={[0, bodyHeight / 2, 0]} renderOrder={2}>
        <cylinderGeometry args={[radius, radius, bodyHeight, 32, 1, true]} />
        <meshMatcapMaterial 
          matcap={glassMatcap} 
          side={THREE.FrontSide}
          transparent
          opacity={0.35}
          color="#ffffff"
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Bottle neck front */}
      <mesh position={[0, bodyHeight + neckHeight / 2, 0]} renderOrder={2}>
        <cylinderGeometry args={[neckRadius, radius * 0.7, neckHeight, 32, 1, true]} />
        <meshMatcapMaterial 
          matcap={glassMatcap} 
          side={THREE.FrontSide}
          transparent
          opacity={0.35}
          color="#ffffff"
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Cork stopper */}
      <mesh position={[0, bodyHeight + neckHeight + 0.15, 0]}>
        <cylinderGeometry args={[neckRadius * 1.5, neckRadius * 1.4, 0.35, 16]} />
        <meshStandardMaterial 
          color="#b8956a"
          roughness={0.9}
        />
      </mesh>
    </group>
  );
}

// ============================================
// BOTTLE PHYSICS COLLIDERS
// ============================================
function BottleColliders({ height = 2.5, radius = 0.6 }: BottleProps) {
  const wallSegments = 24;
  const wallThickness = 0.03;
  const bodyHeight = height - 0.4;
  
  return (
    <RigidBody type="fixed" colliders={false}>
      {/* Floor */}
      <CuboidCollider args={[radius, 0.02, radius]} position={[0, 0, 0]} />
      
      {/* Cylindrical walls using multiple cuboids arranged in a circle */}
      {Array.from({ length: wallSegments }).map((_, i) => {
        const angle = (i / wallSegments) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <CuboidCollider
            key={i}
            args={[wallThickness, bodyHeight / 2, radius * Math.PI / wallSegments]}
            position={[x, bodyHeight / 2, z]}
            rotation={[0, -angle, 0]}
          />
        );
      })}
    </RigidBody>
  );
}

// ============================================
// INSTANCED STARS COMPONENT
// ============================================
interface StarInstance {
  key: string;
  position: [number, number, number];
  rotation: [number, number, number];
  color: THREE.Color;
}

interface InstancedStarsProps {
  instances: StarInstance[];
}

function InstancedStars({ instances }: InstancedStarsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [matcap] = useMatcapTexture('F79686_FCCBD4_E76644_E76B56', 256);
  
  const starGeometry = useMemo(() => createStarGeometry(0.06, 0.025, 0.045), []);
  
  const instancesData = useMemo(() => {
    return instances.map((inst) => ({
      key: inst.key,
      position: inst.position,
      rotation: inst.rotation,
    }));
  }, [instances]);
  
  // Update colors when instances change
  useEffect(() => {
    if (meshRef.current && instances.length > 0) {
      instances.forEach((inst, i) => {
        meshRef.current!.setColorAt(i, inst.color);
      });
      meshRef.current.instanceColor!.needsUpdate = true;
    }
  }, [instances]);
  
  if (instances.length === 0) return null;
  
  return (
    <InstancedRigidBodies
      instances={instancesData}
      colliders={false}
    >
      <instancedMesh
        ref={meshRef}
        args={[starGeometry, undefined, instances.length]}
        count={instances.length}
        renderOrder={1}
      >
        <meshMatcapMaterial 
          matcap={matcap}
          vertexColors
        />
      </instancedMesh>
      {instances.map((_, i) => (
        <BallCollider key={i} args={[0.05]} />
      ))}
    </InstancedRigidBodies>
  );
}

// ============================================
// SINGLE FALLING STAR (for individual spawning)
// ============================================
interface FallingStarProps {
  position: [number, number, number];
  rotation: [number, number, number];
  color: THREE.Color;
}

function FallingStar({ position, rotation, color }: FallingStarProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [matcap] = useMatcapTexture('F79686_FCCBD4_E76644_E76B56', 256);
  
  const starGeometry = useMemo(() => createStarGeometry(0.12, 0.05, 0.09), []);   //星のサイズを変えたいとき
  
  // Add random spin on spawn
  useEffect(() => {
    if (rigidBodyRef.current) {
      rigidBodyRef.current.setAngvel(
        { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5, z: (Math.random() - 0.5) * 5 },
        true
      );
    }
  }, []);
  
  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      rotation={rotation}
      colliders="hull"
      restitution={0.2}
      friction={0.8}
      linearDamping={0.5}
      angularDamping={0.3}
    >
      <mesh geometry={starGeometry} renderOrder={1}>
        <meshMatcapMaterial 
          matcap={matcap}
          color={color}
        />
      </mesh>
    </RigidBody>
  );
}

// ============================================
// STAR COLORS PALETTE
// ============================================
const STAR_COLORS = [
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
];

function getRandomStarColor(): THREE.Color {
  const colorHex = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
  return new THREE.Color(colorHex);
}

// ============================================
// SCENE COMPONENT
// ============================================
interface SceneProps {
  stars: StarInstance[];
  onAddStar: () => void;
}

function Scene({ stars }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-3, 5, -3]} intensity={0.5} color="#ffe4b5" />
      
      <Physics gravity={[0, -9.81, 0]}>
        <BottleColliders />
        
        {/* Render individual stars */}
        {stars.map((star) => (
          <FallingStar
            key={star.key}
            position={star.position}
            rotation={star.rotation}
            color={star.color}
          />
        ))}
      </Physics>
      
      <Suspense fallback={null}>
        <Bottle />
      </Suspense>
      
      <OrbitControls 
        enablePan={false}
        minDistance={2}
        maxDistance={8}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}

// ============================================
// AUTO SPAWNER HOOK
// ============================================
function useAutoSpawn(
  isAutoSpawning: boolean,
  starCount: number,
  maxStars: number,
  onAddStar: () => void
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (isAutoSpawning && starCount < maxStars) {
      intervalRef.current = setInterval(() => {
        onAddStar();
      }, 100);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoSpawning, starCount, maxStars, onAddStar]);
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function StarSandBottle() {
  const [stars, setStars] = useState<StarInstance[]>([]);
  const [isAutoSpawning, setIsAutoSpawning] = useState(false);
  const maxStars = 500;
  
  const addStar = useCallback(() => {
    if (stars.length >= maxStars) return;
    
    const newStar: StarInstance = {
      key: `star-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: [
        (Math.random() - 0.5) * 0.4,
        3 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.4,
      ],
      rotation: [
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      ],
      color: getRandomStarColor(),
    };
    
    setStars((prev) => [...prev, newStar]);
  }, [stars.length]);
  
  const addBatch = useCallback(() => {
    if (stars.length >= maxStars) return;
    
    const batchSize = Math.min(20, maxStars - stars.length);
    const newStars: StarInstance[] = [];
    
    for (let i = 0; i < batchSize; i++) {
      newStars.push({
        key: `star-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        position: [
          (Math.random() - 0.5) * 0.5,
          3 + Math.random() * 1.5 + i * 0.1,
          (Math.random() - 0.5) * 0.5,
        ],
        rotation: [
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
        ],
        color: getRandomStarColor(),
      });
    }
    
    setStars((prev) => [...prev, ...newStars]);
  }, [stars.length]);
  
  const resetStars = useCallback(() => {
    setStars([]);
    setIsAutoSpawning(false);
  }, []);
  
  useAutoSpawn(isAutoSpawning, stars.length, maxStars, addStar);
  
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      background: 'linear-gradient(180deg, #f5f0e8 0%, #e8e0d5 50%, #d5ccc0 100%)',
      position: 'relative',
      fontFamily: "'Cormorant Garamond', Georgia, serif",
    }}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 2, 4], fov: 45 }}
        shadows
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <color attach="background" args={['#f5f0e8']} />
        <fog attach="fog" args={['#f5f0e8', 5, 15]} />
        <Suspense fallback={null}>
          <Scene stars={stars} onAddStar={addStar} />
        </Suspense>
      </Canvas>
      
      {/* UI Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
      }}>
        {/* Star Counter */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(10px)',
          padding: '12px 24px',
          borderRadius: '30px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
        }}>
          <span style={{
            fontSize: '14px',
            color: '#5a5048',
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}>
            ★ {stars.length} / {maxStars} 星の砂
          </span>
        </div>
        
        {/* Control Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <button
            onClick={addStar}
            disabled={stars.length >= maxStars}
            style={{
              padding: '14px 28px',
              fontSize: '15px',
              fontWeight: '500',
              color: '#fff',
              background: 'linear-gradient(135deg, #d4a574 0%, #c49464 100%)',
              border: 'none',
              borderRadius: '25px',
              cursor: stars.length >= maxStars ? 'not-allowed' : 'pointer',
              opacity: stars.length >= maxStars ? 0.5 : 1,
              boxShadow: '0 4px 15px rgba(196, 148, 100, 0.4)',
              transition: 'all 0.3s ease',
              fontFamily: 'inherit',
              letterSpacing: '1px',
            }}
            onMouseEnter={(e) => {
              if (stars.length < maxStars) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(196, 148, 100, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(196, 148, 100, 0.4)';
            }}
          >
            ＋ 砂を追加
          </button>
          
          <button
            onClick={addBatch}
            disabled={stars.length >= maxStars}
            style={{
              padding: '14px 28px',
              fontSize: '15px',
              fontWeight: '500',
              color: '#fff',
              background: 'linear-gradient(135deg, #c49464 0%, #a87d50 100%)',
              border: 'none',
              borderRadius: '25px',
              cursor: stars.length >= maxStars ? 'not-allowed' : 'pointer',
              opacity: stars.length >= maxStars ? 0.5 : 1,
              boxShadow: '0 4px 15px rgba(168, 125, 80, 0.4)',
              transition: 'all 0.3s ease',
              fontFamily: 'inherit',
              letterSpacing: '1px',
            }}
            onMouseEnter={(e) => {
              if (stars.length < maxStars) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(168, 125, 80, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(168, 125, 80, 0.4)';
            }}
          >
            ＋20 まとめて追加
          </button>
          
          <button
            onClick={() => setIsAutoSpawning(!isAutoSpawning)}
            disabled={stars.length >= maxStars && !isAutoSpawning}
            style={{
              padding: '14px 28px',
              fontSize: '15px',
              fontWeight: '500',
              color: isAutoSpawning ? '#fff' : '#8b7355',
              background: isAutoSpawning 
                ? 'linear-gradient(135deg, #e07b4f 0%, #c4643c 100%)'
                : 'rgba(255, 255, 255, 0.9)',
              border: isAutoSpawning ? 'none' : '2px solid #d4a574',
              borderRadius: '25px',
              cursor: (stars.length >= maxStars && !isAutoSpawning) ? 'not-allowed' : 'pointer',
              opacity: (stars.length >= maxStars && !isAutoSpawning) ? 0.5 : 1,
              boxShadow: isAutoSpawning 
                ? '0 4px 15px rgba(224, 123, 79, 0.4)'
                : '0 4px 15px rgba(0, 0, 0, 0.08)',
              transition: 'all 0.3s ease',
              fontFamily: 'inherit',
              letterSpacing: '1px',
            }}
            onMouseEnter={(e) => {
              if (!(stars.length >= maxStars && !isAutoSpawning)) {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isAutoSpawning ? '⏸ 停止' : '▶ 自動追加'}
          </button>
          
          <button
            onClick={resetStars}
            style={{
              padding: '14px 28px',
              fontSize: '15px',
              fontWeight: '500',
              color: '#8b7355',
              background: 'rgba(255, 255, 255, 0.9)',
              border: '2px solid #d4c4b0',
              borderRadius: '25px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.3s ease',
              fontFamily: 'inherit',
              letterSpacing: '1px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = '#c49464';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#d4c4b0';
            }}
          >
            ↺ リセット
          </button>
        </div>
      </div>
      
      {/* Title */}
      <div style={{
        position: 'absolute',
        top: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '28px',
          fontWeight: '400',
          color: '#5a5048',
          letterSpacing: '8px',
          textTransform: 'uppercase',
        }}>
          星の砂
        </h1>
        <p style={{
          margin: '8px 0 0 0',
          fontSize: '12px',
          color: '#8b7d6b',
          letterSpacing: '3px',
        }}>
          STAR SAND BOTTLE
        </p>
      </div>
      
      {/* Instructions */}
      <div style={{
        position: 'absolute',
        top: '30px',
        right: '30px',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(8px)',
        padding: '16px 20px',
        borderRadius: '12px',
        fontSize: '12px',
        color: '#6b6058',
        lineHeight: '1.8',
        maxWidth: '180px',
      }}>
        <div style={{ marginBottom: '8px', fontWeight: '600', letterSpacing: '1px' }}>操作方法</div>
        <div>🖱 ドラッグで回転</div>
        <div>🔍 スクロールでズーム</div>
      </div>
    </div>
  );
}