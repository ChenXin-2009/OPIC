use wasm_bindgen::prelude::*;

fn safe_f64(v: f64) -> f64 {
    if v.is_finite() { v } else { 0.0 }
}

fn safe_pos(p: [f64; 3]) -> Position {
    Position { x: safe_f64(p[0]), y: safe_f64(p[1]), z: safe_f64(p[2]) }
}

fn safe_vel(v: [f64; 3]) -> Velocity {
    Velocity { x: safe_f64(v[0]), y: safe_f64(v[1]), z: safe_f64(v[2]) }
}

fn to_json<T: serde::Serialize>(v: &T) -> String {
    serde_json::to_string(v).unwrap_or_else(|e| {
        format!("{{\"error\":\"serde failed: {}\"}}", e)
    })
}

#[wasm_bindgen]
pub fn test_ping() -> String {
    "pong".to_string()
}

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

#[derive(serde::Deserialize)]
struct BatchInput {
    tles: Vec<TleInput>,
    julian_date: f64,
}

#[derive(serde::Deserialize)]
struct OrbitInput {
    tles: Vec<TleInput>,
    julian_date: f64,
    steps: Option<u32>,
}

#[derive(serde::Deserialize)]
struct TleInput {
    #[serde(default)]
    norad_id: Option<u64>,
    line1: String,
    line2: String,
}

#[derive(serde::Serialize)]
struct BatchOutput {
    results: Vec<SatelliteResult>,
}

#[derive(serde::Serialize)]
struct OrbitOutput {
    positions: Vec<Position>,
    errors: Vec<String>,
}

#[derive(serde::Serialize)]
struct SatelliteResult {
    norad_id: u64,
    position: Option<Position>,
    velocity: Option<Velocity>,
    error: Option<String>,
}

#[derive(serde::Serialize, Clone)]
struct Position {
    x: f64,
    y: f64,
    z: f64,
}

#[derive(serde::Serialize, Clone)]
struct Velocity {
    x: f64,
    y: f64,
    z: f64,
}

fn propagate_tle(line1: &str, line2: &str, jd: f64) -> Result<(Position, Velocity), String> {
    let elements = sgp4::Elements::from_tle(
        None,
        line1.as_bytes(),
        line2.as_bytes(),
    )
    .map_err(|e| format!("TLE parse error: {}", e))?;

    let constants = sgp4::Constants::from_elements(&elements)
        .map_err(|e| format!("Constants error: {:?}", e))?;

    let epoch_jd = elements.epoch() * 365.25 + 2451545.0;
    let minutes_since_epoch = (jd - epoch_jd) * 1440.0;

    let prediction = constants
        .propagate(sgp4::MinutesSinceEpoch(minutes_since_epoch))
        .map_err(|e| format!("Propagation error: {:?}", e))?;

    Ok((safe_pos(prediction.position), safe_vel(prediction.velocity)))
}

fn propagate_single_result(tle: &TleInput, jd: f64) -> SatelliteResult {
    let norad_id = tle.norad_id.unwrap_or(0);
    match propagate_tle(&tle.line1, &tle.line2, jd) {
        Ok((pos, vel)) => SatelliteResult {
            norad_id,
            position: Some(pos),
            velocity: Some(vel),
            error: None,
        },
        Err(e) => SatelliteResult {
            norad_id,
            position: None,
            velocity: None,
            error: Some(e),
        },
    }
}

#[wasm_bindgen]
pub fn calculate_batch(json_input: &str) -> String {
    let input: BatchInput = match serde_json::from_str(json_input) {
        Ok(v) => v,
        Err(_) => return r#"{"results":[]}"#.to_string(),
    };

    let mut results = Vec::with_capacity(input.tles.len());
    for tle in &input.tles {
        results.push(propagate_single_result(tle, input.julian_date));
    }

    to_json(&BatchOutput { results })
}

fn get_tle_period_minutes(elements: &sgp4::Elements) -> f64 {
    let mean_motion = elements.mean_motion;
    if mean_motion > 0.0 {
        1440.0 / mean_motion
    } else {
        90.0
    }
}

#[wasm_bindgen]
pub fn calculate_orbit(json_input: &str) -> String {
    let input: OrbitInput = match serde_json::from_str(json_input) {
        Ok(v) => v,
        Err(_) => return r#"{"positions":[],"errors":["Invalid input JSON"]}"#.to_string(),
    };

    if input.tles.is_empty() {
        return r#"{"positions":[],"errors":["No TLE data"]}"#.to_string();
    }

    let tle = &input.tles[0];
    let elements = match sgp4::Elements::from_tle(None, tle.line1.as_bytes(), tle.line2.as_bytes()) {
        Ok(e) => e,
        Err(e) => return to_json(&OrbitOutput {
            positions: vec![],
            errors: vec![format!("TLE parse error: {}", e)],
        }),
    };

    let constants = match sgp4::Constants::from_elements(&elements) {
        Ok(c) => c,
        Err(e) => return to_json(&OrbitOutput {
            positions: vec![],
            errors: vec![format!("Constants error: {:?}", e)],
        }),
    };

    let epoch_jd = elements.epoch() * 365.25 + 2451545.0;
    let steps = input.steps.unwrap_or(100).max(10).min(10000);
    let period_minutes = get_tle_period_minutes(&elements);
    let step_interval = period_minutes / steps as f64;

    let mut positions = Vec::with_capacity(steps as usize);
    let mut errors = Vec::new();

    for i in 0..steps {
        let target_jd = input.julian_date + (i as f64 * step_interval) / 1440.0;
        let dt = (target_jd - epoch_jd) * 1440.0;

        match constants.propagate(sgp4::MinutesSinceEpoch(dt)) {
            Ok(pred) => {
                positions.push(safe_pos(pred.position));
            }
            Err(e) => {
                if errors.len() < 10 {
                    errors.push(format!("Step {}: {:?}", i, e));
                }
            }
        }
    }

    to_json(&OrbitOutput { positions, errors })
}
