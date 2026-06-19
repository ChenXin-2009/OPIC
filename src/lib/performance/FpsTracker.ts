export class FpsTracker {
  private fps: number = 60;
  private frameTime: number = 16.67;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private fpsHistory: number[] = [];
  private readonly FPS_HISTORY_SIZE = 60;
  private rafId: number | null = null;
  private isMonitoring: boolean = false;

  constructor() {
    this.lastFrameTime = performance.now();
  }

  start(): void {
    this.isMonitoring = true;
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.fpsHistory = [];
    this.monitorFrame();
  }

  stop(): void {
    this.isMonitoring = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private monitorFrame = (): void => {
    if (!this.isMonitoring) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;

    if (deltaTime > 0) {
      const currentFPS = 1000 / deltaTime;
      this.fps = currentFPS;
      this.frameTime = deltaTime;

      this.fpsHistory.push(currentFPS);
      if (this.fpsHistory.length > this.FPS_HISTORY_SIZE) {
        this.fpsHistory.shift();
      }
    }

    this.frameCount++;
    this.lastFrameTime = currentTime;

    this.rafId = requestAnimationFrame(this.monitorFrame);
  };

  beginFrame(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;

    if (deltaTime > 0) {
      const currentFPS = 1000 / deltaTime;
      this.fps = currentFPS;
      this.frameTime = deltaTime;

      this.fpsHistory.push(currentFPS);
      if (this.fpsHistory.length > this.FPS_HISTORY_SIZE) {
        this.fpsHistory.shift();
      }
    }

    this.frameCount++;
    this.lastFrameTime = currentTime;
  }

  getCurrentFPS(): number {
    return Math.round(this.fps);
  }

  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.fpsHistory.length);
  }

  getMinMaxFPS(): { min: number; max: number } {
    if (this.fpsHistory.length === 0) return { min: 0, max: 0 };
    return {
      min: Math.round(Math.min(...this.fpsHistory)),
      max: Math.round(Math.max(...this.fpsHistory)),
    };
  }

  getFrameTime(): number {
    return this.frameTime;
  }

  reset(): void {
    this.fpsHistory = [];
    this.fps = 60;
    this.frameTime = 16.67;
    this.frameCount = 0;
  }
}
