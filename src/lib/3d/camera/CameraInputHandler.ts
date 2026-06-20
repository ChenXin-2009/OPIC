/**
 * 相机输入处理器 (Camera Input Handler)
 *
 * 处理鼠标滚轮缩放和触摸手势（双指缩放）的输入事件。
 * 将原始 DOM 事件转换为相机缩放操作。
 *
 * 支持的输入：
 * - 滚轮事件（wheel）→ 缩放增量
 * - 触摸双指捏合（pinch）→ 缩放比例
 *
 * 集成方式：通过回调接口与 CameraController 解耦
 */

/** 相机输入回调接口 */
export interface CameraInputHandlerCallbacks {
  zoom: (delta: number) => void;
  interruptFocusZoom: () => void;
  interruptTrackingZoom: () => void;
}

/**
 * 相机输入处理器 — 处理滚轮缩放和触摸双指捏合的 DOM 事件。
 */
export class CameraInputHandler {
  private domElement: HTMLElement;
  private callbacks: CameraInputHandlerCallbacks;

  private wheelHandler: ((e: WheelEvent) => void) | null = null;
  private touchStartHandler: ((e: TouchEvent) => void) | null = null;
  private touchMoveHandler: ((e: TouchEvent) => void) | null = null;
  private touchEndHandler: ((e: TouchEvent) => void) | null = null;

  constructor(domElement: HTMLElement, callbacks: CameraInputHandlerCallbacks) {
    this.domElement = domElement;
    this.callbacks = callbacks;
    this.setupWheelZoom(domElement);
    this.setupTouchZoom(domElement);

    if (!domElement.isConnected) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (domElement.isConnected) {
            if (!this.wheelHandler) {
              this.setupWheelZoom(domElement);
            }
            if (!this.touchStartHandler) {
              this.setupTouchZoom(domElement);
            }
          }
        });
      });
    }
  }

  private setupWheelZoom(domElement: HTMLElement) {
    if (this.wheelHandler) {
      domElement.removeEventListener('wheel', this.wheelHandler);
    }

    this.wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      this.callbacks.interruptFocusZoom();
      this.callbacks.interruptTrackingZoom();

      const scrollSpeed = Math.min(Math.abs(e.deltaY) / 100, 3);
      const zoomDelta = e.deltaY > 0 ? -scrollSpeed : scrollSpeed;
      this.callbacks.zoom(zoomDelta);
    };

    domElement.addEventListener('wheel', this.wheelHandler, { passive: false });
  }

  private setupTouchZoom(domElement: HTMLElement) {
    if (this.touchStartHandler) {
      domElement.removeEventListener('touchstart', this.touchStartHandler);
      domElement.removeEventListener('touchmove', this.touchMoveHandler!);
      domElement.removeEventListener('touchend', this.touchEndHandler!);
    }

    let initialDistance = 0;
    let isPinching = false;
    let lastUpdateTime = 0;

    this.touchStartHandler = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialDistance = Math.sqrt(
          (touch2.clientX - touch1.clientX) * (touch2.clientX - touch1.clientX) +
          (touch2.clientY - touch1.clientY) * (touch2.clientY - touch1.clientY)
        );
        isPinching = true;
        lastUpdateTime = performance.now();

        this.callbacks.interruptFocusZoom();
        this.callbacks.interruptTrackingZoom();
      } else {
        isPinching = false;
        initialDistance = 0;
      }
    };

    this.touchMoveHandler = (e: TouchEvent) => {
      if (e.touches.length === 2 && isPinching && initialDistance > 0) {
        e.preventDefault();

        const currentTime = performance.now();
        if (currentTime - lastUpdateTime < 8) {
          return;
        }
        lastUpdateTime = currentTime;

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.sqrt(
          (touch2.clientX - touch1.clientX) * (touch2.clientX - touch1.clientX) +
          (touch2.clientY - touch1.clientY) * (touch2.clientY - touch1.clientY)
        );

        if (currentDistance > 10 && initialDistance > 10) {
          const scale = currentDistance / initialDistance;
          const scaleDiff = scale - 1.0;

          let zoomDelta;
          if (Math.abs(scaleDiff) > 0.001) {
            const sign = scaleDiff > 0 ? 1 : -1;
            const absScaleDiff = Math.abs(scaleDiff);
            zoomDelta = sign * Math.sqrt(absScaleDiff) * 3;
          } else {
            zoomDelta = 0;
          }

          zoomDelta = Math.max(-6, Math.min(6, zoomDelta));

          this.callbacks.zoom(zoomDelta);

          initialDistance = currentDistance;
        }
      } else if (e.touches.length !== 2) {
        isPinching = false;
        initialDistance = 0;
      }
    };

    this.touchEndHandler = (_e: TouchEvent) => {
      // zoom has no easing; isZooming auto-completes in next update()
    };

    domElement.addEventListener('touchstart', this.touchStartHandler, { passive: false });
    domElement.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
    domElement.addEventListener('touchend', this.touchEndHandler);
  }

  dispose(): void {
    if (this.wheelHandler && this.domElement) {
      this.domElement.removeEventListener('wheel', this.wheelHandler);
      this.wheelHandler = null;
    }

    if (this.touchStartHandler && this.domElement) {
      this.domElement.removeEventListener('touchstart', this.touchStartHandler);
      this.domElement.removeEventListener('touchmove', this.touchMoveHandler!);
      this.domElement.removeEventListener('touchend', this.touchEndHandler!);
      this.touchStartHandler = null;
      this.touchMoveHandler = null;
      this.touchEndHandler = null;
    }
  }
}
