const fs = require('fs');
const path = require('path');

function patchCMakeFile(filePath, displayName) {
  if (!fs.existsSync(filePath)) {
    console.log(`[postinstall] ${displayName} not found, skipping.`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('c++_shared')) {
    console.log(`[postinstall] ${displayName} already patched.`);
    return;
  }

  // Add c++_shared before the closing ) of every target_link_libraries block
  const patched = content.replace(
    /(target_link_libraries\s*\([^)]+?)\)/gs,
    '$1  c++_shared\n)'
  );

  if (patched === content) {
    console.log(`[postinstall] ${displayName}: no target_link_libraries found, skipping.`);
    return;
  }

  fs.writeFileSync(filePath, patched, 'utf8');
  console.log(`[postinstall] Patched ${displayName} with c++_shared.`);
}

const nm = path.join(__dirname, '..', 'node_modules');

// Library-level CMakeLists (each package's own native lib)
patchCMakeFile(path.join(nm, 'react-native-screens', 'android', 'CMakeLists.txt'), 'react-native-screens');
patchCMakeFile(path.join(nm, 'react-native-reanimated', 'android', 'CMakeLists.txt'), 'react-native-reanimated');
patchCMakeFile(path.join(nm, 'react-native-gesture-handler', 'android', 'src', 'main', 'jni', 'CMakeLists.txt'), 'react-native-gesture-handler');
patchCMakeFile(path.join(nm, 'expo-sqlite', 'android', 'CMakeLists.txt'), 'expo-sqlite');

// JNI codegen CMakeLists (define react_codegen_* targets built inside app's CMake)
patchCMakeFile(path.join(nm, 'react-native-screens', 'android', 'src', 'main', 'jni', 'CMakeLists.txt'), 'react-native-screens (jni codegen)');
patchCMakeFile(path.join(nm, 'react-native-safe-area-context', 'android', 'src', 'main', 'jni', 'CMakeLists.txt'), 'react-native-safe-area-context (jni codegen)');
patchCMakeFile(path.join(nm, 'react-native-svg', 'android', 'src', 'main', 'jni', 'CMakeLists.txt'), 'react-native-svg (jni codegen)');
