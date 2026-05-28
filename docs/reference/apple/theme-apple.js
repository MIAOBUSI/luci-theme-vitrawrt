'use strict';
'require baseclass';

const STORAGE_KEY = 'luci-theme-apple-mode';
const SYSTEM_LIGHT_QUERY = '(prefers-color-scheme: light)';
const MOBILE_MAX = 720;
const TABLET_MAX = 1180;

return baseclass.extend({
	__init__() {
		this.root = document.documentElement;
		this.body = document.body;
		this.metaThemeColor = document.querySelector('meta[name="theme-color"]');
		this.switcher = document.querySelector('[data-theme-switch]');
		this.systemThemeQuery = window.matchMedia ? window.matchMedia(SYSTEM_LIGHT_QUERY) : null;
		this.viewportHandler = this.handleViewportChange.bind(this);
		this.storageHandler = this.handleStorageChange.bind(this);
		this.systemThemeHandler = this.handleSystemThemeChange.bind(this);

		this.bindThemeSwitcher();
		this.bindViewportWatcher();
		this.bindStorageWatcher();
		this.bindSystemThemeWatcher();
		this.applyTheme(this.readStoredMode());
		this.handleViewportChange();
		this.root.setAttribute('data-theme-ready', 'true');

		if (this.body)
			this.body.setAttribute('data-theme-ready', 'true');
	},

	normalizeMode(mode) {
		return /^(light|dark|auto)$/.test(mode) ? mode : 'auto';
	},

	readStoredMode() {
		try {
			return this.normalizeMode(localStorage.getItem(STORAGE_KEY) || this.root.getAttribute('data-theme-mode') || 'auto');
		}
		catch (e) {
			return this.normalizeMode(this.root.getAttribute('data-theme-mode') || 'auto');
		}
	},

	persistMode(mode) {
		try {
			localStorage.setItem(STORAGE_KEY, mode);
		}
		catch (e) {}
	},

	resolveTheme(mode) {
		if (mode !== 'auto')
			return mode;

		return (this.systemThemeQuery && this.systemThemeQuery.matches) ? 'light' : 'dark';
	},

	applyTheme(mode) {
		const themeMode = this.normalizeMode(mode);
		const theme = this.resolveTheme(themeMode);

		this.root.setAttribute('data-theme-mode', themeMode);
		this.root.setAttribute('data-theme', theme);
		this.root.style.colorScheme = theme;

		if (this.body) {
			this.body.setAttribute('data-theme-mode', themeMode);
			this.body.setAttribute('data-theme', theme);
		}

		if (this.metaThemeColor)
			this.metaThemeColor.setAttribute('content', theme === 'light' ? '#eef4ff' : '#0f172a');

		this.updateSwitcher(themeMode, theme);
	},

	updateSwitcher(mode, theme) {
		if (!this.switcher)
			return;

		this.switcher.setAttribute('data-active-theme', theme);

		this.switcher.querySelectorAll('[data-theme-mode]').forEach((button) => {
			const isActive = (button.getAttribute('data-theme-mode') === mode);

			button.classList.toggle('active', isActive);
			button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
		});
	},

	bindThemeSwitcher() {
		if (!this.switcher)
			return;

		if (this.switcher.dataset.themeBootstrap === 'true') {
			this.switcher.dataset.appleBound = 'true';
			return;
		}

		if (this.switcher.dataset.appleBound === 'true')
			return;

		this.switcher.dataset.appleBound = 'true';
		this.switcher.addEventListener('click', (ev) => {
			const button = ev.target.closest('[data-theme-mode]');

			if (!button || !this.switcher.contains(button))
				return;

			const mode = this.normalizeMode(button.getAttribute('data-theme-mode'));

			this.persistMode(mode);
			this.applyTheme(mode);
		});
	},

	bindViewportWatcher() {
		window.addEventListener('resize', this.viewportHandler, { passive: true });
	},

	handleViewportChange() {
		const width = window.innerWidth || this.root.clientWidth || 0;
		const viewport = width <= MOBILE_MAX ? 'mobile' : (width <= TABLET_MAX ? 'tablet' : 'desktop');

		this.root.setAttribute('data-viewport', viewport);

		if (!this.body)
			return;

		this.body.setAttribute('data-viewport', viewport);
		this.body.classList.toggle('is-mobile', viewport === 'mobile');
		this.body.classList.toggle('is-tablet', viewport === 'tablet');
		this.body.classList.toggle('is-desktop', viewport === 'desktop');
	},

	bindStorageWatcher() {
		window.addEventListener('storage', this.storageHandler);
	},

	handleStorageChange(ev) {
		if (ev.key !== STORAGE_KEY)
			return;

		this.applyTheme(this.normalizeMode(ev.newValue || 'auto'));
	},

	bindSystemThemeWatcher() {
		if (!this.systemThemeQuery)
			return;

		if (typeof this.systemThemeQuery.addEventListener === 'function')
			this.systemThemeQuery.addEventListener('change', this.systemThemeHandler);
		else if (typeof this.systemThemeQuery.addListener === 'function')
			this.systemThemeQuery.addListener(this.systemThemeHandler);
	},

	handleSystemThemeChange() {
		if (this.readStoredMode() === 'auto')
			this.applyTheme('auto');
	}
});
