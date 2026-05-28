#!/bin/sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PKG_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"

HOST="10.10.10.148"
SSH_USER="root"
ENABLE=0
RESTART=0
ROLLBACK=0
DEPLOY_MODERN=1
DEPLOY_LEGACY=1

usage() {
	cat <<'EOF'
Usage: scripts/dev-deploy.sh [options]

Deploy luci-theme-vitrawrt directly to a test OpenWrt/ImmortalWrt device.
This script does not build or install ipk/apk packages.

Options:
  --host <ip>       Target host IP or name. Default: 10.10.10.148
  --user <user>     SSH user. Default: root
  --enable          Enable VitraWrt in LuCI after deploy
  --restart         Restart uhttpd after deploy
  --rollback        Restore /luci-static/bootstrap and restart uhttpd
  --legacy-only     Deploy legacy luasrc templates only
  --modern-only     Deploy modern ucode templates only
  -h, --help        Show this help
EOF
}

die() {
	echo "dev-deploy: $*" >&2
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
		--enable)
			ENABLE=1
			shift
			;;
		--restart)
			RESTART=1
			shift
			;;
		--rollback)
			ROLLBACK=1
			shift
			;;
		--legacy-only)
			DEPLOY_MODERN=0
			DEPLOY_LEGACY=1
			shift
			;;
		--modern-only)
			DEPLOY_MODERN=1
			DEPLOY_LEGACY=0
			shift
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

need_ssh() {
	command -v ssh >/dev/null 2>&1 || die "ssh is required"
}

detect_remote_ucode_dir() {
	ssh "$TARGET" '
		if [ -d /usr/share/ucode/luci/template/themes ]; then
			echo /usr/share/ucode/luci/template/themes/vitrawrt
		elif [ -d /usr/share/luci/template/themes ]; then
			echo /usr/share/luci/template/themes/vitrawrt
		else
			echo /usr/share/ucode/luci/template/themes/vitrawrt
		fi
	'
}

print_manual_scp_hint() {
	cat <<EOF >&2
dev-deploy: rsync is not available locally or on ${TARGET}.
Use scp manually, for example:

ssh ${TARGET} 'mkdir -p /www/luci-static/vitrawrt /www/luci-static/resources /usr/share/ucode/luci/template/themes/vitrawrt /usr/lib/lua/luci/view/themes/vitrawrt'
scp -r '${PKG_DIR}/htdocs/luci-static/vitrawrt/.' ${TARGET}:/www/luci-static/vitrawrt/
scp '${PKG_DIR}/htdocs/luci-static/resources/menu-vitrawrt.js' ${TARGET}:/www/luci-static/resources/menu-vitrawrt.js
scp -r '${PKG_DIR}/ucode/template/themes/vitrawrt/.' ${TARGET}:/usr/share/ucode/luci/template/themes/vitrawrt/
scp -r '${PKG_DIR}/luasrc/view/themes/vitrawrt/.' ${TARGET}:/usr/lib/lua/luci/view/themes/vitrawrt/
EOF
}

ensure_rsync() {
	if ! command -v rsync >/dev/null 2>&1; then
		print_manual_scp_hint
		exit 127
	fi

	if ! ssh "$TARGET" 'command -v rsync >/dev/null 2>&1'; then
		print_manual_scp_hint
		exit 127
	fi
}

rollback() {
	echo "Rolling back LuCI theme on ${TARGET}..."
	ssh "$TARGET" '
		set -eu
		uci -q set luci.themes.Bootstrap=/luci-static/bootstrap
		uci -q set luci.main.mediaurlbase=/luci-static/bootstrap
		uci commit luci
		/etc/init.d/uhttpd restart
	'
	echo "Rollback complete: luci.main.mediaurlbase=/luci-static/bootstrap"
}

prepare_remote() {
	ucode_dir="$1"

	echo "Preparing target directories on ${TARGET}..."
	ssh "$TARGET" "
		set -eu
		mkdir -p /www/luci-static/vitrawrt /www/luci-static/resources
		uci -q get luci.main.mediaurlbase > /tmp/vitrawrt-mediaurlbase.backup 2>/dev/null || : > /tmp/vitrawrt-mediaurlbase.backup
	"

	if [ "$DEPLOY_MODERN" = 1 ]; then
		ssh "$TARGET" "mkdir -p '$ucode_dir'"
	fi

	if [ "$DEPLOY_LEGACY" = 1 ]; then
		ssh "$TARGET" "mkdir -p /usr/lib/lua/luci/view/themes/vitrawrt"
	fi
}

deploy_files() {
	ucode_dir="$1"

	echo "Deploying static theme assets to ${TARGET}..."
	rsync -av --delete "$PKG_DIR/htdocs/luci-static/vitrawrt/" "$TARGET:/www/luci-static/vitrawrt/"
	rsync -av "$PKG_DIR/htdocs/luci-static/resources/menu-vitrawrt.js" "$TARGET:/www/luci-static/resources/menu-vitrawrt.js"

	if [ "$DEPLOY_MODERN" = 1 ]; then
		echo "Deploying modern LuCI ucode templates to ${ucode_dir}..."
		rsync -av --delete "$PKG_DIR/ucode/template/themes/vitrawrt/" "$TARGET:$ucode_dir/"
	fi

	if [ "$DEPLOY_LEGACY" = 1 ]; then
		echo "Deploying legacy LuCI Lua view templates..."
		rsync -av --delete "$PKG_DIR/luasrc/view/themes/vitrawrt/" "$TARGET:/usr/lib/lua/luci/view/themes/vitrawrt/"
	fi
}

enable_theme() {
	echo "Enabling VitraWrt theme on ${TARGET}..."
	ssh "$TARGET" '
		set -eu
		uci set luci.themes.VitraWrt=/luci-static/vitrawrt
		uci set luci.main.mediaurlbase=/luci-static/vitrawrt
		uci commit luci
	'
}

restart_uhttpd() {
	echo "Restarting uhttpd on ${TARGET}..."
	ssh "$TARGET" '/etc/init.d/uhttpd restart'
}

need_ssh

if [ "$ROLLBACK" = 1 ]; then
	rollback
	exit 0
fi

ensure_rsync
UCODE_DIR="$(detect_remote_ucode_dir)"

echo "Target: ${TARGET}"
echo "Modern template target: ${UCODE_DIR}"
echo "Legacy template target: /usr/lib/lua/luci/view/themes/vitrawrt"
echo "Backing up current luci.main.mediaurlbase to /tmp/vitrawrt-mediaurlbase.backup"

prepare_remote "$UCODE_DIR"
deploy_files "$UCODE_DIR"

if [ "$ENABLE" = 1 ]; then
	enable_theme
fi

if [ "$RESTART" = 1 ]; then
	restart_uhttpd
fi

echo "Deploy complete."
echo "Open: http://${HOST}/cgi-bin/luci/"
