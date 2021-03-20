import { Color, DirectionalLight, Fog, HemisphereLight } from 'three';
import { Observable } from 'rxjs';
import { BACKGROUND_COLOR, BACKGROUND_COLOR_DIM, scene } from './scene';
import { WorkerMessageService } from '../../utils/message-service';

const bgColor = new Color(BACKGROUND_COLOR_DIM);
scene.background = new Color(bgColor);
scene.fog = new Fog(bgColor, 3, 10);

let targetIntensity = 1;
export let currentIntensity = 0;
const ambiantLight = new HemisphereLight(0xffffff, 0x444444);
ambiantLight.position.set(0, 20, 0);
scene.add(ambiantLight);

const light = new DirectionalLight(0xffffff);
light.position.set(1, 1, -1).normalize();
scene.add(light);

export function init(updater: Observable<number>) {
  updater.subscribe(update);
}

export function update(deltaTime: number) {
  currentIntensity += (targetIntensity - currentIntensity) * Math.min(1, deltaTime * 4);
  ambiantLight.intensity = currentIntensity;
  light.intensity = 0.25 + 0.75 * currentIntensity;
  bgColor.set(BACKGROUND_COLOR_DIM).lerp(BACKGROUND_COLOR, currentIntensity);
  scene.fog?.color.set(bgColor);
  if (scene.background instanceof Color)
    scene.background.set(bgColor);
  else
    scene.background = bgColor.clone();
}

export function toggleLights() {
  targetIntensity = targetIntensity > 0 ? 0 : 1;
}

export function setLights(intensity: number) {
  targetIntensity = intensity;
}

WorkerMessageService.host.on({ setLights, toggleLights });