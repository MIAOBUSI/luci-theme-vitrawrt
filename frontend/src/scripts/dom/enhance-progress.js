const PROGRESS_SELECTOR = '.cbi-progressbar, .progressbar, .progress, progress';
const PROGRESS_STATES = new Set(['neutral', 'success', 'warning', 'danger']);
const INFO_CLASSES = new Set(['vw-progress__summary', 'vw-progress__percent']);
const TRACK_CLASS = 'vw-progress__track';
const pending = new Set();
let observer;
let flushScheduled = false;

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function setAttributeIfChanged(node, name, value) {
	const next = String(value);

	if (node.getAttribute(name) !== next)
		node.setAttribute(name, next);
}

function percentageFromTitle(title) {
	const match = String(title || '').match(/(?:^|\D)(\d+(?:\.\d+)?)\s*%/);
	return match ? clamp(Number(match[1]), 0, 100) : null;
}

function percentageFromWidth(node) {
	const width = node?.style?.width || '';
	const match = width.match(/^(\d+(?:\.\d+)?)%$/);
	return match ? clamp(Number(match[1]), 0, 100) : null;
}

function percentageFromAria(bar) {
	if (bar.hasAttribute('aria-valuenow')) {
		const ariaValue = Number(bar.getAttribute('aria-valuenow'));
		if (Number.isFinite(ariaValue))
			return clamp(ariaValue, 0, 100);
	}

	if (bar.hasAttribute('aria-valuetext')) {
		const ariaTextValue = percentageFromTitle(bar.getAttribute('aria-valuetext'));
		if (ariaTextValue !== null)
			return ariaTextValue;
	}

	return null;
}

function isInfoNode(node) {
	return node instanceof Element && [...INFO_CLASSES].some((className) => node.classList.contains(className));
}

function originalFill(bar) {
	if (bar.tagName === 'PROGRESS')
		return null;

	const track = bar.querySelector(`:scope > .${TRACK_CLASS}`);
	if (track) {
		return Array.from(track.children).find((child) => !isInfoNode(child)) || null;
	}

	return Array.from(bar.children).find((child) => !isInfoNode(child) && !child.classList.contains(TRACK_CLASS)) || null;
}

function progressValue(bar) {
	if (bar.tagName === 'PROGRESS') {
		const max = Number(bar.max) || 1;
		return clamp((Number(bar.value) / max) * 100, 0, 100);
	}

	const widthValue = percentageFromWidth(originalFill(bar));
	if (widthValue !== null)
		return widthValue;

	const titleValue = percentageFromTitle(bar.title);
	if (titleValue !== null)
		return titleValue;

	const ariaValue = percentageFromAria(bar);
	if (ariaValue !== null)
		return ariaValue;

	return null;
}

function progressState(bar, value) {
	const explicit = bar.getAttribute('data-vw-progress-state');
	if (PROGRESS_STATES.has(explicit))
		return explicit;

	const context = [
		bar.className,
		bar.closest('.alert, .notice, .warning, .error, .success, .danger')?.className || ''
	].join(' ').toLowerCase();

	if (/(danger|error|critical|negative)/.test(context))
		return 'danger';
	if (/(warning|warn|caution)/.test(context))
		return 'warning';
	if (/(success|positive|ok)/.test(context))
		return 'success';

	return 'neutral';
}

function progressVariant(bar) {
	const explicit = bar.getAttribute('data-vw-progress-variant');
	if (explicit === 'compact' || explicit === 'full')
		return explicit;

	if (bar.classList.contains('vw-progress-compact') || bar.closest('.ifacebox, .td.cbi-progressbar'))
		return 'compact';

	const width = bar.getBoundingClientRect?.().width || 0;
	return width > 0 && width < 180 ? 'compact' : 'full';
}

function titleSummary(title, value) {
	const text = String(title || '')
		.replace(/\s*\(?\d+(?:\.\d+)?\s*%\)?\s*/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

	if (text)
		return text;

	if (typeof value === 'number')
		return 'Progress';

	return '';
}

function percentText(value) {
	return typeof value === 'number' ? `${Math.round(value)}%` : '';
}

function setTextIfChanged(node, value) {
	const next = String(value || '');
	if (node.textContent !== next)
		node.textContent = next;
}

function ensureInfoNode(bar, className) {
	let node = Array.from(bar.children).find((child) => child.classList?.contains(className));

	if (!node) {
		const txt = document.createElement('span');
		txt.className = className;
		bar.appendChild(txt);
		node = txt;
	}

	return node;
}

function ensureTrackNode(bar, fill) {
	let track = Array.from(bar.children).find((child) => child.classList?.contains(TRACK_CLASS));

	if (!track) {
		track = document.createElement('span');
		track.className = TRACK_CLASS;

		if (fill)
			bar.insertBefore(track, fill);
		else
			bar.appendChild(track);
	}

	if (fill && fill.parentElement !== track)
		track.appendChild(fill);

	return track;
}

export function enhanceProgress(root = document) {
	const bars = [];

	if (root instanceof Element && root.matches(PROGRESS_SELECTOR))
		bars.push(root);

	if (root.querySelectorAll)
		bars.push(...root.querySelectorAll(PROGRESS_SELECTOR));

	for (const bar of bars) {
		if (isInfoNode(bar))
			continue;

		const value = progressValue(bar);
		const state = progressState(bar, value);
		const title = bar.getAttribute('title') || bar.getAttribute('aria-valuetext') || '';
		const summary = titleSummary(title, value);
		const percent = percentText(value);

		bar.classList.add('vw-progress', 'vw-material-progress');
		setAttributeIfChanged(bar, 'data-vw-progress-enhanced', 'true');
		setAttributeIfChanged(bar, 'data-vw-progress-state', state);
		setAttributeIfChanged(bar, 'data-vw-progress-variant', progressVariant(bar));

		if (bar.tagName !== 'PROGRESS') {
			setAttributeIfChanged(bar, 'role', 'progressbar');
			setAttributeIfChanged(bar, 'aria-valuemin', '0');
			setAttributeIfChanged(bar, 'aria-valuemax', '100');

			const fill = originalFill(bar);
			ensureTrackNode(bar, fill);
			if (fill) {
				fill.classList.add('vw-progress__fill');
				if (value !== null)
					fill.style.setProperty('--vw-progress-fill-width', `${value}%`);
			}

			const summaryNode = ensureInfoNode(bar, 'vw-progress__summary');
			const percentNode = ensureInfoNode(bar, 'vw-progress__percent');
			setTextIfChanged(summaryNode, summary || 'Progress');
			setTextIfChanged(percentNode, percent);
		}

		if (value !== null)
			setAttributeIfChanged(bar, 'aria-valuenow', Math.round(value * 100) / 100);

		if (title) {
			setAttributeIfChanged(bar, 'aria-valuetext', bar.title || title);
			if (!bar.hasAttribute('aria-label') && !bar.hasAttribute('aria-labelledby'))
				setAttributeIfChanged(bar, 'aria-label', bar.title || title);
		}
	}
}

function queueEnhancement(node) {
	if (!(node instanceof Element))
		return;

	const bar = node.matches(PROGRESS_SELECTOR) ? node : node.closest(PROGRESS_SELECTOR);
	pending.add(bar || node);

	if (!flushScheduled) {
		flushScheduled = true;
		Promise.resolve().then(() => {
			flushScheduled = false;
			for (const target of pending)
				enhanceProgress(target);
			pending.clear();
		});
	}
}

export function initProgressEnhancement() {
	if (observer)
		return;

	const scope = document.querySelector('#maincontent') || document.querySelector('#view') || document.body;
	if (!scope)
		return;

	enhanceProgress(scope);

	observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			queueEnhancement(mutation.target);
			for (const node of mutation.addedNodes)
				queueEnhancement(node);
		}
	});

	observer.observe(scope, {
		attributes: true,
		attributeFilter: ['style', 'title', 'value', 'max', 'data-vw-progress-state'],
		childList: true,
		subtree: true
	});
}
