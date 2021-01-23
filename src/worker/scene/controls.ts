import { MOUSE, TOUCH } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { camera } from './camera';
import { WorkerMessageService } from '../../utils/message-service';

export let controls: OrbitControls | undefined;

export function init(element: Partial<HTMLCanvasElement>, isEnabled?: boolean) {
  controls = Object.assign(new OrbitControls(camera, element as HTMLCanvasElement), {
    enabled: isEnabled,
    autoRotate: true,
    autoRotateSpeed: 0.5,
    enableDamping: true,
    enablePan: false,
    maxDistance: 5,
    minDistance: 1.5,
    maxPolarAngle: Math.PI / 1.5,
    mouseButtons: {
      LEFT: MOUSE.ROTATE,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.ROTATE,
    },
    touches: {
      ONE: TOUCH.ROTATE,
      TWO: TOUCH.DOLLY_ROTATE,
    },
  } as Partial<OrbitControls>);
  controls.target.set(0, 1, 0);
  controls.update();
}

export function toggleRotate() {
  if (controls) controls.autoRotate = !controls.autoRotate;
}

WorkerMessageService.host.on({ toggleRotate });
