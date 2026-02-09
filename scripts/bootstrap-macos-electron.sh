#!/usr/bin/env bash
set -euo pipefail

if [ "$(uname -s)" != "Darwin" ]; then
  echo "This bootstrap script currently supports macOS only."
  exit 1
fi

REPO_OWNER="${REPO_OWNER:-Signal-K}"
REPO_NAME="${REPO_NAME:-planet-hunters-experiment-1}"
REPO_BRANCH="${REPO_BRANCH:-main}"
REPO_URL="${REPO_URL:-https://github.com/${REPO_OWNER}/${REPO_NAME}.git}"
REPO_ARCHIVE_URL="${REPO_ARCHIVE_URL:-https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/heads/${REPO_BRANCH}.zip}"
TARGET_DIR="${TARGET_DIR:-$HOME/${REPO_NAME}}"

GODOT_VERSION="${GODOT_VERSION:-4.5-stable}"
GODOT_APP_ZIP_URL="${GODOT_APP_ZIP_URL:-https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}/Godot_v4.5-stable_macos.universal.zip}"
GODOT_TEMPLATES_URL="${GODOT_TEMPLATES_URL:-https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}/Godot_v4.5-stable_export_templates.tpz}"
GODOT_INSTALL_ROOT="${GODOT_INSTALL_ROOT:-$HOME/.planet-hunters-tools}"

log() {
  printf '[bootstrap] %s\n' "$*"
}

ensure_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    return 1
  fi
  return 0
}

ensure_node() {
  if ensure_cmd node && ensure_cmd npm; then
    return 0
  fi

  log "Node.js not found. Installing nvm + latest LTS Node."
  export NVM_DIR="${HOME}/.nvm"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  fi

  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm install --lts
  nvm alias default 'lts/*'
  nvm use --lts

  ensure_cmd node || { log "node installation failed."; exit 1; }
  ensure_cmd npm || { log "npm installation failed."; exit 1; }
}

clone_or_update_repo() {
  if ensure_cmd git && [ -d "$TARGET_DIR/.git" ]; then
    log "Updating existing repo at $TARGET_DIR"
    git -C "$TARGET_DIR" fetch origin
    git -C "$TARGET_DIR" checkout "$REPO_BRANCH"
    git -C "$TARGET_DIR" pull --ff-only origin "$REPO_BRANCH"
    return 0
  fi

  if ensure_cmd git; then
    log "Cloning repo to $TARGET_DIR"
    if git clone --branch "$REPO_BRANCH" --depth 1 "$REPO_URL" "$TARGET_DIR"; then
      return 0
    fi
    log "git clone failed, falling back to zip download."
  fi

  # Fallback path if git is unavailable or clone fails.
  local tmp_dir archive extracted_dir
  tmp_dir="$(mktemp -d)"
  archive="$tmp_dir/repo.zip"
  extracted_dir="$tmp_dir/${REPO_NAME}-${REPO_BRANCH}"
  curl -fL "$REPO_ARCHIVE_URL" -o "$archive"
  unzip -q "$archive" -d "$tmp_dir"
  rm -rf "$TARGET_DIR"
  mv "$extracted_dir" "$TARGET_DIR"
}

ensure_godot() {
  local godot_app_dir godot_app_path templates_dir template_ver_dir tmp_dir

  godot_app_dir="$GODOT_INSTALL_ROOT/godot-${GODOT_VERSION}"
  godot_app_path="$godot_app_dir/Godot.app/Contents/MacOS/Godot"
  templates_dir="$HOME/.local/share/godot/export_templates"
  template_ver_dir="$templates_dir/4.5.stable"

  mkdir -p "$GODOT_INSTALL_ROOT"

  if [ ! -x "$godot_app_path" ]; then
    log "Installing Godot ${GODOT_VERSION}."
    tmp_dir="$(mktemp -d)"
    curl -fL "$GODOT_APP_ZIP_URL" -o "$tmp_dir/godot.zip"
    mkdir -p "$godot_app_dir"
    unzip -q "$tmp_dir/godot.zip" -d "$godot_app_dir"
  fi

  if [ ! -f "$template_ver_dir/web_nothreads_release.zip" ]; then
    log "Installing Godot export templates."
    tmp_dir="$(mktemp -d)"
    curl -fL "$GODOT_TEMPLATES_URL" -o "$tmp_dir/templates.tpz"
    mkdir -p "$tmp_dir/templates"
    unzip -q "$tmp_dir/templates.tpz" -d "$tmp_dir/templates"
    mkdir -p "$template_ver_dir"
    cp -R "$tmp_dir"/templates/templates/* "$template_ver_dir/"
  fi

  export GODOT_EDITOR="$godot_app_path"
  log "Using GODOT_EDITOR=$GODOT_EDITOR"
}

run_app() {
  cd "$TARGET_DIR"
  log "Installing npm dependencies."
  npm install
  log "Starting Electron app."
  npm run electron:dev
}

main() {
  ensure_cmd curl || { log "curl is required."; exit 1; }
  ensure_cmd unzip || { log "unzip is required."; exit 1; }
  ensure_node
  clone_or_update_repo
  ensure_godot
  run_app
}

main "$@"
