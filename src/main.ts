import './main.css';
import './i18n';
import { canvas, loadAnimation, loadModel, toggleAutoRotate, toggleLights } from './host';
import { showMoreInfo } from './host/meta-display';
import registerStats from './host/status';
import { registerDropZone } from './utils/drag-drop';
import { showSnack } from './utils/tocas-helpers';
import { observeMediaQuery } from './utils/rx-helpers';

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

registerDropZone(canvas, data => onFileSelected(data.files));

document.querySelector('#lights')?.addEventListener('click', toggleLights);
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

registerStats(
  document.getElementById('fps')!,
  document.getElementById('draw-call')!,
  document.getElementById('face-count')!,
);

observeMediaQuery('(prefers-color-scheme:dark)').subscribe(matches =>
  document.querySelectorAll('.ts:not(.dimmer)').forEach(element =>
    element.classList[matches ? 'add' : 'remove']('inverted'),
  ),
);
