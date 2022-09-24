import h from 'hyperscript';
// import { RemoteCanvasHost } from '../utils/remote-canvas';
import { blob2ArrayBuffer, interceptEvent } from '../utils/helper-functions';
import { observeResize, observeVisibilty } from '../utils/rx-helpers';
import workerService from './worker-service';
import { isSupported as isVRSupported } from '../utils/xr-detect';

export const canvas = document.getElementById('canvas-container')!.appendChild(h('canvas', { tabIndex: 0 }));
canvas.addEventListener('contextmenu', interceptEvent);
canvas.addEventListener('click', interceptEvent);
canvas.tabIndex = 0;

workerService.trigger('initAll', canvas);
observeResize(canvas).subscribe(
  ({ contentRect: { width, height } }) => workerService.trigger('handleResize', width * devicePixelRatio, height * devicePixelRatio),
);

export async function loadModel(file: Blob | ArrayBuffer) {
  if (file instanceof Blob)
    file = await blob2ArrayBuffer(file);
  return workerService.call('loadModel', file);
}

export async function loadAnimation(file: Blob | ArrayBuffer, type: string) {
  if (file instanceof Blob)
    file = await blob2ArrayBuffer(file);
  return workerService.call('loadAnimation', file, type);
}

export function toggleLights() {
  return void workerService.trigger('toggleLights');
}

export function toggleAutoRotate() {
  return void workerService.trigger('toggleRotate');
}

export function toggleBloom() {
  return void workerService.trigger('toggleBloom');
}

observeVisibilty.subscribe(
  state => workerService.trigger('enable', state === 'visible'),
);

(async () => {
  if (await isVRSupported)
    document.querySelector('.menu.controls')?.appendChild(
      h('a.item', {
        onclick: () => workerService.trigger('enableXR'),
        'data-tooltip': 'VR Mode',
      }, h('i.cube.icon')),
    );
})();

workerService.on({ warn: alert.bind(window) });
