#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import process from 'process';

const root = process.argv[2] || path.join('htdocs', 'luci-static', 'vitrawrt');
const failures = [];
const warnings = [];
const loadedCssNames = new Set();
const allowedPageScopes = [
	'body.vwrt-page-startup',
	'body.vwrt-page-processes',
	'body.vwrt-page-syslog',
	'body.vwrt-page-network-share',
	'body.vwrt-page-packages',
	'body.vwrt-page-vnstat2',
	'body.vwrt-page-overview',
	'body.vwrt-page-openclash',
	'body.vwrt-page-mosdns',
	'body.vwrt-page-plugin',
	'body.vwrt-page-cpulimit',
	'body.vwrt-page-repokeys',
	'body.vwrt-page-network',
	'body.vwrt-page-firewall',
	'body.vwrt-page-system'
];

async function walk(dir, extensions = ['.css']) {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const full = path.join(dir, entry.name);

		if (entry.isDirectory())
			files.push(...await walk(full, extensions));
		else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext)))
			files.push(full);
	}

	return files;
}

function stripComments(css) {
	return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function lineFor(source, index) {
	return source.slice(0, index).split('\n').length;
}

function selectorHas(selector, token) {
	const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`(^|[\\s>+~,])${escaped}(?![-_a-zA-Z0-9])`).test(selector);
}

function selectorHasElement(selector, element) {
	return new RegExp(`(^|[\\s>+~,])${element}(?=[:.#\\[\\s>+~,]|$)`).test(selector);
}

function declarationMap(decls) {
	const map = new Map();

	for (const part of decls.split(';')) {
		const idx = part.indexOf(':');

		if (idx === -1)
			continue;

		map.set(part.slice(0, idx).trim().toLowerCase(), part.slice(idx + 1).trim().toLowerCase());
	}

	return map;
}

function declValue(decls, prop) {
	return declarationMap(decls).get(prop) || '';
}

function hasDecl(decls, prop, pattern) {
	return new RegExp(`(^|;)\\s*${prop}\\s*:\\s*${pattern}`, 'i').test(decls);
}

function numericPx(value) {
	const match = String(value || '').match(/^([0-9]+(?:\.[0-9]+)?)px$/i);
	return match ? Number(match[1]) : null;
}

function report(file, line, selector, message) {
	failures.push({
		file,
		line,
		selector: selector.trim().replace(/\s+/g, ' '),
		message
	});
}

function warn(file, line, selector, message) {
	warnings.push({
		file,
		line,
		selector: selector.trim().replace(/\s+/g, ' '),
		message
	});
}

function isPageScoped(selector) {
	return allowedPageScopes.some((scope) => selector.includes(scope)) ||
		/body:is\([^)]*\.vwrt-page-[^)]+\)/.test(selector);
}

function isStructuredTableScoped(selector) {
	return selector.includes('.vwrt-table-boolean-first') ||
		selector.includes('.vwrt-table-has-actions') ||
		selector.includes('.vwrt-table-many-columns');
}

function isAllowedCoreStateRule(file, selector) {
	return /luci-layout-exceptions\.css$/.test(file) &&
		/^#maincontent\s+\[data-tab-active="(?:true|false)"\]$/.test(selector.trim());
}

function isAllowedVnstat2PanelRule(file, selector) {
	return /(?:luci-layout-exceptions|luci-pages)\.css$/.test(file) &&
		selector.includes('body.vwrt-page-vnstat2') &&
		selector.includes('.cbi-section[data-tab]');
}

function isAllowedProcessTableGridRule(file, selector) {
	return /luci-layout-exceptions\.css$/.test(file) &&
		selector.includes('body.vwrt-page-processes');
}

function isLoadedCss(file) {
	return loadedCssNames.has(path.basename(file));
}

function isComponentVisualFile(file) {
	return /(?:luci-components-visual|luci-components)\.css$/.test(file) && isLoadedCss(file);
}

function isViteBundle(file) {
	return /vitrawrt-apple\.css$/.test(file) && isLoadedCss(file);
}

function isViteSourceStyle(file) {
	const normalized = file.split(path.sep).join('/');
	return normalized.includes('/frontend/src/styles/') && isLoadedCss(file);
}

function isProgressSelector(selector) {
	return selector.includes('.cbi-progressbar') ||
		selector.includes('.progressbar') ||
		selector.includes('.progress') ||
		selectorHasElement(selector, 'progress');
}

function isApplyAreaSelector(selector) {
	return selector.includes('.cbi-page-actions') ||
		selector.includes('#applyreboot-section') ||
		selector.includes('#uci-apply');
}

function isVisibleCbiValueSelector(selector) {
	return selector.includes('.cbi-value') &&
		!selector.includes('.cbi-page-actions') &&
		!selector.includes('#uci-apply') &&
		!selector.includes('#applyreboot-section');
}

function targetsShellAncestor(selector) {
	return selector.split(',').some((part) => {
		const s = part.trim();
		const tokens = s.split(/\s*[>+~]\s*|\s+/).filter(Boolean);
		const last = tokens[tokens.length - 1] || '';
		return /^(html|body|#maincontent|main|#vwrt-app|\.vitra-page|\.vwrt-shell-body)(?:$|[:.#\[])/.test(last);
	});
}

function allowedComponentVisualProp(selector, prop, value) {
	if (prop === 'display' && isVisibleCbiValueSelector(selector) && /^(flex|block)$/.test(value))
		return true;
	if (prop === 'display' && (selector.includes('.cbi-tabmenu') || selector.includes('.tabs')) && /^(inline-flex|flex)$/.test(value))
		return true;
	if (prop === 'width' && (selector.includes('.cbi-tabmenu') || selector.includes('.tabs')) && value === 'fit-content')
		return true;
	if (prop === 'display' && (selector.includes('.cbi-dynlist') || selector.includes('.cbi-dynlist-item') || selector.includes('.add-item')) && /^(inline-flex|flex)$/.test(value))
		return true;
	if (prop === 'display' && isAllowedVnstat2PanelRule('luci-pages.css', selector) && value === 'none')
		return true;

	if (prop === 'opacity' && selector.includes('.ifacebox') && selector.includes('.cbi-tooltip'))
		return value === '1';

	if (prop === 'visibility' &&
		selector.includes('.ifacebox') &&
		selector.includes('.cbi-tooltip-container') &&
		selector.includes('.cbi-tooltip') &&
		selector.includes(':hover'))
		return value === 'visible';

	if ((prop === 'flex' || prop === 'flex-direction') && isVisibleCbiValueSelector(selector))
		return true;

	if (prop === 'min-width' && isVisibleCbiValueSelector(selector))
		return value === '0';

	if ((prop === 'min-width' || prop === 'max-width') &&
		(selector.includes('input') || selector.includes('select') || selector.includes('textarea') || selector.includes('.cbi-dropdown'))) {
		return /^(0|100%|min\(|max\(|clamp\(|[0-9.]+(px|rem|em))/.test(value);
	}

	if (prop === 'height' && isProgressSelector(selector)) {
		if (value === 'var(--vw-progress-height)')
			return true;
		const px = numericPx(value);
		return px !== null && px >= 8 && px <= 24;
	}

	if (selector.includes('.cbi-dropdown')) {
		if (selector.includes('::after')) {
			if (/^(position|opacity|pointer-events|transform|width|height|top|right|content|background-color|mask|-webkit-mask)$/.test(prop)) return true;
		} else {
			if (prop === 'position' && value === 'relative') return true;
		}
	}

	if (selector.includes('.vwrt-progress-meter')) {
		if (selector.includes(' > div')) {
			if (/^(position|z-index|overflow|height|background|box-shadow|border)$/.test(prop)) return true;
		} else if (selector.includes('.vwrt-progress-track') || selector.includes('.vwrt-progress-fill') || selector.includes('.vwrt-progress-shine')) {
			if (/^(position|z-index|pointer-events|width|max-width|min-width|top|bottom|left|inset|border-radius|background|box-shadow|transition)$/.test(prop)) return true;
		} else {
			if (/^(display|align-items|position|min-height|border-radius|background|border|box-shadow|overflow|padding|z-index)$/.test(prop)) return true;
		}
	}

	if (isProgressSelector(selector) && !selector.includes('.vwrt-progress-meter')) {
		if (selector.includes('::after') || selector.includes('::before')) {
			if (/^(position|pointer-events|content|inset|border-radius|box-shadow|background|color|font-size|font-weight|padding|line-height)$/.test(prop)) return true;
		} else if (selector.includes('> div') || selector.includes('::-webkit-progress-value')) {
			if (/^(display|position|min-height|border-radius|background|box-shadow|color|font-size|font-weight|line-height|padding|align-items|justify-content|transition)$/.test(prop)) return true;
		} else {
			if (/^(position|overflow|min-height|border-radius|background|border|box-shadow)$/.test(prop)) return true;
		}
	}

	if (prop === 'width' && isApplyAreaSelector(selector))
		return /^(fit-content|max-content)$/.test(value);

	if (prop === 'max-width' && isApplyAreaSelector(selector))
		return value === '100%';

	if (prop === 'max-width' &&
		selector.includes('#maincontent > .alert') &&
		/^(min\(|max\(|clamp\(|[0-9.]+(px|rem|em)|100%)$/.test(value))
		return true;

	if (prop === 'margin-left' && isApplyAreaSelector(selector))
		return value === 'auto';

	return false;
}

function hasLuCIComponentSelector(selector) {
	return /#maincontent|\.cbi|\.table|table|(^|[\s>+~,])tr(?=[:.#\[\s>+~,]|$)|(^|[\s>+~,])td(?=[:.#\[\s>+~,]|$)|(^|[\s>+~,])th(?=[:.#\[\s>+~,]|$)|\.btn|button|input|textarea|pre/.test(selector);
}

function isSidebarTooltipSelector(selector) {
	return selector.includes('html.vwrt-sidebar-collapsed') &&
		(selector.includes('::after') || selector.includes(':after')) &&
		(
			selector.includes('[data-vwrt-tooltip]') ||
			selector.includes('[data-vwrt-control-tooltip]')
		) &&
		(
			selector.includes('.vwrt-menu') ||
			selector.includes('.vwrt-sidebar-actions')
		);
}

function analyzeVisualRule(file, source, selector, decls, index) {
	if (!/luci-visual\.css$/.test(file) || !isLoadedCss(file))
		return;

	const line = lineFor(source, index);
	const forbiddenProps = [
		'display',
		'visibility',
		'opacity',
		'position',
		'z-index',
		'pointer-events',
		'transform',
		'overflow',
		'overflow-x',
		'overflow-y',
		'width',
		'height',
		'max-width',
		'min-width',
		'flex',
		'flex-direction',
		'grid',
		'grid-template-columns',
		'top',
		'right',
		'bottom',
		'left',
		'margin-left',
		'table-layout',
		'white-space',
		'clip-path',
		'content'
	];
	const forbiddenSelectors = [
		'.cbi-dropdown',
		'.cbi-dropdown-container',
		'.cbi-dropdown-option',
		'.cbi-dynlist',
		'.cbi-dynlist-item',
		'.cbi-button-add',
		'.cbi-button-remove',
		'.cbi-page-actions',
		'#applyreboot-section',
		'.modal',
		'.modal-dialog',
		'.modal-content',
		'.modal-backdrop',
		'.overlay',
		'.ifacebox',
		'.ifacebox-body',
		'.ifacebadge',
		'.tabs',
		'.cbi-tabmenu',
		'.cbi-tab',
		'.cbi-tab-disabled',
		'[data-tab]',
		'[role="dialog"]',
		'option',
		'select option'
	];

	for (const prop of forbiddenProps) {
		if (declValue(decls, prop))
			report(file, line, selector, `luci-visual.css must not set ${prop}`);
	}

	for (const token of forbiddenSelectors) {
		if (token === 'option') {
			if (selectorHasElement(selector, 'option'))
				report(file, line, selector, 'luci-visual.css must not style option elements');
		}
		else if (token === 'select option') {
			if (/select\s+option/.test(selector))
				report(file, line, selector, 'luci-visual.css must not style select option elements');
		}
		else if (selector.includes(token)) {
			report(file, line, selector, `luci-visual.css must not target ${token}`);
		}
	}
}

function analyzeComponentsVisualRule(file, source, selector, decls, index) {
	if (!isComponentVisualFile(file))
		return;

	const line = lineFor(source, index);
	const forbiddenProps = [
		'display',
		'visibility',
		'opacity',
		'position',
		'z-index',
		'pointer-events',
		'transform',
		'overflow',
		'overflow-x',
		'overflow-y',
		'width',
		'height',
		'max-width',
		'min-width',
		'flex',
		'flex-direction',
		'grid',
		'grid-template-columns',
		'top',
		'right',
		'bottom',
		'left',
		'margin-left',
		'table-layout',
		'white-space',
		'clip-path',
		'content'
	];

	for (const prop of forbiddenProps) {
		const value = declValue(decls, prop);
		if (value && !allowedComponentVisualProp(selector, prop, value))
				report(file, line, selector, `component paint CSS must not set ${prop}`);
	}

	if (/select\s+option/.test(selector) || selectorHasElement(selector, 'option'))
		report(file, line, selector, 'component paint CSS must not style option elements');

	if ((selector.includes('.tabs') || selector.includes('.cbi-tabmenu') || selector.includes('.cbi-tab')) &&
		((declValue(decls, 'display') && !/^(inline-flex|flex)$/.test(declValue(decls, 'display'))) || declValue(decls, 'visibility') || declValue(decls, 'position') || declValue(decls, 'z-index') || declValue(decls, 'pointer-events')))
		report(file, line, selector, 'tab visual selectors must not change behavior properties');

	if ((selector.includes('.cbi-dropdown') || selector.includes('ul.dropdown')) && !selector.includes('::after') &&
		(declValue(decls, 'display') || declValue(decls, 'visibility') || (declValue(decls, 'pointer-events') && !selector.includes('span.open'))))
		report(file, line, selector, 'dropdown visual selectors must not change open/close behavior properties');

	if (isApplyAreaSelector(selector) &&
		(declValue(decls, 'display') || declValue(decls, 'visibility') || declValue(decls, 'position')))
		report(file, line, selector, 'apply area visual selectors must not force lifecycle or positioning');

	if ((selector.includes('.ifacebox') || selector.includes('.network-status-table') || selector.includes('.ifacebadge')) &&
		(declValue(decls, 'display') || declValue(decls, 'flex') || declValue(decls, 'grid') || declValue(decls, 'position') || declValue(decls, 'z-index') || declValue(decls, 'pointer-events') || declValue(decls, 'width')))
		report(file, line, selector, 'ifacebox/network card visual selectors must not change layout or tooltip behavior');

	if (isProgressSelector(selector) && declValue(decls, 'width'))
		report(file, line, selector, 'progress visual selectors must not force progress width');
}

function analyzeGlobalRule(file, source, selector, decls, index) {
	const line = lineFor(source, index);
	const display = declValue(decls, 'display');
	const width = declValue(decls, 'width');
	const marginTop = declValue(decls, 'margin-top');
	const maxWidth = numericPx(declValue(decls, 'max-width'));
	const tokenScope = /:root|html\[data-theme|html\[data-darkmode|html:not\(\[data-theme/.test(selector);
	const unscopedGlobalPaint = !tokenScope && !isPageScoped(selector) && !/success|danger|warning|progress|meter|iface|status/i.test(selector);

	if (!isLoadedCss(file))
		return;

	if (unscopedGlobalPaint && /#(?:00a|00b|00c|0f[0-9a-f]|10b981|14b8a6|22c55e|30d158|34c759|2ecc71|1abc9c|06b6d4|0ea5e9|007aff|0a84ff)\b/i.test(decls))
		warn(file, line, selector, 'hard-coded saturated green/blue paint should be tokenized or scoped for Stage 1.22 color balance');

	if (unscopedGlobalPaint && /color-mix\([^)]*var\(--vw-(?:aqua|success)\)[^)]*(?:2[5-9]|[3-9]\d)%/i.test(decls))
		warn(file, line, selector, 'unscoped aqua/success mix above 24% can reintroduce global green/mint dominance');

	if (/\[hidden\]/.test(selector) && !/:not\(\[hidden\]\)/.test(selector) && display && !display.startsWith('none'))
		report(file, line, selector, '[hidden] may only set display:none');

	if (selector.includes('[style*="display:none"]') || selector.includes('[style*="display: none"]'))
		report(file, line, selector, '[style*="display:none"] rules are forbidden in Stage 1.12');

	if (targetsShellAncestor(selector) &&
		(declValue(decls, 'transform') || declValue(decls, 'filter') || declValue(decls, 'perspective')))
		report(file, line, selector, 'html/body/main shell transform/filter/perspective can break LuCI fixed modals');

	if (selector.includes('.modal')) {
		if (display && !selector.includes('.cbi-tabmenu') && !selector.includes('.tabs') && !selector.includes('.cbi-dynlist') && !selector.includes('.cbi-dropdown'))
			report(file, line, selector, '.modal display overrides are forbidden');
		if (declValue(decls, 'position') && !selector.includes('.cbi-dropdown'))
			report(file, line, selector, '.modal position overrides are forbidden');
		if (declValue(decls, 'z-index'))
			warn(file, line, selector, '.modal z-index override should be avoided');
	}

	if (selectorHasElement(selector, 'table') && hasDecl(decls, 'display', 'block'))
		report(file, line, selector, 'table display:block is forbidden');

	if (selectorHasElement(selector, 'table') && width && !isPageScoped(selector))
		report(file, line, selector, 'global table width rules are forbidden; use page-scoped exceptions only');

	if (selectorHasElement(selector, 'table') &&
		(declValue(decls, 'overflow') || declValue(decls, 'overflow-x') || declValue(decls, 'overflow-y')) &&
		!isPageScoped(selector))
		report(file, line, selector, 'global table overflow rules are forbidden; use page-scoped wrappers only');

	if ((selectorHasElement(selector, 'tr') || selectorHasElement(selector, 'td')) &&
		hasDecl(decls, 'display', '(flex|grid)') &&
		!isAllowedProcessTableGridRule(file, selector))
		report(file, line, selector, 'tr/td display:flex/grid is forbidden');

	if (selector.includes('.cbi-section-table') && hasDecl(decls, 'display', 'block'))
		report(file, line, selector, '.cbi-section-table display:block is forbidden');

	if (hasDecl(decls, 'table-layout', 'fixed') && !isPageScoped(selector) && !isStructuredTableScoped(selector))
		report(file, line, selector, 'table-layout:fixed is only allowed in page-scoped exception rules');

	if (hasDecl(decls, 'white-space', 'nowrap') && hasLuCIComponentSelector(selector) && !isPageScoped(selector) && !isStructuredTableScoped(selector) && !/sidebar\.css$/.test(file) && !isSidebarTooltipSelector(selector))
		report(file, line, selector, 'LuCI component white-space:nowrap is only allowed in page-scoped exception rules');

	if (selector.includes('.btn') && hasDecl(decls, 'width', '100%'))
		report(file, line, selector, '.btn width:100% is forbidden');

	if (selector.includes('.cbi-button') && hasDecl(decls, 'width', '100%'))
		report(file, line, selector, '.cbi-button width:100% is forbidden');

	if (selectorHasElement(selector, 'button') && hasDecl(decls, 'width', '100%') &&
		!selector.includes('.vwrt-auth-card') &&
		!isPageScoped(selector) &&
		!/sidebar\.css$/.test(file))
		report(file, line, selector, 'global button width:100% is forbidden outside VitraWrt auth/sidebar or page-scoped exceptions');

	if (selectorHasElement(selector, 'input') && hasDecl(decls, 'width', '100%') &&
		!selector.includes('.vwrt-auth-card') &&
		!isPageScoped(selector))
		report(file, line, selector, 'global input width:100% is forbidden outside VitraWrt auth or page-scoped exceptions');

	if (/table[^,{]*td:last-child/.test(selector) && width && !isPageScoped(selector))
		report(file, line, selector, 'global table td:last-child width rules are forbidden');

	if (selectorHasElement(selector, 'img') && marginTop && !isPageScoped(selector) && !/sidebar\.css$/.test(file))
		report(file, line, selector, 'global img margin-top rules are forbidden');

	if (/^(?:html|body|img|\*)$/.test(selector.trim()) && declValue(decls, 'filter'))
		report(file, line, selector, 'global filter rules are forbidden; plugin images and modal positioning must remain native');

	if (/\*/.test(selector) && (declValue(decls, 'backdrop-filter') || declValue(decls, '-webkit-backdrop-filter')))
		report(file, line, selector, 'global backdrop-filter rules are forbidden');

	if (declValue(decls, 'will-change') &&
		/(html|body|#maincontent|#vwrt-sidebar|\.cbi-section|\.cbi-map|\.modal|\.modal-dialog|\.modal-content)/.test(selector))
		report(file, line, selector, 'will-change must not be applied to large shell or LuCI component containers');

	if (selector.includes('.cbi-section') && marginTop && !isPageScoped(selector))
		report(file, line, selector, 'global .cbi-section margin-top rules are forbidden');

	if (/\.tabs\s*\+\s*\*/.test(selector) && /margin/.test(decls) && !isPageScoped(selector))
		report(file, line, selector, 'global .tabs + * margin rules are forbidden');

	if (selector.includes('vwrt-page-vnstat2') && !isPageScoped(selector))
		report(file, line, selector, 'vnStat2 spacing rules must be scoped with body.vwrt-page-vnstat2');

	if (selector.includes('vwrt-page-packages') && !isPageScoped(selector))
		report(file, line, selector, 'package action button rules must be scoped with body.vwrt-page-packages');

	if (selector.includes('data-vwrt-control-tooltip') &&
		!/(#vwrt-sidebar|\.vwrt-sidebar-actions|html\.vwrt-sidebar-collapsed)/.test(selector))
		report(file, line, selector, 'sidebar collapsed control tooltip rules must be scoped to the VitraWrt sidebar');

	if (selectorHas(selector, '.cbi-section') && maxWidth !== null && maxWidth < 900)
		report(file, line, selector, '.cbi-section max-width below 900px is forbidden');

	if (selectorHas(selector, '.cbi-section') && hasDecl(decls, 'overflow', 'hidden'))
		warn(file, line, selector, '.cbi-section overflow:hidden may clip LuCI dropdowns/modals');

	const riskySelectors = [
		'.cbi-dropdown',
		'.cbi-dropdown-container',
		'.cbi-dropdown-option',
		'.cbi-dynlist',
		'.cbi-page-actions',
		'#applyreboot-section',
		'.ifacebox',
		'.ifacebadge',
		'.tabs',
		'.cbi-tabmenu',
		'.cbi-tab',
		'.cbi-tab-disabled',
		'[data-tab]',
		'[role="dialog"]',
		'select option'
	];

	for (const token of riskySelectors) {
		if (token === 'select option') {
			if (/select\s+option/.test(selector))
				report(file, line, selector, 'select option styling is forbidden in loaded CSS');
		}
			else if (selector.includes(token) && !/sidebar\.css$/.test(file) && !/luci-layout-exceptions\.css$/.test(file) && !isComponentVisualFile(file) && !isViteBundle(file) && !isViteSourceStyle(file) && !isAllowedCoreStateRule(file, selector) && !isAllowedVnstat2PanelRule(file, selector))
				report(file, line, selector, `${token} must not be styled in loaded Stage 1.12 CSS outside luci-components-visual.css`);
	}
}

function analyzeCss(file, source) {
	const css = stripComments(source);
	const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
	let match;

	while ((match = rulePattern.exec(css)) !== null) {
		const selector = match[1].trim();
		const decls = match[2].trim();

		if (!selector || selector.startsWith('@'))
			continue;

		analyzeVisualRule(file, source, selector, decls, match.index);
		analyzeComponentsVisualRule(file, source, selector, decls, match.index);
		analyzeGlobalRule(file, source, selector, decls, match.index);
	}
}

const runtimeFiles = await walk(root);
const viteSourceRoot = path.join(process.cwd(), 'frontend', 'src', 'styles');
let viteSourceFiles = [];

try {
	viteSourceFiles = await walk(viteSourceRoot);
	for (const file of viteSourceFiles)
		loadedCssNames.add(path.basename(file));
}
catch (_) {}

const files = runtimeFiles.concat(viteSourceFiles);
const cascadePath = path.join(root, 'cascade.css');
const viteCssPath = path.join(root, 'dist', 'vitrawrt-apple.css');

try {
	const cascade = await fs.readFile(cascadePath, 'utf8');
	const imports = cascade.matchAll(/@import\s+url\(["']?([^"')]+\.css)(?:\?[^"')]*)?["']?\)/g);

	for (const match of imports)
		loadedCssNames.add(path.basename(match[1]));

	if (/luci-visual\.css/.test(cascade))
		failures.push({
			file: cascadePath,
			line: 1,
			selector: '@import',
			message: 'luci-visual.css must not be imported with luci-components-visual.css in Stage 1.22'
		});

	for (const deprecated of ['luci-native.css', 'luci-reset.css', 'luci-safe.css']) {
		if (cascade.includes(deprecated))
			failures.push({
				file: cascadePath,
				line: 1,
				selector: '@import',
				message: `${deprecated} is deprecated and must not be imported`
			});
	}
}
catch (_) {}

try {
	await fs.access(viteCssPath);
	loadedCssNames.add(path.basename(viteCssPath));
}
catch (_) {}

for (const file of files) {
	const source = await fs.readFile(file, 'utf8');
	analyzeCss(file, source);
}

const pagesCssPath = path.join(viteSourceRoot, 'luci-pages.css');

try {
	const pagesCss = await fs.readFile(pagesCssPath, 'utf8');
		const networkCss = await fs.readFile(path.join(viteSourceRoot, 'luci-network-icons.css'), 'utf8');
		const contractCss = `${pagesCss}\n${networkCss}`;
		const contracts = [
			[/body\.vwrt-page-openclash[\s\S]*?#maincontent[\s\S]*?input\.cbi-button-apply[\s\S]*?var\(--vw-button-primary-fill\)/, 'OpenClash CBI action buttons must keep theme-token color without runtime layout classes'],
			[/body\.vwrt-page-overview[\s\S]*?\.network-status-table\s*\{[\s\S]*?display:\s*flex\s*!important/, 'overview upstream cards must use the compact flex layout'],
			[/\.cbi-tab\s*>\s*a\s*\{[^}]*box-shadow:\s*none\s*!important/, 'OpenClash log tabs must stay flat'],
			[/body\[data-page\^="admin-services-openclash"\][\s\S]*?:is\(select,\s*\.cbi-input-select,\s*\.cbi-dropdown/, 'OpenClash dropdowns must have a page-scoped intrinsic-width rule']
		];
		const forbiddenContracts = [
			[/body\[data-page\^="admin-services-openclash"\][\s\S]*?\.cbi-value:has\(\[id\^="switch_dashboard_"\]\)/, 'OpenClash external controls must not be re-laid out by theme CSS'],
			[/\.vwrt-openclash-button-row/, 'OpenClash external controls must not depend on runtime layout classes']
		];

		for (const [pattern, message] of contracts) {
			if (!pattern.test(contractCss))
				failures.push({ file: pagesCssPath, line: 1, selector: 'Pass 32 regression contract', message });
		}
		for (const [pattern, message] of forbiddenContracts) {
			if (pattern.test(contractCss))
				failures.push({ file: pagesCssPath, line: 1, selector: 'Pass 32 regression contract', message });
		}
	}
	catch (_) {}

for (const warning of warnings)
	console.warn(`${warning.file}:${warning.line}: warning: ${warning.message} [${warning.selector}]`);

if (failures.length) {
	console.error('CSS safety check failed:');
	for (const failure of failures)
		console.error(`${failure.file}:${failure.line}: ${failure.message} [${failure.selector}]`);
	process.exit(1);
}

console.log(`CSS safety check passed (${files.length} files scanned, ${warnings.length} warning(s)).`);
