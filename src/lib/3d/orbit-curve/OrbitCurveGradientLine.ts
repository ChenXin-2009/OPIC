import * as THREE from 'three';
import { ORBIT_GRADIENT_CONFIG, ORBIT_RENDER_CONFIG } from '@/lib/config/visualConfig';
import { parseHexColor, computeGradientColors, getLineOpacity } from './OrbitCurveColor';

export function createOrbitLine(
  points: THREE.Vector3[],
  orbitColor: string,
  planetPosition: THREE.Vector3 | null
): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  let material: THREE.LineBasicMaterial;
  const shouldUseGradient = ORBIT_GRADIENT_CONFIG.enabled && planetPosition;
  const lineOpacity = getLineOpacity();

  if (shouldUseGradient) {
    const rgb = parseHexColor(orbitColor);
    const colors = computeGradientColors(points, planetPosition, rgb, lineOpacity);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: lineOpacity < 1.0,
      opacity: 1.0,
      depthWrite: true,
      depthTest: true,
      linewidth: ORBIT_RENDER_CONFIG.lineWidth,
    });
  } else {
    const threeColor = new THREE.Color(orbitColor || '#ffffff');
    material = new THREE.LineBasicMaterial({
      color: threeColor,
      opacity: lineOpacity,
      transparent: lineOpacity < 1.0,
      depthWrite: true,
      depthTest: true,
      linewidth: ORBIT_RENDER_CONFIG.lineWidth,
    });
  }

  return new THREE.Line(geometry, material);
}
