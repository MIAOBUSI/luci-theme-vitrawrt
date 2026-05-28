#!/bin/sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PKG_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"

HOST="10.10.10.148"
SSH_USER="root"
LUCI_USER="root"
LUCI_PASSWORD=""
OUT_DIR=""

usage() {
	cat <<'EOF'
Usage: scripts/audit-real-device.sh [options]

Audit a real OpenWrt/ImmortalWrt LuCI device through SSH and curl.
This script is read-only: it does not modify theme files, CSS, UCI, or services.

Options:
  --host <ip>           Target host IP or name. Default: 10.10.10.148
  --user <user>         SSH user. Default: root
  --luci-user <user>    LuCI login user. Default: root
  --luci-password <pw>  LuCI password. Default: empty
  --output-dir <dir>    Audit artifact directory. Default: audit-output/<host>-<timestamp>
  -h, --help            Show this help
EOF
}

die() {
	echo "audit-real-device: $*" >&2
	exit 1
}

while [ "$#" -gt 0 ]; do
	case "$1" in
		--host)
			[ "$#" -ge 2 ] || die "--host requires a value"
			HOST="$2"
			shift 2
			;;
		--user)
			[ "$#" -ge 2 ] || die "--user requires a value"
			SSH_USER="$2"
			shift 2
			;;
		--luci-user)
			[ "$#" -ge 2 ] || die "--luci-user requires a value"
			LUCI_USER="$2"
			shift 2
			;;
		--luci-password)
			[ "$#" -ge 2 ] || die "--luci-password requires a value"
			LUCI_PASSWORD="$2"
			shift 2
			;;
		--output-dir)
			[ "$#" -ge 2 ] || die "--output-dir requires a value"
			OUT_DIR="$2"
			shift 2
			;;
		-h|--help)
			usage
			exit 0
			;;
		*)
			die "unknown option: $1"
			;;
	esac
done

command -v ssh >/dev/null 2>&1 || die "ssh is required"
command -v curl >/dev/null 2>&1 || die "curl is required"

if [ -z "$OUT_DIR" ]; then
	stamp="$(date +%Y%m%d-%H%M%S)"
	safe_host="$(printf '%s' "$HOST" | tr '/: ' '___')"
	OUT_DIR="$PKG_DIR/audit-output/${safe_host}-${stamp}"
fi

mkdir -p "$OUT_DIR/html"

TARGET="${SSH_USER}@${HOST}"
BASE_URL="http://${HOST}/cgi-bin/luci"
COOKIE_JAR="$OUT_DIR/cookies.txt"
SSH_REPORT="$OUT_DIR/ssh-audit.txt"
DOM_REPORT="$OUT_DIR/dom-classes.md"
SUMMARY="$OUT_DIR/summary.txt"

section() {
	printf "\n===== %s =====\n" "$1"
}

log_summary() {
	printf '%s\n' "$*" | tee -a "$SUMMARY"
}

fetch_remote_audit() {
	ssh "$TARGET" 'sh -s' >"$SSH_REPORT" <<'REMOTE_AUDIT'
set -eu

section() {
	printf "\n===== %s =====\n" "$1"
}

print_tree() {
	root="$1"

	if [ ! -d "$root" ]; then
		echo "missing: $root"
		return
	fi

	find "$root" -print | sed "s#^$root#.#" | sort
}

detect_ucode_root() {
	if [ -d /usr/share/ucode/luci/template/themes/vitrawrt ]; then
		echo /usr/share/ucode/luci/template/themes/vitrawrt
	elif [ -d /usr/share/luci/template/themes/vitrawrt ]; then
		echo /usr/share/luci/template/themes/vitrawrt
	else
		echo /usr/share/ucode/luci/template/themes/vitrawrt
	fi
}

UCODE_DIR="$(detect_ucode_root)"
LEGACY_DIR="/usr/lib/lua/luci/view/themes/vitrawrt"

section "1. luci.main.mediaurlbase"
uci -q get luci.main.mediaurlbase || echo "unset"

section "2. /www/luci-static/vitrawrt file tree"
print_tree /www/luci-static/vitrawrt

section "3. cascade.css content"
if [ -f /www/luci-static/vitrawrt/cascade.css ]; then
	cat /www/luci-static/vitrawrt/cascade.css
else
	echo "missing: /www/luci-static/vitrawrt/cascade.css"
fi

section "4. ucode/luasrc template paths"
echo "ucode path: $UCODE_DIR"
print_tree "$UCODE_DIR"
echo
echo "legacy path: $LEGACY_DIR"
print_tree "$LEGACY_DIR"

section "5. vitrawrt resource references"
for dir in \
	/www/luci-static/vitrawrt \
	/www/luci-static/resources \
	"$UCODE_DIR" \
	"$LEGACY_DIR"
do
	if [ -d "$dir" ]; then
		echo "-- $dir"
		grep -RIn "vitrawrt\\|VitraWrt\\|cascade.css\\|menu-vitrawrt\\|data-vitrawrt" "$dir" 2>/dev/null || true
	fi
done
REMOTE_AUDIT
}

curl_login() {
	: > "$COOKIE_JAR"

	status="$(curl -sS -L \
		-c "$COOKIE_JAR" \
		-b "$COOKIE_JAR" \
		-o "$OUT_DIR/login-get.html" \
		-D "$OUT_DIR/login-get.headers" \
		-w '%{http_code}' \
		"$BASE_URL/")"
	printf "GET / status: %s\n" "$status"

	status="$(curl -sS -L \
		-c "$COOKIE_JAR" \
		-b "$COOKIE_JAR" \
		-o "$OUT_DIR/login-post.html" \
		-D "$OUT_DIR/login-post.headers" \
		-w '%{http_code}' \
		--data-urlencode "luci_username=${LUCI_USER}" \
		--data-urlencode "luci_password=${LUCI_PASSWORD}" \
		"$BASE_URL/")"
	printf "POST / login status: %s\n" "$status"
}

fetch_page() {
	path="$1"
	name="$2"
	url="$BASE_URL$path"
	file="$OUT_DIR/html/${name}.html"
	headers="$OUT_DIR/html/${name}.headers"

	status="$(curl -sS -L \
		-c "$COOKIE_JAR" \
		-b "$COOKIE_JAR" \
		-D "$headers" \
		-o "$file" \
		-w '%{http_code}' \
		"$url")"

	printf '%s %s -> %s\n' "$status" "$path" "$file"
}

generate_dom_report() {
	if command -v node >/dev/null 2>&1; then
		node "$SCRIPT_DIR/extract-dom-classes.mjs" \
			"$OUT_DIR/html/status-overview.html" \
			"$OUT_DIR/html/system-system.html" \
			"$OUT_DIR/html/status-iptables.html" \
			>"$DOM_REPORT"
	else
		echo "node not found; DOM class report skipped" >"$DOM_REPORT"
	fi
}

: > "$SUMMARY"

log_summary "VitraWrt Stage 1.8A real-device audit"
log_summary "Target: $TARGET"
log_summary "LuCI: $BASE_URL"
log_summary "Output: $OUT_DIR"

section "SSH audit"
fetch_remote_audit
cat "$SSH_REPORT"

section "LuCI curl login"
curl_login
log_summary "Saved login artifacts: $OUT_DIR/login-get.html, $OUT_DIR/login-post.html"

section "LuCI HTML capture"
fetch_page "/admin/status/overview" "status-overview"
fetch_page "/admin/system/system" "system-system"
fetch_page "/admin/status/iptables" "status-iptables"

section "DOM class and structure report"
generate_dom_report
cat "$DOM_REPORT"

log_summary "SSH audit: $SSH_REPORT"
log_summary "Overview HTML: $OUT_DIR/html/status-overview.html"
log_summary "System HTML: $OUT_DIR/html/system-system.html"
log_summary "Iptables HTML: $OUT_DIR/html/status-iptables.html"
log_summary "DOM report: $DOM_REPORT"
