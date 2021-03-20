import { Vector2 } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { WorkerMessageService } from '../../utils/message-service';

import { renderer } from './renderer';
import { camera } from './camera';
import { scene } from './scene';
import { currentIntensity } from './lights';

const renderPass = new RenderPass(scene, camera);
let composer: EffectComposer | undefined;
let bloomOn = true;

const bloomPass = new UnrealBloomPass(new Vector2(2048, 2048), 0, 1, 0.3);

export function init() {
  if (composer || !renderer) return;
  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
}

export function updateSize(width: number, height: number) {
  renderer?.setSize(width, height, false);
  composer?.setSize(width, height);
  bloomPass.setSize(width, height);
}

export function render(deltaTime?: number) {
  bloomPass.strength = bloomOn ? Math.max(0, 1 - (currentIntensity ** 0.3)) : 0;
  renderer?.info.reset();
  composer?.render(deltaTime);
}

export function setBloomEnabled(value: boolean) {
  bloomOn = value;
}

export function toggleBloom() {
  bloomOn = !bloomOn;
}


WorkerMessageService.host.on({ setBloomEnabled, toggleBloom });