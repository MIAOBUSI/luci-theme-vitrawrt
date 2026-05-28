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

const pages = [
	{ name: 'system-system', path: '/cgi-bin/luci/admin/system/system' },
	{ name: 'status-overview', path: '/cgi-bin/luci/admin/status/overview' },
	{ name: 'status-syslog', path: '/cgi-bin/luci/admin/status/logs/syslog' },
	{ name: 'status-processes', path: '/cgi-bin/luci/admin/status/processes' },
	{ name: 'system-startup', path: '/cgi-bin/luci/admin/system/startup' },
	{ name: 'network-network', path: '/cgi-bin/luci/admin/network/network' },
	{ name: 'network-firewall', path: '/cgi-bin/luci/admin/network/firewall' }
];

const componentSelectors = [
	'.cbi-map',
	'.cbi-section',
	'.cbi-section-node',
	'.cbi-value',
	'.cbi-value-title',
	'.cbi-value-field',
	'.cbi-dropdown',
	'.cbi-dropdown-container',
	'.cbi-dropdown-option',
	'select',
	'option',
	'.cbi-dynlist',
	'.cbi-dynlist-item',
	'.cbi-input-text',
	'.cbi-button-add',
	'.cbi-button-remove',
	'.cbi-button-up',
	'.cbi-button-down',
	'.cbi-page-actions',
	'.cbi-button-save',
	'.cbi-button-apply',
	'.cbi-button-reset',
	'.ifacebox',
	'.ifacebox-body',
	'.ifacebadge',
	'.alert-message',
	'.btn',
	'a.btn',
	'button',
	'input[type="button"]',
	'input[type="submit"]'
];

function usage() {
	console.log(`Usage: node scripts/cbi-component-audit.mjs [options]

Options:
  --host <ip>           Target host. Default: 10.10.10.148
  --user <user>         SSH user. Default: root
  --themes <list>       Comma-separated list. Default: bootstrap,argon,vitrawrt
  --output <dir>        Output directory. Default: audit-output/cbi-components
  --luci-user <user>    LuCI login user. Default: root
  --luci-password <pw>  LuCI password. Default: empty
  --browser <name>      chromium, webkit, or firefox. Default: chromium with WebKit fallback
  --headed              Run headed browser
  -h, --help            Show help`);
}

function fail(message) {
	console.error(`cbi-component-audit: ${message}`);
	process.exit(1);
}

function parseArgs(argv) {
	const args = {
		host: '10.10.10.148',
		user: 'root',
		themes: ['bootstrap', 'argon', 'vitrawrt'],
		output: path.join('audit-output', 'cbi-components'),
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
			fail(`unsupported theme "${theme}"`);
	}

	return args;
}

function normalizeHost(host) {
	return /^https?:\/\//.test(host) ? host.replace(/\/$/, '') : `http://${host}`;
}

function safeName(name) {
	return String(name).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'item';
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

	return ok.trim() === '0'
		? { available: true }
		: { available: false, reason: `${themeMedia[theme]} was not found on target` };
}

async function switchTheme(args, theme) {
	await ssh(args, `set -eu; uci set luci.main.mediaurlbase='${themeMedia[theme]}'; uci commit luci; /etc/init.d/uhttpd restart`, {
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
		return await import(fallback).catch(() => {
			console.error('Playwright is not available. Install with: npm install --prefix /tmp/vitrawrt-pw playwright');
			throw err;
		});
	}
}

async function launchBrowser(playwright, args, report) {
	const requested = playwright[args.browser];

	if (!requested)
		fail(`unsupported browser: ${args.browser}`);

	try {
		report.browserName = args.browser;
		return await requested.launch({ headless: !args.headed });
	}
	catch (err) {
		report.warnings.push({ message: `${args.browser} launch failed`, details: { message: err.message } });
		if (args.browser !== 'chromium' || !playwright.webkit)
			throw err;
		report.browserName = 'webkit';
		return await playwright.webkit.launch({ headless: !args.headed });
	}
}

async function waitForLuCIView(page) {
	await page.waitForLoadState('domcontentloaded').catch(() => {});
	await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
	await page.waitForFunction(() => {
		const view = document.querySelector('#view');
		if (!view)
			return true;
		const children = Array.from(view.children).filter((child) => child.nodeType === 1);
		return !(children.length === 1 && children[0].classList.contains('spinning'));
	}, null, { timeout: 16000 }).catch(() => {});
	await page.waitForTimeout(1800);
}

async function login(page, baseUrl, user, password) {
	await page.goto(`${baseUrl}/cgi-bin/luci/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
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
		await waitForLuCIView(page);
	}
}

async function gotoLuCI(page, baseUrl, requestPath) {
	const response = await page.goto(`${baseUrl}${requestPath}`, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch((err) => ({ error: err.message, status: () => 0 }));
	await waitForLuCIView(page);
	return response;
}

async function discoverVnstatPath(page, baseUrl) {
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

function componentMetricsScript(selectors) {
	function visible(node) {
		const style = getComputedStyle(node);
		const rect = node.getBoundingClientRect();
		return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
	}

	function rectOf(node) {
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

	function styleOf(node) {
		const style = getComputedStyle(node);
		return {
			display: style.display,
			position: style.position,
			visibility: style.visibility,
			opacity: style.opacity,
			pointerEvents: style.pointerEvents,
			width: style.width,
			minWidth: style.minWidth,
			maxWidth: style.maxWidth,
			whiteSpace: style.whiteSpace,
			overflow: style.overflow,
			flexDirection: style.flexDirection,
			backgroundColor: style.backgroundColor,
			borderTopWidth: style.borderTopWidth,
			borderRadius: style.borderRadius
		};
	}

	const main = document.querySelector('#maincontent') || document.body;
	const metrics = {
		url: location.href,
		title: document.title,
		bodyClass: document.body.className,
		main: {
			rect: rectOf(main),
			style: styleOf(main)
		},
		scroll: {
			width: document.documentElement.scrollWidth,
			viewportWidth: window.innerWidth,
			overflowsX: document.documentElement.scrollWidth > window.innerWidth + 2
		},
		components: {}
	};

	for (const selector of selectors) {
		const nodes = Array.from(document.querySelectorAll(`#maincontent ${selector}`));
		metrics.components[selector] = {
			count: nodes.length,
			visibleCount: nodes.filter(visible).length,
			samples: nodes.slice(0, 8).map((node, index) => ({
				index,
				tag: node.tagName.toLowerCase(),
				className: typeof node.className === 'string' ? node.className : '',
				text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 120),
				visible: visible(node),
				rect: rectOf(node),
				style: styleOf(node)
			}))
		};
	}

	return metrics;
}

async function auditPage(page, baseUrl, themeDir, pageInfo, report) {
	const response = await gotoLuCI(page, baseUrl, pageInfo.path);
	const status = response && typeof response.status === 'function' ? response.status() : 0;
	const metrics = await page.evaluate(componentMetricsScript, componentSelectors);
	const html = await page.content();

	await page.screenshot({ path: path.join(themeDir, `${pageInfo.name}.png`), fullPage: true }).catch(() => {});
	await page.screenshot({ path: path.join(themeDir, `${pageInfo.name}.viewport.png`), fullPage: false }).catch(() => {});
	await fs.writeFile(path.join(themeDir, `${pageInfo.name}.html`), html);
	await writeJson(path.join(themeDir, `${pageInfo.name}.metrics.json`), { status, ...metrics });

	report.pages[pageInfo.name] = {
		status,
		path: pageInfo.path,
		mainWidth: metrics.main.rect.width,
		overflowsX: metrics.scroll.overflowsX,
		componentCounts: Object.fromEntries(Object.entries(metrics.components).map(([selector, item]) => [selector, item.count]))
	};
}

async function clickTab(page, text) {
	const tab = page.locator('#maincontent .cbi-tabmenu a, #maincontent .tabs a').filter({ hasText: text }).first();
	if (await tab.count()) {
		await tab.click().catch(() => {});
		await page.waitForTimeout(650);
		return true;
	}
	return false;
}

async function auditSystemTabs(page, baseUrl, themeDir) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/system/system');
	const labels = ['General Settings', 'Logging', 'Time Synchronization', 'Language and Style'];
	const clicks = [];

	for (const label of labels) {
		const clicked = await clickTab(page, label);
		const state = await page.evaluate((labelText) => {
			const visible = (node) => {
				const style = getComputedStyle(node);
				const rect = node.getBoundingClientRect();
				return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
			};
			const panels = Array.from(document.querySelectorAll('#maincontent .cbi-section-node-tabbed > [data-tab][data-tab-active], #maincontent [data-tab][data-tab-active]'));
			const visiblePanels = panels.filter(visible);
			const inactiveVisible = panels.filter((node) => node.getAttribute('data-tab-active') === 'false' && visible(node));
			const active = document.querySelector('#maincontent .cbi-tab, #maincontent .tabs .active');
			return {
				label: labelText,
				clicked: false,
				activeText: active ? active.textContent.trim().replace(/\s+/g, ' ') : '',
				panelCount: panels.length,
				visiblePanelCount: visiblePanels.length,
				inactiveVisibleCount: inactiveVisible.length
			};
		}, label);

		state.clicked = clicked;
		clicks.push(state);
		await page.screenshot({ path: path.join(themeDir, `system-tab-${safeName(label)}.png`), fullPage: true }).catch(() => {});
	}

	return clicks;
}

async function auditDropdown(page, baseUrl, themeDir) {
	const candidates = [
		{ path: '/cgi-bin/luci/admin/system/system', tab: 'Language and Style' },
		{ path: '/cgi-bin/luci/admin/network/network', tab: '' },
		{ path: '/cgi-bin/luci/admin/network/firewall', tab: '' }
	];
	let visibleDropdownIndex = -1;
	let selectedCandidate = candidates[0];

	for (const candidate of candidates) {
		selectedCandidate = candidate;
		await gotoLuCI(page, baseUrl, candidate.path);
		if (candidate.tab)
			await clickTab(page, candidate.tab);
		visibleDropdownIndex = await page.locator('#maincontent .cbi-dropdown:not(.btn):not(.cbi-button)').evaluateAll((nodes) => {
			const visible = (node) => {
				const style = getComputedStyle(node);
				const rect = node.getBoundingClientRect();
				return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
			};
			return nodes.findIndex(visible);
		}).catch(() => -1);
		if (visibleDropdownIndex >= 0)
			break;
	}

	const before = await page.evaluate(() => {
		const visible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		};
		const visibleDropdown = Array.from(document.querySelectorAll('#maincontent .cbi-dropdown:not(.btn):not(.cbi-button)')).find((node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		});
		const dropdown = visibleDropdown || document.querySelector('#maincontent .cbi-dropdown:not(.btn):not(.cbi-button)');
		const select = document.querySelector('#maincontent select');
		const items = dropdown ? Array.from(dropdown.querySelectorAll('ul.dropdown > li')) : [];
		return {
			hasDropdown: Boolean(dropdown),
			hasSelect: Boolean(select),
			open: dropdown ? dropdown.hasAttribute('open') : false,
			visibleDropdownItems: items.filter(visible).length,
			dropdownRect: dropdown ? dropdown.getBoundingClientRect().toJSON() : null
		};
	});

	await page.screenshot({ path: path.join(themeDir, 'dropdown-before.png'), fullPage: true }).catch(() => {});
	const dropdown = page.locator('#maincontent .cbi-dropdown:not(.btn):not(.cbi-button)').nth(Math.max(0, visibleDropdownIndex));
	if (visibleDropdownIndex >= 0 && await dropdown.count()) {
		await dropdown.click().catch(() => {});
		await page.waitForTimeout(550);
	}
	await page.screenshot({ path: path.join(themeDir, 'dropdown-open.png'), fullPage: true }).catch(() => {});
	const afterOpen = await page.evaluate(() => {
		const visible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		};
		const dropdown = document.querySelector('#maincontent .cbi-dropdown');
		const items = dropdown ? Array.from(dropdown.querySelectorAll('ul.dropdown > li')) : [];
		return {
			open: dropdown ? dropdown.hasAttribute('open') : false,
			visibleDropdownItems: items.filter(visible).length
		};
	});

	await page.keyboard.press('Escape').catch(() => {});
	await page.waitForTimeout(300);
	const afterClose = await page.evaluate(() => {
		const visible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		};
		const dropdown = document.querySelector('#maincontent .cbi-dropdown');
		const items = dropdown ? Array.from(dropdown.querySelectorAll('ul.dropdown > li')) : [];
		return {
			open: dropdown ? dropdown.hasAttribute('open') : false,
			visibleDropdownItems: items.filter(visible).length
		};
	});

	return { page: selectedCandidate.path, before, afterOpen, afterClose };
}

async function auditDynlist(page, baseUrl, themeDir) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/system/system');
	await clickTab(page, 'Time Synchronization');
	await page.screenshot({ path: path.join(themeDir, 'dynlist-before.png'), fullPage: true }).catch(() => {});
	const before = await page.evaluate(() => {
		const visible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		};
		const dynlist = document.querySelector('#maincontent .cbi-dynlist');
		return {
			hasDynlist: Boolean(dynlist),
			items: dynlist ? dynlist.querySelectorAll('.item').length : 0,
			visibleItems: dynlist ? Array.from(dynlist.querySelectorAll('.item')).filter(visible).length : 0,
			addButtons: dynlist ? dynlist.querySelectorAll('.cbi-button-add, button').length : 0,
			removePseudo: dynlist ? getComputedStyle(dynlist.querySelector('.item') || dynlist, '::after').content : ''
		};
	});

	const add = page.locator('#maincontent .cbi-dynlist .cbi-button-add, #maincontent .cbi-dynlist > .add-item button').first();
	if (await add.count()) {
		await add.click().catch(() => {});
		await page.waitForTimeout(450);
	}
	await page.screenshot({ path: path.join(themeDir, 'dynlist-after-add.png'), fullPage: true }).catch(() => {});
	const afterAdd = await page.evaluate(() => {
		const dynlist = document.querySelector('#maincontent .cbi-dynlist');
		return {
			items: dynlist ? dynlist.querySelectorAll('.item').length : 0,
			addButtons: dynlist ? dynlist.querySelectorAll('.cbi-button-add, button').length : 0,
			inputs: dynlist ? dynlist.querySelectorAll('input').length : 0,
			removePseudo: dynlist ? getComputedStyle(dynlist.querySelector('.item') || dynlist, '::after').content : ''
		};
	});

	return { before, afterAdd };
}

async function auditApplyArea(page, baseUrl, themeDir) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/system/system');
	const collect = () => {
		const visible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		};
		return Array.from(document.querySelectorAll('#uci-apply, #applyreboot-section, #maincontent .uci-change-list, #maincontent .alert-message, #maincontent .cbi-page-actions'))
			.map((node) => ({
				selector: node.id ? `#${node.id}` : `.${Array.from(node.classList).join('.')}`,
				text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 120),
				visible: visible(node),
				display: getComputedStyle(node).display
			}));
	};
	const before = await page.evaluate(collect);
	await page.screenshot({ path: path.join(themeDir, 'apply-before.png'), fullPage: true }).catch(() => {});
	const input = page.locator('#maincontent input[type="text"]:not([readonly]):not([disabled])').first();
	if (await input.count()) {
		const original = await input.inputValue().catch(() => '');
		await input.fill(`${original} `).catch(() => {});
		await page.waitForTimeout(600);
	}
	const afterChange = await page.evaluate(collect);
	await page.screenshot({ path: path.join(themeDir, 'apply-after-change.png'), fullPage: true }).catch(() => {});
	return { before, afterChange };
}

async function auditIfaceboxHover(page, baseUrl, themeDir) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/status/overview');
	const targets = [
		{ name: 'ifacebox-stat', selector: '#maincontent .ifacebox .cbi-tooltip-container' },
		{ name: 'ifacebadge-network', selector: '#maincontent .ifacebadge .cbi-tooltip-container' }
	];
	const results = [];

	for (const target of targets) {
		const locator = page.locator(target.selector).first();
		if (!(await locator.count())) {
			results.push({ name: target.name, available: false });
			continue;
		}
		const owner = page.locator('#maincontent .ifacebox').first();
		const before = await owner.boundingBox().catch(() => null);
		await locator.hover().catch(() => {});
		await page.waitForTimeout(550);
		await page.screenshot({ path: path.join(themeDir, `${target.name}-hover.png`), fullPage: true }).catch(() => {});
		const after = await owner.boundingBox().catch(() => null);
		const tooltips = await page.evaluate(() => {
			const visible = (node) => {
				const style = getComputedStyle(node);
				const rect = node.getBoundingClientRect();
				return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
			};
			return Array.from(document.querySelectorAll('#maincontent .cbi-tooltip'))
				.filter(visible)
				.map((node) => {
					const rect = node.getBoundingClientRect();
					const style = getComputedStyle(node);
					return {
						text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 160),
						position: style.position,
						opacity: style.opacity,
						rect: {
							x: Math.round(rect.x),
							y: Math.round(rect.y),
							width: Math.round(rect.width),
							height: Math.round(rect.height)
						}
					};
				});
		});
		results.push({
			name: target.name,
			available: true,
			before,
			after,
			heightDelta: before && after ? Math.round(after.height - before.height) : null,
			tooltips
		});
	}

	return results;
}

async function auditSyslog(page, baseUrl, themeDir) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/status/logs/syslog');
	await page.screenshot({ path: path.join(themeDir, 'syslog-layout.png'), fullPage: true }).catch(() => {});
	return await page.evaluate(() => {
		const rect = (node) => {
			if (!node)
				return null;
			const r = node.getBoundingClientRect();
			return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
		};
		const main = document.querySelector('#maincontent');
		const log = document.querySelector('#maincontent #syslog, #maincontent pre, #maincontent textarea');
		const controls = Array.from(document.querySelectorAll('#maincontent form, #maincontent .control-group, #maincontent input, #maincontent select, #maincontent button')).slice(0, 20);
		return {
			main: rect(main),
			log: rect(log),
			controls: controls.map((node) => ({
				tag: node.tagName.toLowerCase(),
				className: typeof node.className === 'string' ? node.className : '',
				text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
				rect: rect(node),
				display: getComputedStyle(node).display
			}))
		};
	});
}

async function auditStartup(page, baseUrl, themeDir) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/system/startup');
	await page.screenshot({ path: path.join(themeDir, 'startup-layout.png'), fullPage: true }).catch(() => {});
	return await page.evaluate(() => {
		const rect = (node) => {
			if (!node)
				return null;
			const r = node.getBoundingClientRect();
			return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
		};
		const main = document.querySelector('#maincontent');
		const tables = Array.from(document.querySelectorAll('#maincontent table, #maincontent .table')).map(rect);
		const buttons = Array.from(document.querySelectorAll('#maincontent .btn, #maincontent .cbi-button, #maincontent button'))
			.filter((node) => {
				const style = getComputedStyle(node);
				const r = node.getBoundingClientRect();
				return style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
			})
			.slice(0, 40)
			.map((node) => ({ text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 80), rect: rect(node), display: getComputedStyle(node).display }));
		let rowPairs = 0;
		for (let i = 0; i < buttons.length; i++) {
			for (let j = i + 1; j < buttons.length; j++) {
				if (Math.abs(buttons[i].rect.y - buttons[j].rect.y) <= 12 && Math.abs(buttons[i].rect.x - buttons[j].rect.x) > 8)
					rowPairs++;
			}
		}
		return { main: rect(main), tables, buttons, rowPairs };
	});
}

async function auditVnstat(page, baseUrl, themeDir, vnstatPath) {
	if (!vnstatPath)
		return { available: false };
	await gotoLuCI(page, baseUrl, vnstatPath);
	await page.screenshot({ path: path.join(themeDir, 'vnstat-layout.png'), fullPage: true }).catch(() => {});
	return await page.evaluate(() => {
		const visible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		};
		const tabMenus = Array.from(document.querySelectorAll('#maincontent .tabs, #maincontent .cbi-tabmenu')).map((menu) => {
			const links = Array.from(menu.querySelectorAll('a, button')).filter(visible).map((link) => {
				const rect = link.getBoundingClientRect();
				return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height), text: link.textContent.trim().replace(/\s+/g, ' ') };
			});
			const rows = new Set(links.map((link) => Math.round(link.y / 12) * 12));
			const cols = new Set(links.map((link) => Math.round(link.x / 12) * 12));
			return { links, direction: links.length <= 1 ? 'single' : (rows.size <= Math.max(1, Math.ceil(links.length / 4)) ? 'horizontal-or-wrapped' : (cols.size <= 2 ? 'vertical' : 'mixed')) };
		});
		const inactiveVisible = Array.from(document.querySelectorAll('#maincontent [data-tab][data-tab-active="false"], #maincontent .tab-pane:not(.active)')).filter(visible).length;
		return {
			path: location.pathname,
			tabMenus,
			inactiveVisible,
			media: Array.from(document.querySelectorAll('#maincontent img, #maincontent canvas, #maincontent svg')).map((node) => {
				const rect = node.getBoundingClientRect();
				return { tag: node.tagName.toLowerCase(), width: Math.round(rect.width), height: Math.round(rect.height) };
			})
		};
	});
}

async function auditTheme(args, browser, baseUrl, theme, outputDir, report) {
	const themeReport = {
		name: theme,
		available: true,
		skipReason: '',
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
	themeReport.appliedMediaurlbase = await mediaurlbase(args);
	const themeDir = path.join(outputDir, theme);
	await ensureDir(themeDir);

	const context = await browser.newContext({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1, ignoreHTTPSErrors: true });
	const page = await context.newPage();
	const consoleErrors = [];
	const pageErrors = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error')
			consoleErrors.push({ type: msg.type(), text: msg.text() });
	});
	page.on('pageerror', (err) => pageErrors.push({ message: err.message }));

	try {
		await login(page, baseUrl, args.luciUser, args.luciPassword);
		const vnstatPath = await discoverVnstatPath(page, baseUrl);
		const allPages = vnstatPath ? [...pages, { name: 'vnstat', path: vnstatPath }] : pages;
		themeReport.vnstatPath = vnstatPath;

		for (const pageInfo of allPages)
			await auditPage(page, baseUrl, themeDir, pageInfo, themeReport);

		themeReport.behavior.systemTabs = await auditSystemTabs(page, baseUrl, themeDir);
		themeReport.behavior.dropdown = await auditDropdown(page, baseUrl, themeDir);
		themeReport.behavior.dynlist = await auditDynlist(page, baseUrl, themeDir);
		themeReport.behavior.applyArea = await auditApplyArea(page, baseUrl, themeDir);
		themeReport.behavior.ifaceboxHover = await auditIfaceboxHover(page, baseUrl, themeDir);
		themeReport.behavior.syslog = await auditSyslog(page, baseUrl, themeDir);
		themeReport.behavior.startup = await auditStartup(page, baseUrl, themeDir);
		themeReport.behavior.vnstat = await auditVnstat(page, baseUrl, themeDir, vnstatPath);
		themeReport.consoleErrors = consoleErrors;
		themeReport.pageErrors = pageErrors;
	}
	finally {
		await context.close();
	}

	report.themes[theme] = themeReport;
	await writeJson(path.join(themeDir, 'theme-summary.json'), themeReport);
}

function summarizeTheme(theme) {
	if (!theme || !theme.available)
		return `- ${theme?.name || 'theme'}: skipped (${theme?.skipReason || 'unavailable'})`;
	const verticalVnstat = theme.behavior.vnstat?.tabMenus?.filter((menu) => menu.direction === 'vertical').length || 0;
	const syslogMain = theme.behavior.syslog?.main?.width || 0;
	const syslogLog = theme.behavior.syslog?.log?.width || 0;
	const startupMain = theme.behavior.startup?.main?.width || 0;
	const startupTable = Math.max(0, ...(theme.behavior.startup?.tables || []).map((item) => item.width || 0));
	const dropdown = theme.behavior.dropdown || {};
	const dynlist = theme.behavior.dynlist || {};
	const floatingTooltips = (theme.behavior.ifaceboxHover || []).flatMap((item) => item.tooltips || []).filter((tip) => tip.position === 'absolute' || tip.position === 'fixed').length;
	return [
		`- ${theme.name}: audited ${Object.keys(theme.pages).length} pages.`,
		`  dropdown before/open/close visible items: ${dropdown.before?.visibleDropdownItems ?? 'n/a'} / ${dropdown.afterOpen?.visibleDropdownItems ?? 'n/a'} / ${dropdown.afterClose?.visibleDropdownItems ?? 'n/a'}.`,
		`  dynlist items/add buttons: ${dynlist.before?.items ?? 'n/a'} / ${dynlist.before?.addButtons ?? 'n/a'}.`,
		`  ifacebox floating tooltip count: ${floatingTooltips}.`,
		`  syslog width: log=${syslogLog}px main=${syslogMain}px.`,
		`  startup widest table=${startupTable}px main=${startupMain}px rowPairs=${theme.behavior.startup?.rowPairs ?? 'n/a'}.`,
		`  vnStat vertical tab menus: ${verticalVnstat}.`
	].join('\n');
}

async function writeMarkdown(outputDir, report) {
	const md = `# CBI Component Audit

Generated: ${report.finishedAt || report.startedAt}

Target: ${report.host}

Original mediaurlbase: \`${report.originalMediaurlbase}\`

Restored mediaurlbase: \`${report.restoredMediaurlbase || 'unknown'}\`

## Summary

${Object.values(report.themes).map(summarizeTheme).join('\n\n')}

## Focus Areas

- CBI dropdown: options should be hidden before open, visible when open, hidden after close.
- CBI dynlist: existing items, add control, and remove affordance must remain present.
- Apply area: theme must not force apply/reboot or modal areas visible.
- ifacebox hover: statistic and network hover details should remain floating overlays.
- syslog: filter controls and log output should use the available main width.
- startup: table and action buttons should follow native horizontal flow.
- vnStat: tabs and tab panels should remain controlled by the plugin/native LuCI logic.

## Raw Artifacts

- Output root: ${path.relative(process.cwd(), outputDir)}
- JSON summary: ${path.relative(process.cwd(), path.join(outputDir, 'summary.json'))}
`;

	await fs.writeFile(path.join(outputDir, 'report.md'), md);
	await fs.writeFile(path.join('docs', 'CBI_COMPONENT_AUDIT.md'), md);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const baseUrl = normalizeHost(args.host);
	const outputDir = args.output;
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
	await ensureDir('docs');
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
				report.warnings.push({ message: 'failed to restore original theme', details: { message: err.message } });
			});
			report.restoredMediaurlbase = await mediaurlbase(args).catch(() => '');
		}
	}

	report.finishedAt = new Date().toISOString();
	await writeJson(path.join(outputDir, 'summary.json'), report);
	await writeMarkdown(outputDir, report);

	console.log(`CBI component audit output: ${outputDir}`);
	console.log('Report: docs/CBI_COMPONENT_AUDIT.md');
	for (const theme of args.themes) {
		const themeReport = report.themes[theme];
		console.log(`${theme}: ${themeReport?.available ? 'audited' : `skipped (${themeReport?.skipReason || 'unavailable'})`}`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
