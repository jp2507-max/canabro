// Simple FPS logger using requestAnimationFrame – dev-only
// Activate by calling `initFPSLogger()`; by default no-ops in production.

let isRunning = false;

export function initFPSLogger(label: string = 'FPS') {
  if (!__DEV__ || isRunning) return;
  isRunning = true;

  let frameCount = 0;
  let lastTime = Date.now();

  function loop() {
    frameCount += 1;
    const now = Date.now();
    if (now - lastTime >= 1000) {
      const fps = frameCount;
      // eslint-disable-next-line no-console
      console.log(`[Perf] ${label}: ${fps} fps`);
      frameCount = 0;
      lastTime = now;
    }
    if (isRunning) requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

export function stopFPSLogger() {
  isRunning = false;
} 