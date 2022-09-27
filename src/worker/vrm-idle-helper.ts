import { VRM, VRMHumanBoneName as BoneNames, VRMExpressionPresetName, VRMLookAt } from '@pixiv/three-vrm';
import { Euler, MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import { vrmUnloadObservable } from './model-manager';
import { camera } from './scene/camera';
import { clampByRadian } from '../utils/three-helpers';

const LERP_SCALE = 30;
const HEAD_ROTATE_DAMP = 1;
const HEAD_CLAMP_ANGLE = MathUtils.degToRad(60);
const LOOK_CAMERA_THRESHOLD = 0;
const ARM_IDLE_ANGLE = MathUtils.degToRad(75);
const FINGER_IDLE_ANGLE = MathUtils.degToRad(15);
const THUMB_IDLE_ANGLE = MathUtils.degToRad(30);
const SHOULDER_BREATH_ANGLE = MathUtils.degToRad(-5);
const MIN_BLINK_DELAY = 0.5;
const MAX_BLINK_DEALY = 10;
const BLINK_DURATION = 0.2;
const BREATH_CYCLE = 2;

const lookAts = new WeakMap<VRM, VRMLookAt>();
const totalTimes = new WeakMap<VRM, number>();
const blinkDelays = new WeakMap<VRM, number>();

const vector3 = new Vector3();
const rotation = new Quaternion();
const rotation2 = new Quaternion();
const rotation3 = new Quaternion();
const position = new Vector3();
const position2 = new Vector3();
const matrix = new Matrix4();
const euler = new Euler(0, 0, 0, VRMLookAt.EULER_ORDER);
const leftArmIdleRotation = getQuaternionFromAngle(0, 0, ARM_IDLE_ANGLE);
const leftFingerIdleRotation = getQuaternionFromAngle(0, 0, FINGER_IDLE_ANGLE);
const leftThumbIdleRotation = getQuaternionFromAngle(0, THUMB_IDLE_ANGLE, 0);
const leftShoulderBreathRotation = getQuaternionFromAngle(0, 0, SHOULDER_BREATH_ANGLE);
const leftArmBreathRotation = getQuaternionFromAngle(0, 0, ARM_IDLE_ANGLE - SHOULDER_BREATH_ANGLE);
const righArmIdleRotation = getQuaternionFromAngle(0, 0, -ARM_IDLE_ANGLE);
const rightFingerIdleRotation = getQuaternionFromAngle(0, 0, -FINGER_IDLE_ANGLE);
const rightThumbIdleRotation = getQuaternionFromAngle(0, -THUMB_IDLE_ANGLE, 0);
const rightShoulderBreathRotation = getQuaternionFromAngle(0, 0, -SHOULDER_BREATH_ANGLE);
const righArmBreathRotation = getQuaternionFromAngle(0, 0, SHOULDER_BREATH_ANGLE - ARM_IDLE_ANGLE);

const idlePose = new Map<BoneNames, Quaternion>([
  [BoneNames.LeftShoulder, new Quaternion()],
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
  [BoneNames.LeftThumbMetacarpal, leftThumbIdleRotation],
  [BoneNames.LeftThumbProximal, leftFingerIdleRotation],
  [BoneNames.RightShoulder, new Quaternion()],
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
  [BoneNames.RightThumbMetacarpal, rightThumbIdleRotation],
  [BoneNames.RightThumbProximal, rightFingerIdleRotation],
]);
const breathPose = new Map<BoneNames, Quaternion>([
  [BoneNames.LeftShoulder, leftShoulderBreathRotation],
  [BoneNames.LeftUpperArm, leftArmBreathRotation],
  [BoneNames.RightShoulder, rightShoulderBreathRotation],
  [BoneNames.RightUpperArm, righArmBreathRotation],
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
  totalTimes.delete(model);
}

export function updateModel(model: VRM, deltaTime: number) {
  if (!lookAts.has(model)) return;
  updateHead(model, deltaTime);
  updateEyeBlink(model, deltaTime);
  updateIdlePose(model, deltaTime);
}

function updateHead(model: VRM, deltaTime: number) {
  const bone = model.firstPerson?.humanoid.getNormalizedBoneNode(BoneNames.Head);
  if (bone) {
    matrix.lookAt(
      bone.getWorldPosition(position),
      camera.getWorldPosition(position2),
      vector3.set(0, 1, 0),
    );
    vector3.set(0, 0, 1).applyMatrix4(matrix);
    if (vector3.z < 0)
      euler.setFromRotationMatrix(matrix).set(
        clampByRadian(-euler.x, -HEAD_CLAMP_ANGLE, HEAD_CLAMP_ANGLE),
        clampByRadian(Math.PI + euler.y, -HEAD_CLAMP_ANGLE, HEAD_CLAMP_ANGLE) + Math.PI,
        clampByRadian(euler.z, -HEAD_CLAMP_ANGLE, HEAD_CLAMP_ANGLE),
      );
    else
      euler.set(0, Math.PI, 0);
    bone.quaternion.slerp(
      rotation.setFromEuler(euler).multiply(
        rotation3.setFromRotationMatrix(bone.parent?.matrixWorld || matrix.identity()),
      ),
      Math.min(MathUtils.damp(0, 1, HEAD_ROTATE_DAMP, deltaTime * LERP_SCALE), 1),
    );
  }
}

function updateEyeBlink(model: VRM, deltaTime: number) {
  if (!model.expressionManager) return;
  let v = blinkDelays.get(model);
  if (v == null || v < -BLINK_DURATION)
    v = MathUtils.randFloat(MIN_BLINK_DELAY, MAX_BLINK_DEALY);
  else
    v -= deltaTime;
  blinkDelays.set(model, v);
  model.expressionManager.setValue(
    VRMExpressionPresetName.Blink,
    v > LOOK_CAMERA_THRESHOLD ? 0 : MathUtils.pingpong(-v, BLINK_DURATION / 2) * 2 / BLINK_DURATION,
  );
}

function updateIdlePose(model: VRM, deltaTime: number) {
  if (!model.humanoid) return;
  const totalTime = (totalTimes.get(model) || 0) + deltaTime;
  totalTimes.set(model, totalTime);
  for (const [bone, rotation] of idlePose) {
    const node = model.humanoid.getNormalizedBoneNode(bone);
    let finalRotation = rotation;
    const breathRotation = breathPose.get(bone);
    if (breathRotation)
      finalRotation = rotation2
      .copy(rotation)
      .slerp(breathRotation, MathUtils.pingpong(totalTime, BREATH_CYCLE));
    if (node) node.setRotationFromQuaternion(
      rotation3
      .setFromRotationMatrix(node.matrix)
      .slerp(finalRotation, Math.min(deltaTime * LERP_SCALE, 1)),
    );
  }
}

vrmUnloadObservable.subscribe(unregisterModel);