import { Object3D } from 'three/src/core/Object3D';
import { MathUtils } from 'three/src/math/MathUtils';
import { Quaternion } from 'three/src/math/Quaternion';
import { Vector3 } from 'three/src/math/Vector3';
import { Euler } from 'three/src/math/Euler';
import { Bone } from 'three/src/objects/Bone';
import { VRM, VRMSchema } from '@pixiv/three-vrm';

const BoneNames = VRMSchema.HumanoidBoneName;
const boneNameOrder: VRMSchema.HumanoidBoneName[] = [
  BoneNames.Chest,
  BoneNames.Head,
  BoneNames.Hips,
  BoneNames.Jaw,
  BoneNames.LeftEye,
  BoneNames.LeftFoot,
  BoneNames.LeftHand,
  BoneNames.LeftIndexDistal,
  BoneNames.LeftIndexIntermediate,
  BoneNames.LeftIndexProximal,
  BoneNames.LeftLittleDistal,
  BoneNames.LeftLittleIntermediate,
  BoneNames.LeftLittleProximal,
  BoneNames.LeftLowerArm,
  BoneNames.LeftLowerLeg,
  BoneNames.LeftMiddleDistal,
  BoneNames.LeftMiddleIntermediate,
  BoneNames.LeftMiddleProximal,
  BoneNames.LeftRingDistal,
  BoneNames.LeftRingIntermediate,
  BoneNames.LeftRingProximal,
  BoneNames.LeftShoulder,
  BoneNames.LeftThumbDistal,
  BoneNames.LeftThumbIntermediate,
  BoneNames.LeftThumbProximal,
  BoneNames.LeftToes,
  BoneNames.LeftUpperArm,
  BoneNames.LeftUpperLeg,
  BoneNames.Neck,
  BoneNames.RightEye,
  BoneNames.RightFoot,
  BoneNames.RightHand,
  BoneNames.RightIndexDistal,
  BoneNames.RightIndexIntermediate,
  BoneNames.RightIndexProximal,
  BoneNames.RightLittleDistal,
  BoneNames.RightLittleIntermediate,
  BoneNames.RightLittleProximal,
  BoneNames.RightLowerArm,
  BoneNames.RightLowerLeg,
  BoneNames.RightMiddleDistal,
  BoneNames.RightMiddleIntermediate,
  BoneNames.RightMiddleProximal,
  BoneNames.RightRingDistal,
  BoneNames.RightRingIntermediate,
  BoneNames.RightRingProximal,
  BoneNames.RightShoulder,
  BoneNames.RightThumbDistal,
  BoneNames.RightThumbIntermediate,
  BoneNames.RightThumbProximal,
  BoneNames.RightToes,
  BoneNames.RightUpperArm,
  BoneNames.RightUpperLeg,
  BoneNames.Spine,
  BoneNames.UpperChest,
];
const boneMap = new Map<VRMSchema.HumanoidBoneName, number>(
  boneNameOrder.map((b, i) => [b, i])
);

interface IKS {
  effector: number;
  target: number;
  iteration: number;
  links: {
    enabled: boolean;
    index: number;
    rotationMin?: Vector3;
    rotationMax?: Vector3;
  }[];
  minAngle?: number;
  maxAngle?: number;
}

export default class VRMIKHandler {
  private static cache = new WeakMap<VRM, VRMIKHandler>();
  private q = new Quaternion();
  private targetPos = new Vector3();
  private targetVec = new Vector3();
  private effectorPos = new Vector3();
  private effectorVec = new Vector3();
  private linkPos = new Vector3();
  private invLinkQ = new Quaternion();
  private linkScale = new Vector3();
  private axis = new Vector3();

  static get(model: VRM) {
    let handler = this.cache.get(model);
    if (!handler) {
      handler = new VRMIKHandler(model);
      this.cache.set(model, handler);
    }
    return handler;
  }

  private targets = new Map<number, Object3D>();
  private iks = new Map<number, IKS>();
  private bones: Bone[];

  private constructor(public model: VRM) {
    const { humanoid } = this.model;
    if (!humanoid) throw new Error('VRM does not contains humanoid');
    this.bones = boneNameOrder.map(humanoid.getBoneNode, humanoid) as Bone[];
    const leftFootId = boneMap.get(BoneNames.LeftFoot)!;
    this.iks.set(leftFootId, {
      effector: leftFootId,
      target: leftFootId,
      iteration: 40,
      maxAngle: 0.5,
      links: [{
        enabled: false,
        index: boneMap.get(BoneNames.LeftLowerLeg)!,
        rotationMin: new Vector3(-180, 0, 0).multiplyScalar(
          MathUtils.DEG2RAD
        ),
        rotationMax: new Vector3(0, 0, 0),
      }, {
        enabled: false,
        index: boneMap.get(BoneNames.LeftUpperLeg)!,
      }],
    });
    const rightFootId = boneMap.get(BoneNames.RightFoot)!;
    this.iks.set(rightFootId, {
      effector: rightFootId,
      target: rightFootId,
      iteration: 40,
      maxAngle: 0.5,
      links: [{
        enabled: false,
        index: boneMap.get(BoneNames.RightLowerLeg)!,
        rotationMin: new Vector3(-180, 0, 0).multiplyScalar(
          MathUtils.DEG2RAD
        ),
        rotationMax: new Vector3(0, 0, 0),
      }, {
        enabled: false,
        index: boneMap.get(BoneNames.RightUpperLeg)!,
      }],
    });
    const leftToeId = boneMap.get(BoneNames.LeftToes)!;
    this.iks.set(leftToeId, {
      effector: leftToeId,
      target: leftToeId,
      iteration: 3,
      maxAngle: 1,
      links: [{
        enabled: false,
        index: leftFootId,
      }],
    });
    const rightToeId = boneMap.get(BoneNames.RightToes)!;
    this.iks.set(rightToeId, {
      effector: rightToeId,
      target: rightToeId,
      iteration: 3,
      maxAngle: 1,
      links: [{
        enabled: false,
        index: rightFootId,
      }],
    });
  }

  getAndEnableIK(boneName: VRMSchema.HumanoidBoneName) {
    return this.getTarget(boneName, true);
  }

  getTarget(boneName: VRMSchema.HumanoidBoneName, enable?: boolean) {
    const boneIndex = boneMap.get(boneName);
    if (boneIndex == null) return;
    let target = this.targets.get(boneIndex);
    const ik = this.iks.get(boneIndex)!;
    if (enable) for (const link of ik.links) link.enabled = true;
    if (!target) {
      target = new Object3D();
      target.name = `${boneName}IK`;
      this.model.scene.add(target);
      this.targets.set(boneIndex, target);
    }
    return target;
  }

  disableAll() {
    for (const { links } of this.iks.values())
      for (const link of links)
        link.enabled = false;
  }

  update() {
    for (const ik of this.iks.values()) {
      const effector = this.bones[ik.effector];
      const target = this.targets.get(ik.target);
      if (!effector || !target) continue;
      this.targetPos.setFromMatrixPosition(target.matrixWorld);
      const iteration = ik.iteration ?? 1;
      for (let j = 0; j < iteration; j++) {
        let rotated = false;
        for (const { enabled, index, rotationMin, rotationMax } of ik.links) {
          if (!enabled) break;
          const link = this.bones[index];
          link.matrixWorld.decompose(
            this.linkPos,
            this.invLinkQ,
            this.linkScale
          );
          this.invLinkQ.inverse();
          this.effectorPos.setFromMatrixPosition(effector.matrixWorld);
          this.effectorVec
            .subVectors(this.effectorPos, this.linkPos)
            .applyQuaternion(this.invLinkQ)
            .normalize();
          this.targetVec
            .subVectors(this.targetPos, this.linkPos)
            .applyQuaternion(this.invLinkQ)
            .normalize();
          let angle = this.targetVec.dot(this.effectorVec);
          if (angle > 1) angle = 1;
          else if (angle < -1) angle = -1;
          angle = Math.acos(angle);
          if (angle < 1e-5) continue;
          if (ik.minAngle != null && angle < ik.minAngle) angle = ik.minAngle;
          if (ik.maxAngle != null && angle > ik.maxAngle) angle = ik.maxAngle;
          this.axis.crossVectors(this.effectorVec, this.targetVec).normalize();
          link.quaternion.multiply(this.q.setFromAxisAngle(this.axis, angle));
          clampVector3ByRadian(link.rotation, rotationMin, rotationMax);
          link.updateMatrixWorld(true);
          rotated = true;
        }
        if (!rotated) break;
      }
    }
  }
}

const PI2 = Math.PI * 2;

function clampVector3ByRadian(
  v: Vector3 | Euler,
  min?: Vector3,
  max?: Vector3
) {
  return v.set(
    clampByRadian(v.x, min?.x, max?.x),
    clampByRadian(v.y, min?.y, max?.y),
    clampByRadian(v.z, min?.z, max?.z)
  );
}

function clampByRadian(
  v: number,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY
) {
  const hasMin = Number.isFinite(min);
  const hasMax = Number.isFinite(max);
  if (hasMin && hasMax && min === max) return min;
  if (hasMin) min = repeat(min, PI2);
  if (hasMax) max = repeat(max, PI2);
  v = repeat(v, PI2);
  if (hasMin && hasMax && min >= max) {
    max += PI2;
    if (v < Math.PI) v += PI2;
  }
  if (hasMax && v > max) v = max;
  else if (hasMin && v < min) v = min;
  return repeat(v, PI2);
}

function repeat(v: number, max: number) {
  return Number.isFinite(max) ? ((v % max) + max) % max : v;
}
