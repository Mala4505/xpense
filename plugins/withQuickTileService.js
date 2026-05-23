const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withQuickTileManifest(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];
    if (!app.service) app.service = [];

    if (!app.service.some((s) => s.$['android:name'] === '.QuickSettingsTileService')) {
      app.service.push({
        $: {
          'android:name': '.QuickSettingsTileService',
          'android:label': 'Quick Add',
          'android:icon': '@drawable/ic_qs_tile',
          'android:permission': 'android.permission.BIND_QUICK_SETTINGS_TILE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.service.quicksettings.action.QS_TILE' } }],
          },
        ],
      });
    }

    return config;
  });
}

function withQuickTileKotlinFile(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const pkg = (config.android && config.android.package) || 'com.mala455.Xpense';
      const pkgPath = pkg.split('.').join('/');

      const ktDest = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java',
        pkgPath,
        'QuickSettingsTileService.kt'
      );
      const ktSrc = path.join(__dirname, 'src', 'QuickSettingsTileService.kt');
      fs.mkdirSync(path.dirname(ktDest), { recursive: true });
      fs.copyFileSync(ktSrc, ktDest);

      const drawableDest = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/drawable/ic_qs_tile.xml'
      );
      const drawableSrc = path.join(__dirname, 'src', 'ic_qs_tile.xml');
      fs.mkdirSync(path.dirname(drawableDest), { recursive: true });
      fs.copyFileSync(drawableSrc, drawableDest);

      return config;
    },
  ]);
}

module.exports = (config) => {
  config = withQuickTileManifest(config);
  config = withQuickTileKotlinFile(config);
  return config;
};
