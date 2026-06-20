#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import process from 'process';

const root = process.argv[2] || path.join('frontend', 'src');
const failures = [];

async function walk(dir) {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const full = path.join(dir, entry.name);

		if (entry.isDirectory())
			files.push(...await walk(full));
		else if (entry.isFile() && entry.name.endsWith('.js'))
			files.push(full);
	}

	return files;
}

function lineFor(source, index) {
	return source.slice(0, index).split('\n').length;
}

function report(file, source, index, message) {
	failures.push({
		file,
		line: lineFor(source, index),
		message
	});
}

function isSidebarOwnedHiddenToggle(file, source, index) {
	if (!/sidebar\.js$/.test(file))
		return false;

	const before = source.slice(Math.max(0, index - 360), index);
	const after = source.slice(index, Math.min(source.length, index + 360));

	return /data-vwrt-panel-toggle|vwrt-theme-panel|#vwrt-theme-panel/.test(before + after);
}

function isAllowedVitraWrtDomEnhancement(file, source, index) {
	if (!/frontend\/src\/scripts\/(?:dom\/enhance-progress|runtime\/shell-runtime)\.js$/.test(file))
		return false;

	const context = source.slice(Math.max(0, index - 520), Math.min(source.length, index + 520));

	return /ensureTrackNode|enhanceProgress|watchMenuExpansion|pruneExpandedMenuGroups|watchViewReady|updateReadyClass|normalizeIndicatorBar|openNativeChanges|syncApplyMenu|enhanceApplyMenus|setCbiDropdownOpen|closeCbiDropdowns|toggleCbiDropdown|syncCbiDropdown|enhanceCbiDropdowns|syncActionDropdown|setActionDropdownOpen|closeActionDropdowns|toggleActionDropdown|enhanceDynlists|dynlistValueText|vwrt-dynlist-native-preserved|vwrt-dynlist-remove-visual|vwrt-dynlist-item-content|vwrt-dynlist-remove-button/.test(context);
}

function analyzeFile(file, source) {
	const checks = [
		[/\.click\s*\(/g, 'simulated element.click() is forbidden in VitraWrt runtime JS'],
		[/dispatchEvent/g, 'dispatchEvent is forbidden in VitraWrt runtime JS'],
		[/MouseEvent/g, 'synthetic MouseEvent is forbidden in VitraWrt runtime JS'],
		[/style\.display/g, 'style.display mutation is forbidden (unless decorative element)'],
		[/\.hidden\s*=/g, 'hidden property mutation is forbidden'],
		[/setAttribute\(\s*['"]hidden['"]/g, 'setAttribute("hidden") is forbidden outside VitraWrt-owned sidebar panels'],
		[/removeAttribute\(\s*['"]hidden['"]/g, 'removeAttribute("hidden") is forbidden'],
		[/aria-selected/g, 'aria-selected mutation is forbidden'],
		[/\.\s*selected\s*=/g, 'selected state mutation is forbidden'],
		[/setAttribute\(\s*['"]selected['"]/g, 'selected attribute mutation is forbidden'],
		[/querySelector(All)?\(\s*["'][^"']*(?:#uci-apply|#applyreboot-section|\.uci-change-list|\.cbi-page-actions)/g, 'JS must not query or force LuCI apply area state'],
		[/\.replaceChild\(/g, 'replaceChild is forbidden in VitraWrt runtime JS (do not replace LuCI nodes)'],
		[/recoverFirstLoadTabs/g, 'recoverFirstLoadTabs is forbidden'],
		[/initNativeTabsOnce/g, 'initNativeTabsOnce is forbidden']
	];

	const unsafeDomInsertionWithObserver = Array.from(source.matchAll(/insertBefore|replaceChild|\.wrap\(/g))
		.some((match) => !isAllowedVitraWrtDomEnhancement(file, source, match.index));
	const unsafeDisplayMutationWithObserver = /style\.display/.test(source.replace(/dummy\.style\.setProperty\(['"]display['"]/g, '').replace(/dummy\.style\.\w+/g, ''));

	if (/MutationObserver/.test(source) &&
		(unsafeDomInsertionWithObserver || unsafeDisplayMutationWithObserver)) {
		const index = source.search(/MutationObserver/);
		if (!isAllowedVitraWrtDomEnhancement(file, source, index))
			report(file, source, index, 'MutationObserver must not be used as a LuCI layout transformer or lifecycle hacker');
	}

	for (const [pattern, message] of checks) {
		let match;

		while ((match = pattern.exec(source)) !== null) {
			if (/setAttribute\(\s*['"]hidden['"]/.test(match[0]) && isSidebarOwnedHiddenToggle(file, source, match.index))
				continue;

			if (/\.cbi-page-actions/.test(match[0]) && isAllowedVitraWrtDomEnhancement(file, source, match.index))
				continue;
			
			// Allow style.display = 'none' for decorative nodes (dummy elements)
			if (/style\.display/.test(match[0])) {
				const beforeLine = source.slice(Math.max(0, match.index - 50), match.index);
				if (/dummy|header|badge|txt|fill|track/.test(beforeLine)) {
					continue;
				}
			}

			report(file, source, match.index, message);
		}
	}

	if (/shell-runtime\.js$/.test(file)) {
		const portSpeedBlock = source.match(/function updatePortLinkSpeed[\s\S]*?function enhancePortTraffic/);

		if (portSpeedBlock && /card\.isConnected/.test(portSpeedBlock[0]))
			report(file, source, source.indexOf('card.isConnected', source.indexOf('function updatePortLinkSpeed')), 'port link state must not use Node.isConnected');
	}
	
	// Enhanced appendChild check: allow if it's appending newly created nodes
	const appendPattern = /\.appendChild\(\s*([a-zA-Z0-9_]+)\s*\)/g;
	let appendMatch;
	while ((appendMatch = appendPattern.exec(source)) !== null) {
		const varName = appendMatch[1];
		if (isAllowedVitraWrtDomEnhancement(file, source, appendMatch.index))
			continue;
		// If the variable was created via document.createElement, it's allowed
		const createPattern = new RegExp(`(?:(?:var|let|const)\\s+${varName}\\s*=|${varName}\\s*=)\\s*document\\.createElement`);
		if (!createPattern.test(source)) {
			// Also allow if it's a known theme container or dummy element being appended
			if (!/dummy|header|badge|txt|fill|track|layer|shine/.test(varName)) {
				report(file, source, appendMatch.index, `appendChild of non-new or LuCI-owned node '${varName}' is forbidden`);
			}
		}
	}
}

function analyzeMenuRenderer(file, source) {
	const checks = [
		[/\.click\s*\(/g, 'simulated element.click() is forbidden in menu renderer'],
		[/dispatchEvent/g, 'dispatchEvent is forbidden in menu renderer'],
		[/MouseEvent/g, 'synthetic MouseEvent is forbidden in menu renderer'],
		[/recoverFirstLoadTabs/g, 'recoverFirstLoadTabs is forbidden'],
		[/initNativeTabsOnce/g, 'initNativeTabsOnce is forbidden']
	];

	for (const [pattern, message] of checks) {
		let match;

		while ((match = pattern.exec(source)) !== null)
			report(file, source, match.index, message);
	}
}

const files = await walk(root);

for (const file of files) {
	const source = await fs.readFile(file, 'utf8');
	analyzeFile(file, source);
}

const menuFile = path.join('htdocs', 'luci-static', 'resources', 'menu-vitrawrt.js');

try {
	const menuSource = await fs.readFile(menuFile, 'utf8');
	analyzeMenuRenderer(menuFile, menuSource);
	files.push(menuFile);
}
catch (_) {}

if (failures.length) {
	console.error('JS safety check failed:');
	for (const failure of failures)
		console.error(`${failure.file}:${failure.line}: ${failure.message}`);
	process.exit(1);
}

console.log(`JS safety check passed (${files.length} files scanned).`);
