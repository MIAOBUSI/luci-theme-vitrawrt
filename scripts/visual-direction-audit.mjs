#!/usr/bin/env node

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import process from 'process';
import { spawnSync } from 'child_process';

function usage() {
	console.log(`Usage: node scripts/visual-direction-audit.mjs [options]

Options:
  --host <ip>           Target host. Default: 10.10.10.148
  --luci-user <user>    LuCI login user. Default: root
  --luci-password <pw>  LuCI password. Default: empty
  --output-dir <dir>    Output directory. Default: audit-output/visual-direction-1.24B/<timestamp>
  --browser <name>      chromium, webkit, or firefox. Default: chromium
  --headed              Run headed browser
  -h, --help            Show help`);
}

function fail(message) {
	console.error(`visual-direction-audit: ${message}`);
	process.exit(1);
}

function parseArgs(argv) {
	const args = {
		host: '10.10.10.148',
		luciUser: 'root',
		luciPassword: '',
		outputDir: '',
		browser: 'chromium',
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
		return await import(fallback);
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

async function ensureDir(dir) {
	await fs.mkdir(dir, { recursive: true });
}

async function writeJson(file, data) {
	await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

async function softTimeout(promise, ms, fallback = null) {
	let timeout;
	try {
		return await Promise.race([
			promise,
			new Promise((resolve) => {
				timeout = setTimeout(() => resolve(fallback), ms);
			})
		]);
	}
	finally {
		clearTimeout(timeout);
	}
}

async function launchBrowser(playwright, args) {
	const requested = playwright[args.browser] || fail(`unsupported browser: ${args.browser}`);
	const options = { headless: !args.headed };

	if (args.browser === 'chromium' && process.platform !== 'darwin')
		options.args = ['--single-process', '--no-zygote', '--disable-gpu', '--disable-dev-shm-usage'];

	try {
		return await requested.launch(options);
	}
	catch (err) {
		if (args.browser !== 'chromium' || !playwright.webkit)
			throw err;
		console.warn(`visual-direction-audit: chromium launch failed, falling back to webkit: ${err.message}`);
		return await playwright.webkit.launch({ headless: !args.headed });
	}
}

async function newPage(browser, viewport, mode) {
	const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
	page.setDefaultTimeout(12000);
	page.setDefaultNavigationTimeout(22000);
	await page.addInitScript((theme) => {
		try {
			localStorage.setItem('vitrawrt.theme', theme);
			localStorage.setItem('vitrawrt.glass', 'auto');
			localStorage.setItem('vitrawrt.sidebar.collapsed', '0');
		}
		catch (e) {}
	}, mode);
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

async function waitForTabVisualSettle(page) {
	await page.waitForLoadState('domcontentloaded', { timeout: 2500 }).catch(() => {});
	await page.waitForFunction(() => {
		const view = document.querySelector('#view');
		if (!view)
			return true;
		const spinner = view.querySelector('.spinning');
		return !spinner || getComputedStyle(spinner).display === 'none';
	}, null, { timeout: 2500 }).catch(() => {});
	await page.waitForTimeout(350);
}

async function login(page, baseUrl, user, password) {
	await softTimeout(page.goto(`${baseUrl}/cgi-bin/luci/`, { waitUntil: 'domcontentloaded', timeout: 22000 }).catch(() => {}), 24000);
	const username = page.locator('input[name="luci_username"], input#luci_username').first();
	const passwordInput = page.locator('input[name="luci_password"], input#luci_password, input[type="password"]').first();

	if (await username.count()) {
		await username.fill(user);
		if (await passwordInput.count())
			await passwordInput.fill(password);
		const submit = page.locator('button[type="submit"], input[type="submit"], .vwrt-auth-submit').first();
		if (await submit.count()) {
			const submitted = await softTimeout(
				submit.click({ timeout: 5000, noWaitAfter: true }).then(() => true).catch(() => false),
				6500,
				false
			);
			if (!submitted)
				await page.keyboard.press('Enter').catch(() => {});
		}
		else
			await page.keyboard.press('Enter');
	}

	await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
	await page.waitForTimeout(700);
	await waitForLuCIView(page);

	const stillOnLogin = await page.locator('input[name="luci_username"], input#luci_username').first().isVisible().catch(() => false);
	if (stillOnLogin)
		throw new Error('login form still visible after bounded login attempt');
}

async function screenshot(page, file, fullPage = true) {
	await softTimeout(page.screenshot({ path: file, fullPage }).catch(() => {}), 8000);
}

async function screenshotLocator(page, selector, file) {
	const locator = page.locator(selector).first();
	if (await locator.count())
		await softTimeout(locator.screenshot({ path: file }).catch(() => {}), 8000);
}

async function loginFormVisible(page) {
	return await page.locator('input[name="luci_username"], input#luci_username').first().isVisible().catch(() => false);
}

function sourceSafety() {
	const js = spawnSync(process.execPath, [path.join('scripts', 'check-js-safety.mjs')], { encoding: 'utf8' });
	const css = spawnSync(process.execPath, [path.join('scripts', 'check-css-safety.mjs')], { encoding: 'utf8' });
	let cascade = '';
	try {
		cascade = fsSync.readFileSync(path.join('htdocs', 'luci-static', 'vitrawrt', 'cascade.css'), 'utf8');
	}
	catch (err) {}
	const imports = Array.from(cascade.matchAll(/@import\s+url\(["']?([^"')]+)["']?\)/g)).map((match) => match[1]);

	return {
		js: { status: js.status, stdout: js.stdout.trim(), stderr: js.stderr.trim() },
		css: { status: css.status, stdout: css.stdout.trim(), stderr: css.stderr.trim() },
		cascadeImports: imports,
		luciVisualImported: imports.some((item) => /luci-visual\.css/.test(item)),
		luciComponentsImported: imports.some((item) => /luci-components-visual\.css/.test(item)),
		fakeClick: js.status !== 0 && /(?:\.click\s*\(|dispatchEvent|MouseEvent|recoverFirstLoadTabs|initNativeTabsOnce)/.test(`${js.stdout}\n${js.stderr}`),
		globalTableNormalize: css.status !== 0 && /global table|table-layout:fixed|white-space:nowrap|display:block/.test(`${css.stdout}\n${css.stderr}`)
	};
}

async function collectMetrics(page) {
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
		const rgb = (value) => {
			const match = String(value || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
			return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
		};
		const isBlue = (value) => {
			const c = rgb(value);
			if (!c)
				return false;
			const [r, g, b] = c;
			return b > r + 18 && b > g - 8 && b > 90;
		};
		const styleOf = (node) => {
			const style = getComputedStyle(node);
			return {
				color: style.color,
				background: style.backgroundColor,
				backgroundImage: style.backgroundImage,
				border: style.borderColor,
				borderRadius: style.borderRadius,
				boxShadow: style.boxShadow,
				height: style.height,
				minHeight: style.minHeight,
				padding: style.padding,
				filter: style.filter
			};
		};
		const sampleNodes = Array.from(document.querySelectorAll([
			'#vwrt-sidebar',
			'#vitrawrt-sidebar-menu a',
			'#vitrawrt-sidebar-menu .vwrt-menu-icon',
			'#maincontent .cbi-section',
			'#maincontent .tabs a',
			'#maincontent .cbi-tabmenu a',
			'#maincontent .btn',
			'#maincontent .cbi-button',
			'#maincontent input',
			'#maincontent select',
			'#maincontent .cbi-progressbar',
			'#maincontent .ifacebox',
			'#maincontent .network-status-table'
		].join(','))).filter(visible).slice(0, 220);
		const colorSamples = sampleNodes.flatMap((node) => {
			const style = getComputedStyle(node);
			return [style.color, style.backgroundColor, style.borderColor];
		}).filter(Boolean);
		const blueCount = colorSamples.filter(isBlue).length;
		const menuIcons = Array.from(document.querySelectorAll('#vitrawrt-sidebar-menu .vwrt-menu-icon')).filter(visible).slice(0, 16).map((node) => styleOf(node));
		const applyArea = Array.from(document.querySelectorAll('#maincontent .cbi-page-actions, #maincontent #applyreboot-section, #maincontent #uci-apply')).filter(visible).map((node) => ({ rect: rect(node), style: styleOf(node), text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 120) }));
		const tabs = Array.from(document.querySelectorAll('#maincontent .tabs a, #maincontent .cbi-tabmenu a, #tabmenu .tabs a, #tabmenu .cbi-tabmenu a')).filter(visible).slice(0, 16).map((node) => ({ rect: rect(node), style: styleOf(node), text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 80) }));
		const progress = Array.from(document.querySelectorAll('#maincontent .cbi-progressbar, #maincontent .progressbar, #maincontent .progress, #maincontent progress')).filter(visible).slice(0, 12).map((node) => {
			const fill = node.matches('progress') ? null : node.querySelector('div, span, .bar, .progress-bar');
			return {
				rect: rect(node),
				style: styleOf(node),
				inlineStyle: node.getAttribute('style') || '',
				text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
				fill: fill ? {
					rect: rect(fill),
					style: styleOf(fill),
					inlineStyle: fill.getAttribute('style') || '',
					text: fill.textContent.trim().replace(/\s+/g, ' ').slice(0, 80)
				} : null
			};
		});
		const media = Array.from(document.querySelectorAll('#maincontent img, #maincontent canvas')).filter(visible).slice(0, 40).map((node) => ({
			tag: node.tagName.toLowerCase(),
			id: node.id || '',
			rect: rect(node),
			style: styleOf(node)
		}));
		const modal = Array.from(document.querySelectorAll('.modal, .modal-dialog, .modal-content, .cbi-modal, [role="dialog"], .ui-dialog, .dialog')).find(visible);

		return {
			url: location.href,
			theme: document.documentElement.getAttribute('data-theme') || '',
			bodyClasses: document.body ? document.body.className : '',
			viewport: { width: window.innerWidth, height: window.innerHeight },
			main: rect(document.querySelector('#maincontent')),
			sidebar: rect(document.querySelector('#vwrt-sidebar')),
			horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 8,
			blueUsageRatio: colorSamples.length ? Number((blueCount / colorSamples.length).toFixed(3)) : 0,
			blueSamples: { blueCount, total: colorSamples.length },
			defaultIconsAllBlue: menuIcons.length > 0 && menuIcons.every((item) => isBlue(item.color)),
			menuIcons,
			tabs,
			progress,
			media,
			mediaFiltersApplied: media.filter((node) => node.style.filter && node.style.filter !== 'none').length,
			applyArea,
			modal: modal ? { rect: rect(modal), style: styleOf(modal), text: modal.textContent.trim().replace(/\s+/g, ' ').slice(0, 160) } : null,
			dropdownOptionsVisible: Array.from(document.querySelectorAll('#maincontent .cbi-dropdown ul.dropdown li')).filter(visible).length,
			sidebarExpandedGroups: Array.from(document.querySelectorAll('#vitrawrt-sidebar-menu > .vwrt-menu.l1 > li')).filter((node) => node.classList.contains('expanded') || node.classList.contains('active') || node.classList.contains('selected')).length
		};
	});
}

async function captureCollapsedSidebar(page, dir, mode, metrics) {
	const toggle = page.locator('[data-vwrt-sidebar-toggle]').first();
	if (await toggle.count()) {
		const expanded = await page.evaluate(() => !document.documentElement.classList.contains('vwrt-sidebar-collapsed'));
		if (expanded) {
			await toggle.click().catch(() => {});
			await page.waitForTimeout(350);
		}
	}
	else {
		metrics.collapsedSidebar = { error: 'sidebar collapse control not found; no synthetic collapsed class was applied' };
		return;
	}

	await page.waitForTimeout(350);
	await screenshotLocator(page, '#vwrt-sidebar', path.join(dir, `${mode}-sidebar-collapsed.png`));
	await screenshotLocator(page, '#vwrt-sidebar .vwrt-sidebar-actions, #vwrt-sidebar .vitra-sidebar-controls', path.join(dir, `${mode}-sidebar-bottom-dock.png`));

	const first = page.locator('#vitrawrt-sidebar-menu > .vwrt-menu.l1 > li > .vwrt-menu-row a[data-vwrt-tooltip]').first();
	if (await first.count()) {
		await softTimeout(first.hover({ timeout: 2500 }).catch(() => {}), 3000);
		await page.waitForTimeout(300);
		await screenshot(page, path.join(dir, `${mode}-sidebar-collapsed-tooltip.png`), false);
	}

	metrics.collapsedSidebar = await page.evaluate(() => {
		const rect = (node) => {
			if (!node)
				return null;
			const r = node.getBoundingClientRect();
			return { x: Math.round(r.x), width: Math.round(r.width), height: Math.round(r.height), right: Math.round(r.right) };
		};
		return {
			buttons: Array.from(document.querySelectorAll('#vwrt-sidebar .vwrt-sidebar-action-row > button')).map((button) => {
				const before = getComputedStyle(button, '::before');
				return {
					rect: rect(button),
					ariaLabel: button.getAttribute('aria-label') || '',
					tooltip: button.getAttribute('data-vwrt-control-tooltip') || '',
					color: getComputedStyle(button).color,
					mask: before.webkitMaskImage || before.maskImage || ''
				};
			}),
			links: Array.from(document.querySelectorAll('#vitrawrt-sidebar-menu > .vwrt-menu.l1 > li > .vwrt-menu-row a')).slice(0, 12).map((link) => ({
				ariaLabel: link.getAttribute('aria-label') || '',
				tooltip: link.getAttribute('data-vwrt-tooltip') || ''
			}))
		};
	});

	await toggle.click().catch(() => {});
	await page.waitForTimeout(250);
}

async function captureSidebarHoverStates(page, dir, mode) {
	const parent = page.locator('#vitrawrt-sidebar-menu > .vwrt-menu.l1 > li > .vwrt-menu-row').first();
	if (await parent.count()) {
		await softTimeout(parent.hover({ timeout: 2500 }).catch(() => {}), 3000);
		await page.waitForTimeout(250);
		await screenshotLocator(page, '#vwrt-sidebar', path.join(dir, `${mode}-sidebar-hover-parent.png`));
	}

	const child = page.locator('#vitrawrt-sidebar-menu .vwrt-menu.l2 > li > .vwrt-menu-row').first();
	if (await child.count()) {
		await softTimeout(child.hover({ timeout: 2500 }).catch(() => {}), 3000);
		await page.waitForTimeout(250);
		await screenshotLocator(page, '#vwrt-sidebar', path.join(dir, `${mode}-sidebar-hover-child.png`));
	}
}

async function openNetworkModal(page, dir, prefix) {
	let edit = page.locator('#maincontent a, #maincontent button')
		.filter({ hasText: /^(Edit|编辑)$/i })
		.first();

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
	await screenshot(page, path.join(dir, `${prefix}-modal-open.png`));
	await screenshotLocator(page, '.modal .tabs, .modal .cbi-tabmenu, [role="dialog"] .tabs, [role="dialog"] .cbi-tabmenu', path.join(dir, `${prefix}-modal-tabs.png`));
	const modalTab = page.locator('.modal .tabs a, .modal .cbi-tabmenu a, [role="dialog"] .tabs a, [role="dialog"] .cbi-tabmenu a').first();
	if (await modalTab.count()) {
		await softTimeout(modalTab.hover({ timeout: 2500 }).catch(() => {}), 3000);
		await page.waitForTimeout(250);
		await screenshotLocator(page, '.modal .tabs, .modal .cbi-tabmenu, [role="dialog"] .tabs, [role="dialog"] .cbi-tabmenu', path.join(dir, `${prefix}-modal-tab-hover.png`));
	}
	await screenshotLocator(page, '.modal .cbi-value-field, [role="dialog"] .cbi-value-field', path.join(dir, `${prefix}-modal-fields.png`));
	await screenshotLocator(page, '.modal .modal-footer, [role="dialog"] .modal-footer, .cbi-modal .modal-footer', path.join(dir, `${prefix}-modal-footer.png`));
	await screenshotLocator(page, '.modal .cbi-dynlist, [role="dialog"] .cbi-dynlist', path.join(dir, `${prefix}-dynlist-existing.png`));
	await screenshotLocator(page, '.modal .cbi-dynlist input, [role="dialog"] .cbi-dynlist input', path.join(dir, `${prefix}-dynlist-add-row.png`));
	await screenshotLocator(page, '.modal textarea, [role="dialog"] textarea', path.join(dir, `${prefix}-textarea.png`));
	await screenshotLocator(page, '.modal input[type="file"], [role="dialog"] input[type="file"]', path.join(dir, `${prefix}-file-input.png`));
	const metrics = await collectMetrics(page);

	const close = page.locator('.modal button, .modal a, .cbi-modal button, .cbi-modal a, [role="dialog"] button, [role="dialog"] a')
		.filter({ hasText: /Close|Cancel|Dismiss|关闭|取消|×/i })
		.first();
	if (await close.count()) {
		await close.click().catch(() => {});
		await page.waitForTimeout(500);
		await screenshot(page, path.join(dir, `${prefix}-modal-closed.png`));
	}

	return metrics;
}

async function openDropdown(page, dir, prefix) {
	const dropdown = page.locator('#maincontent .cbi-dropdown, #maincontent select').first();
	if (!(await dropdown.count()))
		return null;

	const before = await collectMetrics(page);
	await screenshotLocator(page, '#maincontent .cbi-dropdown, #maincontent select', path.join(dir, `${prefix}-dropdown-closed.png`));
	await dropdown.click().catch(() => {});
	await page.waitForTimeout(500);
	await screenshot(page, path.join(dir, `${prefix}-dropdown-open.png`), false);
	const after = await collectMetrics(page);
	return { before, after };
}

async function captureTabSequence(page, dir, prefix) {
	const links = await page.locator('#maincontent .cbi-tabmenu a, #maincontent .tabs a, #tabmenu a').evaluateAll((nodes) => {
		const visible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		};
		return nodes.filter(visible).slice(0, 18).map((node, index) => ({
			index,
			text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
			parentClass: node.closest('li') ? node.closest('li').className : ''
		}));
	}).catch(() => []);

	const results = [];
	for (const tab of links) {
		const locator = page.locator('#maincontent .cbi-tabmenu a, #maincontent .tabs a, #tabmenu a').nth(tab.index);
		if (!(await locator.count()))
			continue;

		await locator.click().catch(() => {});
		await waitForTabVisualSettle(page);

		const metrics = await page.evaluate((index) => {
			const visible = (node) => {
				if (!node)
					return false;
				const style = getComputedStyle(node);
				const rect = node.getBoundingClientRect();
				return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
			};
			const rect = (node) => {
				if (!node)
					return null;
				const r = node.getBoundingClientRect();
				return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) };
			};
			const menus = Array.from(document.querySelectorAll('#maincontent .cbi-tabmenu, #maincontent .tabs, #tabmenu')).filter(visible);
			const menu = menus[0] || null;
			const menuRect = rect(menu);
			const activeLink = Array.from(document.querySelectorAll('#maincontent .cbi-tabmenu li.cbi-tab a, #maincontent .tabs li.active a, #tabmenu li.active a, #maincontent .tabs .active a')).find(visible) ||
				Array.from(document.querySelectorAll('#maincontent .cbi-tabmenu a, #maincontent .tabs a, #tabmenu a')).filter(visible)[index] ||
				null;
			const candidates = Array.from(document.querySelectorAll('#maincontent [data-tab-active="true"], #maincontent .cbi-tabcontainer, #maincontent .cbi-section, #maincontent .table, #maincontent table, #maincontent form'))
				.filter(visible)
				.filter((node) => !node.closest('.cbi-tabmenu, .tabs, #tabmenu'));
			const below = candidates
				.filter((node) => !menuRect || node.getBoundingClientRect().top >= menuRect.bottom - 2)
				.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
			const content = below[0] || candidates[0] || null;
			const contentRect = rect(content);
			return {
				activeText: activeLink ? activeLink.textContent.trim().replace(/\s+/g, ' ').slice(0, 80) : '',
				activeParentClass: activeLink && activeLink.closest('li') ? activeLink.closest('li').className : '',
				tabBar: menuRect,
				content: contentRect,
				contentSelector: content ? `${content.tagName.toLowerCase()}#${content.id || ''}.${Array.from(content.classList).join('.')}` : '',
				gap: menuRect && contentRect ? Math.round(contentRect.top - menuRect.bottom) : null
			};
		}, tab.index).catch(() => null);

		const shot = path.join(dir, `${prefix}-tab-${String(tab.index + 1).padStart(2, '0')}.png`);
		await screenshot(page, shot, false);
		results.push({ ...tab, ...(metrics || {}), screenshot: shot });
	}

	return results;
}

async function captureApplyArea(page, dir, prefix) {
	const input = page.locator('#maincontent input[type="text"], #maincontent input[type="number"], #maincontent textarea')
		.filter({ hasNot: page.locator('[readonly], [disabled]') })
		.first();

	if (!(await input.count()))
		return null;

	const before = await collectMetrics(page);
	const original = await input.inputValue().catch(() => '');
	const next = original ? `${original} ` : 'vitrawrt-audit';

	await input.fill(next).catch(() => {});
	await page.waitForTimeout(900);
	await screenshotLocator(page, '#maincontent .cbi-page-actions, #maincontent #applyreboot-section, #maincontent #uci-apply', path.join(dir, `${prefix}-apply-area.png`));
	const after = await collectMetrics(page);

	await input.fill(original).catch(() => {});
	await page.waitForTimeout(300);

	return { before, after };
}

async function capturePage(browser, baseUrl, args, dir, pageDef, mode) {
	const page = await newPage(browser, { width: 1920, height: 1080 }, mode);
	const item = { page: pageDef.name, mode, path: pageDef.path, screenshots: {}, metrics: null, error: '' };
	const watchdog = setTimeout(() => {
		item.error = item.error || 'capture timeout';
		page.close().catch(() => {});
	}, 140000);

	try {
		await login(page, baseUrl, args.luciUser, args.luciPassword);
		await softTimeout(page.goto(`${baseUrl}${pageDef.path}`, { waitUntil: 'domcontentloaded', timeout: 22000 }).catch(() => {}), 24000);
		await waitForLuCIView(page);
		if (await loginFormVisible(page)) {
			await login(page, baseUrl, args.luciUser, args.luciPassword);
			await softTimeout(page.goto(`${baseUrl}${pageDef.path}`, { waitUntil: 'domcontentloaded', timeout: 22000 }).catch(() => {}), 24000);
			await waitForLuCIView(page);
		}
		if (await loginFormVisible(page))
			throw new Error(`login form visible after retry for ${pageDef.path}`);

		const full = path.join(dir, `${mode}-${pageDef.name}.png`);
		await screenshot(page, full, false);
		item.screenshots.full = full;
		item.metrics = await collectMetrics(page);
		await writeJson(path.join(dir, `${mode}-${pageDef.name}.metrics.json`), item.metrics);

		if (pageDef.name === 'status-overview') {
			await screenshotLocator(page, '#vwrt-sidebar', path.join(dir, `${mode}-sidebar-expanded.png`));
			await captureSidebarHoverStates(page, dir, mode);
			await screenshotLocator(page, '#maincontent > .alert, #maincontent > .alert-message, #maincontent > .alert-warning', path.join(dir, `${mode}-unset-password-warning.png`));
			await screenshotLocator(page, '#maincontent .cbi-progressbar, #maincontent .progressbar, #maincontent .progress, #maincontent progress', path.join(dir, `${mode}-progress.png`));
			await screenshotLocator(page, '#maincontent .ifacebox, #maincontent .network-status-table', path.join(dir, `${mode}-status-card.png`));
			await captureCollapsedSidebar(page, dir, mode, item.metrics);
		}

		if (pageDef.tabs)
			item.metrics.tabSequence = await captureTabSequence(page, dir, `${mode}-${pageDef.name}`);

		if (pageDef.name === 'network-network') {
			item.metrics.dropdown = await openDropdown(page, dir, `${mode}-network`);
			await page.keyboard.press('Escape').catch(() => {});
			await page.waitForTimeout(250);
			await screenshotLocator(page, '#maincontent .ifacebox, #maincontent .network-status-table', path.join(dir, `${mode}-network-ifacebox.png`));
			await screenshotLocator(page, '#maincontent .ifacebox-head, #maincontent .ifacebadge', path.join(dir, `${mode}-network-lan-strip.png`));
			const iface = page.locator('#maincontent .ifacebox, #maincontent .ifacebadge, #maincontent .cbi-tooltip-container').first();
			if (await iface.count()) {
				await softTimeout(iface.hover({ timeout: 2500 }).catch(() => {}), 3000);
				await page.waitForTimeout(350);
				await screenshot(page, path.join(dir, `${mode}-network-iface-hover.png`), false);
			}
			item.metrics.modalAfterOpen = await openNetworkModal(page, dir, `${mode}-network-edit`);
		}

		if (pageDef.name === 'system-system') {
			await screenshotLocator(page, '#maincontent .tabs, #maincontent .cbi-tabmenu, #tabmenu', path.join(dir, `${mode}-system-tabs.png`));
			await screenshotLocator(page, '#maincontent .cbi-value-field, #maincontent input, #maincontent select, #maincontent textarea, #maincontent .cbi-dropdown', path.join(dir, `${mode}-system-fields.png`));
			await screenshotLocator(page, '#maincontent .cbi-dynlist', path.join(dir, `${mode}-system-dynlist.png`));
			await screenshotLocator(page, '#maincontent .cbi-dynlist .item, #maincontent .cbi-dynlist .cbi-dynlist-item, #maincontent .cbi-dynlist .control-group', path.join(dir, `${mode}-system-dynlist-existing.png`));
			await screenshotLocator(page, '#maincontent .cbi-dynlist .add-item, #maincontent .cbi-dynlist .cbi-button-add', path.join(dir, `${mode}-system-dynlist-add-row.png`));
			item.metrics.dropdown = await openDropdown(page, dir, `${mode}-system`);
			item.metrics.applyAreaAfterSafeEdit = await captureApplyArea(page, dir, `${mode}-system`);
		}

		if (['packages', 'startup', 'processes'].includes(pageDef.name))
			await screenshotLocator(page, '#maincontent table .btn, #maincontent table .cbi-button, #maincontent .cbi-section-table .btn, #maincontent .cbi-section-table .cbi-button', path.join(dir, `${mode}-${pageDef.name}-table-actions.png`));

		if (pageDef.name === 'syslog')
			await screenshotLocator(page, '#maincontent textarea, #maincontent pre, #maincontent .logread', path.join(dir, `${mode}-textarea-config-editor.png`));

		if (['openclash', 'mosdns', 'services'].includes(pageDef.name)) {
			await screenshotLocator(page, '#maincontent .tabs, #maincontent .cbi-tabmenu, #tabmenu', path.join(dir, `${mode}-${pageDef.name}-plugin-tabs.png`));
			await screenshotLocator(page, '#maincontent pre, #maincontent code, #maincontent textarea, #maincontent .logread', path.join(dir, `${mode}-${pageDef.name}-log-editor.png`));
			await screenshotLocator(page, '#maincontent input[type="file"], #maincontent .cbi-value-field input[type="file"]', path.join(dir, `${mode}-${pageDef.name}-file-upload.png`));
			await screenshotLocator(page, '#maincontent .btn, #maincontent .cbi-button, #maincontent button', path.join(dir, `${mode}-${pageDef.name}-plugin-actions.png`));
		}

		if (pageDef.name === 'cpulimit')
			item.metrics.dropdown = await openDropdown(page, dir, `${mode}-cpulimit`);
	}
	catch (err) {
		item.error = err.message;
	}
	finally {
		clearTimeout(watchdog);
		await page.close({ runBeforeUnload: false }).catch(() => {});
	}

	return item;
}

async function captureLogin(browser, baseUrl, dir, mode, viewport) {
	const page = await newPage(browser, viewport, mode);
	const file = path.join(dir, `login-${mode}-${viewport.width}x${viewport.height}.png`);
	await softTimeout(page.goto(`${baseUrl}/cgi-bin/luci/`, { waitUntil: 'domcontentloaded', timeout: 22000 }).catch(() => {}), 24000);
	await page.waitForTimeout(900);
	await screenshot(page, file);
	const metrics = await page.evaluate(() => {
		const rect = (node) => {
			if (!node)
				return null;
			const r = node.getBoundingClientRect();
			return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
		};
		const button = document.querySelector('.vwrt-auth-submit, button[type="submit"], input[type="submit"]');
		const style = button ? getComputedStyle(button) : null;
		return {
			card: rect(document.querySelector('.vwrt-auth-card')),
			logo: rect(document.querySelector('.vwrt-auth-logo, .vwrt-auth-brand img')),
			buttonBackground: style ? style.backgroundColor : '',
			horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 8
		};
	});
	await writeJson(path.join(dir, `login-${mode}-${viewport.width}x${viewport.height}.metrics.json`), metrics);
	await page.close();
	return { mode, viewport, screenshot: file, metrics };
}

async function writeReport(dir, report) {
	const pageLines = report.pages.map((item) => [
		`- ${item.mode} ${item.page}: ${item.screenshots.full || 'n/a'}`,
		`  - blue usage ratio: ${item.metrics ? item.metrics.blueUsageRatio : 'n/a'}`,
		`  - default icons all blue: ${item.metrics ? item.metrics.defaultIconsAllBlue : 'n/a'}`,
		`  - overflow: ${item.metrics ? item.metrics.horizontalOverflow : 'n/a'}`,
		`  - expanded groups: ${item.metrics ? item.metrics.sidebarExpandedGroups : 'n/a'}`,
		`  - media filters applied: ${item.metrics ? item.metrics.mediaFiltersApplied : 'n/a'}`,
		`  - dropdown options visible before open: ${item.metrics ? item.metrics.dropdownOptionsVisible : 'n/a'}`,
		item.metrics && item.metrics.modalAfterOpen ? `  - modal opened: ${Boolean(item.metrics.modalAfterOpen.modal)}` : '',
		item.metrics && item.metrics.tabSequence ? `  - tab gaps: ${item.metrics.tabSequence.map((tab) => `${tab.text || tab.activeText}:${tab.gap}`).join(', ')}` : '',
		item.error ? `  - error: ${item.error}` : ''
	].filter(Boolean).join('\n'));

	const lines = [
		'# Visual Direction Audit 1.24B',
		'',
		`Output: ${dir}`,
		'',
		'## Source Safety',
		`- check-js-safety status: ${report.sourceSafety.js.status}`,
		`- check-css-safety status: ${report.sourceSafety.css.status}`,
		`- check-css-safety output: ${report.sourceSafety.css.stdout || report.sourceSafety.css.stderr || 'clean'}`,
		`- cascade imports: ${report.sourceSafety.cascadeImports.join(', ') || 'none'}`,
		`- luci-visual.css imported: ${report.sourceSafety.luciVisualImported ? 'yes' : 'no'}`,
		`- luci-components-visual.css imported: ${report.sourceSafety.luciComponentsImported ? 'yes' : 'no'}`,
		`- fake click detected: ${report.sourceSafety.fakeClick ? 'yes' : 'no'}`,
		`- global table normalize detected: ${report.sourceSafety.globalTableNormalize ? 'yes' : 'no'}`,
		'',
		'## Login',
		...report.login.map((item) => `- ${item.mode} ${item.viewport.width}x${item.viewport.height}: ${item.screenshot}; logo=${JSON.stringify(item.metrics.logo)}; button=${item.metrics.buttonBackground}`),
		'',
		'## Pages',
		...pageLines,
		'',
		'## Stage 1.24B Direction Checks',
		'- Is OpenClash less alien? Review overview/config/log screenshots, plugin action controls, cards, tabs, and log/editor captures.',
		'- Are OpenClash saturated blue controls reduced? Compare blue usage ratio and action/log screenshots against Stage 1.24A evidence.',
		'- Are OpenClash buttons role-colored? Review apply/add/reload/remove/action controls in page-scoped captures.',
		'- Are MosDNS cards/forms/editors/logs integrated? Review MosDNS basic/config/log screenshots and editor close-ups.',
		'- Are MosDNS buttons role-colored? Review add/apply/refresh controls in MosDNS captures.',
		'- Is Network interface slab feeling reduced? Review network interface/device/global option tab screenshots.',
		'- Is LAN green strip reduced to subtle status accent? Review network ifacebox header screenshot and computed style evidence.',
		'- Are ifacebox/tooltips still working? Runtime regression remains authoritative; hover screenshots provide visual evidence.',
		'- Were Stage 1.24A progress/vnStat2 fixes preserved? Progress inline width and vnStat2 media filters must remain safe.',
		'- Was any JS used? Stage 1.24B should only update version markers and passive route classes.',
		'- If JS was used, was it passive only? Source safety must remain clean.',
		'',
		'## Stage 1.24B Defect Status',
		'- OpenClash integration: fixed/partial based on overview/config/log screenshots and blue usage ratio.',
		'- MosDNS integration: fixed/partial based on basic/config/log screenshots and editor/button close-ups.',
		'- Network page polish: fixed/partial based on tab screenshots, ifacebox hover, and LAN strip material.',
		'- Button role consistency: fixed/partial based on plugin/network action screenshots.',
		'- Stage 1.24A regressions: progress/vnStat2/sidebar/security checks should remain stable.',
		'',
		'## Architecture Safety',
		'- Was luci-visual.css ownership consolidated? Source Safety lists live cascade imports and should show luci-visual.css imported: no.',
		'- Are duplicate component owners reduced? Source Safety and cascade imports should show luci-components-visual.css as the sole LuCI component visual owner.',
		'- Are canonical tokens used consistently? Review source safety output and computed screenshots for --vw-* driven colors rather than old mixed token paint.',
		'- Is green/mint no longer global? Review light/dark full-page captures, active controls, progress, sidebar active rows, and plugin buttons.',
		'- Is blue/cyan no longer a plastic global accent? Review blue usage ratio plus primary buttons, tabs, and plugin actions.',
		'- Are progress bars no longer native recolor? Review progress close-up screenshots for trough, inner highlight, and restrained fill.',
		'- Are dynlist existing items truly styled? Review `*-system-dynlist-existing.png`, `*-system-dynlist-add-row.png`, and modal dynlist screenshots.',
		'- Are dropdown open menus truly styled? Review dropdown-open captures; native browser select popups remain browser-owned.',
		'- Is modal tab strip removed? Review modal tab and hover close-ups for absent rectangular underlay.',
		'- Is sidebar hover row integrated with chevron? Review parent hover and chevron area in sidebar hover crops.',
		'- Is sidebar layer stacking reduced? Review expanded sidebar, active parent, child rows, and bottom dock captures.',
		'- Are .cbi-value rows lighter and less cardified? Review system forms and network modal field close-ups.',
		'- Are field densities appropriate by context? Compare normal form, modal, compact table/plugin, and dynlist controls.',
		'- Are plugin pages less alien? Review OpenClash/MosDNS/service tabs, cards, buttons, logs and editors.',
		'- Did any LuCI behavior regress? Runtime regression is authoritative for lifecycle behavior.',
		'',
		'## Stage 1.22 Carry-Forward Status',
		'- Ownership cleanup: fixed when cascade imports exclude luci-visual.css and include luci-components-visual.css.',
		'- Duplicate component ownership: fixed at import level; remaining historical CSS is inert unless imported elsewhere.',
		'- Canonical token use: partial - final Stage 1.22 component blocks use --vw-* tokens; safety output records remaining historical compatibility warnings.',
		'- Green/mint dominance: partial - reviewed through full-page light/dark captures and color metrics.',
		'- Blue/cyan plastic accent: partial - reviewed through blue usage ratio and action/tab/plugin screenshots.',
		'- Sidebar hover split: partial until screenshots confirm row, link, and chevron share one hover surface.',
		'- Sidebar layer stacking: partial until expanded/collapsed screenshots confirm only rail, row, guide, and dock layers dominate.',
		'- .cbi-value over-cardification: partial until system/network forms show lightweight rows instead of per-row cards.',
		'- Field density: partial until normal, modal, compact table/plugin and dynlist controls show distinct density.',
		'- Progress bar LuCI recolor: partial until `*-progress.png` shows VitraWrt meter material.',
		'- Dynlist native patches: partial until System/modal dynlist close-ups show styled existing and add rows.',
		'- cbi-dropdown native patches: partial until dropdown closed/open close-ups show styled LuCI popovers.',
		'- Modal tab strip: partial until modal tab hover close-up shows no rectangular old strip.',
		'- Apply dock/buttons: partial until apply dock and table/plugin action screenshots show balanced natural-width buttons.',
		'- OpenClash/MosDNS/plugin adaptation: partial - plugin pages are attempted and screenshots/errors are recorded.',
		'- No fake click repair: fixed by source safety check when status is 0.',
		'- No global table normalization: fixed by source safety check when status is 0.',
		'',
		'## Stage 1.22 Answers',
		'- Was luci-visual.css ownership consolidated? See Source Safety; expected answer is yes when imported: no.',
		'- Are duplicate component owners reduced? Yes at cascade level; luci-components-visual.css is the final component owner.',
		'- Are canonical tokens used consistently? Final Stage 1.22 blocks use --vw-* roles; old --vitra/--vwrt names remain compatibility aliases only.',
		'- Is green/mint no longer global? Screenshot review decides final status; token roles reserve green primarily for success/status.',
		'- Is blue/cyan no longer plastic? Screenshot review decides final status; primary, tab, focus, and progress roles are separated.',
		'- Are progress bars redesigned? Progress close-ups check a soft trough plus restrained meter fill with real values preserved.',
		'- Are dynlist/dropdown internals styled from real DOM? System/modal close-ups target the documented LuCI 25.12 DOM.',
		'- Is modal tab strip removed? Modal tab hover close-up checks wrapper background and pseudo-strip removal.',
		'- Is sidebar hover integrated with chevron? Sidebar hover screenshots check the row-owned hover/active material.',
		'- Are .cbi-value rows lighter? System/network forms check section-owned cards with row separators only.',
		'- Are plugin pages less alien? OpenClash/MosDNS/service captures check page-scoped visual compatibility.',
		'- Did any LuCI behavior regress? Use runtime regression report as authority for cbi-dropdown, dynlist, modal close/tabs, apply lifecycle, ifacebox hover, and table overflow.',
		'',
		'## Known Limitations',
		'- VitraWrt theme does not repair app/plugin first-load tab issues with simulated clicks.',
		'- Status -> Overview remains native LuCI overview; VitraWrt Dashboard is a future independent luci-app page.',
		'- Table layout fixes remain page-scoped and are not expanded by this visual direction pass.'
	];

	await fs.writeFile(path.join('docs', 'VISUAL_DIRECTION_AUDIT_1_24B.md'), `${lines.join('\n')}\n`);
	await writeJson(path.join(dir, 'report.json'), report);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const playwright = await loadPlaywright();
	const baseUrl = normalizeHost(args.host);
	const dir = args.outputDir || path.join('audit-output', 'visual-direction-1.24B', stamp());
	const pages = [
		{ name: 'status-overview', path: '/cgi-bin/luci/admin/status/overview' },
		{ name: 'system-system', path: '/cgi-bin/luci/admin/system/system' },
		{ name: 'network-routes', path: '/cgi-bin/luci/admin/network/routes', tabs: true },
		{ name: 'network-network', path: '/cgi-bin/luci/admin/network/network', tabs: true },
		{ name: 'network-dhcp', path: '/cgi-bin/luci/admin/network/dhcp', tabs: true },
		{ name: 'vnstat2', path: '/cgi-bin/luci/admin/status/vnstat2', tabs: true },
		{ name: 'services', path: '/cgi-bin/luci/admin/services' },
		{ name: 'openclash', path: '/cgi-bin/luci/admin/services/openclash' },
		{ name: 'openclash-config', path: '/cgi-bin/luci/admin/services/openclash/config' },
		{ name: 'openclash-log', path: '/cgi-bin/luci/admin/services/openclash/log' },
		{ name: 'mosdns', path: '/cgi-bin/luci/admin/services/mosdns' },
		{ name: 'mosdns-config', path: '/cgi-bin/luci/admin/services/mosdns/config' },
		{ name: 'mosdns-log', path: '/cgi-bin/luci/admin/services/mosdns/log' },
		{ name: 'packages', path: '/cgi-bin/luci/admin/system/package-manager' },
		{ name: 'startup', path: '/cgi-bin/luci/admin/system/startup' },
		{ name: 'processes', path: '/cgi-bin/luci/admin/status/processes' },
		{ name: 'syslog', path: '/cgi-bin/luci/admin/status/syslog' },
		{ name: 'cpulimit', path: '/cgi-bin/luci/admin/services/cpulimit' }
	];
	const modes = ['light', 'dark'];
	const report = {
		baseUrl,
		startedAt: new Date().toISOString(),
		sourceSafety: sourceSafety(),
		login: [],
		pages: []
	};

	await ensureDir(dir);
	const browser = await launchBrowser(playwright, args);

	try {
		for (const mode of modes) {
			report.login.push(await captureLogin(browser, baseUrl, dir, mode, { width: 1920, height: 1080 }));
			report.login.push(await captureLogin(browser, baseUrl, dir, mode, { width: 390, height: 844 }));

			for (const pageDef of pages)
				report.pages.push(await capturePage(browser, baseUrl, args, dir, pageDef, mode));
		}
	}
	finally {
		report.finishedAt = new Date().toISOString();
		await browser.close();
	}

	await writeReport(dir, report);
	console.log(`Visual direction audit output: ${dir}`);
	console.log('Markdown: docs/VISUAL_DIRECTION_AUDIT_1_24B.md');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
