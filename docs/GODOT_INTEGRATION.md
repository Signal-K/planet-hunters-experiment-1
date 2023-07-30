# Godot Integration Guide

## Overview

This document explains how to export Godot 4.5 builds and integrate them into this React Native project. This project combines **React Native 0.81.5** with **Godot 4.5.1** using the `@borndotcom/react-native-godot` library.

## Prerequisites

Before you start, ensure you have:

- **Godot 4.5** or higher (migeran branch with iOS export templates)
- **Xcode** (for iOS builds)
- **Node.js** 16+ (tested with 25.2.1)
- **CocoaPods** (for iOS dependency management)
- **Android Studio** (for Android builds, optional)
- **react-native-cli** or **expo-cli**

### Install Godot

1. Download Godot 4.5 from the official [Godot releases](https://godotengine.org/download/archive/)
2. For iOS builds, you'll need the [migeran fork](https://github.com/migeran/godot) which provides iOS export templates
3. Extract and install Godot in your Applications folder

## Project Structure

```
.
├── project/              # Godot project files
│   ├── project.godot     # Godot project configuration
│   ├── main.tscn         # Main scene
│   ├── main.tscn.bak
│   ├── subwindow.tscn
│   ├── cube.gd
│   ├── torus.gd
│   ├── app_controller.gd
│   └── export_presets.cfg
├── ios/                  # iOS native code
│   ├── Podfile           # CocoaPods configuration
│   └── GodotTest/        # Xcode project
├── android/              # Android native code
├── node_modules/
│   └── @borndotcom/react-native-godot/  # Godot React Native bridge
└── docs/
    └── GODOT_INTEGRATION.md (this file)
```

## Exporting Godot Builds

### Important: Platform Differences

**iOS**: Exports as a **PCK file** (single compressed archive)
**Android**: Exports as a **folder of files** (placed in Android assets)

This is a critical difference - they use different export formats and initialization methods.

### Step 1: Create Export Script

Create an `export_godot.sh` script in your project root. This is the recommended way to export:

```bash
#!/bin/bash

# Export script for Godot projects
# Usage: ./export_godot.sh --target ./ios --project ./project --name GodotTest --preset iOS --platform ios

TARGET=""
PROJECT=""
NAME=""
PRESET=""
PLATFORM=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --target) TARGET="$2"; shift 2 ;;
    --project) PROJECT="$2"; shift 2 ;;
    --name) NAME="$2"; shift 2 ;;
    --preset) PRESET="$2"; shift 2 ;;
    --platform) PLATFORM="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Validate inputs
if [[ -z "$TARGET" ]] || [[ -z "$PROJECT" ]] || [[ -z "$NAME" ]] || [[ -z "$PRESET" ]] || [[ -z "$PLATFORM" ]]; then
  echo "Usage: $0 --target <dir> --project <dir> --name <name> --preset <preset> --platform <ios|android>"
  exit 1
fi

# Find Godot editor
if [[ -z "$GODOT_EDITOR" ]]; then
  GODOT_EDITOR="/Applications/Godot.app/Contents/MacOS/Godot"
fi

if [[ ! -f "$GODOT_EDITOR" ]]; then
  echo "Error: Godot editor not found at $GODOT_EDITOR"
  exit 1
fi

echo "Exporting to $PLATFORM..."
echo "  Target: $TARGET"
echo "  Project: $PROJECT"
echo "  Name: $NAME"
echo "  Preset: $PRESET"
echo "  Godot: $GODOT_EDITOR"

# Export based on platform
if [[ "$PLATFORM" == "ios" ]]; then
  # iOS exports as PCK file
  mkdir -p "$TARGET"
  "$GODOT_EDITOR" --headless --path "$PROJECT" --export-pack "$PRESET" "$TARGET/$NAME.pck"
  echo "✓ iOS export complete: $TARGET/$NAME.pck"
elif [[ "$PLATFORM" == "android" ]]; then
  # Android exports as folder (placed in Android assets)
  mkdir -p "$TARGET"
  "$GODOT_EDITOR" --headless --path "$PROJECT" --export-pack "$PRESET" "$TARGET/$NAME"
  echo "✓ Android export complete: $TARGET/$NAME/"
else
  echo "Unknown platform: $PLATFORM"
  exit 1
fi
```

Save this as `export_godot.sh` in your project root and make it executable:

```bash
chmod +x export_godot.sh
```

### Step 2: Configure Export Presets in Godot

1. Open your Godot project in Godot 4.5:
   ```bash
   godot --path ./project
   ```

2. Go to **Project → Export**

3. **Create iOS Preset:**
   - Click **Add Preset** → **iOS**
   - Name it: `iOS`
   - Configure:
     - **App Name**: GodotTest
     - **Bundle Identifier**: org.reactjs.native.example.GodotTest
     - **Version**: 1.0
     - **Export Architecture**: arm64

4. **Create Android Preset:**
   - Click **Add Preset** → **Android**
   - Name it: `Android`
   - Configure Android-specific settings as needed

5. For both presets, **make sure**:
   - Features are properly configured
   - All dependencies are resolved
   - No errors in the export validation

### Step 3: Export iOS

Export as a PCK file (compressed archive):

```bash
./export_godot.sh \
  --target ./ios \
  --project ./project \
  --name GodotTest \
  --preset iOS \
  --platform ios
```

This creates: `ios/GodotTest.pck`

The PCK file is then referenced in your React Native code:

```typescript
import * as FileSystem from 'expo-file-system/legacy';

function initGodot() {
  runOnGodotThread(() => {
    'worklet';
    RTNGodot.createInstance([
      "--main-pack",
      FileSystem.bundleDirectory + "GodotTest.pck",
      "--rendering-driver", "opengl3",
      "--rendering-method", "gl_compatibility",
      "--display-driver", "embedded"
    ]);  
  });
}
```

### Step 4: Export Android

Export as a folder of files (placed in Android assets):

```bash
./export_godot.sh \
  --target ./android/app/src/main/assets \
  --project ./project \
  --name main \
  --preset Android \
  --platform android
```

This creates: `android/app/src/main/assets/main/` (folder with all Godot files)

The folder is then referenced in your React Native code:

```typescript
function initGodot() {
  runOnGodotThread(() => {
    'worklet';
    RTNGodot.createInstance([
      "--path", "/main",  // Points to the assets folder
      "--rendering-driver", "opengl3",
      "--rendering-method", "gl_compatibility",
      "--display-driver", "embedded"
    ]);  
  });
}
```

### Step 5: Custom Godot Installation

If your Godot is not installed in the standard location, set the environment variable:

```bash
export GODOT_EDITOR=/path/to/your/godot/executable
./export_godot.sh --target ./ios --project ./project --name GodotTest --preset iOS --platform ios
```

### Step 4: Download Prebuilt Libraries

The React Native Godot library requires prebuilt Godot libraries. Download them automatically:

```bash
npm install
node scripts/download-prebuilt.js
```

This downloads:
- **libgodot.xcframework** - Core Godot engine (iOS)
- **libgodot-cpp.xcframework** - C++ binding library (iOS)
- **libgodot-android** - Android engine library
- **godot-cpp-android** - Android C++ bindings

### Step 5: Configure Build Environment

#### iOS Setup

1. Update Node.js paths in Xcode build scripts:

   **ios/.xcode.env:**
   ```bash
   export NODE_BINARY=/opt/homebrew/bin/node
   ```

   **ios/.xcode.env.local:**
   ```bash
   export NODE_BINARY=/opt/homebrew/bin/node
   export PATH=/opt/homebrew/bin:$PATH
   ```

2. Install CocoaPods dependencies:

   ```bash
   cd ios
   pod install
   cd ..
   ```

3. Clean previous builds:

   ```bash
   cd ios
   rm -rf build Pods Podfile.lock
   pod install
   cd ..
   ```

#### Android Setup

Update your `android/build.gradle` with required NDK version and toolchain settings for Godot 4.5.

## Header Include Paths

The React Native Godot bridge requires proper header paths. These files are automatically configured:

### iOS Header Paths

- **libgodot.h** headers are in:
  ```
  ios/libs/libgodot/4.5.1.migeran.2/libgodot.xcframework/ios-arm64/Headers/
  ```

- **godot_cpp** headers are in:
  ```
  ios/libs/libgodot-cpp/4.5.1.migeran.2/libgodot-cpp.xcframework/ios-arm64/Headers/
  ```

These paths are configured in the `borndotcom-react-native-godot.podspec` file and automatically exposed through CocoaPods.

### Key Include Files

- `libgodot.h` - Main Godot engine interface
- `godot_cpp/godot.hpp` - C++ binding main header
- `godot_cpp/classes/godot_instance.hpp` - Instance management

## Building the App

### iOS Build

```bash
# Build and run on iPhone simulator
npm run ios

# Or with yarn
yarn ios

# Build for device
react-native run-ios --device
```

The build process:
1. Validates Node.js path via `.xcode.env`
2. Installs React Native dependencies
3. Generates React Native codegen files
4. Compiles Godot bridge code with proper header paths
5. Links Godot frameworks
6. Packages app bundle

### Android Build

```bash
# Build and run on Android emulator
npm run android

# Or with gradle
cd android && ./gradlew assembleDebug
```

## Critical Platform Differences

### iOS: PCK File Format

- **Export Format**: Single `.pck` file (compressed archive)
- **Storage**: Bundled with app package
- **Initialization**: 
  ```typescript
  RTNGodot.createInstance([
    "--main-pack", FileSystem.bundleDirectory + "GodotTest.pck",
    "--display-driver", "embedded"
  ]);
  ```
- **Performance**: No performance penalty for PCK files on iOS

### Android: Folder Format

- **Export Format**: Folder of files (unpacked)
- **Storage**: In `android/app/src/main/assets/`
- **Initialization**:
  ```typescript
  RTNGodot.createInstance([
    "--path", "/main",
    "--display-driver", "embedded"
  ]);
  ```
- **Performance**: Pack files in assets are slower; use folder format instead
- **Path Mapping**: `/main` maps to `assets/main/` in the APK

### Why the Difference?

- **iOS**: PCK files are fine because of how iOS handles app resources
- **Android**: Folder format provides faster access to individual files in the asset folder
- **Size**: Android folders can be quite large; PCK files are more compressed but slower on Android

## Troubleshooting

### Error: 'libgodot.h' file not found

**Cause:** Header search paths not properly configured

**Solution:**
1. Verify prebuilt libraries are downloaded:
   ```bash
   node scripts/download-prebuilt.js
   ```
2. Clean and reinstall pods:
   ```bash
   cd ios
   rm -rf Pods Podfile.lock build
   pod install
   cd ..
   ```
3. Check `.xcode.env` has correct Node.js path

### Error: 'godot_cpp/classes/godot_instance.hpp' file not found

**Cause:** C++ headers not being found by compiler

**Solution:**
1. Ensure `libgodot-cpp.xcframework` is downloaded
2. Verify Xcode project has proper framework linking in Build Phases
3. Check that the podspec correctly references the xcframework

### Xcode Build Error 65

**Cause:** General build failure, often related to missing dependencies or environment variables

**Solution:**
1. Check Node.js is properly configured:
   ```bash
   which node
   echo $NODE_BINARY
   ```
2. Clear Xcode derived data:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData/GodotTest*
   ```
3. Reinstall pods and rebuild

### PCK File Not Found

**Cause:** Godot export didn't create the PCK file or it's in wrong location

**Solution:**
1. Verify PCK file exists:
   ```bash
   ls -la ios/GodotTest.pck
   ```
2. Re-export from Godot:
   ```bash
   cd project
   godot --path . --export-pack "iOS" ../ios/GodotTest.pck
   ```

## Development Workflow

### Updating Godot Project

1. **Make changes in Godot Editor:**
   ```bash
   godot --path ./project
   ```

2. **Export for your platform:**
   
   For iOS (creates PCK):
   ```bash
   ./export_godot.sh --target ./ios --project ./project --name GodotTest --preset iOS --platform ios
   ```
   
   For Android (creates folder):
   ```bash
   ./export_godot.sh --target ./android/app/src/main/assets --project ./project --name main --preset Android --platform android
   ```

3. **Rebuild React Native app:**
   ```bash
   npm run ios    # for iOS
   npm run android # for Android
   ```

### Quick Rebuild

For React Native changes only (no Godot changes):

```bash
npm run ios -- --clean  # Force clean rebuild
```

### Debugging

#### Enable Godot Logging

In your `project/main.tscn`, add logging output:

```gdscript
extends Node

func _ready():
    print("Godot initialized!")
    print("Viewport size: ", get_viewport().get_visible_rect().size)
```

#### iOS Console Output

View console output in Xcode:
1. Open `ios/GodotTest.xcworkspace` in Xcode
2. Run the app (⌘R)
3. View console in Xcode window (⌘⇧C)

#### Android Console Output

View via logcat:
```bash
adb logcat | grep "godot\|GodotTest"
```

## Version Information

- **React Native:** 0.81.5 (New Architecture enabled)
- **Godot:** 4.5.1.migeran.2
- **React Native Godot Bridge:** @borndotcom/react-native-godot 1.0.1
- **CocoaPods:** Latest stable
- **iOS Minimum Deployment Target:** 14.0
- **C++ Standard:** c++20

## Resources

- [Godot Official Documentation](https://docs.godotengine.org/en/stable/)
- [React Native Documentation](https://reactnative.dev/)
- [@borndotcom/react-native-godot](https://github.com/borndotcom/react-native-godot)
- [Migeran Godot iOS Fork](https://github.com/migeran/godot)
- [CocoaPods Documentation](https://guides.cocoapods.org/)

## Next Steps

1. **Add native iOS modules** - Create custom Godot plugins
2. **Optimize build size** - Strip unnecessary Godot features
3. **Set up CI/CD** - Automate builds with GitHub Actions or similar
4. **Dockerize** - See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for containerized builds
