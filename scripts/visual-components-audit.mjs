#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { spawnSync } from 'child_process';

function usage() {
	console.log(`Usage: node scripts/visual-components-audit.mjs [options]

Options:
  --host <ip>           Target host. Default: 10.10.10.148
  --luci-user <user>    LuCI login user. Default: root
  --luci-password <pw>  LuCI password. Default: empty
  --output-dir <dir>    Output directory. Default: audit-output/visual-components-1.12A/<timestamp>
  --browser <name>      chromium, webkit, or firefox. Default: webkit
  --headed              Run headed browser
  -h, --help            Show help`);
}

function fail(message) {
	console.error(`visual-components-audit: ${message}`);
	process.exit(1);
}

function parseArgs(argv) {
	const args = {
		host: '10.10.10.148',
		luciUser: 'root',
		luciPassword: '',
		outputDir: '',
		browser: 'webkit',
		headed: false
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];

		if (arg === '--host')
			args.host = argv[++i] || fail('--host requires a value');
		else if (arg === '--luci-user')
			args.luciUser = argv[++i] || fail('--luci-user requires a value');
		else if (arg === '--luci-password')
			args.luciPassword = argv[++i] ?? '';
		else if (arg === '--output-dir')
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

function normalizeHost(host) {
	return /^https?:\/\//.test(host) ? host.replace(/\/$/, '') : `http://${host}`;
}

function safeName(value) {
	return String(value || 'page').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'page';
}

async function ensureDir(dir) {
	await fs.mkdir(dir, { recursive: true });
}

async function writeJson(file, data) {
	await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

async function launchBrowser(playwright, args) {
	const requested = playwright[args.browser] || fail(`unsupported browser: ${args.browser}`);
	const options = { headless: !args.headed };

	if (args.browser === 'chromium')
		options.args = ['--single-process', '--no-zygote', '--disable-gpu', '--disable-dev-shm-usage'];

	try {
		const browser = await requested.launch(options);
		try {
			const probe = await browser.newPage();
			await probe.close();
			return browser;
		}
		catch (err) {
			await browser.close().catch(() => {});
			throw err;
		}
	}
	catch (err) {
		if (args.browser !== 'chromium' || !playwright.webkit)
			throw err;

		console.warn(`visual-components-audit: chromium launch failed, falling back to webkit: ${err.message}`);
		return await playwright.webkit.launch({ headless: !args.headed });
	}
}

async function newPage(browser, viewport, themeMode) {
	const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
	await page.addInitScript((mode) => {
		try {
			localStorage.setItem('vitrawrt.theme', mode);
			localStorage.setItem('vitrawrt.glass', 'auto');
		}
		catch (e) {}
	}, themeMode);
	return page;
}

async function waitForLuCIView(page) {
	await page.waitForLoadState('domcontentloaded').catch(() => {});
	await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
	await page.waitForFunction(() => {
		const view = document.querySelector('#view');
		if (!view)
			return true;
		const children = Array.from(view.children).filter((child) => child.nodeType === 1);
		return !(children.length === 1 && children[0].classList.contains('spinning'));
	}, null, { timeout: 15000 }).catch(() => {});
	await page.waitForTimeout(900);
}

async function login(page, baseUrl, user, password) {
	await page.goto(`${baseUrl}/cgi-bin/luci/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
	const username = page.locator('input[name="luci_username"], input#luci_username').first();
	const passwordInput = page.locator('input[name="luci_password"], input#luci_password, input[type="password"]').first();

	if (await username.count()) {
		await username.fill(user);
		if (await passwordInput.count())
			await passwordInput.fill(password);
		const submit = page.locator('button[type="submit"], input[type="submit"], .vwrt-auth-submit').first();
		if (await submit.count())
			await submit.click();
		else
			await page.keyboard.press('Enter');
	}

	await waitForLuCIView(page);
}

async function screenshot(page, file, fullPage = true) {
	await page.screenshot({ path: file, fullPage }).catch(() => {});
}

async function screenshotLocator(page, selector, file) {
	const locator = page.locator(selector).first();
	if (await locator.count())
		await locator.screenshot({ path: file }).catch(() => {});
}

async function collectSourceSafety() {
	const js = spawnSync(process.execPath, [path.join('scripts', 'check-js-safety.mjs')], { encoding: 'utf8' });
	const css = spawnSync(process.execPath, [path.join('scripts', 'check-css-safety.mjs')], { encoding: 'utf8' });
	return {
		js: { status: js.status, stdout: js.stdout, stderr: js.stderr },
		css: { status: css.status, stdout: css.stdout, stderr: css.stderr },
		fakeClick: /(?:\.click\s*\(|dispatchEvent|MouseEvent|recoverFirstLoadTabs|initNativeTabsOnce)/.test(js.stdout + js.stderr) && js.status !== 0,
		globalTableNormalize: /global table|table-layout:fixed|white-space:nowrap|display:block/.test(css.stdout + css.stderr) && css.status !== 0
	};
}

async function collectPageMetrics(page) {
	return await page.evaluate(() => {
		const rect = (node) => {
			if (!node)
				return null;
			const r = node.getBoundingClientRect();
			return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) };
		};
		const visible = (node) => {
			const style = getComputedStyle(node);
			const r = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
		};
		const styleOf = (node) => {
			if (!node)
				return null;
			const style = getComputedStyle(node);
			return {
				color: style.color,
				background: style.backgroundColor,
				border: style.borderColor,
				borderRadius: style.borderRadius,
				boxShadow: style.boxShadow,
				display: style.display,
				visibility: style.visibility
			};
		};
		const main = document.querySelector('#maincontent');
		const sidebar = document.querySelector('#vwrt-sidebar');
		const modal = Array.from(document.querySelectorAll('.modal, .modal-dialog, .cbi-modal, [role="dialog"], .ui-dialog, .dialog')).find(visible);
		const tabs = Array.from(document.querySelectorAll('#maincontent .tabs, #maincontent .cbi-tabmenu, #tabmenu .tabs, #tabmenu .cbi-tabmenu')).filter(visible);
		const inputs = Array.from(document.querySelectorAll('#maincontent input, #maincontent select, #maincontent textarea')).filter(visible);
		const progress = Array.from(document.querySelectorAll('#maincontent .cbi-progressbar, #maincontent .progressbar, #maincontent .progress, #maincontent progress')).filter(visible);
		const iface = Array.from(document.querySelectorAll('#maincontent .ifacebox, #maincontent .network-status-table')).filter(visible);
		const buttons = Array.from(document.querySelectorAll('#maincontent .btn, #maincontent .cbi-button, #maincontent button, #maincontent input[type="submit"], #maincontent input[type="button"]')).filter(visible);
		const applyArea = Array.from(document.querySelectorAll('#maincontent .cbi-page-actions, #maincontent #applyreboot-section, #maincontent #uci-apply')).filter(visible);
		const spinning = Array.from(document.querySelectorAll('.spinning, #view > .spinning')).filter(visible);

		return {
			url: location.href,
			bodyClasses: document.body ? document.body.className : '',
			theme: document.documentElement.getAttribute('data-theme') || '',
			main: rect(main),
			sidebar: rect(sidebar),
			sidebarExpandedGroups: Array.from(document.querySelectorAll('#vitrawrt-sidebar-menu > .vwrt-menu.l1 > li')).filter((node) => node.classList.contains('expanded') || node.classList.contains('active') || node.classList.contains('selected')).length,
			horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 8,
			tabs: tabs.map((node) => ({ rect: rect(node), style: styleOf(node), text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 120) })).slice(0, 8),
			inputs: inputs.map((node) => ({ tag: node.tagName.toLowerCase(), type: node.getAttribute('type') || '', rect: rect(node), style: styleOf(node) })).slice(0, 12),
			progress: progress.map((node) => ({ rect: rect(node), style: styleOf(node), text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 80) })).slice(0, 12),
			iface: iface.map((node) => ({ rect: rect(node), style: styleOf(node), text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 120) })).slice(0, 8),
			buttons: buttons.map((node) => ({ text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 60), rect: rect(node), style: styleOf(node) })).slice(0, 16),
			applyArea: applyArea.map((node) => ({ rect: rect(node), style: styleOf(node), text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 120) })),
			modal: modal ? { rect: rect(modal), style: styleOf(modal), text: modal.textContent.trim().replace(/\s+/g, ' ').slice(0, 160) } : null,
			spinning: spinning.map((node) => ({ rect: rect(node), style: styleOf(node), text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 120) })),
			viewport: { width: window.innerWidth, height: window.innerHeight }
		};
	});
}

async function captureCollapsedSidebar(page, outputDir, mode, metrics) {
	await page.evaluate(() => document.documentElement.classList.add('vwrt-sidebar-collapsed'));
	await page.waitForTimeout(400);
	await screenshotLocator(page, '#vwrt-sidebar', path.join(outputDir, `${mode}-sidebar-collapsed.png`));

	const link = page.locator('#vitrawrt-sidebar-menu > .vwrt-menu.l1 > li > .vwrt-menu-row a[data-vwrt-tooltip]').first();
	const collapsed = {
		available: await link.count(),
		tooltip: null,
		links: await page.evaluate(() => {
			const visible = (node) => {
				const style = getComputedStyle(node);
				const rect = node.getBoundingClientRect();
				return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
			};
			return Array.from(document.querySelectorAll('#vitrawrt-sidebar-menu > .vwrt-menu.l1 > li > .vwrt-menu-row a')).slice(0, 12).map((node) => ({
				text: node.textContent.trim().replace(/\s+/g, ' '),
				tooltip: node.getAttribute('data-vwrt-tooltip') || '',
				ariaLabel: node.getAttribute('aria-label') || '',
				iconVisible: node.querySelector('.vwrt-menu-icon') ? visible(node.querySelector('.vwrt-menu-icon')) : false,
				labelVisible: node.querySelector('.vwrt-menu-label') ? visible(node.querySelector('.vwrt-menu-label')) : false
			}));
		})
	};
	collapsed.controls = await page.evaluate(() => {
		const sidebar = document.querySelector('#vwrt-sidebar');
		const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;
		return {
			sidebar: sidebarRect ? { x: Math.round(sidebarRect.x), width: Math.round(sidebarRect.width), right: Math.round(sidebarRect.right) } : null,
			buttons: Array.from(document.querySelectorAll('#vwrt-sidebar .vwrt-sidebar-action-row > button')).map((button) => {
				const rect = button.getBoundingClientRect();
				const before = getComputedStyle(button, '::before');
				return {
					text: button.textContent.trim().replace(/\s+/g, ' '),
					ariaLabel: button.getAttribute('aria-label') || '',
					tooltip: button.getAttribute('data-vwrt-control-tooltip') || '',
					width: Math.round(rect.width),
					height: Math.round(rect.height),
					x: Math.round(rect.x),
					right: Math.round(rect.right),
					centerX: Math.round(rect.x + rect.width / 2),
					mask: before.webkitMaskImage || before.maskImage || '',
					color: getComputedStyle(button).color
				};
			})
		};
	});

	if (collapsed.available) {
		await link.hover().catch(() => {});
		await page.waitForTimeout(350);
		collapsed.tooltip = await link.evaluate((node) => {
			const style = getComputedStyle(node, '::after');
			return {
				content: style.content.replace(/^"|"$/g, ''),
				visibility: style.visibility,
				opacity: Number.parseFloat(style.opacity || '0'),
				color: style.color,
				background: style.backgroundColor
			};
		});
		await screenshot(page, path.join(outputDir, `${mode}-sidebar-collapsed-tooltip.png`), false);
	}

	const control = page.locator('#vwrt-sidebar .vwrt-sidebar-actions button[data-vwrt-control-tooltip]').first();
	if (await control.count()) {
		await control.hover().catch(() => {});
		await page.waitForTimeout(350);
		collapsed.controlTooltip = await control.evaluate((node) => {
			const style = getComputedStyle(node, '::after');
			return {
				content: style.content.replace(/^"|"$/g, ''),
				visibility: style.visibility,
				opacity: Number.parseFloat(style.opacity || '0'),
				color: style.color,
				background: style.backgroundColor
			};
		});
		await screenshot(page, path.join(outputDir, `${mode}-sidebar-collapsed-control-tooltip.png`), false);
	}

	metrics.sidebarCollapsed = collapsed;
	await page.evaluate(() => document.documentElement.classList.remove('vwrt-sidebar-collapsed'));
}

async function openNetworkModal(page, outputDir, prefix) {
	let edit = page.locator('#maincontent a, #maincontent button')
		.filter({ hasText: /^(Edit|编辑)$/i })
		.first();

	if (!(await edit.count())) {
		edit = page.locator('#maincontent table a, #maincontent table button, #maincontent .table a, #maincontent .table button')
			.filter({ hasText: /Edit|Configure|编辑|配置/i })
			.first();
	}

	if (!(await edit.count())) {
		edit = page.locator('#maincontent a, #maincontent button')
			.filter({ hasText: /Edit|Configure|编辑|配置/i })
			.filter({ hasNotText: /password|密码/i })
			.first();
	}

	if (!(await edit.count()))
		return null;

	await edit.click().catch(() => {});
	await page.waitForTimeout(1000);
	await screenshot(page, path.join(outputDir, `${prefix}-modal-open.png`));
	const metrics = await collectPageMetrics(page);

	const close = page.locator('.modal button, .modal a, .cbi-modal button, .cbi-modal a, [role="dialog"] button, [role="dialog"] a')
		.filter({ hasText: /Close|Cancel|Dismiss|关闭|取消|×/i })
		.first();
	if (await close.count()) {
		await close.click().catch(() => {});
		await page.waitForTimeout(500);
		await screenshot(page, path.join(outputDir, `${prefix}-modal-closed.png`));
	}

	return metrics;
}

async function capturePage(browser, baseUrl, args, outputDir, pageDef, mode, viewport) {
	const page = await newPage(browser, viewport, mode);
	const item = {
		page: pageDef.name,
		mode,
		viewport,
		path: pageDef.path,
		screenshots: {},
		metrics: null,
		skipped: false,
		error: ''
	};

	try {
		await login(page, baseUrl, args.luciUser, args.luciPassword);
		await page.goto(`${baseUrl}${pageDef.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
		await waitForLuCIView(page);

		const shot = path.join(outputDir, `${mode}-${pageDef.name}-${viewport.width}x${viewport.height}.png`);
		await screenshot(page, shot);
		item.screenshots.full = shot;
		item.metrics = await collectPageMetrics(page);

		if (pageDef.name === 'status-overview') {
			await screenshotLocator(page, '#vwrt-sidebar', path.join(outputDir, `${mode}-sidebar-expanded.png`));
			await screenshotLocator(page, '#maincontent .cbi-progressbar, #maincontent .progressbar, #maincontent .progress, #maincontent progress', path.join(outputDir, `${mode}-overview-progress.png`));
			await screenshotLocator(page, '#maincontent .ifacebox, #maincontent .network-status-table', path.join(outputDir, `${mode}-overview-status-card.png`));
			await captureCollapsedSidebar(page, outputDir, mode, item.metrics);
		}

		if (pageDef.name === 'network-network')
			item.metrics.modalAfterOpen = await openNetworkModal(page, outputDir, `${mode}-network-edit`);

		if (pageDef.name === 'system-system') {
			await screenshotLocator(page, '#tabmenu, #maincontent .tabs, #maincontent .cbi-tabmenu', path.join(outputDir, `${mode}-tabs-system.png`));
			await screenshotLocator(page, '#maincontent input, #maincontent select, #maincontent textarea', path.join(outputDir, `${mode}-form-control.png`));
			const firstInput = page.locator('#maincontent input[type="text"], #maincontent textarea').first();
			if (await firstInput.count()) {
				await firstInput.fill(`${await firstInput.inputValue().catch(() => '')} `).catch(() => {});
				await page.waitForTimeout(700);
				await screenshotLocator(page, '#maincontent .cbi-page-actions, #maincontent #applyreboot-section, #maincontent #uci-apply', path.join(outputDir, `${mode}-apply-area.png`));
			}
		}

		await writeJson(path.join(outputDir, `${mode}-${pageDef.name}-${viewport.width}x${viewport.height}.metrics.json`), item.metrics);
	}
	catch (err) {
		item.error = err.message;
		item.skipped = true;
	}
	finally {
		await page.close();
	}

	return item;
}

async function captureLogin(browser, baseUrl, outputDir, mode, viewport) {
	const page = await newPage(browser, viewport, mode);
	const file = path.join(outputDir, `login-${mode}-${viewport.width}x${viewport.height}.png`);
	await page.goto(`${baseUrl}/cgi-bin/luci/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
	await page.waitForTimeout(900);
	await screenshot(page, file);
	const metrics = await page.evaluate(() => {
		const rect = (node) => {
			if (!node)
				return null;
			const r = node.getBoundingClientRect();
			return { width: Math.round(r.width), height: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) };
		};
		const card = document.querySelector('.vwrt-auth-card');
		const logo = document.querySelector('.vwrt-auth-logo, .vwrt-auth-brand img');
		const button = document.querySelector('.vwrt-auth-submit, button[type="submit"], input[type="submit"]');
		const style = button ? getComputedStyle(button) : null;
		return {
			card: rect(card),
			logo: rect(logo),
			buttonBackground: style ? style.backgroundColor : '',
			inputs: Array.from(document.querySelectorAll('input[name="luci_username"], input[name="luci_password"], input[type="password"]')).length,
			horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 8
		};
	});
	await writeJson(path.join(outputDir, `login-${mode}-${viewport.width}x${viewport.height}.metrics.json`), metrics);
	await page.close();
	return { mode, viewport, screenshot: file, metrics };
}

async function writeReport(outputDir, report) {
	const lines = [
		'# Visual Components 1.12A Audit',
		'',
		`Output: ${outputDir}`,
		'',
		'## Source Safety',
		`- check-js-safety status: ${report.sourceSafety.js.status}`,
		`- check-css-safety status: ${report.sourceSafety.css.status}`,
		`- fake click detected: ${report.sourceSafety.fakeClick ? 'yes' : 'no'}`,
		`- global table normalize detected: ${report.sourceSafety.globalTableNormalize ? 'yes' : 'no'}`,
		'',
		'## Login',
		...report.login.map((item) => `- ${item.mode} ${item.viewport.width}x${item.viewport.height}: ${item.screenshot} logo=${JSON.stringify(item.metrics.logo)} button=${item.metrics.buttonBackground}`),
		'',
		'## Native Pages',
		...report.pages.map((item) => [
			`- ${item.mode} ${item.page} ${item.viewport.width}x${item.viewport.height}: ${item.screenshots.full || 'n/a'}`,
			`  - overflow: ${item.metrics ? item.metrics.horizontalOverflow : 'n/a'}`,
			`  - sidebar expanded groups: ${item.metrics ? item.metrics.sidebarExpandedGroups : 'n/a'}`,
			item.metrics && item.metrics.sidebarCollapsed ? `  - collapsed tooltip: ${JSON.stringify(item.metrics.sidebarCollapsed.tooltip)}` : '',
			item.metrics && item.metrics.sidebarCollapsed ? `  - collapsed controls: ${JSON.stringify(item.metrics.sidebarCollapsed.controls)}` : '',
			item.metrics && item.metrics.tabs ? `  - tabs: ${item.metrics.tabs.length}` : '',
			item.metrics && item.metrics.progress ? `  - progress: ${item.metrics.progress.length}` : '',
			item.metrics && item.metrics.iface ? `  - status cards: ${item.metrics.iface.length}` : '',
			item.metrics && item.metrics.modalAfterOpen ? `  - modal opened: ${Boolean(item.metrics.modalAfterOpen.modal)}` : ''
		].filter(Boolean).join('\n')),
		'',
		'## Notes',
		'- Stage 1.12A is visual-only: it does not implement dashboard, rpcd, service data, or fake tab recovery.',
		'- vnStat2/network first-load tab behavior remains documented as an app/plugin compatibility limitation when observed; this audit does not hide it with simulated interactions.',
		'- Table layout fixes remain page-scoped and are not introduced by this visual component pass.'
	];

	await fs.writeFile(path.join('docs', 'VISUAL_COMPONENTS_1_12A.md'), `${lines.join('\n')}\n`);
	await writeJson(path.join(outputDir, 'report.json'), report);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const playwright = await loadPlaywright();
	const baseUrl = normalizeHost(args.host);
	const outputDir = args.outputDir || path.join('audit-output', 'visual-components-1.12A', stamp());
	const viewports = [
		{ width: 1920, height: 1080 },
		{ width: 390, height: 844 }
	];
	const pages = [
		{ name: 'status-overview', path: '/cgi-bin/luci/admin/status/overview' },
		{ name: 'network-network', path: '/cgi-bin/luci/admin/network/network' },
		{ name: 'system-system', path: '/cgi-bin/luci/admin/system/system' },
		{ name: 'syslog', path: '/cgi-bin/luci/admin/status/syslog' },
		{ name: 'processes', path: '/cgi-bin/luci/admin/status/processes' },
		{ name: 'packages', path: '/cgi-bin/luci/admin/system/package-manager' },
		{ name: 'vnstat2', path: '/cgi-bin/luci/admin/status/vnstat2' }
	];
	const modes = ['light', 'dark'];
	const report = {
		baseUrl,
		startedAt: new Date().toISOString(),
		sourceSafety: await collectSourceSafety(),
		login: [],
		pages: []
	};

	await ensureDir(outputDir);

	const browser = await launchBrowser(playwright, args);

	try {
		for (const mode of modes) {
			for (const viewport of viewports)
				report.login.push(await captureLogin(browser, baseUrl, outputDir, mode, viewport));

			for (const pageDef of pages)
				report.pages.push(await capturePage(browser, baseUrl, args, outputDir, pageDef, mode, viewports[0]));
		}
	}
	finally {
		report.finishedAt = new Date().toISOString();
		await browser.close();
	}

	await writeReport(outputDir, report);
	console.log(`Visual components audit output: ${outputDir}`);
	console.log('Markdown: docs/VISUAL_COMPONENTS_1_12A.md');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
