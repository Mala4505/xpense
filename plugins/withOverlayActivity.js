const { withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withOverlayActivityManifest(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];
    if (!app.activity) app.activity = [];

    if (!app.activity.some((a) => a.$['android:name'] === '.OverlayActivity')) {
      app.activity.push({
        $: {
          'android:name': '.OverlayActivity',
          'android:theme': '@style/Theme.Xpense.Overlay',
          'android:taskAffinity': '',
          'android:exported': 'true',
        },
      });
    }

    return config;
  });
}

function withOverlayActivityFiles(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const pkg = (config.android && config.android.package) || 'com.mala455.Xpense';
      const pkgPath = pkg.split('.').join('/');
      const javaRoot = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java',
        pkgPath
      );
      fs.mkdirSync(javaRoot, { recursive: true });

      const ktFiles = ['OverlayActivity.kt', 'ActivityFinishModule.kt', 'ActivityFinishPackage.kt'];
      for (const file of ktFiles) {
        fs.copyFileSync(
          path.join(__dirname, 'src', file),
          path.join(javaRoot, file)
        );
      }

      const valuesDest = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/values/overlay_styles.xml'
      );
      fs.mkdirSync(path.dirname(valuesDest), { recursive: true });
      fs.writeFileSync(
        valuesDest,
        `<resources>
  <style name="Theme.Xpense.Overlay" parent="Theme.AppCompat.DayNight.NoActionBar">
    <item name="android:windowIsTranslucent">true</item>
    <item name="android:windowBackground">@android:color/transparent</item>
    <item name="android:windowAnimationStyle">@android:style/Animation</item>
    <item name="android:statusBarColor">@android:color/transparent</item>
    <item name="android:navigationBarColor">@android:color/transparent</item>
  </style>
</resources>`
      );

      return config;
    },
  ]);
}

function withActivityFinishPackageRegistration(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes('ActivityFinishPackage')) return config;

    contents = contents.replace(
      /PackageList\(this\)\.packages\.apply \{/,
      'PackageList(this).packages.apply {\n      add(ActivityFinishPackage())'
    );

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = (config) => {
  config = withOverlayActivityManifest(config);
  config = withOverlayActivityFiles(config);
  config = withActivityFinishPackageRegistration(config);
  return config;
};
