const fs = require('fs');
const path = require('path');

// --- Load JS satellite.js ---
const satellite = require(path.join(__dirname, '..', 'node_modules', 'satellite.js', 'dist', 'satellite.js'));
const { twoline2satrec, propagate, gstime } = satellite;

// --- Load WASM module ---
const wasmBytes = fs.readFileSync(path.join(__dirname, '..', 'public', 'wasm', 'opic_sgp4_bg.wasm'));
eval(fs.readFileSync(path.join(__dirname, '..', 'public', 'wasm', 'opic_sgp4.js'), 'utf8').replace('let wasm_bindgen =', 'var opic_sgp4 ='));
const wasmModule = new WebAssembly.Module(wasmBytes);
opic_sgp4.initSync(wasmModule);

// --- Test TLE (ISS ZARYA, valid checksum) ---
const TLE_LINE1 = '1 25544U 98067A   24182.50000000  .00000000  00000-0  00000-0 0  9992';
const TLE_LINE2 = '2 25544  51.6400 200.0000 0007000 250.0000 110.0000 15.50000000350000';
const JULIAN_DATE = 2459345.5;

function warmup() {
  for (let i = 0; i < 100; i++) {
    const satrec = twoline2satrec(TLE_LINE1, TLE_LINE2);
    propagate(satrec, new Date());
  }
}

function warmupWasm() {
  const dummy = JSON.stringify({ tles: [
    { norad_id: 25544, line1: TLE_LINE1, line2: TLE_LINE2 }
  ], julian_date: JULIAN_DATE });
  for (let i = 0; i < 100; i++) {
    opic_sgp4.calculate_batch(dummy);
  }
}

// Fair benchmark: includes JSON I/O cost for both
// JS Worker flow: create results array, JSON.stringify, JSON.parse
// WASM Worker flow: JSON.stringify input, WASM call, JSON.parse output

function benchmarkJSPipeline(count) {
  const tles = [];
  for (let i = 0; i < count; i++) {
    tles.push({ line1: TLE_LINE1, line2: TLE_LINE2 });
  }

  // Step 1: Parse TLEs
  const satrecs = tles.map(t => twoline2satrec(t.line1, t.line2));
  const date = new Date((JULIAN_DATE - 2440587.5) * 86400000);

  // Step 2: Propagate all
  const results = [];
  for (const satrec of satrecs) {
    const pv = propagate(satrec, date);
    const pos = pv.position;
    results.push({
      norad_id: 25544,
      position: { x: pos.x, y: pos.y, z: pos.z },
      velocity: { x: pv.velocity.x, y: pv.velocity.y, z: pv.velocity.z },
      error: null
    });
  }

  // Step 3: Simulate structured clone (what postMessage does)
  const start = process.hrtime.bigint();
  const json = JSON.stringify({ results });
  JSON.parse(json);
  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6;
}

function benchmarkWasmPipeline(count) {
  const tles = [];
  for (let i = 0; i < count; i++) {
    tles.push({ norad_id: 25544, line1: TLE_LINE1, line2: TLE_LINE2 });
  }

  // Step 1: JSON.stringify input (same as postMessage to worker)
  const input = JSON.stringify({ tles, julian_date: JULIAN_DATE });
  const start = process.hrtime.bigint();

  // Step 2: WASM call (includes JSON parse in Rust + compute + JSON stringify in Rust)
  const output = opic_sgp4.calculate_batch(input);

  // Step 3: JSON.parse result
  JSON.parse(output);
  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6;
}

// Measure pure compute (no I/O) for insight
function benchmarkPureJSCompute(count) {
  const satrecs = [];
  for (let i = 0; i < count; i++) {
    satrecs.push(twoline2satrec(TLE_LINE1, TLE_LINE2));
  }
  const date = new Date((JULIAN_DATE - 2440587.5) * 86400000);
  const start = process.hrtime.bigint();
  for (const satrec of satrecs) {
    propagate(satrec, date);
  }
  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6;
}

function benchmarkPureWasmCompute(count) {
  const tles = [];
  for (let i = 0; i < count; i++) {
    tles.push({ norad_id: 25544, line1: TLE_LINE1, line2: TLE_LINE2 });
  }
  const input = JSON.stringify({ tles, julian_date: JULIAN_DATE });
  const start = process.hrtime.bigint();
  opic_sgp4.calculate_batch(input);
  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6;
}

// --- Warmup ---
console.log('Warming up...');
warmup();
warmupWasm();

const sizes = [1, 10, 100, 500, 1000, 5000];

console.log('\n=== Full Pipeline (incl. I/O) ===');
console.log('Batch Size | JS Pipeline | WASM Pipeline | Speedup');
console.log('-----------+-------------+---------------+--------');
for (const size of sizes) {
  const jsTime = benchmarkJSPipeline(size);
  const wasmTime = benchmarkWasmPipeline(size);
  const speedup = (jsTime / wasmTime).toFixed(2);
  const jsStr = jsTime.toFixed(3).padStart(10);
  const wasmStr = wasmTime.toFixed(3).padStart(12);
  const speedupStr = speedup.padStart(6);
  console.log(`${String(size).padStart(9)}  | ${jsStr}  | ${wasmStr}   | ${speedupStr}x`);
}

console.log('\n=== Pure Compute (no I/O) ===');
console.log('Batch Size | JS Compute | WASM (inc. JSON) | Effective Speedup vs JS pipeline');
console.log('-----------+------------+------------------+-------------------------------');
for (const size of sizes) {
  const jsTime = benchmarkJSPipeline(size);
  const wasmTime = benchmarkPureWasmCompute(size);
  const speedup = (jsTime / wasmTime).toFixed(2);
  const jsCompute = benchmarkPureJSCompute(size);
  const jsStr = jsCompute.toFixed(3).padStart(9);
  const wasmStr = wasmTime.toFixed(3).padStart(15);
  const speedupStr = speedup.padStart(6);
  console.log(`${String(size).padStart(9)}  | ${jsStr}   | ${wasmStr}  | ${speedupStr}x`);
}

console.log('\n=== JSON overhead breakdown ===');
for (const size of [100, 1000]) {
  const pureJS = benchmarkPureJSCompute(size);
  const pipelineJS = benchmarkJSPipeline(size);
  const pureWasm = benchmarkPureWasmCompute(size);
  const pipelineWasm = benchmarkWasmPipeline(size);
  console.log(`Size ${size}:`);
  console.log(`  JS:  pure=${pureJS.toFixed(3)}ms  pipeline=${pipelineJS.toFixed(3)}ms  overhead=${(pipelineJS-pureJS).toFixed(3)}ms`);
  console.log(`  WASM: pure=${pureWasm.toFixed(3)}ms  pipeline=${pipelineWasm.toFixed(3)}ms  overhead=${(pipelineWasm-pureWasm).toFixed(3)}ms`);
}
