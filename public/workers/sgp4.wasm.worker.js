importScripts('/wasm/opic_sgp4.js');

var wasm = null;
var wasmReady = false;
var msgQueue = [];

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch (e) {
    console.error('[SGP4 WASM] JSON parse error:', e.message, 'raw start:', json.slice(0, 80));
    throw new Error('WASM output parse error: ' + e.message);
  }
}

function calc(json) {
  if (!wasm) throw new Error('WASM not initialized');
  return safeParse(wasm_bindgen.calculate_batch(json));
}

function calcOrbit(json) {
  if (!wasm) throw new Error('WASM not initialized');
  return safeParse(wasm_bindgen.calculate_orbit(json));
}

function tlesToInput(tles) {
  var result = [];
  for (var i = 0; i < tles.length; i++) {
    result.push({ norad_id: tles[i].noradId, line1: tles[i].line1, line2: tles[i].line2 });
  }
  return result;
}

function processMessage(e) {
  var type = e.data.type;
  var payload = e.data.payload;
  var requestId = e.data.requestId;

  if (type === 'calculate') {
    var tles = payload.tles;
    if (!tles || !Array.isArray(tles)) throw new Error('Invalid TLE data');

    var input = JSON.stringify({ tles: tlesToInput(tles), julian_date: payload.julianDate });
    var output = calc(input);

    var results = [];
    var items = output.results || [];
    for (var i = 0; i < items.length; i++) {
      var r = items[i];
      results.push({
        noradId: r.norad_id,
        position: r.position || null,
        velocity: r.velocity || null,
        error: r.error || null
      });
    }

    self.postMessage({ type: 'result', requestId: requestId, payload: { positions: results } });

  } else if (type === 'orbit') {
    var tles = payload.tles;
    if (!tles || !Array.isArray(tles) || tles.length === 0) throw new Error('Invalid TLE data');

    var input = JSON.stringify({
      tles: tlesToInput(tles),
      julian_date: payload.julianDate,
      steps: payload.steps || 100
    });
    var output = calcOrbit(input);

    self.postMessage({
      type: 'result',
      requestId: requestId,
      payload: {
        positions: output.positions || [],
        errors: output.errors && output.errors.length > 0 ? output.errors : undefined
      }
    });

  } else {
    throw new Error('Unknown message type: ' + type);
  }
}

self.onmessage = function(e) {
  if (!wasmReady) {
    msgQueue.push(e);
    return;
  }

  try {
    processMessage(e);
  } catch (error) {
    self.postMessage({
      type: 'error',
      requestId: e.data && e.data.requestId,
      payload: { positions: [], errors: [error.message] }
    });
  }
};

async function initWasm() {
  try {
    wasm = await wasm_bindgen('/wasm/opic_sgp4_bg.wasm');
    wasm.init_panic_hook();
    wasmReady = true;

    var queue = msgQueue;
    msgQueue = [];
    for (var i = 0; i < queue.length; i++) {
      try {
        processMessage(queue[i]);
      } catch (error) {
        self.postMessage({
          type: 'error',
          requestId: queue[i].data && queue[i].data.requestId,
          payload: { positions: [], errors: [error.message] }
        });
      }
    }

    self.postMessage({ type: 'ready', payload: { message: 'SGP4 WASM Worker ready' } });
  } catch (err) {
    console.error('[SGP4 WASM Worker] Init failed:', err);
    self.postMessage({ type: 'error', requestId: -1, payload: { errors: ['WASM init: ' + err.message] } });
  }
}

initWasm();
