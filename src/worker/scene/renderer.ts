import { WebGLRenderer } from 'three';

export let renderer: WebGLRenderer | undefined;

export function init(canvas: HTMLCanvasElement | OffscreenCanvas) {
  if (renderer) return;
  renderer = new WebGLRenderer({
    antialias: true,
    canvas,
  });
}
