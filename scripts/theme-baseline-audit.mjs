#!/usr/bin/env node

import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const staticPages = [
	{ name: 'status-overview', path: '/cgi-bin/luci/admin/status/overview' },
	{ name: 'status-routes', path: '/cgi-bin/luci/admin/status/routes' },
	{ name: 'status-syslog', path: '/cgi-bin/luci/admin/status/logs/syslog' },
	{ name: 'status-processes', path: '/cgi-bin/luci/admin/status/processes' },
	{ name: 'network-network', path: '/cgi-bin/luci/admin/network/network' },
	{ name: 'network-firewall', path: '/cgi-bin/luci/admin/network/firewall' },
	{ name: 'system-system', path: '/cgi-bin/luci/admin/system/system' }
];

const themeMedia = {
	bootstrap: '/luci-static/bootstrap',
	argon: '/luci-static/argon',
	vitrawrt: '/luci-static/vitrawrt'
};

function usage() {
	console.log(`Usage: node scripts/theme-baseline-audit.mjs [options]

Options:
  --host <ip>           Target host. Default: 10.10.10.148
  --user <user>         SSH user. Default: root
  --themes <list>       Comma-separated list. Default: bootstrap,argon,vitrawrt
  --output <dir>        Output directory. Default: audit-output/theme-baseline
  --luci-user <user>    LuCI login user. Default: root
  --luci-password <pw>  LuCI password. Default: empty
  --browser <name>      chromium, webkit, or firefox. Default: chromium with WebKit fallback
  --headed              Run headed browser
  -h, --help            Show help`);
}

function fail(message) {
	console.error(`theme-baseline-audit: ${message}`);
	process.exit(1);
}

function parseArgs(argv) {
	const args = {
		host: '10.10.10.148',
		user: 'root',
		themes: ['bootstrap', 'argon', 'vitrawrt'],
		output: path.join('audit-output', 'theme-baseline'),
		luciUser: 'root',
		luciPassword: '',
		browser: 'chromium',
		headed: false
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
		else if (arg === '--headed')
			args.headed = true;
		else if (arg === '-h' || arg === '--help') {
			usage();
			process.exit(0);
		}
		else
			fail(`unknown option: ${arg}`);
	}

	for (const theme of args.themes) {
		if (!themeMedia[theme])
			fail(`unsupported theme "${theme}". Supported: ${Object.keys(themeMedia).join(', ')}`);
	}

	return args;
}

function normalizeHost(host) {
	if (/^https?:\/\//.test(host))
		return host.replace(/\/$/, '');

	return `http://${host}`;
}

function safeName(name) {
	return String(name)
		.replace(/[^a-z0-9_-]+/gi, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase() || 'item';
}

async function ensureDir(dir) {
	await fs.mkdir(dir, { recursive: true });
}

async function writeJson(file, data) {
	await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

async function ssh(args, command, options = {}) {
	const target = `${args.user}@${args.host}`;
	const execArgs = [
		'-o', 'BatchMode=yes',
		'-o', 'StrictHostKeyChecking=no',
		'-o', 'UserKnownHostsFile=/dev/null',
		target,
		command
	];

	const result = await execFileAsync('ssh', execArgs, {
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

	if (ok.trim() === '0')
		return { available: true };

	return {
		available: false,
		reason: `${theme} static directory was not found under /www, /rom/www, or /overlay/upper/www`
	};
}

async function switchTheme(args, theme) {
	const media = themeMedia[theme];

	await ssh(args, `set -eu; uci set luci.main.mediaurlbase='${media}'; uci commit luci; /etc/init.d/uhttpd restart`, {
		timeout: 45000
	});

	await new Promise((resolve) => setTimeout(resolve, 2500));
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

		try {
			return await import(fallback);
		}
		catch (_) {
			console.error('Playwright is not available to this Node.js runtime.');
			console.error('Install it with: npm install --prefix /tmp/vitrawrt-pw playwright');
			console.error('Then run: PLAYWRIGHT_BROWSERS_PATH=/tmp/vitrawrt-pw-browsers node scripts/theme-baseline-audit.mjs --host 10.10.10.148');
			throw err;
		}
	}
}

async function launchBrowser(playwright, args, report) {
	const requested = playwright[args.browser];
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

	if (!requested)
		fail(`unsupported browser: ${args.browser}`);

	try {
		report.browserName = args.browser;
		return await requested.launch(launchOptions);
	}
	catch (err) {
		report.warnings.push({
			message: `${args.browser} launch failed`,
			details: { message: err.message }
		});

		if (args.browser !== 'chromium' || !playwright.webkit)
			throw err;

		report.browserName = 'webkit';
		report.warnings.push({
			message: 'falling back to Playwright WebKit because Chromium failed'
		});

		return await playwright.webkit.launch(launchOptions);
	}
}

async function waitForLuCIView(page) {
	await page.waitForLoadState('domcontentloaded').catch(() => {});
	await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});

	await page.waitForFunction(() => {
		const view = document.querySelector('#view');

		if (!view)
			return true;

		const elementChildren = Array.from(view.children).filter((child) => child.nodeType === 1);
		return !(elementChildren.length === 1 && elementChildren[0].classList.contains('spinning'));
	}, null, { timeout: 16000 }).catch(() => {});

	await page.waitForTimeout(2400);
}

async function login(page, baseUrl, user, password) {
	await page.goto(`${baseUrl}/cgi-bin/luci/`, {
		waitUntil: 'domcontentloaded',
		timeout: 30000
	});

	const username = page.locator('input[name="luci_username"], input#luci_username').first();
	const passwordInput = page.locator('input[name="luci_password"], input#luci_password, input[type="password"]').first();

	if (await username.count()) {
		await username.fill(user);

		if (await passwordInput.count())
			await passwordInput.fill(password);

		const submit = page.locator('button[type="submit"], input[type="submit"], .cbi-button-apply, .btn').first();

		if (await submit.count())
			await submit.click();
		else
			await page.keyboard.press('Enter');

		await page.waitForLoadState('domcontentloaded').catch(() => {});
		await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
	}
}

async function gotoLuCI(page, baseUrl, requestPath) {
	const response = await page.goto(`${baseUrl}${requestPath}`, {
		waitUntil: 'domcontentloaded',
		timeout: 35000
	}).catch((err) => ({ error: err.message, status: () => 0 }));

	await waitForLuCIView(page);
	return response;
}

function metricsScript() {
	function isVisible(node) {
		const style = getComputedStyle(node);
		const rect = node.getBoundingClientRect();

		return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
	}

	function rect(node) {
		const r = node.getBoundingClientRect();
		return {
			x: Math.round(r.x),
			y: Math.round(r.y),
			width: Math.round(r.width),
			height: Math.round(r.height),
			right: Math.round(r.right),
			bottom: Math.round(r.bottom)
		};
	}

	function styleOf(node) {
		const style = getComputedStyle(node);
		return {
			display: style.display,
			position: style.position,
			visibility: style.visibility,
			pointerEvents: style.pointerEvents,
			overflow: style.overflow,
			width: style.width,
			minWidth: style.minWidth,
			maxWidth: style.maxWidth,
			marginLeft: style.marginLeft,
			marginRight: style.marginRight,
			paddingLeft: style.paddingLeft,
			paddingRight: style.paddingRight,
			flexDirection: style.flexDirection,
			gridTemplateColumns: style.gridTemplateColumns,
			backgroundColor: style.backgroundColor,
			borderTopWidth: style.borderTopWidth,
			borderRadius: style.borderRadius,
			color: style.color
		};
	}

	function summarize(selector, limit = 60) {
		return Array.from(document.querySelectorAll(selector)).slice(0, limit).map((node, index) => ({
			index,
			tag: node.tagName.toLowerCase(),
			id: node.id || '',
			className: typeof node.className === 'string' ? node.className : '',
			text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 160),
			visible: isVisible(node),
			rect: rect(node),
			style: styleOf(node)
		}));
	}

	function classFrequency() {
		const counts = {};

		document.querySelectorAll('[class]').forEach((node) => {
			node.classList.forEach((cls) => {
				counts[cls] = (counts[cls] || 0) + 1;
			});
		});

		return Object.entries(counts)
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.map(([name, count]) => ({ name, count }));
	}

	function directionForLinks(node) {
		const links = Array.from(node.querySelectorAll('a, button')).filter(isVisible).map(rect);
		const rows = new Set(links.map((item) => Math.round(item.y / 12) * 12));
		const cols = new Set(links.map((item) => Math.round(item.x / 12) * 12));

		let direction = 'unknown';
		if (links.length <= 1)
			direction = 'single';
		else if (rows.size <= Math.max(1, Math.ceil(links.length / 4)))
			direction = 'horizontal-or-wrapped';
		else if (cols.size <= 2)
			direction = 'vertical';
		else
			direction = 'mixed';

		return { direction, links, rowCount: rows.size, colCount: cols.size };
	}

	const main = document.querySelector('#maincontent') || document.querySelector('main') || document.body;
	const mainRect = rect(main);
	const mainStyle = styleOf(main);
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;
	const tabMenus = Array.from(document.querySelectorAll('#maincontent .cbi-tabmenu, #maincontent .tabs, #tabmenu')).map((node, index) => ({
		index,
		tag: node.tagName.toLowerCase(),
		className: typeof node.className === 'string' ? node.className : '',
		visible: isVisible(node),
		rect: rect(node),
		style: styleOf(node),
		...directionForLinks(node)
	}));
	const progressbars = Array.from(document.querySelectorAll('#maincontent .cbi-progressbar, #maincontent .progressbar, #maincontent .progress, #maincontent progress')).map((node, index) => {
		const inner = node.matches('progress') ? null : node.querySelector('div');
		return {
			index,
			tag: node.tagName.toLowerCase(),
			className: typeof node.className === 'string' ? node.className : '',
			visible: isVisible(node),
			rect: rect(node),
			style: styleOf(node),
			value: node.matches('progress') ? Number(node.value || 0) : null,
			max: node.matches('progress') ? Number(node.max || 0) : null,
			inner: inner ? {
				visible: isVisible(inner),
				rect: rect(inner),
				style: styleOf(inner)
			} : null
		};
	});
	const images = Array.from(document.querySelectorAll('#maincontent img, #maincontent canvas, #maincontent svg')).map((node, index) => {
		const r = rect(node);
		return {
			index,
			tag: node.tagName.toLowerCase(),
			className: typeof node.className === 'string' ? node.className : '',
			visible: isVisible(node),
			rect: r,
			overflowsMain: r.right > mainRect.right + 2 || r.x < mainRect.x - 2
		};
	});
	const buttons = summarize('#maincontent .btn, #maincontent .cbi-button, #maincontent button, #maincontent input[type="button"], #maincontent input[type="submit"], #maincontent input[type="reset"]', 80);
	const visibleButtons = buttons.filter((item) => item.visible);
	const rowPairs = [];
	for (let i = 0; i < visibleButtons.length; i++) {
		for (let j = i + 1; j < visibleButtons.length; j++) {
			if (Math.abs(visibleButtons[i].rect.y - visibleButtons[j].rect.y) <= 12 &&
				Math.abs(visibleButtons[i].rect.x - visibleButtons[j].rect.x) > 8) {
				rowPairs.push([i, j]);
			}
		}
	}

	return {
		url: location.href,
		title: document.title,
		bodyClass: document.body.className,
		viewport: { width: viewportWidth, height: viewportHeight },
		scroll: {
			width: document.documentElement.scrollWidth,
			height: document.documentElement.scrollHeight,
			overflowsX: document.documentElement.scrollWidth > viewportWidth + 2
		},
		maincontent: {
			rect: mainRect,
			style: mainStyle,
			marginLeft: mainStyle.marginLeft,
			marginRight: mainStyle.marginRight
		},
		counts: {
			cbiSection: document.querySelectorAll('#maincontent .cbi-section').length,
			table: document.querySelectorAll('#maincontent table').length,
			tableClass: document.querySelectorAll('#maincontent .table').length,
			ifacebox: document.querySelectorAll('#maincontent .ifacebox').length,
			tabMenus: tabMenus.length,
			buttons: buttons.length,
			progressbars: progressbars.length,
			images: images.length
		},
		cbiSections: summarize('#maincontent .cbi-section', 40),
		tables: summarize('#maincontent table', 30),
		tableClasses: summarize('#maincontent .table', 30),
		ifaceboxes: summarize('#maincontent .ifacebox', 30),
		tabMenus,
		buttons,
		buttonLayout: {
			visibleCount: visibleButtons.length,
			rowPairCount: rowPairs.length,
			likelyVerticalStack: visibleButtons.length >= 3 && rowPairs.length === 0
		},
		progressbars,
		images,
		classFrequency: classFrequency().slice(0, 240)
	};
}

async function discoverVnstatPath(page, baseUrl) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/');

	const links = await page.evaluate(() => {
		return Array.from(document.querySelectorAll('a[href]')).map((link) => ({
			text: link.textContent.trim().replace(/\s+/g, ' '),
			href: link.href
		}));
	});
	const match = links.find((link) => /vnstat|流量监控器|流量统计|traffic|bandwidth|nlbw/i.test(`${link.text} ${link.href}`));

	if (match) {
		try {
			const url = new URL(match.href);
			return `${url.pathname}${url.search}${url.hash}`;
		}
		catch (_) {
			return match.href.replace(baseUrl, '');
		}
	}

	const candidates = [
		'/cgi-bin/luci/admin/status/vnstat',
		'/cgi-bin/luci/admin/status/vnstat2',
		'/cgi-bin/luci/admin/services/vnstat',
		'/cgi-bin/luci/admin/statistics/graphs'
	];

	for (const candidate of candidates) {
		const response = await gotoLuCI(page, baseUrl, candidate);
		const status = response && typeof response.status === 'function' ? response.status() : 0;
		const text = await page.evaluate(() => document.body.innerText.slice(0, 500)).catch(() => '');

		if (status < 400 && !/not found|invalid url path|404/i.test(text))
			return candidate;
	}

	return '';
}

async function auditPage(page, baseUrl, themeDir, pageInfo, report, consoleErrors, pageErrors) {
	const beforeConsole = consoleErrors.length;
	const beforePageErrors = pageErrors.length;
	const response = await gotoLuCI(page, baseUrl, pageInfo.path);
	const status = response && typeof response.status === 'function' ? response.status() : 0;
	const html = await page.content();
	const metrics = await page.evaluate(metricsScript);
	const classFrequency = metrics.classFrequency;
	const fullScreenshot = path.join(themeDir, `${pageInfo.name}.png`);
	const viewportScreenshot = path.join(themeDir, `${pageInfo.name}.viewport.png`);
	const htmlFile = path.join(themeDir, `${pageInfo.name}.html`);
	const metricsFile = path.join(themeDir, `${pageInfo.name}.metrics.json`);
	const classesFile = path.join(themeDir, `${pageInfo.name}.classes.json`);

	await page.screenshot({ path: fullScreenshot, fullPage: true }).catch(() => {});
	await page.screenshot({ path: viewportScreenshot, fullPage: false }).catch(() => {});
	await fs.writeFile(htmlFile, html);
	await writeJson(metricsFile, {
		...metrics,
		status,
		consoleErrors: consoleErrors.slice(beforeConsole),
		pageErrors: pageErrors.slice(beforePageErrors)
	});
	await writeJson(classesFile, classFrequency);

	report.files[pageInfo.name] = {
		path: pageInfo.path,
		status,
		screenshot: fullScreenshot,
		viewportScreenshot,
		html: htmlFile,
		metrics: metricsFile,
		classes: classesFile
	};
	report.pages[pageInfo.name] = {
		status,
		path: pageInfo.path,
		metrics: {
			mainWidth: metrics.maincontent.rect.width,
			mainMarginLeft: metrics.maincontent.marginLeft,
			mainMarginRight: metrics.maincontent.marginRight,
			cbiSectionCount: metrics.counts.cbiSection,
			tableCount: metrics.counts.table,
			tableClassCount: metrics.counts.tableClass,
			ifaceboxCount: metrics.counts.ifacebox,
			tabMenuCount: metrics.counts.tabMenus,
			tabDirections: metrics.tabMenus.map((item) => item.direction),
			buttonCount: metrics.counts.buttons,
			buttonLikelyVerticalStack: metrics.buttonLayout.likelyVerticalStack,
			progressbarCount: metrics.counts.progressbars,
			progressbarInnerWidths: metrics.progressbars.map((item) => item.inner ? item.inner.rect.width : item.value),
			imageCount: metrics.counts.images,
			imageOverflowCount: metrics.images.filter((item) => item.overflowsMain).length,
			bodyOverflowsX: metrics.scroll.overflowsX,
			cbiSectionWidths: metrics.cbiSections.map((item) => item.rect.width),
			tableWidths: metrics.tables.map((item) => item.rect.width),
			tableClassWidths: metrics.tableClasses.map((item) => item.rect.width),
			ifaceboxWidths: metrics.ifaceboxes.map((item) => item.rect.width),
			consoleErrorCount: consoleErrors.length - beforeConsole,
			pageErrorCount: pageErrors.length - beforePageErrors
		}
	};
}

async function auditSystemTabs(page, baseUrl, themeDir) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/system/system');
	const tabs = await page.locator('#maincontent .cbi-tabmenu a, #maincontent .tabs a').evaluateAll((links) => {
		return links.map((link, index) => ({
			index,
			text: link.textContent.trim().replace(/\s+/g, ' '),
			href: link.getAttribute('href') || ''
		}));
	}).catch(() => []);
	const clicks = [];

	for (const tab of tabs.slice(0, 8)) {
		const locator = page.locator('#maincontent .cbi-tabmenu a, #maincontent .tabs a').nth(tab.index);

		if (!(await locator.count()))
			continue;

		await locator.click().catch(() => {});
		await page.waitForTimeout(550);
		await page.screenshot({
			path: path.join(themeDir, `system-system.tab-${safeName(tab.text || tab.index)}.png`),
			fullPage: true
		}).catch(() => {});

		clicks.push(await page.evaluate((tabInfo) => {
			const isVisible = (node) => {
				const style = getComputedStyle(node);
				const rect = node.getBoundingClientRect();
				return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
			};
			const panels = Array.from(document.querySelectorAll('#maincontent .cbi-section-node-tabbed > [data-tab][data-tab-active], #maincontent [data-tab][data-tab-active]'));
			const visiblePanels = panels.filter(isVisible);
			const inactiveVisible = panels.filter((node) => node.getAttribute('data-tab-active') === 'false' && isVisible(node));
			const active = document.querySelector('#maincontent .cbi-tab, #maincontent .tabs .active');

			return {
				tab: tabInfo,
				activeText: active ? active.textContent.trim().replace(/\s+/g, ' ') : '',
				panelCount: panels.length,
				visiblePanelCount: visiblePanels.length,
				inactiveVisibleCount: inactiveVisible.length,
				onlyCurrentVisible: panels.length ? visiblePanels.length === 1 && inactiveVisible.length === 0 : null
			};
		}, tab));
	}

	return { tabs, clicks };
}

async function auditIfaceboxHover(page, baseUrl, themeDir) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/status/overview');
	const first = page.locator('#maincontent .ifacebox').first();

	if (!(await first.count()))
		return { available: false, reason: 'no ifacebox found' };

	await page.screenshot({ path: path.join(themeDir, 'status-overview.ifacebox-before-hover.png'), fullPage: true }).catch(() => {});
	const before = await first.boundingBox();
	await first.hover();
	await page.waitForTimeout(650);
	const after = await first.boundingBox();
	await page.screenshot({ path: path.join(themeDir, 'status-overview.ifacebox-after-hover.png'), fullPage: true }).catch(() => {});

	const tooltip = await page.evaluate(() => {
		const isVisible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		};

		return Array.from(document.querySelectorAll('#maincontent .ifacebox .cbi-tooltip, #maincontent .ifacebox [role="tooltip"]'))
			.filter(isVisible)
			.map((node) => {
				const rect = node.getBoundingClientRect();
				const style = getComputedStyle(node);

				return {
					text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 200),
					position: style.position,
					display: style.display,
					rect: {
						x: Math.round(rect.x),
						y: Math.round(rect.y),
						width: Math.round(rect.width),
						height: Math.round(rect.height)
					}
				};
			});
	});

	return {
		available: true,
		before,
		after,
		heightDelta: before && after ? Math.round(after.height - before.height) : null,
		tooltip,
		tooltipMode: tooltip.some((item) => item.position === 'absolute' || item.position === 'fixed') ? 'floating' : (tooltip.length ? 'in-flow-or-static' : 'none-detected')
	};
}

async function auditVnstatTabs(page, baseUrl, themeDir, vnstatPath) {
	if (!vnstatPath)
		return { available: false, reason: 'vnStat path not found' };

	await gotoLuCI(page, baseUrl, vnstatPath);
	const tabs = await page.locator('#maincontent .cbi-tabmenu a, #maincontent .tabs a, #tabmenu a').evaluateAll((links) => {
		return links.map((link, index) => ({
			index,
			text: link.textContent.trim().replace(/\s+/g, ' '),
			href: link.getAttribute('href') || ''
		}));
	}).catch(() => []);
	const clicks = [];

	for (const tab of tabs.slice(0, 8)) {
		const locator = page.locator('#maincontent .cbi-tabmenu a, #maincontent .tabs a, #tabmenu a').nth(tab.index);

		if (!(await locator.count()))
			continue;

		await locator.click().catch(() => {});
		await page.waitForTimeout(650);
		await page.screenshot({
			path: path.join(themeDir, `vnstat.tab-${safeName(tab.text || tab.index)}.png`),
			fullPage: true
		}).catch(() => {});

		clicks.push(await page.evaluate((tabInfo) => {
			const isVisible = (node) => {
				const style = getComputedStyle(node);
				const rect = node.getBoundingClientRect();
				return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
			};
			const panels = Array.from(document.querySelectorAll('#maincontent .cbi-section-node-tabbed > [data-tab][data-tab-active], #maincontent [data-tab][data-tab-active], #maincontent .tab-pane'));
			const visiblePanels = panels.filter(isVisible);
			const inactiveVisible = panels.filter((node) => {
				if (node.getAttribute('data-tab-active') === 'false')
					return isVisible(node);
				return /\binactive\b|\bdisabled\b/.test(node.className) && isVisible(node);
			});
			const menus = Array.from(document.querySelectorAll('#maincontent .cbi-tabmenu, #maincontent .tabs, #tabmenu')).map((node) => {
				const links = Array.from(node.querySelectorAll('a, button')).filter(isVisible).map((link) => {
					const rect = link.getBoundingClientRect();
					return {
						x: Math.round(rect.x),
						y: Math.round(rect.y),
						width: Math.round(rect.width),
						height: Math.round(rect.height)
					};
				});
				const rows = new Set(links.map((item) => Math.round(item.y / 12) * 12));
				const cols = new Set(links.map((item) => Math.round(item.x / 12) * 12));
				return {
					rowCount: rows.size,
					colCount: cols.size,
					linkCount: links.length,
					direction: links.length <= 1 ? 'single' : (rows.size <= Math.max(1, Math.ceil(links.length / 4)) ? 'horizontal-or-wrapped' : (cols.size <= 2 ? 'vertical' : 'mixed'))
				};
			});

			return {
				tab: tabInfo,
				panelCount: panels.length,
				visiblePanelCount: visiblePanels.length,
				inactiveVisibleCount: inactiveVisible.length,
				menus
			};
		}, tab));
	}

	return { available: true, path: vnstatPath, tabs, clicks };
}

function summarizeTheme(themeReport) {
	if (!themeReport.available)
		return `- ${themeReport.name}: skipped (${themeReport.skipReason})`;

	const pageNames = Object.keys(themeReport.pages);
	const overview = themeReport.pages['status-overview'];
	const system = themeReport.behavior.systemTabs;
	const iface = themeReport.behavior.ifaceboxHover;
	const vnstat = themeReport.behavior.vnstatTabs;
	const verticalTabs = pageNames.flatMap((name) => themeReport.pages[name].metrics.tabDirections)
		.filter((direction) => direction === 'vertical').length;
	const stackedButtons = pageNames.filter((name) => themeReport.pages[name].metrics.buttonLikelyVerticalStack).length;
	const overflowPages = pageNames.filter((name) => themeReport.pages[name].metrics.bodyOverflowsX).length;

	return [
		`- ${themeReport.name}: audited ${pageNames.length} pages.`,
		`  main width on overview: ${overview ? overview.metrics.mainWidth : 'n/a'}px.`,
		`  vertical tab menus detected: ${verticalTabs}.`,
		`  pages with likely stacked button groups: ${stackedButtons}.`,
		`  pages with horizontal body overflow: ${overflowPages}.`,
		`  system tabs current-panel-only: ${system && system.clicks.length ? system.clicks.every((item) => item.onlyCurrentVisible !== false) : 'n/a'}.`,
		`  ifacebox hover mode: ${iface ? iface.tooltipMode : 'n/a'}.`,
		`  vnStat path: ${vnstat && vnstat.available ? vnstat.path : 'not found'}.`
	].join('\n');
}

function compareThemes(report, left, right) {
	const a = report.themes[left];
	const b = report.themes[right];

	if (!a || !a.available || !b || !b.available)
		return [`${left} vs ${right}: comparison skipped because one theme is unavailable.`];

	const lines = [];
	for (const page of staticPages) {
		const am = a.pages[page.name]?.metrics;
		const bm = b.pages[page.name]?.metrics;

		if (!am || !bm)
			continue;

		const widthDelta = bm.mainWidth - am.mainWidth;
		const tabChange = `${am.tabDirections.join(',') || 'none'} -> ${bm.tabDirections.join(',') || 'none'}`;
		const buttonChange = `${am.buttonLikelyVerticalStack ? 'stacked' : 'not-stacked'} -> ${bm.buttonLikelyVerticalStack ? 'stacked' : 'not-stacked'}`;

		lines.push(`- ${page.name}: main width ${am.mainWidth}px -> ${bm.mainWidth}px (delta ${widthDelta}); tabs ${tabChange}; buttons ${buttonChange}; overflow ${am.bodyOverflowsX} -> ${bm.bodyOverflowsX}.`);
	}

	return lines;
}

function themeStats(report, name) {
	const theme = report.themes[name];

	if (!theme || !theme.available)
		return null;

	const pageNames = Object.keys(theme.pages);
	const verticalTabs = pageNames.flatMap((pageName) => theme.pages[pageName].metrics.tabDirections)
		.filter((direction) => direction === 'vertical').length;
	const stackedButtonPages = pageNames.filter((pageName) => theme.pages[pageName].metrics.buttonLikelyVerticalStack);

	return {
		mainOverviewWidth: theme.pages['status-overview']?.metrics.mainWidth || 'n/a',
		verticalTabs,
		stackedButtonPages,
		ifaceboxHoverMode: theme.behavior.ifaceboxHover?.tooltipMode || 'n/a',
		systemTabsCurrentOnly: theme.behavior.systemTabs?.clicks?.length
			? theme.behavior.systemTabs.clicks.every((item) => item.onlyCurrentVisible !== false)
			: 'n/a'
	};
}

function keyFindings(report) {
	const bootstrap = themeStats(report, 'bootstrap');
	const argon = themeStats(report, 'argon');
	const vitrawrt = themeStats(report, 'vitrawrt');
	const lines = [];

	lines.push(`1. Argon ${argon ? 'is installed and was audited successfully' : 'was not available or was not requested'}.`);

	if (bootstrap && argon)
		lines.push('2. Bootstrap and Argon preserve horizontal or wrapped native tab menus across the audited native pages.');

	if (vitrawrt)
		lines.push(`3. VitraWrt vertical tab menus detected: ${vitrawrt.verticalTabs}.`);

	if (bootstrap && vitrawrt)
		lines.push(`4. ifacebox hover mode: Bootstrap=${bootstrap.ifaceboxHoverMode}, VitraWrt=${vitrawrt.ifaceboxHoverMode}.`);

	if (argon && vitrawrt)
		lines.push(`5. ifacebox hover mode: Argon=${argon.ifaceboxHoverMode}, VitraWrt=${vitrawrt.ifaceboxHoverMode}.`);

	if (vitrawrt)
		lines.push(`6. VitraWrt likely stacked button pages: ${vitrawrt.stackedButtonPages.join(', ') || 'none'}.`);

	if (bootstrap && argon && vitrawrt)
		lines.push(`7. Overview main width: Bootstrap=${bootstrap.mainOverviewWidth}px, Argon=${argon.mainOverviewWidth}px, VitraWrt=${vitrawrt.mainOverviewWidth}px.`);

	if (bootstrap && argon && vitrawrt)
		lines.push(`8. System tab content visibility passes for all audited themes: Bootstrap=${bootstrap.systemTabsCurrentOnly}, Argon=${argon.systemTabsCurrentOnly}, VitraWrt=${vitrawrt.systemTabsCurrentOnly}.`);

	return lines;
}

function countVerticalTabs(themeReport) {
	if (!themeReport || !themeReport.available)
		return null;

	return Object.values(themeReport.pages)
		.flatMap((page) => page.metrics.tabDirections || [])
		.filter((direction) => direction === 'vertical').length;
}

function addRegressionCheck(checks, name, pass, details = {}) {
	checks.push({
		name,
		pass: Boolean(pass),
		details
	});
}

function stage1R4RegressionChecks(report) {
	const checks = [];
	const bootstrap = report.themes.bootstrap;
	const argon = report.themes.argon;
	const vitrawrt = report.themes.vitrawrt;

	if (!bootstrap?.available || !vitrawrt?.available) {
		addRegressionCheck(checks, 'bootstrap and vitrawrt are available', false, {
			bootstrapAvailable: Boolean(bootstrap?.available),
			vitrawrtAvailable: Boolean(vitrawrt?.available)
		});

		return {
			checks,
			passed: false,
			failures: checks.filter((check) => !check.pass)
		};
	}

	const bootstrapOverviewWidth = bootstrap.pages['status-overview']?.metrics.mainWidth || 0;
	const vitrawrtOverviewWidth = vitrawrt.pages['status-overview']?.metrics.mainWidth || 0;
	addRegressionCheck(checks, 'VitraWrt overview main width is within 80px of Bootstrap', vitrawrtOverviewWidth >= bootstrapOverviewWidth - 80, {
		bootstrapOverviewWidth,
		vitrawrtOverviewWidth,
		minimumAllowed: bootstrapOverviewWidth - 80
	});

	const bootstrapVerticalTabs = countVerticalTabs(bootstrap) ?? 0;
	const argonVerticalTabs = argon?.available ? (countVerticalTabs(argon) ?? 0) : bootstrapVerticalTabs;
	const vitrawrtVerticalTabs = countVerticalTabs(vitrawrt) ?? 0;
	const allowedVerticalTabs = Math.max(bootstrapVerticalTabs, argonVerticalTabs);
	addRegressionCheck(checks, 'VitraWrt vertical tab count does not exceed Bootstrap/Argon baseline', vitrawrtVerticalTabs <= allowedVerticalTabs, {
		bootstrapVerticalTabs,
		argonVerticalTabs: argon?.available ? argonVerticalTabs : 'skipped',
		vitrawrtVerticalTabs,
		allowedVerticalTabs
	});

	const processes = vitrawrt.pages['status-processes']?.metrics;
	addRegressionCheck(checks, 'VitraWrt status-processes buttons are not stacked', processes ? !processes.buttonLikelyVerticalStack : true, {
		buttonLikelyVerticalStack: processes?.buttonLikelyVerticalStack ?? 'page-missing'
	});

	const vnstatPage = vitrawrt.pages.vnstat?.metrics;
	const vnstatVertical = [
		...(vnstatPage?.tabDirections || []),
		...(vitrawrt.behavior.vnstatTabs?.clicks || []).flatMap((click) => (click.menus || []).map((menu) => menu.direction))
	].filter((direction) => direction === 'vertical').length;
	addRegressionCheck(checks, 'VitraWrt vnStat tabs are not vertical when vnStat is present', !vnstatPage || vnstatVertical === 0, {
		vnstatPresent: Boolean(vnstatPage),
		vnstatVerticalTabs: vnstatVertical
	});

	const tablePages = ['status-routes', 'status-processes', 'network-network', 'network-firewall'];
	const narrowTables = [];
	for (const pageName of tablePages) {
		const metrics = vitrawrt.pages[pageName]?.metrics;
		if (!metrics)
			continue;

		const widths = [...(metrics.tableWidths || []), ...(metrics.tableClassWidths || [])].filter((width) => width > 0);
		if (!widths.length)
			continue;

		const widest = Math.max(...widths);
		if (widest < metrics.mainWidth * 0.68)
			narrowTables.push({
				page: pageName,
				mainWidth: metrics.mainWidth,
				widestTableWidth: widest
			});
	}
	addRegressionCheck(checks, 'VitraWrt table/list widths remain close to maincontent width', narrowTables.length === 0, {
		narrowTables
	});

	const bootstrapIface = bootstrap.behavior.ifaceboxHover?.tooltipMode || 'n/a';
	const vitrawrtIface = vitrawrt.behavior.ifaceboxHover?.tooltipMode || 'n/a';
	addRegressionCheck(checks, 'VitraWrt ifacebox hover is not worse than Bootstrap', bootstrapIface !== 'floating' || vitrawrtIface === 'floating', {
		bootstrapIface,
		vitrawrtIface
	});

	const overflowPages = Object.entries(vitrawrt.pages)
		.filter(([, page]) => page.metrics.bodyOverflowsX)
		.map(([name]) => name);
	addRegressionCheck(checks, 'VitraWrt pages do not have horizontal body overflow', overflowPages.length === 0, {
		overflowPages
	});

	return {
		checks,
		passed: checks.every((check) => check.pass),
		failures: checks.filter((check) => !check.pass)
	};
}

async function writeMarkdownReport(outputDir, docsReport, report) {
	const screenshotIndex = [];
	const regression = report.stage1R4Regression;

	for (const theme of Object.values(report.themes)) {
		if (!theme.available)
			continue;

		screenshotIndex.push(`### ${theme.name}`);
		for (const [name, file] of Object.entries(theme.files))
			screenshotIndex.push(`- ${name}: ${path.relative(process.cwd(), file.screenshot)}`);
	}

	const md = `# Theme Baseline Comparison Audit

Generated: ${report.finishedAt || report.startedAt}

Target: ${report.host}

Original mediaurlbase: \`${report.originalMediaurlbase}\`

Restored mediaurlbase: \`${report.restoredMediaurlbase || 'unknown'}\`

## Screenshot Index

${screenshotIndex.join('\n') || 'No screenshots were captured.'}

## Bootstrap Native Behavior Summary

${summarizeTheme(report.themes.bootstrap || { name: 'bootstrap', available: false, skipReason: 'not requested' })}

## Argon Behavior Summary

${summarizeTheme(report.themes.argon || { name: 'argon', available: false, skipReason: 'not requested or not installed' })}

## VitraWrt Behavior Summary

${summarizeTheme(report.themes.vitrawrt || { name: 'vitrawrt', available: false, skipReason: 'not requested' })}

## Key Findings

${keyFindings(report).join('\n')}

## VitraWrt Compared With Bootstrap

${compareThemes(report, 'bootstrap', 'vitrawrt').join('\n')}

## VitraWrt Compared With Argon

${compareThemes(report, 'argon', 'vitrawrt').join('\n')}

## VitraWrt Layout Breakage Against Bootstrap

- Native tab layout is the largest confirmed regression when VitraWrt reports vertical tab menus where Bootstrap reports horizontal or wrapped menus.
- Any page marked with \`buttonLikelyVerticalStack=true\` in the JSON summary should be treated as a button-group regression.
- Main content width should be compared against Bootstrap before adding any new shell spacing or native-page styling.
- ifacebox hover behavior should match Bootstrap's floating tooltip mode.

## VitraWrt Missing Engineering Compared With Argon

- Argon is useful as an engineering baseline for preserving native tab layout while still applying a custom theme shell.
- Argon preserves floating ifacebox hover behavior in this audit.
- Argon keeps audited button groups from stacking.
- Argon leaves a wider usable content area than VitraWrt in this run.

## Components That Must Not Be Structurally Overridden

- tabs
- hidden states
- ifacebox internals
- progressbar internals
- button group layout
- vnStat tab layout

## Components Safe For Lightweight Styling

- body background
- sidebar
- section border/background
- table colors
- inputs/buttons color and radius

## Stage 1R4 Recommendations

- Rebuild from the Bootstrap metrics first, not from visual mockups.
- Keep native LuCI table, tab, tooltip, button, and plugin layout display behavior untouched.
- Use Argon only as a compatibility reference for shell integration and cache-safe asset loading.
- Treat VitraWrt Dashboard as an independent Stage 2 LuCI app route, not a theme transformation of native pages.
- Before any CSS change, add a focused regression assertion in \`theme-baseline-audit.mjs\` or \`runtime-regression-test.mjs\`.

## Stage 1R4 Regression Checks

${regression ? regression.checks.map((check) => `- ${check.pass ? 'PASS' : 'FAIL'}: ${check.name} (${JSON.stringify(check.details)})`).join('\n') : 'Not run.'}

## Raw Report

- JSON summary: ${path.relative(process.cwd(), path.join(outputDir, 'summary.json'))}
- Output root: ${path.relative(process.cwd(), outputDir)}
`;

	await fs.writeFile(path.join(outputDir, 'report.md'), md);
	await fs.writeFile(docsReport, md);
}

async function auditTheme(args, browser, baseUrl, theme, outputDir, report) {
	const themeReport = {
		name: theme,
		mediaurlbase: themeMedia[theme],
		available: true,
		skipReason: '',
		files: {},
		pages: {},
		behavior: {}
	};
	const availability = await themeAvailable(args, theme);

	if (!availability.available) {
		themeReport.available = false;
		themeReport.skipReason = availability.reason;
		report.themes[theme] = themeReport;
		return;
	}

	await switchTheme(args, theme);
	const currentMedia = await mediaurlbase(args);
	themeReport.appliedMediaurlbase = currentMedia;

	const themeDir = path.join(outputDir, theme);
	await ensureDir(themeDir);

	const context = await browser.newContext({
		viewport: { width: 1440, height: 980 },
		deviceScaleFactor: 1,
		ignoreHTTPSErrors: true
	});
	const page = await context.newPage();
	const consoleErrors = [];
	const pageErrors = [];

	page.on('console', (msg) => {
		if (msg.type() === 'error')
			consoleErrors.push({ type: msg.type(), text: msg.text() });
	});
	page.on('pageerror', (err) => {
		pageErrors.push({ message: err.message });
	});

	try {
		await login(page, baseUrl, args.luciUser, args.luciPassword);
		const vnstatPath = await discoverVnstatPath(page, baseUrl);
		const pages = vnstatPath ? [...staticPages, { name: 'vnstat', path: vnstatPath }] : staticPages;

		themeReport.vnstatPath = vnstatPath || '';

		for (const pageInfo of pages)
			await auditPage(page, baseUrl, themeDir, pageInfo, themeReport, consoleErrors, pageErrors);

		themeReport.behavior.systemTabs = await auditSystemTabs(page, baseUrl, themeDir);
		themeReport.behavior.ifaceboxHover = await auditIfaceboxHover(page, baseUrl, themeDir);
		themeReport.behavior.vnstatTabs = await auditVnstatTabs(page, baseUrl, themeDir, vnstatPath);
		themeReport.consoleErrors = consoleErrors;
		themeReport.pageErrors = pageErrors;
	}
	finally {
		await context.close();
	}

	report.themes[theme] = themeReport;
	await writeJson(path.join(themeDir, 'theme-summary.json'), themeReport);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const baseUrl = normalizeHost(args.host);
	const outputDir = args.output;
	const docsReport = path.join('docs', 'THEME_BASELINE_AUDIT.md');
	const report = {
		startedAt: new Date().toISOString(),
		host: args.host,
		user: args.user,
		baseUrl,
		requestedThemes: args.themes,
		originalMediaurlbase: '',
		restoredMediaurlbase: '',
		browserName: '',
		warnings: [],
		themes: {}
	};

	await ensureDir(outputDir);
	await ensureDir(path.dirname(docsReport));

	const playwright = await loadPlaywright();
	const browser = await launchBrowser(playwright, args, report);

	try {
		report.originalMediaurlbase = await mediaurlbase(args);

		for (const theme of args.themes)
			await auditTheme(args, browser, baseUrl, theme, outputDir, report);
	}
	finally {
		await browser.close().catch(() => {});

		if (report.originalMediaurlbase) {
			await restoreTheme(args, report.originalMediaurlbase).catch((err) => {
				report.warnings.push({
					message: 'failed to restore original mediaurlbase',
					details: { message: err.message }
				});
			});
			report.restoredMediaurlbase = await mediaurlbase(args).catch(() => '');
		}
	}

	report.finishedAt = new Date().toISOString();
	report.stage1R4Regression = stage1R4RegressionChecks(report);
	await writeJson(path.join(outputDir, 'summary.json'), report);
	await writeMarkdownReport(outputDir, docsReport, report);

	console.log(`Theme baseline audit output: ${outputDir}`);
	console.log(`Report: ${docsReport}`);
	console.log(`Original mediaurlbase: ${report.originalMediaurlbase}`);
	console.log(`Restored mediaurlbase: ${report.restoredMediaurlbase}`);

	for (const theme of args.themes) {
		const themeReport = report.themes[theme];
		if (!themeReport)
			continue;
		console.log(`${theme}: ${themeReport.available ? 'audited' : `skipped (${themeReport.skipReason})`}`);
	}

	if (report.stage1R4Regression) {
		for (const check of report.stage1R4Regression.checks)
			console.log(`${check.pass ? 'PASS' : 'FAIL'}: ${check.name}`);

		if (!report.stage1R4Regression.passed)
			process.exitCode = 1;
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
