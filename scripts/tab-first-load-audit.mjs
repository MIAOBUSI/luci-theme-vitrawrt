#!/usr/bin/env node

import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const themeMedia = {
	bootstrap: '/luci-static/bootstrap',
	argon: '/luci-static/argon',
	vitrawrt: '/luci-static/vitrawrt'
};

const auditPages = [
	{ name: 'network-root', path: '/cgi-bin/luci/admin/network', kind: 'network' },
	{ name: 'vnstat2', path: '/cgi-bin/luci/admin/status/vnstat2', kind: 'vnstat' },
	{ name: 'system-system', path: '/cgi-bin/luci/admin/system/system', kind: 'system' },
	{ name: 'status-overview', path: '/cgi-bin/luci/admin/status/overview', kind: 'overview' }
];

const cacheModes = ['normal', 'hard-reload', 'disable-cache', 'cache-bust'];
const timeline = [
	{ label: 't05', delay: 500 },
	{ label: 't1', delay: 1000 },
	{ label: 't2', delay: 2000 },
	{ label: 't3', delay: 3000 },
	{ label: 't5', delay: 5000 }
];

function usage() {
	console.log(`Usage: node scripts/tab-first-load-audit.mjs [options]

Options:
  --host <ip>              Target host. Default: 10.10.10.148
  --user <user>            SSH user. Default: root
  --themes <list>          Comma-separated list. Default: bootstrap,argon,vitrawrt
  --output <dir>           Output directory. Default: audit-output/tab-first-load-visual/<timestamp>
  --luci-user <user>       LuCI login user. Default: root
  --luci-password <pw>     LuCI password. Default: empty
  --browser <name>         chromium, webkit, or firefox. Default: chromium with WebKit fallback
  --viewport <WxH>         Viewport size. Default: 1920x1080
  --profile <mode>         clean, persistent, or both. Default: clean
  --user-data-dir <dir>    Persistent profile root. Default: audit-output/playwright-profile
  --headed                 Run headed browser
  --pause                  Pause 30 seconds after view-ready for human observation
  -h, --help               Show help`);
}

function fail(message) {
	console.error(`tab-first-load-audit: ${message}`);
	process.exit(1);
}

function stamp() {
	const d = new Date();
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function parseViewport(value) {
	const match = String(value || '').match(/^(\d+)x(\d+)$/i);
	if (!match)
		fail(`invalid --viewport "${value}", expected WIDTHxHEIGHT`);
	return {
		width: Number(match[1]),
		height: Number(match[2])
	};
}

function parseArgs(argv) {
	const args = {
		host: '10.10.10.148',
		user: 'root',
		themes: ['bootstrap', 'argon', 'vitrawrt'],
		output: '',
		luciUser: 'root',
		luciPassword: '',
		browser: 'chromium',
		viewport: { width: 1920, height: 1080 },
		profile: 'clean',
		userDataDir: path.join('audit-output', 'playwright-profile'),
		headed: false,
		pause: false
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--host')
			args.host = argv[++i] || fail('--host requires a value');
		else if (arg === '--user')
			args.user = argv[++i] || fail('--user requires a value');
		else if (arg === '--themes')
			args.themes = (argv[++i] || fail('--themes requires a value')).split(',').map((item) => item.trim()).filter(Boolean);
		else if (arg === '--output')
			args.output = argv[++i] || fail('--output requires a value');
		else if (arg === '--luci-user')
			args.luciUser = argv[++i] || fail('--luci-user requires a value');
		else if (arg === '--luci-password')
			args.luciPassword = argv[++i] ?? '';
		else if (arg === '--browser')
			args.browser = argv[++i] || fail('--browser requires a value');
		else if (arg === '--viewport')
			args.viewport = parseViewport(argv[++i] || fail('--viewport requires a value'));
		else if (arg === '--profile')
			args.profile = argv[++i] || fail('--profile requires a value');
		else if (arg === '--user-data-dir')
			args.userDataDir = argv[++i] || fail('--user-data-dir requires a value');
		else if (arg === '--headed')
			args.headed = true;
		else if (arg === '--pause')
			args.pause = true;
		else if (arg === '-h' || arg === '--help') {
			usage();
			process.exit(0);
		}
		else
			fail(`unknown option: ${arg}`);
	}

	if (!['clean', 'persistent', 'both'].includes(args.profile))
		fail('--profile must be clean, persistent, or both');

	for (const theme of args.themes) {
		if (!themeMedia[theme])
			fail(`unsupported theme "${theme}"`);
	}

	if (!args.output)
		args.output = path.join('audit-output', 'tab-first-load-visual', stamp());

	return args;
}

function normalizeHost(host) {
	return /^https?:\/\//.test(host) ? host.replace(/\/$/, '') : `http://${host}`;
}

function safeName(name) {
	return String(name).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'item';
}

function rel(file) {
	return path.relative(process.cwd(), file);
}

async function ensureDir(dir) {
	await fs.mkdir(dir, { recursive: true });
}

async function writeJson(file, data) {
	await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

async function ssh(args, command, options = {}) {
	const target = `${args.user}@${args.host}`;
	const result = await execFileAsync('ssh', [
		'-o', 'BatchMode=yes',
		'-o', 'StrictHostKeyChecking=no',
		'-o', 'UserKnownHostsFile=/dev/null',
		target,
		command
	], {
		timeout: options.timeout || 30000,
		maxBuffer: options.maxBuffer || 1024 * 1024
	});
	return result.stdout.trim();
}

async function mediaurlbase(args) {
	return await ssh(args, "uci -q get luci.main.mediaurlbase || echo '/luci-static/bootstrap'");
}

async function themeAvailable(args, theme) {
	if (theme === 'bootstrap')
		return { available: true };

	const media = themeMedia[theme].replace('/luci-static/', '');
	const ok = await ssh(args, `[ -d /www/luci-static/${media} ] || [ -d /rom/www/luci-static/${media} ] || [ -d /overlay/upper/www/luci-static/${media} ]; echo $?`).catch(() => '1');
	return ok.trim() === '0' ? { available: true } : { available: false, reason: `${themeMedia[theme]} was not found on target` };
}

async function switchTheme(args, theme) {
	await ssh(args, `set -eu; uci set luci.main.mediaurlbase='${themeMedia[theme]}'; uci commit luci; /etc/init.d/uhttpd restart`, {
		timeout: 45000
	});
	await new Promise((resolve) => setTimeout(resolve, 2400));
}

async function restoreTheme(args, originalMedia) {
	await ssh(args, `set -eu; uci set luci.main.mediaurlbase='${originalMedia}'; uci commit luci; /etc/init.d/uhttpd restart`, {
		timeout: 45000
	});
}

async function loadPlaywright() {
	try {
		return await import('playwright');
	}
	catch (err) {
		const fallback = process.env.PLAYWRIGHT_PACKAGE_PATH || '/tmp/vitrawrt-pw/node_modules/playwright/index.mjs';
		return await import(fallback).catch(() => {
			console.error('Playwright is not available. Install with: npm install --prefix /tmp/vitrawrt-pw playwright');
			throw err;
		});
	}
}

async function createBrowserContext(playwright, args, profile, theme, report) {
	const requested = playwright[args.browser];
	if (!requested)
		fail(`unsupported browser: ${args.browser}`);

	const launchOptions = {
		headless: !args.headed,
		args: [
			'--single-process',
			'--no-zygote',
			'--disable-gpu',
			'--disable-software-rasterizer',
			'--disable-dev-shm-usage'
		]
	};
	const contextOptions = {
		viewport: args.viewport,
		deviceScaleFactor: 1,
		ignoreHTTPSErrors: true
	};

	if (profile === 'persistent') {
		const dir = path.resolve(args.userDataDir, safeName(theme));
		await ensureDir(dir);
		try {
			const context = await requested.launchPersistentContext(dir, {
				...launchOptions,
				...contextOptions
			});
			report.browserName = args.browser;
			return { context, close: () => context.close(), userDataDir: dir };
		}
		catch (err) {
			report.warnings.push({ message: `${args.browser} persistent launch failed`, details: { message: err.message } });
			if (args.browser !== 'chromium' || !playwright.webkit)
				throw err;
			const context = await playwright.webkit.launchPersistentContext(dir, {
				...launchOptions,
				...contextOptions
			});
			report.browserName = 'webkit';
			return { context, close: () => context.close(), userDataDir: dir };
		}
	}

	try {
		const browser = await requested.launch(launchOptions);
		const context = await browser.newContext(contextOptions);
		report.browserName = args.browser;
		return {
			context,
			close: async () => {
				await context.close();
				await browser.close();
			},
			userDataDir: ''
		};
	}
	catch (err) {
		report.warnings.push({ message: `${args.browser} launch failed`, details: { message: err.message } });
		if (args.browser !== 'chromium' || !playwright.webkit)
			throw err;
		const browser = await playwright.webkit.launch(launchOptions);
		const context = await browser.newContext(contextOptions);
		report.browserName = 'webkit';
		return {
			context,
			close: async () => {
				await context.close();
				await browser.close();
			},
			userDataDir: ''
		};
	}
}

async function waitForLuCIViewReady(page) {
	await page.waitForFunction(() => {
		const view = document.querySelector('#view');
		if (!view)
			return true;
		const children = Array.from(view.children).filter((child) => child.nodeType === 1);
		return !(children.length === 1 && children[0].classList.contains('spinning'));
	}, null, { timeout: 18000 }).catch(() => {});
}

async function ensureLoggedIn(page, baseUrl, args) {
	await page.goto(`${baseUrl}/cgi-bin/luci/`, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
	await page.waitForTimeout(400);

	const username = page.locator('input[name="luci_username"], input#luci_username').first();
	const passwordInput = page.locator('input[name="luci_password"], input#luci_password, input[type="password"]').first();

	if (!(await username.count()))
		return;

	await username.fill(args.luciUser);
	if (await passwordInput.count())
		await passwordInput.fill(args.luciPassword);

	const submit = page.locator('button[type="submit"], input[type="submit"], .cbi-button-apply, .btn').first();
	if (await submit.count())
		await submit.click();
	else
		await page.keyboard.press('Enter');

	await page.waitForLoadState('domcontentloaded').catch(() => {});
	await waitForLuCIViewReady(page);
	await page.waitForTimeout(500);
}

async function setDisableCache(context, page, enabled) {
	if (!enabled)
		return async () => {};

	let cdp = null;
	try {
		cdp = await context.newCDPSession(page);
		await cdp.send('Network.enable');
		await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
	}
	catch (_) {
		await context.route('**/*', async (route) => {
			const headers = {
				...route.request().headers(),
				'cache-control': 'no-cache',
				pragma: 'no-cache'
			};
			await route.continue({ headers });
		}).catch(() => {});
	}

	return async () => {
		if (cdp)
			await cdp.detach().catch(() => {});
		await context.unroute('**/*').catch(() => {});
	};
}

function withCacheBust(url) {
	const sep = url.includes('?') ? '&' : '?';
	return `${url}${sep}_vwrt_audit=${Date.now()}`;
}

function collectMetricsScript(sampleLabel) {
	function nodeClass(node) {
		if (!node)
			return '';
		return typeof node.className === 'string' ? node.className : (node.getAttribute('class') || '');
	}

	function isVisible(node) {
		if (!node)
			return false;
		const style = getComputedStyle(node);
		const rect = node.getBoundingClientRect();
		return style.display !== 'none' &&
			style.visibility !== 'hidden' &&
			Number(style.opacity || '1') > 0 &&
			rect.width > 0 &&
			rect.height > 0;
	}

	function rectOf(node) {
		if (!node)
			return null;
		const rect = node.getBoundingClientRect();
		return {
			x: Math.round(rect.x),
			y: Math.round(rect.y),
			width: Math.round(rect.width),
			height: Math.round(rect.height),
			right: Math.round(rect.right),
			bottom: Math.round(rect.bottom)
		};
	}

	function textOf(node, limit = 160) {
		return (node && node.textContent ? node.textContent : '').trim().replace(/\s+/g, ' ').slice(0, limit);
	}

	function selectorFor(node) {
		if (!node)
			return '';
		if (node.id)
			return `#${node.id}`;
		const cls = nodeClass(node).trim();
		return cls ? `${node.tagName.toLowerCase()}.${cls.replace(/\s+/g, '.')}` : node.tagName.toLowerCase();
	}

	function styleOf(node) {
		const style = getComputedStyle(node);
		return {
			display: style.display,
			visibility: style.visibility,
			opacity: style.opacity,
			position: style.position,
			flexDirection: style.flexDirection,
			overflow: style.overflow,
			width: style.width,
			maxWidth: style.maxWidth
		};
	}

	const main = document.querySelector('#maincontent');
	const mainRect = rectOf(main || document.documentElement);
	const tabMenus = Array.from(document.querySelectorAll('#maincontent .cbi-tabmenu, #maincontent .tabs, #tabmenu, #maincontent [role="tablist"]')).map((menu) => {
		const items = Array.from(menu.querySelectorAll('a, button, [role="tab"]')).map((item) => ({
			selector: selectorFor(item),
			text: textOf(item, 80),
			className: nodeClass(item),
			parentClassName: nodeClass(item.parentElement),
			ariaSelected: item.getAttribute('aria-selected') || item.parentElement?.getAttribute('aria-selected') || '',
			selected: item.hasAttribute('selected') || Boolean(item.parentElement?.hasAttribute('selected')),
			visible: isVisible(item),
			rect: rectOf(item),
			style: styleOf(item)
		}));
		const visibleItems = items.filter((item) => item.visible);
		const yValues = visibleItems.map((item) => item.rect.y);
		const ySpread = yValues.length ? Math.max(...yValues) - Math.min(...yValues) : 0;
		return {
			selector: selectorFor(menu),
			className: nodeClass(menu),
			visible: isVisible(menu),
			rect: rectOf(menu),
			style: styleOf(menu),
			itemCount: items.length,
			visibleItemCount: visibleItems.length,
			itemYSpread: Math.round(ySpread),
			looksHorizontal: visibleItems.length <= 1 || ySpread <= 18,
			items
		};
	});

	const seen = new Set();
	const contentSelectors = [
		'#maincontent .cbi-section-node-tabbed > [data-tab]',
		'#maincontent .cbi-section[data-tab]',
		'#maincontent .cbi-map[data-tab]',
		'#maincontent [data-tab][data-tab-active]',
		'#maincontent .cbi-tabcontainer',
		'#maincontent .tab-content > *',
		'#maincontent .tab-pane',
		'#maincontent [role="tabpanel"]',
		'#maincontent [id^="tab-"]'
	];
	const tabContents = [];
	for (const selector of contentSelectors) {
		for (const node of document.querySelectorAll(selector)) {
			if (node.closest('.cbi-tabmenu, .tabs, #tabmenu') || seen.has(node))
				continue;
			seen.add(node);
			tabContents.push({
				selector: selectorFor(node),
				sourceSelector: selector,
				id: node.id || '',
				className: nodeClass(node),
				dataTab: node.getAttribute('data-tab') || '',
				dataTabActive: node.getAttribute('data-tab-active') || '',
				ariaHidden: node.getAttribute('aria-hidden') || '',
				hidden: node.hidden,
				inlineStyle: node.getAttribute('style') || '',
				visible: isVisible(node),
				rect: rectOf(node),
				style: styleOf(node),
				text: textOf(node)
			});
		}
	}

	const activeTab = tabMenus.flatMap((menu) => menu.items).find((item) =>
		item.visible &&
		(/\bcbi-tab\b|\bactive\b/.test(`${item.className} ${item.parentClassName}`) || item.ariaSelected === 'true' || item.selected)
	);

	const sections = Array.from(document.querySelectorAll('#maincontent .cbi-section, #maincontent .cbi-map, #maincontent fieldset, #maincontent section')).map((node) => {
		const heading = node.querySelector('h2, h3, h4, legend, .cbi-section-title');
		return {
			selector: selectorFor(node),
			className: nodeClass(node),
			visible: isVisible(node),
			rect: rectOf(node),
			title: textOf(heading || node, 120),
			dataTab: node.getAttribute('data-tab') || '',
			dataTabActive: node.getAttribute('data-tab-active') || ''
		};
	});

	const networkCards = Array.from(document.querySelectorAll([
		'#maincontent .ifacebox',
		'#maincontent .ifacebadge',
		'#maincontent .network-status-table',
		'#maincontent .network-status-table > *',
		'#maincontent .cbi-section[data-tab]',
		'#maincontent [data-network]',
		'#maincontent [data-device]'
	].join(','))).filter((node, index, arr) => arr.indexOf(node) === index).map((node) => {
		const rect = rectOf(node);
		const ratio = mainRect && mainRect.width ? rect.width / mainRect.width : 0;
		return {
			selector: selectorFor(node),
			className: nodeClass(node),
			text: textOf(node, 120),
			visible: isVisible(node),
			rect,
			widthRatioToMain: Number(ratio.toFixed(3)),
			fillsMaincontent: ratio > 0.78,
			abnormallyCompressed: rect.width > 0 && rect.width < 160,
			abnormallyStretched: ratio > 0.9
		};
	});

	const mediaNodes = Array.from(document.querySelectorAll('#maincontent img, #maincontent canvas, #maincontent svg')).filter(isVisible);
	const imageGroups = Array.from(document.querySelectorAll('#maincontent .cbi-section, #maincontent [data-tab], #maincontent .tab-pane, #maincontent .tab-content > *, #maincontent figure, #maincontent .graph, #maincontent .graphs')).filter((node, index, arr) => {
		return arr.indexOf(node) === index && isVisible(node) && node.querySelector('img, canvas, svg');
	}).map((node) => {
		const images = Array.from(node.querySelectorAll('img, canvas, svg')).filter(isVisible).map((img) => ({
			tag: img.tagName.toLowerCase(),
			rect: rectOf(img),
			src: img.getAttribute('src') || ''
		}));
		return {
			selector: selectorFor(node),
			className: nodeClass(node),
			dataTab: node.getAttribute('data-tab') || '',
			dataTabActive: node.getAttribute('data-tab-active') || '',
			rect: rectOf(node),
			imageCount: images.length,
			images
		};
	});

	const applyAreaNodes = Array.from(document.querySelectorAll('#uci-apply, #applyreboot-section, #maincontent .cbi-page-actions, #maincontent .uci-change-list, #maincontent .modal, #maincontent .modal-overlay')).map((node) => ({
		selector: selectorFor(node),
		id: node.id || '',
		className: nodeClass(node),
		text: textOf(node, 120),
		visible: isVisible(node),
		rect: rectOf(node),
		style: styleOf(node)
	}));

	const dropdownOptions = Array.from(document.querySelectorAll('#maincontent .cbi-dropdown ul.dropdown > li, #maincontent .cbi-dropdown-option, #maincontent select option')).map((node) => ({
		selector: selectorFor(node),
		className: nodeClass(node),
		text: textOf(node, 100),
		visible: isVisible(node),
		rect: rectOf(node),
		style: styleOf(node)
	}));

	const visibleTabContents = tabContents.filter((item) => item.visible);
	const visibleDataTabs = Array.from(new Set(visibleTabContents.map((item) => item.dataTab).filter(Boolean)));
	const visibleSections = sections.filter((item) => item.visible);

	return {
		sampleLabel,
		url: location.href,
		pathname: location.pathname,
		hash: location.hash,
		title: document.title,
		viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
		bodyClass: document.body ? document.body.className : '',
		htmlClass: document.documentElement.className,
		htmlDataset: { ...document.documentElement.dataset },
		mainRect,
		documentSize: {
			scrollWidth: document.documentElement.scrollWidth,
			scrollHeight: document.documentElement.scrollHeight,
			bodyScrollWidth: document.body ? document.body.scrollWidth : 0,
			bodyScrollHeight: document.body ? document.body.scrollHeight : 0,
			horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 4
		},
		tabMenus,
		activeTabText: activeTab ? activeTab.text : '',
		tabContents,
		visibleTabContentCount: visibleTabContents.length,
		visibleDataTabs,
		visibleSections: visibleSections.map((item) => ({
			title: item.title,
			selector: item.selector,
			dataTab: item.dataTab,
			dataTabActive: item.dataTabActive,
			rect: item.rect
		})),
		multipleTabSectionsVisible: visibleDataTabs.length > 1,
		networkCards,
		vnstat: {
			tabMenusLookHorizontal: tabMenus.every((menu) => !menu.visible || menu.looksHorizontal),
			maxTabMenuHeight: Math.max(0, ...tabMenus.filter((menu) => menu.visible).map((menu) => menu.rect ? menu.rect.height : 0)),
			maxTabItemYSpread: Math.max(0, ...tabMenus.filter((menu) => menu.visible).map((menu) => menu.itemYSpread)),
			imageGroupCount: imageGroups.length,
			visibleImageCount: mediaNodes.length,
			visibleImageGroups: imageGroups,
			multipleImageGroupsVisible: imageGroups.length > 1
		},
		network: {
			activeTabText: activeTab ? activeTab.text : '',
			visibleSectionTitles: visibleSections.map((item) => item.title).filter(Boolean),
			multipleTabSectionsVisible: visibleDataTabs.length > 1,
			cards: networkCards
		},
		system: {
			tabItems: tabMenus.flatMap((menu) => menu.items.map((item) => ({ text: item.text, rect: item.rect, visible: item.visible }))),
			applyAreaVisible: applyAreaNodes.some((item) => item.visible),
			cbiPageActionsVisible: applyAreaNodes.some((item) => /\bcbi-page-actions\b/.test(item.className) && item.visible),
			visibleDropdownOptions: dropdownOptions.filter((item) => item.visible),
			dropdownOptionVisibleCount: dropdownOptions.filter((item) => item.visible).length
		}
	};
}

async function classFrequency(page) {
	return await page.evaluate(() => {
		const counts = {};
		for (const node of document.querySelectorAll('[class]')) {
			const cls = typeof node.className === 'string' ? node.className : (node.getAttribute('class') || '');
			for (const item of cls.split(/\s+/).filter(Boolean))
				counts[item] = (counts[item] || 0) + 1;
		}
		return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
	});
}

async function captureSample(page, dir, label, sampleLog) {
	await ensureDir(dir);
	const base = path.join(dir, label);
	const files = {
		screenshot: `${base}.png`,
		viewportScreenshot: `${base}.viewport.png`,
		html: `${base}.html`,
		text: `${base}.text.txt`,
		classFrequency: `${base}.classes.json`,
		metrics: `${base}.metrics.json`
	};

	const metrics = await page.evaluate(collectMetricsScript, label).catch((err) => ({ error: err.message, sampleLabel: label }));
	await page.screenshot({ path: files.screenshot, fullPage: true }).catch(() => {});
	await page.screenshot({ path: files.viewportScreenshot, fullPage: false }).catch(() => {});
	await fs.writeFile(files.html, await page.content().catch(() => ''));
	await fs.writeFile(files.text, await page.evaluate(() => document.body ? document.body.innerText : '').catch(() => ''));
	await writeJson(files.classFrequency, await classFrequency(page).catch((err) => ({ error: err.message })));
	await writeJson(files.metrics, metrics);

	const summary = {
		label,
		files: Object.fromEntries(Object.entries(files).map(([key, value]) => [key, rel(value)])),
		recoveryFlag: metrics.htmlDataset?.vwrtTabsRecovery || '',
		bodyTabsRecovered: /\bvwrt-tabs-recovered\b/.test(metrics.bodyClass || ''),
		bodyTabsNormal: /\bvwrt-tabs-normal\b/.test(metrics.bodyClass || ''),
		bodyTabsAnomaly: /\bvwrt-tabs-anomaly\b/.test(metrics.bodyClass || ''),
		visibleTabContentCount: metrics.visibleTabContentCount,
		activeTabText: metrics.activeTabText,
		multipleTabSectionsVisible: metrics.multipleTabSectionsVisible,
		vnstat: metrics.vnstat,
		network: {
			activeTabText: metrics.network?.activeTabText || '',
			visibleSectionTitles: metrics.network?.visibleSectionTitles || [],
			cards: (metrics.network?.cards || []).map((card) => ({
				selector: card.selector,
				text: card.text,
				rect: card.rect,
				widthRatioToMain: card.widthRatioToMain,
				fillsMaincontent: card.fillsMaincontent,
				abnormallyCompressed: card.abnormallyCompressed,
				abnormallyStretched: card.abnormallyStretched
			}))
		},
		system: metrics.system
	};
	sampleLog.push(summary);
	return summary;
}

async function captureTimeline(page, dir, args, mode, sampleLog) {
	const started = Date.now();
	for (const point of timeline) {
		const wait = Math.max(0, point.delay - (Date.now() - started));
		if (wait)
			await page.waitForTimeout(wait);
		await captureSample(page, dir, point.label, sampleLog);
	}

	await waitForLuCIViewReady(page);
	await captureSample(page, dir, 'view-ready', sampleLog);
	await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve()))).catch(() => {});
	await captureSample(page, dir, 'after-view-ready-raf', sampleLog);

	if (args.pause && mode === 'normal') {
		await captureSample(page, dir, 'pause-before', sampleLog);
		await page.waitForTimeout(30000);
		await captureSample(page, dir, 'pause-after', sampleLog);
	}
}

async function visitForMode(context, page, baseUrl, pageInfo, mode, args) {
	const base = `${baseUrl}${pageInfo.path}`;
	const url = mode === 'cache-bust' ? withCacheBust(base) : base;

	if (mode === 'hard-reload') {
		await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
		await page.waitForTimeout(350);
		await page.reload({ waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
	}
	else {
		await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
	}
}

async function auditPageMode(context, page, baseUrl, pageInfo, mode, dir, args) {
	const sampleLog = [];
	const restoreCache = await setDisableCache(context, page, mode === 'disable-cache');
	try {
		await visitForMode(context, page, baseUrl, pageInfo, mode, args);
		await captureTimeline(page, dir, args, mode, sampleLog);
	}
	finally {
		await restoreCache();
	}

	return {
		mode,
		dir: rel(dir),
		samples: sampleLog,
		firstSample: sampleLog[0] || null,
		viewReady: sampleLog.find((item) => item.label === 'view-ready') || null,
		afterViewReadyRaf: sampleLog.find((item) => item.label === 'after-view-ready-raf') || null
	};
}

async function auditThemeProfile(playwright, args, baseUrl, profile, theme, outputDir, report) {
	const themeReport = {
		name: theme,
		profile,
		available: true,
		skipReason: '',
		appliedMediaurlbase: '',
		userDataDir: '',
		console: [],
		warnings: [],
		failedRequests: [],
		pages: {}
	};

	const availability = await themeAvailable(args, theme);
	if (!availability.available) {
		themeReport.available = false;
		themeReport.skipReason = availability.reason;
		report.profiles[profile].themes[theme] = themeReport;
		return;
	}

	await switchTheme(args, theme);
	themeReport.appliedMediaurlbase = await mediaurlbase(args);

	const browserSession = await createBrowserContext(playwright, args, profile, theme, report);
	themeReport.userDataDir = browserSession.userDataDir ? rel(browserSession.userDataDir) : '';
	const context = browserSession.context;
	context.setDefaultTimeout(20000);

	context.on('page', (page) => {
		page.on('console', (msg) => {
			const entry = {
				type: msg.type(),
				text: msg.text(),
				url: page.url()
			};
			themeReport.console.push(entry);
			if (msg.type() === 'warning')
				themeReport.warnings.push(entry);
		});
		page.on('requestfailed', (request) => {
			themeReport.failedRequests.push({
				url: request.url(),
				method: request.method(),
				failure: request.failure()?.errorText || ''
			});
		});
		page.on('response', (response) => {
			if (response.status() >= 400) {
				themeReport.failedRequests.push({
					url: response.url(),
					method: response.request().method(),
					status: response.status(),
					statusText: response.statusText()
				});
			}
		});
	});

	try {
		const page = await context.newPage();
		await ensureLoggedIn(page, baseUrl, args);

		for (const pageInfo of auditPages) {
			const pageReport = {
				name: pageInfo.name,
				path: pageInfo.path,
				kind: pageInfo.kind,
				cacheModes: {}
			};
			themeReport.pages[pageInfo.name] = pageReport;

			for (const mode of cacheModes) {
				const dir = path.join(outputDir, profile, theme, pageInfo.name, mode);
				pageReport.cacheModes[mode] = await auditPageMode(context, page, baseUrl, pageInfo, mode, dir, args);
			}
		}
	}
	finally {
		await browserSession.close().catch(() => {});
	}

	report.profiles[profile].themes[theme] = themeReport;
	await writeJson(path.join(outputDir, profile, theme, 'theme-summary.json'), themeReport);
}

function summarizeVisualResult(themeReport, pageName) {
	const page = themeReport.pages[pageName];
	if (!page)
		return null;

	const normal = page.cacheModes.normal;
	const first = normal?.firstSample;
	const ready = normal?.viewReady;
	const final = normal?.afterViewReadyRaf;

	return {
		firstVisibleTabs: first?.visibleTabContentCount ?? null,
		viewReadyVisibleTabs: ready?.visibleTabContentCount ?? null,
		afterRafVisibleTabs: final?.visibleTabContentCount ?? null,
		firstRecoveryFlag: first?.recoveryFlag || '',
		viewReadyRecoveryFlag: ready?.recoveryFlag || '',
		afterRafRecoveryFlag: final?.recoveryFlag || '',
		afterRafRecovered: final?.bodyTabsRecovered || false,
		afterRafNormal: final?.bodyTabsNormal || false,
		afterRafAnomaly: final?.bodyTabsAnomaly || false,
		firstScreenshot: first?.files?.screenshot || '',
		viewReadyScreenshot: ready?.files?.screenshot || '',
		tabHorizontal: final?.vnstat?.tabMenusLookHorizontal ?? null,
		tabItemYSpread: final?.vnstat?.maxTabItemYSpread ?? null,
		visibleImages: final?.vnstat?.visibleImageCount ?? null,
		vnstatImageGroups: final?.vnstat?.imageGroupCount ?? null,
		visibleSections: final?.network?.visibleSectionTitles || [],
		networkFillingCards: (final?.network?.cards || []).filter((card) => card.fillsMaincontent).length,
		systemApplyVisible: final?.system?.applyAreaVisible ?? null,
		dropdownOptionVisibleCount: final?.system?.dropdownOptionVisibleCount ?? null
	};
}

function possibleCauses() {
	return [
		'viewport differs from the human browser size',
		'cache, cookies, or localStorage differ between clean and persistent profiles',
		'LuCI dynamic view timing differs from the manual screenshot moment',
		'the tested route differs from the human route or redirects differently',
		'LuCI async rendering race is intermittent',
		'browser engine or font/layout differences change the visible first frame'
	];
}

async function writeHumanReproDoc() {
	const md = `# Human Visual Reproduction Guide

Stage 0C treats automated output as trustworthy only when Playwright screenshots match the human screenshot.

## Manual Steps

1. Open an incognito/private browser window.
2. Clear site data for the router host if using a normal browser window.
3. Visit the exact path, for example:
   - \`http://10.10.10.148/cgi-bin/luci/admin/network\`
   - \`http://10.10.10.148/cgi-bin/luci/admin/status/vnstat2\`
4. Log in as \`root\` with an empty password if prompted.
5. Do not click any tab.
6. Capture an immediate screenshot.
7. Wait 5 seconds and capture another screenshot.
8. Click another tab, then click the original tab again.
9. Capture the restored-state screenshot.

## Playwright Matching Steps

Use the same viewport as the real browser window:

\`\`\`sh
node scripts/tab-first-load-audit.mjs --host 10.10.10.148 --profile clean --viewport 1920x1080 --headed --pause
node scripts/tab-first-load-audit.mjs --host 10.10.10.148 --profile persistent --viewport 1920x1080 --headed --pause
\`\`\`

For laptop-sized windows, replace the viewport, for example:

\`\`\`sh
node scripts/tab-first-load-audit.mjs --host 10.10.10.148 --profile clean --viewport 1512x982 --headed --pause
\`\`\`

## Trust Rule

- Playwright screenshots must match the human screenshot before using the audit as a CSS or JS repair basis.
- If screenshots differ, do not continue styling fixes from the automated metrics alone.
- Compare clean profile, persistent profile, headed mode, paused observation, and cache-busting runs before drawing a conclusion.

## Common Mismatch Causes

${possibleCauses().map((item) => `- ${item}`).join('\n')}
`;
	await fs.writeFile(path.join('docs', 'HUMAN_VISUAL_REPRO.md'), md);
}

async function writeVisualAuditMarkdown(outputDir, report) {
	const lines = [];
	for (const [profileName, profile] of Object.entries(report.profiles)) {
		lines.push(`## ${profileName} Profile`);
		for (const [themeName, theme] of Object.entries(profile.themes)) {
			if (!theme.available) {
				lines.push(`### ${themeName}\n\nSkipped: ${theme.skipReason}`);
				continue;
			}
			lines.push(`### ${themeName}`);
			lines.push(`- mediaurlbase: \`${theme.appliedMediaurlbase}\``);
			if (theme.userDataDir)
				lines.push(`- userDataDir: \`${theme.userDataDir}\``);
			lines.push(`- console entries: ${theme.console.length}`);
			lines.push(`- failed requests: ${theme.failedRequests.length}`);
			for (const pageInfo of auditPages) {
				const summary = summarizeVisualResult(theme, pageInfo.name);
				if (!summary) {
					lines.push(`- ${pageInfo.name}: no data`);
					continue;
				}
				lines.push(`- ${pageInfo.name}: first=${summary.firstVisibleTabs}, view-ready=${summary.viewReadyVisibleTabs}, after-raf=${summary.afterRafVisibleTabs}, horizontal-tabs=${summary.tabHorizontal}, tab-y-spread=${summary.tabItemYSpread}`);
				lines.push(`  - recovery: first=${summary.firstRecoveryFlag || 'none'}, view-ready=${summary.viewReadyRecoveryFlag || 'none'}, after-raf=${summary.afterRafRecoveryFlag || 'none'}, recovered=${summary.afterRafRecovered}, normal=${summary.afterRafNormal}, anomaly=${summary.afterRafAnomaly}`);
				lines.push(`  - visible sections: ${summary.visibleSections.length ? summary.visibleSections.join(' | ') : 'none'}`);
				lines.push(`  - visible images: ${summary.visibleImages}, image groups: ${summary.vnstatImageGroups}, full-width card candidates: ${summary.networkFillingCards}`);
				lines.push(`  - apply area visible: ${summary.systemApplyVisible}, visible dropdown options: ${summary.dropdownOptionVisibleCount}`);
				lines.push(`  - first screenshot: \`${summary.firstScreenshot}\``);
				lines.push(`  - view-ready screenshot: \`${summary.viewReadyScreenshot}\``);
				lines.push(`  - page output dir: \`${rel(path.join(outputDir, profileName, themeName, pageInfo.name))}\``);
			}
		}
	}

	const md = `# Tab First Load Visual Audit

Generated: ${report.finishedAt || report.startedAt}

Target: ${report.host}

Viewport: ${report.viewport.width}x${report.viewport.height}, deviceScaleFactor=1

Original mediaurlbase: \`${report.originalMediaurlbase}\`

Restored mediaurlbase: \`${report.restoredMediaurlbase || 'unknown'}\`

Output root: \`${rel(outputDir)}\`

## Screenshot Timeline

Each page/cache-mode directory contains:

- \`t05.png\`
- \`t1.png\`
- \`t2.png\`
- \`t3.png\`
- \`t5.png\`
- \`view-ready.png\`
- \`after-view-ready-raf.png\`
- matching \`.html\`, \`.text.txt\`, \`.classes.json\`, and \`.metrics.json\` files

Cache modes per page:

- \`normal\`
- \`hard-reload\`
- \`disable-cache\`
- \`cache-bust\`

${lines.join('\n')}

## Human Screenshot Match

No human screenshot file was supplied to this script, so this report does not claim a match. The screenshots above must be manually compared with the human screenshot before using the audit as a repair basis.

## If Screenshots Do Not Match

Do not continue CSS or JS repairs from the automated metrics alone. Check:

${possibleCauses().map((item) => `- ${item}`).join('\n')}
`;

	await fs.writeFile(path.join(outputDir, 'report.md'), md);
	await fs.writeFile(path.join('docs', 'TAB_FIRST_LOAD_VISUAL_AUDIT.md'), md);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const baseUrl = normalizeHost(args.host);
	const outputDir = args.output;
	const profiles = args.profile === 'both' ? ['clean', 'persistent'] : [args.profile];
	const report = {
		startedAt: new Date().toISOString(),
		host: args.host,
		user: args.user,
		baseUrl,
		viewport: args.viewport,
		requestedThemes: args.themes,
		requestedProfile: args.profile,
		outputDir: rel(outputDir),
		originalMediaurlbase: '',
		restoredMediaurlbase: '',
		browserName: '',
		headed: args.headed,
		pause: args.pause,
		warnings: [],
		profiles: Object.fromEntries(profiles.map((profile) => [profile, { themes: {} }]))
	};

	await ensureDir(outputDir);
	await ensureDir('docs');
	await writeHumanReproDoc();

	const playwright = await loadPlaywright();

	try {
		report.originalMediaurlbase = await mediaurlbase(args);
		for (const profile of profiles) {
			for (const theme of args.themes)
				await auditThemeProfile(playwright, args, baseUrl, profile, theme, outputDir, report);
		}
	}
	finally {
		if (report.originalMediaurlbase) {
			await restoreTheme(args, report.originalMediaurlbase).catch((err) => {
				report.warnings.push({ message: 'failed to restore original theme', details: { message: err.message } });
			});
			report.restoredMediaurlbase = await mediaurlbase(args).catch(() => '');
		}
	}

	report.finishedAt = new Date().toISOString();
	await writeJson(path.join(outputDir, 'summary.json'), report);
	await writeVisualAuditMarkdown(outputDir, report);

	console.log(`Tab first-load visual audit output: ${outputDir}`);
	console.log('Report: docs/TAB_FIRST_LOAD_VISUAL_AUDIT.md');
	console.log('Human reproduction guide: docs/HUMAN_VISUAL_REPRO.md');
	for (const profile of profiles) {
		for (const theme of args.themes) {
			const themeReport = report.profiles[profile]?.themes[theme];
			console.log(`${profile}/${theme}: ${themeReport?.available ? 'audited' : `skipped (${themeReport?.skipReason || 'unavailable'})`}`);
		}
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
