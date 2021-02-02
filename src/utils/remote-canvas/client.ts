import { Subject } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { EventDispatcher, Event as IEvent } from 'three';
import { MessageType } from '.';
import { noop } from '../helper-functions';
import { WorkerMessageService } from '../message-service';

const canvasRegistered = new Subject<RemoteCanvas>();
export const remoteCanvasObservable = canvasRegistered.pipe(shareReplay(1));

export function initWorkerContext() {
  WorkerMessageService.host.observe(MessageType.transfer)
  .pipe(map(e => new RemoteCanvas(e.token, e.canvas, e.rect)))
  .subscribe(canvasRegistered);
}

export class RemoteCanvas
  extends EventDispatcher
  implements Partial<HTMLCanvasElement>, EventTarget {
  ownerDocument = this as any;
  get width() { return this.undelyOffscreenCanvas.width; }
  get height() { return this.undelyOffscreenCanvas.height; }
  get clientWidth() { return this.clientRect.width; }
  get clientHeight() { return this.clientRect.height; }

  constructor(
    private token: number,
    public undelyOffscreenCanvas: OffscreenCanvas,
    private clientRect: Partial<DOMRect>,
  ) {
    super();
    WorkerMessageService.host.on({
      [MessageType.trigger]: this.dispatchEvent.bind(this),
      [MessageType.resize]: this._resize.bind(this),
    });
  }
  
  getContext(contextId: string, options?: any): any {
    return this.undelyOffscreenCanvas.getContext(contextId as any, options) ?? null;
  }

  getBoundingClientRect() {
    return this.clientRect as DOMRect;
  }

  toBlob(callback: BlobCallback, type?: string, quality?: any) {
    this.undelyOffscreenCanvas
      .convertToBlob({ type, quality })
      .then(callback, () => callback(null));
  }

  addEventListener(type: string, listener: (e: IEvent) => void) {
    super.addEventListener(type, listener);
    WorkerMessageService.host.trigger(MessageType.registerEvent, this.token, type);
  }

  dispatchEvent(event: IEvent) {
    if (event.target === this.token) {
      event.target = this;
      event.preventDefault = noop;
      event.stopPropagation = noop;
      super.dispatchEvent(event);
    }
    return true;
  }

  focus(options?: FocusOptions) {
    WorkerMessageService.host.trigger(MessageType.trigger, this.token, 'focus', options);
  }

  blur() {
    WorkerMessageService.host.trigger(MessageType.trigger, this.token, 'blur');
  }

  click() {
    WorkerMessageService.host.trigger(MessageType.trigger, this.token, 'click');
  }

  private _resize(token: number, rect: Partial<DOMRect>) {
    if (token === this.token) {
      this.clientRect = rect;
    }
  }
}
