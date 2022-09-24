import { WorkerMessageService } from '../../../utils/message-service';
import { isSupported } from '../../../utils/xr-detect';
import { renderer } from '../renderer';
import { isXR } from './common';

let promise: Promise<boolean> | undefined;

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
  if (!renderer || !navigator.xr || !await isSupported) {
    WorkerMessageService.host.trigger('warn', 'Failed to initialize webXR.');
    return false;
  }
  const { xr } = navigator;
  const xrManager = renderer.xr;
  if (enable == null)
    enable = !xrManager.enabled;
  if (enable && !xrManager.enabled) {
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
