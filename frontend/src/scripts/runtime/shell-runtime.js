import { gsap } from 'gsap';

(function() {
	'use strict';

	var root = document.documentElement;
	var THEME_KEY = 'vitrawrt.theme';
	var GLASS_KEY = 'vitrawrt.glass';
	var COLLAPSE_KEY = 'vitrawrt.sidebar.collapsed';
	var THEME_MODES = ['system', 'light', 'dark'];
	var GLASS_MODES = ['auto', 'high', 'low'];
	var themeMedia = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
	var reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
	var menuObserver;
	var viewObserver;
	var indicatorSignature = '';
	var changesModalOpening = false;
	var changesIndicatorRefreshing = false;
	var runtimeEnhanceQueued = false;
	var activeDynlistDeleteMotion = null;
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
		'.cbi-button-action:not([disabled])',
		'.cbi-button-apply:not([disabled])',
		'.cbi-button-save:not([disabled])',
		'.cbi-button-positive:not([disabled])',
		'button:not([disabled])',
		'a.btn',
		'.cbi-button:not([disabled])',
		'.vwrt-icon-button',
		'.vwrt-text-button',
		'.vwrt-theme-button',
		'.vwrt-menu-row > a',
		'.vwrt-menu-expander'
	].join(',');
	var PAGE_CLASSES = [
		'vwrt-page-overview',
		'vwrt-page-network',
		'vwrt-page-vnstat2',
		'vwrt-page-system',
		'vwrt-page-packages',
		'vwrt-page-nlbw',
		'vwrt-page-startup',
		'vwrt-page-processes',
		'vwrt-page-syslog',
		'vwrt-page-network-share',
		'vwrt-page-firewall',
		'vwrt-page-nftables',
		'vwrt-page-openclash',
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
		if (!isValidThemeMode(mode))
			mode = 'system';

		if (persist)
			writeStorage(THEME_KEY, mode);

		root.setAttribute('data-theme-mode', mode);
		root.setAttribute('data-theme', resolveThemeMode(mode));
		updateThemeControls(mode);
	}

	function cycleThemeMode() {
		var mode = readThemeMode();
		var index = THEME_MODES.indexOf(mode);

		applyThemeMode(THEME_MODES[(index + 1) % THEME_MODES.length], true);
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

	function setPageClasses() {
		var path;

		if (!document.body)
			return;

		path = getPathText();
		PAGE_CLASSES.forEach(function(cls) {
			document.body.classList.remove(cls);
		});

		if (/(^|\s)(admin\/)?status\/overview(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-overview');

		if (/(^|\s)(admin\/)?network(\/(?:network|routes|dhcp))?(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-network');

		if (/(^|\s)(admin\/)?status\/vnstat2(\/|\s|$)/.test(path))
			document.body.classList.add('vwrt-page-vnstat2');

		if (/(^|\s)(admin\/)?system\/system(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-system');

		if (/(^|\s)(admin\/)?statistics\/collectd(\s|$)/.test(path))
			document.body.classList.add('vwrt-page-collectd');

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

		document.querySelectorAll('[data-vwrt-loading-owner]').forEach(function(node) {
			if (!node.matches(loadingSelector)) {
				node.classList.remove('vwrt-loading-viewport', 'vwrt-loading-apply', 'vwrt-loading-modal-local');
				node.removeAttribute('data-vwrt-loading-owner');
			}
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

		scope.querySelectorAll(loadingSelector).forEach(function(spinner) {
			var control = loadingControlRoot(spinner);
			var parent;
			var owner;
			var ownerClass;

			if (control) {
				control.classList.add('vwrt-button-local-loading');
				spinner.classList.remove('vwrt-loading-viewport', 'vwrt-loading-apply', 'vwrt-loading-modal-local');
				control.classList.remove('vwrt-loading-viewport', 'vwrt-loading-apply', 'vwrt-loading-modal-local');
				spinner.removeAttribute('data-vwrt-loading-owner');
				control.removeAttribute('data-vwrt-loading-owner');
				return;
			}

			if (spinner.matches('#modal_overlay > .modal.alert-message.spinning, #modal_overlay > .modal.alert-message.loading'))
				owner = 'apply';
			else if (spinner.closest('#modal_overlay .modal'))
				owner = 'modal';
			else
				owner = 'viewport';

			ownerClass = owner === 'apply'
				? 'vwrt-loading-apply'
				: owner === 'modal'
					? 'vwrt-loading-modal-local'
					: 'vwrt-loading-viewport';

			if (spinner.getAttribute('data-vwrt-loading-owner') !== owner) {
				spinner.classList.remove('vwrt-loading-viewport', 'vwrt-loading-apply', 'vwrt-loading-modal-local');
				spinner.classList.add(ownerClass);
				spinner.setAttribute('data-vwrt-loading-owner', owner);
			}

			if (spinner.closest('#modal_overlay')) {
				if (owner === 'modal') {
					parent = spinner.parentElement;
					while (parent && parent.id !== 'modal_overlay') {
						if (
							parent.matches('.modal[role="dialog"]') &&
							!parent.matches('.alert-message') &&
							!meaningfulContent(parent, spinner)
						)
							parent.classList.add('vwrt-loading-only-parent');
						else if (hasMaterial(parent) && !meaningfulContent(parent, spinner))
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

	function updateReadyClass() {
		if (!document.body)
			return;

		document.body.classList.toggle('vwrt-view-ready', viewReady());
		enhanceLoadingStates(document);
		setPageClasses();
		normalizeIndicatorBar();
		enhanceButtonKinds(document);
		enhanceApplyMenus(document);
		enhanceCbiDropdowns(document);
		enhanceModalInlineControls(document);
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

		viewObserver = new MutationObserver(function() {
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
		var split;

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

		split = ev.target.closest(
			'.cbi-dropdown.cbi-button-apply.vwrt-apply-split-ready, ' +
			'.cbi-dropdown.vwrt-modal-apply-combo'
		);
		if (split &&
			!split.hasAttribute('open') &&
			!split.classList.contains('vwrt-apply-menu-open'))
			return split;

		return null;
	}

	function targetFromEvent(ev) {
		return motionProxyFromEvent(ev) || targetFromSelector(ev, PRESS_SELECTOR);
	}

	function targetFromSelector(ev, selector) {
		if (!ev.target || !ev.target.closest)
			return null;

		return ev.target.closest(selector);
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
			scale: isModalSaveMotionTarget(target) ? 0.992 : 0.985,
			y: isModalSaveMotionTarget(target) ? 0.5 : 1,
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
			duration: 0.48,
			ease: 'elastic.out(1, 0.44)',
			overwrite: 'auto',
			clearProps: 'transform'
		});
	}

	function animateHoverIn(ev) {
		var target = motionProxyFromEvent(ev) || targetFromSelector(ev, HOVER_SELECTOR);

		if (!target || !motionAllowed() || pointerMovedInsideTarget(ev, target))
			return;

		gsap.to(target, {
			scale: isModalSaveMotionTarget(target) ? 1.008 : 1.018,
			y: isModalSaveMotionTarget(target) ? -0.5 : -1,
			duration: 0.42,
			ease: 'elastic.out(1, 0.62)',
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
			duration: 0.55,
			ease: 'elastic.out(1, 0.48)',
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

		if (!motionAllowed())
			return;

		next = dynlistDeleteVisualAtPoint(ev);
		if (next === activeDynlistDeleteMotion)
			return;

		previous = activeDynlistDeleteMotion;
		activeDynlistDeleteMotion = next;

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
		document.querySelectorAll('.cbi-dropdown.cbi-button-apply.vwrt-apply-menu-open').forEach(function(menu) {
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

		normalizeApplyArrowOwner(menu, menu.hasAttribute('open'));
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

	function updateApplyLabelWidth(menu) {
		var items;
		var style;
		var canvas;
		var context;
		var width;

		if (!menu)
			return;

		items = Array.prototype.map.call(menu.querySelectorAll(':scope > ul:not(.preview) > li'), function(item) {
			return String(item.textContent || '').replace(/\s+/g, ' ').trim();
		}).filter(Boolean);
		style = window.getComputedStyle(menu);
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
		width = Math.max(88, Math.min(124, Math.ceil(width + 24)));
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
		menu.classList.add('vwrt-apply-split-ready');
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
		normalizeApplyArrowOwner(menu, true);

		label = selectedApplyLabel(menu) || 'Save & Apply';
		if (current.textContent !== label)
			current.textContent = label;

		updateApplyLabelWidth(menu);
		menu.classList.add('vwrt-modal-apply-combo');
		menu.setAttribute('aria-haspopup', 'menu');
		menu.setAttribute('aria-expanded', menu.hasAttribute('open') ? 'true' : 'false');
	}

	function enhanceApplyMenus(rootNode) {
		var scope = rootNode && rootNode.querySelectorAll ? rootNode : document;
		scope.querySelectorAll('.cbi-page-actions .cbi-dropdown.cbi-button-apply').forEach(syncApplyMenu);
		scope.querySelectorAll('#modal_overlay .modal.uci-dialog .button-row .cbi-dropdown').forEach(function(menu) {
			var values = Array.prototype.map.call(menu.querySelectorAll(':scope > ul:not(.preview) > li[data-value]'), function(item) {
				return item.getAttribute('data-value');
			});

			if (values.indexOf('0') > -1 && values.indexOf('1') > -1) {
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

		scope.querySelectorAll(selector).forEach(function(button) {
			var label;
			var iconOnly;
			var addVariant;

			if (!button || button.closest('.cbi-dropdown > ul'))
				return;

			label = buttonVisibleLabel(button);
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
			var modalApplyMenu = ev.target.closest('.cbi-dropdown.vwrt-modal-apply-combo');
			var modalApplyItem = modalApplyMenu && ev.target.closest('.cbi-dropdown.vwrt-modal-apply-combo > ul > li');
			var applyMenu = ev.target.closest('.cbi-dropdown.cbi-button-apply');
			var applyItem = applyMenu && ev.target.closest('.cbi-dropdown.cbi-button-apply > ul > li');
			var actionDropdown = ev.target.closest('.cbi-dropdown.cbi-button-action');
			var actionDropdownItem = actionDropdown && ev.target.closest('.cbi-dropdown.cbi-button-action > ul > li');
			var cbiDropdown = ev.target.closest('.cbi-dropdown:not(.btn):not(.cbi-button)');
			var cbiDropdownItem = cbiDropdown && ev.target.closest('.cbi-dropdown:not(.btn):not(.cbi-button) > ul > li');

			if (modalApplyMenu && !modalApplyItem && isApplyMenuArrow(ev, modalApplyMenu)) {
				if (toggleNativeComboDropdown(modalApplyMenu)) {
					ev.preventDefault();
					ev.stopPropagation();

					if (ev.stopImmediatePropagation)
						ev.stopImmediatePropagation();
				}
				return;
			}

			if (modalApplyItem)
				return;

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
	}

	function init() {
		gsap.defaults({
			duration: 0.42,
			ease: 'power3.out',
			overwrite: 'auto'
		});

		root.classList.add('vwrt-ready', 'vitrawrt-ready', 'vwrt-sidebar-ready', 'vwrt-gsap-ready');
		root.dataset.vitrawrt = '1.41.90-r30';

		if (document.body)
			document.body.classList.add('vitrawrt-body');

		exposeApi();
		applyThemeMode(readThemeMode(), false);
		applyGlassMode(readGlassMode(), false);
		setCollapsed(readCollapsed());
		setDrawer(false);
		enhanceButtonKinds(document);
		enhanceApplyMenus(document);
		enhanceCbiDropdowns(document);
		enhanceModalInlineControls(document);
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
