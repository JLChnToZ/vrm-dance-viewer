import { Euler, MathUtils, Object3D, Vector3 } from 'three';

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

const PI2 = Math.PI * 2;

export function clampVector3ByRadian(
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

export function clampByRadian(
  v: number,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY
) {
  const hasMin = Number.isFinite(min);
  const hasMax = Number.isFinite(max);
  if (hasMin && hasMax && min === max) return min;
  if (hasMin) min = MathUtils.euclideanModulo(min, PI2);
  if (hasMax) max = MathUtils.euclideanModulo(max, PI2);
  v = MathUtils.euclideanModulo(v, PI2);
  if (hasMin && hasMax && min >= max) {
    max += PI2;
    if (v < Math.PI) v += PI2;
  }
  if (hasMax && v > max) v = max;
  else if (hasMin && v < min) v = min;
  return MathUtils.euclideanModulo(v, PI2);
}
