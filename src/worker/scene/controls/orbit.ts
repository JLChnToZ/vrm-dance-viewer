import { Box3, MathUtils, MOUSE, Object3D, TOUCH, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Observable } from 'rxjs';
import { camera } from '../camera';
import { WorkerMessageService } from '../../worker-message-service-shim';
import { isXR } from './common';

export let controls: OrbitControls | undefined;
export let targetPosition = new Vector3(0, 1, 0);
const vector3 = new Vector3();
const box = new Box3();
let isOrbitEnabled = true;

export function enableOrbit(enable: boolean) {
  isOrbitEnabled = enable;
  if (controls && !isXR())
    controls.enabled = isOrbitEnabled;
}

export function init(element: Partial<HTMLCanvasElement>, updater: Observable<any>, enabled?: boolean) {
  if (enabled === false) isOrbitEnabled = false;
  controls = Object.assign(new OrbitControls(camera, element as HTMLCanvasElement), {
    enabled: enabled && !isXR(),
    autoRotate: true,
    autoRotateSpeed: 0.5,
    enableDamping: true,
    enableKeys: true,
    screenSpacePanning: true,
    zoomSpeed: 0.5,
    maxDistance: 5,
    minDistance: 0.5,
    keyPanSpeed: 30,
    maxPolarAngle: 150 * MathUtils.DEG2RAD,
    minPolarAngle: 30 * MathUtils.DEG2RAD,
    mouseButtons: {
      LEFT: MOUSE.ROTATE,
      MIDDLE: MOUSE.PAN,
      RIGHT: MOUSE.DOLLY,
    },
    touches: {
      ONE: TOUCH.ROTATE,
      TWO: TOUCH.DOLLY_PAN,
    },
  } as Partial<OrbitControls>);
  controls.listenToKeyEvents(element as HTMLCanvasElement);
  controls.target.copy(targetPosition);
  targetPosition = controls.target;
  updater.subscribe(update);
  isXR.on(enabled => {
    if (!controls) return;
    controls.enabled = enabled && isOrbitEnabled
  });
  return controls;
}

export function toggleRotate() {
  if (controls) controls.autoRotate = !controls.autoRotate;
}

export function panToTarget(t: number, root: Object3D, targetObj?: Object3D | null) {
  if (!controls) return;
  if (t > 1) t = 1;
  const cameraTarget = controls.target;
  box.setFromObject(root);
  if (targetObj)
    vector3.setFromMatrixPosition(targetObj.matrixWorld);
  else
    box.getCenter(vector3);
  const origY = cameraTarget.y;
  cameraTarget
  .lerp(vector3.clamp(box.min, box.max), t)
  .setY(MathUtils.clamp(origY, box.min.y, box.max.y));
}

function update() {
  if (!controls) return;
  controls.update();
  const { target: cameraTarget, object: { position: cameraPos } } = controls;
  if (cameraTarget.y < 0) cameraTarget.setY(0);
  if (cameraPos.y < 0) cameraPos.setY(0);
}

WorkerMessageService.host.on({ toggleRotate });
