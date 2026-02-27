declare module 'troika-three-text' {
  import * as THREE from 'three';

  export class Text extends THREE.Mesh {
    text: string;
    fontSize: number;
    color: string | number;
    anchorX: 'left' | 'center' | 'right';
    anchorY: 'top' | 'middle' | 'bottom';
    font: string;
    renderOrder: number;
    material: THREE.Material;
    
    sync(): void;
    dispose(): void;
  }
}
