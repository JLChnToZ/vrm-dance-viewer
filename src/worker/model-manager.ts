import { VRM, VRMSchema } from '@pixiv/three-vrm';
import { extractThumbnailBlob } from '../utils/thumbnail-extractor';
import { Observable, Subject } from 'rxjs';
import { blob2ArrayBuffer } from '../utils/helper-functions';
import { Vector3 } from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { deltaTimeObservable } from './scene';
import { controls } from './scene/controls';
import { scene } from './scene/scene';
import { shareReplay, take, takeUntil } from 'rxjs/operators';
import { WorkerMessageService } from '../utils/message-service';

const gltfLoader = new GLTFLoader();
const v3 = new Vector3();

let currentModel: VRM | undefined;

const vrmLoadSubject = new Subject<VRM>();
const vrmUnloadSubject = new Subject<VRM>();

export const vrmLoadObservable = vrmLoadSubject.pipe(shareReplay(1));
export const vrmUnloadObservable = vrmUnloadSubject.asObservable();

export async function load(data: ArrayBufferLike | string) {
  try {
    const model = await loadVRM(data);
    if (currentModel) {
      vrmUnloadSubject.next(currentModel);
      scene.remove(currentModel.scene);
      currentModel.dispose();
      currentModel = undefined;
    }
    currentModel = model;
    scene.add(model.scene);
    notifyMeta(model);
    vrmLoadSubject.next(model);
    const modelUpdateOvservable = deltaTimeObservable.pipe(takeUntil(vrmUnloadSubject));
    modelUpdateOvservable.subscribe(model.update.bind(model));
    const target = model.humanoid?.getBoneNode(VRMSchema.HumanoidBoneName.Hips);
    if (target)
      modelUpdateOvservable.subscribe(t =>
        controls?.target.lerp(target.getWorldPosition(v3), Math.min(1, t))
      );
  } catch(error) {
    console.error(error);
  }
  await deltaTimeObservable.pipe(take(2)).toPromise();
}

export function loadVRM(data: ArrayBufferLike | string) {
  return new Promise<GLTF>((resolve, reject) =>
    gltfLoader.parse(data, '', resolve, ({ error }) => reject(error)),
  ).then(VRM.from);
}

async function notifyMeta(model: VRM) {
  const { meta } = model;
  const data: any = Object.assign({}, meta);
  let thumb: ArrayBuffer | undefined;
  if (meta?.texture) {
    delete data.texture;
    try {
      data.texture = thumb = await blob2ArrayBuffer(
        await extractThumbnailBlob(null, model, 256),
      );
    } catch(e) {
      console.warn(e);
    }
  }
  WorkerMessageService.host.callAndTransfer('displayMeta', [data], thumb ? [thumb] : undefined, true);
}

WorkerMessageService.host.on({ loadModel: load });
