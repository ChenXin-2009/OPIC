import { calculateSpeed } from '../src/components/TimeSlider.helpers';
import { TIME_SLIDER_CONFIG } from '../src/lib/config/visualConfig';

console.log('配置信息：');
console.log('deadZone:', TIME_SLIDER_CONFIG.deadZone);
console.log('speedZones:', JSON.stringify(TIME_SLIDER_CONFIG.speedZones, null, 2));
console.log('');

const testPos = 0.525;
console.log(`测试位置: ${testPos}`);
console.log(`offset: ${testPos - 0.5}`);
console.log(`normalizedOffset: ${(testPos - 0.5) * 2}`);
console.log(`absOffset: ${Math.abs((testPos - 0.5) * 2)}`);
console.log('');

const result = calculateSpeed(testPos);
console.log('结果:', result);
