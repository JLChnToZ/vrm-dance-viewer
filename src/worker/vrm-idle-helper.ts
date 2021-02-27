import { VRM, VRMLookAtHead, VRMSchema } from '@pixiv/three-vrm';
import { Euler, MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import { vrmUnloadObservable } from './model-manager';
import { camera } from './scene/camera';
import { lerp } from '../utils/helper-functions';
import { clampByRadian } from '../utils/three-helpers';

const BoneNames = VRMSchema.HumanoidBoneName;

const LERP_SCALE = 6;
const HEAD_CLAMP_ANGLE = 60 * MathUtils.DEG2RAD;
const ARM_IDLE_ANGLE = 75 * MathUtils.DEG2RAD;
const FINGER_IDLE_ANGLE = 15 * MathUtils.DEG2RAD;
const THUMB_IDLE_ANGLE = 30 * MathUtils.DEG2RAD;
const MIN_BLINK_DELAY = 0.5;
const MAX_BLINK_DEALY = 20;
const BLINK_DURATION = 0.2;

const lookAts = new WeakMap<VRM, VRMLookAtHead>();
const blinkDelays = new WeakMap<VRM, number>();

const vector3 = new Vector3();
const rotation = new Quaternion();
const rotation2 = new Quaternion();
const rotation3 = new Quaternion();
const position = new Vector3();
const position2 = new Vector3();
const matrix = new Matrix4();
const euler = new Euler();
const leftArmIdleRotation = getQuaternionFromAngle(0, 0, ARM_IDLE_ANGLE);
const leftFingerIdleRotation = getQuaternionFromAngle(0, 0, FINGER_IDLE_ANGLE);
const leftThumbIdleRotation = getQuaternionFromAngle(0, THUMB_IDLE_ANGLE, 0);
const righArmIdleRotation = getQuaternionFromAngle(0, 0, -ARM_IDLE_ANGLE);
const rightFingerIdleRotation = getQuaternionFromAngle(0, 0, -FINGER_IDLE_ANGLE);
const rightThumbIdleRotation = getQuaternionFromAngle(0, -THUMB_IDLE_ANGLE, 0);

const idlePose = new Map<VRMSchema.HumanoidBoneName, Quaternion>([
  [BoneNames.LeftUpperArm, leftArmIdleRotation],
  [BoneNames.LeftIndexDistal, leftFingerIdleRotation],
  [BoneNames.LeftIndexIntermediate, leftFingerIdleRotation],
  [BoneNames.LeftIndexProximal, leftFingerIdleRotation],
  [BoneNames.LeftLittleDistal, leftFingerIdleRotation],
  [BoneNames.LeftLittleIntermediate, leftFingerIdleRotation],
  [BoneNames.LeftLittleProximal, leftFingerIdleRotation],
  [BoneNames.LeftMiddleDistal, leftFingerIdleRotation],
  [BoneNames.LeftMiddleIntermediate, leftFingerIdleRotation],
  [BoneNames.LeftMiddleProximal, leftFingerIdleRotation],
  [BoneNames.LeftRingDistal, leftFingerIdleRotation],
  [BoneNames.LeftRingIntermediate, leftFingerIdleRotation],
  [BoneNames.LeftRingProximal, leftFingerIdleRotation],
  [BoneNames.LeftThumbDistal, leftThumbIdleRotation],
  [BoneNames.LeftThumbIntermediate, leftThumbIdleRotation],
  [BoneNames.LeftThumbProximal, leftFingerIdleRotation],
  [BoneNames.RightUpperArm, righArmIdleRotation],
  [BoneNames.RightIndexDistal, rightFingerIdleRotation],
  [BoneNames.RightIndexIntermediate, rightFingerIdleRotation],
  [BoneNames.RightIndexProximal, rightFingerIdleRotation],
  [BoneNames.RightLittleDistal, rightFingerIdleRotation],
  [BoneNames.RightLittleIntermediate, rightFingerIdleRotation],
  [BoneNames.RightLittleProximal, rightFingerIdleRotation],
  [BoneNames.RightMiddleDistal, rightFingerIdleRotation],
  [BoneNames.RightMiddleIntermediate, rightFingerIdleRotation],
  [BoneNames.RightMiddleProximal, rightFingerIdleRotation],
  [BoneNames.RightRingDistal, rightFingerIdleRotation],
  [BoneNames.RightRingIntermediate, rightFingerIdleRotation],
  [BoneNames.RightRingProximal, rightFingerIdleRotation],
  [BoneNames.RightThumbDistal, rightThumbIdleRotation],
  [BoneNames.RightThumbIntermediate, rightThumbIdleRotation],
  [BoneNames.RightThumbProximal, rightFingerIdleRotation],
]);

function getQuaternionFromAngle(x: number, y: number, z: number) {
  return new Quaternion().setFromEuler(euler.set(x, y, z));
}

export function registerModel(model: VRM) {
  const { lookAt } = model;
  if (!lookAt || lookAts.has(model)) return;
  lookAt.target = camera;
  lookAts.set(model, lookAt);
}

export function unregisterModel(model: VRM) {
  const lookAt = lookAts.get(model);
  if (!lookAt) return;
  lookAt.target = undefined;
  lookAts.delete(model);
}

export function updateModel(model: VRM, deltaTime: number) {
  if (!lookAts.has(model)) return;
  updateHead(model, deltaTime);
  updateEyeBlink(model, deltaTime);
  updateIdlePose(model, deltaTime);
}

function updateHead(model: VRM, deltaTime: number) {
  const bone = model.firstPerson?.firstPersonBone;
  if (!bone) return;
  bone.matrixWorld.decompose(position, rotation, vector3);
  position2.setFromMatrixPosition(camera.matrixWorld);
  euler.setFromQuaternion(
    rotation2.copy(rotation).slerp(
      rotation3.setFromRotationMatrix(
        matrix.lookAt(position, position2, vector3.set(0, 1, 0)),
      ),
      lerp(0, 1, deltaTime * LERP_SCALE),
    ),
    VRMLookAtHead.EULER_ORDER,
  );
  euler.x = clampByRadian(euler.x, -HEAD_CLAMP_ANGLE, HEAD_CLAMP_ANGLE);
  euler.y = clampByRadian(euler.y, -HEAD_CLAMP_ANGLE, HEAD_CLAMP_ANGLE);
  euler.z = clampByRadian(euler.z, -HEAD_CLAMP_ANGLE / 2, HEAD_CLAMP_ANGLE / 2);
  bone.applyQuaternion(
    rotation2.setFromEuler(euler).multiply(
      rotation3
      .setFromRotationMatrix(bone.matrix)
      .invert()
      .premultiply(rotation)
      .invert(),
    ),
  );
}

function updateEyeBlink(model: VRM, deltaTime: number) {
  if (!model.blendShapeProxy) return;
  let v = blinkDelays.get(model);
  if (v == null || v < -BLINK_DURATION)
    v = lerp(MIN_BLINK_DELAY, MAX_BLINK_DEALY, Math.random());
  else
    v -= deltaTime;
  blinkDelays.set(model, v);
  if (v <= 0) {
    v = -v;
    if (v < BLINK_DURATION / 2)
      v = lerp(0, 1, v / BLINK_DURATION * 2);
    else
      v = lerp(0, 1, 2 - v / BLINK_DURATION * 2);
    model.blendShapeProxy.setValue(VRMSchema.BlendShapePresetName.Blink, v);
  } else {
    model.blendShapeProxy.setValue(VRMSchema.BlendShapePresetName.Blink, 0);
  }
}

function updateIdlePose(model: VRM, deltaTime: number) {
  if (!model.humanoid) return;
  for (const [bone, rotation] of idlePose) {
    const node = model.humanoid.getBoneNode(bone);
    if (node) node.setRotationFromQuaternion(
      rotation2
      .setFromRotationMatrix(node.matrix)
      .slerp(rotation, lerp(0, 1, deltaTime * LERP_SCALE)),
    );
  }
}

vrmUnloadObservable.subscribe(unregisterModel);