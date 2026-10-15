#!/usr/bin/env bash
# Build the macOS app and install it to /Applications, signed with the stable Apple Development identity.
# Ad-hoc signing gives every build a new identity, so the keychain asks for the login password on each launch.
# Does not launch the app. Override the identity with SIGN_ID (a hash from `security find-identity -v -p codesigning`).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SIGN_ID="${SIGN_ID:-890BA73575B6C8C510EB677C8412B4068B1C9453}"
DERIVED=/tmp/landnam-derived
xcodebuild -project "$ROOT/native/Landnam.xcodeproj" -scheme Landnam -destination 'platform=macOS' \
  -configuration Release -derivedDataPath "$DERIVED" build CODE_SIGNING_ALLOWED=NO 2>&1 | grep -E "error:|BUILD (SUCCEEDED|FAILED)"
APP="$DERIVED/Build/Products/Release/Landnam.app"
codesign --force --deep --sign "$SIGN_ID" --preserve-metadata=entitlements,identifier "$APP"
ditto "$APP" /Applications/Landnam.app
codesign --verify --deep /Applications/Landnam.app
codesign -dv /Applications/Landnam.app 2>&1 | grep -E "Identifier|TeamIdentifier"
echo "Installed /Applications/Landnam.app"
