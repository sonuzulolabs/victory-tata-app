const { withAndroidManifest } = require('@expo/config-plugins');

function ensurePermission(manifest, name) {
  if (!manifest['uses-permission']) {
    manifest['uses-permission'] = [];
  }
  const list = manifest['uses-permission'];
  if (!list.some((entry) => entry.$?.['android:name'] === name)) {
    list.push({ $: { 'android:name': name } });
  }
}

/** Permissions for Notifee foreground-service ETA notification (non-dismissible shade). */
function withVisitTrackingForegroundService(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    ensurePermission(manifest, 'android.permission.FOREGROUND_SERVICE');
    ensurePermission(manifest, 'android.permission.FOREGROUND_SERVICE_SPECIAL_USE');
    return config;
  });
}

module.exports = withVisitTrackingForegroundService;
