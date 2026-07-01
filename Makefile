#
# Copyright (C) 2026 VitraWrt contributors
#
# This is free software, licensed under the Apache License, Version 2.0.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-theme-vitrawrt
PKG_VERSION:=1.43.0
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=VitraWrt contributors

LUCI_TITLE:=VitraWrt Liquid Glass LuCI theme
LUCI_DEPENDS:=+luci-base +luci-theme-bootstrap
LUCI_PKGARCH:=all
LUCI_MINIFY_CSS:=0
LUCI_MINIFY_JS:=0
LUCI_DESCRIPTION:=VitraWrt / 璃境 is a Vite-built Apple Liquid Glass LuCI theme for OpenWrt and ImmortalWrt. \
It preserves the Bootstrap/LuCI structural cascade and adds a Vite-built visual material layer.

define Package/luci-theme-vitrawrt/description
VitraWrt / 璃境 is a Vite-built Apple Liquid Glass LuCI theme for OpenWrt and ImmortalWrt.
The package keeps the LuCI structural cascade intact and loads the compiled
dist/vitrawrt-apple.css and dist/vitrawrt-motion.js as the final visual layer.
endef

define Build/Prepare/luci-theme-vitrawrt
	$(call Build/Prepare/Default)
	$(FIND) $(PKG_BUILD_DIR) -type d -name node_modules -prune -exec rm -rf {} +
	$(FIND) $(PKG_BUILD_DIR) \( -name '.DS_Store' -o -name '._*' \) -print | $(XARGS) rm -f
endef

define Build/Compile
endef

define Package/luci-theme-vitrawrt/install
	$(INSTALL_DIR) $(1)/www/luci-static/vitrawrt/img
	$(INSTALL_DIR) $(1)/www/luci-static/vitrawrt/dist
	$(INSTALL_DATA) ./htdocs/luci-static/vitrawrt/cascade.css $(1)/www/luci-static/vitrawrt/cascade.css
	$(CP) ./htdocs/luci-static/vitrawrt/img/* $(1)/www/luci-static/vitrawrt/img/
	$(CP) ./htdocs/luci-static/vitrawrt/dist/* $(1)/www/luci-static/vitrawrt/dist/

	$(INSTALL_DIR) $(1)/www/luci-static/resources
	$(INSTALL_DATA) ./htdocs/luci-static/resources/menu-vitrawrt.js $(1)/www/luci-static/resources/menu-vitrawrt.js

	$(INSTALL_DIR) $(1)/usr/share/ucode/luci/template/themes/vitrawrt
	$(INSTALL_DATA) ./ucode/template/themes/vitrawrt/*.ut $(1)/usr/share/ucode/luci/template/themes/vitrawrt/

	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./root/etc/uci-defaults/30_luci-theme-vitrawrt $(1)/etc/uci-defaults/30_luci-theme-vitrawrt
endef

define Package/luci-theme-vitrawrt/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

VWRT_MEDIA="/luci-static/vitrawrt"
VWRT_THEME="VitraWrt"
changed=0

set_luci_opt() {
	local key="$$1"
	local val="$$2"

	if ! uci -q get "luci.$$key" >/dev/null 2>&1; then
		uci -q set "luci.$$key=$$val"
		changed=1
	fi
}

flush_luci_cache() {
	rm -f /tmp/luci-indexcache*
	rm -rf /tmp/luci-modulecache/
	/etc/init.d/rpcd reload 2>/dev/null || true
	/etc/init.d/uhttpd restart 2>/dev/null || true
}

set_luci_opt "themes.$${VWRT_THEME}" "$${VWRT_MEDIA}"

if [ "$${PKG_UPGRADE}" != "1" ]; then
	current="$$(uci -q get luci.main.mediaurlbase)"

	case "$$current" in
		""|/luci-static/bootstrap|/luci-static/bootstrap-dark|/luci-static/bootstrap-light|/luci-static/openwrt*|/luci-static/material)
			uci -q set "luci.main.mediaurlbase=$${VWRT_MEDIA}"
			changed=1
		;;
	esac
fi

if [ "$$changed" = 1 ]; then
	uci commit luci
fi

flush_luci_cache
exit 0
endef

define Package/luci-theme-vitrawrt/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
[ "$${PKG_UPGRADE}" = "1" ] && exit 0

VWRT_MEDIA="/luci-static/vitrawrt"
current="$$(uci -q get luci.main.mediaurlbase)"

flush_luci_cache() {
	rm -f /tmp/luci-indexcache*
	rm -rf /tmp/luci-modulecache/
	/etc/init.d/rpcd reload 2>/dev/null || true
	/etc/init.d/uhttpd restart 2>/dev/null || true
}

if [ "$$current" = "$${VWRT_MEDIA}" ]; then
	if uci -q get luci.themes.Bootstrap >/dev/null 2>&1; then
		uci -q set luci.main.mediaurlbase="/luci-static/bootstrap"
	else
		uci -q delete luci.main.mediaurlbase
	fi

	uci commit luci
fi

flush_luci_cache
exit 0
endef

define Package/luci-theme-vitrawrt/postrm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
[ "$${PKG_UPGRADE}" = "1" ] && exit 0

VWRT_MEDIA="/luci-static/vitrawrt"
changed=0

flush_luci_cache() {
	rm -f /tmp/luci-indexcache*
	rm -rf /tmp/luci-modulecache/
	/etc/init.d/rpcd reload 2>/dev/null || true
	/etc/init.d/uhttpd restart 2>/dev/null || true
}

uci -q delete luci.themes.VitraWrt && changed=1

media="$$(uci -q get luci.main.mediaurlbase)"

if [ "$$media" = "$${VWRT_MEDIA}" ]; then
	if uci -q get luci.themes.Bootstrap >/dev/null 2>&1; then
		uci -q set luci.main.mediaurlbase="/luci-static/bootstrap"
	else
		uci -q delete luci.main.mediaurlbase
	fi

	changed=1
fi

if [ "$$changed" = 1 ]; then
	uci commit luci
fi

flush_luci_cache
exit 0
endef

# OpenWrt's package scanner requires this literal marker; luci.mk performs the call.
# call BuildPackage
LUCI_MK:=$(firstword $(wildcard $(TOPDIR)/feeds/luci/luci.mk $(TOPDIR)/package/feeds/luci/luci.mk ../../luci.mk))
ifeq ($(LUCI_MK),)
  $(error Unable to find luci.mk. Run ./scripts/feeds update luci && ./scripts/feeds install luci-base, or place this package in a LuCI feed checkout.)
endif

include $(LUCI_MK)

# Preserve the exact Vite output. LuCI's legacy minifiers can rewrite modern CSS
# functions and module JavaScript in ways that break Liquid Glass materials.
define CssTidy
endef

define JsMin
endef
