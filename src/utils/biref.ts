
export type BiRefCallback<T> = (value: T, oldValue: T) => void;

export interface BiRef<T> {
  (newValue?: T): T;
  on(cb: BiRefCallback<T>): void;
  off(cb: BiRefCallback<T>): void;
}

export function biRef<T>(value: T): BiRef<T> {
  const callbacks = new Set<BiRefCallback<T>>();
  return Object.assign(function(newValue?: T) {
    if (newValue !== undefined && newValue !== value) {
      const oldValue = value;
      value = newValue;
      if (callbacks.size)
        for (const callback of callbacks)
          try { callback(value, oldValue); } catch {}
    }
    return value;
  }, {
    on(cb: BiRefCallback<T>) { callbacks.add(cb); },
    off(cb: BiRefCallback<T>) { callbacks.delete(cb); },
  });
}
