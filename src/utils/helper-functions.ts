export type Collection<T> = ArrayLike<T> | Iterable<T>;

export type Callback = (...args: any[]) => any;

export const emptyArray = Object.freeze<any>([]);

export interface Resolver<T> {
  resolve(value?: T | PromiseLike<T>): void;
  reject(reason?: any): void;
}

export function isTruely<T>(x: T): x is Exclude<T, false | "" | 0 | null | undefined> {
  return !!x;
}

export function noop() {}

export function lazyInit<C extends new(...args: any[]) => any>(
  Class: C,
  args: ConstructorParameters<C> extends [] ?
    [] | null | undefined :
    ConstructorParameters<C>,
  init?: (Partial<InstanceType<C>> & ThisType<InstanceType<C>>) | null,
): InstanceType<C> {
  return Object.assign(Reflect.construct(Class, args ?? emptyArray), init);
}

export function blob2ArrayBuffer(blob: Blob) {
  return new Promise<ArrayBuffer>((resolve, reject) => lazyInit<typeof FileReader>(FileReader, null, {
    onload: ({ target }) => resolve(target?.result as ArrayBuffer),
    onerror: ({ target }) => reject(target?.error),
  }).readAsArrayBuffer(blob));
}

export function arrayBufferToObjectUrl(...data: BlobPart[]) {
  return URL.createObjectURL(new Blob(data));
}

export function interceptEvent(e: Event) {
  if(e.cancelable && !e.defaultPrevented)
    e.preventDefault();
  e.stopPropagation();
}

export function getOrCreate<K>(map: Map<K, any>, key: K): any;
export function getOrCreate<K, V, A extends any[] = any[]>(
  map: Map<K, V>,
  key: K,
  ctor: new(...args: A) => V,
  ...args: A
): V;
export function getOrCreate<K extends object>(
  map: WeakMap<K, any>,
  key: K
): any;
export function getOrCreate<K extends object, V, A extends any[] = any[]>(
  map: WeakMap<K, V>,
  key: K,
  ctor: new(...args: A) => V,
  ...args: A
): V;
export function getOrCreate(
  map: WeakMap<any, any> | Map<any, any>,
  key: any,
  ctor?: Function,
  ...args: any[]
) {
  if (map.has(key)) return map.get(key)!;
  const entry = ctor == null ? Object.create(null) : Reflect.construct(ctor, args);
  map.set(key, entry);
  return entry;
}

export function addEventListenerAndCache(
  cacheList: [EventTarget, string, EventListenerOrEventListenerObject][],
  target: EventTarget,
  event: string,
  callback: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions | boolean,
) {
  target.addEventListener(event, callback, options);
  const cacheEntry: [EventTarget, string, EventListenerOrEventListenerObject] = [target, event, callback];
  if (cacheList) {
    cacheList.push(cacheEntry);
    return cacheList;
  }
  return [cacheEntry];
}

export function delay(duration: number): Promise<void>;
export function delay<T>(duration: number, returnValue: T): Promise<T>;
export function delay(duration: number, returnValue?: any) {
  return new Promise(resolve => setTimeout(resolve, duration, returnValue));
}

export function isArrayLike(src: any): src is ArrayLike<any> {
  if (src == null || typeof src === 'function')
    return false;
  if (Array.isArray(src))
    return true;
  const { length } = src;
  return Number.isInteger(length) && length >= 0;
}

export function isIterable(src: any): src is Iterable<any> {
  return src != null && typeof src[Symbol.iterator] === 'function';
}

export function tryIterate<T>(src?: Collection<T> | null): Iterable<T> {
  return src == null ? emptyArray :
    isIterable(src) ? src :
    Array.prototype.values.call(src);
}

export function forEach<S extends Iterable<any> | ArrayLike<any>>(
  src: S,
  callback: (
    value: S extends Iterable<infer T> ? T : S extends ArrayLike<infer T> ? T : unknown,
    value2: S extends Iterable<infer T> ? T : S extends ArrayLike<any> ? number : unknown,
    src: S,
  ) => void
): void;
export function forEach<S extends Iterable<any> | ArrayLike<any>, A>(
  src: S,
  callback: (
    this: A,
    value: S extends Iterable<infer T> ? T :
      S extends ArrayLike<infer T> ? T : never,
    value2: S extends Iterable<infer T> ? T :
      S extends ArrayLike<any> ? number : never,
    src: S,
  ) => void,
  thisArg: A,
): void;
export function forEach(
  src: Iterable<any> | ArrayLike<any>,
  callback: (value: any, value2: any, src: Iterable<any> | ArrayLike<any>) => void,
  thisArg?: any,
) {
  if (src instanceof Set)
    src.forEach(callback, thisArg);
  else if (isIterable(src))
    for (const entry of src)
      callback.call(thisArg, entry, entry, src);
  else
    Array.prototype.forEach.call(src, callback, thisArg);
}

export function defer(callback: Callback, thisArg: any, args: any[]) {
  return new Promise<any>(r => r(Function.prototype.apply.call(callback, thisArg, args)));
}

export function sanitize(raw: any, filter?: any) {
  if (raw == null) return;
  switch (typeof raw) {
    case 'undefined':
    case 'function':
    case 'symbol':
      return;
    case 'number':
    case 'boolean':
    case 'string':
    case 'bigint':
      return raw;
  }
  const sanitized: any = {};
  for (const key in (filter || raw)) {
    if (raw[key] == null ||
      typeof raw[key] === 'function' ||
      (raw[key] instanceof EventTarget) ||
      (raw[key] instanceof Window)
    ) continue;
    const value = raw[key];
    if (typeof value !== 'object') {
      sanitized[key] = value;
      continue;
    }
    if (typeof value.length === 'number') {
      let childFilter: any;
      if (filter) {
        if (Array.isArray(filter[key]))
          childFilter = filter[key][0];
        else if (filter[key] !== true)
          continue;
      }
      const result: any[] = [];
      for (let i = 0; i < value.length; i++)
        result[i] = sanitize(value[i], childFilter);
      sanitized[key] = result;
      continue;
    }
    if (typeof value[Symbol.iterator] === 'function') {
      let childFilter: any;
      if (filter) {
        if (Array.isArray(filter[key]))
          childFilter = filter[key][0];
        else if (filter[key] !== true)
          continue;
      }
      const result: any[] = [];
      for (const entry of value)
        result.push(sanitize(entry, childFilter));
      sanitized[key] = result;
      continue;
    }
    sanitized[key] = sanitize(value, filter && filter[key]);
  }
  return sanitized;
}

export function isInFrame() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
