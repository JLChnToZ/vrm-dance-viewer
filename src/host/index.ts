import { RemoteCanvasHost } from '../utils/remote-canvas';
import { blob2ArrayBuffer, interceptEvent } from '../utils/helper-functions';
import { observeVisibilty } from '../utils/rx-helpers';
import workerService from './worker-service';

export const canvas = document.body.appendChild(document.createElement('canvas'));
canvas.addEventListener('contextmenu', interceptEvent);
canvas.tabIndex = 0;

const remoteCanvasHost = new RemoteCanvasHost(workerService, canvas);
remoteCanvasHost.eventFilters.set(PointerEvent, {
  type: true,
  pointerType: true,
  ctrlKey: true,
  altKey: true,
  metaKey: true,
  shiftKey: true,
  button: true,
  clientX: true,
  clientY: true,
  pageX: true,
  pageY: true,
}).set(KeyboardEvent, {
  type: true,
  ctrlKey: true,
  altKey: true,
  metaKey: true,
  shiftKey: true,
  keyCode: true,
}).set(WheelEvent, {
  type: true,
  deltaX: true,
  deltaY: true,
}).set(TouchEvent, {
  type: true,
  touches: [{
    pageX: true,
    pageY: true,
  }],
});
remoteCanvasHost.resizeObservable.subscribe(({ contentRect: { width, height } }) =>
  workerService.trigger('handleResize', width * devicePixelRatio, height * devicePixelRatio),
);

export async function loadModel(file: Blob | ArrayBuffer) {
  if (file instanceof Blob)
    file = await blob2ArrayBuffer(file);
  return workerService.callAndTransfer('loadModel', [file], [file]);
}

export async function loadAnimation(file: Blob | ArrayBuffer, type: string) {
  if (file instanceof Blob)
    file = await blob2ArrayBuffer(file);
  return workerService.callAndTransfer('loadAnimation', [file, type], [file]);
}

export function toggleLights() {
  return void workerService.trigger('toggleLights');
}

export function toggleAutoRotate() {
  return void workerService.trigger('toggleRotate');
}

observeVisibilty.subscribe(
  state => workerService.trigger('enable', state === 'visible'),
);

workerService.on({ warn: alert.bind(window) });
