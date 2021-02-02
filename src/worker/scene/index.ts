import { Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { initWorkerContext, remoteCanvasObservable } from '../../utils/remote-canvas';
import { camera } from './camera';
import { scene } from './scene';
import { init as initLights } from './lights';
import { init as initRenderer, renderer } from './renderer';
import { init as initControls, controls } from './controls';
import { setCenter } from './floor';
import { WebGLRenderer } from 'three';
import { WorkerMessageService } from '../../utils/message-service';
import { LoopManager } from '../../utils/loop-manager';

export const deltaTimeObservable = new Subject<number>();
let frameCount = 0;
let lastStatsUpdate = 0;

const loopManager = new LoopManager(deltaTime => {
  deltaTimeObservable.next(deltaTime / 1000);
  renderer?.render(scene, camera);
  frameCount++;
}, true);

initLights(deltaTimeObservable);

remoteCanvasObservable.pipe(take(1)).subscribe(canvas => {
  if(typeof self !== 'undefined' && self.document == null)
    (self as any).document = {};
  const renderer = initRenderer(canvas.undelyOffscreenCanvas);
  const controls = initControls(canvas, deltaTimeObservable, true);
  handleResize(canvas.width, canvas.height);
  deltaTimeObservable.subscribe(() => setCenter(controls.target));
  setInterval(notifyRendererStats, 1000, renderer);
});
initWorkerContext();

export function handleResize(width: number, height: number) {
  renderer?.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

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