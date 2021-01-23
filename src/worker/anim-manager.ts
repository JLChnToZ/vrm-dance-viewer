import { vrmLoadObservable, vrmUnloadObservable } from './model-manager';
import { convert as convertVMD, bindToVRM as bindVMD2VRM } from './loaders/vmd2vrmanim.binding';
import { convert as convertBVH } from './loaders/bvh2vrmanim.binding';
import { deltaTimeObservable } from './scene';
import { AnimationAction, AnimationClip, AnimationMixer } from 'three';
import { take } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { VRM, VRMPose } from '@pixiv/three-vrm';
import VRMIKHandler from './vrm-ik-handler';
import VRMModelNoise from './vrm-model-noise';
import { WorkerMessageService } from '../utils/message-service';

const mixers = new WeakMap<VRM, AnimationMixer>();
const poses = new WeakMap<VRM, VRMPose>();
const updateSubscriptions = new WeakMap<AnimationMixer, Subscription>();
const clips = new WeakMap<AnimationMixer, AnimationClip>();
const actions = new WeakMap<AnimationMixer, AnimationAction>();

vrmLoadObservable.subscribe(model => {
  if (mixers.has(model)) return;
  const mixer = new AnimationMixer(model.scene);
  mixers.set(model, mixer);
  const ik = VRMIKHandler.get(model);
  const noise = VRMModelNoise.get(model);
  updateSubscriptions.set(mixer, deltaTimeObservable.subscribe(time => {
    const { humanoid } = model;
    let pose = poses.get(model);
    if (humanoid && pose)
      humanoid.setPose(pose);
    mixer.update(time);
    pose = humanoid?.getPose();
    if (pose) poses.set(model, pose);
    else poses.delete(model);
    noise.update(time, false);
    ik.update();
  }));
});
vrmUnloadObservable.subscribe(model => {
  const mixer = mixers.get(model);
  if (!mixer) return;
  mixer.stopAllAction();
  mixers.delete(model);
  const subscription = updateSubscriptions.get(mixer);
  if (subscription) subscription.unsubscribe();
  updateSubscriptions.delete(mixer);
});

export async function load(data: ArrayBufferLike, type: string) {
  const model = await vrmLoadObservable.pipe(take(1)).toPromise();
  const mixer = mixers.get(model);
  if (!mixer) return;
  VRMIKHandler.get(model).disableAll();
  const action = actions.get(mixer)?.stop();
  if (action) actions.delete(mixer);
  let clip = clips.get(mixer);
  if (clip) {
    mixer.uncacheAction(clip);
    mixer.uncacheClip(clip);
    clips.delete(mixer);
    clip = undefined;
  }
  try {
    switch (type) {
      case 'vmd':
        clip = bindVMD2VRM(convertVMD(data, model), model);
        break;
      case 'bvh':
        clip = convertBVH(data, model);
        break;
    }
  } catch(e) {
    clip = undefined;
    model.humanoid?.resetPose();
    poses.delete(model);
    console.error(e);
    if (e instanceof Error)
      WorkerMessageService.host.trigger('warn', `Failed to load animation:\nError: ${e.message}`);
    else if(typeof e === 'string')
      WorkerMessageService.host.trigger('warn', `Failed to load animation:\n${e}`);
  }
  if (clip) {
    clips.set(mixer, clip);
    actions.set(mixer, mixer.clipAction(clip).play());
  }
  await deltaTimeObservable.pipe(take(2)).toPromise();
}

WorkerMessageService.host.on({ loadAnimation: load });