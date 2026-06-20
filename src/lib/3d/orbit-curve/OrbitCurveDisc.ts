import * as THREE from 'three';
import { ORBIT_STYLE_CONFIG } from '@/lib/config/visualConfig';

let gradientTexture: THREE.Texture | null = null;

/** Create or return cached radial gradient texture for orbit disc fade. */
function getOrCreateGradientTexture(): THREE.Texture {
  if (gradientTexture) return gradientTexture;

  if (typeof document === 'undefined') {
    gradientTexture = new THREE.Texture();
    return gradientTexture;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 64;
  const context = canvas.getContext('2d')!;

  const gradient = context.createLinearGradient(0, 64, 0, 0);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(1, `rgba(255, 255, 255, ${ORBIT_STYLE_CONFIG.fillAlpha})`);

  context.fillStyle = gradient;
  context.fillRect(0, 0, 2, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  gradientTexture = texture;
  return texture;
}

/** Dispose the shared gradient texture when no longer needed. */
export function disposeOrbitDiscTexture(): void {
  if (gradientTexture) {
    gradientTexture.dispose();
    gradientTexture = null;
  }
}

/** Create a filled orbit disc mesh (ring between outer path and scaled inner path). */
export function createOrbitDisc(points: THREE.Vector3[], orbitColor: string): THREE.Mesh | null {
  if (points.length < 2) return null;

  const vertexCount = points.length;
  const positions = new Float32Array(vertexCount * 2 * 3);
  const uvs = new Float32Array(vertexCount * 2 * 2);
  const indices: number[] = [];

  const innerRatio = ORBIT_STYLE_CONFIG.innerRadiusRatio;

  for (let i = 0; i < vertexCount; i++) {
    const point = points[i];

    positions[i * 6] = point.x;
    positions[i * 6 + 1] = point.y;
    positions[i * 6 + 2] = point.z;

    positions[i * 6 + 3] = point.x * innerRatio;
    positions[i * 6 + 4] = point.y * innerRatio;
    positions[i * 6 + 5] = point.z * innerRatio;

    uvs[i * 4] = 0;
    uvs[i * 4 + 1] = 1;
    uvs[i * 4 + 2] = 0;
    uvs[i * 4 + 3] = 0;
  }

  for (let i = 0; i < vertexCount - 1; i++) {
    const outerCurrent = 2 * i;
    const innerCurrent = 2 * i + 1;
    const outerNext = 2 * (i + 1);
    const innerNext = 2 * (i + 1) + 1;

    indices.push(outerCurrent, innerCurrent, outerNext);
    indices.push(innerCurrent, innerNext, outerNext);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(orbitColor),
    map: getOrCreateGradientTexture(),
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
  });

  return new THREE.Mesh(geometry, material);
}
