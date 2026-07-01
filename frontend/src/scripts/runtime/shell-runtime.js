import { gsap } from 'gsap';

(function() {
	'use strict';

	var root = document.documentElement;
	var THEME_KEY = 'vitrawrt.theme';
	var GLASS_KEY = 'vitrawrt.glass';
	var COLLAPSE_KEY = 'vitrawrt.sidebar.collapsed';
	var THEME_MODES = ['system', 'light', 'dark'];
	var GLASS_MODES = ['auto', 'high', 'low'];
	var NETWORK_ICON_BASE = '/luci-static/vitrawrt/img/network-icons/';
	var NETWORK_ICON_MAP = {
		'alias.svg': { type: 'virtual-interface', state: 'connected', portType: 'virtual-port' },
		'alias_disabled.svg': { type: 'virtual-interface', state: 'disconnected', portType: 'virtual-port' },
		'bridge.svg': { type: 'bridge', state: 'connected', portType: 'switch-port' },
		'bridge_disabled.svg': { type: 'bridge', state: 'disconnected', portType: 'switch-port' },
		'ethernet.svg': { type: 'ethernet', state: 'connected', portType: 'port-rj45' },
		'ethernet_disabled.svg': { type: 'ethernet', state: 'disabled', portType: 'disabled-port' },
		'port_down.svg': { type: 'port-rj45', state: 'disconnected', portType: 'port-rj45' },
		'port_pse_down.svg': { type: 'port-rj45', state: 'disconnected', portType: 'port-rj45' },
		'port_pse_up.svg': { type: 'port-rj45', state: 'connected', portType: 'port-rj45' },
		'port_up.svg': { type: 'port-rj45', state: 'connected', portType: 'port-rj45' },
		'switch.svg': { type: 'switch-port', state: 'connected', portType: 'switch-port' },
		'switch_disabled.svg': { type: 'switch-port', state: 'disabled', portType: 'disabled-port' },
		'tunnel.svg': { type: 'tunnel', state: 'connected', portType: 'virtual-port' },
		'tunnel_disabled.svg': { type: 'tunnel', state: 'disconnected', portType: 'virtual-port' },
		'vlan.svg': { type: 'vlan', state: 'connected', portType: 'virtual-port' },
		'vlan_disabled.svg': { type: 'vlan', state: 'disconnected', portType: 'virtual-port' },
		'vrf.svg': { type: 'virtual-interface', state: 'connected', portType: 'virtual-port' },
		'vrf_disabled.svg': { type: 'virtual-interface', state: 'disconnected', portType: 'virtual-port' },
		'wifi.svg': { type: 'wifi', state: 'connected', portType: 'wireless-radio' },
		'wifi_disabled.svg': { type: 'wifi', state: 'disconnected', portType: 'wireless-radio' },
		'wireguard.svg': { type: 'wireguard', state: 'connected', portType: 'virtual-port' },
		'wireguard_disabled.svg': { type: 'wireguard', state: 'disconnected', portType: 'virtual-port' }
	};
	var NETWORK_ICON_FILES = {
		lan: 'lan.svg',
		wan: 'wan.svg',
		bridge: 'bridge.svg',
		vlan: 'vlan.svg',
		ethernet: 'ethernet.svg',
		wifi: 'wifi.svg',
		loopback: 'loopback.svg',
		tunnel: 'tunnel.svg',
		vpn: 'vpn.svg',
		wireguard: 'wireguard.svg',
		openvpn: 'openvpn.svg',
		pppoe: 'pppoe.svg',
		'dhcp-client': 'dhcp-client.svg',
		'static-address': 'static-address.svg',
		'virtual-interface': 'virtual-interface.svg',
		'unknown-interface': 'unknown-interface.svg',
		'port-rj45': 'port-rj45.svg',
		'port-sfp': 'port-sfp.svg',
		'switch-port': 'switch-port.svg',
		'trunk-port': 'trunk-port.svg',
		'access-port': 'access-port.svg',
		'uplink-port': 'uplink-port.svg',
		'downlink-port': 'downlink-port.svg',
		'cpu-port': 'cpu-port.svg',
		'wireless-radio': 'wireless-radio.svg',
		'virtual-port': 'virtual-port.svg',
		'disabled-port': 'disabled-port.svg',
		'unknown-port': 'unknown-port.svg'
	};
	var themeMedia = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
	var reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
	var menuObserver;
	var viewObserver;
	var indicatorSignature = '';
	var changesModalOpening = false;
	var changesIndicatorRefreshing = false;
	var runtimeEnhanceQueued = false;
	var activeDynlistDeleteMotion = null;
	var networkModulePromise = null;
	var supportsGlass = false;
	var PRESS_SELECTOR = [
		'button:not([disabled])',
		'a.btn',
		'.cbi-button:not([disabled])',
		'.vwrt-icon-button',
		'.vwrt-text-button',
		'.vwrt-theme-button',
		'.vwrt-menu-row'
	].join(',');
	var HOVER_SELECTOR = [
		'#maincontent button:not([disabled])',
		'#maincontent .cbi-button:not([disabled])',
		'#maincontent .btn:not([disabled])',
		'#maincontent input[type="submit"]:not([disabled])',
		'#maincontent input[type="button"]:not([disabled])',
		'#maincontent input[type="reset"]:not([disabled])',
		'#modal_overlay button:not([disabled])',
		'#modal_overlay .cbi-button:not([disabled])',
		'#modal_overlay .btn:not([disabled])',
		'#modal_overlay input[type="submit"]:not([disabled])',
		'#modal_overlay input[type="button"]:not([disabled])',
		'#modal_overlay input[type="reset"]:not([disabled])',
		'.vwrt-icon-button',
		'.vwrt-text-button',
		'.vwrt-theme-button',
		'.vwrt-menu-row > a',
		'.vwrt-menu-expander'
	].join(',');
	var PAGE_CLASSES = [
		'vwrt-page-overview',
		'vwrt-page-network',
		'vwrt-page-dhcp',
		'vwrt-page-dns',
		'vwrt-page-statistics',
		'vwrt-page-collectd',
		'vwrt-page-vnstat2',
		'vwrt-page-system',
		'vwrt-page-flash',
		'vwrt-page-packages',
		'vwrt-page-nlbw',
		'vwrt-page-startup',
		'vwrt-page-processes',
		'vwrt-page-syslog',
		'vwrt-page-network-share',
		'vwrt-page-firewall',
		'vwrt-page-nftables',
		'vwrt-page-openclash',
		'vwrt-page-easytier-status',
		'vwrt-page-mosdns',
		'vwrt-page-cpulimit',
		'vwrt-page-nas',
		'vwrt-page-vpn',
		'vwrt-page-services',
		'vwrt-page-diagnostics',
		'vwrt-page-repokeys',
		'vwrt-page-plugin'
	];

	try {
		supportsGlass = CSS.supports('backdrop-filter', 'blur(1px)') ||
			CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
	}
	catch (e) {}

	function onReady(fn) {
		if (document.readyState === 'loading')
			document.addEventListener('DOMContentLoaded', fn, { once: true });
		else
			fn();
	}

	function motionAllowed() {
		return !(reducedMotion && reducedMotion.matches);
	}

	function readStorage(key, fallback) {
		try {
			return localStorage.getItem(key) || fallback;
		}
		catch (e) {
			return fallback;
		}
	}

	function writeStorage(key, value) {
		try {
			localStorage.setItem(key, value);
		}
		catch (e) {}
	}

	function isValidThemeMode(mode) {
		return THEME_MODES.indexOf(mode) !== -1;
	}

	function readThemeMode() {
		var mode = readStorage(THEME_KEY, 'system');
		return isValidThemeMode(mode) ? mode : 'system';
	}

	function resolveThemeMode(mode) {
		if (mode === 'dark' || mode === 'light')
			return mode;

		return themeMedia && themeMedia.matches ? 'dark' : 'light';
	}

	function updateThemeControls(mode) {
		var activeLabel = null;
		var resolved = resolveThemeMode(mode);

		document.querySelectorAll('[data-vwrt-theme-value]').forEach(function(button) {
			var selected = button.getAttribute('data-vwrt-theme-value') === mode;
			button.setAttribute('aria-pressed', selected ? 'true' : 'false');
			button.classList.toggle('is-active', selected);

			if (selected)
				activeLabel = button.getAttribute('data-vwrt-theme-label') || button.textContent;
		});

		document.querySelectorAll('[data-vwrt-theme-current]').forEach(function(node) {
			node.textContent = activeLabel || mode;
		});

		document.querySelectorAll('[data-vwrt-theme-resolved]').forEach(function(node) {
			node.textContent = resolved;
		});
	}

	function applyThemeMode(mode, persist) {
		var resolved;

		if (!isValidThemeMode(mode))
			mode = 'system';

		if (persist)
			writeStorage(THEME_KEY, mode);

		resolved = resolveThemeMode(mode);
		root.setAttribute('data-theme-mode', mode);
		root.setAttribute('data-theme', resolved);
		root.setAttribute('data-darkmode', resolved === 'dark' ? 'true' : 'false');
		updateThemeControls(mode);
		syncOpenClashTheme(mode);
	}

	function cycleThemeMode() {
		var mode = readThemeMode();
		var index = THEME_MODES.indexOf(mode);

		applyThemeMode(THEME_MODES[(index + 1) % THEME_MODES.length], true);
	}

	function isOpenClashConfigPage() {
		var page = document.body && document.body.getAttribute('data-page') || '';

		return /^admin-services-openclash-(settings|overwrite|subscribe|config)(?:$|-)/.test(page);
	}

	function syncOpenClashTheme(mode) {
		var oc;
		var mapped;
		var dark;

		if (!document.body || !document.body.classList.contains('vwrt-page-openclash'))
			return;

		oc = document.querySelector('#maincontent .oc, .oc');
		mapped = mode === 'system' ? 'auto' : mode;
		dark = resolveThemeMode(mode) === 'dark';

		writeStorage('oc-theme', mapped);

		if (window.DarkModeDetector && typeof window.DarkModeDetector.init === 'function') {
			try {
				window.DarkModeDetector.init();
			}
			catch (e) {}
		}

		if (oc) {
			oc.toggleAttribute('data-darkmode', dark);
			oc.setAttribute('data-vwrt-theme-linked', 'true');
		}

		syncOpenClashLogTheme(dark ? 'dark' : 'light');
	}

	function syncOpenClashLogTheme(resolvedMode) {
		var isLogPage;
		var targets;
		var mirrors;

		isLogPage = document.body &&
			document.body.classList.contains('vwrt-page-openclash') &&
			(
				document.body.getAttribute('data-page') === 'admin-services-openclash-log' ||
				/\/admin\/services\/openclash\/log(?:$|[?#])/.test(window.location.href)
			);

		if (!isLogPage)
			return;

		root.setAttribute('data-darkmode', resolvedMode === 'dark' ? 'true' : 'false');

		targets = document.querySelectorAll([
			'#maincontent #tab',
			'#maincontent #tab-header',
			'#maincontent #tab-content',
			'#maincontent #tab-content .dom',
			'#maincontent #tab-content .CodeMirror.cm-s-log'
		].join(','));
		mirrors = document.querySelectorAll('#maincontent #tab-content .CodeMirror.cm-s-log');

		targets.forEach(function(node) {
			node.setAttribute('data-vwrt-theme', resolvedMode);
			node.classList.toggle('vwrt-openclash-log-dark', resolvedMode === 'dark');
			node.classList.toggle('vwrt-openclash-log-light', resolvedMode === 'light');
		});

		window.requestAnimationFrame(function() {
			mirrors.forEach(function(node) {
				if (node.CodeMirror && typeof node.CodeMirror.refresh === 'function')
					node.CodeMirror.refresh();
			});
		});
	}

	function isValidGlassMode(value) {
		return GLASS_MODES.indexOf(value) !== -1;
	}

	function readGlassMode() {
		var value = readStorage(GLASS_KEY, 'auto');
		return isValidGlassMode(value) ? value : 'auto';
	}

	function resolveGlassMode(value) {
		if (value === 'low')
			return 'low';

		if (value === 'high')
			return supportsGlass ? 'high' : 'low';

		if (!supportsGlass || (reducedMotion && reducedMotion.matches))
			return 'low';

		return 'high';
	}

	function updateGlassControls(value) {
		document.querySelectorAll('[data-vwrt-glass-value]').forEach(function(button) {
			var selected = button.getAttribute('data-vwrt-glass-value') === value;
			button.setAttribute('aria-pressed', selected ? 'true' : 'false');
			button.classList.toggle('is-active', selected);
		});
	}

	function applyGlassMode(value, persist) {
		if (!isValidGlassMode(value))
			value = 'auto';

		if (persist)
			writeStorage(GLASS_KEY, value);

		root.setAttribute('data-vwrt-glass-pref', value);
		root.setAttribute('data-vwrt-glass', resolveGlassMode(value));
		updateGlassControls(value);
	}

	function readCollapsed() {
		return readStorage(COLLAPSE_KEY, '0') === '1';
	}

	function writeCollapsed(collapsed) {
		writeStorage(COLLAPSE_KEY, collapsed ? '1' : '0');
	}

	var loadingCenterTimer = 0;
	var loadingCenterObserver = null;
	var lastLoadingCenter = null;

	function updateLoadingVisualCenter() {
		var main = document.querySelector('#maincontent');
		var center = window.innerWidth / 2;
		var rect;
		var left;
		var right;

		if (main && window.matchMedia && window.matchMedia('(min-width: 901px)').matches) {
			rect = main.getBoundingClientRect();
			left = Math.max(0, rect.left);
			right = Math.min(window.innerWidth, rect.right);

			if (right > left)
				center = left + (right - left) / 2;
		}

		center = Math.round(center);

		if (lastLoadingCenter == null || Math.abs(center - lastLoadingCenter) >= 1) {
			root.style.setProperty('--vwrt-loading-center-x', center + 'px');
			lastLoadingCenter = center;
		}
	}

	function scheduleLoadingVisualCenter() {
		window.cancelAnimationFrame(loadingCenterTimer);
		loadingCenterTimer = window.requestAnimationFrame(updateLoadingVisualCenter);
	}

	function setCollapsed(collapsed) {
		root.classList.toggle('vwrt-sidebar-collapsed', collapsed);
		root.setAttribute('data-vwrt-sidebar', collapsed ? 'collapsed' : 'expanded');
		writeCollapsed(collapsed);

		document.querySelectorAll('[data-vwrt-sidebar-toggle]').forEach(function(button) {
			var label = button.querySelector('span');
			var ariaExpanded = button.getAttribute('data-vwrt-aria-expanded') || button.getAttribute('aria-label') || '';
			var ariaCollapsed = button.getAttribute('data-vwrt-aria-collapsed') || ariaExpanded;
			var labelExpanded = button.getAttribute('data-vwrt-label-expanded') || (label ? label.textContent : '');
			var labelCollapsed = button.getAttribute('data-vwrt-label-collapsed') || labelExpanded;

			button.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
			button.setAttribute('aria-label', collapsed ? ariaCollapsed : ariaExpanded);

			if (label)
				label.textContent = collapsed ? labelCollapsed : labelExpanded;
		});

		scheduleLoadingVisualCenter();
	}

	function setDrawer(open) {
		root.classList.toggle('vwrt-drawer-open', open);
		root.setAttribute('data-vwrt-drawer', open ? 'open' : 'closed');

		document.querySelectorAll('[data-vwrt-drawer-toggle]').forEach(function(button) {
			button.setAttribute('aria-expanded', open ? 'true' : 'false');
		});

		scheduleLoadingVisualCenter();
	}

	function togglePanel(button) {
		var target = button.getAttribute('data-vwrt-panel-toggle');
		var panel = target ? document.querySelector(target) : null;
		var hidden;

		if (!panel)
			return;

		hidden = panel.hasAttribute('hidden');
		panel.toggleAttribute('hidden', !hidden);
		button.setAttribute('aria-expanded', hidden ? 'true' : 'false');
		button.classList.toggle('is-open', hidden);
		animatePanel(panel);
	}

	function closePanels(exceptButton) {
		document.querySelectorAll('[data-vwrt-panel-toggle]').forEach(function(button) {
			var target = button.getAttribute('data-vwrt-panel-toggle');
			var panel = target ? document.querySelector(target) : null;

			if (!panel || button === exceptButton)
				return;

			panel.toggleAttribute('hidden', true);
			button.setAttribute('aria-expanded', 'false');
			button.classList.remove('is-open');
		});
	}

	function updateScrollState() {
		root.classList.toggle('vwrt-page-scrolled', window.scrollY > 8);
	}

	function normalizePath(value) {
		return String(value || '')
			.replace(/^.*\/cgi-bin\/luci\/?/, '')
			.replace(/^\/+|\/+$/g, '')
			.toLowerCase();
	}

	function getPathText() {
		var parts = [];

		parts.push(normalizePath(window.location.pathname));

		if (document.body)
			parts.push(normalizePath(document.body.getAttribute('data-page')).replace(/-/g, '/'));

		if (window.L && L.env) {
			if (Array.isArray(L.env.dispatchpath))
				parts.push(normalizePath(L.env.dispatchpath.join('/')));

			if (Array.isArray(L.env.requestpath))
				parts.push(normalizePath(L.env.requestpath.join('/')));
		}

		return parts.join(' ');
	}

	function easyTierStatusPage() {
		var page = document.body && document.body.getAttribute('data-page') || '';
		var path = getPathText();

		return /^admin-vpn-easytier-status(?:-|$)/.test(page) ||
			/(^|\s)(admin\/)?vpn\/easytier\/status(?:\/|\s|$)/.test(path);
	}

	function cleanupEasyTierNativeStatus(rootNode) {
		var scope = rootNode && rootNode.querySelectorAll ? rootNode : document;

		if (!easyTierStatusPage())
			return;

		scope.querySelectorAll('#maincontent :is(.vwrt-button-action, .vwrt-button-danger, .vwrt-button-neutral, .vwrt-button-stop, .vwrt-button-icon-only, .vwrt-button-has-text, .vwrt-button-add-icon, .vwrt-button-add-text, .vwrt-button-local-loading)').forEach(function(node) {
			node.classList.remove(
				'vwrt-button-action',
				'vwrt-button-danger',
				'vwrt-button-neutral',
				'vwrt-button-stop',
				'vwrt-button-icon-only',
				'vwrt-button-has-text',
				'vwrt-button-add-icon',
				'vwrt-button-add-text',
				'vwrt-button-local-loading'
			);
		});

		scope.querySelectorAll('#maincontent :is(.vwrt-loading-viewport, .vwrt-loading-apply, .vwrt-loading-modal-local, .vwrt-loading-card-local, .vwrt-loading-card-host, .vwrt-loading-only-parent, .vwrt-loading-titled-modal, .vwrt-loading-titled-body, .vwrt-tab-panel-stack, .vwrt-tab-panel-menu, .vwrt-multi-button-field)').forEach(function(node) {
			node.classList.remove(
				'vwrt-loading-viewport',
				'vwrt-loading-apply',
				'vwrt-loading-modal-local',
				'vwrt-loading-card-local',
				'vwrt-loading-card-host',
				'vwrt-loading-only-parent',
				'vwrt-loading-titled-modal',
				'vwrt-loading-titled-body',
				'vwrt-tab-panel-stack',
				'vwrt-tab-panel-menu',
				'vwrt-multi-button-field'
			);
			node.style.removeProperty('--vwrt-tab-panel-menu-bottom');
			node.removeAttribute('data-vwrt-loading-owner');
		});
	}

	function setPageClasses() {
		var path;

		if (!document.body)
			return;

		path = getPathText();
		PAGE_CLASSES.forEach(function(cls) {
			document.body.classList.remove(cls);
		});

		if (/(^|\s)(admin\/)?status(?:\/overview)?(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-overview');

		if (/(^|\s)(admin\/)?network(\/(?:network|routes|dhcp|dns))?(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-network');

		if (/(^|\s)(admin\/)?network\/dhcp(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-dhcp');

		if (/(^|\s)(admin\/)?network\/dns(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-dns');

		if (/(^|\s)(admin\/)?status\/vnstat2(\/|\s|$)/.test(path))
			document.body.classList.add('vwrt-page-vnstat2');

		if (/(^|\s)(admin\/)?system\/system(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-system');

		if (/(^|\s)(admin\/)?system\/(?:flash|mounts)(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-flash');

		if (/(^|\s)(admin\/)?statistics\/collectd(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-collectd');

		if (/(^|\s)(admin\/)?statistics(?:\/(?:graphs|collectd))?(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-statistics');

		if (/(^|\s)(admin\/)?services\/nlbw(?:\/|\s|$)/.test(path))
			document.body.classList.add('vwrt-page-nlbw');

		if (/(^|\s)(admin\/)?system\/(packages|package-manager)(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-packages');

		if (/(^|\s)(admin\/)?system\/startup(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-startup');

		if (/(^|\s)(admin\/)?status\/processes(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-processes');

		if (/(^|\s)(admin\/)?status\/(syslog|logs\/syslog)(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-syslog');

		if (/(^|\s)(admin\/)?network\/firewall(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-firewall');

		if (/(^|\s)(admin\/)?status\/nftables(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-nftables');

		if (/(samba|ksmbd|nfs|network[-/ ]?share|share|nas)/.test(path))
			document.body.classList.add('vwrt-page-network-share', 'vwrt-page-nas');

		if (/(^|\s)(admin\/)?vpn(\/|\s|$)|openvpn|softether/.test(path))
			document.body.classList.add('vwrt-page-vpn');

		if (/(^|\s)(admin\/)?vpn\/easytier\/status(?:\/|\s|$)/.test(path))
			document.body.classList.add('vwrt-page-easytier-status', 'vwrt-page-plugin');

		if (/(^|\s)(admin\/)?services(\s|\/|$)/.test(path))
			document.body.classList.add('vwrt-page-services');

		if (/(^|\s)(admin\/)?network\/diagnostics(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-diagnostics');

		if (/(^|\s)(admin\/)?system\/admin\/repokeys(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-repokeys');

		if (/(^|\s)(admin\/)?services\/openclash(\s|\/|$)|openclash/.test(path))
			document.body.classList.add('vwrt-page-openclash', 'vwrt-page-plugin');

		if (/(^|\s)(admin\/)?services\/mosdns(\s|\/|$)|mosdns/.test(path))
			document.body.classList.add('vwrt-page-mosdns', 'vwrt-page-plugin');

		if (/(^|\s)(admin\/)?services\/(?:cpulimit|cpu[-_]?limit)(\s|\/|$)|cpu[-_ ]?limit/.test(path))
			document.body.classList.add('vwrt-page-cpulimit', 'vwrt-page-plugin');

		if (/(^|\s)(admin\/)?services\/(?!openclash|mosdns|cpulimit|cpu[-_]?limit)[a-z0-9_-]+/.test(path))
			document.body.classList.add('vwrt-page-plugin');
	}

	function currentTopLevelName() {
		if (window.L && L.env && Array.isArray(L.env.dispatchpath))
			return L.env.dispatchpath[1] || '';

		return document.body ? (document.body.getAttribute('data-page') || '').split('-')[1] || '' : '';
	}

	function pruneExpandedMenuGroups() {
		var menu = document.querySelector('#vitrawrt-sidebar-menu > .vwrt-menu.l1');
		var expanded;
		var activeName;

		if (!menu)
			return;

		expanded = Array.prototype.filter.call(menu.children, function(li) {
			return li.classList.contains('expanded');
		});

		if (expanded.length <= 3)
			return;

		activeName = currentTopLevelName();
		expanded.forEach(function(li) {
			var button;

			if (activeName && li.classList.contains('vwrt-menu-item-' + activeName))
				return;

			li.classList.remove('expanded');
			button = li.querySelector(':scope > .vwrt-menu-row > .vwrt-menu-expander');

			if (button)
				button.setAttribute('aria-expanded', 'false');
		});
	}

	function watchMenuExpansion() {
		var container = document.querySelector('#vitrawrt-sidebar-menu');

		if (!container || menuObserver)
			return;

		menuObserver = new MutationObserver(pruneExpandedMenuGroups);
		menuObserver.observe(container, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['class', 'aria-expanded']
		});

		pruneExpandedMenuGroups();
	}

	function viewReady() {
		var view = document.querySelector('#view');
		var children;

		if (!view)
			return true;

		children = Array.prototype.filter.call(view.children, function(child) {
			return child.nodeType === 1;
		});

		return !(children.length === 1 && children[0].classList.contains('spinning'));
	}

	function enhanceLoadingStates(rootNode) {
		var scope = rootNode && rootNode.querySelectorAll ? rootNode : document;
		var loadingSelector = '.spinning, .loading';
		var materialSelector = [
			'.cbi-section-node',
			'.cbi-section',
			'.cbi-map',
			'.panel',
			'.tab-content',
			'.tab-pane',
			'[data-tab]',
			'.graph',
			'.graph-container'
		].join(', ');
		var loadingControlSelector = 'button, .btn, .cbi-button, input[type="button"], input[type="submit"]';
		var loadingControlRoot = function(node) {
			if (!node || !node.matches)
				return null;

			if (node.matches(loadingControlSelector))
				return node;

			return node.closest(loadingControlSelector);
		};
		var hasMaterial = function(node) {
			var style;
			var background;

			if (!node || !node.matches)
				return false;

			if (node.matches(materialSelector))
				return true;

			style = window.getComputedStyle(node);
			background = String(style.backgroundColor || '');
			return (
				(parseFloat(style.borderTopWidth || '0') > 0) ||
				(style.boxShadow && style.boxShadow !== 'none') ||
				(background !== 'transparent' && !/rgba?\([^)]*,\s*0(?:\.0+)?\)$/.test(background))
			);
		};
		var meaningfulContent = function(parent, spinner) {
			var ignored = [
				'.spinning',
				'.loading',
				'.cbi-tabmenu',
				'.tabs',
				'.cbi-page-actions',
				'.button-row',
				'template',
				'script',
				'style',
				'[hidden]',
				'[aria-hidden="true"]',
				'.hidden'
			].join(', ');
			var substantive = [
				'.cbi-value',
				'table',
				'.table',
				'.cbi-section-table',
				'canvas',
				'video',
				'img',
				'svg',
				'input:not([type="hidden"])',
				'select',
				'textarea',
				'button'
			].join(', ');
			var visible = function(node) {
				var rect;
				var computed;

				if (!node || !node.getBoundingClientRect)
					return false;

				rect = node.getBoundingClientRect();
				computed = window.getComputedStyle(node);
				return rect.width > 1 && rect.height > 1 &&
					computed.getPropertyValue('display') !== 'none' &&
					computed.getPropertyValue('visibility') !== 'hidden' &&
					computed.getPropertyValue('opacity') !== '0';
			};
			var outsideLoading = function(node) {
				return node !== spinner &&
					!spinner.contains(node) &&
					!node.closest(ignored) &&
					!node.closest('.spinning, .loading');
			};
			var hasSubstantive = Array.prototype.some.call(parent.querySelectorAll(substantive), function(node) {
				return outsideLoading(node) && visible(node);
			});
			var walker;
			var textNode;

			if (hasSubstantive)
				return true;

			walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
			while ((textNode = walker.nextNode())) {
				if (!String(textNode.nodeValue || '').replace(/\s+/g, ' ').trim())
					continue;
				if (!textNode.parentElement || !outsideLoading(textNode.parentElement) || !visible(textNode.parentElement))
					continue;
				return true;
			}

			return false;
		};

		if (easyTierStatusPage()) {
			cleanupEasyTierNativeStatus(scope);
			return;
		}

		document.querySelectorAll('[data-vwrt-loading-owner]').forEach(function(node) {
			if (!node.matches(loadingSelector)) {
				node.classList.remove('vwrt-loading-viewport', 'vwrt-loading-apply', 'vwrt-loading-modal-local', 'vwrt-loading-card-local');
				node.removeAttribute('data-vwrt-loading-owner');
			}
		});

		document.querySelectorAll('.vwrt-loading-card-host').forEach(function(node) {
			if (!node.querySelector('.vwrt-loading-card-local'))
				node.classList.remove('vwrt-loading-card-host');
		});

		document.querySelectorAll('.vwrt-button-local-loading').forEach(function(control) {
			var active = control.matches(loadingSelector) || control.querySelector(loadingSelector);

			if (!active)
				control.classList.remove('vwrt-button-local-loading');
		});

		document.querySelectorAll('.vwrt-loading-only-parent').forEach(function(node) {
			var spinner = Array.prototype.find.call(node.querySelectorAll(loadingSelector), function(candidate) {
				return !loadingControlRoot(candidate);
			});
			if (!spinner || meaningfulContent(node, spinner))
				node.classList.remove('vwrt-loading-only-parent');
		});

		document.querySelectorAll('.vwrt-loading-titled-modal').forEach(function(node) {
			var titledSpinner = node.querySelector('.vwrt-loading-titled-body');
			if (!titledSpinner)
				node.classList.remove('vwrt-loading-titled-modal');
		});

		document.querySelectorAll('.vwrt-loading-titled-body').forEach(function(node) {
			if (!node.matches(loadingSelector) || !node.closest('.vwrt-loading-titled-modal'))
				node.classList.remove('vwrt-loading-titled-body');
		});

		scope.querySelectorAll(loadingSelector).forEach(function(spinner) {
			var control = loadingControlRoot(spinner);
			var parent;
			var owner;
			var ownerClass;
			var cardHost = null;
			var modalHost;
			var titleNode;

			if (control) {
				control.classList.add('vwrt-button-local-loading');
				spinner.classList.remove('vwrt-loading-viewport', 'vwrt-loading-apply', 'vwrt-loading-modal-local', 'vwrt-loading-card-local');
				control.classList.remove('vwrt-loading-viewport', 'vwrt-loading-apply', 'vwrt-loading-modal-local', 'vwrt-loading-card-local');
				spinner.removeAttribute('data-vwrt-loading-owner');
				control.removeAttribute('data-vwrt-loading-owner');
				return;
			}

			parent = spinner.parentElement;
			while (parent && parent.id !== 'view' && parent.id !== 'maincontent' && parent.id !== 'modal_overlay') {
				if (hasMaterial(parent) && meaningfulContent(parent, spinner)) {
					cardHost = parent;
					break;
				}
				parent = parent.parentElement;
			}

			if (spinner.matches('#modal_overlay > .modal.alert-message.spinning, #modal_overlay > .modal.alert-message.loading'))
				owner = 'apply';
			else if (cardHost)
				owner = 'card';
			else if (spinner.closest('#modal_overlay .modal'))
				owner = 'modal';
			else
				owner = 'viewport';

			ownerClass = owner === 'apply'
				? 'vwrt-loading-apply'
				: owner === 'card'
					? 'vwrt-loading-card-local'
				: owner === 'modal'
					? 'vwrt-loading-modal-local'
					: 'vwrt-loading-viewport';

			if (spinner.getAttribute('data-vwrt-loading-owner') !== owner) {
				spinner.classList.remove('vwrt-loading-viewport', 'vwrt-loading-apply', 'vwrt-loading-modal-local', 'vwrt-loading-card-local');
				spinner.classList.add(ownerClass);
				spinner.setAttribute('data-vwrt-loading-owner', owner);
			}

			if (cardHost)
				cardHost.classList.add('vwrt-loading-card-host');

			modalHost = spinner.closest('#modal_overlay .modal[role="dialog"]');
			titleNode = modalHost ? Array.prototype.find.call(modalHost.children || [], function(child) {
				return child.matches && child.matches('h1, h2, h3, h4, .modal-title') && child.textContent && child.textContent.trim();
			}) : null;

				if (
					modalHost &&
					!modalHost.matches('.alert-message') &&
					titleNode
				) {
					modalHost.classList.add('vwrt-loading-titled-modal');
					modalHost.classList.remove('vwrt-loading-only-parent');
					spinner.classList.add('vwrt-loading-titled-body');
					spinner.classList.remove('vwrt-loading-modal-local', 'vwrt-loading-card-local', 'vwrt-loading-viewport');
				} else {
				if (modalHost)
					modalHost.classList.remove('vwrt-loading-titled-modal');
				spinner.classList.remove('vwrt-loading-titled-body');
			}

			if (spinner.closest('#modal_overlay')) {
				if (owner === 'modal') {
					parent = spinner.parentElement;
					while (parent && parent.id !== 'modal_overlay') {
							if (
								parent.matches('.modal[role="dialog"]') &&
								!parent.matches('.alert-message') &&
								!parent.classList.contains('vwrt-loading-titled-modal') &&
								!meaningfulContent(parent, spinner)
							)
								parent.classList.add('vwrt-loading-only-parent');
							else if (!parent.classList.contains('vwrt-loading-titled-modal') && hasMaterial(parent) && !meaningfulContent(parent, spinner))
								parent.classList.add('vwrt-loading-only-parent');
							parent = parent.parentElement;
						}
				}
				return;
			}

			parent = spinner.parentElement;
			while (parent && parent.id !== 'view' && parent.id !== 'maincontent') {
				if (hasMaterial(parent) && !meaningfulContent(parent, spinner))
					parent.classList.add('vwrt-loading-only-parent');
				parent = parent.parentElement;
			}
		});
	}

	function classifyStatusPrompt(modal) {
		var text = String(modal && modal.textContent || '').replace(/\s+/g, ' ').trim();

		if (!text)
			return null;
		if (
			modal.matches &&
			modal.matches('#modal_overlay :is(.modal, [role="dialog"])') &&
			modal.querySelector(':scope :is(input[type="checkbox"], input[type="radio"], textarea, select, table, pre, code, .cbi-map, .cbi-section, .uci-change-list, .uci-change-legend)')
		)
			return null;
		if (/Changes have been reverted|Changes reverted|更改已被还原|配置更改已还原|更改已还原/i.test(text))
			return 'restored';
		if (/Configuration changes applied|Configuration has been applied|Changes applied|Content saved|配置更改已应用|配置已应用|更改已应用|内容已保存/i.test(text))
			return 'success';
		if (/Waiting for configuration to be applied|Applying configuration changes|Applying changes|正在等待配置.*应用|正在应用配置/i.test(text))
			return 'applying';
		if (/Loading view|Loading data|正在载入视图|正在加载/i.test(text))
			return 'loading';
		if (/Session expired|authentication session expired|会话已过期|登录会话.*过期/i.test(text))
			return 'session';
		if (/Unable to read uploaded backup archive|Unable to read uploaded backup|无法读取上传的备份归档|无法读取上传的备份|Upload failed|Backup restore failed|校验失败|验证失败|上传失败|读取失败|读取错误|Failed to|Invalid/i.test(text))
			return 'warning';
		if (/No pending changes|There are no changes to apply|没有待应用的更改|没有待处理的更改/i.test(text))
			return 'empty';

		return null;
	}

	function normalizeStatusPromptBody(modal) {
		var existing = modal.querySelector(':scope > .vwrt-status-message');
		var textNodes;
		var firstText;
		var message;
		var text;

		if (existing)
			return existing;

		textNodes = Array.prototype.filter.call(modal.childNodes || [], function(node) {
			return node.nodeType === 3 && String(node.textContent || '').trim();
		});

		if (!textNodes.length)
			return null;

		firstText = textNodes[0];
		message = document.createElement('span');
		message.className = 'vwrt-status-message';
		modal.insertBefore(message, firstText);

		textNodes.forEach(function(node) {
			text = String(node.textContent || '').replace(/\s+/g, ' ').trim();
			if (text)
				message.appendChild(document.createTextNode((message.textContent ? ' ' : '') + text));
			node.remove();
		});

		return message;
	}

	function enhanceStatusPrompts(rootNode) {
		var scope = rootNode && rootNode.querySelectorAll ? rootNode : document;
		var statusKinds = [
			'loading',
			'applying',
			'success',
			'restored',
			'session',
			'warning',
			'empty'
		];
		var statusClasses = ['vwrt-status-prompt', 'vwrt-status-compact', 'vwrt-status-has-action', 'vwrt-status-floating'].concat(
			statusKinds.map(function(kind) {
				return 'vwrt-status-' + kind;
			})
		);
			var selector = [
				'#modal_overlay .modal',
				'#modal_overlay [role="dialog"]',
				'#modal_overlay > .alert',
				'#modal_overlay > .alert-message',
				'#modal_overlay > .notice',
				'body.vwrt-auth-body .vwrt-auth-page .alert',
			'body.vwrt-auth-body .vwrt-auth-page .alert-message',
			'body.vwrt-auth-body .vwrt-auth-page .notice',
			'#maincontent .alert',
			'#maincontent .alert-message',
			'#maincontent .notice',
			'#view .alert',
			'#view .alert-message',
			'#view .notice'
		].join(', ');
		var modals = [];
		var hasFloatingPrompt = false;

		if (scope.matches && scope.matches(selector))
			modals.push(scope);

		scope.querySelectorAll(selector).forEach(function(modal) {
			modals.push(modal);
		});

		modals.forEach(function(modal) {
			var kind = classifyStatusPrompt(modal);
			var title;
			var footer;
			var body;
			var compact;
			var floating;

			if (modal.parentElement && modal.parentElement.closest('.vwrt-status-prompt')) {
				modal.classList.remove.apply(modal.classList, statusClasses);
				modal.removeAttribute('data-vwrt-status-kind');
				modal.removeAttribute('data-vwrt-status-layout');
				return;
			}

			if (!kind) {
				modal.classList.remove.apply(modal.classList, statusClasses);
				modal.removeAttribute('data-vwrt-status-kind');
				modal.removeAttribute('data-vwrt-status-layout');
				return;
			}

			title = modal.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > .modal-title');
			footer = modal.querySelector(':scope > .button-row, :scope > .right, :scope > .modal-footer');
			body = modal.querySelector(':scope > .vwrt-status-message, :scope > .alert-message, :scope > .modal-body, :scope > p') || normalizeStatusPromptBody(modal);
			compact = !title && !!body;

			floating = !modal.closest('#modal_overlay') && !modal.closest('.vwrt-auth-page');
			hasFloatingPrompt = hasFloatingPrompt || floating;
			modal.classList.add('vwrt-status-prompt');
			statusKinds.forEach(function(name) {
				modal.classList.toggle('vwrt-status-' + name, name === kind);
			});
			modal.classList.toggle('vwrt-status-compact', compact);
			modal.classList.toggle('vwrt-status-has-action', !!footer);
			modal.classList.toggle('vwrt-status-floating', floating);
			modal.setAttribute('data-vwrt-status-kind', kind);
			modal.setAttribute('data-vwrt-status-layout', compact ? 'compact' : 'stacked');
		});

		if (document.body)
			document.body.classList.toggle('vwrt-status-freeze', hasFloatingPrompt);
	}

	function enhanceNetworkIcons(rootNode) {
		var scope = rootNode && rootNode.querySelectorAll ? rootNode : document;
		var images = [];
		var owners = [];
		var selectors = [
			'.ifacebadge',
			'.ifacebox',
			'.interface-status',
			'.device-status',
				'.network-status-table .tr',
				'.network-status-table tr'
			].join(',');

		if (document.body && document.body.classList.contains('vwrt-dashboard-page'))
			return;
		if (!/(^|\s)(admin\/)?(?:status(?:\/overview)?|network\/(?:network|dhcp|routes|diagnostics))(\s|$)/.test(getPathText())) {
			document.querySelectorAll('#maincontent .vwrt-network-glyph').forEach(function(glyph) {
				glyph.remove();
			});
			document.querySelectorAll('#maincontent [data-vwrt-network-icon]').forEach(function(node) {
				node.removeAttribute('data-vwrt-network-icon');
				node.removeAttribute('data-vwrt-icon-type');
				node.removeAttribute('data-vwrt-icon-state');
				node.removeAttribute('data-vwrt-port-type');
				if (node.matches('img')) {
					node.classList.remove('vwrt-network-port-icon');
					node.classList.remove('vwrt-network-source-icon');
					node.style.removeProperty('--vwrt-network-icon-url');
				}
			});
			return;
		}

		if (scope.matches && scope.matches('img'))
			images.push(scope);

		scope.querySelectorAll('img').forEach(function(image) {
			images.push(image);
		});

		images.forEach(function(image) {
			var current = image.getAttribute('src') || '';
			var original = image.getAttribute('data-vwrt-network-icon-original') || current;
			var match = original.match(/(?:^|\/)resources\/icons\/([^/?#]+\.svg)(?:[?#].*)?$/);
			var meta = match && NETWORK_ICON_MAP[match[1]];
			var target;

			if (!meta)
				return;

			if (!image.hasAttribute('data-vwrt-network-icon-original'))
				image.setAttribute('data-vwrt-network-icon-original', original);

			applyNetworkMeta(image, meta);
			image.classList.add('vwrt-network-port-icon');
			image.setAttribute('aria-hidden', 'true');
			image.classList.remove('vwrt-network-source-icon');
			image.style.removeProperty('--vwrt-network-icon-url');
			target = NETWORK_ICON_BASE + iconFile(meta.type);
			if (current !== target)
				image.setAttribute('src', target);
		});

		if (scope.matches && scope.matches(selectors))
			owners.push(scope);

		scope.querySelectorAll(selectors).forEach(function(owner) {
			owners.push(owner);
		});
		owners = Array.from(new Set(owners));

		cleanupNetworkTooltipGlyphs(scope);

		owners.forEach(function(owner) {
			var meta = getNetworkIconMeta(owner);
			if (isNetworkTooltipNode(owner)) {
				cleanupNetworkTooltipGlyphs(owner);
				return;
			}
			if (!networkIconOwnerEligible(owner, meta)) {
				clearNetworkIconOwner(owner);
				return;
			}
			applyNetworkMeta(owner, meta);
			ensureNetworkGlyph(owner, meta);
			enhanceOverviewPortCard(owner);
		});
	}

	function iconFile(type) {
		return NETWORK_ICON_FILES[type] || NETWORK_ICON_FILES['unknown-interface'];
	}

	function compactNodeText(node) {
		var clone;
		var text = node && (node.getAttribute('data-device') ||
			node.getAttribute('data-ifname') ||
			node.getAttribute('data-value') ||
			node.getAttribute('title') ||
			'');

		if (!text && node && node.cloneNode) {
			clone = node.cloneNode(true);
			clone.querySelectorAll('.cbi-tooltip').forEach(function(tooltip) {
				tooltip.remove();
			});
			text = clone.textContent;
		}

		return String(text || '').replace(/\s+/g, ' ').trim();
	}

	function networkStateFromText(text, node) {
		if (node && (node.matches('[disabled], .disabled') || node.getAttribute('aria-disabled') === 'true'))
			return 'disabled';
		if (/(?:missing|not present|不存在|缺失|error|failed|错误|失败)/i.test(text))
			return 'error';
		if (/(?:warning|warn|pending|待应用|警告)/i.test(text))
			return 'warning';
		if (/(?:disabled|down|disconnected|未连接|断开|关闭)/i.test(text))
			return 'disconnected';
		if (/(?:up|connected|running|已连接|运行|active)/i.test(text))
			return 'connected';
		return 'unknown';
	}

	function networkTypeFromText(text, node) {
		var value = String(text || '').toLowerCase();
		var cls = node && node.className ? String(node.className).toLowerCase() : '';
		var haystack = value + ' ' + cls;

		if (/(?:wireguard|\bwg\d*)/.test(haystack))
			return 'wireguard';
		if (/(?:openvpn|ovpn)/.test(haystack))
			return 'openvpn';
		if (/(?:pppoe|ppp)/.test(haystack))
			return 'pppoe';
		if (/(?:\blo\b|loopback)/.test(haystack))
			return 'loopback';
		if (/(?:wlan|wifi|wireless|radio|无线)/.test(haystack))
			return node && node.matches && node.matches('.ifacebox') ? 'wireless-radio' : 'wifi';
		if (/(?:tun|tap|tunnel|gre|6in4)/.test(haystack))
			return 'tunnel';
		if (/(?:vpn|softether|ipsec)/.test(haystack))
			return 'vpn';
		if (/(?:br-|bridge|网桥)/.test(haystack))
			return 'bridge';
		if (/(?:vlan|\beth\d+\.\d+|\.\d+\b)/.test(haystack))
			return 'vlan';
		if (/(?:\bwan\b|wwan|互联网|外网)/.test(haystack))
			return 'wan';
		if (/(?:\blan\b|内网|局域网)/.test(haystack))
			return 'lan';
		if (/(?:dhcp)/.test(haystack))
			return 'dhcp-client';
		if (/(?:static|静态)/.test(haystack))
			return 'static-address';
		if (/(?:alias|virtual|@)/.test(haystack))
			return 'virtual-interface';
		if (/(?:sfp|fiber|光)/.test(haystack))
			return 'port-sfp';
		if (/(?:switch)/.test(haystack))
			return 'switch-port';
		if (/(?:eth|enp|port)/.test(haystack))
			return 'ethernet';
		return 'unknown-interface';
	}

	function portTypeFromNetworkType(type, text) {
		var value = String(text || '').toLowerCase();
		if (/sfp|fiber|光/.test(value))
			return 'port-sfp';
		if (/trunk/.test(value))
			return 'trunk-port';
		if (/access/.test(value))
			return 'access-port';
		if (/uplink|wan/.test(value))
			return 'uplink-port';
		if (/downlink/.test(value))
			return 'downlink-port';
		if (/cpu|system/.test(value))
			return 'cpu-port';
		if (type === 'wifi' || type === 'wireless-radio')
			return 'wireless-radio';
		if (type === 'bridge' || type === 'lan' || type === 'switch-port')
			return 'switch-port';
		if (type === 'virtual-interface' || type === 'tunnel' || type === 'vpn' || type === 'wireguard' || type === 'openvpn')
			return 'virtual-port';
		if (type === 'unknown-interface')
			return 'unknown-port';
		return 'port-rj45';
	}

	function getNetworkIconMeta(node) {
		var text = compactNodeText(node);
		var type = networkTypeFromText(text, node);
		var state = networkStateFromText(text, node);
		return {
			type: type,
			state: state,
			portType: portTypeFromNetworkType(type, text)
		};
	}

		function applyNetworkMeta(node, meta) {
			if (!node || !meta)
				return;
			node.setAttribute('data-vwrt-network-icon', 'true');
		node.setAttribute('data-vwrt-icon-type', meta.type || 'unknown-interface');
		node.setAttribute('data-vwrt-icon-state', meta.state || 'unknown');
		if (meta.portType)
				node.setAttribute('data-vwrt-port-type', meta.portType);
		}

		function isNetworkTooltipNode(node) {
			return !!(node && node.closest && node.closest('.cbi-tooltip, .cbi-tooltip-container'));
		}

		function networkMedia(owner) {
			return Array.prototype.find.call(owner.querySelectorAll('img[data-vwrt-network-icon]:not(.vwrt-network-glyph), svg[data-vwrt-network-icon]'), function(media) {
				return !media.closest('.cbi-tooltip');
			});
		}

		function networkIconOwnerEligible(owner, meta) {
			if (meta && meta.type !== 'unknown-interface')
				return true;
			if (networkMedia(owner))
				return true;
			return owner.matches('.ifacebadge, .ifacebox, .interface-status, .device-status, .network-status-table .tr, .network-status-table tr');
		}

		function clearNetworkIconOwner(owner) {
			owner.querySelectorAll(':scope > .vwrt-network-glyph').forEach(function(glyph) {
				glyph.remove();
			});
			owner.removeAttribute('data-vwrt-network-icon');
			owner.removeAttribute('data-vwrt-icon-type');
			owner.removeAttribute('data-vwrt-icon-state');
			owner.removeAttribute('data-vwrt-port-type');
		}

		function cleanupNetworkTooltipGlyphs(scope) {
			var root = scope && scope.querySelectorAll ? scope : document;
			var selector = '.cbi-tooltip-container > .vwrt-network-glyph, .cbi-tooltip > .vwrt-network-glyph, [data-vwrt-tooltip] > .vwrt-network-glyph';
			var ownerSelector = '.cbi-tooltip-container[data-vwrt-network-icon], .cbi-tooltip[data-vwrt-network-icon], .cbi-tooltip [data-vwrt-network-icon], [data-vwrt-tooltip][data-vwrt-network-icon]';

			if (root.matches && root.matches(selector))
				root.remove();

			root.querySelectorAll(selector).forEach(function(glyph) {
				glyph.remove();
			});

			if (root.matches && root.matches(ownerSelector)) {
				root.removeAttribute('data-vwrt-network-icon');
				root.removeAttribute('data-vwrt-icon-type');
				root.removeAttribute('data-vwrt-icon-state');
				root.removeAttribute('data-vwrt-port-type');
			}

			root.querySelectorAll(ownerSelector).forEach(function(owner) {
				owner.removeAttribute('data-vwrt-network-icon');
				owner.removeAttribute('data-vwrt-icon-type');
				owner.removeAttribute('data-vwrt-icon-state');
				owner.removeAttribute('data-vwrt-port-type');
			});
		}

		function ensureNetworkGlyph(owner, meta) {
			var glyph;
			var directMedia;
			var directGlyphs;

			if (!owner || owner.matches('img, svg, input, select, textarea, button, script, style'))
				return;

			directMedia = networkMedia(owner);
			if (!directMedia && owner.matches('.ifacebox'))
				directMedia = owner.querySelector(':scope > .ifacebox-body > img[data-vwrt-network-icon], :scope > .ifacebox-body > svg[data-vwrt-network-icon]');
			directGlyphs = Array.from(owner.querySelectorAll(':scope > .vwrt-network-glyph'));

			if (directMedia) {
				directGlyphs.forEach(function(item) {
					item.remove();
				});
				return;
			}

			glyph = directGlyphs[0];
			directGlyphs.slice(1).forEach(function(item) {
				item.remove();
			});
			if (!glyph) {
				glyph = document.createElement('img');
				glyph.className = 'vwrt-network-glyph';
				glyph.setAttribute('aria-hidden', 'true');
				owner.insertBefore(glyph, owner.firstChild);
			}

			applyNetworkMeta(glyph, meta);
			glyph.setAttribute('src', NETWORK_ICON_BASE + iconFile(meta.type));
			}

	function overviewPortCard(card) {
		return Boolean(
			card &&
			card.matches &&
			card.matches('.ifacebox') &&
			!card.closest('.network-status-table') &&
			/(^|\s)(admin\/)?status(?:\/overview)?(\s|$)/.test(getPathText())
		);
	}

	function directNodeText(node) {
		var text = '';

		Array.prototype.forEach.call(node && node.childNodes || [], function(child) {
			if (child.nodeType === 3)
				text += child.textContent;
			else if (child.nodeType === 1 && child.tagName === 'BR')
				text += '\n';
		});

		return text.trim();
	}

	function formatLinkSpeed(speed) {
		var value = Number(speed);

		if (!Number.isFinite(value) || value <= 0)
			return null;
		if (value >= 1000) {
			value /= 1000;
			return {
				value: Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, ''),
				unit: 'GbE'
			};
		}

		return { value: String(Math.round(value)), unit: 'MbE' };
	}

	function renderPortLinkSpeed(status, speed, formatted) {
		var current = status.querySelector(':scope > .vwrt-port-link-speed');
		var value;
		var unit;

		if (!current) {
			current = document.createElement('span');
			current.className = 'vwrt-port-link-speed';
			status.appendChild(current);
		}

		if (current.getAttribute('data-vwrt-speed') === speed)
			return;

		current.replaceChildren();
		value = document.createElement('strong');
		unit = document.createElement('small');
		value.textContent = formatted.value;
		unit.textContent = formatted.unit;
		current.append(value, unit);
		current.setAttribute('data-vwrt-speed', speed);
	}

	function nativePortSpeed(status) {
		var text = Array.prototype.filter.call(status.childNodes, function(child) {
			return child.nodeType === 3 || (child.nodeType === 1 && !child.matches('img, .vwrt-port-link-state, .vwrt-port-link-speed'));
		}).map(function(child) {
			return child.textContent;
		}).join(' ').replace(/\s+/g, ' ').trim();
		var match = text.match(/^([\d.]+)\s*(.*)$/);

		return match ? { value: match[1], unit: match[2] } : null;
	}

	function portIsLinked(card) {
		return card.getAttribute('data-vwrt-link-state') === 'connected';
	}

	function updatePortLinkSpeed(card, network) {
		var name = card.querySelector(':scope > .ifacebox-head:not(.cbi-tooltip-container)');
		var status = card.querySelector(':scope > .vwrt-port-status-primary');

		if (!name || !status || !network || typeof network.getDevice !== 'function')
			return;

		Promise.resolve(network.getDevice(name.textContent.trim())).then(function(device) {
			var speed;
			var formatted;

			if (!portIsLinked(card) || !device || typeof device.getSpeed !== 'function')
				return;

			speed = device.getSpeed();
			formatted = formatLinkSpeed(speed) || { value: '—', unit: '' };
			renderPortLinkSpeed(status, speed > 0 ? String(speed) : 'unknown', formatted);
		});
	}

	function refreshPortLinkSpeed(card) {
		if (!window.L || typeof window.L.require !== 'function' || card.hasAttribute('data-vwrt-speed-pending'))
			return;

		card.setAttribute('data-vwrt-speed-pending', 'true');
		if (!networkModulePromise)
			networkModulePromise = Promise.resolve(window.L.require('network')).catch(function() { return null; });

		networkModulePromise.then(function(network) {
			if (portIsLinked(card))
				updatePortLinkSpeed(card, network);
		}).finally(function() {
			card.removeAttribute('data-vwrt-speed-pending');
		});
	}

	function enhancePortMembership(card) {
		var membership = card.querySelector(':scope > .ifacebox-head.cbi-tooltip-container');
		var text;
		var role;

		if (!membership)
			return;

		text = String(membership.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
		role = /(^|\W)wan(?:_6)?(\W|$)|wwan|互联网|外网/.test(text) ? 'wan' :
			/(^|\W)lan(\W|$)|内网|局域网/.test(text) ? 'lan' : 'neutral';
		membership.classList.add('vwrt-port-network-membership');
		membership.setAttribute('data-vwrt-network-role', role);
	}

	function enhancePortTraffic(card) {
		var bodies = card.querySelectorAll(':scope > .ifacebox-body');
		var traffic = bodies[bodies.length - 1];
		var container = traffic && traffic.querySelector(':scope > .cbi-tooltip-container');
		var text;
		var rx;
		var tx;

		if (!container || container.classList.contains('vwrt-port-traffic'))
			return;

		text = directNodeText(container);
		rx = text.match(/[▼▽↓]\s*([^\n]+)/);
		tx = text.match(/[▲△↑]\s*([^\n]+)/);
		if (!rx && !tx)
			return;

		Array.prototype.slice.call(container.childNodes).forEach(function(child) {
			if (child.nodeType === 3 || (child.nodeType === 1 && child.tagName === 'BR'))
				child.remove();
		});

		[
			['rx', rx],
			['tx', tx]
		].forEach(function(entry) {
			var match = entry[1];
			var row;
			var arrow;
			var value;

			if (!match)
				return;
			row = document.createElement('span');
			arrow = document.createElement('span');
			value = document.createElement('span');
			row.className = 'vwrt-port-traffic-row';
			row.setAttribute('data-direction', entry[0]);
			arrow.className = 'vwrt-traffic-arrow';
			arrow.setAttribute('aria-hidden', 'true');
			value.textContent = match[1].trim();
			row.append(arrow, value);
			container.insertBefore(row, container.querySelector(':scope > .cbi-tooltip'));
		});
		container.classList.add('vwrt-port-traffic');
	}

	function enhanceOverviewPortCard(card) {
		var icon;
		var linked;
		var nativeSpeed;
		var status;
		var state;

		if (!overviewPortCard(card))
			return;

		card.classList.add('vwrt-overview-port-card');
		status = Array.prototype.find.call(card.querySelectorAll(':scope > .ifacebox-body'), function(body) {
			return body.querySelector(':scope > img[data-vwrt-network-icon-original*="port_"], :scope > img[src*="port_"]');
		});
		if (status) {
			status.classList.add('vwrt-port-status-primary');
			icon = status.querySelector(':scope > img[data-vwrt-network-icon-original*="port_"], :scope > img[src*="port_"]');
			linked = icon && icon.getAttribute('data-vwrt-icon-state') === 'connected';
			nativeSpeed = linked ? nativePortSpeed(status) : null;
			card.setAttribute('data-vwrt-link-state', linked ? 'connected' : 'disconnected');

			Array.prototype.slice.call(status.childNodes).forEach(function(child) {
				if (child !== icon && !(child.nodeType === 1 && child.matches('.vwrt-port-link-state, .vwrt-port-link-speed')))
					child.remove();
			});

			state = status.querySelector(':scope > .vwrt-port-link-state');
			if (!state) {
				state = document.createElement('span');
				state.className = 'vwrt-port-link-state';
				status.appendChild(state);
			}
			state.textContent = typeof window._ === 'function' ? window._(linked ? 'Connected' : 'Disconnected') : (linked ? 'Connected' : 'Disconnected');
			if (nativeSpeed)
				renderPortLinkSpeed(status, 'native:' + nativeSpeed.value + nativeSpeed.unit, nativeSpeed);
			else if (!status.querySelector(':scope > .vwrt-port-link-speed'))
				renderPortLinkSpeed(status, 'unknown', { value: '—', unit: '' });
		}

		enhancePortTraffic(card);
		enhancePortMembership(card);
		refreshPortLinkSpeed(card);
	}

	function updateReadyClass() {
		if (!document.body)
			return;

		document.body.classList.toggle('vwrt-view-ready', viewReady());
		setPageClasses();
		enhanceLoadingStates(document);
		enhanceStatusPrompts(document);
		enhanceNetworkIcons(document);
		normalizeIndicatorBar();
		enhanceButtonKinds(document);
		enhanceApplyMenus(document);
					enhanceCbiDropdowns(document);
					enhanceModalInlineControls(document);
					enhanceMultiButtonFields(document);
					normalizeRepoKeyTables(document);
					enhancePlaceholderRows(document);
					enhanceStructuredTables(document);
					syncOpenClashTheme(readThemeMode());
		enhanceWrappedInlineControls(document);
		enhanceTabPanelStacks(document);
		if (!dynlistEnhancementDisabled())
			enhanceDynlists(document);
	}

	function normalizeIndicatorBar() {
		var bar = document.querySelector('#vwrt-indicators-bar');
		var indicators;
		var hasRefresh;
		var pendingSource = null;
		var pendingText = '';
		var pendingCount = 0;
		var unsavedChip;
		var unsavedLabel;
		var unsavedTitle;
		var signature;

	if (!bar)
		return;

	pendingCount = Number(bar.getAttribute('data-vwrt-pending-count') || 0);
	indicators = bar.querySelector('#indicators');
	if (!indicators)
		return;

	indicators.querySelectorAll('.vwrt-indicator-icon').forEach(function(icon) {
		if (!icon.closest('.vwrt-indicator-chip'))
			icon.remove();
	});

		hasRefresh = Boolean(bar.querySelector('[data-vwrt-refresh]'));
		unsavedChip = bar.querySelector('.vwrt-unsaved-chip');
		unsavedLabel = bar.getAttribute('data-vwrt-unsaved-label') || 'Unsaved Changes';
		unsavedTitle = bar.getAttribute('data-vwrt-unsaved-title') || unsavedLabel;

		Array.prototype.slice.call(indicators.childNodes).forEach(function(node) {
			var text = (node.textContent || '').replace(/\s+/g, ' ').trim();
			var duplicateRefresh = hasRefresh && /refresh|refreshing|刷新|正在刷新/i.test(text);
			var isPendingText = /unsaved|pending|未保存|待应用|应用更改/i.test(text);

			if (!text)
				return;

			if (isPendingText && !pendingSource) {
				pendingSource = node;
				pendingText = text;
			}

			if (!duplicateRefresh && !isPendingText)
				return;

			if (node.nodeType === 3) {
				node.textContent = '';
				return;
			}

			if (node.nodeType === 1) {
				if (isPendingText) {
					node.classList.add('vwrt-indicator-duplicate-hidden');
					node.setAttribute('aria-hidden', 'true');
					node.setAttribute('data-vwrt-indicator-source', 'pending');
					return;
				}

				node.remove();
			}
		});

		if (!pendingSource && pendingCount > 0)
			pendingText = unsavedLabel + ': ' + pendingCount;

		if (!pendingSource && pendingCount <= 0) {
			indicatorSignature = '';
			if (unsavedChip)
				unsavedChip.remove();
			indicators.querySelectorAll('[data-vwrt-indicator-source="pending"]').forEach(function(node) {
				node.classList.remove('vwrt-indicator-duplicate-hidden');
				node.removeAttribute('aria-hidden');
				node.removeAttribute('data-vwrt-indicator-source');
			});
			return;
		}

		signature = pendingText + '|' + unsavedLabel + '|' + unsavedTitle;
		if (signature === indicatorSignature && unsavedChip)
			return;
		indicatorSignature = signature;

		if (!unsavedChip) {
			var icon;
			var text;

			unsavedChip = document.createElement('button');
			unsavedChip.type = 'button';
			unsavedChip.className = 'vwrt-indicator-chip info vwrt-unsaved-chip';
			unsavedChip.setAttribute('data-vwrt-unsaved', '');
			icon = document.createElement('span');
			icon.className = 'vwrt-indicator-icon';
			icon.setAttribute('aria-hidden', 'true');
			text = document.createElement('span');
			text.className = 'vwrt-indicator-text';
			text.textContent = unsavedLabel;
			unsavedChip.appendChild(icon);
			unsavedChip.appendChild(text);
			bar.insertBefore(unsavedChip, indicators);
		}

		unsavedChip.title = unsavedTitle;
		unsavedChip.setAttribute('data-vwrt-pending-count', String(pendingCount || 1));
		unsavedChip.querySelector('.vwrt-indicator-text').textContent = unsavedLabel;
	}

	function openNativeChanges() {
		var luci = window.L;
		var ui = luci && luci.ui;
		var done;

		if (changesModalOpening)
			return false;

		done = function(ok, error) {
			root.dataset.vwrtChangesState = ok ? 'opened' : 'error';
			if (error)
				root.dataset.vwrtChangesError = String(error && error.message || error).slice(0, 160);
			window.setTimeout(function() {
				changesModalOpening = false;
			}, 450);
		};

		changesModalOpening = true;
		root.dataset.vwrtChangesState = 'opening';

		if (ui && ui.changes && typeof ui.changes.displayChanges === 'function') {
			Promise.resolve().then(function() {
				return ui.changes.displayChanges();
			}).then(function() {
				done(true);
			}).catch(function(err) {
				done(false, err);
			});
			return true;
		}

		if (luci && typeof luci.require === 'function') {
			luci.require('ui').then(function(module) {
				if (module && module.changes && typeof module.changes.displayChanges === 'function')
					return module.changes.displayChanges();
				throw new Error('LuCI changes API unavailable');
			}).then(function() {
				done(true);
			}).catch(function(err) {
				done(false, err);
			});
			return true;
		}

		done(false, new Error('LuCI changes API unavailable'));
		return false;
	}

	function refreshNativeChangesIndicator() {
		var luci = window.L;
		var ui = luci && luci.ui;
		var countChanges = function(changes) {
			var count = 0;
			var config;

			if (!changes || typeof changes !== 'object')
				return 0;

			for (config in changes) {
				if (Object.prototype.hasOwnProperty.call(changes, config) && Array.isArray(changes[config]))
					count += changes[config].length;
			}

			return count;
		};
		var syncCount = function(module, changes) {
			var bar = document.querySelector('#vwrt-indicators-bar');
			var count = countChanges(changes);

			if (module && module.changes)
				module.changes.changes = changes;

			if (bar)
				bar.setAttribute('data-vwrt-pending-count', String(count));

			normalizeIndicatorBar();
			return count;
		};
		var run;

		if (changesIndicatorRefreshing)
			return;

		run = function(module) {
			if (!luci || typeof luci.require !== 'function') {
				if (!module || !module.changes || typeof module.changes.init !== 'function')
					return Promise.resolve(false);
				return Promise.resolve(module.changes.init()).then(function() {
					window.setTimeout(normalizeIndicatorBar, 0);
					return true;
				});
			}

			return luci.require('uci').then(function(uci) {
				if (!uci || typeof uci.changes !== 'function')
					throw new Error('LuCI uci.changes API unavailable');
				return uci.changes();
			}).then(function(changes) {
				syncCount(module, changes);
				return true;
			}).catch(function() {
				if (!module || !module.changes || typeof module.changes.init !== 'function')
					return false;
				return Promise.resolve(module.changes.init()).then(function() {
					window.setTimeout(normalizeIndicatorBar, 0);
					return true;
				});
			});
		};

		changesIndicatorRefreshing = true;

		if (ui && ui.changes) {
			run(ui).catch(function() {}).then(function() {
				changesIndicatorRefreshing = false;
			});
			return;
		}

		if (luci && typeof luci.require === 'function') {
			luci.require('ui').then(run).catch(function() {}).then(function() {
				changesIndicatorRefreshing = false;
			});
			return;
		}

		changesIndicatorRefreshing = false;
	}

	function watchViewReady() {
		if (!document.body || viewObserver)
			return;

			viewObserver = new MutationObserver(function(mutations) {
				mutations.forEach(function(mutation) {
					mutation.addedNodes.forEach(function(node) {
						if (node.nodeType === 1)
							enhanceNetworkIcons(node);
					});
				});

				if (runtimeEnhanceQueued)
					return;

			runtimeEnhanceQueued = true;
			window.setTimeout(function() {
				runtimeEnhanceQueued = false;
				updateReadyClass();
				enhanceButtonKinds(document);
				enhanceApplyMenus(document);
			enhanceCbiDropdowns(document);
			enhanceModalInlineControls(document);
			enhanceMultiButtonFields(document);
			normalizeRepoKeyTables(document);
			enhancePlaceholderRows(document);
			enhanceStructuredTables(document);
			syncOpenClashTheme(readThemeMode());
				enhanceTabPanelStacks(document);
				if (!dynlistEnhancementDisabled())
					enhanceDynlists(document);
			}, 0);
		});
		viewObserver.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	function motionProxyFromEvent(ev) {
		var item;
		var modalSave;
		var rect;

		if (!ev.target || !ev.target.closest)
			return null;

		modalSave = ev.target.closest(
			'#modal_overlay .modal :is(.cbi-button-save, .cbi-button-positive, button, .btn):not([disabled])'
		);
		if (modalSave && /^(?:save|保存)$/i.test(buttonVisibleLabel(modalSave)))
			return modalSave;

		item = ev.target.closest('.cbi-dynlist > .item, .cbi-dynlist-item');
		if (item && typeof ev.clientX === 'number') {
			rect = item.getBoundingClientRect();
			if (ev.clientX >= rect.right - 44)
				return item.querySelector(':scope > .vwrt-dynlist-delete-visual');
		}

		return null;
	}

	function targetFromEvent(ev) {
		return motionProxyFromEvent(ev) || targetFromSelector(ev, PRESS_SELECTOR);
	}

	function targetFromSelector(ev, selector) {
		var target;
		var hover = selector === HOVER_SELECTOR;

		if (!ev.target || !ev.target.closest)
			return null;

		target = ev.target.closest(selector);
		if (target && easyTierStatusPage() && target.closest('#maincontent'))
			return null;

		if (!hover && target && target.matches && target.matches('.cbi-dropdown.cbi-button-apply.vwrt-apply-split-ready, .cbi-dropdown.vwrt-modal-apply-combo, .vwrt-apply-combo'))
			return null;

		return target;
	}

	function isModalSaveMotionTarget(target) {
		return Boolean(
			target &&
			target.closest &&
			target.closest('#modal_overlay .modal') &&
			/^(?:save|保存)$/i.test(buttonVisibleLabel(target))
		);
	}

	function pointerMovedInsideTarget(ev, target) {
		return ev.relatedTarget && target.contains(ev.relatedTarget);
	}

	function animatePressIn(ev) {
		var target = targetFromEvent(ev);

		if (!target || !motionAllowed())
			return;

		gsap.to(target, {
			scale: 1,
			y: 1,
			duration: 0.14,
			ease: 'power3.out',
			overwrite: 'auto'
		});
	}

	function animatePressOut(ev) {
		var target = targetFromEvent(ev);

		if (!target || !motionAllowed())
			return;

		gsap.to(target, {
			scale: 1,
			y: 0,
			duration: 0.22,
			ease: 'power3.out',
			overwrite: 'auto',
			clearProps: 'transform'
		});
	}

	function animateHoverIn(ev) {
		var target = motionProxyFromEvent(ev) || targetFromSelector(ev, HOVER_SELECTOR);

		if (!target || !motionAllowed() || pointerMovedInsideTarget(ev, target))
			return;

		gsap.to(target, {
			scale: 1,
			y: -1,
			duration: 0.2,
			ease: 'power3.out',
			overwrite: 'auto'
		});
	}

	function animateHoverOut(ev) {
		var target = motionProxyFromEvent(ev) || targetFromSelector(ev, HOVER_SELECTOR);

		if (!target || !motionAllowed() || pointerMovedInsideTarget(ev, target))
			return;

		gsap.to(target, {
			scale: 1,
			y: 0,
			duration: 0.22,
			ease: 'power3.out',
			overwrite: 'auto',
			clearProps: 'transform'
		});
	}

	function dynlistDeleteVisualAtPoint(ev) {
		var hit;
		var item;
		var rect;

		if (typeof ev.clientX !== 'number' || typeof ev.clientY !== 'number')
			return null;

		hit = document.elementFromPoint(ev.clientX, ev.clientY);
		item = hit && hit.closest ? hit.closest('.cbi-dynlist > .item, .cbi-dynlist-item') : null;
		if (!item)
			return null;

		rect = item.getBoundingClientRect();
		if (ev.clientX < rect.right - 44)
			return null;

		return item.querySelector(':scope > .vwrt-dynlist-delete-visual');
	}

	function updateDynlistDeleteMotion(ev) {
		var next;
		var previous;

		next = dynlistDeleteVisualAtPoint(ev);
		if (next === activeDynlistDeleteMotion)
			return;

		previous = activeDynlistDeleteMotion;
		activeDynlistDeleteMotion = next;
		if (previous)
			previous.classList.remove('vwrt-delete-hover');
		if (next)
			next.classList.add('vwrt-delete-hover');

		if (!motionAllowed())
			return;

		if (previous && previous.isConnected) {
			gsap.to(previous, {
				scale: 1,
				y: 0,
				duration: 0.32,
				ease: 'power3.out',
				overwrite: 'auto',
				clearProps: 'transform'
			});
		}

		if (next) {
			gsap.to(next, {
				scale: 1.018,
				y: -1,
				duration: 0.42,
				ease: 'elastic.out(1, 0.62)',
				overwrite: 'auto'
			});
		}
	}

	function animateEntrance() {
		var sidebar = document.querySelector('#vwrt-sidebar');
		var topbar = document.querySelector('.vwrt-mobile-topbar');
		var content = gsap.utils.toArray('#maincontent > :not(script):not(style)').slice(0, 12);
		var targets = [sidebar, topbar].filter(Boolean).concat(content);

		if (isOpenClashConfigPage()) {
			content = content.filter(function(node) {
				return !node.matches('form, .cbi-map');
			});
			targets = [sidebar, topbar].filter(Boolean).concat(content);
		}

		if (!targets.length || !motionAllowed())
			return;

		gsap.fromTo(targets, {
			autoAlpha: 0,
			y: 10,
			scale: 0.992
		}, {
			autoAlpha: 1,
			y: 0,
			scale: 1,
			duration: 0.58,
			stagger: 0.035,
			ease: 'power3.out',
			clearProps: 'transform,visibility,opacity'
		});
	}

	function animatePanel(panel) {
		if (!panel || panel.hasAttribute('hidden') || !motionAllowed())
			return;

		gsap.killTweensOf(panel);
		gsap.fromTo(panel, {
			autoAlpha: 0,
			y: 8,
			scale: 0.97,
			transformOrigin: '50% 100%'
		}, {
			autoAlpha: 1,
			y: 0,
			scale: 1,
			duration: 0.42,
			ease: 'back.out(1.45)',
			overwrite: 'auto',
			clearProps: 'transform,visibility,opacity'
		});
	}

	function closeApplyMenus(except) {
		document.querySelectorAll('.cbi-dropdown.vwrt-apply-combo.vwrt-apply-menu-open').forEach(function(menu) {
			if (menu !== except) {
				menu.classList.remove('vwrt-apply-menu-open');
				menu.setAttribute('aria-expanded', 'false');
			}
		});
	}

	function toggleApplyMenu(menu) {
		if (!menu)
			return;

		var next = !menu.classList.contains('vwrt-apply-menu-open');
		closeApplyMenus(menu);
		menu.classList.toggle('vwrt-apply-menu-open', next);
		menu.setAttribute('aria-expanded', next ? 'true' : 'false');
	}

	function toggleNativeComboDropdown(menu) {
		var instance;

		if (!menu || !window.L || !window.L.dom || typeof window.L.dom.findClassInstance !== 'function')
			return false;

		instance = window.L.dom.findClassInstance(menu);
		if (!instance)
			return false;

		if (menu.hasAttribute('open') && typeof instance.closeDropdown === 'function')
			instance.closeDropdown(menu);
		else if (!menu.hasAttribute('open') && typeof instance.openDropdown === 'function')
			instance.openDropdown(menu);
		else
			return false;

		normalizeApplyArrowOwner(menu, false);
		return true;
	}

	function setApplyMenuValue(menu, item) {
		var value;
		var input;

		if (!menu || !item)
			return;

		value = item.getAttribute('data-value');
		input = menu.querySelector('input[type="hidden"]');

		menu.querySelectorAll('ul > li').forEach(function(entry) {
			entry.removeAttribute('selected');
			entry.removeAttribute('display');
			entry.classList.remove('selected');
		});

		item.setAttribute('display', '0');

		if (input && value != null)
			input.value = value;

		menu.classList.remove('vwrt-apply-split-ready');
		syncApplyMenu(menu);
	}

	function selectedApplyLabel(menu) {
		var selected;

		if (!menu)
			return '';

		selected = menu.querySelector(
			':scope > ul:not(.preview) > li[selected], ' +
			':scope > ul:not(.preview) > li[display="0"], ' +
			':scope > ul:not(.preview) > li.selected'
		) || menu.querySelector(':scope > ul:not(.preview) > li');

		return selected ? selected.textContent.replace(/\s+/g, ' ').trim() : '';
	}

	function selectedApplyMode(menu) {
		var selected;
		var input;
		var value;

		if (!menu)
			return 'checked';

		selected = menu.querySelector(
			':scope > ul:not(.preview) > li[selected], ' +
			':scope > ul:not(.preview) > li[display="0"], ' +
			':scope > ul:not(.preview) > li.selected'
		);
		input = menu.querySelector(':scope input[type="hidden"]');
		value = selected ? selected.getAttribute('data-value') : (input ? input.value : '0');

		return String(value) === '1' ? 'force' : 'checked';
	}

	function isApplyChoiceDropdown(menu) {
		var values;

		if (!menu || !menu.matches || !menu.matches('.cbi-dropdown'))
			return false;

		values = Array.prototype.map.call(menu.querySelectorAll(':scope > ul:not(.preview) > li[data-value]'), function(item) {
			return item.getAttribute('data-value');
		});

		return values.indexOf('0') > -1 && values.indexOf('1') > -1;
	}

	function updateApplyLabelWidth(menu) {
		var items;
		var style;
		var current;
		var canvas;
		var context;
		var width;

		if (!menu)
			return;

		items = Array.prototype.map.call(menu.querySelectorAll(':scope > ul:not(.preview) > li'), function(item) {
			return String(item.textContent || '').replace(/\s+/g, ' ').trim();
		}).filter(Boolean);
		current = menu.querySelector(':scope > .vwrt-apply-current');
		style = window.getComputedStyle(current || menu);
		canvas = document.createElement('canvas');
		context = canvas.getContext('2d');

		if (!context)
			return;

		context.font = [
			style.fontWeight || '700',
			style.fontSize || '14px',
			style.fontFamily || 'sans-serif'
		].join(' ');
		width = items.reduce(function(max, item) {
			return Math.max(max, context.measureText(item).width);
		}, 0);
		width = Math.max(88, Math.min(128, Math.ceil(width + 12)));
		menu.style.setProperty('--vwrt-apply-label-width', width + 'px');
	}

	function normalizeApplyArrowOwner(menu, preferOpen) {
		var candidates;
		var owner;

		if (!menu)
			return null;

		candidates = Array.prototype.slice.call(menu.querySelectorAll(
			':scope > span.more, :scope > span.open, :scope > .more, :scope > .open, ' +
			':scope > .cbi-dropdown-arrow, :scope > .dropdown-arrow'
		));
		candidates.forEach(function(candidate) {
			candidate.classList.remove('vwrt-apply-arrow-owner', 'vwrt-apply-arrow-hit');
			candidate.setAttribute('aria-hidden', 'true');
		});

		owner = preferOpen
			? candidates.find(function(candidate) { return candidate.matches('span.open, .open'); })
			: candidates.find(function(candidate) { return candidate.matches('span.more, .more'); });
		owner = owner || candidates[0] || null;

		if (owner) {
			owner.classList.add('vwrt-apply-arrow-owner', 'vwrt-apply-arrow-hit');
			owner.setAttribute('aria-hidden', 'false');
		}

		return owner;
	}

	function syncApplyMenu(menu) {
		var current;
		var label;

		if (!menu)
			return;

		current = menu.querySelector(':scope > .vwrt-apply-current');
		if (!current) {
			current = document.createElement('span');
			current.className = 'vwrt-apply-current';
			current.setAttribute('aria-hidden', 'true');
			menu.insertBefore(current, menu.firstChild);
		}

		menu.querySelectorAll(':scope > .vwrt-split-motion-surface').forEach(function(node) {
			node.remove();
		});
		normalizeApplyArrowOwner(menu, false);

		label = selectedApplyLabel(menu) || 'Save & Apply';
		if (current.textContent !== label)
			current.textContent = label;

		updateApplyLabelWidth(menu);
		menu.classList.add('vwrt-apply-split-ready', 'vwrt-apply-combo');
		menu.setAttribute('data-vwrt-apply-mode', selectedApplyMode(menu));
		menu.setAttribute('aria-haspopup', 'menu');
		menu.setAttribute('aria-expanded', menu.classList.contains('vwrt-apply-menu-open') ? 'true' : 'false');
	}

	function syncModalApplyMenu(menu) {
		var current;
		var label;

		if (!menu)
			return;

		current = menu.querySelector(':scope > .vwrt-apply-current');
		if (!current) {
			current = document.createElement('span');
			current.className = 'vwrt-apply-current';
			current.setAttribute('aria-hidden', 'true');
			menu.insertBefore(current, menu.firstChild);
		}

		menu.querySelectorAll(':scope > .vwrt-split-motion-surface').forEach(function(node) {
			node.remove();
		});
		normalizeApplyArrowOwner(menu, false);

		label = selectedApplyLabel(menu) || 'Save & Apply';
		if (current.textContent !== label)
			current.textContent = label;

		updateApplyLabelWidth(menu);
		menu.classList.add('vwrt-modal-apply-combo', 'vwrt-apply-combo');
		menu.setAttribute('data-vwrt-apply-mode', selectedApplyMode(menu));
		menu.setAttribute('aria-haspopup', 'menu');
		menu.setAttribute('aria-expanded', menu.hasAttribute('open') ? 'true' : 'false');
	}

	function setApplyCurrentLabel(menu, label) {
		var current;

		if (!menu || !label)
			return;

		current = menu.querySelector(':scope > .vwrt-apply-current');
		if (current)
			current.textContent = String(label).replace(/\s+/g, ' ').trim();
	}

	function primeApplyComboLoading(menu) {
		if (!menu)
			return;

		menu.classList.add('vwrt-button-local-loading');
		menu.classList.remove('vwrt-apply-menu-open');
		menu.setAttribute('aria-expanded', 'false');
		menu.style.removeProperty('transform');

		if (window.gsap && typeof window.gsap.set === 'function')
			window.gsap.set(menu, { clearProps: 'transform' });
	}

	function enhanceApplyMenus(rootNode) {
		var scope = rootNode && rootNode.querySelectorAll ? rootNode : document;
		scope.querySelectorAll('.cbi-page-actions .cbi-dropdown.cbi-button-apply, .cbi-dropdown.cbi-button-apply.vwrt-apply-combo').forEach(function(menu) {
			syncApplyMenu(menu);
			if (menu.dataset.vwrtApplyBound !== '1') {
				menu.addEventListener('cbi-dropdown-change', function() {
					window.setTimeout(function() {
						syncApplyMenu(menu);
					}, 0);
				});
				menu.dataset.vwrtApplyBound = '1';
			}
		});
		scope.querySelectorAll('#modal_overlay .cbi-dropdown').forEach(function(menu) {
			if (isApplyChoiceDropdown(menu)) {
				syncModalApplyMenu(menu);
				if (menu.dataset.vwrtModalApplyBound !== '1') {
					menu.addEventListener('cbi-dropdown-change', function() {
						window.setTimeout(function() {
							syncModalApplyMenu(menu);
						}, 0);
					});
					menu.dataset.vwrtModalApplyBound = '1';
				}
			}
		});
	}

	function selectedCbiDropdownItem(dropdown) {
		var selected;
		var hidden;
		var hiddenValue;
		var byValue;
		var items;

		if (!dropdown)
			return null;

		hidden = dropdown.querySelector(':scope > div input[type="hidden"], :scope input[type="hidden"]');
		hiddenValue = hidden ? hidden.value : null;
		items = Array.prototype.filter.call(dropdown.querySelectorAll(':scope > ul:not(.preview) > li'), function(item) {
			var value = item.getAttribute('data-value') || '';
			return value !== '{{value}}' && !item.hasAttribute('placeholder');
		});

		if (hiddenValue != null) {
			byValue = items.find(function(item) {
				return (item.getAttribute('data-value') || '') === hiddenValue;
			});

			if (byValue)
				return byValue;
		}

		selected = dropdown.querySelector(':scope > ul:not(.preview) > li[selected], :scope > ul:not(.preview) > li[display="0"], :scope > ul:not(.preview) > li.selected') ||
			items[0];

		return selected || null;
	}

	function cloneCbiDropdownVisual(item) {
		var fragment = document.createDocumentFragment();
		var blocked = 'input, select, textarea, button, form, script, style, template';
		var primary = item && item.querySelector(':scope > .hide-open');
		var sourceNodes = primary ? [primary] : Array.prototype.slice.call(item ? item.childNodes : []);
		var richVisual;
		var cleanNode = function(node) {
			var clone;

			if (node.nodeType === 3)
				return document.createTextNode(node.nodeValue || '');

			if (node.nodeType !== 1 || node.matches(blocked))
				return null;

			clone = node.cloneNode(true);
			clone.querySelectorAll(blocked).forEach(function(blockedNode) {
				blockedNode.remove();
			});
			clone.querySelectorAll('.hide-close, .description, .cbi-value-description, [data-description]').forEach(function(description) {
				description.remove();
			});
			[clone].concat(Array.prototype.slice.call(clone.querySelectorAll('*'))).forEach(function(element) {
				Array.prototype.slice.call(element.attributes || []).forEach(function(attribute) {
					if (/^(?:id|name|tabindex|selected|display|data-value|value|checked|disabled|open|aria-expanded|aria-hidden)$/i.test(attribute.name) ||
						/^on/i.test(attribute.name)) {
						element.removeAttribute(attribute.name);
					}
				});
			});
			return clone;
			};

		if (item) {
			richVisual = Array.prototype.find.call(item.querySelectorAll('img, svg, .ifacebadge'), function(node) {
				return !node.closest(
					'ul.preview, template, [hidden], ' +
					'.description, .cbi-value-description, [data-description]'
				);
			});
		}

		if (richVisual && !sourceNodes.some(function(node) {
			return node === richVisual ||
				(node.nodeType === 1 && node.contains(richVisual));
		})) {
			var icon = cleanNode(richVisual);
			if (icon) {
				var iconWrap = document.createElement('span');
				iconWrap.className = 'vwrt-cbi-dropdown-current-icon';
				iconWrap.setAttribute('role', 'presentation');
				iconWrap.appendChild(icon);
				fragment.appendChild(iconWrap);
			}
		}

		sourceNodes.forEach(function(node) {
			var clean = cleanNode(node);
			if (clean)
				fragment.appendChild(clean);
		});

		return fragment;
	}

	function syncCbiDropdown(dropdown) {
		var label;
		var selected;
		var signature;
		var open;
		var bindSync;

		if (!dropdown || dropdown.matches('.btn, .cbi-button'))
			return;

		label = dropdown.querySelector(':scope > .vwrt-cbi-dropdown-current');
		if (!label) {
			label = document.createElement('span');
			label.className = 'vwrt-cbi-dropdown-current';
			label.setAttribute('aria-hidden', 'true');
			dropdown.insertBefore(label, dropdown.firstChild);
		}

		selected = selectedCbiDropdownItem(dropdown);
		signature = selected
			? (selected.getAttribute('data-value') || '') + '|' + selected.innerHTML
			: '';
		if (selected && label.dataset.vwrtCurrentSignature !== signature) {
			label.replaceChildren(cloneCbiDropdownVisual(selected));
			label.dataset.vwrtCurrentSignature = signature;
		}

		open = dropdown.matches('[open], .open, .cbi-dropdown-open');
		dropdown.classList.toggle('vwrt-cbi-dropdown-open', open);
		markCbiDropdownHosts(dropdown, open);
		dropdown.classList.add('vwrt-cbi-dropdown-ready');
		dropdown.setAttribute('aria-haspopup', 'listbox');
		dropdown.setAttribute('aria-expanded', open ? 'true' : 'false');

		if (dropdown.dataset.vwrtCbiSyncBound === '1')
			return;

		bindSync = function() {
			window.setTimeout(function() {
				syncCbiDropdown(dropdown);
			}, 0);
		};

		dropdown.addEventListener('cbi-dropdown-open', bindSync);
		dropdown.addEventListener('cbi-dropdown-close', bindSync);
		dropdown.addEventListener('cbi-dropdown-change', bindSync);
		dropdown.dataset.vwrtCbiSyncBound = '1';
	}

	function markCbiDropdownHosts(dropdown, open) {
		var node;
		var hostSelector = [
			'.cbi-value',
			'.cbi-value-field',
			'.cbi-section',
			'.cbi-section-node',
			'.cbi-tblsection',
			'.cbi-section-table',
			'.cbi-section-table-row',
			'.cbi-section-table-cell',
			'.table',
			'.tr',
			'.td',
			'table',
			'tbody',
			'tr',
			'td',
			'th'
		].join(',');

		if (!dropdown || !dropdown.parentElement)
			return;

		node = dropdown.parentElement;
		while (node && node !== document.body && node !== document.documentElement) {
			if (node.matches && node.matches(hostSelector)) {
				node.classList.add('vwrt-dropdown-host');
				node.classList.toggle('vwrt-dropdown-open-host', !!open);
			}
			node = node.parentElement;
		}
	}

	function enhanceCbiDropdowns(rootNode) {
		var scope = rootNode && rootNode.querySelectorAll ? rootNode : document;
		scope.querySelectorAll('.cbi-dropdown:not(.btn):not(.cbi-button)').forEach(syncCbiDropdown);
		scope.querySelectorAll('.cbi-dropdown.cbi-button-action').forEach(syncActionDropdown);
	}

	function selectedActionDropdownLabel(dropdown) {
		var selected;

		if (!dropdown)
			return '';

		selected = dropdown.querySelector(':scope > ul > li[selected], :scope > ul > li[display="0"], :scope > ul > li.selected') ||
			dropdown.querySelector(':scope > ul > li');

		return selected ? selected.textContent.replace(/\s+/g, ' ').trim() : '';
	}

	function syncActionDropdown(dropdown) {
		var label;
		var text;

		if (!dropdown || !dropdown.matches('.cbi-dropdown.cbi-button-action'))
			return;

		label = dropdown.querySelector(':scope > .vwrt-action-dropdown-current');
		if (!label) {
			label = document.createElement('span');
			label.className = 'vwrt-action-dropdown-current';
			label.setAttribute('aria-hidden', 'true');
			dropdown.insertBefore(label, dropdown.firstChild);
		}

		text = selectedActionDropdownLabel(dropdown);
		if (text && label.textContent !== text)
			label.textContent = text;

		dropdown.classList.add('vwrt-action-dropdown-ready');
		dropdown.setAttribute('aria-haspopup', 'menu');
		dropdown.setAttribute('aria-expanded', dropdown.classList.contains('vwrt-action-dropdown-open') ? 'true' : 'false');
	}

	function setActionDropdownOpen(dropdown, open) {
		if (!dropdown || !dropdown.matches('.cbi-dropdown.cbi-button-action'))
			return;

		if (!open) {
			dropdown.removeAttribute('open');
			dropdown.classList.remove('open', 'cbi-dropdown-open');
		}

		dropdown.classList.toggle('vwrt-action-dropdown-open', open);
		dropdown.setAttribute('aria-expanded', open ? 'true' : 'false');
		syncActionDropdown(dropdown);
	}

	function closeActionDropdowns(except) {
		document.querySelectorAll('.cbi-dropdown.cbi-button-action.vwrt-action-dropdown-open, .cbi-dropdown.cbi-button-action[aria-expanded="true"]').forEach(function(dropdown) {
			if (dropdown !== except)
				setActionDropdownOpen(dropdown, false);
		});
	}

	function toggleActionDropdown(dropdown) {
		var open;

		if (!dropdown)
			return;

		open = dropdown.matches('[open], .open, .cbi-dropdown-open, .vwrt-action-dropdown-open, [aria-expanded="true"]');
		closeActionDropdowns(dropdown);
		setActionDropdownOpen(dropdown, !open);
	}

	function dynlistValueText(item) {
		var input;
		var text;

		if (!item)
			return '';

		input = item.querySelector('input, select, textarea');
		if (input && (input.value || input.getAttribute('value')))
			return input.value || input.getAttribute('value');

		text = Array.prototype.map.call(item.childNodes, function(node) {
			if (node.nodeType === 3)
				return node.textContent;
			if (node.nodeType !== 1)
				return '';
			if (node.matches('.vwrt-dynlist-item-content, .vwrt-dynlist-remove-button, .vwrt-dynlist-remove-visual, button, .cbi-button, .btn'))
				return '';
			if (node.matches('input, select, textarea'))
				return node.value || node.getAttribute('value') || '';
			return node.textContent || '';
		}).filter(Boolean);

		return (text[0] || '').replace(/\s+/g, ' ').trim();
	}

	function enhanceDynlists(rootNode) {
		var scope = rootNode && rootNode.querySelectorAll ? rootNode : document;

		scope.querySelectorAll('.cbi-dynlist').forEach(function(list) {
			list.classList.add('vwrt-dynlist-ready');
			list.querySelectorAll(':scope > .vwrt-dynlist-remove-button, :scope > .vwrt-dynlist-remove-visual').forEach(function(node) {
				node.remove();
			});
			list.querySelectorAll(':scope > div.item, :scope > .cbi-dynlist-item').forEach(function(item) {
				var visual;

				item.classList.add('vwrt-dynlist-native-item');
				item.querySelectorAll(':scope > .vwrt-dynlist-item-content, :scope > .vwrt-dynlist-remove-button, :scope > .vwrt-dynlist-remove-visual').forEach(function(node) {
					node.remove();
				});
				item.setAttribute('data-vwrt-dynlist-text', dynlistValueText(item));

				visual = item.querySelector(':scope > .vwrt-dynlist-delete-visual');
				if (!visual) {
					visual = document.createElement('span');
					visual.className = 'vwrt-dynlist-delete-visual';
					visual.setAttribute('aria-hidden', 'true');
					item.appendChild(visual);
				}
			});
		});
	}

	function enhanceTabPanelStacks(rootNode) {
		var scope = rootNode && rootNode.querySelectorAll ? rootNode : document;

		if (easyTierStatusPage()) {
			cleanupEasyTierNativeStatus(scope);
			return;
		}

		scope.querySelectorAll('#maincontent .cbi-tabmenu').forEach(function(menu) {
			var tabNames = Array.prototype.map.call(menu.querySelectorAll(':scope > li[data-tab]'), function(tab) {
				return tab.getAttribute('data-tab');
			}).filter(Boolean);
			var candidates;
			var stack;

			if (tabNames.length < 2)
				return;

			candidates = Array.prototype.filter.call(document.querySelectorAll('#maincontent [data-tab]:not(li)'), function(panel) {
				return tabNames.indexOf(panel.getAttribute('data-tab')) !== -1;
			});

			if (candidates.length < 2 || !candidates.some(function(panel) {
				return panel.getAttribute('data-tab-active') === 'true';
			}))
				return;

			stack = candidates[0].parentElement;
			if (!stack || !candidates.every(function(panel) {
				return panel.parentElement === stack;
			}))
				return;

			stack.classList.add('vwrt-tab-panel-stack');
			menu.classList.add('vwrt-tab-panel-menu');
			stack.style.setProperty('--vwrt-tab-panel-menu-bottom', Math.round(menu.getBoundingClientRect().bottom) + 'px');
		});
	}

	function buttonVisibleLabel(button) {
		return ((button && (button.value || button.textContent)) || '')
			.replace(/\s+/g, ' ')
			.trim();
	}

	function iconOnlyButton(button, label) {
		var text = label == null ? buttonVisibleLabel(button) : label;

		if (!text)
			return true;

		if (/^(?:\+|＋|×|✕|✖|x|X|…|\.{3}|-|−)$/.test(text))
			return true;

		if (text.length <= 2 && !/[0-9A-Za-z\u4e00-\u9fff]/.test(text))
			return true;

		return false;
	}

	function enhanceButtonSemantic(button, label) {
		if (!button || button.classList.contains('vwrt-indicator-chip'))
			return;

		button.classList.remove('vwrt-button-action', 'vwrt-button-danger', 'vwrt-button-neutral', 'vwrt-button-stop');

		if (/(?:delete|remove|kill|terminate|删除|移除|终止|杀死)/i.test(label)) {
			button.classList.add('vwrt-button-danger');
			return;
		}

		if (/^(?:stop|停止|停用)$/i.test(label)) {
			button.classList.add('vwrt-button-stop');
			return;
		}

		if (/^(?:reset|重置|复位)$/i.test(label) || /(?:set to default|设为默认|默认)/i.test(label)) {
			button.classList.add('vwrt-button-neutral');
			return;
		}

		if (/(?:restart|edit|switch|update|refresh|reload|重启|重新启动|编辑|切换|更新|刷新)/i.test(label) && !/(?:delete|remove|删除|移除)/i.test(label))
			button.classList.add('vwrt-button-action');
	}

	function openClashNativeButton(button) {
		return Boolean(
			button &&
			document.body &&
			document.body.classList.contains('vwrt-page-openclash') &&
			button.closest &&
			button.closest('#maincontent')
		);
	}

	function enhanceButtonKinds(rootNode) {
		var scope = rootNode && rootNode.querySelectorAll ? rootNode : document;
		var selector = [
			'#maincontent .cbi-button',
			'#maincontent .btn',
			'#maincontent button',
			'#maincontent input[type="submit"]',
			'#maincontent input[type="button"]',
			'#maincontent input[type="reset"]',
			'#modal_overlay .cbi-button',
			'#modal_overlay .btn',
			'#modal_overlay button',
			'#modal_overlay input[type="submit"]',
			'#modal_overlay input[type="button"]',
			'#modal_overlay input[type="reset"]',
			'.vwrt-auth-card .cbi-button',
			'.vwrt-auth-card .btn',
			'.vwrt-auth-card button',
			'.vwrt-auth-card input[type="submit"]',
			'.vwrt-auth-card input[type="button"]',
			'.vwrt-auth-card input[type="reset"]'
		].join(', ');
		var choiceWrapper = function(button) {
			return Boolean(
				button &&
				button.matches &&
				button.matches('label, .checkbox, .radio, .cbi-checkbox, .cbi-radio') &&
				button.querySelector &&
				button.querySelector('input[type="checkbox"], input[type="radio"]')
			);
		};

		if (easyTierStatusPage()) {
			cleanupEasyTierNativeStatus(scope);
			return;
		}

		scope.querySelectorAll(selector).forEach(function(button) {
			var label;
			var iconOnly;
			var addVariant;

			if (!button || button.closest('.cbi-dropdown > ul'))
				return;

			if (openClashNativeButton(button))
				return;

			if (choiceWrapper(button)) {
				button.classList.remove(
					'vwrt-button-action',
					'vwrt-button-danger',
					'vwrt-button-neutral',
					'vwrt-button-stop',
					'vwrt-button-icon-only',
					'vwrt-button-has-text',
					'vwrt-button-add-icon',
					'vwrt-button-add-text'
				);
				return;
			}

			label = buttonVisibleLabel(button);
			enhanceButtonSemantic(button, label);
			iconOnly = iconOnlyButton(button, label);
			addVariant = button.matches('.cbi-button-add, .btn.cbi-button-add');

			button.classList.toggle('vwrt-button-icon-only', iconOnly);
			button.classList.toggle('vwrt-button-has-text', Boolean(label) && !iconOnly);
			button.classList.toggle('vwrt-button-add-icon', addVariant && iconOnly);
			button.classList.toggle('vwrt-button-add-text', addVariant && Boolean(label) && !iconOnly);
		});
	}

	function enhanceModalInlineControls(rootNode) {
		var scope = rootNode && rootNode.querySelectorAll ? rootNode : document;

		scope.querySelectorAll('#modal_overlay .cbi-value-field, .cbi-modal .cbi-value-field, [role="dialog"] .cbi-value-field').forEach(function(field) {
			var inlineChildren = Array.prototype.filter.call(field.children || [], function(node) {
				return node.matches && node.matches('input, textarea, select, .cbi-input, .cbi-dropdown, .cbi-button, .btn, button, .cbi-dynlist, .control-group, .controls, .cbi-input-group');
			});
			var buttons = inlineChildren.filter(function(node) {
				return node.matches('button, .cbi-button, .btn, input[type="submit"], input[type="button"], input[type="reset"]');
			});
			var controls = inlineChildren.filter(function(node) {
				return node.matches('input, textarea, select, .cbi-input, .cbi-dropdown, .cbi-dynlist, .control-group, .controls, .cbi-input-group');
			});

			if (buttons.length && controls.length)
				field.classList.add('vwrt-modal-inline-controls');

			inlineChildren.forEach(function(node) {
				if (node.matches('.control-group, .controls, .cbi-input-group, .add-item, .cbi-dynlist-row'))
					node.classList.add('vwrt-modal-inline-group');
			});
		});
	}

	function enhanceMultiButtonFields(rootNode) {
		var scope = rootNode && rootNode.querySelectorAll ? rootNode : document;

		if (easyTierStatusPage()) {
			cleanupEasyTierNativeStatus(scope);
			return;
		}

		if (document.body && document.body.classList.contains('vwrt-page-openclash'))
			return;

		scope.querySelectorAll('#maincontent .cbi-value-field').forEach(function(field) {
			var buttons = Array.prototype.filter.call(field.querySelectorAll('button, .cbi-button, .btn, input[type="submit"], input[type="button"], input[type="reset"]'), function(node) {
				var computed = window.getComputedStyle(node);
				var box = node.getBoundingClientRect();
				return box.width > 1 && box.height > 1 && computed.getPropertyValue('display') !== 'none' && computed.getPropertyValue('visibility') !== 'hidden';
			});
			var owner = buttons.length > 1 ? buttons[0].parentElement : null;

				if (field.parentElement && field.parentElement.closest('.cbi-value-field'))
					return;

			buttons.forEach(function(button, index) {
				button.classList.remove('vwrt-field-button-1', 'vwrt-field-button-2', 'vwrt-field-button-3');
				if (index < 3)
					button.classList.add('vwrt-field-button-' + (index + 1));
			});

			field.classList.toggle('vwrt-multi-button-field', buttons.length > 1);

			if (owner && owner !== field)
				owner.classList.add('vwrt-multi-button-field');
		});
	}

		function enhancePlaceholderRows(rootNode) {
			var scope = rootNode && rootNode.querySelectorAll ? rootNode : document;
			var placeholderPattern = /^(?:尚无任何配置|暂无(?:任何)?配置|没有已分配的租约|No (?:entries|data|configuration|leases|allocated leases)|There are no .+)$/i;
			var isVisibleControl = function(control) {
				var style;

				if (!control)
					return false;
				if (control.matches && control.matches('input[type="hidden"], [hidden], .hidden'))
					return false;

				style = window.getComputedStyle ? window.getComputedStyle(control) : null;
				if (style && (
					style.getPropertyValue('display') === 'none' ||
					style.getPropertyValue('visibility') === 'hidden' ||
					Number(style.getPropertyValue('opacity')) === 0
				))
					return false;

				return true;
			};

		scope.querySelectorAll('#maincontent table, #maincontent .table, #maincontent .cbi-section-table').forEach(function(table) {
			var header = table.querySelector(':scope > thead > tr, :scope > .tr.table-titles, :scope > .cbi-section-table-titles, :scope tr:first-child');
			var headerCells = Array.prototype.filter.call(header && header.children || [], function(cell) {
				return cell.matches && cell.matches('td, th, .td, .th, .cbi-section-table-cell');
			});
			var columns = headerCells.length;

			if (columns < 2)
				return;

			table.querySelectorAll(':scope tr, :scope > .tr, :scope > .cbi-section-table-row').forEach(function(row) {
				var cells = Array.prototype.filter.call(row.children || [], function(cell) {
					return cell.matches && cell.matches('td, th, .td, .th, .cbi-section-table-cell');
				});
				var hasVisibleControls = Array.prototype.some.call(
					row.querySelectorAll('input, select, textarea, button, .cbi-button, .btn, a[href]'),
					isVisibleControl
				);
				var labeledCells = cells.map(function(cell) {
					return {
						cell: cell,
						label: buttonVisibleLabel(cell)
					};
				}).filter(function(item) {
					return item.label;
				});
				var placeholderItem = labeledCells.find(function(item) {
					return placeholderPattern.test(item.label);
				});
				var placeholderRow = Boolean(placeholderItem);
				var emptySpacer = cells.length && !buttonVisibleLabel(row) && !hasVisibleControls;
				var spanColumns = Math.max(columns, cells.length);
				var useNativeRow = row.tagName === 'TR';
				var placeholderCell;

				row.classList.toggle('vwrt-empty-table-spacer-row', Boolean(emptySpacer));
				row.classList.toggle('vwrt-placeholder-row', Boolean(placeholderRow));
				if (placeholderRow)
					row.setAttribute('data-vwrt-placeholder-row', 'true');
				else
					row.removeAttribute('data-vwrt-placeholder-row');

				if (!placeholderRow && row.dataset.vwrtPlaceholderOriginalHtml) {
					row.innerHTML = row.dataset.vwrtPlaceholderOriginalHtml;
					delete row.dataset.vwrtPlaceholderOriginalHtml;
					cells = Array.prototype.filter.call(row.children || [], function(cell) {
						return cell.matches && cell.matches('td, th, .td, .th, .cbi-section-table-cell');
					});
				}

				if (placeholderRow && placeholderItem) {
					if (!row.dataset.vwrtPlaceholderOriginalHtml)
						row.dataset.vwrtPlaceholderOriginalHtml = row.innerHTML;

					placeholderCell = document.createElement(useNativeRow ? 'td' : 'div');
					placeholderCell.className = useNativeRow ?
						'vwrt-placeholder-cell' :
						'td cbi-section-table-cell vwrt-placeholder-cell';
					placeholderCell.textContent = placeholderItem.label;

					if (useNativeRow)
						placeholderCell.setAttribute('colspan', String(Math.max(spanColumns, 1)));

					row.replaceChildren(placeholderCell);
					return;
				}
			});
			});
		}

		function normalizeRepoKeyTables(rootNode) {
			var scope = rootNode && rootNode.querySelectorAll ? rootNode : document;

			if (!document.body || !document.body.classList.contains('vwrt-page-repokeys'))
				return;

			scope.querySelectorAll('#maincontent table.cbi-section-table[data-vwrt-repokey-table="true"]').forEach(function(table) {
				table.removeAttribute('data-vwrt-repokey-table');
				table.querySelectorAll(':scope > colgroup[data-vwrt-repokey-cols="true"], .vwrt-repokey-actions-head').forEach(function(node) {
					node.remove();
				});
			});
		}

		function enhanceStructuredTables(rootNode) {
			var scope = rootNode && rootNode.querySelectorAll ? rootNode : document;
			var booleanHeaderPattern = /^(?:已?启用|启用|Enabled|Active|Status|状态|开关)$/i;

		scope.querySelectorAll('#maincontent .cbi-tblsection :is(table, .table, .cbi-section-table)').forEach(function(table) {
			var header = table.querySelector(':scope > thead > tr, :scope > .tr.table-titles, :scope > .cbi-section-table-titles, :scope tr:first-child');
			var headerCells = Array.prototype.filter.call(header && header.children || [], function(cell) {
				return cell.matches && cell.matches('td, th, .td, .th, .cbi-section-table-cell');
			});
			var headerLabels = headerCells.map(function(cell) {
				return buttonVisibleLabel(cell);
			});
			var rows = Array.prototype.filter.call(
				table.querySelectorAll(':scope tr, :scope > .tr, :scope > .cbi-section-table-row'),
				function(row) {
					return row !== header;
				}
			);
			var hasBooleanFirstColumn = Boolean(headerLabels[0] && booleanHeaderPattern.test(headerLabels[0])) ||
				rows.some(function(row) {
					var firstCell = Array.prototype.find.call(row.children || [], function(cell) {
						return cell.matches && cell.matches('td, th, .td, .th, .cbi-section-table-cell');
					});

					return Boolean(firstCell && firstCell.querySelector('input[type="checkbox"], input[type="radio"], .cbi-checkbox, .cbi-radio'));
				});
			var hasActionColumn = rows.some(function(row) {
				var cells = Array.prototype.filter.call(row.children || [], function(cell) {
					return cell.matches && cell.matches('td, th, .td, .th, .cbi-section-table-cell');
				});
				var lastCell = cells[cells.length - 1];

				return Boolean(lastCell && lastCell.querySelector('button, .cbi-button, .btn, input[type="submit"], input[type="button"], input[type="reset"], .cbi-section-actions'));
			});
			var hasManyColumns = headerCells.length >= 5;

			table.classList.toggle('vwrt-table-boolean-first', hasBooleanFirstColumn && headerCells.length >= 2);
			table.classList.toggle('vwrt-table-has-actions', hasActionColumn);
			table.classList.toggle('vwrt-table-many-columns', hasManyColumns && hasActionColumn);
		});
	}

	function enhanceWrappedInlineControls(rootNode) {
		var scope = rootNode && rootNode.querySelectorAll ? rootNode : document;

		scope.querySelectorAll('#maincontent .cbi-value-field').forEach(function(field) {
			var breakNode = Array.prototype.find.call(field.children || [], function(node) {
				return node.tagName === 'BR';
			});
			var actions = breakNode && breakNode.nextElementSibling;

			field.classList.toggle(
				'vwrt-wrapped-inline-controls',
				Boolean(actions && actions.matches('.control-group, .controls, .cbi-input-group'))
			);
		});
	}

	function dynlistEnhancementDisabled() {
		try {
			return window.__VITRAWRT_DISABLE_DYNLIST_ENHANCEMENT__ === true ||
				sessionStorage.getItem('vitrawrtDisableDynlistEnhancement') === '1';
		}
		catch (e) {
			return window.__VITRAWRT_DISABLE_DYNLIST_ENHANCEMENT__ === true;
		}
	}

	function isApplyMenuArrow(ev, menu) {
		if (!ev || !menu)
			return false;

		if (ev.target && ev.target.closest && ev.target.closest('.vwrt-apply-arrow-hit'))
			return true;

		if (ev.target && ev.target.parentElement === menu &&
			ev.target.matches && ev.target.matches('span.more, span.open')) {
			return true;
		}

		if (typeof ev.clientX !== 'number' || !menu.getBoundingClientRect)
			return false;

		var rect = menu.getBoundingClientRect();
		return ev.clientX >= rect.right - 42 && ev.clientX <= rect.right + 2;
	}

	function watchPanels() {
		gsap.utils.toArray('.vwrt-theme-panel').forEach(function(panel) {
			var observer = new MutationObserver(function(mutations) {
				mutations.forEach(function(mutation) {
					if (mutation.type === 'attributes' && mutation.attributeName === 'hidden')
						animatePanel(panel);
				});
			});

			observer.observe(panel, {
				attributes: true,
				attributeFilter: ['hidden']
			});
		});
	}

	function enhancePointerMotion() {
		document.addEventListener('pointerover', animateHoverIn, { passive: true });
		document.addEventListener('pointerout', animateHoverOut, { passive: true });
		document.addEventListener('pointermove', updateDynlistDeleteMotion, { passive: true });
		document.addEventListener('pointerdown', animatePressIn, { passive: true });
		document.addEventListener('pointerup', animatePressOut, { passive: true });
		document.addEventListener('pointercancel', animatePressOut, { passive: true });
	}

	function bindEvents() {
		document.addEventListener('pointerover', function(ev) {
			var item = ev.target.closest && ev.target.closest('.cbi-dropdown.cbi-button-action > ul > li');
			if (item)
				item.classList.add('vwrt-action-dropdown-hover');

			item = ev.target.closest && ev.target.closest('.cbi-dropdown:not(.btn):not(.cbi-button) > ul > li');
			if (item)
				item.classList.add('vwrt-cbi-dropdown-hover');
		}, { passive: true });

		document.addEventListener('pointerout', function(ev) {
			var item = ev.target.closest && ev.target.closest('.cbi-dropdown.cbi-button-action > ul > li');
			if (item)
				item.classList.remove('vwrt-action-dropdown-hover');

			item = ev.target.closest && ev.target.closest('.cbi-dropdown:not(.btn):not(.cbi-button) > ul > li');
			if (item)
				item.classList.remove('vwrt-cbi-dropdown-hover');
		}, { passive: true });

		document.addEventListener('click', function(ev) {
			var modalApplyMenu = ev.target.closest('#modal_overlay .cbi-dropdown');
			var modalApplyItem;
			var applyMenu = ev.target.closest('.cbi-dropdown.cbi-button-apply');
			var applyItem = applyMenu && ev.target.closest('.cbi-dropdown.cbi-button-apply > ul > li');
			var actionDropdown = ev.target.closest('.cbi-dropdown.cbi-button-action');
			var actionDropdownItem = actionDropdown && ev.target.closest('.cbi-dropdown.cbi-button-action > ul > li');
			var cbiDropdown = ev.target.closest('.cbi-dropdown:not(.btn):not(.cbi-button)');
			var cbiDropdownItem = cbiDropdown && ev.target.closest('.cbi-dropdown:not(.btn):not(.cbi-button) > ul > li');
			var ocThemeToggle = ev.target.closest('body.vwrt-page-openclash #maincontent .oc #theme-toggle');

			if (ocThemeToggle) {
				cycleThemeMode();
				ev.preventDefault();
				ev.stopPropagation();

				if (ev.stopImmediatePropagation)
					ev.stopImmediatePropagation();
				return;
			}

			if (modalApplyMenu && isApplyChoiceDropdown(modalApplyMenu)) {
				syncModalApplyMenu(modalApplyMenu);
				modalApplyItem = ev.target.closest('.cbi-dropdown.vwrt-modal-apply-combo > ul > li');
			}
			else {
				modalApplyMenu = null;
			}

			if (modalApplyMenu && !modalApplyItem && isApplyMenuArrow(ev, modalApplyMenu)) {
				if (toggleNativeComboDropdown(modalApplyMenu)) {
					ev.preventDefault();
					ev.stopPropagation();

					if (ev.stopImmediatePropagation)
						ev.stopImmediatePropagation();
				}
				return;
			}

			if (modalApplyMenu && !modalApplyItem) {
				primeApplyComboLoading(modalApplyMenu);
				return;
			}

			if (modalApplyItem) {
				setApplyCurrentLabel(modalApplyMenu, modalApplyItem.textContent);
				window.setTimeout(function() {
					syncModalApplyMenu(modalApplyMenu);
				}, 0);
				return;
			}

			if (actionDropdownItem && actionDropdown) {
				window.setTimeout(function() {
					syncActionDropdown(actionDropdown);
					setActionDropdownOpen(actionDropdown, false);
				}, 0);
				return;
			}

			if (actionDropdown && !actionDropdownItem) {
				toggleActionDropdown(actionDropdown);
				ev.preventDefault();
				ev.stopPropagation();

				if (ev.stopImmediatePropagation)
					ev.stopImmediatePropagation();
				return;
			}

			if (cbiDropdownItem && cbiDropdown) {
				return;
			}

			if (!applyMenu)
				return;

			if (applyItem) {
				setApplyMenuValue(applyMenu, applyItem);
				applyMenu.classList.remove('vwrt-apply-menu-open');
				applyMenu.setAttribute('aria-expanded', 'false');
				applyMenu.classList.remove('vwrt-apply-split-ready');
				syncApplyMenu(applyMenu);
				ev.preventDefault();
				ev.stopPropagation();

				if (ev.stopImmediatePropagation)
					ev.stopImmediatePropagation();
				return;
			}

			if (isApplyMenuArrow(ev, applyMenu)) {
				syncApplyMenu(applyMenu);
				toggleApplyMenu(applyMenu);
				ev.preventDefault();
				ev.stopPropagation();

				if (ev.stopImmediatePropagation)
					ev.stopImmediatePropagation();
			}
			else {
				primeApplyComboLoading(applyMenu);
			}
		}, true);

		document.addEventListener('click', function(ev) {
			var applyMenu = ev.target.closest('.cbi-dropdown.cbi-button-apply');
			var applyArrow = isApplyMenuArrow(ev, applyMenu);
			var applyItem = applyMenu && ev.target.closest('.cbi-dropdown.cbi-button-apply > ul > li');
			var actionDropdown = ev.target.closest('.cbi-dropdown.cbi-button-action');
			var actionDropdownItem = actionDropdown && ev.target.closest('.cbi-dropdown.cbi-button-action > ul > li');
			var cbiDropdown = ev.target.closest('.cbi-dropdown:not(.btn):not(.cbi-button)');
			var cbiDropdownItem = cbiDropdown && ev.target.closest('.cbi-dropdown:not(.btn):not(.cbi-button) > ul > li');
			var unsaved = ev.target.closest('[data-vwrt-unsaved]');
			var refresh = ev.target.closest('[data-vwrt-refresh]');
			var themeValue = ev.target.closest('[data-vwrt-theme-value]');
			var themeCycle = ev.target.closest('[data-vwrt-theme-action="cycle"]');
			var glassValue = ev.target.closest('[data-vwrt-glass-value]');
			var collapse = ev.target.closest('[data-vwrt-sidebar-toggle]');
			var drawer = ev.target.closest('[data-vwrt-drawer-toggle]');
			var backdrop = ev.target.closest('[data-vwrt-drawer-backdrop]');
			var panel = ev.target.closest('[data-vwrt-panel-toggle]');
			var menuLink = ev.target.closest('#vitrawrt-sidebar-menu a');

			if (applyArrow && applyMenu) {
				syncApplyMenu(applyMenu);
				toggleApplyMenu(applyMenu);
				ev.preventDefault();
				ev.stopPropagation();
				pruneExpandedMenuGroups();
				return;
			}
			else if (applyItem && applyMenu) {
				setApplyMenuValue(applyMenu, applyItem);
				window.setTimeout(function() {
					applyMenu.classList.remove('vwrt-apply-menu-open');
					applyMenu.setAttribute('aria-expanded', 'false');
					applyMenu.classList.remove('vwrt-apply-split-ready');
					syncApplyMenu(applyMenu);
				}, 0);
				ev.preventDefault();
				ev.stopPropagation();
			}
			else if (applyMenu) {
				closeApplyMenus();
			}
			else if (!applyMenu) {
				closeApplyMenus();
			}

			if (cbiDropdownItem && cbiDropdown) {
				window.setTimeout(function() {
					syncCbiDropdown(cbiDropdown);
				}, 36);
			}

			if (actionDropdownItem && actionDropdown) {
				window.setTimeout(function() {
					syncActionDropdown(actionDropdown);
					setActionDropdownOpen(actionDropdown, false);
				}, 0);
			}
			else {
				closeActionDropdowns();
			}

			if (unsaved) {
				ev.preventDefault();
				openNativeChanges();
			}
			else if (refresh) {
				ev.preventDefault();
				window.location.reload();
			}
			else if (themeValue) {
				applyThemeMode(themeValue.getAttribute('data-vwrt-theme-value'), true);
				ev.preventDefault();
			}
			else if (themeCycle) {
				cycleThemeMode();
				ev.preventDefault();
			}
			else if (glassValue) {
				applyGlassMode(glassValue.getAttribute('data-vwrt-glass-value'), true);
				ev.preventDefault();
			}
			else if (collapse) {
				setCollapsed(!root.classList.contains('vwrt-sidebar-collapsed'));
				ev.preventDefault();
			}
			else if (drawer) {
				setDrawer(!root.classList.contains('vwrt-drawer-open'));
				ev.preventDefault();
			}
			else if (backdrop) {
				setDrawer(false);
				ev.preventDefault();
			}
			else if (panel) {
				closePanels(panel);
				togglePanel(panel);
				ev.preventDefault();
			}
			else if (menuLink && window.matchMedia && window.matchMedia('(max-width: 900px)').matches) {
				setDrawer(false);
			}
			else if (!ev.target.closest('.vwrt-theme-panel')) {
				closePanels();
			}

			pruneExpandedMenuGroups();
		});

		document.addEventListener('keydown', function(ev) {
			if (ev.key === 'Escape') {
				setDrawer(false);
				closePanels();
				closeApplyMenus();
				closeActionDropdowns();
			}
		});

		window.addEventListener('scroll', updateScrollState, { passive: true });
	}

	function installSystemListeners() {
		var onThemeSystemChange = function() {
			if (readThemeMode() === 'system')
				applyThemeMode('system', false);
		};
		var onReducedMotionChange = function() {
			if (readGlassMode() === 'auto')
				applyGlassMode('auto', false);
		};

		if (themeMedia) {
			if (themeMedia.addEventListener)
				themeMedia.addEventListener('change', onThemeSystemChange);
			else if (themeMedia.addListener)
				themeMedia.addListener(onThemeSystemChange);
		}

		if (reducedMotion) {
			if (reducedMotion.addEventListener)
				reducedMotion.addEventListener('change', onReducedMotionChange);
			else if (reducedMotion.addListener)
				reducedMotion.addListener(onReducedMotionChange);
		}

		window.addEventListener('resize', scheduleLoadingVisualCenter, { passive: true });

		if ('ResizeObserver' in window && !loadingCenterObserver) {
			loadingCenterObserver = new ResizeObserver(scheduleLoadingVisualCenter);
			var main = document.querySelector('#maincontent');
			if (main)
				loadingCenterObserver.observe(main);
		}
	}

	function exposeApi() {
		window.VitraWrtTheme = {
			getMode: readThemeMode,
			setMode: function(mode) {
				applyThemeMode(mode, true);
			},
			cycle: cycleThemeMode,
			apply: function() {
				applyThemeMode(readThemeMode(), false);
			}
		};

		window.VitraWrtGlass = {
			get: readGlassMode,
			set: function(value) {
				applyGlassMode(value, true);
			},
			apply: function() {
				applyGlassMode(readGlassMode(), false);
			}
		};

		window.VitraWrtNetworkIcons = {
			enhance: function(node) {
				enhanceNetworkIcons(node || document);
			},
			meta: getNetworkIconMeta
		};
	}

	function init() {
		gsap.defaults({
			duration: 0.42,
			ease: 'power3.out',
			overwrite: 'auto'
		});

		root.classList.add('vwrt-ready', 'vitrawrt-ready', 'vwrt-sidebar-ready', 'vwrt-gsap-ready');
		root.dataset.vitrawrt = '1.43.0-r1';

		if (document.body)
			document.body.classList.add('vitrawrt-body');

		exposeApi();
		applyThemeMode(readThemeMode(), false);
			applyGlassMode(readGlassMode(), false);
			setCollapsed(readCollapsed());
			setDrawer(false);
			setPageClasses();
			enhanceButtonKinds(document);
			enhanceApplyMenus(document);
			enhanceStatusPrompts(document);
		enhanceNetworkIcons(document);
			enhanceCbiDropdowns(document);
			enhanceModalInlineControls(document);
			enhanceMultiButtonFields(document);
			normalizeRepoKeyTables(document);
			enhancePlaceholderRows(document);
			enhanceStructuredTables(document);
		enhanceWrappedInlineControls(document);
		enhanceTabPanelStacks(document);
		if (!dynlistEnhancementDisabled())
			enhanceDynlists(document);
		refreshNativeChangesIndicator();
		updateScrollState();
		updateReadyClass();
		watchViewReady();
		watchMenuExpansion();
		bindEvents();
		installSystemListeners();

		if (motionAllowed()) {
			enhancePointerMotion();
			animateEntrance();
			watchPanels();
		}

		window.setTimeout(updateReadyClass, 600);
		window.setTimeout(refreshNativeChangesIndicator, 900);
		window.setTimeout(updateReadyClass, 1800);
		window.setTimeout(refreshNativeChangesIndicator, 2400);
		window.setTimeout(updateReadyClass, 4200);
	}

	onReady(init);
})();
