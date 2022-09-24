import { fromEvent, Observable } from 'rxjs';
import {
  Callback,
  Collection,
  defer,
  forEach,
  getOrCreate,
  isArrayLike,
  Resolver,
  tryIterate,
} from './helper-functions';
import { deferTrigger } from './message-queue';

const wrapperCache = new WeakMap<MessageServiceBase, EventEmitterWrapper>();

export interface CallbackInit {
  [message: string]: Callback | Collection<Callback>;
}

interface WorkerMessage {
  type: string | number;
  args: any[];
  token?: number;
}

export interface WorkerMessageServiceConnectOptions extends WorkerOptions {
  shared?: boolean;
}

function isSharedWorkerGlobalScope(worker: any): worker is SharedWorkerGlobalScope {
  return self.SharedWorkerGlobalScope && (worker instanceof self.SharedWorkerGlobalScope);
}

class EventEmitterWrapper {
  addListener: (message: string, callback: Callback) => void;
  removeListener: (message: string, callback: Callback) => void;

  constructor(messageService: MessageServiceBase) {
    this.addListener = messageService.on.bind(messageService);
    this.removeListener = messageService.off.bind(messageService);
  }
}

export abstract class MessageServiceBase {
  private _callbacks = new Map<string, Set<Callback>>();
  private _resolvers = new Map<number, Resolver<any[]>>();
  private _callbackTokenInc = 0;
  protected _callbackState?: any;

  constructor(callbackInit?: CallbackInit) {
    if (callbackInit != null) this.on(callbackInit);
  }

  public trigger(message: string, ...args: any[]) {
    return this._sendMessage(String(message), args), this;
  }

  public call(message: string, ...args: any[]) {
    return this._sendMessage(String(message), args, true);
  }

  public on(message: string, ...callbacks: Callback[]): this;
  public on(messages: CallbackInit): this;
  public on(m: string | CallbackInit, ...callbacks: Callback[]) {
    if (typeof m !== 'object')
      m = { [m]: callbacks };
    for (const message in m) {
      if (!(message in m) || typeof message !== 'string')
        continue;
      const callback = m[message];
      if (!callback) continue;
      let oCallbacks = this._callbacks.get(message);
      if (typeof callback === 'function') {
        if (!oCallbacks)
          this._callbacks.set(message, oCallbacks = new Set());
        oCallbacks.add(callback);
        continue;
      }
      if (isArrayLike(callback) && !callback.length)
        continue;
      if (!oCallbacks) {
        this._callbacks.set(message, new Set(tryIterate(callback)));
        continue;
      }
      forEach(callback, oCallbacks.add, oCallbacks);
    }
    return this;
  }

  public off(message: string, ...callbacks: Callback[]) {
    message = String(message);
    if (!callbacks?.length)
      return this._callbacks.delete(message), this;
    const oCallbacks = this._callbacks.get(message);
    if (oCallbacks?.size)
      callbacks.forEach(oCallbacks.delete, oCallbacks);
    if (!oCallbacks?.size)
      this._callbacks.delete(message);
    return this;
  }

  public observe<T = any>(message: string) {
    return fromEvent(
      getOrCreate(wrapperCache, this, EventEmitterWrapper, this),
      message,
    ) as Observable<T>;
  }

  public dispose() {
    this._callbacks.clear();
    this._resolvers.clear();
  }

  protected _sendMessage(messageOrToken: string | number, args: any[]): void;
  protected _sendMessage(
    message: string,
    args: any[],
    requireCallback: true,
  ): Promise<any[]>;
  protected _sendMessage(
    messageOrToken: string | number,
    args: any[],
    requireCallback?: boolean,
  ): Promise<any[]> | undefined;
  protected _sendMessage(id: string | number, args: any[], requireCallback?: boolean) {
    if (!requireCallback || typeof id === 'number')
      return void this._sendMessageImpl(id, args);
    const message = id;
    return new Promise((resolve, reject) => {
      const callbackToken = ++this._callbackTokenInc;
      this._resolvers.set(callbackToken, { resolve, reject });
      try {
        this._sendMessageImpl(message, args, callbackToken);
      } catch (error) {
        reject(error);
        this._resolvers.delete(callbackToken);
      }
    });
  }

  protected abstract _sendMessageImpl(
    messageOrToken: string | number,
    args: any[],
    callbackToken?: number,
  ): void;

  protected _handleReceivedMessage(
    messageOrToken: string | number,
    args: any[],
    callbackToken?: number,
  ) {
    switch (typeof messageOrToken) {
      case 'string': {
        const callbacks = this._callbacks.get(messageOrToken);
        if (!callbacks?.size) {
          if (callbackToken != null)
            this._sendMessage(callbackToken, [
              new Error(`Message ${messageOrToken} is not registered.`),
            ]);
          break;
        }
        const { _callbackState } = this;
        if (callbackToken != null)
          Promise.all(Array.from(callbacks).map(cb => defer(cb, _callbackState, args))).then(
            value => this._sendMessage(callbackToken, [null, value]),
            error => this._sendMessage(callbackToken, [error]),
          );
        else
          callbacks.forEach(cb => deferTrigger(cb, _callbackState, args));
        break;
      }
      case 'number': {
        const resolver = this._resolvers.get(messageOrToken);
        if (resolver == null) break;
        this._resolvers.delete(messageOrToken);
        if (args.length < 2) resolver.reject(args[0]);
        else resolver.resolve(args[1]);
        break;
      }
    }
  }
}

export class LoopbackMessageService extends MessageServiceBase {
  protected _sendMessageImpl(id: string | number, args: any[], callbackToken?: number) {
    return this._handleReceivedMessage(id, args, callbackToken);
  }
}

export class WorkerMessageService extends MessageServiceBase {
  private _sendTransfers = new WeakMap<any[], Collection<Transferable>>();
  private _callbackTransfers = new Map<number, Iterable<Transferable>>();
  private _ports?: Set<MessagePort>;
  private _callbackMapping?: Map<number, MessagePort>;

  public static get host() {
    return new WorkerMessageService(
      self as DedicatedWorkerGlobalScope | SharedWorkerGlobalScope,
    );
  }

  public static to(
    path: string,
    options?: WorkerMessageServiceConnectOptions,
    callbackInit?: CallbackInit,
  ) {
    return new WorkerMessageService(
      options?.shared ?
        new SharedWorker(path, options).port :
        new Worker(path, options),
      callbackInit,
    );
  }

  public constructor(
    public worker:
      Worker | MessagePort |
      DedicatedWorkerGlobalScope |
      SharedWorkerGlobalScope,
    callbackInit?: CallbackInit,
  ) {
    super(callbackInit);
    const { constructor } = Object.getPrototypeOf(this);
    if (constructor === WorkerMessageService && worker === self)
      Object.defineProperty(constructor, 'host', { value: this, configurable: true });
    this._receiveMessageImpl = this._receiveMessageImpl.bind(this);
    if (isSharedWorkerGlobalScope(worker)) {
      this._callbackMapping = new Map();
      this._ports = new Set();
      this._connectImpl = this._connectImpl.bind(this);
      worker.addEventListener('connect', this._connectImpl);
    } else {
      worker.addEventListener('message', this._receiveMessageImpl as EventListener);
      if (worker instanceof MessagePort) worker.start();
    }
  }

  public callAndTransfer(
    message: string,
    args: any[],
    transfer?: Collection<Transferable>,
    isTrigger?: false,
  ): Promise<any[]>;
  public callAndTransfer(
    message: string,
    args: any[],
    transfer: Collection<Transferable> | undefined,
    isTrigger: true,
  ): void;
  public callAndTransfer(
    message: string,
    args: any[],
    transfer?: Collection<Transferable>,
    isTrigger?: boolean,
  ): Promise<any[]> | undefined;
  public callAndTransfer(
    message: string,
    args: any[],
    transfer?: Collection<Transferable>,
    isTrigger?: boolean,
  ) {
    if (transfer != null) this._sendTransfers.set(args, transfer);
    return this._sendMessage(String(message), args, !isTrigger);
  }

  public dispose() {
    super.dispose();
    delete this._callbackState;
    this._callbackTransfers.clear();
    if (isSharedWorkerGlobalScope(this.worker)) {
      if (this._ports?.size) {
        for (const port of this._ports) {
          port.removeEventListener('message', this._receiveMessageImpl);
          port.close();
        }
        this._ports.clear();
      }
      this.worker.removeEventListener('connect', this._connectImpl);
    } else {
      this.worker.removeEventListener('message', this._receiveMessageImpl as EventListener);
      if (this.worker instanceof MessagePort) this.worker.close();
    }
    if (WorkerMessageService.host === this)
      Object.defineProperty(WorkerMessageService, 'host', {
        value: undefined,
        configurable: true,
      });
  }

  protected _connectImpl(e: MessageEvent) {
    if (!isSharedWorkerGlobalScope(this.worker) || !this._ports || !e.ports?.length)
      return;
    for (const port of e.ports) {
      if (this._ports.has(port))
        continue;
      port.addEventListener('message', this._receiveMessageImpl);
      port.start();
      this._ports.add(port);
    }
  }

  protected _receiveMessageImpl(e: MessageEvent<WorkerMessage>) {
    if (e.data == null) return;
    const { type, args, token } = e.data;
    switch (typeof type) {
      case 'number':
        const transfer = new Set<Transferable>();
        this._callbackState = { transfer };
        this._callbackTransfers.set(type, transfer);
        break;
      case 'string':
        if (isSharedWorkerGlobalScope(this.worker) && token != null && (e.source instanceof MessagePort))
          this._callbackMapping?.set(token, e.source);
        break;
    }
    try {
      return this._handleReceivedMessage(type, args, token);
    } finally {
      delete this._callbackState;
    }
  }

  protected _sendMessageImpl(type: string | number, args: any[], token?: number) {
    let transfer: Collection<Transferable> | undefined;
    try {
      let { worker } = this;
      switch (typeof type) {
        case 'number':
          if (isSharedWorkerGlobalScope(worker)) {
            const port = this._callbackMapping?.get(type);
            if (!port) return;
            worker = port;
            this._callbackMapping!.delete(type);
          }
          if (args[0] instanceof Error) {
            const { message, stack } = args[0];
            args[0] = { message, stack };
          }
          transfer = this._callbackTransfers.get(type);
          break;
        case 'string':
          if (isSharedWorkerGlobalScope(worker))
            throw new Error('Not supported operation.');
          transfer = this._sendTransfers.get(args);
          break;
      }
      return worker.postMessage(
        { type, args, token } as WorkerMessage,
        transfer != null ? Array.isArray(transfer) ?
          transfer : Array.from(transfer) : [],
      );
    } finally {
      if (transfer != null)
        switch (typeof type) {
          case 'number': this._callbackTransfers.delete(type); break;
          case 'string': this._sendTransfers.delete(args); break;
        }
    }
  }
}
