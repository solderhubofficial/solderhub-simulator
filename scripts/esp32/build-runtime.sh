#!/bin/sh
# Build the patched esp32sim WebAssembly runtime and fetch the pinned mask ROMs.
#   scripts/esp32/build-runtime.sh OUT_DIR      (default: public/esp32)
# Needs: git, rustup (wasm32-unknown-unknown is added if missing), curl, tar, sha256sum.
set -e
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
OUT=${1:-$ROOT/public/esp32}
. "$ROOT/esp32-runtime/UPSTREAM"
WORK=${ESP32_RUNTIME_WORK:-$ROOT/.esp32-runtime-build}
rm -rf "$WORK"; mkdir -p "$WORK" "$OUT"
git clone --quiet "$repo" "$WORK/src"
git -C "$WORK/src" checkout --quiet "$commit"
for p in "$ROOT"/esp32-runtime/patches/*.patch; do git -C "$WORK/src" apply --index "$p"; done
( cd "$WORK/src" && tools/wasm-build.sh && tools/fetch-rom-elfs.sh "$WORK/roms" )
cp "$WORK/src/web/wasm/esp32sim.wasm" "$OUT/esp32sim.wasm"
cp "$WORK"/roms/*.elf "$OUT/"
cp "$ROOT/esp32-runtime/jit.mjs" "$OUT/jit.mjs"
( cd "$OUT" && sha256sum esp32sim.wasm *.elf > SHA256SUMS )
echo "runtime written to $OUT"; ls -la "$OUT"
