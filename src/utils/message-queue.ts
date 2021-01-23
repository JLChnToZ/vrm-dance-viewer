import { Callback } from './helper-functions';

interface CallbackQueue {
  callback: Callback;
  thisArg: any;
  args: any[];
  next?: CallbackQueue | null;
}

let first: CallbackQueue | null | undefined;
let last: CallbackQueue | null | undefined;
let hasPending = false;

export function deferTrigger(callback: Callback, thisArg: any, args: any[]) {
  const current: CallbackQueue = { callback, thisArg, args };
  if (last == null)
    first = last = current;
  else
    last = last.next = current;
  if (!hasPending) {
    hasPending = true;
    if (typeof setImmediate === 'function')
      setImmediate(processCallback);
    else
      setTimeout(processCallback, 0);
  }
}

function processCallback() {
  while (first != null) try {
    const { callback, thisArg, args, next } = first;
    first = next;
    if (first == null) last = null;
    Function.prototype.apply.call(callback, thisArg, args);
  } catch {}
  hasPending = false;
}