/**
 * TrailLine - Renders a trail behind moving celestial bodies
 * 
 * Similar to NASA Eyes, shows the recent path of a body
 */

import * as THREE from 'three';

export class TrailLine {
  private line: THREE.Line;
  private positions: THREE.Vector3[] = [];
  private maxPoints: number;
  private geometry: THREE.BufferGeometry;
  private material: THREE.LineBasicMaterial;

  constructor(
    color: string,
    maxPoints: number = 100,
    lineWidth: number = 1
  ) {
    this.maxPoints = maxPoints;

    // Create material
    this.material = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.6,
      linewidth: lineWidth
    });

    // Create geometry
    this.geometry = new THREE.BufferGeometry();
    
    // Initialize with empty positions
    const positionsArray = new Float32Array(maxPoints * 3);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positionsArray, 3));
    this.geometry.setDrawRange(0, 0);

    // Create line
    this.line = new THREE.Line(this.geometry, this.material);
    this.line.frustumCulled = false;
  }

  /**
   * Add a new position to the trail
   * 
   * @param position - New position to add
   */
  addPosition(position: THREE.Vector3): void {
    // Add new position
    this.positions.push(position.clone());

    // Remove oldest position if we exceed max points
    if (this.positions.length > this.maxPoints) {
      this.positions.shift();
    }

    // Update geometry
    this.updateGeometry();
  }

  /**
   * Update the geometry with current positions
   */
  private updateGeometry(): void {
    const positionsArray = this.geometry.attributes.position.array as Float32Array;

    // Fill positions array
    for (let i = 0; i < this.positions.length; i++) {
      const pos = this.positions[i];
      positionsArray[i * 3] = pos.x;
      positionsArray[i * 3 + 1] = pos.y;
      positionsArray[i * 3 + 2] = pos.z;
    }

    // Update draw range
    this.geometry.setDrawRange(0, this.positions.length);
    this.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Clear all trail positions
   */
  clear(): void {
    this.positions = [];
    this.geometry.setDrawRange(0, 0);
  }

  /**
   * Get the THREE.Line object
   */
  getLine(): THREE.Line {
    return this.line;
  }

  /**
   * Update trail color
   */
  setColor(color: string): void {
    this.material.color.set(color);
  }

  /**
   * Update trail opacity
   */
  setOpacity(opacity: number): void {
    this.material.opacity = opacity;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
