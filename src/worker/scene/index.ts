import { Subject } from 'rxjs';
// import { take } from 'rxjs/operators';
// import { initWorkerContext, remoteCanvasObservable } from '../../utils/remote-canvas';
import { camera } from './camera';
import { init as initLights } from './lights';
import { init as initRenderer } from './renderer';
import { updateSize, init as initPostProcessing, render } from './post-processing';
import { init as initControls, controls, targetPosition, enableOrbit, enableXR } from './controls';
import { setCenter } from './floor';
import { WebGLRenderer } from 'three';
import { WorkerMessageService } from '../worker-message-service-shim';
import { LoopManager } from '../../utils/loop-manager';

export const deltaTimeObservable = new Subject<number>();
let frameCount = 0;
let lastStatsUpdate = 0;
let controlsEnabled = true;

const loopManager = new LoopManager(deltaTime => {
  deltaTime /= 1000;
  deltaTimeObservable.next(deltaTime);
  render(deltaTime);
  frameCount++;
}, true);

initLights(deltaTimeObservable);

export function init(canvas: HTMLCanvasElement) {
  const renderer = initRenderer(canvas);
  const controls = initControls(canvas, deltaTimeObservable, true);
  initPostProcessing();
  handleResize(canvas.width, canvas.height);
  deltaTimeObservable.subscribe(() => setCenter(controls.target));
  renderer.info.autoReset = false;
  setInterval(notifyRendererStats, 1000, renderer);
}

export function handleResize(width: number, height: number) {
  updateSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function enable(enable?: boolean) {
  if (enable != null) {
    loopManager.enabled = enable;
    enableOrbit(enable && controlsEnabled);
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

function setCameraX(value: number) {
  camera.position.setX(value);
}

function setCameraY(value: number) {
  camera.position.setY(value);
  controls?.target.setY(value);
}

function setCameraZ(value: number) {
  camera.position.setZ(value);
}

function setTargetX(value: number) {
  targetPosition.setX(value);
}

function setTargetY(value: number) {
  targetPosition.setY(value);
}

function setTargetZ(value: number) {
  targetPosition.setZ(value);
}

function enableControls(value: boolean) {
  controlsEnabled = value;
  enableOrbit(loopManager.enabled && value);
}

WorkerMessageService.host.on({
  handleResize, enable,
  setCameraX, setCameraY, setCameraZ,
  setTargetX, setTargetY, setTargetZ,
  enableControls, enableXR,
  initAll: init,
});
