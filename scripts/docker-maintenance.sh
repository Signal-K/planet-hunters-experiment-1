#!/usr/bin/env bash

set -euo pipefail

usage() {
  echo "Usage: $0 [--prune]"
  echo ""
  echo "Without arguments, reports Docker disk usage."
  echo "--prune removes dangling (untagged) images and build cache immediately —"
  echo "these are never referenced by any container or tag, so age doesn't make"
  echo "them safer to keep — then removes stopped containers and tagged-but-unused"
  echo "images older than 72 hours, then caps build cache at 2 GB. Volumes are"
  echo "never removed."
}

report() {
  echo "Docker disk usage"
  docker system df
  echo ""
  echo "Largest images"
  docker image ls --format '{{.Size}}\t{{.Repository}}:{{.Tag}}\t{{.ID}}' | sort -hr | head -20
  echo ""
  echo "Volumes (preserved by this script)"
  docker system df -v | sed -n '/Local Volumes space usage:/,/Build cache usage:/p'
}

case "${1:-}" in
  "")
    report
    ;;
  --prune)
    echo "Removing dangling images and build cache (age doesn't matter — nothing"
    echo "references them) plus rebuildable artifacts older than 72 hours."
    echo "Persistent and dependency-cache volumes are preserved."
    # Dangling (untagged) images pile up on every `docker build`/`compose build`
    # that moves a tag to a new image — the previous image becomes untagged but
    # isn't cleaned up until something prunes it. Age-gating this step (as the
    # old --filter until=72h version did) let days of active rebuild churn
    # accumulate tens of GB before the 72h grace period even started counting.
    docker image prune --force
    docker builder prune --force
    docker container prune --filter until=72h --force
    docker image prune --all --filter until=72h --force
    docker builder prune --max-used-space 2gb --force
    echo ""
    report
    ;;
  -h|--help)
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
