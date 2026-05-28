(function() {
	'use strict';

	var KEY = 'vitrawrt.theme';
	var MODES = ['system', 'light', 'dark'];
	var root = document.documentElement;
	var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

	function isValidMode(mode) {
		return MODES.indexOf(mode) !== -1;
	}

	function readMode() {
		var mode = 'system';

		try {
			mode = localStorage.getItem(KEY) || mode;
		}
		catch (e) {}

		return isValidMode(mode) ? mode : 'system';
	}

	function writeMode(mode) {
		try {
			localStorage.setItem(KEY, mode);
		}
		catch (e) {}
	}

	function resolveMode(mode) {
		if (mode === 'dark')
			return 'dark';

		if (mode === 'light')
			return 'light';

		return media && media.matches ? 'dark' : 'light';
	}

	function updateControls(mode) {
		if (!document.querySelectorAll)
			return;

		var resolved = resolveMode(mode);
		var labels = {
			system: 'System',
			light: 'Light',
			dark: 'Dark'
		};

		document.querySelectorAll('[data-vwrt-theme-value]').forEach(function(button) {
			var selected = button.getAttribute('data-vwrt-theme-value') === mode;
			button.setAttribute('aria-pressed', selected ? 'true' : 'false');
			button.classList.toggle('is-active', selected);
		});

		document.querySelectorAll('[data-vwrt-theme-current]').forEach(function(node) {
			node.textContent = labels[mode] || labels.system;
		});

		document.querySelectorAll('[data-vwrt-theme-resolved]').forEach(function(node) {
			node.textContent = resolved;
		});
	}

	function applyMode(mode, persist) {
		if (!isValidMode(mode))
			mode = 'system';

		if (persist)
			writeMode(mode);

		root.setAttribute('data-theme-mode', mode);
		root.setAttribute('data-theme', resolveMode(mode));
		updateControls(mode);
	}

	function cycleMode() {
		var mode = readMode();
		var index = MODES.indexOf(mode);
		applyMode(MODES[(index + 1) % MODES.length], true);
	}

	window.VitraWrtTheme = {
		getMode: readMode,
		setMode: function(mode) {
			applyMode(mode, true);
		},
		cycle: cycleMode,
		apply: function() {
			applyMode(readMode(), false);
		}
	};

	applyMode(readMode(), false);

	if (media) {
		var onSystemChange = function() {
			if (readMode() === 'system')
				applyMode('system', false);
		};

		if (media.addEventListener)
			media.addEventListener('change', onSystemChange);
		else if (media.addListener)
			media.addListener(onSystemChange);
	}

	document.addEventListener('DOMContentLoaded', function() {
		updateControls(readMode());

		document.addEventListener('click', function(ev) {
			var valueButton = ev.target.closest('[data-vwrt-theme-value]');
			var cycleButton = ev.target.closest('[data-vwrt-theme-action="cycle"]');

			if (valueButton) {
				applyMode(valueButton.getAttribute('data-vwrt-theme-value'), true);
				ev.preventDefault();
			}
			else if (cycleButton) {
				cycleMode();
				ev.preventDefault();
			}
		});
	});
})();
