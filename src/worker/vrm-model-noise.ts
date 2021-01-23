import { VRM, VRMHumanoid, VRMSchema } from '@pixiv/three-vrm';
import { lerp, random } from '../utils/helper-functions';
import { Euler, MathUtils, Object3D, Quaternion } from 'three';

interface NoiseConfig {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
  zmin: number;
  zmax: number;
}

const tempEular = new Euler();
const tempQ = new Quaternion();
const range = MathUtils.DEG2RAD * 25;
const intensity = 0.1;

const defaultNoise: NoiseConfig = {
  xmin: -range, xmax: range,
  ymin: -range, ymax: range,
  zmin: 0, zmax: 0,
};

const singleAxisNoise: NoiseConfig = {
  xmin: -range, xmax: range,
  ymin: 0, ymax: 0,
  zmin: 0, zmax: 0,
}

const BoneNames = VRMSchema.HumanoidBoneName;
const boneNoiseConfigs = new Map<VRMSchema.HumanoidBoneName, NoiseConfig>([
  [BoneNames.Chest, defaultNoise],
  [BoneNames.Head, defaultNoise],
  // [BoneNames.Hips, defaultNoise],
  [BoneNames.Jaw, defaultNoise],
  // [BoneNames.LeftEye, defaultNoise],
  [BoneNames.LeftFoot, defaultNoise],
  [BoneNames.LeftHand, defaultNoise],
  [BoneNames.LeftIndexDistal, singleAxisNoise],
  [BoneNames.LeftIndexIntermediate, singleAxisNoise],
  [BoneNames.LeftIndexProximal, defaultNoise],
  [BoneNames.LeftLittleDistal, singleAxisNoise],
  [BoneNames.LeftLittleIntermediate, singleAxisNoise],
  [BoneNames.LeftLittleProximal, defaultNoise],
  [BoneNames.LeftLowerArm, singleAxisNoise],
  [BoneNames.LeftLowerLeg, singleAxisNoise],
  [BoneNames.LeftMiddleDistal, singleAxisNoise],
  [BoneNames.LeftMiddleIntermediate, singleAxisNoise],
  [BoneNames.LeftMiddleProximal, defaultNoise],
  [BoneNames.LeftRingDistal, singleAxisNoise],
  [BoneNames.LeftRingIntermediate, singleAxisNoise],
  [BoneNames.LeftRingProximal, defaultNoise],
  [BoneNames.LeftShoulder, defaultNoise],
  [BoneNames.LeftThumbDistal, singleAxisNoise],
  [BoneNames.LeftThumbIntermediate, singleAxisNoise],
  [BoneNames.LeftThumbProximal, defaultNoise],
  [BoneNames.LeftToes, singleAxisNoise],
  [BoneNames.LeftUpperArm, defaultNoise],
  [BoneNames.LeftUpperLeg, defaultNoise],
  [BoneNames.Neck, defaultNoise],
  // [BoneNames.RightEye, defaultNoise],
  [BoneNames.RightFoot, defaultNoise],
  [BoneNames.RightHand, defaultNoise],
  [BoneNames.RightIndexDistal, singleAxisNoise],
  [BoneNames.RightIndexIntermediate, singleAxisNoise],
  [BoneNames.RightIndexProximal, defaultNoise],
  [BoneNames.RightLittleDistal, singleAxisNoise],
  [BoneNames.RightLittleIntermediate, singleAxisNoise],
  [BoneNames.RightLittleProximal, defaultNoise],
  [BoneNames.RightLowerArm, singleAxisNoise],
  [BoneNames.RightLowerLeg, singleAxisNoise],
  [BoneNames.RightMiddleDistal, singleAxisNoise],
  [BoneNames.RightMiddleIntermediate, singleAxisNoise],
  [BoneNames.RightMiddleProximal, defaultNoise],
  [BoneNames.RightRingDistal, singleAxisNoise],
  [BoneNames.RightRingIntermediate, singleAxisNoise],
  [BoneNames.RightRingProximal, defaultNoise],
  [BoneNames.RightShoulder, defaultNoise],
  [BoneNames.RightThumbDistal, singleAxisNoise],
  [BoneNames.RightThumbIntermediate, singleAxisNoise],
  [BoneNames.RightThumbProximal, defaultNoise],
  [BoneNames.RightToes, singleAxisNoise],
  [BoneNames.RightUpperArm, defaultNoise],
  [BoneNames.RightUpperLeg, defaultNoise],
  [BoneNames.Spine, defaultNoise],
  [BoneNames.UpperChest, defaultNoise],
]);

class VRMModelNoiseChannel {
  x = 0;
  y = 0;
  z = 0;
  private firstRun = true;

  constructor(
    public bone: Object3D,
    public xmin: number,
    public xmax: number,
    public ymin: number,
    public ymax: number,
    public zmin: number,
    public zmax: number,
    public lerpScale: number,
  ) {
    if (xmax === xmin) this.x = xmin;
    if (ymax === ymin) this.y = ymin;
    if (zmax === zmin) this.z = zmin;
  }

  update(deltaTime: number, reset?: boolean) {
    if (reset && this.firstRun)
      this.bone.quaternion.multiply(tempQ.setFromEuler(tempEular.set(this.x, this.y, this.z)).inverse());
    deltaTime *= this.lerpScale;
    if (this.xmax !== this.xmin)
      this.x = lerp(this.x, random(this.xmin, this.xmax), deltaTime);
    if (this.ymax !== this.ymin)
      this.y = lerp(this.y, random(this.ymin, this.ymax), deltaTime);
    if (this.zmax !== this.zmin)
      this.z = lerp(this.z, random(this.zmin, this.zmax), deltaTime);
    this.bone.quaternion.multiply(tempQ.setFromEuler(tempEular.set(this.x, this.y, this.z)));
    this.firstRun = false;
  }
}

export default class VRMModelNoise {
  private static cache = new WeakMap<VRM, VRMModelNoise>();
  channels: VRMModelNoiseChannel[] = [];

  public static get(vrm: VRM) {
    const { humanoid } = vrm;
    if (!humanoid) throw new Error('VRM does not have humanoid.');
    let instance = this.cache.get(vrm);
    if (!instance) this.cache.set(vrm, instance = new this(humanoid));
    return instance;
  }

  private constructor(
    public humanoid: VRMHumanoid,
  ) {
    for (const [boneName, config] of boneNoiseConfigs) {
      const bone = humanoid.getBoneNode(boneName);
      if (!bone) continue;
      this.channels.push(new VRMModelNoiseChannel(
        bone,
        config.xmin, config.xmax,
        config.ymin, config.ymax,
        config.zmin, config.zmax,
        intensity,
      ));
    }
  }

  update(deltaTime: number, reset?: boolean) {
    for (const channel of this.channels)
      channel.update(deltaTime, reset);
  }
}