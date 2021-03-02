import { Navigator as XRNavigator, XRSession } from 'three';
import { renderer } from '../renderer';
import { isXR } from './common';

declare var navigator: Navigator & XRNavigator;

let promise: Promise<boolean> | undefined;

export const supported = (async ({ xr }) => {
  if (!xr) return false;
  return xr.isSessionSupported('immersive-vr');
})(navigator);

function xrSessionEnd() {
  if (!renderer) return;
  const xrManager = renderer.xr;
  xrManager.enabled = false;
  isXR(false);
}

export function enableXR(enable?: boolean) {
  if (!promise) promise = execEnableXR(enable);
  return promise;
}

async function execEnableXR(enable?: boolean) {
  console.log(navigator);
  if (!renderer || !navigator.xr || !await supported) {
    console.log('Boo, not supported :(');
    return false;
  }
  const { xr } = navigator;
  const xrManager = renderer.xr;
  if (enable == null)
    enable = !xrManager.enabled;
  if (enable && !xrManager.enabled) {
    console.log('Trying to enable VR');
    let session: XRSession | undefined;
    try {
      session = await xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      });
      session.addEventListener('end', xrSessionEnd);
      xrManager.enabled = true;
      xrManager.setReferenceSpaceType('local');
      isXR(true);
      await xrManager.setSession(session);
      console.log('Success');
    } catch(e) {
      session?.end();
      session = undefined;
      console.error(e);
      xrManager.enabled = false;
      isXR(false);
    }
  } else if (xrManager.enabled) {
    try {
      await xrManager.getSession()?.end();
    } catch(e) {
      console.error(e);
    }
    xrManager.enabled = false;
    isXR(false);
  }
  promise = undefined;
  return xrManager.enabled;
}
