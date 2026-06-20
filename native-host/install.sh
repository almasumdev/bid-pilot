#!/usr/bin/env bash
#
# Install the Bid Pilot native messaging host manifest.
#
# Usage:
#   ./install.sh <EXTENSION_ID> [browser]
#
#   EXTENSION_ID  the unpacked extension id (chrome://extensions -> Bid Pilot -> ID)
#   browser       chrome | chromium   (default: chrome)
#
set -euo pipefail

HOST_NAME="com.bidpilot.host"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST_JS="${SCRIPT_DIR}/host.js"
LAUNCHER="${SCRIPT_DIR}/host-launcher.sh"
SRC_MANIFEST="${SCRIPT_DIR}/${HOST_NAME}.json"

EXT_ID="${1:-}"
BROWSER="${2:-chrome}"

if [[ -z "${EXT_ID}" ]]; then
  echo "error: missing EXTENSION_ID" >&2
  echo "usage: ./install.sh <EXTENSION_ID> [chrome|chromium]" >&2
  exit 1
fi

case "${BROWSER}" in
  chrome)   TARGET_DIR="${HOME}/.config/google-chrome/NativeMessagingHosts" ;;
  chromium) TARGET_DIR="${HOME}/.config/chromium/NativeMessagingHosts" ;;
  brave)    TARGET_DIR="${HOME}/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts" ;;
  *) echo "error: unknown browser '${BROWSER}' (use chrome|chromium|brave)" >&2; exit 1 ;;
esac

# Resolve an ABSOLUTE node path now. Chrome may launch the host without the
# user's shell PATH (e.g. nvm), so a bare `env node` shebang can fail. The
# launcher hard-codes the node binary to remove that dependency.
NODE_BIN="$(command -v node || true)"
if [[ -z "${NODE_BIN}" ]]; then
  echo "error: 'node' not found on PATH. Install Node.js, or run this script from a shell where node works." >&2
  exit 1
fi
NODE_DIR="$(dirname "${NODE_BIN}")"

CLAUDE_BIN="$(command -v claude || true)"
if [[ -z "${CLAUDE_BIN}" ]]; then
  echo "warning: 'claude' not found on PATH — host will fail until Claude Code is installed + logged in" >&2
  CLAUDE_DIR=""
else
  CLAUDE_DIR="$(dirname "${CLAUDE_BIN}")"
fi

# Write the launcher that Chrome will exec. Chrome (GUI-launched) often lacks the
# user's shell PATH, so we inject node's and claude's dirs explicitly — claude is
# itself a node CLI and needs node on PATH at runtime.
cat > "${LAUNCHER}" <<EOF
#!/usr/bin/env bash
export PATH="${NODE_DIR}:${CLAUDE_DIR}:\${PATH}"
export BIDPILOT_CLAUDE="${CLAUDE_BIN}"
exec "${NODE_BIN}" "${HOST_JS}" "\$@"
EOF
chmod +x "${LAUNCHER}" "${HOST_JS}"

mkdir -p "${TARGET_DIR}"

# Fill placeholders. Manifest 'path' points at the launcher (absolute node inside).
sed -e "s|__HOST_PATH__|${LAUNCHER}|" \
    -e "s|__EXTENSION_ID__|${EXT_ID}|" \
    "${SRC_MANIFEST}" > "${TARGET_DIR}/${HOST_NAME}.json"

echo "installed ${HOST_NAME}.json -> ${TARGET_DIR}"
echo "  launcher : ${LAUNCHER}"
echo "  node     : ${NODE_BIN}"
echo "  host     : ${HOST_JS}"
echo "  ext id   : ${EXT_ID}"
echo "done. Fully quit the browser (all windows) and reopen, then click Test connection."
