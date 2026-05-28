#!/bin/sh

set -eu

HOST="10.10.10.148"
SSH_USER="root"

usage() {
	cat <<'EOF'
Usage: scripts/audit-deploy.sh [options]

Audit a deployed luci-theme-vitrawrt instance on a real OpenWrt/ImmortalWrt device.
The script only reads remote state; it does not modify LuCI settings or files.

Options:
  --host <ip>       Target host IP or name. Default: 10.10.10.148
  --user <user>     SSH user. Default: root
  -h, --help        Show this help
EOF
}

die() {
	echo "audit-deploy: $*" >&2
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
		-h|--help)
			usage
			exit 0
			;;
		*)
			die "unknown option: $1"
			;;
	esac
done

TARGET="${SSH_USER}@${HOST}"

command -v ssh >/dev/null 2>&1 || die "ssh is required"

ssh "$TARGET" 'sh -s' <<'REMOTE_AUDIT'
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

check_file() {
	path="$1"

	if [ -f "$path" ]; then
		printf "OK      %s\n" "$path"
	else
		printf "MISSING %s\n" "$path"
	fi
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

section "3. cascade.css first 160 lines"
if [ -f /www/luci-static/vitrawrt/cascade.css ]; then
	sed -n "1,160p" /www/luci-static/vitrawrt/cascade.css
else
	echo "missing: /www/luci-static/vitrawrt/cascade.css"
fi

section "4. ucode template vitrawrt files"
echo "ucode path: $UCODE_DIR"
print_tree "$UCODE_DIR"

section "5. legacy luasrc template vitrawrt files"
echo "legacy path: $LEGACY_DIR"
print_tree "$LEGACY_DIR"

section "6. grep vitrawrt resource references"
for dir in \
	/www/luci-static/vitrawrt \
	/www/luci-static/resources \
	"$UCODE_DIR" \
	"$LEGACY_DIR"
do
	if [ -d "$dir" ]; then
		grep -RIn "vitrawrt\\|VitraWrt\\|cascade.css\\|menu-vitrawrt" "$dir" 2>/dev/null || true
	fi
done

section "7. required file existence"
check_file /www/luci-static/vitrawrt/cascade.css
check_file /www/luci-static/vitrawrt/css/tokens.css
check_file /www/luci-static/vitrawrt/css/sidebar.css
check_file /www/luci-static/vitrawrt/css/luci-overrides.css
check_file /www/luci-static/vitrawrt/img/logo.svg
check_file /www/luci-static/vitrawrt/js/boot.js
check_file /www/luci-static/resources/menu-vitrawrt.js
REMOTE_AUDIT
