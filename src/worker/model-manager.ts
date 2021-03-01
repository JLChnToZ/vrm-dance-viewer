import { VRM, VRMSchema, VRMUtils } from '@pixiv/three-vrm';
import { extractThumbnailBlob } from '../utils/thumbnail-extractor';
import { Subject } from 'rxjs';
import { blob2ArrayBuffer } from '../utils/helper-functions';
import { Group, Vector3 } from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { deltaTimeObservable } from './scene';
import { controls, panToTarget } from './scene/controls';
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
    modelUpdateOvservable.subscribe(t => panToTarget(t, model.scene, target));
  } catch(error) {
    console.error(error);
  }
  await deltaTimeObservable.pipe(take(2)).toPromise();
}

export async function loadVRM(data: ArrayBufferLike | string) {
  const gltf = await new Promise<GLTF>((resolve, reject) =>
    gltfLoader.parse(data, '', resolve, ({ error }) => reject(error)),
  );
  VRMUtils.removeUnnecessaryJoints(gltf.scene);
  return VRM.from(gltf);
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
