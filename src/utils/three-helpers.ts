import { Object3D } from 'three/src/core/Object3D';
import { Vector3 } from 'three/src/math/Vector3';

export function* transverse(self?: Object3D | null): IterableIterator<Object3D> {
  if (!self) return;
  const stack: Object3D[] = [self];
  const stackIndex = [0];
  yield self;
  while (stack.length) {
    const current = stack.pop()!;
    const currentIndex = stackIndex.pop()!;
    if (current.children.length <= currentIndex)
      continue;
    stack.push(current, current.children[currentIndex]);
    stackIndex.push(currentIndex + 1, 0);
    yield current.children[currentIndex];
  }
}

export function centerOfDescendant(self: Object3D) {
  const sum = new Vector3();
  const temp = new Vector3();
  let i = 0;
  for (const current of transverse(self)) {
    temp.copy(current.position);
    let { parent } = current.parent!;
    while (parent) {
      temp.applyQuaternion(parent.quaternion).add(parent.position);
      if (parent === self) break;
      parent = parent.parent;
    }
    sum.add(temp);
    i++;
  }
  return sum.divideScalar(i);
}