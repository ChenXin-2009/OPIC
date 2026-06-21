/**
 * flyToLocation.ts - 飞往地球表面指定地点
 */

export interface FlyToOptions {
  latitude: number;
  longitude: number;
  altitude?: number;
  duration?: number;
}

export async function flyToEarthLocation(options: FlyToOptions): Promise<void> {
  const { latitude, longitude, altitude = 5000, duration = 3 } = options;

  try {
    const viewer = (window as any).__cesiumViewer;
    if (!viewer) {
      console.warn('[flyToLocation] Cesium viewer not available');
      return;
    }

    const Cesium = await import('cesium');
    const destination = Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude);

    await viewer.camera.flyTo({
      destination,
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      },
      duration,
    });

    viewer.scene.screenSpaceCameraController.enableInputs = true;
    (window as any).__cesiumNativeCameraEnabled = true;
  } catch (error) {
    console.error('[flyToLocation] Failed:', error);
  }
}
