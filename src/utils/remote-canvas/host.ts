import { MessageType } from '.';
import { interceptEvent, sanitize } from '../helper-functions';
import { WorkerMessageService } from '../message-service';
import { observeResize } from '../rx-helpers';

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
    this.interceptEvent(e);
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

  interceptEvent(e: Event) {
    return interceptEvent(e);
  }
}
