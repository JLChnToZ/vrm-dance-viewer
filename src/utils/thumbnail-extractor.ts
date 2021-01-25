// Adopted from three-vrm
import { WebGLRenderer } from 'three';
import { VRM, VRMUtils } from '@pixiv/three-vrm';

const offscreenRenderer: WebGLRenderer[] = [];

function enquireOffscreenRenderer() {
  if (offscreenRenderer.length) return offscreenRenderer.pop()!;
  return new WebGLRenderer({ canvas: new OffscreenCanvas(512, 512) });
}

export async function extractThumbnailBlob(renderer: WebGLRenderer | null | undefined, vrm: VRM, size = 512) {
  let isInternalOffscreenRenderer = false;
  try {
    if (!renderer) {
      renderer = enquireOffscreenRenderer();
      isInternalOffscreenRenderer = true;
    }
    return await VRMUtils.extractThumbnailBlob(renderer, vrm, size);
  } finally {
    if (isInternalOffscreenRenderer) offscreenRenderer.push(renderer!);
  }
}
