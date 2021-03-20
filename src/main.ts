import './main.css';
import './i18n';
import { ajax } from 'rxjs/ajax';
import { canvas, loadAnimation, loadModel, toggleAutoRotate, toggleBloom, toggleLights } from './host';
import { setAutoShown, showMoreInfo } from './host/meta-display';
import registerStats from './host/status';
import { registerDropZone } from './utils/drag-drop';
import { showSnack } from './utils/tocas-helpers';
import { observeMediaQuery } from './utils/rx-helpers';
import { interceptEvent, isInFrame } from './utils/helper-functions';
import workerService from './host/worker-service';

const loadingPromises: Promise<any>[] = [];
let isLoading = false;
let hasLoadModel = false;

function onFileSelected(files: FileList) {
  let animFile: File | undefined;
  let animType = '';
  let modelFile: File | undefined;
  for (const file of files) {
    if (animFile && modelFile) return;
    const name = file.name.toLowerCase();
    if (name.endsWith('.vrm')) {
      if (modelFile) continue;
      modelFile = file;
    } else if (name.endsWith('.vmd')) {
      if (animFile) continue;
      animFile = file;
      animType = 'vmd';
    } else if (name.endsWith('.bvh')) {
      if (animFile) continue;
      animFile = file;
      animType = 'bvh';
    }
  }
  if (modelFile) {
    loadingPromises.push(loadModel(modelFile));
    hasLoadModel = true;
  }
  if (animFile) loadingPromises.push(loadAnimation(animFile, animType));
  if (hasLoadModel) triggerLoading();
}

async function triggerLoading() {
  if (isLoading || !loadingPromises.length) return;
  isLoading = true;
  document.querySelector('#loading')?.classList.add('active');
  while (loadingPromises.length) {
    const wait = Array.from(loadingPromises, interceptLoadingError);
    loadingPromises.length = 0;
    await Promise.all(wait);
  }
  isLoading = false;
  document.querySelector('#loading')?.classList.remove('active');
}

function interceptLoadingError<T>(promise: Promise<T>) {
  return promise.catch(errorToSnackBar);
}

function errorToSnackBar(error?: any) {
  let message: string | undefined;
  if (typeof error?.message === 'string')
    message = error.message;
  if (message) showSnack(message);
}

const searchParams = new URLSearchParams(location.search);

if (isInFrame())
  searchParams.set('nostats', '');
else
  registerDropZone(canvas, data => onFileSelected(data.files));

if (searchParams.has('nostats'))
  for (const element of document.querySelectorAll('.credits, .stats'))
    element.remove();
else
  registerStats(
    document.getElementById('fps')!,
    document.getElementById('draw-call')!,
    document.getElementById('face-count')!,
  );

if (searchParams.has('notoolbar'))
  document.querySelector('.menu')?.classList.add('hidden');

if (searchParams.has('norotate'))
  toggleAutoRotate();

if (searchParams.has('dark'))
  toggleLights();

if (searchParams.has('noinfo'))
  setAutoShown(false);

if (searchParams.has('nobloom'))
  toggleBloom();

const vrmUrl = searchParams.get('vrm');
if (vrmUrl)
  loadingPromises.push((async () => {
    const { response } = await ajax({
      url: vrmUrl,
      responseType: 'blob',
    }).toPromise();
    return loadModel(response);
  })());

const animUrl = searchParams.get('anim');
if (animUrl)
  loadingPromises.push((async () => {
    const { response } = await ajax({
      url: animUrl,
      responseType: 'blob',
    }).toPromise();
    let animType = searchParams.get('animtype');
    if (!animType) {
      if (animUrl.endsWith('.vmd'))
        animType = 'vmd';
      else if (animUrl.endsWith('.bvh'))
        animType = 'bvh';
      else
        animType = 'vmd';
    }
    return loadAnimation(response, animType);
  })());

const camX = searchParams.get('x');
if (camX) workerService.trigger('setCameraX', Number(camX));
const camY = searchParams.get('y');
if (camY) workerService.trigger('setCameraY', Number(camY));
const camZ = searchParams.get('z');
if (camZ) workerService.trigger('setCameraZ', Number(camZ));
const targetX = searchParams.get('tx');
if (targetX) workerService.trigger('setTargetX', Number(targetX));
const targetY = searchParams.get('ty');
if (targetY) workerService.trigger('setTargetY', Number(targetY));
const targetZ = searchParams.get('tz');
if (targetZ) workerService.trigger('setTargetZ', Number(targetZ));

if (searchParams.has('nocontrols'))
  workerService.trigger('enableControls', false);

document.querySelector('#lights')?.addEventListener('click', toggleLights);
document.querySelector('#bloom')?.addEventListener('click', toggleBloom);
document.querySelector('#rotate')?.addEventListener('click', toggleAutoRotate);
const fileSelect = document.querySelector<HTMLInputElement>('#selectfile');
document.querySelector('#open')?.addEventListener('click', () => fileSelect?.click());
fileSelect?.addEventListener('change', e => {
  const fileSelect = e.target as HTMLInputElement;
  if (fileSelect.files?.length) onFileSelected(fileSelect.files);
  fileSelect.form?.reset();
  fileSelect.blur();
});
document.querySelector('#info')?.addEventListener('click', showMoreInfo);

observeMediaQuery('(prefers-color-scheme:dark)').subscribe(matches =>
  document.querySelectorAll('.ts:not(.dimmer)').forEach(element =>
    element.classList[matches ? 'add' : 'remove']('inverted'),
  ),
);

self.addEventListener('dragover', e => {
  interceptEvent(e);
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
});
self.addEventListener('drop', interceptEvent);

if (loadingPromises.length) triggerLoading();
