export const isSupported = (async ({ xr }) => {
  if (!xr) return false;
  return xr.isSessionSupported('immersive-vr');
})(navigator);
