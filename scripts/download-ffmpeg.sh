#!/bin/bash
# Download ffmpeg essentials build for bundling
# Usage: bash scripts/download-ffmpeg.sh

set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
RESOURCES_DIR="$DIR/src-tauri/resources"

mkdir -p "$RESOURCES_DIR"

ARCH=$(uname -m)
OS=$(uname -s)

if [ "$OS" = "Linux" ]; then
  echo "Downloading ffmpeg for Linux..."
  cd /tmp
  curl -L -o ffmpeg.tar.xz "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
  tar xf ffmpeg.tar.xz
  cp ffmpeg-*-static/ffmpeg "$RESOURCES_DIR/ffmpeg"
  chmod +x "$RESOURCES_DIR/ffmpeg"
  rm -rf ffmpeg* 
  echo "Done: $RESOURCES_DIR/ffmpeg"
elif [ "$OS" = "Darwin" ]; then
  echo "Downloading ffmpeg for macOS..."
  cd /tmp
  curl -L -o ffmpeg.zip "https://evermeet.cx/ffmpeg/getrelease/zip"
  unzip -o ffmpeg.zip -d ffmpeg_bin
  cp ffmpeg_bin/ffmpeg "$RESOURCES_DIR/ffmpeg"
  chmod +x "$RESOURCES_DIR/ffmpeg"
  rm -rf ffmpeg*
  echo "Done: $RESOURCES_DIR/ffmpeg"
else
  echo "Unsupported OS: $OS"
  exit 1
fi
