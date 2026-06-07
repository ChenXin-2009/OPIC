import * as THREE from 'three';
import {
  SUN_SHADER_CONFIG,
  PLANET_LIGHTING_CONFIG,
  getCelestialMaterialParams,
} from '@/lib/config/visualConfig';

export function createSunShaderMaterial(): THREE.ShaderMaterial {
  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  
  const fragmentShader = `
    uniform float uTime;
    uniform vec3 uSunColor;
    uniform float uIntensity;
    uniform float uLimbDarkeningStrength;
    uniform float uTurbulenceStrength;
    uniform float uGranuleStrength;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      
      for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
      }
      
      return value;
    }
    
    void main() {
      vec3 viewDirection = normalize(cameraPosition - vPosition);
      float fresnel = dot(viewDirection, vNormal);
      
      float limbDarkening = pow(fresnel, uLimbDarkeningStrength);
      
      vec2 uvDistorted = vUv * 8.0 + uTime;
      float turbulence = fbm(uvDistorted) * uTurbulenceStrength;
      
      vec2 uvGranules = vUv * 40.0 + uTime * 2.0;
      float granules = noise(uvGranules) * uGranuleStrength;
      
      float brightness = limbDarkening + turbulence + granules;
      brightness = clamp(brightness, 0.7, 1.3);
      
      vec3 finalColor = uSunColor * brightness * uIntensity;
      
      float edgeGlow = pow(1.0 - fresnel, 3.0) * 0.3;
      finalColor += vec3(edgeGlow);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;
  
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0.0 },
      uSunColor: { value: new THREE.Color(SUN_SHADER_CONFIG.color) },
      uIntensity: { value: SUN_SHADER_CONFIG.intensity },
      uLimbDarkeningStrength: { value: SUN_SHADER_CONFIG.limbDarkeningStrength },
      uTurbulenceStrength: { value: SUN_SHADER_CONFIG.turbulenceStrength },
      uGranuleStrength: { value: SUN_SHADER_CONFIG.granuleStrength },
    },
    side: THREE.FrontSide,
  });
}

export function createPlanetShaderMaterial(planetName: string, color: string): THREE.ShaderMaterial {
  const params = getCelestialMaterialParams(planetName);
  
  const vertexShader = `
    #include <common>
    #include <logdepthbuf_pars_vertex>
    
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vPosition;
    varying vec3 vViewDirection;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      
      vViewDirection = normalize(cameraPosition - worldPosition.xyz);
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      
      #include <logdepthbuf_vertex>
    }
  `;
  
  const fragmentShader = `
    #include <common>
    #include <logdepthbuf_pars_fragment>
    
    uniform vec3 uColor;
    uniform vec3 uSunPosition;
    uniform sampler2D uDayTexture;
    uniform sampler2D uNightTexture;
    uniform float uHasTexture;
    uniform float uHasNightTexture;
    uniform float uAmbientIntensity;
    uniform float uTerminatorWidth;
    uniform float uNightMapIntensity;
    
    uniform float uContrastBoost;
    uniform float uSaturationBoost;
    uniform float uGamma;
    uniform float uMaxDaylightIntensity;
    uniform float uMinNightIntensity;
    
    uniform float uEnableFresnel;
    uniform float uFresnelIntensity;
    uniform vec3 uFresnelColor;
    uniform float uFresnelPower;
    
    uniform float uPoleBlendStart;
    uniform float uPoleBlendEnd;
    uniform float uPoleSampleCount;
    uniform float uPoleSampleRadius;
    
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vPosition;
    varying vec3 vViewDirection;
    
    vec3 adjustContrast(vec3 color, float contrast) {
      return (color - 0.5) * contrast + 0.5;
    }
    
    vec3 adjustSaturation(vec3 color, float saturation) {
      float luminance = dot(color, vec3(0.299, 0.587, 0.114));
      return mix(vec3(luminance), color, saturation);
    }
    
    vec3 applyGamma(vec3 color, float gamma) {
      return pow(max(color, vec3(0.0)), vec3(1.0 / gamma));
    }
    
    void main() {
      #include <logdepthbuf_fragment>
      
      vec3 sunDirection = normalize(uSunPosition - vWorldPosition);
      
      float dotNL = dot(vWorldNormal, sunDirection);
      
      float dayFactor = smoothstep(-uTerminatorWidth, uTerminatorWidth, dotNL);
      
      vec3 normalizedPos = normalize(vPosition);
      float poleDistance = abs(normalizedPos.y);
      
      float poleFactor = smoothstep(uPoleBlendStart, uPoleBlendEnd, poleDistance);
      
      vec3 dayColor;
      if (uHasTexture > 0.5) {
        vec3 texColor = texture2D(uDayTexture, vUv).rgb;
        
        if (poleFactor > 0.0) {
          vec3 poleColor = vec3(0.0);
          for (float i = 0.0; i < 16.0; i++) {
            if (i >= uPoleSampleCount) break;
            float angle = i * 3.14159265 * 2.0 / uPoleSampleCount;
            vec2 offset = vec2(cos(angle), sin(angle)) * uPoleSampleRadius;
            vec2 sampleUv = vec2(vUv.x + offset.x, vUv.y);
            sampleUv.x = fract(sampleUv.x);
            poleColor += texture2D(uDayTexture, sampleUv).rgb;
          }
          poleColor /= uPoleSampleCount;
          
          texColor = mix(texColor, poleColor, poleFactor);
        }
        
        dayColor = texColor;
      } else {
        dayColor = uColor;
      }
      
      vec3 finalColor;
      
      if (uHasNightTexture > 0.5) {
        vec3 nightColor = texture2D(uNightTexture, vUv).rgb * uNightMapIntensity;
        
        if (poleFactor > 0.0) {
          vec3 poleNightColor = vec3(0.0);
          for (float i = 0.0; i < 16.0; i++) {
            if (i >= uPoleSampleCount) break;
            float angle = i * 3.14159265 * 2.0 / uPoleSampleCount;
            vec2 offset = vec2(cos(angle), sin(angle)) * uPoleSampleRadius;
            vec2 sampleUv = vec2(vUv.x + offset.x, vUv.y);
            sampleUv.x = fract(sampleUv.x);
            poleNightColor += texture2D(uNightTexture, sampleUv).rgb;
          }
          poleNightColor /= uPoleSampleCount;
          nightColor = mix(nightColor, poleNightColor * uNightMapIntensity, poleFactor);
        }
        
        vec3 nightBase = dayColor * uAmbientIntensity + nightColor;
        finalColor = mix(nightBase, dayColor * uMaxDaylightIntensity, dayFactor);
      } else {
        float lightIntensity = mix(uAmbientIntensity, uMaxDaylightIntensity, dayFactor);
        finalColor = dayColor * lightIntensity;
      }
      
      finalColor = max(finalColor, vec3(uMinNightIntensity));
      
      finalColor = adjustContrast(finalColor, uContrastBoost);
      finalColor = adjustSaturation(finalColor, uSaturationBoost);
      finalColor = applyGamma(finalColor, uGamma);
      
      if (uEnableFresnel > 0.5) {
        float fresnel = pow(1.0 - max(dot(vWorldNormal, vViewDirection), 0.0), uFresnelPower);
        float fresnelMask = max(dayFactor * 0.5 + 0.5, 0.3);
        finalColor += uFresnelColor * fresnel * uFresnelIntensity * fresnelMask;
      }
      
      finalColor = clamp(finalColor, vec3(0.0), vec3(1.0));
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;
  
  const fresnelColor = new THREE.Color(params.fresnelColor);
  
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
      uDayTexture: { value: null },
      uNightTexture: { value: null },
      uHasTexture: { value: 0.0 },
      uHasNightTexture: { value: 0.0 },
      uAmbientIntensity: { value: params.ambientIntensity },
      uTerminatorWidth: { value: params.terminatorWidth },
      uNightMapIntensity: { value: params.nightMapIntensity },
      uContrastBoost: { value: params.contrastBoost },
      uSaturationBoost: { value: params.saturationBoost },
      uGamma: { value: params.gamma },
      uMaxDaylightIntensity: { value: params.maxDaylightIntensity },
      uMinNightIntensity: { value: params.minNightIntensity },
      uEnableFresnel: { value: params.enableFresnelEffect ? 1.0 : 0.0 },
      uFresnelIntensity: { value: params.fresnelIntensity },
      uFresnelColor: { value: fresnelColor },
      uFresnelPower: { value: params.fresnelPower },
      uPoleBlendStart: { value: PLANET_LIGHTING_CONFIG.poleBlendStart },
      uPoleBlendEnd: { value: PLANET_LIGHTING_CONFIG.poleBlendEnd },
      uPoleSampleCount: { value: PLANET_LIGHTING_CONFIG.poleSampleCount },
      uPoleSampleRadius: { value: PLANET_LIGHTING_CONFIG.poleSampleRadius },
    },
    vertexShader,
    fragmentShader,
    transparent: false,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
    blending: THREE.NormalBlending,
  });
}
