#!/usr/bin/env bash
set -euo pipefail

REPO="Signal-K/landnam"
API_URL="https://api.github.com/repos/${REPO}/releases/latest"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_cmd curl
require_cmd jq

os="$(uname -s)"
asset_url=""
asset_name=""

release_json="$(curl -fsSL "$API_URL")"

if [ "$os" = "Darwin" ]; then
  asset_url="$(echo "$release_json" | jq -r '.assets[] | select(.name|test("-mac\\.zip$")) | .browser_download_url' | head -n1)"
  asset_name="$(basename "$asset_url")"
  if [ -z "$asset_url" ] || [ "$asset_url" = "null" ]; then
    echo "No macOS zip asset found in latest release."
    exit 1
  fi

  tmp_dir="$(mktemp -d)"
  zip_path="$tmp_dir/$asset_name"
  app_dir="$tmp_dir/app"

  echo "Downloading $asset_name"
  curl -fL "$asset_url" -o "$zip_path"

  mkdir -p "$app_dir"
  ditto -x -k "$zip_path" "$app_dir"

  app_path="$(find "$app_dir" -maxdepth 2 -name '*.app' -type d | head -n1)"
  if [ -z "$app_path" ]; then
    echo "Could not find .app bundle in archive."
    exit 1
  fi

  echo "Installing to /Applications"
  rm -rf "/Applications/$(basename "$app_path")"
  cp -R "$app_path" /Applications/
  xattr -dr com.apple.quarantine "/Applications/$(basename "$app_path")" || true

  echo "Installed: /Applications/$(basename "$app_path")"
elif [ "$os" = "Linux" ]; then
  asset_url="$(echo "$release_json" | jq -r '.assets[] | select(.name|test("\\.AppImage$")) | .browser_download_url' | head -n1)"
  asset_name="$(basename "$asset_url")"
  if [ -z "$asset_url" ] || [ "$asset_url" = "null" ]; then
    echo "No AppImage asset found in latest release."
    exit 1
  fi

  install_dir="${HOME}/.local/bin"
  install_path="${install_dir}/landnam-desktop"

  mkdir -p "$install_dir"
  echo "Downloading $asset_name"
  curl -fL "$asset_url" -o "$install_path"
  chmod +x "$install_path"

  echo "Installed: $install_path"
  echo "Run it with: $install_path"
else
  echo "Unsupported OS for this script: $os"
  echo "Use scripts/install-desktop-release.ps1 on Windows."
  exit 1
fi
