(function() {
	'use strict';

	var root = document.documentElement;
	var KEY = 'vitrawrt.glass';
	var reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
	var supportsGlass = false;

	try {
		supportsGlass = CSS.supports('backdrop-filter', 'blur(1px)') ||
			CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
	}
	catch (e) {}

	function readPreference() {
		try {
			return localStorage.getItem(KEY) || 'auto';
		}
		catch (e) {
			return 'auto';
		}
	}

	function writePreference(value) {
		try {
			localStorage.setItem(KEY, value);
		}
		catch (e) {}
	}

	function resolve(value) {
		if (value === 'low')
			return 'low';

		if (value === 'high')
			return supportsGlass ? 'high' : 'low';

		if (!supportsGlass || (reduced && reduced.matches))
			return 'low';

		return 'high';
	}

	function updateControls(value) {
		document.querySelectorAll('[data-vwrt-glass-value]').forEach(function(button) {
			var selected = button.getAttribute('data-vwrt-glass-value') === value;
			button.setAttribute('aria-pressed', selected ? 'true' : 'false');
			button.classList.toggle('is-active', selected);
		});
	}

	function apply(value, persist) {
		if (['auto', 'high', 'low'].indexOf(value) === -1)
			value = 'auto';

		if (persist)
			writePreference(value);

		root.setAttribute('data-vwrt-glass-pref', value);
		root.setAttribute('data-vwrt-glass', resolve(value));
		updateControls(value);
	}

	window.VitraWrtGlass = {
		get: readPreference,
		set: function(value) {
			apply(value, true);
		},
		apply: function() {
			apply(readPreference(), false);
		}
	};

	apply(readPreference(), false);

	if (reduced) {
		var onMotionChange = function() {
			if (readPreference() === 'auto')
				apply('auto', false);
		};

		if (reduced.addEventListener)
			reduced.addEventListener('change', onMotionChange);
		else if (reduced.addListener)
			reduced.addListener(onMotionChange);
	}

	document.addEventListener('DOMContentLoaded', function() {
		updateControls(readPreference());

		document.addEventListener('click', function(ev) {
			var button = ev.target.closest('[data-vwrt-glass-value]');

			if (button) {
				apply(button.getAttribute('data-vwrt-glass-value'), true);
				ev.preventDefault();
			}
		});
	});
})();
