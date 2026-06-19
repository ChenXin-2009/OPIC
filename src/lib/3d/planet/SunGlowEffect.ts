import * as THREE from 'three';
import {
  SUN_GLOW_CONFIG,
  SUN_RAINBOW_LAYERS,
  SUN_STAR_SPIKES_CONFIG,
} from '@/lib/config/visualConfig';

export class SunGlowEffect {
  private parentObject: THREE.Object3D;
  private realRadius: number;
  private glowSprite: THREE.Sprite | null = null;
  private rainbowSprites: THREE.Sprite[] = [];
  private starSpikesSprite: THREE.Sprite | null = null;

  constructor(parentObject: THREE.Object3D, realRadius: number) {
    this.parentObject = parentObject;
    this.realRadius = realRadius;
  }

  create(): void {
    this.createMainGlow();
    this.createRainbowLayers();
    if (SUN_STAR_SPIKES_CONFIG.enabled) {
      this.createStarSpikes();
    }
  }

  private createMainGlow(): void {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0.0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.12, 'rgba(255,245,220,0.95)');
    grad.addColorStop(0.28, 'rgba(255,220,120,0.8)');
    grad.addColorStop(0.5, 'rgba(255,180,80,0.45)');
    grad.addColorStop(0.85, 'rgba(255,140,40,0.12)');
    grad.addColorStop(1.0, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    const baseSize = this.realRadius * SUN_GLOW_CONFIG.radiusMultiplier * 2;
    sprite.scale.set(baseSize, baseSize, 1);
    sprite.renderOrder = 999;
    this.glowSprite = sprite;
    this.parentObject.add(sprite);
  }

  private createRainbowLayers(): void {
    this.rainbowSprites = [];
    for (const layer of SUN_RAINBOW_LAYERS) {
      const csize = 512;
      const cCanvas = document.createElement('canvas');
      cCanvas.width = csize;
      cCanvas.height = csize;
      const cctx = cCanvas.getContext('2d')!;

      const cgrad = cctx.createRadialGradient(csize / 2, csize / 2, 0, csize / 2, csize / 2, csize / 2);
      cgrad.addColorStop(0.0, 'rgba(0,0,0,0)');
      cgrad.addColorStop(0.6, `${layer.color}`);
      cgrad.addColorStop(1.0, 'rgba(0,0,0,0)');

      cctx.fillStyle = cgrad;
      cctx.fillRect(0, 0, csize, csize);

      const ctexture = new THREE.CanvasTexture(cCanvas);
      ctexture.needsUpdate = true;

      const mat = new THREE.SpriteMaterial({
        map: ctexture,
        color: 0xffffff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: layer.opacity,
      });

      const spr = new THREE.Sprite(mat);
      const baseSize = this.realRadius * layer.radiusMultiplier * 2;
      spr.scale.set(baseSize, baseSize, 1);
      spr.renderOrder = 998;
      this.parentObject.add(spr);
      this.rainbowSprites.push(spr);
    }
  }

  private createStarSpikes(): void {
    const cfg = SUN_STAR_SPIKES_CONFIG;
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const center = size / 2;
    const spikeLength = size / 2 * 0.92;
    const spikeWidth = cfg.spikeWidth * 3;
    const rotationRad = (cfg.rotationAngle * Math.PI) / 180;

    ctx.clearRect(0, 0, size, size);

    if (cfg.crescentEnabled) {
      const outerRadius = size * cfg.crescentOuterRadius;
      const innerRadius = outerRadius * cfg.crescentInnerRadiusRatio;
      const offsetX = outerRadius * cfg.crescentOffsetRatio;

      const crescentCanvas = document.createElement('canvas');
      crescentCanvas.width = size;
      crescentCanvas.height = size;
      const crescentCtx = crescentCanvas.getContext('2d')!;

      const segments = 30;
      for (let i = segments - 1; i >= 0; i--) {
        const t = i / segments;
        const r = outerRadius * (0.3 + t * 0.7);
        const alpha = Math.pow(1 - t, cfg.crescentFalloff) * cfg.crescentOpacity;

        crescentCtx.beginPath();
        crescentCtx.arc(center, center, r, 0, Math.PI * 2);
        crescentCtx.fillStyle = `${cfg.crescentColor}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
        crescentCtx.fill();
      }

      crescentCtx.globalCompositeOperation = 'destination-out';

      const eraseSegments = 15;
      for (let i = 0; i < eraseSegments; i++) {
        const t = i / eraseSegments;
        const r = innerRadius * (1 - t * 0.15);
        const alpha = 1 - t * 0.8;

        crescentCtx.beginPath();
        crescentCtx.arc(center + offsetX, center, r, 0, Math.PI * 2);
        crescentCtx.fillStyle = `rgba(0,0,0,${alpha})`;
        crescentCtx.fill();
      }

      ctx.drawImage(crescentCanvas, 0, 0);
    }

    for (let i = 0; i < cfg.spikeCount; i++) {
      const angle = rotationRad + (i * Math.PI * 2) / cfg.spikeCount;

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(angle);

      const segs = 20;
      for (let j = 0; j < segs; j++) {
        const t = j / segs;
        const nextT = (j + 1) / segs;
        const x1 = t * spikeLength;
        const x2 = nextT * spikeLength;
        const w1 = spikeWidth * (1 - t * 0.9);
        const w2 = spikeWidth * (1 - nextT * 0.9);
        const alpha1 = Math.pow(1 - t, cfg.falloffExponent);
        const alpha2 = Math.pow(1 - nextT, cfg.falloffExponent);

        ctx.beginPath();
        ctx.moveTo(x1, -w1 / 2);
        ctx.lineTo(x2, -w2 / 2);
        ctx.lineTo(x2, w2 / 2);
        ctx.lineTo(x1, w1 / 2);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(x1, 0, x2, 0);
        gradient.addColorStop(0, `${cfg.color}${Math.round(alpha1 * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${cfg.color}${Math.round(alpha2 * 255).toString(16).padStart(2, '0')}`);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      ctx.restore();
    }

    const coreSize = size * 0.06;
    const coreGradient = ctx.createRadialGradient(center, center, 0, center, center, coreSize);
    coreGradient.addColorStop(0, '#FFFFFF');
    coreGradient.addColorStop(0.4, cfg.color);
    coreGradient.addColorStop(1, `${cfg.color}00`);
    ctx.beginPath();
    ctx.arc(center, center, coreSize, 0, Math.PI * 2);
    ctx.fillStyle = coreGradient;
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    const baseSize = this.realRadius * cfg.lengthMultiplier * 4;
    sprite.scale.set(baseSize, baseSize, 1);
    sprite.renderOrder = 1000;

    this.starSpikesSprite = sprite;
    this.parentObject.add(sprite);
  }

  update(camera: THREE.Camera): void {
    if (!this.glowSprite) return;

    const sunWorldPos = new THREE.Vector3();
    this.parentObject.getWorldPosition(sunWorldPos);
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    const dist = sunWorldPos.distanceTo(camPos);

    let farEnhanceFactor = 1.0;
    const farStart = SUN_GLOW_CONFIG.farEnhanceStartDistance ?? 50;
    const farEnd = SUN_GLOW_CONFIG.farEnhanceEndDistance ?? 200;
    const farSizeMultiplier = SUN_GLOW_CONFIG.farEnhanceSizeMultiplier ?? 3.0;
    const farOpacityMultiplier = SUN_GLOW_CONFIG.farEnhanceOpacityMultiplier ?? 1.5;

    if (dist >= farEnd) {
      farEnhanceFactor = 1.0;
    } else if (dist > farStart) {
      farEnhanceFactor = (dist - farStart) / (farEnd - farStart);
    } else {
      farEnhanceFactor = 0;
    }

    const sizeEnhance = 1 + farEnhanceFactor * (farSizeMultiplier - 1);
    const opacityEnhance = 1 + farEnhanceFactor * (farOpacityMultiplier - 1);

    const apparentAngle = Math.max(0.02, Math.min(0.8, (this.realRadius * 3) / (dist / 10)));
    let targetSize = dist * apparentAngle * sizeEnhance;

    const veryFarStart = SUN_GLOW_CONFIG.veryFarLimitStartDistance ?? 5000;
    const maxAbsSize = SUN_GLOW_CONFIG.maxAbsoluteSize ?? 100;

    if (dist > veryFarStart) {
      targetSize = Math.min(targetSize, maxAbsSize);
    }

    const current = this.glowSprite.scale.x;
    const needsShrink = targetSize < current;
    const lerpSpeed = needsShrink && dist > veryFarStart ? 0.5 : 0.12;
    const clampedCurrent = dist > veryFarStart ? Math.min(current, maxAbsSize * 1.2) : current;
    const lerped = clampedCurrent + (targetSize - clampedCurrent) * lerpSpeed;
    this.glowSprite.scale.set(lerped, lerped, 1);

    const mat = this.glowSprite.material as THREE.SpriteMaterial;
    if (mat) {
      const baseIntensity = Math.max(0.2, Math.min(1.6, (200 / (dist + 50))));
      const intensity = baseIntensity * opacityEnhance;
      mat.opacity = Math.min(1.0, SUN_GLOW_CONFIG.opacity * intensity);
      mat.needsUpdate = true;
    }

    for (let i = 0; i < this.rainbowSprites.length; i++) {
      const rs = this.rainbowSprites[i];
      const layer = SUN_RAINBOW_LAYERS[i];
      const currentRs = rs.scale.x;
      const targetRs = lerped * (layer.radiusMultiplier / SUN_GLOW_CONFIG.radiusMultiplier);
      const rsNeedsShrink = targetRs < currentRs;
      const rsLerpSpeed = rsNeedsShrink && dist > veryFarStart ? 0.5 : 0.08;
      const newRs = currentRs + (targetRs - currentRs) * rsLerpSpeed;
      rs.scale.set(newRs, newRs, 1);
      const rmat = rs.material as THREE.SpriteMaterial;
      if (rmat) {
        const baseRIntensity = Math.max(0.02, Math.min(0.6, (120 / (dist + 30))));
        const rIntensity = baseRIntensity * opacityEnhance;
        rmat.opacity = Math.min(1.0, layer.opacity * rIntensity);
        rmat.needsUpdate = true;
      }
    }

    if (this.starSpikesSprite && SUN_STAR_SPIKES_CONFIG.enabled) {
      const spikeCfg = SUN_STAR_SPIKES_CONFIG;
      const spikeMat = this.starSpikesSprite.material as THREE.SpriteMaterial;

      let spikeVisibility = 0;
      if (dist >= spikeCfg.showFullDistance) {
        spikeVisibility = 1.0;
      } else if (dist > spikeCfg.showStartDistance) {
        spikeVisibility = (dist - spikeCfg.showStartDistance) / (spikeCfg.showFullDistance - spikeCfg.showStartDistance);
      }

      const spikeTargetSize = lerped * spikeCfg.lengthMultiplier;
      const currentSpikeSize = this.starSpikesSprite.scale.x;
      const spikeNeedsShrink = spikeTargetSize < currentSpikeSize;
      const spikeLerpSpeed = spikeNeedsShrink && dist > veryFarStart ? 0.5 : 0.1;
      const newSpikeSize = currentSpikeSize + (spikeTargetSize - currentSpikeSize) * spikeLerpSpeed;
      this.starSpikesSprite.scale.set(newSpikeSize, newSpikeSize, 1);

      if (spikeMat) {
        spikeMat.opacity = spikeCfg.opacity * spikeVisibility;
        spikeMat.needsUpdate = true;
      }
    }
  }

  dispose(): void {
    if (this.glowSprite) {
      this.glowSprite.material.dispose();
      if (this.glowSprite.parent) this.glowSprite.parent.remove(this.glowSprite);
      this.glowSprite = null;
    }

    this.rainbowSprites.forEach(spr => {
      spr.material.dispose();
      if (spr.parent) spr.parent.remove(spr);
    });
    this.rainbowSprites = [];

    if (this.starSpikesSprite) {
      this.starSpikesSprite.material.dispose();
      if (this.starSpikesSprite.parent) this.starSpikesSprite.parent.remove(this.starSpikesSprite);
      this.starSpikesSprite = null;
    }
  }
}
