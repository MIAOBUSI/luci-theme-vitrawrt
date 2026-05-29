(function() {
	'use strict';

	var root = document.documentElement;
	var observer;
	var PAGE_CLASSES = [
		'vwrt-page-overview',
		'vwrt-page-network',
		'vwrt-page-vnstat2',
		'vwrt-page-system',
		'vwrt-page-packages',
		'vwrt-page-startup',
		'vwrt-page-processes',
		'vwrt-page-syslog',
		'vwrt-page-network-share',
		'vwrt-page-firewall',
		'vwrt-page-nftables',
		'vwrt-page-openclash',
		'vwrt-page-mosdns',
		'vwrt-page-cpulimit',
		'vwrt-page-plugin'
	];

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
		if (!document.body)
			return;

		var path = getPathText();

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
			document.body.classList.add('vwrt-page-network-share');

		if (/(^|\s)(admin\/)?services\/openclash(\s|\/|$)|openclash/.test(path))
			document.body.classList.add('vwrt-page-openclash', 'vwrt-page-plugin');

		if (/(^|\s)(admin\/)?services\/mosdns(\s|\/|$)|mosdns/.test(path))
			document.body.classList.add('vwrt-page-mosdns', 'vwrt-page-plugin');

		if (/(^|\s)(admin\/)?services\/(?:cpulimit|cpu[-_]?limit)(\s|\/|$)|cpu[-_ ]?limit/.test(path))
			document.body.classList.add('vwrt-page-cpulimit', 'vwrt-page-plugin');

		if (/(^|\s)(admin\/)?services\/(?!openclash|mosdns|cpulimit|cpu[-_]?limit)[a-z0-9_-]+/.test(path))
			document.body.classList.add('vwrt-page-plugin');
	}

	function viewReady() {
		var view = document.getElementById('view');
		var children;

		if (!view)
			return true;

		children = Array.prototype.filter.call(view.children, function(child) {
			return child.nodeType === 1;
		});

		return !(children.length === 1 && children[0].classList.contains('spinning'));
	}

	function parseProgressText(rawText) {
		var pctMatch = rawText.match(/(\d+(?:\.\d+)?\s*[%％])/);
		var pctPart = pctMatch ? pctMatch[1] : '';
		var textPart = rawText;
		
		if (pctPart) {
			var match1 = rawText.match(/^(.*?)\s*\(\s*(?:\d+(?:\.\d+)?\s*[%％])\s*\)\s*$/);
			if (match1) {
				textPart = match1[1];
			} else {
				var match2 = rawText.match(/^(?:\d+(?:\.\d+)?\s*[%％])\s*(?:used|已使用|free|剩余|可用|cached|已缓存|buffered|已缓冲)?\s*\(\s*(.*?)\s*\)\s*$/);
				if (match2) {
					textPart = match2[1];
				} else {
					textPart = rawText.replace(pctPart, '').trim();
					textPart = textPart.replace(/^(?:used|已使用|free|剩余|可用|cached|已缓存|buffered|已缓冲)\s*/, '').trim();
					textPart = textPart.replace(/^\(\s*(.*?)\s*\)$/, '$1').trim();
					textPart = textPart.replace(/^[，,]\s*/, '').trim();
				}
			}
		}
		return { pct: pctPart, text: textPart };
	}

	function enhanceProgressMeters() {
		var bars = document.querySelectorAll('.cbi-progressbar:not(.vw-pb-enhanced)');
		for (var i = 0; i < bars.length; i++) {
			var bar = bars[i];
			var inner = bar.querySelector('div');
			if (!inner) continue;
			
			bar.classList.add('vw-pb-enhanced');
			
			(function(b, inn) {
				function updateDOM() {
					var rawTitle = b.getAttribute('title') || inn.textContent.trim();
					if (!rawTitle || rawTitle === 'unknown' || rawTitle === '?') return;
					
					var parsed = parseProgressText(rawTitle);
					b.setAttribute('data-vw-text', parsed.text);
					b.setAttribute('data-vw-pct', parsed.pct);
					
					var td = b.closest('td');
					var prevTd = td ? td.previousElementSibling : null;
					var label = prevTd ? prevTd.textContent.toLowerCase() : '';
					
					if (label.indexOf('available') !== -1 || label.indexOf('可用') !== -1 || label.indexOf('free') !== -1 || label.indexOf('空闲') !== -1) {
						b.setAttribute('data-vw-variant', 'success');
					} else {
						b.removeAttribute('data-vw-variant');
					}
				}
				
				updateDOM();
				
				var mo = new MutationObserver(updateDOM);
				mo.observe(inn, { attributes: true, attributeFilter: ['style'], characterData: true, childList: true, subtree: true });
				mo.observe(b, { attributes: true, attributeFilter: ['title'] });
			})(bar, inner);
		}
	}

	function updateReadyClass() {
		if (!document.body)
			return;

		document.body.classList.toggle('vwrt-view-ready', viewReady());
		setPageClasses();
		enhanceProgressMeters();
	}

	function watchViewReady() {
		if (!document.body || observer)
			return;

		observer = new MutationObserver(updateReadyClass);
		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	function init() {
		root.classList.add('vwrt-ready');
		root.classList.add('vitrawrt-ready');
		root.dataset.vitrawrt = '1.41C-R3';

		if (document.body)
			document.body.classList.add('vitrawrt-body');

		updateReadyClass();
		watchViewReady();

		window.setTimeout(updateReadyClass, 600);
		window.setTimeout(updateReadyClass, 1800);
		window.setTimeout(updateReadyClass, 4200);
	}

	if (document.readyState === 'loading')
		document.addEventListener('DOMContentLoaded', init);
	else
		init();
})();
