// Adopted from three-vrm
import { DoubleSide, Mesh, MeshBasicMaterial, OrthographicCamera, PlaneBufferGeometry, Scene, Vector2, WebGLRenderer } from 'three';
import { VRM } from '@pixiv/three-vrm';

const _v2A = new Vector2();

const _camera = new OrthographicCamera(-1, 1, -1, 1, -1, 1);
const _plane = new Mesh(
  new PlaneBufferGeometry(2, 2),
  new MeshBasicMaterial({ color: 0xffffff, side: DoubleSide }),
);
const _scene = new Scene();
_scene.add(_plane);

const offscreenRenderer: WebGLRenderer[] = [];

function enquireOffscreenRenderer() {
  if (offscreenRenderer.length) {
    return offscreenRenderer.pop()!;
  }
  return new WebGLRenderer({ canvas: new OffscreenCanvas(512, 512) });
}


export function extractThumbnailBlob(renderer: WebGLRenderer | null | undefined, vrm: VRM, size = 512): Promise<Blob> {
  let isInternalOffscreenRenderer = false;
  if (!renderer) {
    renderer = enquireOffscreenRenderer();
    isInternalOffscreenRenderer = true;
  }
  const isOffscreenCanvas = renderer.getContext().canvas instanceof OffscreenCanvas;
  // get the texture
  const texture = vrm.meta?.texture;
  if (!texture) {
    throw new Error('extractThumbnailBlob: This VRM does not have a thumbnail');
  }

  // store the current resolution
  renderer.getSize(_v2A);
  const prevWidth = _v2A.x;
  const prevHeight = _v2A.y;

  // overwrite the resolution
  renderer.setSize(size, size, !isOffscreenCanvas);

  // assign the texture to plane
  _plane.material.map = texture;

  // render
  renderer.render(_scene, _camera);

  // get blob
  if (isOffscreenCanvas) {
    return ((renderer.getContext().canvas) as OffscreenCanvas).convertToBlob().finally(() => {
      if (isInternalOffscreenRenderer) {
        offscreenRenderer.push(renderer!);
      } else {
        // revert to previous resolution
        renderer!.setSize(prevWidth, prevHeight, false);
      }
    });
  }
  
  return new Promise((resolve, reject) => {
    ((renderer!.getContext().canvas) as HTMLCanvasElement).toBlob((blob) => {
      // revert to previous resolution
      renderer!.setSize(prevWidth, prevHeight);

      if (blob == null) {
        reject('extractThumbnailBlob: Failed to create a blob');
      } else {
        resolve(blob);
      }
    });
  });
}