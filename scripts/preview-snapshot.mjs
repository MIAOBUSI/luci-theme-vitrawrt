#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { pathToFileURL } from 'url';

function usage() {
	console.log(`Usage: node scripts/preview-snapshot.mjs [options]

Options:
  --output-dir <dir>  Output directory. Default: audit-output/preview-atlas/<timestamp>
  --browser <name>    chromium, webkit, or firefox. Default: webkit
  --headed            Run headed browser
  -h, --help          Show help`);
}

function fail(message) {
	console.error(`preview-snapshot: ${message}`);
	process.exit(1);
}

function parseArgs(argv) {
	const args = {
		outputDir: '',
		browser: 'webkit',
		headed: false
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];

		if (arg === '--output-dir')
			args.outputDir = argv[++i] || fail('--output-dir requires a value');
		else if (arg === '--browser')
			args.browser = argv[++i] || fail('--browser requires a value');
		else if (arg === '--headed')
			args.headed = true;
		else if (arg === '-h' || arg === '--help') {
			usage();
			process.exit(0);
		}
		else
			fail(`unknown option: ${arg}`);
	}

	return args;
}

async function loadPlaywright() {
	try {
		return await import('playwright');
	}
	catch (err) {
		const fallback = process.env.PLAYWRIGHT_PACKAGE_PATH || '/tmp/vitrawrt-pw/node_modules/playwright/index.mjs';
		try {
			return await import(fallback);
		}
		catch (_) {
			console.error('Playwright is not available.');
			console.error('Install it or run with PLAYWRIGHT_PACKAGE_PATH=/tmp/vitrawrt-pw/node_modules/playwright/index.mjs');
			throw err;
		}
	}
}

function stamp() {
	const d = new Date();
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function safeName(file) {
	return path.basename(file, '.html').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
}

async function exists(file) {
	try {
		await fs.access(file);
		return true;
	}
	catch (_) {
		return false;
	}
}

async function findPreviewFiles(root) {
	const pagesDir = path.join(root, 'previews', 'pages');
	const pages = (await fs.readdir(pagesDir))
		.filter((file) => file.endsWith('.html'))
		.sort()
		.map((file) => path.join(pagesDir, file));

	return [path.join(root, 'previews', 'index.html'), ...pages];
}

async function launchBrowser(playwright, args) {
	const requested = playwright[args.browser] || fail(`unsupported browser: ${args.browser}`);
	return await requested.launch({ headless: !args.headed });
}

async function screenshotPage(browser, htmlFile, outDir) {
	const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
	const url = pathToFileURL(htmlFile).href;
	const name = safeName(htmlFile);
	const desktop = path.join(outDir, `${name}-desktop.png`);
	const mobile = path.join(outDir, `${name}-mobile.png`);

	await page.goto(url, { waitUntil: 'load' });
	await page.screenshot({ path: desktop, fullPage: true });

	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(url, { waitUntil: 'load' });
	await page.screenshot({ path: mobile, fullPage: true });

	await page.close();

	return {
		source: htmlFile,
		desktop,
		mobile
	};
}

async function writeReport(root, outDir, shots) {
	const report = path.join(root, 'docs', 'VITRA_THEME_PREVIEW_SCREENSHOTS.md');
	const rel = (file) => path.relative(path.dirname(report), file);
	const lines = [
		'# VitraWrt Theme Preview Screenshots',
		'',
		'Generated from static Stage 0D preview pages. These screenshots are visual targets for `luci-theme-vitrawrt`; they are not LuCI runtime pages.',
		'',
		'## Guardrails',
		'',
		'- Do not implement these previews by rewriting LuCI page logic.',
		'- Preserve native LuCI behavior and DOM lifecycle.',
		'- Do not use fake clicks or simulated user interactions to hide LuCI behavior issues.',
		'- Do not globally normalize all tables.',
		'',
		'## Screenshots',
		''
	];

	for (const shot of shots) {
		const label = path.basename(shot.source);
		lines.push(`### ${label}`);
		lines.push('');
		lines.push(`- Desktop: [${path.basename(shot.desktop)}](${rel(shot.desktop)})`);
		lines.push(`- Mobile: [${path.basename(shot.mobile)}](${rel(shot.mobile)})`);
		lines.push('');
	}

	await fs.writeFile(report, `${lines.join('\n')}\n`);
	return report;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const root = process.cwd();
	const outputDir = args.outputDir || path.join(root, 'audit-output', 'preview-atlas', stamp());

	if (!(await exists(path.join(root, 'previews', 'index.html'))))
		fail('run from luci-theme-vitrawrt package root; previews/index.html was not found');

	await fs.mkdir(outputDir, { recursive: true });

	const playwright = await loadPlaywright();
	const browser = await launchBrowser(playwright, args);
	const previewFiles = await findPreviewFiles(root);
	const shots = [];

	try {
		for (const file of previewFiles)
			shots.push(await screenshotPage(browser, file, outputDir));
	}
	finally {
		await browser.close().catch(() => {});
	}

	const report = await writeReport(root, outputDir, shots);
	const summary = {
		outputDir,
		report,
		count: shots.length,
		files: shots
	};

	await fs.writeFile(path.join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
	console.log(`Preview screenshots: ${outputDir}`);
	console.log(`Report: ${report}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
