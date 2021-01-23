import { fromEvent, Observable, queueScheduler, scheduled } from 'rxjs';
import { filter, map, mergeAll, shareReplay } from 'rxjs/operators';
import { forEach, isTruely } from './helper-functions';

export function observeMutation(target: Node, options?: MutationObserverInit) {
  return new Observable<MutationRecord[]>(subscriber => {
    const observer = new MutationObserver(subscriber.next.bind(subscriber));
    observer.observe(target, options);
    return observer.disconnect.bind(observer);
  }).pipe(mergeAll());
}

export function observeResize(target: Element, options?: ResizeObserverOptions) {
  return new Observable<readonly ResizeObserverEntry[]>(subscriber => {
    const observer = new ResizeObserver(subscriber.next.bind(subscriber));
    observer.observe(target, options);
    return observer.disconnect.bind(observer);
  }).pipe(map(updates => {
    for (let i = updates.length - 1; i >= 0; i--)
      if (updates[i].target === target)
        return updates[i];
  }), filter(isTruely));
}

export function observeIntersection(
  target: Element | ArrayLike<Element> | Iterable<Element>,
  options?: IntersectionObserverInit,
) {
  return new Observable<IntersectionObserverEntry[]>(subscriber => {
    const observer = new IntersectionObserver(subscriber.next.bind(subscriber), options);
    if (target instanceof Element)
      observer.observe(target);
    else
      forEach(target, observer.observe, observer);
    return observer.disconnect.bind(observer);
  }).pipe(mergeAll());
}

const mqObservables = new Map<string, Observable<boolean>>();
export function observeMediaQuery(query: string) {
  let observable = mqObservables.get(query);
  if (!observable) {
    const mq = matchMedia(query);
    mqObservables.set(query, observable = scheduled([[
      mq.matches,
    ], fromEvent<MediaQueryListEvent>(mq, 'change').pipe(
      map(e => e.matches),
    )], queueScheduler).pipe(
      mergeAll(),
      shareReplay(1),
    ));
  }
  return observable;
}
