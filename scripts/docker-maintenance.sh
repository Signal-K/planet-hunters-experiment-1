#!/usr/bin/env bash

set -euo pipefail

usage() {
  echo "Usage: $0 [--prune]"
  echo ""
  echo "Without arguments, reports Docker disk usage."
  echo "--prune removes stopped containers and unused images older than 72 hours,"
  echo "then caps build cache at 2 GB. Volumes are never removed."
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
    echo "Removing rebuildable Docker artifacts older than 72 hours."
    echo "Persistent and dependency-cache volumes are preserved."
    docker container prune --filter until=72h --force
    docker image prune --all --filter until=72h --force
    docker builder prune --filter until=72h --force
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
