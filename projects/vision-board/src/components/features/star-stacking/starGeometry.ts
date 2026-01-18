import * as THREE from 'three';
import { STAR_STACK_CONFIG } from '@/constants/starStack';

/**
 * Creates a 4-pointed star bipyramid geometry (Gemini-style)
 *
 * Structure:
 * - Center top apex
 * - Center bottom apex
 * - 4 outer points on equator
 * - 4 inner (concave) points on equator
 */
export function createStarGeometry(
  outerRadius: number = STAR_STACK_CONFIG.STAR.OUTER_RADIUS,
  innerRadius: number = STAR_STACK_CONFIG.STAR.INNER_RADIUS,
  height: number = STAR_STACK_CONFIG.STAR.HEIGHT
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  const topApex = new THREE.Vector3(0, height, 0);
  const bottomApex = new THREE.Vector3(0, -height, 0);

  const outerPoints: THREE.Vector3[] = [];
  const innerPoints: THREE.Vector3[] = [];

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const innerAngle = angle + Math.PI / 4;

    outerPoints.push(
      new THREE.Vector3(
        Math.cos(angle) * outerRadius,
        0,
        Math.sin(angle) * outerRadius
      )
    );

    innerPoints.push(
      new THREE.Vector3(
        Math.cos(innerAngle) * innerRadius,
        0,
        Math.sin(innerAngle) * innerRadius
      )
    );
  }

  const vertices: number[] = [];
  const normals: number[] = [];

  const addTriangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ac = new THREE.Vector3().subVectors(c, a);
    const normal = new THREE.Vector3().crossVectors(ab, ac).normalize();

    vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    normals.push(
      normal.x, normal.y, normal.z,
      normal.x, normal.y, normal.z,
      normal.x, normal.y, normal.z
    );
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
