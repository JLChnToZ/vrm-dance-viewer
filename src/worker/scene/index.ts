import { Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { initWorkerContext, remoteCanvasObservable } from '../../utils/remote-canvas';
import { camera } from './camera';
import { scene } from './scene';
import { update as updateLights } from './lights';
import { init as initRenderer, renderer } from './renderer';
import { init as initControls, controls } from './controls';
import { setCenter } from './floor';
import { WebGLRenderer } from 'three';
import { WorkerMessageService } from '../../utils/message-service';

let isEnabled = true;
let lastTime = 0;

remoteCanvasObservable.pipe(take(1)).subscribe(canvas => {
  initRenderer(canvas.undelyOffscreenCanvas);
  if(typeof self !== 'undefined' && self.document == null)
    (self as any).document = {};
  initControls(canvas, isEnabled);
  handleResize(canvas.width, canvas.height);
  setInterval(notifyRendererStats, 1000, renderer);
});
initWorkerContext();

export function handleResize(width: number, height: number) {
  if (renderer) renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function enable(enable?: boolean) {
  if (enable != null) {
    if (isEnabled !== enable && enable)
      requestAnimationFrame(update);
    isEnabled = enable;
  }
  return isEnabled;
}

export const deltaTimeObservable = new Subject<number>();
let frameCount = 0;
let lastStatsUpdate = 0;

if (isEnabled) requestAnimationFrame(update);
function update(time = lastTime) {
  if (!isEnabled) return;
  requestAnimationFrame(update);
  const deltaTime = (time - lastTime) / 1000;
  lastTime = time;
  deltaTimeObservable.next(deltaTime);
  if (renderer) {
    if (controls) {
      setCenter(controls.target);
      controls.update();
    }
    updateLights(deltaTime);
    renderer.render(scene, camera);
  }
  frameCount++;
}

function notifyRendererStats({ info }: WebGLRenderer) {
  const timestamp = performance.now();
  if (isEnabled) WorkerMessageService.host.trigger('stats', {
    render: info.render,
    memory: info.memory,
    fps: frameCount / (timestamp - lastStatsUpdate) * 1000,
  });
  frameCount = 0;
  lastStatsUpdate = timestamp;
}

WorkerMessageService.host.on({ handleResize, enable });