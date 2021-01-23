import {
  AnimationClip,
  KeyframeTrack,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
  NumberKeyframeTrack,
  Vector3,
  Object3D,
} from 'three';
import {
  VRM,
  VRMSchema,
} from '@pixiv/three-vrm';
import VRMIKHandler from '../vrm-ik-handler';
import { convert as convertSync } from './vmd2vrmanim';

export interface AnimationData {
  duration: number;
  timelines: Timeline[];
}

export interface Timeline {
  name: VRMSchema.HumanoidBoneName | VRMSchema.BlendShapePresetName;
  type: string;
  isIK?: boolean;
  times: number[];
  values: number[];
}

export interface VRMOffsets {
  hipsOffset?: number[];
  leftFootOffset?: number[];
  rightFootOffset?: number[];
  leftToeOffset?: number[];
  rightToeOffset?: number[];
}

export function convert(buffer: ArrayBufferLike, vrm?: VRM) {
  return convertSync(buffer, vrm ? toOffset(vrm) : undefined);
}

export function toOffset(vrm: VRM): VRMOffsets {
  const { humanoid } = vrm;
  if (!humanoid) throw new Error('VRM does not have humanoid');
  const currentPose = humanoid.getPose();
  humanoid.resetPose();
  const { HumanoidBoneName } = VRMSchema;
  const hips = humanoid.getBoneNode(HumanoidBoneName.Hips);
  const leftFoot = humanoid.getBoneNode(HumanoidBoneName.LeftFoot);
  const leftToe = humanoid.getBoneNode(HumanoidBoneName.LeftToes);
  const rightFoot = humanoid.getBoneNode(HumanoidBoneName.RightFoot);
  const rightToe = humanoid.getBoneNode(HumanoidBoneName.RightToes);
  humanoid.setPose(currentPose);
  return {
    hipsOffset: calculatePosition(hips, hips),
    leftFootOffset: calculatePosition(hips, leftFoot),
    leftToeOffset: calculatePosition(leftFoot, leftToe),
    rightFootOffset: calculatePosition(hips, rightFoot),
    rightToeOffset: calculatePosition(rightFoot, rightToe),
  };
}

const tempV3 = new Vector3();
function calculatePosition(from?: Object3D | null, to?: Object3D | null) {
  if (!from || !to) return;
  let current: Object3D | null = to;
  const chain: Object3D[] = [to];
  while (current.parent && current !== from) {
    chain.push(current.parent);
    current = current.parent;
  }
  if (current == null) return;
  chain.reverse();
  const position = tempV3.set(0, 0, 0);
  for (const node of chain)
    position.add(node.position);
  return position.toArray();
}

export function bindToVRM(data: AnimationData, vrm: VRM) {
  const tracks: KeyframeTrack[] = [];
  for (const { type, name, isIK, times, values } of data.timelines) {
    let srcName: string;
    switch (type) {
      case 'morph': {
        const track = vrm.blendShapeProxy?.getBlendShapeTrackName(name);
        if (!track) continue;
        srcName = track;
        break;
      }
      case 'position':
      case 'rotation': {
        if (isIK) {
          const handler = VRMIKHandler.get(vrm);
          const target = handler.getAndEnableIK(
            name as VRMSchema.HumanoidBoneName
          );
          if (!target) continue;
          srcName = target.name;
        } else {
          const bone = vrm.humanoid?.getBone(
            name as VRMSchema.HumanoidBoneName
          );
          if (!bone) continue;
          srcName = bone.node.name;
        }
        break;
      }
      default:
        continue;
    }
    switch (type) {
      case 'morph':
        tracks.push(new NumberKeyframeTrack(srcName, times, values));
        break;
      case 'position':
        tracks.push(
          new VectorKeyframeTrack(`${srcName}.position`, times, values)
        );
        break;
      case 'rotation':
        tracks.push(
          new QuaternionKeyframeTrack(`${srcName}.quaternion`, times, values)
        );
        break;
    }
  }
  return new AnimationClip(`clip${Date.now()}`, data.duration, tracks);
}
