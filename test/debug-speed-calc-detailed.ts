import { TIME_SLIDER_CONFIG } from '../src/lib/config/visualConfig';

const testPos = 0.525;
const offset = testPos - 0.5;
const normalizedOffset = offset * 2;
const absOffset = Math.abs(normalizedOffset);

console.log(`测试位置: ${testPos}`);
console.log(`absOffset: ${absOffset}`);
console.log('');

const zones = TIME_SLIDER_CONFIG.speedZones;
console.log('检查每个区域：');
zones.forEach((zone, i) => {
  const inRange = absOffset >= zone.start && absOffset <= zone.end;
  console.log(`区域${i} (${zone.name}): start=${zone.start}, end=${zone.end}, inRange=${inRange}`);
  
  if (inRange) {
    const minSpeed = i > 0 ? zones[i - 1].maxSpeed : 0;
    const maxSpeed = zone.maxSpeed;
    const tolerance = 0.0001;
    const atStart = Math.abs(absOffset - zone.start) < tolerance;
    const atEnd = Math.abs(absOffset - zone.end) < tolerance;
    
    console.log(`  -> minSpeed=${minSpeed}, maxSpeed=${maxSpeed}`);
    console.log(`  -> atStart=${atStart}, atEnd=${atEnd}`);
    console.log(`  -> diff from start: ${Math.abs(absOffset - zone.start)}`);
    console.log(`  -> diff from end: ${Math.abs(absOffset - zone.end)}`);
    
    if (atStart) {
      console.log(`  -> 返回 minSpeed = ${minSpeed}`);
    } else if (atEnd) {
      console.log(`  -> 返回 maxSpeed = ${maxSpeed}`);
    } else {
      const zoneProgress = (absOffset - zone.start) / (zone.end - zone.start);
      const speedRange = maxSpeed - minSpeed;
      const exponentialProgress = Math.pow(zoneProgress, zone.exponent);
      const speed = minSpeed + speedRange * exponentialProgress;
      console.log(`  -> 插值计算: progress=${zoneProgress}, speed=${speed}`);
    }
  }
});
