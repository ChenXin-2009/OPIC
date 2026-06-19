import * as THREE from 'three';
import type { OrbitalElements } from '@/lib/astronomy/orbit';

export function generateOrbitPoints(
  elements: OrbitalElements,
  segments: number,
  julianDay?: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];

  let elem = elements;
  if (julianDay !== undefined) {
    const T = (julianDay - 2451545.0) / 36525.0;
    elem = {
      ...elements,
      a: elements.a + elements.a_dot * T,
      e: elements.e + elements.e_dot * T,
      i: elements.i + elements.i_dot * T,
      L: elements.L + elements.L_dot * T,
      w_bar: elements.w_bar + elements.w_bar_dot * T,
      O: elements.O + elements.O_dot * T,
    };
  }

  const w = elem.w_bar - elem.O;
  const cos_w = Math.cos(w);
  const sin_w = Math.sin(w);
  const cos_O = Math.cos(elem.O);
  const sin_O = Math.sin(elem.O);
  const cos_i = Math.cos(elem.i);
  const sin_i = Math.sin(elem.i);

  for (let idx = 0; idx <= segments; idx++) {
    const nu = (idx / segments) * Math.PI * 2;
    const r = (elem.a * (1 - elem.e * elem.e)) / (1 + elem.e * Math.cos(nu));
    const x_orb = r * Math.cos(nu);
    const y_orb = r * Math.sin(nu);

    const x = (cos_w * cos_O - sin_w * sin_O * cos_i) * x_orb +
              (-sin_w * cos_O - cos_w * sin_O * cos_i) * y_orb;
    const y = (cos_w * sin_O + sin_w * cos_O * cos_i) * x_orb +
              (-sin_w * sin_O + cos_w * cos_O * cos_i) * y_orb;
    const z = (sin_w * sin_i) * x_orb + (cos_w * sin_i) * y_orb;

    points.push(new THREE.Vector3(x, y, z));
  }

  if (points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];
    if (first.distanceTo(last) > 0.0001) {
      points.push(first.clone());
    }
  }

  return points;
}
