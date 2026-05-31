#
# Copyright (C) 2026 VitraWrt contributors
#
# This is free software, licensed under the Apache License, Version 2.0.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-theme-vitrawrt
PKG_VERSION:=1.41.60
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=VitraWrt contributors

LUCI_TITLE:=VitraWrt Liquid Glass LuCI theme
LUCI_DEPENDS:=+luci-base
LUCI_PKGARCH:=all

define Package/luci-theme-vitrawrt/description
VitraWrt / 璃境 is a calm Liquid Glass LuCI theme for OpenWrt and ImmortalWrt.
It provides a floating sidebar, light/dark/system modes, responsive navigation,
and conservative LuCI page restyling without third-party service dependencies.
endef

define Package/luci-theme-vitrawrt/postrm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	media="$$(uci -q get luci.main.mediaurlbase)"

	uci -q delete luci.themes.VitraWrt

	if [ "$$media" = "/luci-static/vitrawrt" ]; then
		if uci -q get luci.themes.Bootstrap >/dev/null 2>&1; then
			uci -q set luci.main.mediaurlbase="/luci-static/bootstrap"
		else
			uci -q delete luci.main.mediaurlbase
		fi
	fi

	uci commit luci
}
endef

LUCI_MK:=$(firstword $(wildcard $(TOPDIR)/feeds/luci/luci.mk $(TOPDIR)/package/feeds/luci/luci.mk ../../luci.mk))
ifeq ($(LUCI_MK),)
  $(error Unable to find luci.mk. Run ./scripts/feeds update luci && ./scripts/feeds install luci-base, or place this package in a LuCI feed checkout.)
endif

include $(LUCI_MK)

# call BuildPackage - OpenWrt buildroot signature
