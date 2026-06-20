#!/usr/bin/env bash
#
# Package the extension into a versioned zip for distribution / Chrome Web Store.
# Output: dist/bid-pilot-<version>.zip
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT="${ROOT}/extension"
DIST="${ROOT}/dist"

VERSION="$(node -p "require('${EXT}/manifest.json').version")"
OUT="${DIST}/bid-pilot-${VERSION}.zip"

if ! command -v zip >/dev/null 2>&1; then
  echo "error: 'zip' is not installed" >&2
  exit 1
fi

mkdir -p "${DIST}"
rm -f "${OUT}"

# Zip the contents of extension/ (so the manifest sits at the archive root),
# excluding OS cruft.
( cd "${EXT}" && zip -rq "${OUT}" . -x '*.DS_Store' '*/.*' )

echo "packaged: ${OUT}"
echo "size: $(du -h "${OUT}" | cut -f1)"
echo "load this unpacked from extension/, or upload the zip to the Chrome Web Store."
