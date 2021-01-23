import { PerspectiveCamera } from 'three';

export const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
camera.position.set(0, 1.5, -1.5);