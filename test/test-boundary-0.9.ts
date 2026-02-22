import { calculateSpeed } from '../src/components/TimeSlider.helpers';

console.log('测试月/年边界 (position=0.9, absOffset=0.8):');
console.log('');

const positions = [0.8999, 0.89999, 0.9, 0.90001, 0.9001];
positions.forEach(pos => {
  const result = calculateSpeed(pos);
  const absOffset = Math.abs((pos - 0.5) * 2);
  console.log(`位置${pos}: absOffset=${absOffset.toFixed(6)}, speed=${result.speed.toFixed(6)}`);
});
