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
    isEnabled = enable;
  }
  return isEnabled;
}

export const deltaTimeObservable = new Subject<number>();
let frameCount = 0;
let timeCount = 0;

update();
function update(time = lastTime) {
  const deltaTime = (time - lastTime) / 1000;
  lastTime = time;
  requestAnimationFrame(update);
  deltaTimeObservable.next(deltaTime);
  if (controls) setCenter(controls.target)
  if (renderer && isEnabled) {
    controls?.update();
    updateLights(deltaTime);
    renderer.render(scene, camera);
  }
  frameCount++;
  timeCount += deltaTime;
}

function notifyRendererStats({ info }: WebGLRenderer) {
  WorkerMessageService.host.trigger('stats', {
    render: info.render,
    memory: info.memory,
    fps: frameCount / timeCount,
  });
  frameCount = 0;
  timeCount = 0;
}

WorkerMessageService.host.on({ handleResize });