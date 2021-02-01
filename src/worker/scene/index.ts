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
import { LoopManager } from '../../utils/loop-manager';

remoteCanvasObservable.pipe(take(1)).subscribe(canvas => {
  initRenderer(canvas.undelyOffscreenCanvas);
  if(typeof self !== 'undefined' && self.document == null)
    (self as any).document = {};
  initControls(canvas, true);
  handleResize(canvas.width, canvas.height);
  setInterval(notifyRendererStats, 1000, renderer);
});
initWorkerContext();

export function handleResize(width: number, height: number) {
  if (renderer) renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export const deltaTimeObservable = new Subject<number>();
let frameCount = 0;
let lastStatsUpdate = 0;

const loopManager = new LoopManager(deltaTime => {
  deltaTime /= 1000;
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
}, true);

export function enable(enable?: boolean) {
  if (enable != null) {
    loopManager.enabled = enable;
    if (controls)
      controls.enabled = enable;
  }
  return loopManager.enabled;
}

function notifyRendererStats({ info }: WebGLRenderer) {
  const timestamp = performance.now();
  if (loopManager.enabled) WorkerMessageService.host.trigger('stats', {
    render: info.render,
    memory: info.memory,
    fps: frameCount / (timestamp - lastStatsUpdate) * 1000,
  });
  frameCount = 0;
  lastStatsUpdate = timestamp;
}

WorkerMessageService.host.on({ handleResize, enable });