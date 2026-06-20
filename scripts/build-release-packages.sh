#!/bin/sh

set -eu

repo_root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
build_parent="$repo_root/build"
package_dir="$repo_root/release/packages"
whitelist="$repo_root/packaging/runtime-files.txt"

pkg_name="luci-theme-vitrawrt"
pkg_version="$(sed -n 's/^PKG_VERSION:=//p' "$repo_root/Makefile" | head -n 1)"
pkg_release="$(sed -n 's/^PKG_RELEASE:=//p' "$repo_root/Makefile" | head -n 1)"
version="$pkg_version-r$pkg_release"

[ -n "$pkg_version" ] && [ -n "$pkg_release" ]
[ "$version" = "1.42.0-r1" ]

mkdir -p "$build_parent" "$package_dir"
build_dir="$(mktemp -d "$build_parent/release-packaging.XXXXXX")"
payload_base="$build_dir/payload-base"
payload_ipk="$build_dir/payload-ipk"
payload_apk="$build_dir/payload-apk"
control_dir="$build_dir/ipk-control"
apk_scripts="$build_dir/apk-scripts"
ipk_outer="$build_dir/ipk-outer"

mkdir -p "$payload_base" "$payload_ipk" "$payload_apk" "$control_dir" "$apk_scripts" "$ipk_outer"

install_file() {
	source_path="$1"
	destination_path="$2"
	mode="$3"

	[ -f "$repo_root/$source_path" ]
	mkdir -p "$payload_base$(dirname "$destination_path")"
	install -m "$mode" "$repo_root/$source_path" "$payload_base$destination_path"
}

install_tree() {
	source_dir="$1"
	destination_dir="$2"
	mode="$3"

	[ -d "$repo_root/$source_dir" ]
	find "$repo_root/$source_dir" -type f | sort | while IFS= read -r source_path; do
		relative_path="${source_path#"$repo_root/$source_dir/"}"
		mkdir -p "$payload_base$destination_dir/$(dirname "$relative_path")"
		install -m "$mode" "$source_path" "$payload_base$destination_dir/$relative_path"
	done
}

while IFS='|' read -r kind source_path destination_path mode; do
	case "$kind" in
		""|\#*)
			continue
			;;
		file)
			install_file "$source_path" "$destination_path" "$mode"
			;;
		tree)
			install_tree "$source_path" "$destination_path" "$mode"
			;;
		*)
			echo "Unknown packaging whitelist entry: $kind" >&2
			exit 1
			;;
	esac
done < "$whitelist"

[ ! -e "$payload_base/www/luci-static/vitrawrt/css" ]
[ -f "$payload_base/www/luci-static/vitrawrt/cascade.css" ]
[ -f "$payload_base/www/luci-static/vitrawrt/dist/vitrawrt-apple.css" ]
[ -f "$payload_base/www/luci-static/vitrawrt/dist/vitrawrt-motion.js" ]

cp -R "$payload_base/." "$payload_ipk/"
cp -R "$payload_base/." "$payload_apk/"

extract_make_script() {
	script_name="$1"
	output_path="$2"

	awk -v start="define Package/$pkg_name/$script_name" '
		$0 == start { active = 1; next }
		active && $0 == "endef" { exit }
		active {
			gsub(/\$\$/, "$")
			print
		}
	' "$repo_root/Makefile" > "$output_path"

	[ -s "$output_path" ]
	chmod 0755 "$output_path"
}

extract_make_script postinst "$control_dir/postinst"
extract_make_script prerm "$control_dir/prerm"
extract_make_script postrm "$control_dir/postrm"

installed_size="$(du -sk "$payload_ipk" | awk '{ print $1 }')"
cat > "$control_dir/control" <<EOF
Package: $pkg_name
Version: $version
Depends: luci-base, luci-theme-bootstrap
Section: luci
Priority: optional
Architecture: all
Installed-Size: $installed_size
Maintainer: VitraWrt contributors
License: Apache-2.0
Description: VitraWrt / 璃境 modern LuCI theme
 Built with Vite and TailwindCSS for OpenWrt and ImmortalWrt.
EOF
chmod 0644 "$control_dir/control"

create_root_tar_gz() {
	output_path="$1"
	base_dir="$2"
	shift 2

	if tar --help 2>&1 | grep -q -- '--uid'; then
		COPYFILE_DISABLE=1 tar --format ustar --uid 0 --gid 0 --uname root --gname root \
			-czf "$output_path" -C "$base_dir" "$@"
	else
		tar --format ustar --owner 0 --group 0 \
			-czf "$output_path" -C "$base_dir" "$@"
	fi
}

printf '2.0\n' > "$ipk_outer/debian-binary"
create_root_tar_gz "$ipk_outer/control.tar.gz" "$control_dir" .
create_root_tar_gz "$ipk_outer/data.tar.gz" "$payload_ipk" .

ipk_path="$package_dir/${pkg_name}_${version}_all.ipk"
ipk_temp="$build_dir/$(basename "$ipk_path")"
create_root_tar_gz "$ipk_temp" "$ipk_outer" \
	./debian-binary ./data.tar.gz ./control.tar.gz
mv -f "$ipk_temp" "$ipk_path"

mkdir -p "$payload_apk/lib/apk/packages"
(
	cd "$payload_apk"
	find . \( -type f -o -type l \) -print | sed 's#^\./#/#' | sort
) > "$build_dir/$pkg_name.list"
mv "$build_dir/$pkg_name.list" "$payload_apk/lib/apk/packages/$pkg_name.list"
chmod 0644 "$payload_apk/lib/apk/packages/$pkg_name.list"

custom_postinst="$build_dir/custom-postinst"
custom_prerm="$build_dir/custom-prerm"
custom_postrm="$build_dir/custom-postrm"
cp "$control_dir/postinst" "$custom_postinst"
cp "$control_dir/prerm" "$custom_prerm"
cp "$control_dir/postrm" "$custom_postrm"

{
	echo '#!/bin/sh'
	echo '[ "${IPKG_NO_SCRIPT:-0}" = "1" ] && exit 0'
	echo '[ -s "${IPKG_INSTROOT:-}/lib/functions.sh" ] || exit 0'
	echo '. "${IPKG_INSTROOT:-}/lib/functions.sh"'
	echo 'export root="${IPKG_INSTROOT:-}"'
	echo "export pkgname=\"$pkg_name\""
	echo 'add_group_and_user'
	echo 'default_postinst'
	sed '/^[[:space:]]*#!/d' "$custom_postinst"
} > "$apk_scripts/post-install"

{
	echo '#!/bin/sh'
	echo 'export PKG_UPGRADE=1'
	sed '/^[[:space:]]*#!/d' "$apk_scripts/post-install"
} > "$apk_scripts/post-upgrade"

{
	echo '#!/bin/sh'
	echo '[ -s "${IPKG_INSTROOT:-}/lib/functions.sh" ] || exit 0'
	echo '. "${IPKG_INSTROOT:-}/lib/functions.sh"'
	echo 'export root="${IPKG_INSTROOT:-}"'
	echo "export pkgname=\"$pkg_name\""
	echo 'default_prerm'
	sed '/^[[:space:]]*#!/d' "$custom_prerm"
} > "$apk_scripts/pre-deinstall"

cp "$custom_postrm" "$apk_scripts/post-deinstall"
chmod 0755 "$apk_scripts"/*

find "$payload_base" -type f | sort | while IFS= read -r file_path; do
	relative_path="${file_path#"$payload_base"}"
	hash="$(sha256sum "$file_path" | awk '{ print $1 }')"
	printf '%s  %s\n' "$hash" "$relative_path"
done > "$build_dir/runtime-payload.sha256"

cat > "$build_dir/build-info.env" <<EOF
PACKAGE_NAME=$pkg_name
PACKAGE_VERSION=$version
IPK_PATH=$ipk_path
APK_OUTPUT=$package_dir/${pkg_name}-${version}.apk
APK_PAYLOAD=$payload_apk
APK_SCRIPTS=$apk_scripts
EOF

if [ -n "${APK_MKPKG:-}" ]; then
	"$APK_MKPKG" mkpkg \
		--info "name:$pkg_name" \
		--info "version:$version" \
		--info "description:VitraWrt / 璃境 modern LuCI theme" \
		--info "arch:noarch" \
		--info "license:Apache-2.0" \
		--info "origin:feeds/luci/themes/$pkg_name" \
		--info "maintainer:VitraWrt contributors" \
		--info "depends:luci-base luci-theme-bootstrap" \
		--script "post-install:$apk_scripts/post-install" \
		--script "post-upgrade:$apk_scripts/post-upgrade" \
		--script "pre-deinstall:$apk_scripts/pre-deinstall" \
		--script "post-deinstall:$apk_scripts/post-deinstall" \
		--files "$payload_apk" \
		--output "$package_dir/${pkg_name}-${version}.apk"
fi

printf '%s\n' "$build_dir"
