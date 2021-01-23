import { Subject } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { EventDispatcher, Event as IEvent } from 'three/src/core/EventDispatcher';
import { noop, sanitize } from './helper-functions';
import { WorkerMessageService } from './message-service';
import { observeResize } from './rx-helpers';

const enum MessageType {
  transfer = 'transferCanvas',
  registerEvent = 'registerEvent',
  trigger = 'domTrigger',
  resize = 'size',
}

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

export class RemoteCanvasHost {
  private static maxToken = 0;
  private token = RemoteCanvasHost.nextToken();
  private registeredEvents = new Set<string>();
  resizeObservable = observeResize(this.canvas, {});
  private _resizeSubscription = this.resizeObservable.subscribe(this._resize.bind(this));
  eventFilters = new Map<Function, any>();

  private static nextToken() {
    return ++this.maxToken;
  }

  constructor(
    private messageService: WorkerMessageService,
    private canvas: HTMLCanvasElement,
  ) {
    const offscreenCanvas = canvas.transferControlToOffscreen();
    messageService.on({
      [MessageType.registerEvent]: this._registerEvent.bind(this),
      [MessageType.trigger]: this._trigger.bind(this),
    }).callAndTransfer(MessageType.transfer, [{
      canvas: offscreenCanvas,
      token: this.token,
      rect: canvas.getBoundingClientRect().toJSON(),
    }], [offscreenCanvas], true);
    this._eventListener = this._eventListener.bind(this);
  }

  dispose() {
    this._resizeSubscription.unsubscribe();
    for (const event of this.registeredEvents)
      this.canvas.removeEventListener(event, this._eventListener);
  }

  private _resize(update: ResizeObserverEntry) {
    this.messageService.trigger(
      MessageType.resize,
      this.token,
      update.contentRect.toJSON(),
    );
  }

  private _registerEvent(token: number, type: string) {
    if (token !== this.token || this.registeredEvents.has(type)) return;
    this.registeredEvents.add(type);
    this.canvas.addEventListener(type, this._eventListener);
  }

  private _eventListener(e: Event) {
    if (!e.defaultPrevented) e.preventDefault();
    e.stopPropagation();
    this.messageService.trigger(MessageType.trigger, Object.assign(
      sanitize(e, this.eventFilters.get(e.constructor)),
      { target: this.token },
    ));
  }

  private _trigger(token: number, type: string, options?: any) {
    if (token !== this.token) return;
    switch (type) {
      case 'focus': this.canvas.focus(options); break;
      case 'blur': this.canvas.blur(); break;
      case 'click': this.canvas.click(); break;
    }
  }
}
