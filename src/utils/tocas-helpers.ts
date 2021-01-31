import h from 'hyperscript';
import { getOrCreate, addEventListenerAndCache, delay } from './helper-functions';

const eventCache = new WeakMap<HTMLDialogElement, [EventTarget, string, EventListenerOrEventListenerObject][]>();

export async function showSnack(message: string, duration = 5000) {
  const snackBar = document.body.appendChild(
    h<HTMLDivElement>(
      'div.ts.snackbar', h(
        'div.content', message,
      ),
    ),
  );
  snackBar.classList.add('active');
  await delay(duration);
  snackBar.classList.remove('active');
  snackBar.addEventListener('animationend', () => snackBar.remove(), { once: true });
}

export function showModel(modal: HTMLDialogElement) {
  const dimmer = modal.closest<HTMLElement>('.ts.modals.dimmer');
  if (!dimmer) return;
  const closeBtn = modal.querySelector('.close.icon');
  dimmer.classList.add('opening', 'active');
  const cache = getOrCreate<HTMLDialogElement, [EventTarget, string, EventListenerOrEventListenerObject][]>(eventCache, modal, Array);
  dimmer.addEventListener('animationend', e =>
    (e.currentTarget as HTMLElement).classList.remove('opening'),
    { once: true },
  );
  addEventListenerAndCache(cache, dimmer, 'click', (e: Event) => {
    if (modal.classList.contains('closable') && e.target === dimmer)
      hideModel(modal);
  });
  if (closeBtn)
    addEventListenerAndCache(cache, closeBtn, 'click', () => hideModel(modal));
  bindModalButtons(modal);
  modal.open = true;
  modal.classList.add('opening');
  modal.addEventListener('animationend', e =>
    (e.currentTarget as HTMLElement).classList.remove('opening'),
    { once: true },
  );
}

export function hideModel(modal: HTMLDialogElement) {
  const dimmer = modal.closest<HTMLElement>('.ts.modals.dimmer');
  if (!dimmer || modal.classList.contains('opening') || modal.classList.contains('closing'))
    return;
  dimmer.classList.add('closing');
  dimmer.addEventListener('animationend', e =>
    setTimeout((target: HTMLElement) => target.classList.remove('closing', 'active'), 30, e.currentTarget),
    { once: true },
  );
  modal.classList.add('closing');
  modal.addEventListener('animationend', e => {
    const target = e.currentTarget as HTMLDialogElement;
    target.classList.remove('closing');
    target.open = false;
  }, { once: true });
  const cacheList = eventCache.get(modal);
  if (!cacheList) return;
  for (const [target, event, callback] of cacheList)
    target.removeEventListener(event, callback);
}

function returnTrue() { return true; }

function bindModalButtons(
  modal: HTMLDialogElement,
  approve: string = '.positive, .approve, .ok',
  deny: string = '.negative, .deny, .cancel',
  approveCb: (this: HTMLDialogElement) => boolean | undefined = returnTrue,
  denyCb: (this: HTMLDialogElement) => boolean | undefined = returnTrue,
) {
  const approveElm = modal.querySelectorAll(approve);
  const denyElm = modal.querySelectorAll(deny);
  const isSet = modal.dataset.dataModalInitialized != null;
  if (approveElm.length && !isSet) {
    function approveCall() {
      if (approveCb.call(modal) !== false)
        return hideModel(modal);
    }
    approveElm.forEach(e => e.addEventListener('click', approveCall));
  }
  if (denyElm.length && !isSet) {
    function denyCall() {
      if (denyCb.call(modal) !== false)
        return hideModel(modal);
    }
    denyElm.forEach(e => e.addEventListener('click', denyCall));
  }
  modal.dataset.dataModalInitialized = 'true';
}