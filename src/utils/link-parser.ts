
import Linkify from 'linkify-it';
import tlds from 'tlds';
import h from 'hyperscript';

const linkify = Linkify().tlds(tlds).set({ fuzzyIP: true });

export function *parseLink(src?: string): Iterable<string | HTMLElement> {
  if (!src) return;
  src = String(src).trim();
  const matches = linkify.match(src);
  if (!matches?.length)
    return yield src;
  let last = 0;
  for (const { index, lastIndex, url, text } of matches) {
    if (index !== last)
      yield src.substring(last, index);
    yield h('a', { href: url }, text);
    last = lastIndex;
  }
  if (last < src.length)
    yield src.substring(last);
}