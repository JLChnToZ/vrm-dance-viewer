import { PerspectiveCamera } from 'three';
import { scene } from './scene';

export const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
camera.position.set(0, 1.5, -1.5);
scene.add(camera);
