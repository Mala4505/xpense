const { withAndroidManifest, withDangerousMod, withMainActivity } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withBackTapPermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest['uses-permission']) manifest['uses-permission'] = [];
    const perms = manifest['uses-permission'];
    const addPerm = (name) => {
      if (!perms.some((p) => p.$['android:name'] === name)) {
        perms.push({ $: { 'android:name': name } });
      }
    };
    addPerm('android.permission.FOREGROUND_SERVICE');
    addPerm('android.permission.FOREGROUND_SERVICE_SPECIAL_USE');

    const app = manifest.application[0];
    if (!app.service) app.service = [];
    if (!app.service.some((s) => s.$['android:name'] === '.BackTapService')) {
      app.service.push({
        $: {
          'android:name': '.BackTapService',
          'android:foregroundServiceType': 'specialUse',
          'android:exported': 'false',
        },
      });
    }

    return config;
  });
}

function withBackTapKotlinFile(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const pkg = (config.android && config.android.package) || 'com.mala455.Xpense';
      const pkgPath = pkg.split('.').join('/');
      const dest = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java',
        pkgPath,
        'BackTapService.kt'
      );
      const src = path.join(__dirname, 'src', 'BackTapService.kt');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      return config;
    },
  ]);
}

function withBackTapMainActivity(config) {
  return withMainActivity(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes('BackTapService')) return config;

    if (!contents.includes('import android.content.Intent')) {
      contents = contents.replace(
        'import android.os.Bundle',
        'import android.content.Intent\nimport android.os.Bundle'
      );
    }

    contents = contents.replace(
      'super.onCreate(null)',
      'startService(Intent(this, BackTapService::class.java))\n    super.onCreate(null)'
    );

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = (config) => {
  config = withBackTapPermissions(config);
  config = withBackTapKotlinFile(config);
  config = withBackTapMainActivity(config);
  return config;
};
