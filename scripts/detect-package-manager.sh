#!/bin/sh

if command -v apk >/dev/null 2>&1; then
	echo apk
	exit 0
fi

if command -v opkg >/dev/null 2>&1; then
	echo opkg
	exit 0
fi

echo unknown
exit 1
