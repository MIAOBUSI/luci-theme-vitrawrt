#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import process from 'process';

const root = process.argv[2] || path.join('htdocs', 'luci-static', 'vitrawrt', 'js');
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

function hasForbiddenLuCISelector(source) {
	return /querySelector(All)?\(\s*['"][^'"]*(?:#maincontent|\.cbi|\.modal|\.ifacebox|\.cbi-dropdown|\.cbi-dynlist|\.tabs|\.dropdown|#uci-apply|#applyreboot-section|\.uci-change-list|\[role=['"]?dialog|data-tab)/.test(source);
}

function isSidebarOwnedHiddenToggle(file, source, index) {
	if (!/sidebar\.js$/.test(file))
		return false;

	if (hasForbiddenLuCISelector(source))
		return false;

	const before = source.slice(Math.max(0, index - 360), index);
	const after = source.slice(index, Math.min(source.length, index + 360));

	return /data-vwrt-panel-toggle|vwrt-theme-panel|#vwrt-theme-panel/.test(before + after);
}

function analyzeFile(file, source) {
	const checks = [
		[/\.click\s*\(/g, 'simulated element.click() is forbidden in VitraWrt runtime JS'],
		[/dispatchEvent/g, 'dispatchEvent is forbidden in VitraWrt runtime JS'],
		[/MouseEvent/g, 'synthetic MouseEvent is forbidden in VitraWrt runtime JS'],
		[/style\.display/g, 'style.display mutation is forbidden'],
		[/\.hidden\s*=/g, 'hidden property mutation is forbidden'],
		[/setAttribute\(\s*['"]hidden['"]/g, 'setAttribute("hidden") is forbidden outside VitraWrt-owned sidebar panels'],
		[/removeAttribute\(\s*['"]hidden['"]/g, 'removeAttribute("hidden") is forbidden'],
		[/aria-selected/g, 'aria-selected mutation is forbidden'],
		[/\.\s*selected\s*=/g, 'selected state mutation is forbidden'],
		[/setAttribute\(\s*['"]selected['"]/g, 'selected attribute mutation is forbidden'],
		[/querySelectorAll\(\s*['"]\.cbi/g, 'querySelectorAll(".cbi...") is forbidden'],
		[/querySelectorAll\(\s*["']\.modal/g, 'querySelectorAll(".modal...") is forbidden'],
		[/querySelectorAll\(\s*["']\.ifacebox/g, 'querySelectorAll(".ifacebox...") is forbidden'],
		[/querySelectorAll\(\s*["']\.cbi-dropdown/g, 'querySelectorAll(".cbi-dropdown...") is forbidden'],
		[/querySelectorAll\(\s*["']\.cbi-dynlist/g, 'querySelectorAll(".cbi-dynlist...") is forbidden'],
		[/querySelector(All)?\(\s*["'][^"']*(?:#uci-apply|#applyreboot-section|\.uci-change-list|\.cbi-page-actions)/g, 'JS must not query or force LuCI apply area state'],
		[/appendChild/g, 'appendChild is forbidden in VitraWrt runtime JS'],
		[/insertBefore/g, 'insertBefore is forbidden in VitraWrt runtime JS'],
		[/replaceChild/g, 'replaceChild is forbidden in VitraWrt runtime JS'],
		[/removeChild/g, 'removeChild is forbidden in VitraWrt runtime JS'],
		[/recoverFirstLoadTabs/g, 'recoverFirstLoadTabs is forbidden'],
		[/initNativeTabsOnce/g, 'initNativeTabsOnce is forbidden']
	];

	if (/boot\.js$/.test(file) && hasForbiddenLuCISelector(source))
		report(file, source, source.search(/querySelector(All)?/), 'boot.js must not query LuCI dynamic component selectors');

	if (/MutationObserver/.test(source) &&
		(hasForbiddenLuCISelector(source) || /appendChild|insertBefore|replaceChild|removeChild|wrap|\.style\.display/.test(source))) {
		report(file, source, source.search(/MutationObserver/), 'MutationObserver must not be used as a LuCI layout transformer');
	}

	for (const [pattern, message] of checks) {
		let match;

		while ((match = pattern.exec(source)) !== null) {
			if (/setAttribute\(\s*['"]hidden['"]/.test(match[0]) && isSidebarOwnedHiddenToggle(file, source, match.index))
				continue;

			report(file, source, match.index, message);
		}
	}
}

function analyzeMenuRenderer(file, source) {
	const checks = [
		[/\.click\s*\(/g, 'simulated element.click() is forbidden in menu renderer'],
		[/dispatchEvent/g, 'dispatchEvent is forbidden in menu renderer'],
		[/MouseEvent/g, 'synthetic MouseEvent is forbidden in menu renderer'],
		[/recoverFirstLoadTabs/g, 'recoverFirstLoadTabs is forbidden'],
		[/initNativeTabsOnce/g, 'initNativeTabsOnce is forbidden'],
		[/querySelector(All)?\(\s*['"][^'"]*(?:\.cbi|\.modal|\.ifacebox|\.cbi-dropdown|\.cbi-dynlist|#uci-apply|#applyreboot-section|\.uci-change-list|\[role=['"]?dialog|data-tab)/g, 'menu renderer must not query LuCI dynamic component selectors']
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
