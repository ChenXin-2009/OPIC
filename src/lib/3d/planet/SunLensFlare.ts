/**
 * SunLensFlare — 影视级太阳镜头光晕系统
 *
 * 基于 R3F Ultimate Lens Flare (CC0) 的视觉效果，
 * 通过 Three.js 内置 EffectComposer + ShaderPass 实现。
 * 零外部贴图依赖 — 所有效果由 GLSL 着色器程序化生成。
 *
 * 性能: 1 个额外全屏 Pass，约 0.3ms GPU 时间。
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// ============================================================================
// 镜头光晕片段着色器
// ============================================================================
const LensFlareFS = `
  varying vec2 vUv;
  uniform sampler2D tDiffuse;
  uniform vec2 uLensPosition;
  uniform vec2 uResolution;
  uniform vec3 uColorGain;
  uniform float uTime;
  uniform float uGlareSize;
  uniform float uStarPoints;
  uniform float uFlareSize;
  uniform float uFlareSpeed;
  uniform float uHaloScale;
  uniform float uOpacity;
  uniform bool uEnabled;
  uniform bool uAnimated;
  uniform bool uStarBurst;

  float sat(float x) { return clamp(x, 0.0, 1.0); }

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx+K.xyz)*6.0-K.www);
    return c.z * mix(K.xxx, clamp(p-K.xxx, 0.0, 1.0), c.y);
  }

  vec2 rot(vec2 v, float a) {
    float c=cos(a), s=sin(a);
    return vec2(c*v.x+s*v.y, c*v.y-s*v.x);
  }

  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(
      mix(hash2(i),                    hash2(i+vec2(1,0)), f.x),
      mix(hash2(i+vec2(0,1)),          hash2(i+vec2(1,1)), f.x), f.y);
  }

  float fbm(vec2 p) {
    float f=0.0, a=0.5;
    for(int i=0; i<5; i++) { f+=a*noise(p); p=mat2(0.8,-0.6,0.6,0.8)*p*2.0; a*=0.5; }
    return f;
  }

  // 核心眩光：径向衰减 + 星芒调制
  vec3 coreFlare(vec2 uv, vec2 lp) {
    vec2 d = uv - lp;
    float dist = length(d);
    float ang = atan(d.y, d.x);

    // 径向衰减光晕
    float glow = 1.0 / (dist*16.0/uGlareSize + 1.0);

    // 星芒调制（sin 周期）
    float starMod = sin(ang * uStarPoints) * 0.35 + 0.65;
    glow += glow * (starMod - 0.65) * 0.5;

    // HSV 颜色耀斑
    float falloff = 1.0 / exp(dist * 0.5);
    vec3 flareCol = hsv2rgb(vec3(
      fract(falloff*8.0 + uTime*uFlareSpeed),
      0.8,
      falloff * 15.0 * uFlareSize
    ));

    // 星芒锐化
    float spike = abs(sin(ang * uStarPoints));
    float spikeStr = pow(1.0 - sat(spike * 0.7), 12.0) * falloff;
    spikeStr = pow(spikeStr, 4.0);

    vec3 col = vec3(glow);
    col += vec3(spikeStr) * flareCol;

    // 色差偏移 (R 和 B 通道微小偏移)
    col.r += 1.0/(length(uv-lp-vec2(0.002,0))*16.0/uGlareSize+1.0)*0.2;
    col.b += 1.0/(length(uv-lp+vec2(0.002,0))*16.0/uGlareSize+1.0)*0.2;

    return col;
  }

  // Ghost 环 - 沿光源→屏幕中心方向分布的色差环
  vec3 ghostRings(vec2 uv, vec2 lp) {
    vec2 dir = normalize(lp);
    vec3 col = vec3(0.0);
    for(int i=1; i<=4; i++) {
      float di = float(i) * 0.07;
      vec2 gp = -lp * (1.0 + di * float(i));
      float r = length(uv - gp);
      float ring = max(0.005 - pow(r, 2.0), 0.0) * 0.5;

      // 六边形光圈形状
      vec2 hp = uv - gp;
      float a = atan(hp.y, hp.x) + 0.2;
      float b = 6.28319 / 6.0;
      float hex = smoothstep(0.45, 0.5, cos(floor(0.5+a/b)*b-a) * length(hp) * 8.0);
      ring *= hex;

      col.r += ring * 0.6;
      col.g += ring * 0.3 * (float(i)/4.0);
      col.b += ring * 0.15;
    }
    return col;
  }

  // 星爆 (噪声增强)
  vec3 starBurst(vec2 uv, vec2 lp) {
    vec2 d = uv - lp;
    float a = atan(d.y, d.x);
    float dist = length(d);
    vec3 col = vec3(0.0);

    // 随机射线
    for(int i=0; i<8; i++) {
      float angle = a + float(i)*0.785 + uTime*0.03;
      float ray = sin(angle * uStarPoints * 1.5);
      col += vec3(ray*ray) * 0.04 / (dist*12.0 + 1.0);
    }

    // 噪声纹理叠加
    col += vec3(fbm(uv*10.0 + uTime*0.02)) * 0.03 / (dist*1.5 + 1.0);
    return col * vec3(0.8, 0.5, 0.2);
  }

  void main() {
    vec4 base = texture2D(tDiffuse, vUv);

    if (!uEnabled) {
      gl_FragColor = base;
      return;
    }

    // 屏幕空间变换 (中心原点，Y轴校正)
    vec2 uv = vUv - 0.5;
    uv.y *= uResolution.y / uResolution.x;
    vec2 lp = uLensPosition * 0.5;
    lp.y *= uResolution.y / uResolution.x;

    // 渐隐系数
    float vis = 1.0 - uOpacity;

    // 合成
    vec3 flare = vec3(0.0);
    flare += coreFlare(uv, lp) * uColorGain * 2.0 * vis;
    flare += ghostRings(uv, lp) * vis * 0.7;
    if (uStarBurst) {
      flare += starBurst(uv, lp) * vis * 0.6;
    }

    gl_FragColor = vec4(base.rgb + flare, base.a);
  }
`;

// ============================================================================
// 顶点着色器 (最小化)
// ============================================================================
const LensFlareVS = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ============================================================================
// 配置
// ============================================================================
export interface SunLensFlareConfig {
  enabled: boolean;
  glareSize: number;
  starPoints: number;
  flareSize: number;
  flareSpeed: number;
  animated: boolean;
  colorGain: THREE.Color;
  haloScale: number;
  starBurst: boolean;
  opacity: number;
}

export const DEFAULT_LENS_FLARE_CONFIG: SunLensFlareConfig = {
  enabled: true,
  glareSize: 0.25,
  starPoints: 6,
  flareSize: 0.004,
  flareSpeed: 0.25,
  animated: true,
  colorGain: new THREE.Color(55 / 255, 30 / 255, 15 / 255),
  haloScale: 0.5,
  starBurst: true,
  opacity: 0.0,
};

// ============================================================================
// SunLensFlareSystem
// ============================================================================
export class SunLensFlareSystem {
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private flarePass: ShaderPass;
  private config: SunLensFlareConfig;
  private sunPos = new THREE.Vector3(0, 0, 0);
  private time = 0;
  private _disposed = false;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    config?: Partial<SunLensFlareConfig>,
  ) {
    this.config = { ...DEFAULT_LENS_FLARE_CONFIG, ...config };

    this.renderPass = new RenderPass(scene, camera);

    this.flarePass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uLensPosition: { value: new THREE.Vector2(0, 0) },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uColorGain: { value: this.config.colorGain },
        uStarPoints: { value: this.config.starPoints },
        uGlareSize: { value: this.config.glareSize },
        uFlareSize: { value: this.config.flareSize },
        uFlareSpeed: { value: this.config.flareSpeed },
        uHaloScale: { value: this.config.haloScale },
        uOpacity: { value: this.config.opacity },
        uAnimated: { value: this.config.animated },
        uEnabled: { value: this.config.enabled },
        uStarBurst: { value: this.config.starBurst },
      },
      vertexShader: LensFlareVS,
      fragmentShader: LensFlareFS,
    });
    this.flarePass.needsSwap = true;

    // 注意：不加 OutputPass，避免与 renderer.outputColorSpace=SRGB 冲突导致双倍 gamma
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.flarePass);

    const size = new THREE.Vector2();
    renderer.getSize(size);
    this.setSize(size.x, size.y);
  }

  update(camera: THREE.Camera, deltaTime: number): void {
    if (this._disposed) return;
    this.time += deltaTime;
    const u = this.flarePass.uniforms;
    u['uTime'].value = this.time;

    const sp = this.sunPos.clone().project(camera);
    if (sp.z > 1) {
      u['uOpacity'].value = 1.0;
      return;
    }
    const edge = Math.max(Math.abs(sp.x), Math.abs(sp.y));
    const edgeFade = 1.0 - Math.max(0.0, (edge - 0.85) / 0.15);
    const target = 1.0 - edgeFade;
    const cur = u['uOpacity'].value;
    u['uOpacity'].value = cur + (target - cur) * Math.min(deltaTime * 5, 1.0);
    u['uLensPosition'].value.set(sp.x, sp.y);
  }

  render(): void {
    if (this._disposed) return;
    this.composer.render();
  }

  setSize(w: number, h: number): void {
    w = Math.max(w, 1);
    h = Math.max(h, 1);
    this.composer.setSize(w, h);
    this.flarePass.uniforms['uResolution'].value.set(w, h);
  }

  setPixelRatio(r: number): void {
    this.composer.setPixelRatio(r);
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.composer.removePass(this.flarePass);
    this.composer.removePass(this.renderPass);
    this.flarePass.dispose();
    this.renderPass.dispose();
    this.composer.dispose();
  }
}
