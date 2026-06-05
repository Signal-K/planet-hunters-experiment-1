#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE_NAME="${IMAGE_NAME:-landnam-godot-web-e2e:local}"
OUTPUT_DIR="${OUTPUT_DIR:-$ROOT_DIR/test-results/godot-web-e2e}"

mkdir -p "$OUTPUT_DIR"

docker build \
  -f "$ROOT_DIR/docker/godot-web-e2e/Dockerfile" \
  -t "$IMAGE_NAME" \
  "$ROOT_DIR"

docker run --rm \
  -v "$OUTPUT_DIR:/output" \
  "$IMAGE_NAME"
