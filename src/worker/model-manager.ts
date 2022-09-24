import { VRM, VRMCoreLoaderPlugin, VRMHumanBoneName, VRMUtils } from '@pixiv/three-vrm';
import { lastValueFrom, Subject } from 'rxjs';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { deltaTimeObservable } from './scene';
import { panToTarget } from './scene/controls';
import { scene } from './scene/scene';
import { shareReplay, take, takeUntil } from 'rxjs/operators';
import { WorkerMessageService } from './worker-message-service-shim';

const gltfLoader = new GLTFLoader().register(
  parser => new VRMCoreLoaderPlugin(parser, { helperRoot: scene, autoUpdateHumanBones: true }),
);

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
      VRMUtils.deepDispose(currentModel.scene);
      currentModel = undefined;
    }
    currentModel = model;
    scene.add(model.scene);
    notifyMeta(model);
    vrmLoadSubject.next(model);
    const modelUpdateOvservable = deltaTimeObservable.pipe(takeUntil(vrmUnloadSubject));
    modelUpdateOvservable.subscribe(model.update.bind(model));
    const target = model.humanoid?.getRawBoneNode(VRMHumanBoneName.Hips);
    modelUpdateOvservable.subscribe(t => panToTarget(t, model.scene, target));
  } catch(error) {
    console.error(error);
  }
  await lastValueFrom(deltaTimeObservable.pipe(take(2)));
}

export async function loadVRM(data: ArrayBufferLike | string) {
  const gltf = await gltfLoader.parseAsync(data, '');
  console.log(gltf.userData);
  const { vrmCore } = gltf.userData;
  VRMUtils.rotateVRM0(vrmCore);
  VRMUtils.removeUnnecessaryJoints(gltf.scene);
  return vrmCore as VRM;
}

function notifyMeta(model: VRM) {
  WorkerMessageService.host.call('displayMeta', model.meta);
}

WorkerMessageService.host.on({ loadModel: load });
