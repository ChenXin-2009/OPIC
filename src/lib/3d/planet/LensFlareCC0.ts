/**
 * LensFlareCC0 — CC0-1.0 镜头光晕 (TypeScript 适配)
 *
 * 原始: Anderson Mancini / ektogamat/lensflare-threejs-vanilla
 * 许可: CC0-1.0 (公共领域)
 */
import * as THREE from 'three';

export interface LensFlareConfig {
  enabled?: boolean;
  lensPosition?: THREE.Vector3;
  opacity?: number;
  colorGain?: THREE.Color | string | number;
  starPoints?: number;
  glareSize?: number;
  flareSize?: number;
  flareSpeed?: number;
  flareShape?: number;
  haloScale?: number;
  animated?: boolean;
  anamorphic?: boolean;
  secondaryGhosts?: boolean;
  starBurst?: boolean;
  ghostScale?: number;
  aditionalStreaks?: boolean;
  followMouse?: boolean;
  lensDirtTextureUrl?: string | null;
  occlusionObjects?: THREE.Object3D[] | null;
}

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform float iTime;
uniform vec2 lensPosition;
uniform vec2 iResolution;
uniform vec3 colorGain;
uniform float starPoints;
uniform float glareSize;
uniform float flareSize;
uniform float flareSpeed;
uniform float flareShape;
uniform float haloScale;
uniform float opacity;
uniform bool animated;
uniform bool anamorphic;
uniform bool enabled;
uniform bool secondaryGhosts;
uniform bool starBurst;
uniform float ghostScale;
uniform bool aditionalStreaks;
uniform sampler2D lensDirtTexture;
uniform bool hasDirtTexture;
varying vec2 vUv;

float uDispersal = 0.3;
float uHaloWidth = 0.6;
float uDistortion = 1.5;
float uBrightDark = 0.5;
vec2 vTexCoord;

float rand(float n){return fract(sin(n)*43758.5453123);}
float noise(float p){float fl=floor(p);float fc=fract(p);return mix(rand(fl),rand(fl+1.),fc);}
vec3 hsv2rgb(vec3 c){vec4 k=vec4(1.,2./3.,1./3.,3.);vec3 p=abs(fract(c.xxx+k.xyz)*6.-k.www);return c.z*mix(k.xxx,clamp(p-k.xxx,0.,1.),c.y);}
float sat2(float x){return clamp(x,0.,1.);}
vec2 rot(vec2 uv,float r){return vec2(cos(r)*uv.x+sin(r)*uv.y,cos(r)*uv.y-sin(r)*uv.x);}

vec3 drawflare(vec2 p,float intensity,float rnd,float speed,int id){
  float hueoff=(1./32.)*float(id)*.1;
  float lingrad=distance(vec2(0.),p);
  float expg=1./exp(lingrad*(fract(rnd)*.66+.33));
  vec3 colg=hsv2rgb(vec3(fract((expg*8.)+speed*flareSpeed+hueoff),pow(1.-abs(expg*2.-1.),.45),20.*expg*intensity));
  float ips=anamorphic?1.:starPoints;
  float blades=length(p*flareShape*sin(ips*atan(p.x,p.y)));
  float comp=pow(1.-sat2(blades),anamorphic?100.:12.);
  comp+=sat2(expg-.9)*3.;
  comp=pow(comp*expg,8.+(1.-intensity)*5.);
  if(flareSpeed>0.)return vec3(comp)*colg;
  else return vec3(comp)*flareSize*15.;
}

float glare(vec2 uv,vec2 pos,float size){
  vec2 main=animated?rot(uv-pos,iTime*.1):uv-pos;
  float ang=atan(main.y,main.x)*(anamorphic?1.:starPoints);
  float dist=pow(length(main),.9);
  float f0=1./(length(uv-pos)*(1./size*16.)+.2);
  return f0+f0*(sin(ang)*.2+.3);
}

float sdHex(vec2 p){p=abs(p);vec2 q=vec2(p.x*2.*.5773503,p.y+p.x*.5773503);return dot(step(q.xy,q.yx),1.-q.yx);}
float fpow(float x,float k){return x>k?pow((x-k)/(1.-k),2.):0.;}
vec3 renderhex(vec2 uv,vec2 p,float s,vec3 col){
  uv-=p;
  if(abs(uv.x)<.2*s&&abs(uv.y)<.2*s)return mix(vec3(0),mix(vec3(0),col,.1+fpow(length(uv/s),.1)*10.),smoothstep(0.,.1,sdHex(uv*20./s)));
  return vec3(0);
}

vec3 LensFlare(vec2 uv,vec2 pos){
  vec2 main=uv-pos;
  vec2 uvd=uv*(length(uv));
  float ang=atan(main.x,main.y);
  float f0=.3/(length(uv-pos)*16.+1.);
  f0=f0*(sin(noise(sin(ang*3.9-(animated?iTime:0.)*.3)*starPoints))*.2);
  float f1=max(.01-pow(length(uv+1.2*pos),1.9),0.)*7.;
  float f2=max(.9/(10.+32.*pow(length(uvd+.99*pos),2.)),0.)*.35;
  float f22=max(.9/(11.+32.*pow(length(uvd+.85*pos),2.)),0.)*.23;
  float f23=max(.9/(12.+32.*pow(length(uvd+.95*pos),2.)),0.)*.6;
  vec2 uvx=mix(uv,uvd,.1);
  float f4=max(.01-pow(length(uvx+.4*pos),2.9),0.)*4.02;
  float f42=max(0.-pow(length(uvx+.45*pos),2.9),0.)*4.1;
  float f43=max(.01-pow(length(uvx+.5*pos),2.9),0.)*4.6;
  uvx=mix(uv,uvd,-.4);
  float f5=max(.01-pow(length(uvx+.1*pos),5.5),0.)*2.;
  float f52=max(.01-pow(length(uvx+.2*pos),5.5),0.)*2.;
  float f53=max(.01-pow(length(uvx+.1*pos),5.5),0.)*2.;
  uvx=mix(uv,uvd,2.1);
  float f6=max(.01-pow(length(uvx-.3*pos),1.61),0.)*3.159;
  float f62=max(.01-pow(length(uvx-.325*pos),1.614),0.)*3.14;
  float f63=max(.01-pow(length(uvx-.389*pos),1.623),0.)*3.12;
  vec3 c=vec3(glare(uv,pos,glareSize));
  vec2 prot;
  if(animated)prot=rot(uv-pos,iTime*.1);
  else if(anamorphic)prot=rot(uv-pos,1.570796);
  else prot=uv-pos;
  c+=drawflare(prot,anamorphic?flareSize*10.:flareSize,.1,iTime,1);
  c.r+=f1+f2+f4+f5+f6;c.g+=f1+f22+f42+f52+f62;c.b+=f1+f23+f43+f53+f63;
  c=c*1.3*vec3(length(uvd)+.09);
  c+=vec3(f0);
  return c;
}

float rnd_f(vec2 p){return fract(sin(dot(p,vec2(12.1234,72.8392)))*45123.2);}
float rnd_f2(float w){return fract(sin(w)*1000.);}
float regShape(vec2 p,int N){float a=atan(p.x,p.y)+.2;float b=6.28319/float(N);return smoothstep(.5,.51,cos(floor(.5+a/b)*b-a)*length(p.xy)*2.-ghostScale);}
vec3 circle(vec2 p,float size,float decay,vec3 color,vec3 color2,float dist,vec2 mouse){
  float l=length(p+mouse*(dist*2.))+size/2.;
  float c=max(.04-pow(length(p+mouse*dist),size*ghostScale),0.)*10.;
  float c1=max(.001-pow(l-.3,1./40.)+sin(l*20.),0.)*3.;
  float c2=max(.09/pow(length(p-mouse*dist/.5)*1.,.95),0.)/20.;
  float s=max(.02-pow(regShape(p*5.+mouse*dist*5.+decay,6),1.),0.)*1.5;
  color=cos(vec3(colorGain)*16.+dist/8.)*.5+.5;
  vec3 f=c*color;f+=c1*color;f+=c2*color;f+=s*color;return f;
}

void main(){
  vec2 uv=vUv;
  vec2 myUV=uv-.5;
  myUV.y*=iResolution.y/iResolution.x;
  vec2 mouse=lensPosition*.5;
  mouse.y*=iResolution.y/iResolution.x;
  vec3 finalColor=LensFlare(myUV,mouse)*20.*colorGain/256.;
  if(aditionalStreaks){
    vec3 cc=vec3(.9,.2,.1);vec3 cc2=vec3(.3,.1,.9);
    for(float i=0.;i<10.;i++)finalColor+=circle(myUV,pow(rnd_f2(i*2000.)*2.8,.1)+1.41,0.,cc+i,cc2+i,rnd_f2(i*20.)*3.+.2-.5,lensPosition);
  }
  if(secondaryGhosts){
    vec3 ag=vec3(.1);
    ag+=renderhex(myUV,-lensPosition*.25,ghostScale*1.4,vec3(.03)*colorGain);
    ag+=renderhex(myUV,lensPosition*.25,ghostScale*.5,vec3(.03)*colorGain);
    ag+=renderhex(myUV,lensPosition*.1,ghostScale*1.6,vec3(.03)*colorGain);
    ag+=renderhex(myUV,lensPosition*1.8,ghostScale*2.,vec3(.03)*colorGain);
    ag+=renderhex(myUV,lensPosition*1.25,ghostScale*.8,vec3(.03)*colorGain);
    ag+=renderhex(myUV,-lensPosition*1.25,ghostScale*5.,vec3(.03)*colorGain);
    ag+=fpow(1.-abs(distance(lensPosition*.8,myUV)-.5),.985)*vec3(.1);
    ag+=fpow(1.-abs(distance(lensPosition*.4,myUV)-.2),.994)*vec3(.05);
    finalColor+=ag;
  }
  if(enabled)gl_FragColor=vec4(finalColor,mix(finalColor,-vec3(.15),.5)*opacity);
}`;

export function createLensFlare(config: LensFlareConfig = {}) {
  const c = { enabled: true, opacity: 1.0, ...config };
  const worldPos = c.lensPosition?.clone() ?? new THREE.Vector3();
  const clock = new THREE.Clock();
  let targetOpacity = c.opacity!;

  const u = {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector2(1920, 1080) },
    lensPosition: { value: new THREE.Vector2(0, 0) },
    enabled: { value: c.enabled ?? true },
    colorGain: { value: new THREE.Color(c.colorGain ?? 0xff6633) },
    starPoints: { value: c.starPoints ?? 6 },
    glareSize: { value: c.glareSize ?? 0.25 },
    flareSize: { value: c.flareSize ?? 0.004 },
    flareSpeed: { value: c.flareSpeed ?? 0.25 },
    flareShape: { value: c.flareShape ?? 1.2 },
    haloScale: { value: c.haloScale ?? 0.5 },
    opacity: { value: targetOpacity },
    animated: { value: c.animated ?? true },
    anamorphic: { value: c.anamorphic ?? true },
    secondaryGhosts: { value: c.secondaryGhosts ?? true },
    starBurst: { value: c.starBurst ?? true },
    ghostScale: { value: c.ghostScale ?? 0.5 },
    aditionalStreaks: { value: c.aditionalStreaks ?? true },
    followMouse: { value: c.followMouse ?? false },
    lensDirtTexture: { value: null as THREE.Texture | null },
    hasDirtTexture: { value: false },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    name: 'LensFlareCC0',
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.renderOrder = 9999;
  mesh.frustumCulled = false;

  const update = (camera: THREE.Camera) => {
    const dt = clock.getDelta();
    u.iTime.value += dt;
    if (typeof window !== 'undefined') u.iResolution.value.set(window.innerWidth, window.innerHeight);
    // 用点积判断太阳方向避免依赖 project() 的 matrixWorldInverse 同步问题
    const camP = new THREE.Vector3(); camera.getWorldPosition(camP);
    const toSun = worldPos.clone().sub(camP).normalize();
    const camZ = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    if (toSun.dot(camZ) > 0) {
      const p = worldPos.clone().project(camera);
      if (isFinite(p.z)) u.lensPosition.value.set(p.x, p.y);
    } else {
      u.lensPosition.value.set(5, 5);
    }
    const cur = u.opacity.value as number;
    u.opacity.value += (targetOpacity - cur) * 0.08;
  };

  return {
    mesh,
    uniforms: u,
    setPosition: (p: THREE.Vector3) => worldPos.copy(p),
    setOpacity: (v: number) => { targetOpacity = v; },
    setColorGain: (c: THREE.Color) => u.colorGain.value.copy(c),
    setEnabled: (v: boolean) => { u.enabled.value = v; },
    dispose: () => { mat.dispose(); mesh.geometry.dispose(); },
    update,
  };
}
