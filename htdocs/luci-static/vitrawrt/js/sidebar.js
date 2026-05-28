(function() {
	'use strict';

	var root = document.documentElement;
	var COLLAPSE_KEY = 'vitrawrt.sidebar.collapsed';
	var menuObserver;

	function readCollapsed() {
		try {
			return localStorage.getItem(COLLAPSE_KEY) === '1';
		}
		catch (e) {
			return false;
		}
	}

	function writeCollapsed(collapsed) {
		try {
			localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
		}
		catch (e) {}
	}

	function setCollapsed(collapsed) {
		root.classList.toggle('vwrt-sidebar-collapsed', collapsed);
		root.setAttribute('data-vwrt-sidebar', collapsed ? 'collapsed' : 'expanded');
		writeCollapsed(collapsed);

		document.querySelectorAll('[data-vwrt-sidebar-toggle]').forEach(function(button) {
			var label = button.querySelector('span');

			button.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
			button.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');

			if (label)
				label.textContent = collapsed ? 'Expand' : 'Collapse';
		});
	}

	function setDrawer(open) {
		root.classList.toggle('vwrt-drawer-open', open);
		root.setAttribute('data-vwrt-drawer', open ? 'open' : 'closed');

		document.querySelectorAll('[data-vwrt-drawer-toggle]').forEach(function(button) {
			button.setAttribute('aria-expanded', open ? 'true' : 'false');
		});
	}

	function togglePanel(button) {
		var target = button.getAttribute('data-vwrt-panel-toggle');
		var panel = target ? document.querySelector(target) : null;

		if (!panel)
			return;

		var hidden = panel.hasAttribute('hidden');
		panel.toggleAttribute('hidden', !hidden);
		button.setAttribute('aria-expanded', hidden ? 'true' : 'false');
		button.classList.toggle('is-open', hidden);
	}

	function closePanels(exceptButton) {
		document.querySelectorAll('[data-vwrt-panel-toggle]').forEach(function(button) {
			var target = button.getAttribute('data-vwrt-panel-toggle');
			var panel = target ? document.querySelector(target) : null;

			if (!panel || button === exceptButton)
				return;

			panel.setAttribute('hidden', '');
			button.setAttribute('aria-expanded', 'false');
			button.classList.remove('is-open');
		});
	}

	function updateScrollState() {
		root.classList.toggle('vwrt-page-scrolled', window.scrollY > 8);
	}

	function currentTopLevelName() {
		if (window.L && L.env && Array.isArray(L.env.dispatchpath))
			return L.env.dispatchpath[1] || '';

		var bodyPage = document.body ? document.body.getAttribute('data-page') || '' : '';
		return bodyPage.split('-')[1] || '';
	}

	function pruneExpandedMenuGroups() {
		var menu = document.querySelector('#vitrawrt-sidebar-menu > .vwrt-menu.l1');

		if (!menu)
			return;

		var expanded = Array.prototype.filter.call(menu.children, function(li) {
			return li.classList.contains('expanded');
		});

		if (expanded.length <= 3)
			return;

		var activeName = currentTopLevelName();

		expanded.forEach(function(li) {
			if (activeName && li.classList.contains('vwrt-menu-item-' + activeName))
				return;

			li.classList.remove('expanded');

			var button = li.querySelector(':scope > .vwrt-menu-row > .vwrt-menu-expander');
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

	document.addEventListener('DOMContentLoaded', function() {
		setCollapsed(readCollapsed());
		updateScrollState();
		watchMenuExpansion();
		root.classList.add('vwrt-sidebar-ready');

		document.addEventListener('click', function(ev) {
			var collapse = ev.target.closest('[data-vwrt-sidebar-toggle]');
			var drawer = ev.target.closest('[data-vwrt-drawer-toggle]');
			var backdrop = ev.target.closest('[data-vwrt-drawer-backdrop]');
			var panel = ev.target.closest('[data-vwrt-panel-toggle]');
			var menuLink = ev.target.closest('#vitrawrt-sidebar-menu a');

			if (collapse) {
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
			}
		});

		window.addEventListener('scroll', updateScrollState, { passive: true });
	});
})();
