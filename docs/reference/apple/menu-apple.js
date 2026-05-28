'use strict';
'require baseclass';
'require fs';
'require rpc';
'require ui';

const SIDEBAR_COMPACT_QUERY = '(max-width: 640px)';
const SIDEBAR_STATE_KEY = 'luci-theme-apple-sidebar';
const CONTENT_TARGETS = [
	':scope > .alert-message',
	':scope > #tabmenu',
	':scope > h2',
	':scope > form',
	':scope > #view > *',
	':scope > .includes > *',
	'.cbi-map',
	'.cbi-section',
	'.cbi-section-node',
	'.cbi-page-actions',
	'.ifacebox',
	'table',
	'.table'
];
const MENU_ICON_MAP = {
	admin: 'admin',
	status: 'status',
	network: 'network',
	system: 'system',
	services: 'services',
	vpn: 'shield',
	nas: 'storage',
	docker: 'services',
	firewall: 'shield',
	statistics: 'status',
	modem: 'network',
	terminal: 'system',
	logout: 'admin'
};
const PORT_STATUS_CACHE_TTL = 5000;
const callAppleNetworkDeviceStatus = rpc.declare({
	object: 'network.device',
	method: 'status',
	params: [ 'name' ],
	expect: { '': {} }
});

return baseclass.extend({
	__init__() {
		if (document.body)
			document.body.classList.toggle('apple-login-shell', !L.env.sessionid);

		this.handlersBound = false;
		this.observerBound = false;
		this.contentDecorateFrame = 0;
		this.progressDecorateFrame = 0;
		this.dropdownSanitizeFrame = 0;
		this.pendingProgressBars = null;
		this.statusOverviewRefreshTimer = null;
		this.networkInterfacesRefreshTimer = null;
		this.hasAnimatedInitialContent = false;
		this.contentSelector = CONTENT_TARGETS.join(', ');
		this.sidebarState = this.readSidebarState();
		this.currentSidebarMode = '';
		this.portStatusCache = {};
		this.boundHandlers = {
			sidebarToggle: this.handleSidebarToggle.bind(this),
			mainMenuClick: this.handleMainMenuClick.bind(this),
			dropdownClickCapture: this.handleDropdownClickCapture.bind(this),
			documentClick: this.handleDocumentClick.bind(this),
			documentKeydown: this.handleDocumentKeydown.bind(this),
			windowResize: this.handleWindowResize.bind(this),
			windowScroll: this.handleWindowScroll.bind(this)
		};

		this.bootstrapWideTables();
		ui.menu.load().then((tree) => this.render(tree));
	},

	bootstrapWideTables() {
		const run = () => {
			const content = document.querySelector('#maincontent');

			if (!content)
				return;

			const previousNodes = this.nodes;

			this.nodes = Object.assign({}, previousNodes || {}, { content });
			this.decorateWideTables();
			this.normalizeOpenClashLayout();
			this.decorateSurfaceTaxonomy();
			this.normalizeZeroTierConfigTable();

			if (previousNodes)
				this.nodes = previousNodes;
		};

		const schedule = () => {
			[0, 40, 120, 320, 800].forEach((delay) => {
				window.setTimeout(run, delay);
			});

			window.setTimeout(() => {
				const content = document.querySelector('#maincontent');

				if (!content || typeof MutationObserver === 'undefined')
					return;

				const observer = new MutationObserver(() => run());

				observer.observe(content, { childList: true, subtree: true });
				window.setTimeout(() => observer.disconnect(), 2400);
			}, 0);
		};

		if (document.readyState === 'loading')
			document.addEventListener('DOMContentLoaded', schedule, { once: true });
		else
			schedule();
	},

	render(tree) {
		this.nodes = {
			navigationToggle: document.querySelector('#menubar > .navigation'),
			modeMenu: document.querySelector('#modemenu'),
			mainMenu: document.querySelector('#mainmenu'),
			tabMenu: document.querySelector('#tabmenu'),
			content: document.querySelector('#maincontent')
		};

		if (!this.nodes.modeMenu || !this.nodes.mainMenu || !this.nodes.tabMenu || !this.nodes.content)
			return;

		if (!L.env.sessionid) {
			document.body.classList.add('apple-login-shell');
			this.nodes.modeMenu.innerHTML = '';
			this.nodes.mainMenu.innerHTML = '';
			this.nodes.tabMenu.innerHTML = '';
			this.nodes.modeMenu.style.display = 'none';
			this.nodes.mainMenu.style.display = 'none';
			this.nodes.tabMenu.style.display = 'none';
			return;
		}

		document.body.classList.remove('apple-login-shell');

		if (this.redirectCanonicalParentRoute())
			return;

		this.nodes.modeMenu.innerHTML = '';
		this.nodes.mainMenu.innerHTML = '';
		this.nodes.tabMenu.innerHTML = '';
		this.nodes.tabMenu.style.display = 'none';
				this.nodes.modeMenu.style.display = 'none';

				this.renderModeMenu(tree);
				this.syncMainMenuLayoutState();
				this.renderCurrentTabs(tree);
			this.bindLocalHandlers();
			this.bindGlobalHandlers();
			this.syncSidebarState();
			this.handleWindowScroll();
				this.decorateContent();
				this.syncOverviewDecorationLoop();
				this.syncNetworkInterfacesDecorationLoop();
				this.observeContent();
			},

	renderCurrentTabs(tree) {
		let node = tree;
		let url = '';

		if (L.env.dispatchpath.length < 3)
			return;

		for (let i = 0; i < 3 && node; i++) {
			node = node.children[L.env.dispatchpath[i]];
			url = url + (url ? '/' : '') + L.env.dispatchpath[i];
		}

		if (node)
			this.renderTabMenu(node, url);
	},

	redirectCanonicalParentRoute() {
		if ((document.body?.dataset?.page || '') !== 'admin-status')
			return false;

		window.location.replace(L.url('admin', 'status', 'overview'));
		return true;
	},

	getDefaultMenuUrl(node, path) {
		const parts = Array.isArray(path)
			? path.slice()
			: String(path || '').split('/').filter(Boolean);
		let current = node;
		let depth = 0;

		while (current && depth < 8) {
			const children = ui.menu.getChildren(current).filter((child) => child && child.name);

			if (!children.length)
				break;

			const child = children[0];
			parts.push(child.name);
			current = child;
			depth++;
		}

		return L.url(...parts);
	},

	renderModeMenu(tree) {
		const children = ui.menu.getChildren(tree);
		let activeChild = null;

		children.forEach((child, index) => {
			const isActive = L.env.requestpath.length ? (child.name === L.env.requestpath[0]) : (index === 0);
			const childUrl = this.getDefaultMenuUrl(child, [ child.name ]);

			if (isActive)
				activeChild = child;

			this.nodes.modeMenu.appendChild(E('div', { 'class': isActive ? 'active' : '' }, [
				E('a', {
					'href': childUrl,
					'aria-current': isActive ? 'page' : null
				}, [ _(child.title) ])
			]));
		});

		if (activeChild) {
			this.renderSidebarTree(tree, activeChild);
		}

		this.nodes.modeMenu.classList.toggle('single-mode', children.length <= 1);

		if (children.length > 0)
			this.nodes.modeMenu.style.display = '';
	},

		renderSidebarTree(menuTree, activeChild) {
		const candidates = [ activeChild ];
		const rootChildren = ui.menu.getChildren(menuTree);

		rootChildren.forEach((child) => {
			if (child && candidates.indexOf(child) === -1)
				candidates.push(child);
		});

		const sidebarRoot = candidates.find((child) => ui.menu.getChildren(child).length > 0) || activeChild;

		this.nodes.mainMenu.innerHTML = '';
		this.currentSidebarMode = sidebarRoot.name || '';
		this.renderSidebarShell(sidebarRoot);
		this.renderMainMenu(sidebarRoot, sidebarRoot.name || activeChild.name || '', 0);

		if (!this.nodes.mainMenu.querySelector('ul.mainmenu > li')) {
			const fallbackRoot = rootChildren.find((child) => ui.menu.getChildren(child).length > 0);

			if (fallbackRoot && fallbackRoot !== sidebarRoot) {
				this.nodes.mainMenu.innerHTML = '';
				this.currentSidebarMode = fallbackRoot.name || '';
				this.renderSidebarShell(fallbackRoot);
				this.renderMainMenu(fallbackRoot, fallbackRoot.name || '', 0);
			}
		}

			this.normalizeTopLevelMenuState();
		},

			syncMainMenuLayoutState() {
		const mainMenu = this.nodes && this.nodes.mainMenu;
		const hasMenuItems = !!mainMenu && !!mainMenu.querySelector('ul.mainmenu > li');

		document.body.classList.toggle('apple-mainmenu-empty', !hasMenuItems);
	},

	renderSidebarShell(activeChild) {
		const title = activeChild && activeChild.title ? _(activeChild.title) : _('Navigation');
		const subtitle = _('LuCI Menu');

		this.nodes.mainMenu.dataset.activeMode = activeChild && activeChild.name ? activeChild.name : '';

		this.nodes.mainMenu.appendChild(E('div', { 'class': 'mainmenu-shell' }, [
			E('div', { 'class': 'mainmenu-shell-copy' }, [
				E('span', { 'class': 'mainmenu-shell-eyebrow' }, [ subtitle ]),
				E('strong', { 'class': 'mainmenu-shell-title' }, [ title ])
			])
		]));
	},

	renderMainMenu(tree, url, level) {
		const menuLevel = (level || 0) + 1;
		const children = ui.menu.getChildren(tree);
		const list = E('ul', { 'class': 'mainmenu l%d'.format(menuLevel) });

		if (children.length === 0 || menuLevel > 2)
			return E([]);

		children.forEach((child) => {
			list.appendChild(this.renderMainMenuItem(child, url, menuLevel));
		});

		if (menuLevel === 1)
			this.nodes.mainMenu.appendChild(E('div', [ list ]));

		return list;
	},

	renderMainMenuItem(child, url, level) {
		const isActive = (L.env.dispatchpath[level] === child.name);
		const hasChildren = (level < 2 && ui.menu.getChildren(child).length > 0);
		const rememberedExpanded = hasChildren ? this.readMenuExpanded(child.name) : false;
		const isExpanded = hasChildren ? (isActive || rememberedExpanded) : false;
		const title = _(child.title);
		const iconKey = this.getMenuIconKey(child.name, title);
		const className = 'mainmenu-item-%s%s%s'.format(
			child.name,
			isActive ? ' selected' : '',
			hasChildren ? ' has-children' : ''
		);
		const childPath = String(url || '').split('/').filter(Boolean).concat(child.name);
		const childUrl = this.getDefaultMenuUrl(child, childPath);
		const childMenu = hasChildren ? this.renderMainMenu(child, url + '/' + child.name, level) : E([]);
		const item = E('li', {
			'class': className,
			'data-menu-key': child.name,
			'data-menu-level': String(level)
		}, [
			E('a', {
				'href': childUrl,
				'aria-current': isActive ? 'page' : null,
				'aria-expanded': hasChildren ? String(isExpanded) : null
			}, [
				level === 1 ? E('span', { 'class': 'mainmenu-link-copy' }, [
					E('span', {
						'class': 'mainmenu-icon',
						'data-icon': iconKey,
						'aria-hidden': 'true'
					}),
					E('span', { 'class': 'mainmenu-link-label' }, [
						E('span', { 'class': 'mainmenu-link-title' }, [ title ]),
						hasChildren ? E('span', { 'class': 'mainmenu-link-meta' }, [ _('Section') ]) : E([])
					])
				]) : title
			]),
			hasChildren ? E('button', {
				'type': 'button',
				'class': 'mainmenu-disclosure',
				'aria-label': _('Toggle %s section').format(title),
				'aria-expanded': String(isExpanded)
			}, [
				E('span', { 'aria-hidden': 'true' })
			]) : E([]),
			childMenu
		]);

		if (hasChildren)
			this.setMenuExpanded(item, isExpanded);

		return item;
	},

	renderTabMenu(tree, url, level) {
		const tabLevel = (level || 0) + 1;
		const children = ui.menu.getChildren(tree);
		const list = E('ul', { 'class': 'cbi-tabmenu' });
		let activeNode = null;

		if (children.length === 0)
			return E([]);

		children.forEach((child) => {
			const isActive = (L.env.dispatchpath[tabLevel + 2] === child.name);
			const className = 'tabmenu-item-%s%s'.format(child.name, isActive ? ' cbi-tab' : '');

			if (isActive)
				activeNode = child;

			list.appendChild(E('li', { 'class': className }, [
				E('a', {
					'href': L.url(url, child.name),
					'aria-current': isActive ? 'page' : null
				}, [ _(child.title) ])
			]));
		});

		this.nodes.tabMenu.appendChild(list);
		this.nodes.tabMenu.style.display = '';

		if (activeNode)
			this.nodes.tabMenu.appendChild(this.renderTabMenu(activeNode, url + '/' + activeNode.name, tabLevel));

		return list;
	},

	bindLocalHandlers() {
		if (this.nodes.navigationToggle && this.nodes.navigationToggle.dataset.appleBound !== 'true') {
			this.nodes.navigationToggle.dataset.appleBound = 'true';
			this.nodes.navigationToggle.addEventListener('click', this.boundHandlers.sidebarToggle);
		}

		if (this.nodes.mainMenu && this.nodes.mainMenu.dataset.appleBound !== 'true') {
			this.nodes.mainMenu.dataset.appleBound = 'true';
			this.nodes.mainMenu.addEventListener('click', this.boundHandlers.mainMenuClick);
		}
	},

	handleMainMenuClick(ev) {
		const disclosure = ev.target.closest('.mainmenu-disclosure');

		if (disclosure && this.nodes.mainMenu.contains(disclosure)) {
			ev.preventDefault();
			ev.stopPropagation();
			this.toggleMenuItem(disclosure.closest('li.has-children'));
			return;
		}

		const link = ev.target.closest('a');

		if (!link || !this.nodes.mainMenu.contains(link))
			return;

		this.handleMenuFollow();
	},

	handleSidebarToggle(ev) {
		ev.preventDefault();

		if (document.body.classList.contains('sidebar-open'))
			this.closeSidebar();
		else
			this.openSidebar();
	},

	handleMenuFollow() {
		if (!this.isCompactView())
			return;

		window.setTimeout(() => this.closeSidebar(), 10);
	},

	handleDropdownClickCapture(ev) {
		const dropdown = ev.target.closest?.('.cbi-dropdown');

		if (!dropdown || !this.isManagedDropdown(dropdown))
			return;

		this.closeSiblingDropdowns(dropdown);
		this.scheduleDropdownSanitize();

		if (!dropdown.hasAttribute('open') || ev.target.closest('ul.dropdown'))
			return;

		this.closeDropdown(dropdown);
		window.setTimeout(() => this.closeDropdown(dropdown), 0);
		window.setTimeout(() => this.closeDropdown(dropdown), 40);
		ev.preventDefault();
		ev.stopPropagation();

		if (ev.stopImmediatePropagation)
			ev.stopImmediatePropagation();
	},

	getDropdownRoots() {
		const roots = [];
		const modal = document.getElementById('modal_overlay');

		if (this.nodes.content)
			roots.push(this.nodes.content);

		if (modal)
			roots.push(modal);

		return roots;
	},

	isManagedDropdown(dropdown) {
		return !!dropdown && this.getDropdownRoots().some((root) => root.contains(dropdown));
	},

	handleDocumentClick(ev) {
		if (!this.isCompactView() || !document.body.classList.contains('sidebar-open'))
			return;

		if ((this.nodes.mainMenu && this.nodes.mainMenu.contains(ev.target)) || (this.nodes.navigationToggle && this.nodes.navigationToggle.contains(ev.target)))
			return;

		this.closeSidebar();
	},

	handleDocumentKeydown(ev) {
		if (ev.key === 'Escape')
			this.closeSidebar();
	},

	handleWindowResize() {
		this.syncSidebarState();
		this.handleWindowScroll();
	},

	handleWindowScroll() {
		document.body.classList.toggle('scrolled', window.scrollY > 8);
	},

	bindGlobalHandlers() {
		if (this.handlersBound)
			return;

		this.handlersBound = true;
		document.addEventListener('click', this.boundHandlers.dropdownClickCapture, true);
		document.addEventListener('click', this.boundHandlers.documentClick);
		document.addEventListener('keydown', this.boundHandlers.documentKeydown);
		window.addEventListener('resize', this.boundHandlers.windowResize);
		window.addEventListener('scroll', this.boundHandlers.windowScroll, { passive: true });
	},

		observeContent() {
			if (this.observerBound || !this.nodes.content || typeof MutationObserver === 'undefined')
				return;

			this.observerBound = true;
			this.contentObserver = new MutationObserver((mutations) => {
				let needsContentPass = false;
				const progressBars = new Set();

				mutations.forEach((mutation) => {
					if (mutation.type === 'attributes') {
						const target = mutation.target;
						const bar = target?.matches?.('.cbi-progressbar')
							? target
							: target?.closest?.('.cbi-progressbar');

						if (bar) {
							progressBars.add(bar);
							return;
						}

						if (target?.matches?.('.cbi-dropdown') || target?.closest?.('.cbi-dropdown')) {
							needsContentPass = true;
							return;
						}

						return;
					}

					if (mutation.type !== 'childList')
						return;

					const targetBar = mutation.target?.matches?.('.cbi-progressbar')
						? mutation.target
						: mutation.target?.closest?.('.cbi-progressbar');

					if (targetBar) {
						progressBars.add(targetBar);
						return;
					}

					needsContentPass = true;
				});

				if (progressBars.size)
					this.scheduleProgressBarDecoration(progressBars);

				if (needsContentPass)
					this.scheduleContentDecoration();
			});

			this.contentObserver.observe(this.nodes.content, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: [ 'title', 'style', 'open', 'display', 'selected', 'class' ]
			});
		},

		scheduleContentDecoration() {
			if (this.contentDecorateFrame)
				return;

				this.contentDecorateFrame = window.requestAnimationFrame(() => {
					this.contentDecorateFrame = 0;

					if (this.shouldUseLightweightLiveDecoration()) {
						this.decorateWideTables();
						this.decorateSurfaceTaxonomy();
						this.normalizeZeroTierConfigTable();

						this.decorateProgressBars();
						this.decorateLayoutSignals();
					this.decorateStatusOverview();
					return;
				}

					this.decorateContent();
			});
		},

			shouldUseLightweightLiveDecoration() {
				const pageKey = document.body?.dataset?.page || '';

				return this.hasAnimatedInitialContent &&
					/^admin-status(?:-|$)/.test(pageKey);
			},

		scheduleProgressBarDecoration(progressBars) {
			if (!this.pendingProgressBars)
				this.pendingProgressBars = new Set();

			progressBars.forEach((bar) => {
				if (bar && this.nodes.content?.contains(bar))
					this.pendingProgressBars.add(bar);
			});

			if (this.progressDecorateFrame)
				return;

			this.progressDecorateFrame = window.requestAnimationFrame(() => {
				const bars = Array.from(this.pendingProgressBars || []);

				this.progressDecorateFrame = 0;
				this.pendingProgressBars?.clear();
				this.decorateProgressBars(bars);
			});
		},

					decorateContent() {
						this.decorateWideTables();
						this.normalizeOpenClashLayout();
						this.decorateSurfaceTaxonomy();
						this.normalizeZeroTierConfigTable();
					this.decorateServicesFlexLayouts();
					this.decorateProgressBars();
					this.decorateLayoutSignals();
					this.decorateDropdowns();
				this.scheduleWideTablePasses();
				this.decorateNetworkInterfaces();
				this.decorateStartupActions();
				this.decorateStatusOverview();

				let index = 0;
				const shouldAnimate = !this.hasAnimatedInitialContent;
				const targets = Array.from(this.nodes.content.querySelectorAll(this.contentSelector));

				targets.forEach((element) => {
					if (element.dataset.appleAnimated === 'true')
						return;

					element.dataset.appleAnimated = 'true';

					if (shouldAnimate) {
						element.classList.add('fade-in');
						element.style.setProperty('--apple-delay', '%dms'.format(Math.min(index * 45, 180)));
					}

					index++;
				});

				if (targets.length > 0)
					this.hasAnimatedInitialContent = true;
				},

			decorateProgressBars(bars) {
				if (!this.nodes.content)
					return;

			const candidates = bars
				? Array.from(bars).filter((bar) => bar?.isConnected && this.nodes.content.contains(bar))
				: Array.from(this.nodes.content.querySelectorAll('.cbi-progressbar'));

			candidates.forEach((bar) => {
				const legacyTrack = bar.querySelector(':scope > .apple-progress-track');
				const detail = this.ensureProgressNode(bar, 'span', 'apple-progress-detail');
				const value = this.ensureProgressNode(bar, 'span', 'apple-progress-value');
				const legacyFill = legacyTrack?.querySelector(':scope > .apple-progress-fill');

				if (legacyFill)
					bar.appendChild(legacyFill);

				if (legacyTrack)
					legacyTrack.remove();

				const fill = bar.querySelector(':scope > div');
				const rawTitle = bar.getAttribute('title') || fill?.getAttribute('title') || '';
				const percent = this.parseProgressPercent(rawTitle, fill);
				const labelText = this.getProgressLabel(bar);
				const progressKind = this.getProgressKind(bar, labelText, rawTitle);
				const detailText = this.formatProgressDetail(rawTitle, progressKind);

				if (fill) {
					fill.classList.add('apple-progress-fill');
					fill.setAttribute('aria-hidden', 'true');
				}

				if (detail.parentElement !== bar)
					bar.insertBefore(detail, bar.firstChild);

				if (value.parentElement !== bar)
					bar.insertBefore(value, fill || null);

				this.setTextIfChanged(detail, detailText || rawTitle || _('Usage'));
				this.setTextIfChanged(value, Number.isFinite(percent) ? '%d%%'.format(Math.round(percent)) : '');
				this.setDatasetIfChanged(bar, 'appleProgressDecorated', 'true');
				this.setDatasetIfChanged(bar, 'progressEmpty', Number.isFinite(percent) && percent <= 0 ? 'true' : 'false');
				this.setDatasetIfChanged(bar, 'progressKind', progressKind);
				bar.classList.toggle('apple-progress-inverse', progressKind === 'available');
				bar.classList.toggle('apple-progress-package-disk', progressKind === 'package-disk');

				if (progressKind === 'package-disk') {
					const control = bar.parentElement;
					const controls = control?.parentElement;

					if (control && controls?.classList?.contains('controls')) {
						control.classList.add('apple-package-disk-control');
						controls.classList.add('apple-package-controls-with-progress');
					}
				}

					if (Number.isFinite(percent)) {
						const bounded = Math.max(0, Math.min(100, percent));
						const pressure = progressKind === 'available' ? 100 - bounded : bounded;

					this.setDatasetIfChanged(bar, 'progressPercent', '%d'.format(Math.round(bounded)));
					this.setDatasetIfChanged(bar, 'progressPressure', '%d'.format(Math.round(pressure)));
					this.setDatasetIfChanged(bar, 'progressLevel', this.getProgressLevel(pressure));
					this.setAttributeIfChanged(bar, 'role', 'progressbar');
					this.setAttributeIfChanged(bar, 'aria-valuemin', '0');
					this.setAttributeIfChanged(bar, 'aria-valuemax', '100');
					this.setAttributeIfChanged(bar, 'aria-valuenow', '%d'.format(Math.round(bounded)));
					this.setAttributeIfChanged(bar, 'aria-valuetext', detailText ? '%s, %d%%'.format(detailText, Math.round(bounded)) : '%d%%'.format(Math.round(bounded)));

						if (fill) {
							const width = '%.2f%%'.format(bounded);

							if (fill.style.width !== width)
								fill.style.width = width;
						}
					}
				else {
					this.deleteDatasetIfPresent(bar, 'progressPercent');
					this.deleteDatasetIfPresent(bar, 'progressPressure');
					this.setDatasetIfChanged(bar, 'progressLevel', 'unknown');
					this.removeAttributeIfPresent(bar, 'aria-valuenow');
					this.removeAttributeIfPresent(bar, 'aria-valuetext');
				}
			});
		},

		setTextIfChanged(node, value) {
			const text = String(value || '');

			if (node && node.textContent !== text)
				node.textContent = text;
		},

		setAttributeIfChanged(node, name, value) {
			const text = String(value);

			if (node && node.getAttribute(name) !== text)
				node.setAttribute(name, text);
		},

		removeAttributeIfPresent(node, name) {
			if (node?.hasAttribute(name))
				node.removeAttribute(name);
		},

		setDatasetIfChanged(node, name, value) {
			const text = String(value);

			if (node?.dataset && node.dataset[name] !== text)
				node.dataset[name] = text;
		},

		deleteDatasetIfPresent(node, name) {
			if (node?.dataset && Object.prototype.hasOwnProperty.call(node.dataset, name))
				delete node.dataset[name];
		},

		ensureProgressNode(parent, tagName, className) {
			let node = parent.querySelector(':scope > .' + className);

			if (!node)
				node = E(tagName, { 'class': className });

			return node;
		},

		parseProgressPercent(title, fill) {
			const titleMatch = String(title || '').match(/\(\s*(\d+(?:\.\d+)?)%\s*\)/);
			const styleMatch = String(fill?.getAttribute('style') || '').match(/width\s*:\s*(\d+(?:\.\d+)?)%/i);
			const value = titleMatch ? Number(titleMatch[1]) : (styleMatch ? Number(styleMatch[1]) : NaN);

			return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : NaN;
		},

		getProgressLabel(bar) {
			const directLabel = bar.parentElement?.querySelector?.(':scope > label');

			if (directLabel)
				return directLabel.textContent.replace(/\s+/g, ' ').trim();

			const row = bar.closest('tr, .tr, .cbi-value');
			const rowLabel = row?.querySelector?.('td:first-child, .td:first-child, .cbi-value-title');

			return rowLabel ? rowLabel.textContent.replace(/\s+/g, ' ').trim() : '';
		},

		getProgressKind(bar, label, title) {
			const pageKey = document.body?.dataset?.page || '';
			const labelText = String(label || '').toLowerCase();
			const titleText = String(title || '').toLowerCase();

			if (pageKey === 'admin-system-package-manager' && /disk|space|磁盘|空间/.test(labelText))
				return 'package-disk';

			if (/(^|\s)(total\s+)?available($|\s)|free\s+memory|memory\s+free|可用|可用数|空闲/.test(labelText) &&
				!/(disk|space|storage|temp|mount|connection|磁盘|空间|存储|临时|连接)/.test(labelText + ' ' + titleText))
				return 'available';

			return 'used';
		},

		formatProgressDetail(title, progressKind) {
			const raw = String(title || '').trim();

			if (progressKind === 'package-disk') {
				const diskMatch = raw.match(/^\s*\d+(?:\.\d+)?%\s*(?:used|已使用|已用)\s*[\(（]\s*(.*?)\s*[\)）]\s*$/i);
				const detail = diskMatch ? diskMatch[1] : raw.replace(/^\s*\d+(?:\.\d+)?%\s*(?:used|已使用|已用)\s*/i, '');

				return detail
					.replace(/\s*,\s*/g, ' · ')
					.replace(/\s*，\s*/g, ' · ')
					.trim();
			}

			return raw.replace(/\s*\(\s*\d+(?:\.\d+)?%\s*\)\s*$/, '').trim();
		},

		decorateSurfaceTaxonomy() {
			if (!this.nodes.content)
				return;

			const visible = (element) => {
				if (!element || !(element instanceof Element))
					return false;

				const style = window.getComputedStyle(element);
				const rect = element.getBoundingClientRect();

				return style.display !== 'none' &&
					style.visibility !== 'hidden' &&
					rect.width > 0 &&
					rect.height > 0;
			};
			const tableSelector = 'table.cbi-section-table, table.table, div.table, .apple-table-scroll';
			const actionSelector = 'button, .btn, .cbi-button, input[type="button"], input[type="submit"]';
			const controlSelector = 'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]), select, textarea, .cbi-dropdown';
			const compositeSelector = '.apple-table-scroll, table, .table, fieldset, .cbi-map, .cbi-section, .cbi-section-node';

			this.nodes.content.querySelectorAll('ul.cbi-tabmenu, .cbi-tabmenu:not(#mainmenu):not(#modemenu), #tabmenu, #tab-header').forEach((tabs) => {
				if (tabs.closest('#mainmenu, #modemenu, #modal_overlay'))
					return;

				tabs.classList.add('apple-pill-tabs');
			});

			this.nodes.content.querySelectorAll('table.cbi-section-table, table.table, div.table').forEach((table) => {
				if (table.closest('#mainmenu, #modemenu, #modal_overlay, .ifacebox'))
					return;

				table.classList.add('apple-cbi-table');
				this.classifyTableDensity(table);
			});

			this.nodes.content.querySelectorAll('.cbi-value').forEach((value) => {
				const field = value.querySelector(':scope > .cbi-value-field');
				const hasComposite = !!field?.querySelector(compositeSelector);
				const hasAction = !!value.querySelector(actionSelector);
				const hasControl = !!value.querySelector(controlSelector);

				value.classList.toggle('apple-composite-value', hasComposite);
				value.classList.toggle('apple-action-value', hasAction && !hasComposite);
				value.classList.toggle('apple-control-value', hasControl && !hasComposite);
			});

			this.nodes.content.querySelectorAll('.cbi-map, .cbi-section, .cbi-section-node').forEach((section) => {
				if (section.closest('#mainmenu, #modemenu, #modal_overlay'))
					return;

				const directTable = !!section.querySelector(':scope > .apple-table-scroll, :scope > table.cbi-section-table, :scope > table.table, :scope > div.table');
				const nestedTable = section.classList.contains('cbi-tblsection') && !!section.querySelector('table.cbi-section-table, table.table, div.table');
				const tableCount = section.querySelectorAll('table.cbi-section-table, table.table, div.table').length;
				const valueCount = Array.from(section.querySelectorAll(':scope > .cbi-value')).filter(visible).length;
				const actionCount = section.querySelectorAll(actionSelector).length;
				const controlCount = section.querySelectorAll(controlSelector).length;
				const hasDirectStructure = !!section.querySelector(':scope > .cbi-map, :scope > .cbi-section, :scope > .cbi-section-node, :scope > [data-tab-title]');
				const hasOnlyHiddenDescription = Array.from(section.querySelectorAll(':scope > .cbi-section-descr, :scope > .cbi-map-descr'))
					.every((descr) => !String(descr.textContent || '').replace(/\s+/g, '').length);

				section.classList.toggle('apple-table-section', directTable || nestedTable || tableCount > 0);
				section.classList.toggle('apple-action-section', actionCount > 0 && tableCount === 0 && controlCount <= Math.max(actionCount + 1, 2));
				section.classList.toggle('apple-form-section', valueCount >= 2 && controlCount > 0 && tableCount === 0);
				section.classList.toggle('apple-structure-section', hasDirectStructure && tableCount === 0 && actionCount === 0);
				section.classList.toggle('apple-empty-description', hasOnlyHiddenDescription);
			});
		},

		getProgressLevel(percent) {
			const bounded = Math.max(0, Math.min(100, Number(percent)));

			return bounded >= 90 ? 'critical' : bounded >= 75 ? 'high' : bounded >= 50 ? 'medium' : 'low';
		},

		decorateLayoutSignals() {
			if (!this.nodes.content)
				return;

			const pageKey = document.body?.dataset?.page || '';
			const routeMatch = pageKey.match(/^admin-([a-z0-9]+)/);
			const routeGroup = routeMatch ? routeMatch[1] : '';
			const knownGroups = [ 'status', 'system', 'services', 'network', 'nas', 'vpn' ];
			const visible = (element) => {
				const style = window.getComputedStyle(element);
				const rect = element.getBoundingClientRect();

				return style.display !== 'none' &&
					style.visibility !== 'hidden' &&
					rect.width > 0 &&
					rect.height > 0;
			};
			const firstRowColumnCount = (table) => {
				const row = table.querySelector('tr, .tr');

				return row ? Array.from(row.children).filter((cell) => visible(cell)).length : 0;
			};
			const tables = Array.from(this.nodes.content.querySelectorAll('table.cbi-section-table, table.table, div.table'))
				.filter((table) => visible(table) && !table.closest('.ifacebox, .cbi-tabmenu, .network-status-table'));
			const wideTables = tables.filter((table) =>
				table.classList.contains('apple-wide-table') ||
				firstRowColumnCount(table) >= 6 ||
				table.scrollWidth > table.clientWidth + 24
			);
			const nestedCards = Array.from(this.nodes.content.querySelectorAll([
				'.cbi-map > .cbi-map',
				'.cbi-map > .cbi-section',
				'.cbi-map > .cbi-section-node',
				'.cbi-map .cbi-section.cbi-tblsection',
				'.cbi-map .cbi-section-node.cbi-tblsection',
				'.cbi-section .cbi-section',
				'.cbi-section .cbi-section-node',
				'.cbi-section-node .cbi-section',
				'.cbi-section-node .cbi-section-node',
				'.cbi-section-node .cbi-section.cbi-tblsection',
				'.cbi-section-node .cbi-section-node.cbi-tblsection'
			].join(', ')))
				.filter(visible);
			const values = Array.from(this.nodes.content.querySelectorAll('.cbi-value')).filter(visible);
			const actions = Array.from(this.nodes.content.querySelectorAll([
				'td.cbi-section-actions',
				'.td.cbi-section-actions',
				'.cbi-page-actions',
				'.button-row',
				'.right',
				'.controls'
			].join(', '))).filter(visible);
			const controls = Array.from(this.nodes.content.querySelectorAll([
				'input:not([type="checkbox"]):not([type="radio"])',
				'select',
				'textarea',
				'.cbi-dropdown'
			].join(', '))).filter((control) =>
				visible(control) &&
				!control.closest('#mainmenu, #modemenu, .cbi-tabmenu')
			);
			const contentClasses = [
				'apple-route-status',
				'apple-route-system',
				'apple-route-services',
				'apple-route-network',
				'apple-route-nas',
				'apple-route-vpn',
				'apple-content-dense',
				'apple-form-heavy',
				'apple-action-heavy',
				'apple-has-wide-tables',
				'apple-has-nested-cards',
				'apple-has-dynlist',
				'apple-has-open-dropdown',
				'apple-has-service-dashboard'
			];

			this.nodes.content.classList.remove(...contentClasses);

			if (knownGroups.includes(routeGroup))
				this.nodes.content.classList.add(`apple-route-${routeGroup}`);

			this.nodes.content.classList.toggle('apple-content-dense', tables.length >= 2 || values.length >= 10 || controls.length >= 12);
			this.nodes.content.classList.toggle('apple-form-heavy', values.length >= 6 || controls.length >= 8);
			this.nodes.content.classList.toggle('apple-action-heavy', actions.length >= 2 || this.nodes.content.querySelectorAll('td.cbi-section-actions .btn, td.cbi-section-actions .cbi-button, .td.cbi-section-actions .btn, .td.cbi-section-actions .cbi-button').length >= 2);
			this.nodes.content.classList.toggle('apple-has-wide-tables', wideTables.length > 0);
			this.nodes.content.classList.toggle('apple-has-nested-cards', nestedCards.length > 0);
			this.nodes.content.classList.toggle('apple-has-dynlist', !!this.nodes.content.querySelector('.cbi-dynlist, .add-item.control-group'));
			this.nodes.content.classList.toggle('apple-has-open-dropdown', !!this.nodes.content.querySelector('.cbi-dropdown[open]'));
			this.nodes.content.classList.toggle('apple-has-service-dashboard', !!this.nodes.content.querySelector('.apple-service-dashboard-panel'));
		},

	decorateDropdowns() {
		const roots = this.getDropdownRoots();

		if (!roots.length)
			return;

		roots.forEach((root) => {
			root.querySelectorAll('.cbi-dropdown').forEach((dropdown) => {
				this.cleanupDropdownStrays(dropdown);
				this.cleanupDropdownPreview(dropdown);
				this.cleanupDropdownMenu(dropdown);
				this.normalizeActionDropdown(dropdown);
				this.cleanupDropdownState(dropdown);

				if (dropdown.dataset.appleDropdownBound === 'true')
					return;

				dropdown.dataset.appleDropdownBound = 'true';
				dropdown.addEventListener('click', (ev) => {
						if (dropdown.hasAttribute('open') && !ev.target.closest('ul.dropdown')) {
							this.closeDropdown(dropdown);
							window.setTimeout(() => this.closeDropdown(dropdown), 0);
							window.setTimeout(() => this.closeDropdown(dropdown), 40);
							ev.preventDefault();
							ev.stopPropagation();

							if (ev.stopImmediatePropagation)
								ev.stopImmediatePropagation();

							return;
						}

						this.scheduleDropdownSanitize();
					}, true);
				dropdown.addEventListener('keydown', (ev) => {
						if (ev.key === 'Escape' && dropdown.hasAttribute('open')) {
							this.closeDropdown(dropdown);
							ev.preventDefault();
							ev.stopPropagation();
							return;
						}

						this.scheduleDropdownSanitize();
					}, true);
			});
		});

		roots.forEach((root) => {
			root.querySelectorAll('.cbi-dropdown[open]').forEach((dropdown) => {
				this.cleanupDropdownMenu(dropdown);
				this.alignDropdownMenu(dropdown);
			});
		});

		this.decorateLayoutSignals();
		},

		cleanupDropdownState(dropdown) {
			if (!dropdown || dropdown.hasAttribute('open'))
				return;

			this.cleanupDropdownStrays(dropdown);
			this.cleanupDropdownPreview(dropdown);
			dropdown.classList.remove('apple-dropdown-up');
			dropdown.style.removeProperty('--apple-dropdown-max-height');
			delete dropdown.dataset.appleDropdownScrollReset;
			dropdown.closest('.cbi-value-field, .td, td')?.classList.remove('cbi-dropdown-open');
		},

		cleanupDropdownStrays(dropdown) {
			if (!dropdown || dropdown.hasAttribute('multiple'))
				return;

			dropdown.querySelectorAll(':scope > ul.dropdown.preview').forEach((list) => list.remove());
		},

		cleanupDropdownPreview(dropdown) {
			if (!dropdown || dropdown.hasAttribute('multiple'))
				return;

			const preview = dropdown.querySelector(':scope > ul:not(.dropdown)');

			if (!preview)
				return;

			const items = Array.from(preview.children).filter((item) => item.matches?.('li'));

			if (items.length <= 1) {
				items.forEach((item) => {
					item.setAttribute('display', '');
					item.style.removeProperty('display');
					delete item.dataset.appleDropdownPreviewHidden;
				});
				return;
			}

			const selectedItems = items.filter((item) => item.hasAttribute('selected'));
			const displayItems = items.filter((item) => item.hasAttribute('display'));
			const selected =
				selectedItems[selectedItems.length - 1] ||
				displayItems[displayItems.length - 1] ||
				items[0];

			items.forEach((item) => {
				item.style.removeProperty('display');

				if (item === selected) {
					item.setAttribute('display', '');
					delete item.dataset.appleDropdownPreviewHidden;
				}
				else {
					item.removeAttribute('display');
					item.dataset.appleDropdownPreviewHidden = 'true';
				}
			});
		},

		cleanupDropdownMenu(dropdown) {
			if (!dropdown || dropdown.hasAttribute('multiple'))
				return;

			const menu = dropdown.querySelector(':scope > ul.dropdown');

			if (!menu)
				return;

			const items = Array.from(menu.children).filter((item) => item.matches?.('li'));
			const groups = new Map();

			const itemKey = (item) => {
				const raw =
					item.textContent ||
					item.getAttribute('data-value') ||
					item.getAttribute('value') ||
					'';
				return raw.replace(/\s+/g, ' ').trim();
			};

			items.forEach((item) => {
				delete item.dataset.appleDropdownDuplicate;
				delete item.dataset.appleDropdownSelectedProxy;
				delete item.dataset.appleDropdownPreviewHidden;
				item.style.removeProperty('display');
			});

			items.forEach((item) => {
				const key = itemKey(item);

				if (!key)
					return;

				if (!groups.has(key))
					groups.set(key, []);

				groups.get(key).push(item);
			});

			groups.forEach((group) => {
				if (group.length <= 1)
					return;

				const keep = group[0];
				const selected = group.find((item) => item.hasAttribute('selected'));

				if (selected && selected !== keep)
					keep.dataset.appleDropdownSelectedProxy = 'true';

				group.forEach((item) => {
					if (item !== keep)
						item.dataset.appleDropdownDuplicate = 'true';
				});
			});
		},

	cleanupDropdownStates() {
		const roots = this.getDropdownRoots();

		if (!roots.length)
			return;

		roots.forEach((root) => root.querySelectorAll('.cbi-dropdown').forEach((dropdown) => this.cleanupDropdownState(dropdown)));
	},

	closeSiblingDropdowns(activeDropdown) {
		const roots = this.getDropdownRoots();

		if (!roots.length)
			return;

		roots.forEach((root) => root.querySelectorAll('.cbi-dropdown[open]').forEach((dropdown) => {
				if (dropdown === activeDropdown)
					return;

				dropdown.removeAttribute('open');
				this.cleanupDropdownState(dropdown);
			}));
	},

	sanitizeDropdowns() {
		const roots = this.getDropdownRoots();

		if (!roots.length)
			return;

		const dropdowns = roots.flatMap((root) => Array.from(root.querySelectorAll('.cbi-dropdown')));

			dropdowns.forEach((dropdown) => {
				this.cleanupDropdownStrays(dropdown);
				this.cleanupDropdownPreview(dropdown);
				this.cleanupDropdownMenu(dropdown);
				this.normalizeActionDropdown(dropdown);
				this.cleanupDropdownState(dropdown);
			});

			dropdowns.forEach((dropdown) => {
				if (dropdown.hasAttribute('open'))
					this.alignDropdownMenu(dropdown);
			});

			this.decorateLayoutSignals();
		},

		scheduleDropdownSanitize() {
			if (this.dropdownSanitizeFrame)
				return;

			const run = () => this.sanitizeDropdowns();

			this.dropdownSanitizeFrame = window.requestAnimationFrame(() => {
				this.dropdownSanitizeFrame = 0;
				run();
				window.requestAnimationFrame(run);
				window.setTimeout(run, 0);
				window.setTimeout(run, 80);
				window.setTimeout(run, 200);
			});
		},

		closeDropdown(dropdown) {
			if (!dropdown)
				return;

			dropdown.removeAttribute('open');
			this.cleanupDropdownState(dropdown);
			this.cleanupDropdownStates();
		},

		alignDropdownMenu(dropdown) {
			if (!dropdown || !dropdown.hasAttribute('open'))
				return;

			const menu = dropdown.querySelector(':scope > ul.dropdown');

			if (!menu)
				return;

			dropdown.classList.remove('apple-dropdown-up');
			if (
				dropdown.dataset.appleDropdownScrollReset !== 'true' &&
				document.body?.dataset?.page === 'admin-system-cpulimit'
			) {
				const resetScroll = () => {
					if (dropdown.hasAttribute('open'))
						menu.scrollTop = 0;
				};

				resetScroll();
				window.setTimeout(resetScroll, 0);
				window.setTimeout(resetScroll, 80);
				window.setTimeout(resetScroll, 180);
				dropdown.dataset.appleDropdownScrollReset = 'true';
			}

			const rect = dropdown.getBoundingClientRect();
			const menuRect = menu.getBoundingClientRect();
			const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
			const actionBar = dropdown.closest('#maincontent')?.querySelector('.cbi-page-actions');
			const actionRect = actionBar ? actionBar.getBoundingClientRect() : null;
			const lowerBound = actionRect && actionRect.top > rect.bottom && actionRect.top < viewportHeight
				? Math.max(0, actionRect.top - 14)
				: viewportHeight;
			const spaceBelow = Math.max(0, lowerBound - rect.bottom - 10);
			const spaceAbove = Math.max(0, rect.top - 16);
			const wantedHeight = Math.min(menu.scrollHeight || menuRect.height || 0, Math.max(220, viewportHeight * 0.56));

			if (spaceBelow < Math.min(wantedHeight, 260) && spaceAbove > spaceBelow) {
				dropdown.classList.add('apple-dropdown-up');
				dropdown.style.setProperty('--apple-dropdown-max-height', `${Math.max(140, Math.min(420, spaceAbove))}px`);
			}
			else {
				dropdown.style.setProperty('--apple-dropdown-max-height', `${Math.max(140, Math.min(420, spaceBelow || viewportHeight - rect.bottom - 16))}px`);
			}
		},

		normalizeActionDropdown(dropdown) {
			if (!dropdown || !dropdown.matches('.cbi-page-actions .cbi-dropdown.btn.cbi-button, .button-row .cbi-dropdown.btn.cbi-button, .diag-action .cbi-dropdown.btn.cbi-button'))
				return;

			dropdown.classList.add('apple-action-dropdown');

			const preview = dropdown.querySelector(':scope > ul:not(.dropdown)');

			if (!preview)
				return;

			this.cleanupDropdownPreview(dropdown);
		},

		scheduleWideTablePasses() {
			const pageKey = document.body?.dataset?.page || '';

			if (!pageKey || this.wideTablePageKey === pageKey)
				return;

			this.wideTablePageKey = pageKey;

			[80, 240, 640, 1280].forEach((delay) => {
				window.setTimeout(() => this.decorateWideTables(), delay);
				window.setTimeout(() => this.normalizeZeroTierConfigTable(), delay);
			});
		},

		syncOverviewDecorationLoop() {
			const isOverview = document.body.dataset.page === 'admin-status-overview';

			if (!isOverview) {
				if (this.statusOverviewRefreshTimer) {
					window.clearInterval(this.statusOverviewRefreshTimer);
					this.statusOverviewRefreshTimer = null;
				}

				return;
			}

			if (this.statusOverviewRefreshTimer)
				return;

			[80, 240, 640, 1280].forEach((delay) => {
				window.setTimeout(() => this.decorateStatusOverview(), delay);
			});

			this.statusOverviewRefreshTimer = window.setInterval(() => this.decorateStatusOverview(), 1200);
		},

		syncNetworkInterfacesDecorationLoop() {
			const isNetworkInterfaces = document.body.dataset.page === 'admin-network-network';

			if (!isNetworkInterfaces) {
				if (this.networkInterfacesRefreshTimer) {
					window.clearInterval(this.networkInterfacesRefreshTimer);
					this.networkInterfacesRefreshTimer = null;
				}

				return;
			}

			if (this.networkInterfacesRefreshTimer)
				return;

			[40, 120, 320, 800, 1600].forEach((delay) => {
				window.setTimeout(() => this.decorateNetworkInterfaces(), delay);
			});

			this.networkInterfacesRefreshTimer = window.setInterval(() => this.decorateNetworkInterfaces(), 1400);
		},

		decorateWideTables() {
			if (!this.nodes.content)
				return;

			const pageKey = document.body?.dataset?.page || '';
			const isOpenVPNCreateTable = (table) =>
				pageKey === 'admin-vpn-openvpn' &&
				table.matches('div.table.cbi-section-table') &&
				(!!table.querySelector('#div_add, #div_upload') || /Template based configuration|OVPN configuration file upload|基于模板|配置文件上传/.test(table.textContent || ''));
			const includePseudoTables =
				/^(admin-(?:nas|services)-|admin-vpn(?:-|$)|admin-system-(?:opkg|package-manager|mounts|flashops|flash|repokeys|cpulimit)|admin-status-(?:firewall|nftables|iptables|processes))/.test(pageKey) ||
				pageKey === 'admin-system-admin-repokeys' ||
				(/^admin-network(?:-|$)/.test(pageKey) && pageKey !== 'admin-network-network');
			const selector = includePseudoTables ? 'table.cbi-section-table, table.table, div.table' : 'table.cbi-section-table, table.table';
			const tagMountsTable = (table) => {
				if (pageKey !== 'admin-system-mounts' || !table.matches('table.cbi-section-table'))
					return;

				const heading = table.closest('.cbi-section, .cbi-section-node, .cbi-map')
					?.querySelector(':scope > h2, :scope > h3, :scope > legend')
					?.textContent || '';
				const headers = Array.from(table.querySelectorAll('th, .th'))
					.map((cell) => cell.textContent || '')
					.join(' ');
				const text = `${heading} ${headers}`;
				const isMountpoints = /(?:Mount point|Mount options|挂载点|挂载选项)/i.test(text) ||
					!!table.querySelector('[data-name="target"], [data-name="options"], [data-name="fstype"]');
				const isSwap = !isMountpoints && /(?:SWAP|Swap|交换分区|交换)/i.test(text);

				table.classList.toggle('apple-mountpoints-table', isMountpoints);
				table.classList.toggle('apple-swap-table', isSwap);

				if (!isSwap || table.dataset.appleSwapStatic === 'true')
					return;

				table.dataset.appleSwapStatic = 'true';
				table.querySelectorAll('tr.cbi-section-table-titles, tr.table-titles').forEach((row) => {
					row.classList.add('apple-static-table-header');
					row.querySelectorAll('th[data-sortable-row], .th[data-sortable-row]').forEach((cell) => {
						cell.removeAttribute('data-sortable-row');
						cell.removeAttribute('data-sort-direction');
					});
					row.addEventListener('click', (ev) => {
						ev.preventDefault();
						ev.stopImmediatePropagation();
					}, true);
				});
				table.querySelectorAll('.drag-handle').forEach((handle) => {
					handle.hidden = true;
					handle.disabled = true;
					handle.removeAttribute('draggable');
					handle.style.display = 'none';
				});
			};

			this.nodes.content.querySelectorAll(selector).forEach((table) => {
				tagMountsTable(table);
				this.classifyTableDensity(table);

				if (/^admin-services-openclash(?:-|$)/.test(pageKey) && table.closest('.oc') && !table.closest('[id^="cbi-openclash-"]'))
					return;

				if (isOpenVPNCreateTable(table)) {
					table.classList.add('apple-openvpn-create-table');

					const wrapper = table.closest('.apple-table-scroll');

					if (wrapper) {
						wrapper.parentNode.insertBefore(table, wrapper);
						wrapper.remove();
					}

					return;
				}

				if (table.closest('.apple-table-scroll'))
					return;

				if (table.closest('.ifacebox'))
					return;

				if (pageKey === 'admin-network-network' && table.querySelector('[data-name="_ifacebox"], [data-name="_ifacestat"]'))
					return;

				if (table.matches('div.table') && table.closest('.cbi-tabmenu'))
					return;

				const wrapper = E('div', { 'class': 'apple-table-scroll' });

				table.parentNode.insertBefore(wrapper, table);
				wrapper.appendChild(table);
			});
		},

		classifyTableDensity(table) {
			if (!table)
				return;

			const firstRow = table.querySelector('tr, .tr');
			const columnCount = firstRow
				? Array.from(firstRow.children).filter((cell) => window.getComputedStyle(cell).display !== 'none').length
				: 0;

			table.classList.toggle('apple-wide-table', columnCount >= 6);
			table.classList.toggle('apple-compact-table', columnCount > 0 && columnCount <= 3);
		},

	normalizeZeroTierConfigTable() {
		if (!this.nodes.content)
			return;

		const pageKey = document.body?.dataset?.page || '';

		if (pageKey !== 'admin-vpn-zerotier' && pageKey !== 'admin-vpn-zerotier-config')
			return;

		const isZeroTierNetworkTable = (table) => {
			if (!table?.matches?.('table.cbi-section-table'))
				return false;

			if (table.querySelector('[data-name="allow_managed"], [data-name="allow_global"], [data-name="allow_default"]'))
				return true;

			const headerText = (table.querySelector('tr.cbi-section-table-titles')?.textContent || table.textContent || '')
				.replace(/\s+/g, ' ')
				.trim();

			return /Network ID|网络\s*ID|Allow managed|允许管理|Allow default|允许默认/.test(headerText);
		};

		const ensureColumns = (table) => {
			const widths = [ '5.8%', '4.5%', '17.8%', '9.5%', '8%', '7.3%', '5.3%', '5%', '4.9%', '4.7%', '27.2%' ];
			let colgroup = table.querySelector(':scope > colgroup[data-apple-zerotier-colgroup="true"]');

			if (!colgroup) {
				colgroup = document.createElement('colgroup');
				colgroup.dataset.appleZerotierColgroup = 'true';
				table.insertBefore(colgroup, table.firstChild);
			}

			widths.forEach((width, index) => {
				let col = colgroup.children[index];

				if (!col) {
					col = document.createElement('col');
					colgroup.appendChild(col);
				}

				col.style.width = width;
				col.style.setProperty('width', width, 'important');
			});

			Array.from(colgroup.children).slice(widths.length).forEach((col) => col.remove());
			table.style.setProperty('table-layout', 'fixed', 'important');
			table.dataset.appleZerotierColumnsReady = 'true';
		};

		const setImportantStyle = (node, property, value) => {
			if (node?.style)
				node.style.setProperty(property, value, 'important');
		};

		const clearImportantStyle = (node, property) => {
			if (node?.style)
				node.style.removeProperty(property);
		};

		const installRuntimeStyle = () => {
			if (document.getElementById('apple-zerotier-runtime-style'))
				return;

			const style = document.createElement('style');
			style.id = 'apple-zerotier-runtime-style';
			style.textContent = `
				body.apple-theme-v2 #maincontent .apple-zerotier-runtime-table tr.apple-zerotier-grid-row {
					display: grid !important;
					grid-template-columns: 5.8% 4.5% 17.8% 9.5% 8% 7.3% 5.3% 5% 4.9% 4.7% 27.2% !important;
					align-items: center !important;
					grid-auto-rows: 64px !important;
					width: 100% !important;
					column-gap: 0 !important;
				}

				body.apple-theme-v2 #maincontent .apple-zerotier-runtime-table tr.apple-zerotier-grid-row > :is(th, td) {
					display: flex !important;
					align-items: center !important;
					align-self: stretch !important;
					box-sizing: border-box !important;
					height: 64px !important;
					min-height: 64px !important;
					min-width: 0 !important;
					padding: 0 10px !important;
					overflow: hidden !important;
					line-height: 1.15 !important;
					white-space: nowrap !important;
					text-overflow: ellipsis !important;
					transform: none !important;
				}

				body.apple-theme-v2 #maincontent .apple-zerotier-runtime-table tr.apple-zerotier-header-row {
					grid-auto-rows: 54px !important;
				}

				body.apple-theme-v2 #maincontent .apple-zerotier-runtime-table tr.apple-zerotier-header-row > :is(th, td) {
					height: 54px !important;
					min-height: 54px !important;
				}

				body.apple-theme-v2 #maincontent .apple-zerotier-runtime-table tr.apple-zerotier-data-row > .apple-zerotier-action-cell {
					grid-column: 11 / 12 !important;
					justify-content: flex-end !important;
					padding-left: 24px !important;
					padding-right: 14px !important;
					overflow: visible !important;
				}

				body.apple-theme-v2 #maincontent .apple-zerotier-runtime-table tr.apple-zerotier-header-row > .apple-zerotier-action-cell {
					grid-column: 11 / 12 !important;
					justify-content: center !important;
					padding-left: 10px !important;
					padding-right: 10px !important;
					overflow: hidden !important;
					text-align: center !important;
				}

				body.apple-theme-v2 #maincontent .apple-zerotier-runtime-table .apple-zerotier-checkbox {
					appearance: none !important;
					-webkit-appearance: none !important;
					box-sizing: border-box !important;
					display: inline-grid !important;
					place-content: center !important;
					width: 15px !important;
					height: 15px !important;
					min-width: 15px !important;
					min-height: 15px !important;
					margin: 0 !important;
					padding: 0 !important;
					border: 1.5px solid rgba(15, 23, 42, 0.42) !important;
					border-radius: 5px !important;
					background: rgba(255, 255, 255, 0.86) !important;
					box-shadow: none !important;
					transform: none !important;
				}

				body.apple-theme-v2 #maincontent .apple-zerotier-runtime-table .apple-zerotier-checkbox:checked {
					border-color: transparent !important;
					background:
						url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='15' height='15' viewBox='0 0 15 15'%3E%3Cpath d='M3.4 7.8 6.1 10.4 11.7 4.5' fill='none' stroke='white' stroke-width='2.1' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 15px 15px no-repeat,
						linear-gradient(135deg, #2388ff, #4f63f1) !important;
					box-shadow: 0 5px 10px rgba(35, 136, 255, 0.16) !important;
				}

				body.apple-theme-v2 #maincontent .apple-zerotier-runtime-table td.cbi-section-actions > div,
				body.apple-theme-v2 #maincontent .apple-zerotier-runtime-table .apple-zerotier-action-strip {
					display: inline-flex !important;
					align-items: center !important;
					justify-content: flex-end !important;
					gap: 8px !important;
					width: max-content !important;
					max-width: 100% !important;
					margin: 0 !important;
					line-height: 1 !important;
					transform: none !important;
				}

				body.apple-theme-v2 #maincontent .apple-zerotier-runtime-table td.cbi-section-actions :is(.btn, .cbi-button, button, input[type="button"], input[type="submit"]) {
					box-sizing: border-box !important;
					display: inline-flex !important;
					align-items: center !important;
					justify-content: center !important;
					flex: 0 0 auto !important;
					min-width: 0 !important;
					max-width: none !important;
					height: 36px !important;
					min-height: 36px !important;
					margin: 0 !important;
					padding: 0 !important;
					border-radius: 15px !important;
					font-size: 13px !important;
					line-height: 1 !important;
					transform: none !important;
				}

				body.apple-theme-v2 #maincontent .apple-zerotier-runtime-table td.cbi-section-actions :is(.drag-handle, .apple-zerotier-drag-button) {
					width: 42px !important;
					min-width: 42px !important;
					max-width: 42px !important;
				}

				body.apple-theme-v2 #maincontent .apple-zerotier-runtime-table td.cbi-section-actions :is(.cbi-button-edit, .apple-zerotier-edit-button) {
					width: 68px !important;
					min-width: 68px !important;
					max-width: 68px !important;
				}

				body.apple-theme-v2 #maincontent .apple-zerotier-runtime-table td.cbi-section-actions :is(.cbi-button-remove, .apple-zerotier-remove-button) {
					width: 72px !important;
					min-width: 72px !important;
					max-width: 72px !important;
				}
			`;
			document.head.appendChild(style);
		};

		const logicalColumnByName = {
			enabled: 2,
			id: 3,
			allow_managed: 4,
			allow_global: 5,
			allow_default: 6,
			allow_dns: 7,
			fw_allow_input: 8,
			fw_allow_forward: 9,
			fw_allow_masq: 10
		};

		const findCellOptionName = (cell) => {
			if (!cell)
				return '';

			if (cell.dataset?.name)
				return cell.dataset.name;

			const named = cell.querySelector('[data-name]');

			if (named?.dataset?.name)
				return named.dataset.name;

			const input = cell.querySelector('input[name], select[name], textarea[name]');
			const name = input?.getAttribute('name') || '';
			const match = name.match(/\\.([^\\.]+)$/);

			return match?.[1] || '';
		};

		const styleCheckbox = (checkbox) => {
			checkbox.classList.add('apple-zerotier-checkbox');
			setImportantStyle(checkbox, 'appearance', 'none');
			setImportantStyle(checkbox, '-webkit-appearance', 'none');
			setImportantStyle(checkbox, 'box-sizing', 'border-box');
			setImportantStyle(checkbox, 'display', 'inline-grid');
			setImportantStyle(checkbox, 'place-content', 'center');
			setImportantStyle(checkbox, 'width', '15px');
			setImportantStyle(checkbox, 'height', '15px');
			setImportantStyle(checkbox, 'min-width', '15px');
			setImportantStyle(checkbox, 'min-height', '15px');
			setImportantStyle(checkbox, 'margin', '0');
			setImportantStyle(checkbox, 'padding', '0');
			setImportantStyle(checkbox, 'border', checkbox.checked ? '0 solid transparent' : '1.5px solid rgba(15, 23, 42, 0.42)');
			setImportantStyle(checkbox, 'border-radius', '5px');
			setImportantStyle(checkbox, 'background', checkbox.checked
				? 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2215%22 height=%2215%22 viewBox=%220 0 15 15%22%3E%3Cpath d=%22M3.4 7.8 6.1 10.4 11.7 4.5%22 fill=%22none%22 stroke=%22white%22 stroke-width=%222.1%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E") center / 15px 15px no-repeat, linear-gradient(135deg, #2388ff, #4f63f1)'
				: 'rgba(255, 255, 255, 0.86)');
			setImportantStyle(checkbox, 'box-shadow', checkbox.checked
				? '0 5px 10px rgba(35, 136, 255, 0.16)'
				: 'none');
			setImportantStyle(checkbox, 'transform', 'none');
			setImportantStyle(checkbox, 'vertical-align', 'middle');

			if (!checkbox.dataset.appleZerotierCheckboxBound) {
				checkbox.dataset.appleZerotierCheckboxBound = 'true';
				checkbox.addEventListener('change', () => styleCheckbox(checkbox));
			}
		};

		const compactHeaders = [
			'名称',
			'启用',
			'网络 ID',
			'管理 IP/路由',
			'全局 IP/路由',
			'默认路由',
			'DNS',
			'入站',
			'转发',
			'NAT',
			'操作'
		];

		const normalizeHeaderCell = (cell, index) => {
			const label = compactHeaders[index];

			if (!label)
				return;

			const originalTitle = cell.dataset.appleOriginalTitle ||
				cell.getAttribute('title') ||
				cell.textContent.replace(/\s+/g, ' ').trim();

			if (originalTitle) {
				cell.dataset.appleOriginalTitle = originalTitle;
				cell.setAttribute('title', originalTitle);
			}

			if (cell.textContent.trim() !== label)
				cell.textContent = label;
		};

		const normalizeActionButtons = (cell, isHeaderRow = false) => {
			const strip = cell.querySelector(':scope > div');

			setImportantStyle(cell, 'grid-column', '11 / 12');
			setImportantStyle(cell, 'width', 'auto');
			setImportantStyle(cell, 'min-width', '0');
			setImportantStyle(cell, 'max-width', 'none');
			setImportantStyle(cell, 'align-items', 'center');
			setImportantStyle(cell, 'align-self', 'stretch');

			if (isHeaderRow) {
				setImportantStyle(cell, 'padding-left', '10px');
				setImportantStyle(cell, 'padding-right', '10px');
				setImportantStyle(cell, 'justify-content', 'center');
				setImportantStyle(cell, 'text-align', 'center');
				setImportantStyle(cell, 'overflow', 'hidden');
				return;
			}

			setImportantStyle(cell, 'padding-left', '24px');
			setImportantStyle(cell, 'padding-right', '14px');
			setImportantStyle(cell, 'justify-content', 'flex-end');
			setImportantStyle(cell, 'text-align', 'right');
			setImportantStyle(cell, 'overflow', 'visible');

			if (strip) {
				strip.classList.add('apple-zerotier-action-strip');
				setImportantStyle(strip, 'display', 'inline-flex');
				setImportantStyle(strip, 'align-items', 'center');
				setImportantStyle(strip, 'justify-content', 'flex-end');
				setImportantStyle(strip, 'gap', '8px');
				setImportantStyle(strip, 'width', 'max-content');
				setImportantStyle(strip, 'max-width', '100%');
				setImportantStyle(strip, 'margin-left', 'auto');
				setImportantStyle(strip, 'margin-right', '0');
				setImportantStyle(strip, 'transform', 'none');
				setImportantStyle(strip, 'white-space', 'nowrap');
			}

			cell.querySelectorAll('button, .cbi-button, input[type="button"], input[type="submit"]').forEach((button) => {
				setImportantStyle(button, 'position', 'static');
				setImportantStyle(button, 'display', 'inline-flex');
				setImportantStyle(button, 'align-items', 'center');
				setImportantStyle(button, 'justify-content', 'center');
				setImportantStyle(button, 'height', '36px');
				setImportantStyle(button, 'min-height', '36px');
				setImportantStyle(button, 'margin', '0');
				setImportantStyle(button, 'padding', '0');
				setImportantStyle(button, 'border-radius', '15px');
				setImportantStyle(button, 'font-size', '13px');
				setImportantStyle(button, 'line-height', '1');
				setImportantStyle(button, 'white-space', 'nowrap');
				setImportantStyle(button, 'transform', 'none');

				if (button.classList.contains('drag-handle')) {
					button.classList.add('apple-zerotier-drag-button');
					setImportantStyle(button, 'width', '42px');
					setImportantStyle(button, 'min-width', '42px');
					setImportantStyle(button, 'max-width', '42px');

					if (!button.getAttribute('title'))
						button.setAttribute('title', '排序');
				}
				else if (button.classList.contains('cbi-button-edit')) {
					button.classList.add('apple-zerotier-edit-button');
					setImportantStyle(button, 'width', '68px');
					setImportantStyle(button, 'min-width', '68px');
					setImportantStyle(button, 'max-width', '68px');
				}
				else if (button.classList.contains('cbi-button-remove')) {
					button.classList.add('apple-zerotier-remove-button');
					setImportantStyle(button, 'width', '72px');
					setImportantStyle(button, 'min-width', '72px');
					setImportantStyle(button, 'max-width', '72px');
				}
			});
		};

		const normalizeRows = (table) => {
			table.classList.add('apple-zerotier-runtime-table');
			setImportantStyle(table, 'display', 'block');
			setImportantStyle(table, 'width', '100%');
			setImportantStyle(table, 'min-width', '0');
			setImportantStyle(table, 'max-width', '100%');
			setImportantStyle(table, 'overflow', 'hidden');

			table.querySelectorAll(':scope > thead, :scope > tbody, :scope > tfoot').forEach((group) => {
				setImportantStyle(group, 'display', 'block');
				setImportantStyle(group, 'width', '100%');
			});

			table.querySelectorAll('tr.cbi-section-table-titles, tr.cbi-section-table-row').forEach((row) => {
				const isHeaderRow = row.classList.contains('cbi-section-table-titles');
				let fallbackColumn = 1;

				row.classList.add('apple-zerotier-grid-row');
				row.classList.toggle('apple-zerotier-header-row', isHeaderRow);
				row.classList.toggle('apple-zerotier-data-row', !isHeaderRow);
				setImportantStyle(row, 'display', 'grid');
				setImportantStyle(row, 'grid-template-columns', '5.8% 4.5% 17.8% 9.5% 8% 7.3% 5.3% 5% 4.9% 4.7% 27.2%');
				setImportantStyle(row, 'align-items', 'center');
				setImportantStyle(row, 'grid-auto-rows', isHeaderRow ? '54px' : '64px');
				setImportantStyle(row, 'width', '100%');
				setImportantStyle(row, 'column-gap', '0');

				Array.from(row.children).forEach((cell, index) => {
					const isActionCell = cell.classList.contains('cbi-section-actions') ||
						!!cell.querySelector('.drag-handle, .cbi-button-edit, .cbi-button-remove');
					const optionName = findCellOptionName(cell);
					let column = isActionCell ? 11 : logicalColumnByName[optionName];

					if (!column) {
						while (fallbackColumn <= 10 && Array.from(row.children).some((other) => {
							if (other === cell)
								return false;

							return parseInt(other.dataset.appleZerotierColumn || '0', 10) === fallbackColumn;
						}))
							fallbackColumn++;

						column = Math.min(fallbackColumn, 10);
						fallbackColumn++;
					}

					cell.dataset.appleZerotierColumn = String(column);
					cell.className = cell.className
						.split(/\s+/)
						.filter((name) => !/^apple-zerotier-col-\d+$/.test(name))
						.join(' ');
					cell.classList.add(`apple-zerotier-col-${column}`);
					setImportantStyle(cell, 'grid-column', `${column} / ${column + 1}`);
					setImportantStyle(cell, 'display', 'flex');
					setImportantStyle(cell, 'align-items', 'center');
					setImportantStyle(cell, 'align-self', 'stretch');
					setImportantStyle(cell, 'box-sizing', 'border-box');
					setImportantStyle(cell, 'height', isHeaderRow ? '54px' : '64px');
					setImportantStyle(cell, 'min-height', isHeaderRow ? '54px' : '64px');
					setImportantStyle(cell, 'min-width', '0');
					setImportantStyle(cell, 'width', 'auto');
					setImportantStyle(cell, 'padding', '0 10px');
					setImportantStyle(cell, 'overflow', isActionCell ? 'visible' : 'hidden');
					setImportantStyle(cell, 'white-space', 'nowrap');
					setImportantStyle(cell, 'text-overflow', 'ellipsis');
					setImportantStyle(cell, 'transform', 'none');
					setImportantStyle(cell, 'line-height', '1.15');
					setImportantStyle(cell, 'justify-content', (column === 1 || column === 3) ? 'flex-start' : 'center');

					if (isHeaderRow)
						normalizeHeaderCell(cell, column - 1);

					if (isActionCell) {
						cell.classList.add('apple-zerotier-action-cell', 'apple-zerotier-col-11');

						if (isHeaderRow)
							normalizeHeaderCell(cell, 10);

						normalizeActionButtons(cell, isHeaderRow);
					}

					cell.querySelectorAll('input[type="checkbox"]').forEach(styleCheckbox);
				});
			});
		};

		installRuntimeStyle();

		this.nodes.content.querySelectorAll('table.cbi-section-table').forEach((table) => {
			if (!isZeroTierNetworkTable(table))
				return;

			table.classList.add('apple-zerotier-network-table', 'apple-zerotier-grid-table', 'apple-wide-table');
			ensureColumns(table);

			const wrapper = table.closest('.apple-table-scroll');

			if (wrapper)
				wrapper.classList.add('apple-zerotier-network-scroll');

			normalizeRows(table);

			if (!table.dataset.appleZerotierRepeatedNormalize) {
				table.dataset.appleZerotierRepeatedNormalize = 'true';

				const schedule = () => window.setTimeout(() => {
					ensureColumns(table);
					normalizeRows(table);
				}, 25);

				const observer = new MutationObserver(() => schedule());
				observer.observe(table, { childList: true, subtree: true });

				[ 40, 140, 360, 900, 1800, 3200 ].forEach((delay) => {
					window.setTimeout(() => {
						ensureColumns(table);
						normalizeRows(table);
					}, delay);
				});
			}
		});
		},

		normalizeOpenClashLayout() {
			if (!this.nodes.content)
				return;

			const pageKey = document.body?.dataset?.page || '';

			if (!/^admin-services-openclash(?:-|$)/.test(pageKey))
				return;

			this.nodes.content.classList.add('apple-openclash-page');

			this.nodes.content.querySelectorAll('.oc .apple-table-scroll').forEach((wrapper) => {
				if (wrapper.closest('[id^="cbi-openclash-"]'))
					return;

				const parent = wrapper.parentNode;

				if (!parent)
					return;

				while (wrapper.firstChild)
					parent.insertBefore(wrapper.firstChild, wrapper);

				wrapper.remove();
			});

			this.nodes.content.querySelectorAll('#tab-header-openclash-dns_servers').forEach((tabs) => {
				tabs.classList.add('apple-openclash-dns-tabs');
			});

			this.nodes.content.querySelectorAll('fieldset#cbi-openclash-dns_servers table.cbi-section-table, [id^="cbi-openclash-dns_servers"] table.cbi-section-table').forEach((table) => {
				table.classList.add('apple-openclash-dns-table', 'apple-wide-table');

				const wrapper = table.closest('.apple-table-scroll');
				const section = table.closest('fieldset, .cbi-section, .cbi-section-node');

				if (wrapper)
					wrapper.classList.add('apple-openclash-dns-scroll');

				if (section)
					section.classList.add('apple-openclash-dns-section');

				table.querySelectorAll('td.cbi-section-actions, .td.cbi-section-actions').forEach((cell) => {
					cell.classList.add('apple-openclash-dns-actions');

					const strip = cell.querySelector(':scope > div');

					if (strip)
						strip.classList.add('apple-openclash-action-strip');

					cell.querySelectorAll('button, .btn, .cbi-button, input[type="button"], input[type="submit"]').forEach((button) => {
						const value = (button.value || button.textContent || '').trim();

						if (/^(≡|↕|↑|↓)$/.test(value) || button.classList.contains('cbi-button-up') || button.classList.contains('cbi-button-down') || button.classList.contains('drag-handle')) {
							button.classList.add('apple-openclash-sort-button');

							if (!button.getAttribute('title'))
								button.setAttribute('title', '排序');
						}
						else if (button.classList.contains('cbi-button-remove') || button.classList.contains('cbi-button-negative')) {
							button.classList.add('apple-openclash-remove-button');
						}
						else if (button.classList.contains('cbi-button-edit')) {
							button.classList.add('apple-openclash-edit-button');
						}
					});
				});
			});
		},

		isServicesPage() {
			return /^admin-services(?:-|$)/.test(document.body?.dataset?.page || '');
		},

	isAdGuardHomeBasePage() {
		return (document.body?.dataset?.page || '') === 'admin-services-AdGuardHome-base';
	},

	decorateServicesFlexLayouts() {
		if (!this.nodes.content || !this.isServicesPage())
			return;

		const pageKey = document.body?.dataset?.page || '';

		if (/^admin-services-openclash(?:-|$)/.test(pageKey) || this.isAdGuardHomeBasePage())
			return;

		this.nodes.content.querySelectorAll('table:not(.cbi-section-table):not(.table)').forEach((table) => {
			if (table.closest('.apple-table-scroll, .cbi-dropdown, .cbi-tabmenu, .ifacebox, #mainmenu, #modemenu, #modal_overlay'))
				return;

			if (table.querySelector('th'))
				return;

			const rows = Array.from(table.querySelectorAll(':scope > tbody > tr, :scope > tr')).filter((row) =>
				window.getComputedStyle(row).display !== 'none'
			);

			if (!rows.length)
				return;

			const hasCells = rows.some((row) =>
				Array.from(row.children).some((cell) => cell.matches('td') && window.getComputedStyle(cell).display !== 'none')
			);

			if (hasCells) {
				const rowCells = rows.map((row) =>
					Array.from(row.children).filter((cell) => cell.matches('td') && window.getComputedStyle(cell).display !== 'none')
				);
				const singleCellRows = rowCells.filter((cells) => cells.length === 1);
				const dashboardCell = singleCellRows.length === rows.length ? singleCellRows[0]?.[0] : null;
				const looksLikeDashboard = !!dashboardCell &&
					(table.textContent || '').replace(/\s+/g, ' ').trim().length > 120 &&
					(
						dashboardCell.querySelectorAll('button, .btn, .cbi-button, input[type="button"], input[type="submit"], a[href], a[onclick]').length >= 4 ||
						!!dashboardCell.querySelector('table, .table, .cbi-section, .cbi-section-node, fieldset, section, article')
					);

				table.classList.add('apple-service-flex-panel');

				table.classList.toggle('apple-service-dashboard-panel', looksLikeDashboard);

				rowCells.flat().forEach((cell) => {
					const shouldMarkDashboardCell = looksLikeDashboard && cell === dashboardCell;

					if (cell.classList.contains('apple-service-dashboard-cell') !== shouldMarkDashboardCell)
						cell.classList.toggle('apple-service-dashboard-cell', shouldMarkDashboardCell);
				});
			}
		});

		this.decorateServicesControls();
	},

		decorateServicesControls() {
			if (this.isAdGuardHomeBasePage())
				return;

			const controls = new Set();
			const directSelector = [
				'.btn',
				'.cbi-button',
			'button',
			'input[type="button"]',
			'input[type="submit"]',
			'a[role="button"]',
			'a[class*="btn"]',
			'a[class*="button"]'
		].join(', ');
		const serviceButtonClasses = [
			'apple-service-button',
			'apple-service-icon-button',
			'apple-service-compact-button',
			'apple-service-normal-button',
				'apple-service-wide-button',
				'apple-service-primary-button'
			];
			const syncClasses = (node, classNames, desiredClasses) => {
				if (!node?.classList)
					return;

				classNames.forEach((className) => {
					const shouldHave = desiredClasses.has(className);

					if (node.classList.contains(className) !== shouldHave)
						node.classList.toggle(className, shouldHave);
				});
			};

			this.nodes.content.querySelectorAll(directSelector).forEach((control) => controls.add(control));
			this.nodes.content.querySelectorAll('a[href], a[onclick]').forEach((anchor) => {
				const className = String(anchor.className || '');
			const hasIcon = !!anchor.querySelector('img, svg, i, [class*="icon"], [class*="fa-"]');
			const looksLikeAction = /(?:btn|button|action|tool|icon|copy|reload|refresh|restart|start|stop|apply|save|upload|download|生成|刷新|启动|停止|保存|应用|上传|下载)/i.test(className + ' ' + anchor.textContent);

			if (hasIcon || looksLikeAction)
				controls.add(anchor);
		});

		controls.forEach((control) => {
			if (!control || control.closest('.cbi-dropdown, .cbi-tabmenu, #mainmenu, #modemenu, #modal_overlay'))
				return;

			if (control.matches('.help-link, a[data-help], button[data-help]'))
				return;

			if (control.classList.contains('hidden') || control.closest('.hidden, [hidden]'))
				return;

			const style = window.getComputedStyle(control);

			if (style.display === 'none' || style.visibility === 'hidden')
				return;

			const iconNodes = Array.from(control.querySelectorAll('img, svg, i, [class*="icon"], [class*="fa-"]'))
				.filter((node) => window.getComputedStyle(node).display !== 'none');
			const hasIcon = iconNodes.length > 0;
			const labelSource = (() => {
				if (control.matches('input'))
					return control.value;

				const clone = control.cloneNode(true);

				clone.querySelectorAll('img, svg, i, [class*="icon"], [class*="fa-"]').forEach((node) => node.remove());

				const visibleText = (clone.textContent || '').replace(/\s+/g, ' ').trim();

				if (visibleText)
					return visibleText;

				return hasIcon ? '' : (control.getAttribute('aria-label') || control.getAttribute('title') || '');
			})();
			const label = String(labelSource || '').replace(/\s+/g, ' ').trim();
			const cjkLength = (label.match(/[\u3400-\u9fff]/g) || []).length;
			const iconText = !label || /^[=\-+×✕✓✔✖⋯…·•↻↺▲▼◀▶^v<>]+$/.test(label);
			const hasTextSlot = !!control.querySelector('.btn-text, .logo-text');
			const isDashboardButton = control.matches('.dashboard-btn') && !control.matches('.icon-btn, .copy-btn, .theme-toggle-btn');
			const isForcedIcon = control.matches('.copy-btn, .theme-toggle-btn') ||
				(control.matches('.icon-btn') && !hasTextSlot && (iconText || label.length <= 2));
			const isIconOnly = !isDashboardButton && (isForcedIcon || (hasIcon && !hasTextSlot && (iconText || label.length <= 2)));
			const isPrimary = /(?:important|apply|save|primary|positive|download|upload|install|update|start|restart|reload)/i.test(String(control.className || '')) ||
				/(?:save|apply|download|update|install|start|restart|reload|run|保存|应用|下载|更新|安装|启动|重启|重新|运行|生成|上传|订阅)/i.test(label);
			const isCompact = !isIconOnly && /^(?:edit|delete|enable|disable|start|stop|run|view|test|copy|open|close|编辑|删除|启用|禁用|启动|停止|测试|查看|复制|打开|关闭|清空|刷新)$/i.test(label);
			const isWide = !isIconOnly && (isPrimary || label.length >= 12 || cjkLength >= 5);
			const actionCell = control.closest('td, .td, .control-group, .controls, .button-row, .right, .left');
			const desiredClasses = new Set([ 'apple-service-button' ]);

			if (isIconOnly)
				desiredClasses.add('apple-service-icon-button');
			else if (isWide)
				desiredClasses.add('apple-service-wide-button');
			else if (isCompact)
				desiredClasses.add('apple-service-compact-button');
			else
				desiredClasses.add('apple-service-normal-button');

			if (isPrimary)
				desiredClasses.add('apple-service-primary-button');

			syncClasses(control, serviceButtonClasses, desiredClasses);

			iconNodes.forEach((node) => {
				if (!node.classList.contains('apple-service-icon-media'))
					node.classList.add('apple-service-icon-media');
			});

			if (actionCell && !actionCell.classList.contains('apple-service-dashboard-cell'))
				actionCell.classList.add('apple-service-action-cell');
		});

		this.decorateServiceButtonRows();
	},

	decorateServiceButtonRows() {
		if (!this.nodes.content || this.isAdGuardHomeBasePage())
			return;

		const directButtonSelector = [
			'.apple-service-button',
			'.btn',
			'.cbi-button',
			'button',
			'input[type="button"]',
			'input[type="submit"]',
			'a[role="button"]',
			'a[class*="btn"]',
			'a[class*="button"]'
		];
		const shallowButtonSelector = [
			...directButtonSelector.map((selector) => ':scope > ' + selector),
			...directButtonSelector.map((selector) => ':scope > span > ' + selector),
			...directButtonSelector.map((selector) => ':scope > div > ' + selector),
			...directButtonSelector.map((selector) => ':scope > p > ' + selector),
			...directButtonSelector.map((selector) => ':scope > label > ' + selector)
		].join(', ');
		const shallowHostSelector = 'span, div, p, label';
		const shouldSkip = (node) => {
			return !!node.closest('.oc .dashboard-buttons, .oc .quick-actions-buttons, .oc .card-actions, .cbi-dropdown, .cbi-tabmenu, #mainmenu, #modemenu, #modal_overlay');
		};
		const isEligibleButton = (node) => {
			if (!node?.matches?.(directButtonSelector.join(', ')))
				return false;

			if (node.classList.contains('hidden') || node.closest('.hidden, [hidden]'))
				return false;

			if (node.closest('.cbi-dropdown, .cbi-tabmenu, #mainmenu, #modemenu, #modal_overlay'))
				return false;

			if (node.style?.display === 'none' || node.style?.visibility === 'hidden')
				return false;

			return true;
		};
		const markButtonHost = (node, buttons) => {
			const shouldRow = !shouldSkip(node) && buttons.length > 1;
			const shouldSingle = !shouldSkip(node) && buttons.length === 1;

			if (node.classList.contains('apple-service-button-row') !== shouldRow)
				node.classList.toggle('apple-service-button-row', shouldRow);

			if (node.classList.contains('apple-service-single-action') !== shouldSingle)
				node.classList.toggle('apple-service-single-action', shouldSingle);
		};
		const containers = this.nodes.content.querySelectorAll([
			'.cbi-value-field',
			'.control-group',
			'.controls',
			'.button-row',
			'.right',
			'.left',
			'td',
			'.td'
		].join(', '));

		containers.forEach((container) => {
			const shallowButtons = Array.from(container.querySelectorAll(shallowButtonSelector)).filter(isEligibleButton);

			Array.from(container.children).forEach((child) => {
				if (!child.matches?.(shallowHostSelector))
					return;

				if (child.matches('.cbi-dropdown, .cbi-tabmenu, .cbi-section, .cbi-section-node, .table, table, fieldset'))
					return;

				const hostButtons = Array.from(child.querySelectorAll(directButtonSelector.map((selector) => ':scope > ' + selector).join(', '))).filter(isEligibleButton);

				if (hostButtons.length)
					markButtonHost(child, hostButtons);
			});

			markButtonHost(container, shallowButtons);
		});

		this.nodes.content.querySelectorAll('.cbi-value').forEach((value) => {
			const shouldSkipValue = shouldSkip(value);

			if (shouldSkipValue) {
				if (value.classList.contains('apple-service-action-value'))
					value.classList.remove('apple-service-action-value');

				if (value.classList.contains('apple-service-multi-action-value'))
					value.classList.remove('apple-service-multi-action-value');

				return;
			}

			const field = value.querySelector(':scope > .cbi-value-field');

			if (!field) {
				if (value.classList.contains('apple-service-action-value'))
					value.classList.remove('apple-service-action-value');

				if (value.classList.contains('apple-service-multi-action-value'))
					value.classList.remove('apple-service-multi-action-value');

				return;
			}

			const buttons = Array.from(field.querySelectorAll(shallowButtonSelector)).filter(isEligibleButton);
			const shouldActionValue = buttons.length > 0;
			const shouldMultiActionValue = buttons.length > 1;

			if (value.classList.contains('apple-service-action-value') !== shouldActionValue)
				value.classList.toggle('apple-service-action-value', shouldActionValue);

			if (value.classList.contains('apple-service-multi-action-value') !== shouldMultiActionValue)
				value.classList.toggle('apple-service-multi-action-value', shouldMultiActionValue);

			if (shouldActionValue)
				markButtonHost(field, buttons);
		});
	},

	decorateStartupActions() {
		if (!this.nodes.content || document.body.getAttribute('data-page') !== 'admin-system-startup')
			return;

		this.nodes.content.querySelectorAll('table.table td:last-child button, table.table td.cbi-section-actions button').forEach((button) => {
			const label = button.textContent.replace(/\s+/g, ' ').trim().toLowerCase();

			button.classList.add('apple-startup-action');

			button.classList.remove(
				'apple-startup-enabled',
				'apple-startup-disabled',
				'apple-startup-start',
				'apple-startup-restart',
				'apple-startup-reload',
				'apple-startup-stop'
			);

			if (/^(enabled|已启用)$/.test(label))
				button.classList.add('apple-startup-enabled');
			else if (/^(disabled|已禁用|禁用)$/.test(label))
				button.classList.add('apple-startup-disabled');
			else if (/^(restart|重启)$/.test(label))
				button.classList.add('apple-startup-restart');
			else if (/^(reload|重新加载|重载)$/.test(label))
				button.classList.add('apple-startup-reload');
			else if (/^(stop|停止)$/.test(label))
				button.classList.add('apple-startup-stop');
			else if (/^(start|启动)$/.test(label))
				button.classList.add('apple-startup-start');
		});
	},

	decorateNetworkInterfaces() {
		if (!this.nodes.content || document.body.getAttribute('data-page') !== 'admin-network-network')
			return;

		this.nodes.content.querySelectorAll('table.cbi-section-table, .table.cbi-section-table').forEach((table) => {
			const hasInterfaceCells = !!table.querySelector('[data-name="_ifacebox"], [data-name="_ifacestat"]');
			const hasDeviceCells = !!table.querySelector('[data-name="name"]') &&
				!!table.querySelector('[data-name="type"]') &&
				!!table.querySelector('[data-name="macaddr"]') &&
				!!table.querySelector('[data-name="mtu"]');

			if (hasInterfaceCells) {
				const wrapper = table.closest('.apple-table-scroll');

				if (wrapper) {
					wrapper.parentNode.insertBefore(table, wrapper);
					wrapper.remove();
				}

				table.classList.add('apple-interfaces-table');
				table.classList.remove('apple-network-devices-table');
				table.removeAttribute('data-action-col-width');
				table.querySelectorAll('tr, .tr').forEach((row) => {
					const isInterfaceRow = !!row.querySelector('[data-name="_ifacebox"], [data-name="_ifacestat"]');

					row.classList.toggle('apple-interface-row', isInterfaceRow);
					row.classList.toggle('apple-interface-header-row', !isInterfaceRow && !!row.querySelector('th, .th'));
					row.classList.remove('apple-network-device-row', 'apple-network-device-header-row');
				});
				table.querySelectorAll('td.cbi-section-actions, .td.cbi-section-actions').forEach((cell) => {
					cell.classList.add('apple-interface-actions');
					cell.style.removeProperty('width');
					cell.style.removeProperty('min-width');

					const actionWrap = cell.querySelector(':scope > div');

					if (actionWrap)
						actionWrap.classList.add('apple-interface-action-grid');
				});
			}
			else if (hasDeviceCells) {
				table.classList.add('apple-network-devices-table');
				table.classList.remove('apple-interfaces-table');
				table.removeAttribute('data-action-col-width');

				const tableRect = table.getBoundingClientRect();
				const rowWidth = Math.max(table.clientWidth || 0, Math.round(tableRect.width) - 2);

				if (rowWidth > 0)
					table.style.setProperty('--apple-network-devices-row-width', `${rowWidth}px`);

				const wrapper = table.closest('.apple-table-scroll');

				if (wrapper)
					wrapper.classList.add('apple-network-devices-scroll');

				table.querySelectorAll('tr, .tr').forEach((row) => {
					const isHeaderRow = !!row.querySelector('th, .th');
					const isDeviceRow = !!row.querySelector('[data-name="name"], [data-name="type"], [data-name="macaddr"], [data-name="mtu"]');

					row.classList.toggle('apple-network-device-header-row', isHeaderRow);
					row.classList.toggle('apple-network-device-row', isDeviceRow && !isHeaderRow);
					row.classList.remove('apple-interface-row', 'apple-interface-header-row');
				});

				table.querySelectorAll('td.cbi-section-actions, .td.cbi-section-actions').forEach((cell) => {
					cell.classList.add('apple-network-device-actions');
					cell.classList.remove('apple-interface-actions');
					cell.style.removeProperty('width');
					cell.style.removeProperty('min-width');

					const actionWrap = cell.querySelector(':scope > div');

					if (actionWrap)
						actionWrap.classList.add('apple-network-device-action-grid');
				});

				table.querySelectorAll('[data-name="name"] .ifacebadge').forEach((badge) => {
					badge.classList.add('apple-network-device-badge');
				});
			}
		});

		this.nodes.content.querySelectorAll([
			'.ifacebox-body[data-network]',
			'td[data-name="_ifacebox"] .ifacebox-body',
			'.td[data-name="_ifacebox"] .ifacebox-body'
		].join(', ')).forEach((body) => {
			body.dataset.appleInterfaceDecorated = 'true';
			body.classList.add('apple-iface-layout');

			const primary = body.querySelector(':scope > .cbi-tooltip-container');
			const memberWrap = Array.from(body.children).find((node) =>
				node.tagName === 'SPAN' && !node.classList.contains('cbi-tooltip-container')
			);
			const deviceName = body.querySelector(':scope > small');

			if (primary)
				primary.classList.add('apple-iface-primary');

			if (deviceName)
				deviceName.classList.add('apple-iface-device-name');

			this.decorateIfaceTooltipContainer(primary, 'primary');

			if (memberWrap) {
				if (!memberWrap.classList.contains('apple-iface-members')) {
					const members = Array.from(memberWrap.querySelectorAll('.cbi-tooltip-container')).map((node) => node.cloneNode(true));

					if (members.length) {
						const list = E('span', { 'class': 'apple-iface-members-list' });

						while (memberWrap.firstChild)
							memberWrap.removeChild(memberWrap.firstChild);

						memberWrap.classList.add('apple-iface-members');
						memberWrap.appendChild(E('span', { 'class': 'apple-iface-members-label' }, [ _('Ports') ]));

						members.forEach((node) => {
							this.decorateIfaceTooltipContainer(node, 'member');
							list.appendChild(node);
						});
						memberWrap.appendChild(list);
					}
				}
				else {
					memberWrap.querySelectorAll('.cbi-tooltip-container').forEach((node) => {
						this.decorateIfaceTooltipContainer(node, 'member');
					});
				}
			}

				if (deviceName) {
					const primaryTitle = primary?.querySelector(':scope > .apple-iface-chip-copy .apple-iface-chip-title')?.textContent?.replace(/\s+/g, ' ')?.trim();
					const deviceText = deviceName.textContent?.replace(/\s+/g, ' ')?.trim();

					if (!deviceText || !primaryTitle || deviceText === primaryTitle)
						deviceName.classList.add('is-redundant');
				}
			});

		this.nodes.content.querySelectorAll('td[data-name="_ifacestat"] > div, .td[data-name="_ifacestat"] > div').forEach((summary) => {
			this.decorateInterfaceSummary(summary);
		});
	},

	decorateInterfaceSummary(summary) {
		if (!summary)
			return;

		summary.dataset.appleSummaryDecorated = 'true';
		summary.classList.add('apple-interface-summary');

		const existingItems = Array.from(summary.querySelectorAll(':scope > .apple-interface-summary-item, :scope > .nowrap'));

		if (existingItems.length > 1) {
			existingItems.forEach((item) => {
				item.classList.add('apple-interface-summary-item');
				this.normalizeInterfaceSummaryItem(item);
			});
			Array.from(summary.childNodes).forEach((node) => {
				if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR')
					node.remove();
				else if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim())
					node.remove();
			});
			return;
		}

		const sourceNodes = Array.from(summary.childNodes);
		const rows = [];
		let current = [];

		const hasVisibleContent = (nodes) => nodes.some((node) => {
			if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR')
				return true;

			return (node.textContent || '').replace(/\s+/g, '').length > 0;
		});

		const trimWhitespace = (nodes) => {
			while (nodes.length && nodes[0].nodeType === Node.TEXT_NODE && !nodes[0].textContent.trim())
				nodes.shift();

			while (nodes.length && nodes[nodes.length - 1].nodeType === Node.TEXT_NODE && !nodes[nodes.length - 1].textContent.trim())
				nodes.pop();

			return nodes;
		};

		const flushRow = () => {
			const nodes = trimWhitespace(current);
			current = [];

			if (!hasVisibleContent(nodes))
				return;

			const item = document.createElement('span');
			const value = document.createElement('span');
			const label = nodes.find((node) => node.nodeType === Node.ELEMENT_NODE && node.tagName === 'STRONG');

			item.className = 'apple-interface-summary-item';
			value.className = 'apple-interface-summary-value';

			nodes.forEach((node) => {
				if (node === label)
					item.appendChild(node);
				else
					value.appendChild(node);
			});

			if (value.textContent.trim() || value.children.length)
				item.appendChild(value);

			rows.push(item);
		};

		sourceNodes.forEach((node) => {
			if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR')
				flushRow();
			else
				current.push(node);
		});

		flushRow();

		if (rows.length > 1) {
			summary.replaceChildren(...rows);
			summary.dataset.appleSummaryNormalized = 'true';
		}
	},

	normalizeInterfaceSummaryItem(item) {
		if (!item || item.querySelector(':scope > .apple-interface-summary-value'))
			return;

		const label = item.querySelector(':scope > strong');

		if (!label)
			return;

		const value = document.createElement('span');

		value.className = 'apple-interface-summary-value';

		Array.from(item.childNodes).forEach((node) => {
			if (node === label)
				return;

			value.appendChild(node);
		});

		if (value.textContent.trim() || value.children.length)
			item.appendChild(value);
	},

	decorateIfaceTooltipContainer(container, role) {
		if (!container)
			return;

		const chipRole = role || 'primary';

		container.dataset.appleIfaceChipDecorated = 'true';
		container.dataset.appleIfaceRole = chipRole;
		container.classList.add('apple-iface-chip');

		const tooltip = container.querySelector(':scope > .cbi-tooltip');
		const lines = Array.from(tooltip?.querySelectorAll('.left > .nowrap') || []);
		const entries = lines.map((line) => {
			const clone = line.cloneNode(true);
			const labelNode = clone.querySelector('strong');
			const label = labelNode ? labelNode.textContent.replace(/:\s*$/, '').trim() : '';
			if (labelNode)
				labelNode.remove();

			return {
				label,
				value: clone.textContent.replace(/\s+/g, ' ').trim()
			};
		}).filter((entry) => entry.value);

		const normalizeText = (value) => (value || '').replace(/\s+/g, ' ').trim();
		const isMetricText = (value) => /(?:pkts?\.?|packets?|bytes?|errors?|dropped|collisions?|接收|发送|数据包|错误|丢包|冲突|[0-9.]+\s*(?:ki?b|mi?b|gi?b|ti?b|kb|mb|gb|tb|b)\b)/i.test(value || '');
		const directText = normalizeText(Array.from(container.childNodes).map((node) => {
			if (node.nodeType === Node.TEXT_NODE)
				return node.textContent;

			if (node.nodeType !== Node.ELEMENT_NODE)
				return '';

			if (node.matches('.cbi-tooltip, .apple-iface-glyph, .apple-iface-chip-copy, img'))
				return '';

			return node.textContent;
		}).join(' '));
		const image = container.querySelector(':scope > img');
		const imageText = normalizeText(image?.getAttribute('alt') || image?.getAttribute('title') || image?.getAttribute('aria-label'));
		const deviceText = normalizeText(container.closest('.ifacebox-body')?.querySelector(':scope > small')?.textContent);
		const fallbackEntry = entries.find((entry) => !isMetricText(entry.value) && !/type|kind|medium|类型|介质/i.test(entry.label || ''));
		const fallbackValue = fallbackEntry?.value || imageText || directText || deviceText || _('Not present');
		const primaryEntry = entries.find((entry) =>
			/device|interface|port|设备|接口|端口/i.test(entry.label || '') && !isMetricText(entry.value)
		);
		const typeEntry = entries.find((entry) => /type|kind|medium|类型|介质/i.test(entry.label || ''));
		const title = chipRole === 'primary'
			? (deviceText || primaryEntry?.value || imageText || directText || fallbackValue)
			: (primaryEntry?.value || imageText || directText || fallbackValue);
		const eyebrow = chipRole === 'member'
			? _('Member port')
			: (typeEntry?.value || entries[0]?.label || _('Primary device'));
		const glyph = container.querySelector(':scope > .apple-iface-glyph') ||
			E('span', { 'class': 'apple-iface-glyph', 'aria-hidden': 'true' });
		const existingCopy = container.querySelector(':scope > .apple-iface-chip-copy');

		glyph.dataset.appleIfaceRole = chipRole;

		if (!glyph.parentNode)
			container.insertBefore(glyph, existingCopy || tooltip || null);

		if (existingCopy) {
			const eyebrowNode = existingCopy.querySelector(':scope > .apple-iface-chip-eyebrow');
			const titleNode = existingCopy.querySelector(':scope .apple-iface-chip-title');

			if (eyebrowNode)
				eyebrowNode.textContent = eyebrow;

			if (titleNode)
				titleNode.textContent = title;

			return;
		}

		if (chipRole === 'member') {
			container.appendChild(E('span', { 'class': 'apple-iface-chip-copy apple-iface-chip-copy-member' }, [
				E('span', { 'class': 'apple-iface-chip-title' }, [ title ])
			]));
			return;
		}

		container.appendChild(E('span', { 'class': 'apple-iface-chip-copy' }, [
			E('span', { 'class': 'apple-iface-chip-eyebrow' }, [ eyebrow ]),
			E('span', { 'class': 'apple-iface-chip-title' }, [ title ])
		]));
	},

	decorateStatusOverview() {
		if (!this.nodes.content || document.body.getAttribute('data-page') !== 'admin-status-overview')
			return;

		const view = this.nodes.content.querySelector('#view');

		if (!view)
			return;

		view.querySelectorAll(':scope > .cbi-section').forEach((section) => {
			section.classList.add('apple-status-section');
		});


		Array.from(view.children).forEach((group) => {
			if (!(group instanceof Element))
				return;

			if (group.classList.contains('network-status-table'))
				group.classList.add('apple-network-status-grid');
		});

		view.querySelectorAll('.ifacebox[style*="width:100px"], .ifacebox img[src*="icons/port_"]').forEach((node) => {
			const card = node.classList?.contains('ifacebox') ? node : node.closest('.ifacebox');
			const group = card?.parentElement;
			const wrapper = group?.parentElement;
			const section = card?.closest('.cbi-section');

			if (!card || !group || !wrapper)
				return;

			group.classList.add('apple-port-status-grid');
			group.style.setProperty('display', 'flex');
			group.style.setProperty('flex-wrap', 'wrap');
			group.style.setProperty('align-items', 'stretch');
			group.style.setProperty('justify-content', 'center');
			group.style.setProperty('justify-items', 'initial');
			group.style.removeProperty('grid-template-columns');
			group.style.setProperty('gap', '12px');
			group.style.setProperty('text-align', 'left');
			group.style.setProperty('width', '100%');
			wrapper.classList.add('apple-port-status-wrap');
			wrapper.style.setProperty('grid-column', '1 / -1');
			wrapper.style.setProperty('width', '100%');
			if (section) {
				section.classList.add('apple-status-section-port');
				section.style.setProperty('grid-template-columns', 'minmax(0, 1fr)', 'important');
				section.style.setProperty('justify-items', 'stretch', 'important');
				section.style.setProperty('align-items', 'start', 'important');
			}
			card.classList.add('apple-port-status-card');
			card.style.setProperty('width', 'auto');
			card.style.setProperty('max-width', '172px');
			card.style.setProperty('margin', '0');
			card.style.setProperty('flex', '0 1 164px');

			const heads = card.querySelectorAll(':scope > .ifacebox-head');
			const bodies = card.querySelectorAll(':scope > .ifacebox-body');
			const portName = heads[0]?.textContent?.replace(/\s+/g, ' ')?.trim();
			const heroBody = bodies[0];
			const statsBody = bodies[1];
			const relationHead = heads[1];

			if (heroBody) {
				heroBody.classList.add('apple-port-status-hero');
				this.decoratePortStatusHero(heroBody, portName);
				this.refreshPortLinkState(heroBody, portName);
			}

			if (relationHead) {
				relationHead.classList.add('apple-port-status-relation');
				relationHead.setAttribute('tabindex', '0');
			}

			if (statsBody) {
				const statsTrigger = statsBody.querySelector('.cbi-tooltip-container');
				const statsTooltip = statsTrigger?.querySelector('.cbi-tooltip');

				statsBody.classList.add('apple-port-status-stats');

				if (statsTrigger) {
					statsTrigger.classList.add('apple-port-stats-trigger');
					statsTrigger.setAttribute('tabindex', '0');
					this.decoratePortStatusStats(statsTrigger);
				}

				if (statsTooltip)
					statsTooltip.classList.add('apple-port-stats-tooltip');
			}
		});

			view.querySelectorAll('.network-status-table').forEach((group) => {
				group.classList.add('apple-network-status-grid');
				group.querySelectorAll(':scope > .ifacebox').forEach((card) => this.decorateNetworkStatusCard(card));
			});

	},

	decorateNetworkStatusCard(card) {
		if (!card)
			return;

		card.classList.add('apple-network-status-card');
		card.querySelectorAll('.apple-network-summary-panel').forEach((panel) => panel.remove());
	},

	decoratePortStatusHero(heroBody, portName) {
		if (!heroBody)
			return;

		this.decoratePortStatusIcon(heroBody);

		if (heroBody.dataset.applePortHeroDecorated === 'true' && heroBody.querySelector('.apple-port-status-speed-value'))
			return;

		heroBody.dataset.applePortHeroDecorated = 'true';

		let heroCopy = Array.from(heroBody.childNodes).find((node) => (
			node.nodeType === 1 &&
			node.tagName !== 'IMG' &&
			node.tagName !== 'BR' &&
			!node.classList?.contains('apple-port-icon')
		));

		if (!(heroCopy instanceof Element)) {
			const textNode = Array.from(heroBody.childNodes).find((node) => (
				node.nodeType === 3 &&
				node.textContent?.replace(/\s+/g, ' ')?.trim()
			));

			if (textNode) {
				heroCopy = E('span');
				heroBody.insertBefore(heroCopy, textNode);
				heroCopy.appendChild(document.createTextNode(textNode.textContent));
				heroBody.removeChild(textNode);
			}
		}

		if (!(heroCopy instanceof Element)) {
			heroCopy = E('span', {}, [ _('Connected') ]);
			heroBody.appendChild(heroCopy);
		}

		const rawText = heroCopy.textContent?.replace(/\s+/g, ' ')?.trim() || '';
		const rawTitle = heroCopy.getAttribute('title') || '';
		const speedPattern = /([0-9]+(?:[.,][0-9]+)?\s*(?:[KMGTPE]?bit\/s|[KMGTPE]?bps|[KMGTPE]?bE))/i;
		const speedMatch = rawText.match(speedPattern) || rawTitle.match(speedPattern);
		const duplexMatch = rawTitle.match(/\b(full|half)\b/i);
		const looksLikeLinkState = /connected|已连接|link|未连接/i.test(rawText);
		const primaryText = looksLikeLinkState && speedMatch ? speedMatch[1] : (rawText || speedMatch?.[1] || _('Connected'));
		const secondaryParts = [];

		if (looksLikeLinkState && rawText && rawText !== primaryText)
			secondaryParts.push(rawText);

		if (duplexMatch)
			secondaryParts.push(duplexMatch[1] === 'half' ? _('Half duplex') : _('Full duplex'));

		heroCopy.classList.add('apple-port-status-speed');
		heroCopy.setAttribute('title', rawTitle || rawText || primaryText || portName || '');
		heroCopy.textContent = '';
		heroCopy.appendChild(E('span', { 'class': 'apple-port-status-speed-value' }, [ primaryText ]));

		if (secondaryParts.length)
			heroCopy.appendChild(E('span', { 'class': 'apple-port-status-speed-meta' }, [ secondaryParts.join(' · ') ]));
	},

	decoratePortStatusIcon(heroBody) {
		const image = heroBody?.querySelector(':scope > img[src*="icons/port_"]');

		if (!image)
			return;

		const src = image.getAttribute('src') || '';
		const state = /down|disabled/i.test(src) ? 'down' : 'up';
		let icon = heroBody.querySelector(':scope > .apple-port-icon');

		image.classList.add('apple-port-native-icon');
		image.setAttribute('aria-hidden', 'true');

		if (icon) {
			icon.dataset.state = state;
			return;
		}

		icon = E('span', {
			'class': 'apple-port-icon',
			'data-state': state,
			'aria-hidden': 'true'
		}, [
			E('span', { 'class': 'apple-port-icon-jack' }),
			E('span', { 'class': 'apple-port-icon-cable' })
		]);

		heroBody.insertBefore(icon, image);
	},

	refreshPortLinkState(heroBody, portName) {
		if (!heroBody || !portName || !/^[A-Za-z0-9_.:-]+$/.test(portName))
			return;

		const now = Date.now();
		const cached = this.portStatusCache[portName];

		if (cached && (now - cached.ts) < PORT_STATUS_CACHE_TTL) {
			this.applyPortLinkState(heroBody, portName, cached.status, cached.sysfs);
			return;
		}

		if (heroBody.dataset.applePortStatusPending === 'true')
			return;

		heroBody.dataset.applePortStatusPending = 'true';

		Promise.all([
			L.resolveDefault(callAppleNetworkDeviceStatus(portName), {}),
			L.resolveDefault(fs.read('/sys/class/net/%s/speed'.format(portName)), ''),
			L.resolveDefault(fs.read('/sys/class/net/%s/duplex'.format(portName)), ''),
			L.resolveDefault(fs.read('/sys/class/net/%s/carrier'.format(portName)), '')
		]).then((data) => {
			const status = data[0] || {};
			const sysfs = {
				speed: parseInt(String(data[1] || '').trim(), 10),
				duplex: String(data[2] || '').trim().toLowerCase(),
				carrier: String(data[3] || '').trim()
			};

			this.portStatusCache[portName] = {
				ts: Date.now(),
				status,
				sysfs
			};

			window.requestAnimationFrame(() => this.applyPortLinkState(heroBody, portName, status, sysfs));
		}).catch(() => {
			this.portStatusCache[portName] = {
				ts: Date.now(),
				status: {},
				sysfs: {}
			};
		}).then(() => {
			if (heroBody.isConnected)
				heroBody.dataset.applePortStatusPending = 'false';
		});
	},

	applyPortLinkState(heroBody, portName, status, sysfs) {
		if (!heroBody)
			return;

		const currentValue = heroBody.querySelector('.apple-port-status-speed-value')?.textContent?.replace(/\s+/g, ' ')?.trim();
		const rawCarrier = sysfs?.carrier;
		const carrier = rawCarrier === '1' || rawCarrier === 'true' || rawCarrier === true || status?.carrier === true;
		const statusSpeed = Number(status?.speed || status?.link_speed || status?.['link-speed'] || 0);
		const sysfsSpeed = Number.isFinite(sysfs?.speed) ? sysfs.speed : 0;
		const speed = sysfsSpeed > 0 ? sysfsSpeed : (statusSpeed > 0 ? statusSpeed : 0);
		const duplex = (sysfs?.duplex && sysfs.duplex !== 'unknown')
			? sysfs.duplex
			: String(status?.duplex || status?.['link-duplex'] || '').toLowerCase();
		const meta = [];
		let primary = currentValue || _('Connected');

		if (speed > 0) {
			primary = this.formatPortSpeed(speed);

			if (duplex === 'full' || duplex === 'half')
				meta.push(duplex === 'half' ? _('Half duplex') : _('Full duplex'));
		}
		else if (carrier) {
			primary = /no link|未连接|speed unavailable|速度不可用/i.test(primary) ? _('Connected') : primary;
		}
		else {
			primary = _('No link');
		}

		this.updatePortSpeed(heroBody, primary, meta, portName);

		const icon = heroBody.querySelector(':scope > .apple-port-icon');

		if (icon)
			icon.dataset.state = carrier ? 'up' : 'down';
	},

	updatePortSpeed(heroBody, primary, meta, titlePrefix) {
		const speed = heroBody.querySelector('.apple-port-status-speed');

		if (!speed)
			return;

		let value = speed.querySelector(':scope > .apple-port-status-speed-value');
		let metaNode = speed.querySelector(':scope > .apple-port-status-speed-meta');

		if (!value) {
			value = E('span', { 'class': 'apple-port-status-speed-value' });
			speed.appendChild(value);
		}

		value.textContent = primary;

		if (meta && meta.length) {
			if (!metaNode) {
				metaNode = E('span', { 'class': 'apple-port-status-speed-meta' });
				speed.appendChild(metaNode);
			}

			metaNode.textContent = meta.join(' · ');
		}
		else if (metaNode) {
			metaNode.remove();
		}

		speed.setAttribute('title', [ titlePrefix, primary ].concat(meta || []).filter(Boolean).join(' · '));
	},

	formatPortSpeed(speed) {
		const value = Number(speed);

		if (!Number.isFinite(value) || value <= 0)
			return _('Connected');

		if (value < 1000)
			return '%d\u202fM'.format(value);

		const gbps = value / 1000;

		if (Math.round(gbps) === gbps)
			return '%d\u202fGbE'.format(gbps);

		return '%.1f\u202fGbE'.format(gbps);
	},

	decoratePortStatusStats(statsTrigger) {
		if (!statsTrigger || statsTrigger.dataset.applePortStatsDecorated === 'true')
			return;

		const tooltip = statsTrigger.querySelector(':scope > .cbi-tooltip');
		const fragments = [];
		let current = [];

		Array.from(statsTrigger.childNodes).forEach((node) => {
			if (node === tooltip)
				return;

			if (node.nodeType === 1 && node.tagName === 'BR') {
				if (current.length) {
					fragments.push(current);
					current = [];
				}
				node.remove();
				return;
			}

			const text = node.textContent?.replace(/\s+/g, ' ')?.trim();

			if (text)
				current.push(node);
			else if (node.parentNode === statsTrigger)
				node.remove();
		});

		if (current.length)
			fragments.push(current);

		fragments.forEach((nodes) => {
			const line = E('span', { 'class': 'apple-port-stats-line' });

			nodes.forEach((node) => line.appendChild(node));
			statsTrigger.insertBefore(line, tooltip || null);
		});

		if (tooltip) {
			const summary = fragments.map((nodes) => nodes.map((node) => node.textContent || '').join('').replace(/\s+/g, ' ').trim()).filter(Boolean).join(' · ');

			if (summary)
				statsTrigger.setAttribute('title', summary);
		}

		statsTrigger.dataset.applePortStatsDecorated = 'true';
	},

	isCompactView() {
		return window.matchMedia(SIDEBAR_COMPACT_QUERY).matches;
	},

	syncSidebarState(forceOpen) {
		const compact = this.isCompactView();
		const open = compact ? (typeof(forceOpen) === 'boolean' ? forceOpen : document.body.classList.contains('sidebar-open')) : true;

		if (this.nodes.navigationToggle) {
			this.nodes.navigationToggle.classList.toggle('active', compact && open);
			this.nodes.navigationToggle.setAttribute('aria-expanded', compact && open ? 'true' : 'false');
		}

		if (this.nodes.mainMenu) {
			this.nodes.mainMenu.classList.toggle('active', compact && open);
			this.nodes.mainMenu.setAttribute('aria-hidden', compact && !open ? 'true' : 'false');
		}

		if (!compact)
			document.body.classList.remove('sidebar-open');
	},

	openSidebar() {
		document.body.classList.add('sidebar-open');
		this.syncSidebarState(true);
	},

	closeSidebar() {
		document.body.classList.remove('sidebar-open');
		this.syncSidebarState(false);
	},

	getMenuIconKey(name, title) {
		const normalized = String(name || '').toLowerCase();
		const titleText = String(title || '').toLowerCase();

		if (MENU_ICON_MAP[normalized])
			return MENU_ICON_MAP[normalized];

		if (/(status|overview|statistics)/.test(normalized) || /(status|overview|statistics)/.test(titleText))
			return 'status';
		if (/(network|internet|wan|lan|wireless|modem)/.test(normalized) || /(network|internet|wireless)/.test(titleText))
			return 'network';
		if (/(system|admin|terminal|log)/.test(normalized) || /(system|administration)/.test(titleText))
			return 'system';
		if (/(service|docker|app)/.test(normalized) || /(service|application)/.test(titleText))
			return 'services';
		if (/(vpn|firewall|security)/.test(normalized) || /(vpn|firewall|security)/.test(titleText))
			return 'shield';
		if (/(nas|storage|disk|usb|mount)/.test(normalized) || /(storage|disk|share)/.test(titleText))
			return 'storage';

		return 'category';
	},

	readSidebarState() {
		if (this.sidebarState)
			return this.sidebarState;

		try {
			const state = JSON.parse(sessionStorage.getItem(SIDEBAR_STATE_KEY) || '{}');
			return L.isObject(state) ? state : {};
		}
		catch (e) {
			return {};
		}
	},

	writeSidebarState() {
		try {
			sessionStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(this.sidebarState || {}));
		}
		catch (e) {}
	},

	getMenuStateKey(menuKey) {
		return '%s:%s'.format(this.currentSidebarMode || 'root', menuKey || '');
	},

	readMenuExpanded(menuKey) {
		const key = this.getMenuStateKey(menuKey);
		return !!this.sidebarState[key];
	},

	writeMenuExpanded(menuKey, expanded) {
		const key = this.getMenuStateKey(menuKey);
		this.sidebarState[key] = !!expanded;
		this.writeSidebarState();
	},

	setMenuExpanded(menuItem, expanded) {
		if (!menuItem)
			return;

		const link = menuItem.querySelector(':scope > a');
		const disclosure = menuItem.querySelector(':scope > .mainmenu-disclosure');

		menuItem.classList.toggle('is-open', expanded);
		menuItem.classList.toggle('active', expanded);

		if (link)
			link.setAttribute('aria-expanded', expanded ? 'true' : 'false');

		if (disclosure)
			disclosure.setAttribute('aria-expanded', expanded ? 'true' : 'false');
	},

	normalizeTopLevelMenuState() {
		const items = this.nodes?.mainMenu?.querySelectorAll('.mainmenu.l1 > li.has-children');

		if (!items || !items.length)
			return;

		let activeItem = null;
		let rememberedItem = null;

		items.forEach((item) => {
			if (!activeItem && item.classList.contains('selected'))
				activeItem = item;

			if (!rememberedItem && this.readMenuExpanded(item.dataset.menuKey))
				rememberedItem = item;
		});

		const targetItem = activeItem || rememberedItem || items[0];

		items.forEach((item) => {
			const expanded = (item === targetItem);

			this.setMenuExpanded(item, expanded);
			this.writeMenuExpanded(item.dataset.menuKey, expanded);
		});
	},

	collapseSiblingMenuItems(menuItem) {
		if (!menuItem || !menuItem.parentNode)
			return;

		menuItem.parentNode.querySelectorAll(':scope > li.has-children').forEach((item) => {
			if (item === menuItem)
				return;

			this.setMenuExpanded(item, false);
			this.writeMenuExpanded(item.dataset.menuKey, false);
		});
	},

	toggleMenuItem(menuItem, forceExpanded) {
		if (!menuItem)
			return;

		const nextExpanded = typeof(forceExpanded) === 'boolean'
			? forceExpanded
			: !menuItem.classList.contains('is-open');

		if (nextExpanded)
			this.collapseSiblingMenuItems(menuItem);

		this.setMenuExpanded(menuItem, nextExpanded);
		this.writeMenuExpanded(menuItem.dataset.menuKey, nextExpanded);
	}
});
