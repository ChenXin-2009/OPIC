/**
 * Material utility functions for 3D rendering.
 * 
 * This module provides reusable functions for creating and configuring
 * Three.js materials with common settings and properties.
 */

import * as THREE from 'three';

/**
 * Creates a basic line material with specified color and properties.
 * 
 * Generates a LineBasicMaterial with common settings for rendering lines.
 * 
 * @param color - Line color (hex number or THREE.Color)
 * @param opacity - Line opacity (0-1, default: 1)
 * @param linewidth - Line width (default: 1, note: may not work on all platforms)
 * @returns Configured LineBasicMaterial
 * 
 * @example
 * ```typescript
 * const material = createLineMaterial(0xff0000, 0.8, 2);
 * const line = new THREE.Line(geometry, material);
 * ```
 */
export function createLineMaterial(
  color: number | THREE.Color,
  opacity: number = 1,
  linewidth: number = 1
): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    opacity,
    transparent: opacity < 1,
    linewidth,
  });
}

/**
 * Creates a basic mesh material with specified color and properties.
 * 
 * Generates a MeshBasicMaterial suitable for simple, unlit objects.
 * 
 * @param color - Material color (hex number or THREE.Color)
 * @param opacity - Material opacity (0-1, default: 1)
 * @param side - Which side to render (default: FrontSide)
 * @returns Configured MeshBasicMaterial
 * 
 * @example
 * ```typescript
 * const material = createBasicMaterial(0x00ff00, 0.5, THREE.DoubleSide);
 * const mesh = new THREE.Mesh(geometry, material);
 * ```
 */
export function createBasicMaterial(
  color: number | THREE.Color,
  opacity: number = 1,
  side: THREE.Side = THREE.FrontSide
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    opacity,
    transparent: opacity < 1,
    side,
  });
}

/**
 * Creates a standard physically-based material.
 * 
 * Generates a MeshStandardMaterial with PBR properties for realistic rendering.
 * 
 * @param options - Material configuration options
 * @returns Configured MeshStandardMaterial
 * 
 * @example
 * ```typescript
 * const material = createStandardMaterial({
 *   color: 0x888888,
 *   metalness: 0.5,
 *   roughness: 0.7,
 *   map: texture
 * });
 * ```
 */
export function createStandardMaterial(options: {
  color?: number | THREE.Color;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  map?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  emissive?: number | THREE.Color;
  emissiveIntensity?: number;
  side?: THREE.Side;
}): THREE.MeshStandardMaterial {
  const {
    color = 0xffffff,
    metalness = 0,
    roughness = 1,
    opacity = 1,
    map = null,
    normalMap = null,
    emissive = 0x000000,
    emissiveIntensity = 0,
    side = THREE.FrontSide,
  } = options;

  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    opacity,
    transparent: opacity < 1,
    map,
    normalMap,
    emissive,
    emissiveIntensity,
    side,
  });
}

/**
 * Creates a points material for particle systems.
 * 
 * Generates a PointsMaterial suitable for rendering point clouds or particles.
 * 
 * @param options - Material configuration options
 * @returns Configured PointsMaterial
 * 
 * @example
 * ```typescript
 * const material = createPointsMaterial({
 *   color: 0xffffff,
 *   size: 2,
 *   sizeAttenuation: true
 * });
 * const points = new THREE.Points(geometry, material);
 * ```
 */
export function createPointsMaterial(options: {
  color?: number | THREE.Color;
  size?: number;
  opacity?: number;
  sizeAttenuation?: boolean;
  map?: THREE.Texture | null;
  blending?: THREE.Blending;
}): THREE.PointsMaterial {
  const {
    color = 0xffffff,
    size = 1,
    opacity = 1,
    sizeAttenuation = true,
    map = null,
    blending = THREE.NormalBlending,
  } = options;

  return new THREE.PointsMaterial({
    color,
    size,
    opacity,
    transparent: opacity < 1,
    sizeAttenuation,
    map,
    blending,
  });
}

/**
 * Creates a sprite material for 2D elements in 3D space.
 * 
 * Generates a SpriteMaterial suitable for billboards and labels.
 * 
 * @param options - Material configuration options
 * @returns Configured SpriteMaterial
 * 
 * @example
 * ```typescript
 * const material = createSpriteMaterial({
 *   map: texture,
 *   color: 0xffffff,
 *   opacity: 0.8
 * });
 * const sprite = new THREE.Sprite(material);
 * ```
 */
export function createSpriteMaterial(options: {
  map?: THREE.Texture | null;
  color?: number | THREE.Color;
  opacity?: number;
  blending?: THREE.Blending;
  rotation?: number;
}): THREE.SpriteMaterial {
  const {
    map = null,
    color = 0xffffff,
    opacity = 1,
    blending = THREE.NormalBlending,
    rotation = 0,
  } = options;

  return new THREE.SpriteMaterial({
    map,
    color,
    opacity,
    transparent: opacity < 1,
    blending,
    rotation,
  });
}

/**
 * Creates a shader material with custom uniforms.
 * 
 * Generates a ShaderMaterial with specified vertex and fragment shaders.
 * 
 * @param vertexShader - GLSL vertex shader code
 * @param fragmentShader - GLSL fragment shader code
 * @param uniforms - Shader uniforms
 * @param options - Additional material options
 * @returns Configured ShaderMaterial
 * 
 * @example
 * ```typescript
 * const material = createShaderMaterial(
 *   vertexShaderCode,
 *   fragmentShaderCode,
 *   {
 *     uTime: { value: 0 },
 *     uColor: { value: new THREE.Color(0xff0000) }
 *   },
 *   { transparent: true }
 * );
 * ```
 */
export function createShaderMaterial(
  vertexShader: string,
  fragmentShader: string,
  uniforms: { [uniform: string]: THREE.IUniform } = {},
  options: {
    transparent?: boolean;
    side?: THREE.Side;
    depthWrite?: boolean;
    blending?: THREE.Blending;
  } = {}
): THREE.ShaderMaterial {
  const {
    transparent = false,
    side = THREE.FrontSide,
    depthWrite = true,
    blending = THREE.NormalBlending,
  } = options;

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent,
    side,
    depthWrite,
    blending,
  });
}

/**
 * Updates material opacity with proper transparency settings.
 * 
 * Sets material opacity and ensures transparency flag is correctly configured.
 * 
 * @param material - Material to update
 * @param opacity - New opacity value (0-1)
 * 
 * @example
 * ```typescript
 * setMaterialOpacity(mesh.material, 0.5);
 * ```
 */
export function setMaterialOpacity(
  material: THREE.Material,
  opacity: number
): void {
  material.opacity = opacity;
  material.transparent = opacity < 1;
  material.needsUpdate = true;
}

/**
 * Updates material color.
 * 
 * Sets the color property of materials that support it.
 * 
 * @param material - Material to update
 * @param color - New color (hex number or THREE.Color)
 * 
 * @example
 * ```typescript
 * setMaterialColor(mesh.material, 0xff0000);
 * setMaterialColor(mesh.material, new THREE.Color('red'));
 * ```
 */
export function setMaterialColor(
  material: THREE.Material,
  color: number | THREE.Color
): void {
  if ('color' in material) {
    if (typeof color === 'number') {
      (material as any).color.setHex(color);
    } else {
      (material as any).color.copy(color);
    }
    material.needsUpdate = true;
  }
}

/**
 * Clones a material with optional property overrides.
 * 
 * Creates a deep copy of a material and optionally modifies properties.
 * 
 * @param material - Material to clone
 * @param overrides - Properties to override in the clone
 * @returns Cloned material with overrides applied
 * 
 * @example
 * ```typescript
 * const newMaterial = cloneMaterial(originalMaterial, {
 *   opacity: 0.5,
 *   color: 0xff0000
 * });
 * ```
 */
export function cloneMaterial<T extends THREE.Material>(
  material: T,
  overrides: Partial<T> = {}
): T {
  const cloned = material.clone() as T;
  Object.assign(cloned, overrides);
  return cloned;
}

/**
 * Disposes of a material and its associated textures.
 * 
 * Properly cleans up material resources to prevent memory leaks.
 * 
 * @param material - Material to dispose
 * @param disposeTextures - Whether to also dispose textures (default: false)
 * 
 * @example
 * ```typescript
 * disposeMaterial(oldMaterial, true);
 * ```
 */
export function disposeMaterial(
  material: THREE.Material,
  disposeTextures: boolean = false
): void {
  if (disposeTextures) {
    // Dispose textures if requested
    const textureProperties = ['map', 'normalMap', 'bumpMap', 'specularMap', 
                               'emissiveMap', 'alphaMap', 'roughnessMap', 
                               'metalnessMap', 'envMap'];
    
    textureProperties.forEach(prop => {
      if (prop in material) {
        const texture = (material as any)[prop];
        if (texture && texture.dispose) {
          texture.dispose();
        }
      }
    });
  }
  
  material.dispose();
}

/**
 * Creates a double-sided version of a material.
 * 
 * Clones a material and sets it to render both sides.
 * 
 * @param material - Material to make double-sided
 * @returns Double-sided material
 * 
 * @example
 * ```typescript
 * const doubleSided = makeDoubleSided(singleSidedMaterial);
 * ```
 */
export function makeDoubleSided<T extends THREE.Material>(material: T): T {
  return cloneMaterial(material, { side: THREE.DoubleSide } as any);
}

/**
 * Creates a wireframe version of a material.
 * 
 * Clones a material and enables wireframe rendering.
 * 
 * @param material - Material to make wireframe
 * @returns Wireframe material
 * 
 * @example
 * ```typescript
 * const wireframe = makeWireframe(solidMaterial);
 * ```
 */
export function makeWireframe<T extends THREE.Material>(material: T): T {
  if ('wireframe' in material) {
    return cloneMaterial(material, { wireframe: true } as any);
  }
  return cloneMaterial(material);
}
