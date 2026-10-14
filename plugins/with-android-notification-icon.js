const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/** Drawable name used by Notifee `smallIcon` for ongoing visit status. */
const DRAWABLE_NAME = 'ic_stat_notification';

/**
 * Copies a white-on-transparent PNG into Android drawable so Notifee can show shade notifications.
 */
function withAndroidNotificationIcon(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iconSource = path.join(projectRoot, 'assets/images/expo-badge-white.png');
      if (!fs.existsSync(iconSource)) {
        throw new Error(
          `Notification icon source missing: ${iconSource}. Add expo-badge-white.png or update the plugin path.`,
        );
      }

      const resRoot = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res');
      for (const folder of ['drawable', 'drawable-mdpi', 'drawable-hdpi', 'drawable-xhdpi']) {
        const dir = path.join(resRoot, folder);
        fs.mkdirSync(dir, { recursive: true });
        fs.copyFileSync(iconSource, path.join(dir, `${DRAWABLE_NAME}.png`));
      }

      return config;
    },
  ]);
}

module.exports = withAndroidNotificationIcon;
