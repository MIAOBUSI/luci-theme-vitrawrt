#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { spawnSync } from 'child_process';

function usage() {
	console.log(`Usage: node scripts/runtime-regression-test.mjs [options]

Options:
  --host <ip>           Target host. Default: 10.10.10.148
  --luci-user <user>    LuCI login user. Default: root
  --luci-password <pw>  LuCI password. Default: empty
  --output-dir <dir>    Output directory. Default: audit-output/runtime-regression/<timestamp>
  --browser <name>      chromium, webkit, or firefox. Default: chromium with WebKit fallback
  --headed              Run headed browser
  -h, --help            Show help`);
}

function fail(message) {
	console.error(`runtime-regression-test: ${message}`);
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

async function launchBrowser(playwright, args, report) {
	const browserName = args.browser;
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
	const requested = playwright[browserName];

	if (!requested)
		fail(`unsupported browser: ${browserName}`);

	try {
		report.browserName = browserName;
		return await requested.launch(launchOptions);
	}
	catch (err) {
		report.warnings.push({
			message: `${browserName} launch failed`,
			details: { message: err.message }
		});

		if (browserName !== 'chromium' || !playwright.webkit)
			throw err;

		report.browserName = 'webkit';
		report.warnings.push({
			message: 'falling back to Playwright WebKit because Chromium failed to launch in this environment'
		});

		return await playwright.webkit.launch(launchOptions);
	}
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
			console.error('Then run: PLAYWRIGHT_BROWSERS_PATH=/tmp/vitrawrt-pw-browsers node scripts/runtime-regression-test.mjs --host 10.10.10.148');
			throw err;
		}
	}
}

function stamp() {
	const d = new Date();
	const pad = (n) => String(n).padStart(2, '0');

	return [
		d.getFullYear(),
		pad(d.getMonth() + 1),
		pad(d.getDate()),
		'-',
		pad(d.getHours()),
		pad(d.getMinutes()),
		pad(d.getSeconds())
	].join('');
}

function normalizeHost(host) {
	if (/^https?:\/\//.test(host))
		return host.replace(/\/$/, '');

	return `http://${host}`;
}

async function ensureDir(dir) {
	await fs.mkdir(dir, { recursive: true });
}

async function writeJson(file, data) {
	await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

async function waitForLuCIView(page) {
	await page.waitForLoadState('domcontentloaded').catch(() => {});
	await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

	await page.waitForFunction(() => {
		const view = document.querySelector('#view');

		if (!view)
			return true;

		const elementChildren = Array.from(view.children).filter((child) => child.nodeType === 1);

		return !(elementChildren.length === 1 && elementChildren[0].classList.contains('spinning'));
	}, null, { timeout: 15000 }).catch(() => {});

	await page.waitForTimeout(2200);
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
		await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
	}
}

async function gotoLuCI(page, baseUrl, requestPath) {
	await page.goto(`${baseUrl}${requestPath}`, {
		waitUntil: 'domcontentloaded',
		timeout: 30000
	});

	await waitForLuCIView(page);
}

function safeName(name) {
	return name.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

function assert(report, condition, message, details = {}) {
	if (condition) {
		report.passed.push({ message, details });
		return;
	}

	report.failed.push({ message, details });
}

function isVisibleScript() {
	return (node) => {
		const style = getComputedStyle(node);
		const rects = node.getClientRects();

		return style.display !== 'none' && style.visibility !== 'hidden' && rects.length > 0;
	};
}

async function screenshot(page, outputDir, name) {
	await page.screenshot({
		path: path.join(outputDir, `${safeName(name)}.png`),
		fullPage: true
	}).catch(() => {});
}

async function testRuntimeSourceSafety(report) {
	const jsSafety = spawnSync(process.execPath, [path.join('scripts', 'check-js-safety.mjs')], {
		encoding: 'utf8'
	});
	assert(report, jsSafety.status === 0, 'check-js-safety passes before browser runtime tests', {
		status: jsSafety.status,
		stdout: jsSafety.stdout,
		stderr: jsSafety.stderr
	});

	const cssSafety = spawnSync(process.execPath, [path.join('scripts', 'check-css-safety.mjs')], {
		encoding: 'utf8'
	});
	assert(report, cssSafety.status === 0, 'check-css-safety passes before browser runtime tests', {
		status: cssSafety.status,
		stdout: cssSafety.stdout,
		stderr: cssSafety.stderr
	});

	const jsDir = path.join('htdocs', 'luci-static', 'vitrawrt', 'js');
	const files = (await fs.readdir(jsDir))
		.filter((name) => name.endsWith('.js'))
		.map((name) => path.join(jsDir, name));
	const checks = [];

	for (const file of files) {
		const source = await fs.readFile(file, 'utf8');
		const result = {
			file,
			hasRecoverFirstLoadTabs: /recoverFirstLoadTabs/.test(source),
			hasInitNativeTabsOnce: /initNativeTabsOnce/.test(source),
			hasElementClick: /\.click\s*\(/.test(source),
			hasDispatchEvent: /dispatchEvent\s*\(/.test(source),
			hasMouseEvent: /new\s+MouseEvent\s*\(/.test(source),
			queriesLuCIInternals: /querySelector(All)?\(\s*['"][^'"]*(?:#maincontent|\.cbi(?!-progressbar)|\.modal|\.ifacebox|\.cbi-dropdown|\.cbi-dynlist|\.tabs|data-tab)/.test(source)
		};

		checks.push(result);
		assert(report, !result.hasRecoverFirstLoadTabs && !result.hasInitNativeTabsOnce, `${file} does not contain fake tab recovery helpers`, result);
		assert(report, !result.hasElementClick && !result.hasDispatchEvent && !result.hasMouseEvent, `${file} does not simulate user clicks or tab events`, result);
		assert(report, !/boot\.js$/.test(file) || !result.queriesLuCIInternals, 'boot.js does not query LuCI dynamic component internals', result);
	}

	report.pages.runtimeSourceSafety = checks;
}

async function testSidebarCollapsedTooltip(page, baseUrl, outputDir, report) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/status/overview');
	await page.waitForSelector('#vitrawrt-sidebar-menu .vwrt-menu.l1', { timeout: 10000 }).catch(() => {});
	await page.evaluate(() => document.documentElement.classList.add('vwrt-sidebar-collapsed'));
	await page.waitForTimeout(500);

	const stateBefore = await page.evaluate(() => {
		const visible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		};
		const links = Array.from(document.querySelectorAll('#vitrawrt-sidebar-menu > .vwrt-menu.l1 > li > .vwrt-menu-row a'));
		const active = document.querySelector('#vitrawrt-sidebar-menu > .vwrt-menu.l1 > li.active > .vwrt-menu-row a, #vitrawrt-sidebar-menu > .vwrt-menu.l1 > li.selected > .vwrt-menu-row a');

		return {
			collapsed: document.documentElement.classList.contains('vwrt-sidebar-collapsed'),
			sidebar: (() => {
				const sidebar = document.querySelector('#vwrt-sidebar');
				if (!sidebar)
					return null;
				const rect = sidebar.getBoundingClientRect();
				return {
					x: Math.round(rect.x),
					y: Math.round(rect.y),
					width: Math.round(rect.width),
					height: Math.round(rect.height),
					right: Math.round(rect.right)
				};
			})(),
			linkCount: links.length,
			links: links.slice(0, 12).map((link) => {
				const icon = link.querySelector('.vwrt-menu-icon');
				const label = link.querySelector('.vwrt-menu-label');
				const iconStyle = icon ? getComputedStyle(icon) : null;
				const labelStyle = label ? getComputedStyle(label) : null;
				return {
					text: link.textContent.trim().replace(/\s+/g, ' '),
					tooltip: link.getAttribute('data-vwrt-tooltip') || '',
					ariaLabel: link.getAttribute('aria-label') || '',
					iconVisible: icon ? visible(icon) : false,
					iconColor: iconStyle ? iconStyle.color : '',
					labelVisible: label ? visible(label) : false,
					labelDisplay: labelStyle ? labelStyle.display : ''
				};
			}),
			active: active ? {
				text: active.textContent.trim().replace(/\s+/g, ' '),
				tooltip: active.getAttribute('data-vwrt-tooltip') || '',
				iconVisible: active.querySelector('.vwrt-menu-icon') ? visible(active.querySelector('.vwrt-menu-icon')) : false,
				iconColor: active.querySelector('.vwrt-menu-icon') ? getComputedStyle(active.querySelector('.vwrt-menu-icon')).color : ''
			} : null,
			controls: Array.from(document.querySelectorAll('#vwrt-sidebar .vwrt-sidebar-action-row > button')).map((button) => {
				const rect = button.getBoundingClientRect();
				const before = getComputedStyle(button, '::before');
				return {
					text: button.textContent.trim().replace(/\s+/g, ' '),
					ariaLabel: button.getAttribute('aria-label') || '',
					tooltip: button.getAttribute('data-vwrt-control-tooltip') || '',
					x: Math.round(rect.x),
					y: Math.round(rect.y),
					width: Math.round(rect.width),
					height: Math.round(rect.height),
					right: Math.round(rect.right),
					centerX: Math.round(rect.x + rect.width / 2),
					beforeMask: before.webkitMaskImage || before.maskImage || '',
					beforeColor: before.backgroundColor,
					color: getComputedStyle(button).color
				};
			})
		};
	});

	await screenshot(page, outputDir, 'sidebar-collapsed');

	const firstLink = page.locator('#vitrawrt-sidebar-menu > .vwrt-menu.l1 > li > .vwrt-menu-row a[data-vwrt-tooltip]').first();
	const tooltip = { found: await firstLink.count(), content: '', visible: false, opacity: 0, visibility: '' };

	if (tooltip.found) {
		await firstLink.hover().catch(() => {});
		await page.waitForTimeout(400);
		const after = await firstLink.evaluate((link) => {
			const style = getComputedStyle(link, '::after');
			return {
				content: style.content.replace(/^"|"$/g, ''),
				visibility: style.visibility,
				opacity: Number.parseFloat(style.opacity || '0'),
				color: style.color,
				background: style.backgroundColor
			};
		});
		Object.assign(tooltip, after, {
			visible: after.visibility !== 'hidden' && after.opacity > 0.4
		});
		await screenshot(page, outputDir, 'sidebar-collapsed-tooltip');
	}

	report.pages.sidebarCollapsed = { stateBefore, tooltip };
	assert(report, stateBefore.collapsed, 'sidebar collapsed state can be represented by theme class', stateBefore);
	assert(report, stateBefore.links.length > 0 && stateBefore.links.every((link) => link.iconVisible && link.tooltip && link.ariaLabel), 'collapsed sidebar top-level items keep visible icons and accessible labels', stateBefore);
	assert(report, stateBefore.links.every((link) => !link.labelVisible), 'collapsed sidebar hides text labels without hiding icons', stateBefore);
	assert(report, Boolean(stateBefore.active && stateBefore.active.iconVisible), 'collapsed sidebar active item remains identifiable by icon', stateBefore);
	assert(report, tooltip.visible && tooltip.content.length > 0, 'collapsed sidebar hover exposes a VitraWrt tooltip', tooltip);
	assert(report, stateBefore.controls.length >= 3, 'collapsed sidebar footer exposes the three control buttons', stateBefore.controls);
	assert(report, stateBefore.controls.slice(0, 3).every((control) => control.ariaLabel && control.tooltip), 'collapsed sidebar footer controls have aria-label and tooltip text', stateBefore.controls);
	assert(report, stateBefore.controls.slice(0, 3).every((control) => control.width >= 36 && control.width <= 48 && control.height >= 36 && control.height <= 48), 'collapsed sidebar footer controls use consistent compact button dimensions', stateBefore.controls);
	assert(report, stateBefore.controls.slice(0, 3).every((control) => stateBefore.sidebar && control.x >= stateBefore.sidebar.x && control.right <= stateBefore.sidebar.right), 'collapsed sidebar footer controls stay inside sidebar bounds', stateBefore);
	if (stateBefore.controls.length >= 3) {
		const centers = stateBefore.controls.slice(0, 3).map((control) => control.centerX);
		assert(report, Math.max(...centers) - Math.min(...centers) <= 4, 'collapsed sidebar footer controls are center-aligned in one dock', stateBefore.controls);
		assert(report, stateBefore.controls.slice(0, 3).every((control) => control.beforeMask && control.beforeMask !== 'none'), 'collapsed sidebar footer controls use explicit icon masks', stateBefore.controls);
	}

	await page.evaluate(() => document.documentElement.classList.remove('vwrt-sidebar-collapsed'));
}

async function testOverview(page, baseUrl, outputDir, report) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/status/overview');
	await screenshot(page, outputDir, 'overview');

	const result = await page.evaluate(() => {
		const main = document.querySelector('#maincontent');
		const mainRect = main ? main.getBoundingClientRect() : document.documentElement.getBoundingClientRect();
		const isVisible = (node) => {
			const style = getComputedStyle(node);
			return style.display !== 'none' && style.visibility !== 'hidden' && node.getClientRects().length > 0;
		};
		const boxes = Array.from(document.querySelectorAll('#maincontent .ifacebox')).map((box) => {
			const rect = box.getBoundingClientRect();
			const style = getComputedStyle(box);

			return {
				text: box.textContent.trim().replace(/\s+/g, ' ').slice(0, 160),
				width: Math.round(rect.width),
				height: Math.round(rect.height),
				display: style.display,
				overflow: style.overflow,
				flexBasis: style.flexBasis,
				maxWidth: style.maxWidth,
				minWidth: style.minWidth,
				borderRadius: style.borderRadius,
				boxShadow: style.boxShadow,
				backgroundColor: style.backgroundColor,
				inlineStyle: box.getAttribute('style') || ''
			};
		});
		const visibleHoverInfo = Array.from(document.querySelectorAll('#maincontent .ifacebox .cbi-tooltip'))
			.filter(isVisible)
			.filter((node) => Number(getComputedStyle(node).opacity || '1') > 0)
			.map((node) => node.textContent.trim().replace(/\s+/g, ' ').slice(0, 180));
		const progressbars = Array.from(document.querySelectorAll('#maincontent .cbi-progressbar, #maincontent .progressbar, #maincontent .progress, #maincontent progress')).map((bar) => {
			const barRect = bar.getBoundingClientRect();
			const barStyle = getComputedStyle(bar);
			const inner = bar.matches('progress') ? null : bar.querySelector('div');
			const innerRect = inner ? inner.getBoundingClientRect() : null;
			const innerStyle = inner ? getComputedStyle(inner) : null;

			return {
				tag: bar.tagName.toLowerCase(),
				className: bar.className,
				width: Math.round(barRect.width),
				height: Math.round(barRect.height),
				backgroundColor: barStyle.backgroundColor,
				borderRadius: barStyle.borderRadius,
				boxShadow: barStyle.boxShadow,
				value: bar.matches('progress') ? Number(bar.value || 0) : null,
				max: bar.matches('progress') ? Number(bar.max || 0) : null,
				innerWidth: innerRect ? Math.round(innerRect.width) : null,
				innerHeight: innerRect ? Math.round(innerRect.height) : null,
				innerBackgroundColor: innerStyle ? innerStyle.backgroundColor : '',
				innerBoxShadow: innerStyle ? innerStyle.boxShadow : ''
			};
		});

		return {
			bodyClasses: document.body.className,
			pathname: location.pathname,
			title: document.title,
			heading: (main && main.querySelector('h1, h2, h3') ? main.querySelector('h1, h2, h3').textContent : '').trim(),
			mainWidth: Math.round(mainRect.width),
			ifaceboxCount: boxes.length,
			cbiSectionCount: document.querySelectorAll('#maincontent .cbi-section').length,
			dashboardMarkers: document.querySelectorAll('#maincontent .vitrawrt-dashboard, #maincontent [data-vitrawrt-dashboard], #maincontent .vitra-dashboard').length,
			boxes,
			visibleHoverInfo,
			progressbars
		};
	});

	report.pages.overview = result;
	assert(report, result.bodyClasses.includes('vwrt-page-overview'), 'overview page class is present', result);
	assert(report, /\/admin\/status\/overview$/.test(result.pathname), 'native Status -> Overview URL is not hijacked', result);
	assert(report, result.dashboardMarkers === 0, 'native Status -> Overview has no VitraWrt dashboard markers', result);
	assert(report, result.cbiSectionCount > 0, 'native Status -> Overview keeps LuCI native status sections', result);
	assert(report, result.ifaceboxCount > 0, 'overview has ifacebox elements', result);

	for (const box of result.boxes) {
		if (box.flexBasis === '100%' || box.maxWidth === 'none')
			report.warnings.push({
				message: 'ifacebox keeps Bootstrap/LuCI native sizing; Stage 1R8 does not redesign ifacebox internals',
				details: box
			});

		if (result.mainWidth > 0 && box.width >= result.mainWidth * 0.78)
			report.warnings.push({
				message: 'network upstream/native ifacebox is still wide under the Bootstrap baseline; not fixed by Stage 1R8 theme isolation',
				details: {
					mainWidth: result.mainWidth,
					box
				}
			});
	}

	assert(report, result.visibleHoverInfo.length === 0, 'ifacebox hover-only tooltip text is hidden before hover', {
		visibleHoverInfo: result.visibleHoverInfo
	});

	assert(report, result.progressbars.length > 0, 'overview exposes native progress bars', result.progressbars);

	if (result.progressbars.length) {
		const visibleBars = result.progressbars.filter((bar) => {
			const hasShell = bar.width > 12 && bar.height >= 6 && !/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/i.test(bar.backgroundColor);
			const hasFill = bar.innerWidth === null ? bar.value > 0 : bar.innerWidth > 0;
			return hasShell && hasFill;
		});

		assert(report, visibleBars.length > 0, 'overview memory/storage progress bars have visible shell and non-zero fill', {
			progressbars: result.progressbars
		});
		assert(report, visibleBars.every((bar) => !/^0px/.test(bar.borderRadius) && bar.boxShadow !== 'none'), 'overview progress bars have glass track radius and material shadow', {
			progressbars: visibleBars
		});
	}

	for (const box of result.boxes)
		assert(report, !/^0px/.test(box.borderRadius) && box.boxShadow !== 'none', 'ifacebox/network cards keep complete rounded glass corners', box);

	const firstIfacebox = page.locator('#maincontent .ifacebox').first();

	if (await firstIfacebox.count()) {
		const before = await firstIfacebox.boundingBox();
		await screenshot(page, outputDir, 'ifacebox-before-hover');
		const hoverTargets = [
			{ name: 'network-tooltip', selector: '#maincontent .ifacebox-head.cbi-tooltip-container' },
			{ name: 'stat-tooltip', selector: '#maincontent .ifacebox-body .cbi-tooltip-container' }
		];
		const hoverResults = [];

		for (const target of hoverTargets) {
			const locator = page.locator(target.selector).first();
			if (!(await locator.count())) {
				hoverResults.push({ name: target.name, available: false });
				continue;
			}

			await page.mouse.move(4, 4).catch(() => {});
			await page.waitForTimeout(120);
			await locator.hover();
			await page.waitForTimeout(500);
			const after = await firstIfacebox.boundingBox();
			await screenshot(page, outputDir, `ifacebox-${target.name}`);
			const tooltip = await page.evaluate(() => {
				const isVisible = (node) => {
					const style = getComputedStyle(node);
					return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && node.getClientRects().length > 0;
				};
				return Array.from(document.querySelectorAll('#maincontent .cbi-tooltip'))
					.filter(isVisible)
					.map((node) => {
						const rect = node.getBoundingClientRect();
						const style = getComputedStyle(node);
						return {
							text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 160),
							position: style.position,
							opacity: style.opacity,
							width: Math.round(rect.width),
							height: Math.round(rect.height)
						};
					});
			});
			const targetTooltip = await locator.evaluate((node) => {
				const tip = node.querySelector('.cbi-tooltip');

				if (!tip)
					return null;

				const style = getComputedStyle(tip);
				const rect = tip.getBoundingClientRect();
				const visible = style.display !== 'none' &&
					style.visibility !== 'hidden' &&
					Number(style.opacity) > 0 &&
					tip.getClientRects().length > 0;

				if (!visible)
					return null;

				return {
					text: tip.textContent.trim().replace(/\s+/g, ' ').slice(0, 160),
					position: style.position,
					opacity: style.opacity,
					width: Math.round(rect.width),
					height: Math.round(rect.height)
				};
			}).catch(() => null);
			if (targetTooltip && !tooltip.some((tip) => tip.text === targetTooltip.text))
				tooltip.unshift(targetTooltip);
			const heightGrowth = before && after ? after.height - before.height : 0;
			const current = { name: target.name, available: true, before, after, heightGrowth, tooltip };
			hoverResults.push(current);

			assert(report, !before || !after || heightGrowth <= Math.max(48, before.height * 0.25), `${target.name} does not expand the original ifacebox significantly`, current);
			if (!tooltip.length)
				report.warnings.push({
					message: `${target.name} did not expose hover text in this LuCI DOM; requiring another ifacebox native tooltip to pass`,
					details: current
				});

			for (const tip of tooltip)
				assert(report, tip.position === 'absolute' || tip.position === 'fixed', `${target.name} information appears as a floating layer`, tip);
		}

		report.pages.overview.ifaceboxHover = hoverResults;
		assert(report, hoverResults.some((item) => item.tooltip && item.tooltip.length > 0), 'ifacebox hover exposes at least one native floating tooltip without expanding the card', hoverResults);
	}
}

async function testSystemTabs(page, baseUrl, outputDir, report) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/system/system');
	await screenshot(page, outputDir, 'system-before-tabs');
	const consoleStart = report.console.length;
	const pageErrorStart = report.pageErrors.length;

	const expectedTexts = ['General Settings', 'Logging', 'Time Synchronization', 'Language and Style'];
	const tabs = await page.locator('#maincontent .cbi-tabmenu a, #maincontent .tabs a').evaluateAll((links) => {
		return links.map((link, index) => ({
			index,
			text: link.textContent.trim().replace(/\s+/g, ' '),
			href: link.getAttribute('href') || ''
		}));
	}).catch(() => []);

	report.pages.systemTabs = {
		bodyClasses: await page.evaluate(() => document.body.className),
		tabs,
		clicks: []
	};

	assert(report, tabs.length > 0, 'system page exposes runtime tabs', { count: tabs.length, tabs });

	for (const expectedText of expectedTexts) {
		const tab = page.locator('#maincontent .cbi-tabmenu a, #maincontent .tabs a')
			.filter({ hasText: expectedText })
			.first();

		if (!(await tab.count()))
			continue;

		const before = await page.evaluate(() => {
			const active = document.querySelector('#maincontent .cbi-tab, #maincontent .tabs .active');
			return {
				activeText: active ? active.textContent.trim().replace(/\s+/g, ' ') : '',
				hash: location.hash
			};
		});

		await tab.click();
		await page.waitForTimeout(700);

		const after = await page.evaluate(() => {
			const isVisible = (node) => {
				const style = getComputedStyle(node);
				const rect = node.getBoundingClientRect();

				return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
			};

			const panels = Array.from(document.querySelectorAll('#maincontent .cbi-section-node-tabbed > [data-tab][data-tab-active]'));
			const visiblePanels = panels.filter(isVisible);
			const hiddenVisible = panels.filter((node) => node.getAttribute('data-tab-active') === 'false' && isVisible(node));
			const active = document.querySelector('#maincontent .cbi-tab, #maincontent .tabs .active');

			return {
				activeText: active ? active.textContent.trim().replace(/\s+/g, ' ') : '',
				hash: location.hash,
				panelCount: panels.length,
				visiblePanelCount: visiblePanels.length,
				hiddenVisibleCount: hiddenVisible.length,
				visiblePanels: visiblePanels.map((node) => ({
					tab: node.getAttribute('data-tab') || '',
					active: node.getAttribute('data-tab-active') || '',
					text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 140)
				})),
				hiddenVisible: hiddenVisible.map((node) => ({
					tab: node.getAttribute('data-tab') || '',
					active: node.getAttribute('data-tab-active') || '',
					text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 140)
				}))
			};
		});

		const clickReport = {
			tab: { text: expectedText },
			before,
			after
		};

		report.pages.systemTabs.clicks.push(clickReport);

		assert(report, after.hiddenVisibleCount === 0, 'inactive system tab panels stay hidden after click', clickReport);

		if (after.panelCount > 0)
			assert(report, after.visiblePanelCount === 1, 'exactly one system tab panel is visible after click', clickReport);

		assert(report, after.activeText.includes(expectedText), 'clicked system tab becomes active', clickReport);
	}

	await screenshot(page, outputDir, 'system-after-tabs');

	const tabConsoleErrors = report.console.slice(consoleStart);
	assert(report, tabConsoleErrors.length === 0, 'system tab click flow has no console errors', tabConsoleErrors);

	const tabPageErrors = report.pageErrors.slice(pageErrorStart);
	assert(report, tabPageErrors.length === 0, 'system tab click flow has no page errors', tabPageErrors);
}

async function collectFirstLoadTabState(page) {
	return await page.evaluate(() => {
		const isVisible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' &&
				style.visibility !== 'hidden' &&
				Number(style.opacity || '1') > 0 &&
				rect.width > 0 &&
				rect.height > 0;
		};
		const controls = Array.from(document.querySelectorAll('#maincontent .cbi-tabmenu [data-tab] a, #maincontent .tabs [data-tab] a, #maincontent [role="tab"]'))
			.map((node, index) => {
				const rect = node.getBoundingClientRect();
				return {
					index,
					text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 90),
					className: typeof node.className === 'string' ? node.className : '',
					parentClassName: node.parentElement && typeof node.parentElement.className === 'string' ? node.parentElement.className : '',
					dataTab: node.getAttribute('data-tab') || node.parentElement?.getAttribute('data-tab') || '',
					ariaSelected: node.getAttribute('aria-selected') || node.parentElement?.getAttribute('aria-selected') || '',
					href: node.getAttribute('href') || '',
					visible: isVisible(node),
					x: Math.round(rect.x),
					y: Math.round(rect.y),
					width: Math.round(rect.width),
					height: Math.round(rect.height)
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
		const contents = [];
		for (const selector of contentSelectors) {
			for (const node of document.querySelectorAll(selector)) {
				if (node.closest('.cbi-tabmenu, .tabs, #tabmenu') || seen.has(node))
					continue;
				seen.add(node);
				const style = getComputedStyle(node);
				const rect = node.getBoundingClientRect();
				contents.push({
					selector,
					id: node.id || '',
					className: typeof node.className === 'string' ? node.className : '',
					dataTab: node.getAttribute('data-tab') || '',
					dataTabActive: node.getAttribute('data-tab-active') || '',
					ariaHidden: node.getAttribute('aria-hidden') || '',
					inlineStyle: node.getAttribute('style') || '',
					hidden: node.hidden,
					visible: isVisible(node),
					display: style.display,
					visibility: style.visibility,
					width: Math.round(rect.width),
					height: Math.round(rect.height),
					text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 120)
				});
			}
		}
		const visibleContents = contents.filter((item) => item.visible);
		const visibleDataTabs = Array.from(new Set(visibleContents.map((item) => item.dataTab).filter(Boolean)));
		const inactiveVisible = visibleContents.filter((item) =>
			item.dataTabActive === 'false' ||
			item.ariaHidden === 'true' ||
			/\binactive\b|\bdisabled\b/.test(item.className)
		);
		const imageGroups = Array.from(document.querySelectorAll('#maincontent .cbi-section[data-tab], #maincontent .tab-pane, #maincontent .tab-content > *, #maincontent [role="tabpanel"]'))
			.filter((node) => isVisible(node) && node.querySelector('img, canvas, svg'))
			.map((node) => ({
				dataTab: node.getAttribute('data-tab') || '',
				dataTabActive: node.getAttribute('data-tab-active') || '',
				imageCount: Array.from(node.querySelectorAll('img, canvas, svg')).filter(isVisible).length,
				text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 80)
			}));
		const visibleImages = Array.from(document.querySelectorAll('#maincontent img, #maincontent canvas, #maincontent svg')).filter(isVisible);
		const tabMenuDirections = Array.from(document.querySelectorAll('#maincontent .tabs, #maincontent .cbi-tabmenu, #tabmenu')).map((menu) => ({
			className: typeof menu.className === 'string' ? menu.className : '',
			id: menu.id || '',
			display: getComputedStyle(menu).display,
			flexDirection: getComputedStyle(menu).flexDirection
		}));

		return {
			pathname: location.pathname,
			hash: location.hash,
			bodyClasses: document.body.className,
			htmlDataset: { ...document.documentElement.dataset },
			controls,
			visibleControlCount: controls.filter((control) => control.visible).length,
			contents,
			visibleContentCount: visibleContents.length,
			visibleDataTabs,
			inactiveVisibleCount: inactiveVisible.length,
			inactiveVisible,
			visibleImageCount: visibleImages.length,
			visibleImageGroupCount: imageGroups.length,
			imageGroups,
			tabMenuDirections
		};
	});
}

async function clickRuntimeTab(page, index) {
	const tabs = page.locator('#maincontent .cbi-tabmenu [data-tab] a, #maincontent .tabs [data-tab] a, #maincontent [role="tab"]');
	const count = await tabs.count();

	for (let i = index; i < count; i++) {
		const tab = tabs.nth(i);
		if (await tab.isVisible().catch(() => false)) {
			await tab.click().catch(() => {});
			await page.waitForTimeout(700);
			return true;
		}
	}

	return false;
}

async function testFirstLoadTabs(page, baseUrl, outputDir, report) {
	const pages = [
		{ name: 'network-root', path: '/cgi-bin/luci/admin/network', knownFirstLoadIssue: true },
		{ name: 'vnstat2', path: '/cgi-bin/luci/admin/status/vnstat2', knownFirstLoadIssue: true },
		{ name: 'system-system', path: '/cgi-bin/luci/admin/system/system', knownFirstLoadIssue: false }
	];

	report.pages.firstLoadTabs = [];
	const consoleStart = report.console.length;
	const pageErrorStart = report.pageErrors.length;

	for (const item of pages) {
		await gotoLuCI(page, baseUrl, item.path);
		await screenshot(page, outputDir, `first-load-${item.name}-before`);
		const before = await collectFirstLoadTabState(page);
		await screenshot(page, outputDir, `first-load-${item.name}-after`);

		const result = { ...item, before };
		report.pages.firstLoadTabs.push(result);

		for (const menu of before.tabMenuDirections)
			assert(report, menu.flexDirection !== 'column', `${item.name} tab menu is not forced vertical on desktop`, { item, menu });

		assert(report, !/\bvwrt-tabs-recovered\b|\bvwrt-tabs-anomaly\b|\bvwrt-tabs-normal\b/.test(before.bodyClasses), `${item.name} has no fake tab recovery body classes`, result);
		assert(report, !before.htmlDataset.vwrtTabsRecovery, `${item.name} has no fake tab recovery html dataset`, result);

		if (item.knownFirstLoadIssue && before.visibleContentCount > 1) {
			report.warnings.push({
				message: `${item.name} still has a LuCI/app first-load tab initialization issue; theme does not fake-click to hide it`,
				details: result
			});
		}
		else if (before.contents.length > 0) {
			assert(report, before.visibleContentCount <= 1, `${item.name} first load shows only the active tab content`, result);
			assert(report, before.inactiveVisibleCount === 0, `${item.name} first load does not expose inactive tab content`, result);
		}
	}

	const tabConsoleErrors = report.console.slice(consoleStart);
	assert(report, tabConsoleErrors.length === 0, 'first-load tab regression flow has no console errors', tabConsoleErrors);

	const tabPageErrors = report.pageErrors.slice(pageErrorStart);
	assert(report, tabPageErrors.length === 0, 'first-load tab regression flow has no page errors', tabPageErrors);
}

async function testCbiDropdown(page, baseUrl, outputDir, report) {
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
			await page.locator('#maincontent .cbi-tabmenu a, #maincontent .tabs a').filter({ hasText: candidate.tab }).first().click().catch(() => {});
		await page.waitForTimeout(500);
		visibleDropdownIndex = await page.locator('#maincontent .cbi-dropdown:not(.btn):not(.cbi-button)').evaluateAll((nodes) => {
			const visible = (node) => {
				const style = getComputedStyle(node);
				const rect = node.getBoundingClientRect();
				return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
			};
			return nodes.findIndex((node) => {
				if (!visible(node))
					return false;

				const rect = node.getBoundingClientRect();
				const hit = document.elementFromPoint(rect.left + Math.min(rect.width - 1, Math.max(1, rect.width / 2)), rect.top + Math.min(rect.height - 1, Math.max(1, rect.height / 2)));

				return hit === node || node.contains(hit);
			});
		}).catch(() => -1);
		if (visibleDropdownIndex >= 0)
			break;
	}
	await screenshot(page, outputDir, 'cbi-dropdown-before');

	const before = await page.evaluate(() => {
		const visible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		};
		const dropdown = Array.from(document.querySelectorAll('#maincontent .cbi-dropdown:not(.btn):not(.cbi-button)')).find((node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		});
		const items = dropdown ? Array.from(dropdown.querySelectorAll('ul.dropdown > li')) : [];
		return {
			hasDropdown: Boolean(dropdown),
			hasSelect: Boolean(document.querySelector('#maincontent select')),
			open: dropdown ? dropdown.hasAttribute('open') : false,
			visibleItems: items.filter(visible).length
		};
	});

	report.pages.cbiDropdown = { page: selectedCandidate.path, before };
	assert(report, before.hasDropdown || before.hasSelect, 'CBI dropdown or native select exists on system page', before);
	assert(report, before.visibleItems === 0, 'CBI dropdown options are not visible before click', before);

	const dropdown = page.locator('#maincontent .cbi-dropdown:not(.btn):not(.cbi-button)').nth(Math.max(0, visibleDropdownIndex));
	if (visibleDropdownIndex < 0 || !(await dropdown.count()))
		return;

	await dropdown.click();
	await page.waitForTimeout(550);
	await screenshot(page, outputDir, 'cbi-dropdown-open');
	const opened = await page.evaluate(() => {
		const visible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		};
		const dropdown = Array.from(document.querySelectorAll('#maincontent .cbi-dropdown:not(.btn):not(.cbi-button)')).find((node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		});
		const items = dropdown ? Array.from(dropdown.querySelectorAll('ul.dropdown > li')) : [];
		return {
			open: dropdown ? dropdown.hasAttribute('open') : false,
			visibleItems: items.filter(visible).length
		};
	});
	report.pages.cbiDropdown.opened = opened;
	assert(report, opened.open || opened.visibleItems > 0, 'CBI dropdown opens on click', opened);
	assert(report, opened.visibleItems > 0, 'CBI dropdown options are visible after click', opened);

	await page.keyboard.press('Escape').catch(() => {});
	await page.waitForTimeout(350);
	const closed = await page.evaluate(() => {
		const visible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		};
		const dropdown = Array.from(document.querySelectorAll('#maincontent .cbi-dropdown:not(.btn):not(.cbi-button)')).find((node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		});
		const items = dropdown ? Array.from(dropdown.querySelectorAll('ul.dropdown > li')) : [];
		return {
			open: dropdown ? dropdown.hasAttribute('open') : false,
			visibleItems: items.filter(visible).length
		};
	});
	report.pages.cbiDropdown.closed = closed;
	assert(report, closed.visibleItems === 0 || !closed.open, 'CBI dropdown closes without leaving all options exposed', closed);
}

async function testCbiDynlist(page, baseUrl, outputDir, report) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/system/system');
	await page.locator('#maincontent .cbi-tabmenu a, #maincontent .tabs a').filter({ hasText: 'Time Synchronization' }).first().click().catch(() => {});
	await page.waitForTimeout(500);
	await screenshot(page, outputDir, 'cbi-dynlist-before');

	const before = await page.evaluate(() => {
		const visible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		};
		const dynlist = document.querySelector('#maincontent .cbi-dynlist');
		const firstItem = dynlist ? dynlist.querySelector('.item') : null;
			return {
				hasDynlist: Boolean(dynlist),
				itemCount: dynlist ? dynlist.querySelectorAll('.item').length : 0,
				visibleItems: dynlist ? Array.from(dynlist.querySelectorAll('.item')).filter(visible).length : 0,
				addButtonCount: dynlist ? dynlist.querySelectorAll('.cbi-button-add, button').length : 0,
				inputCount: dynlist ? dynlist.querySelectorAll('input').length : 0,
				removeButtonCount: dynlist ? dynlist.querySelectorAll('.cbi-button-remove, .remove, button[title*="Remove"], button[aria-label*="Remove"]').length : 0,
				removeAffordance: firstItem ? getComputedStyle(firstItem, '::after').content : ''
			};
		});
	report.pages.cbiDynlist = { before };
	assert(report, before.hasDynlist, 'CBI dynlist exists on system time page', before);
	assert(report, before.addButtonCount > 0, 'CBI dynlist add button exists', before);
	assert(report, before.itemCount > 0 || before.inputCount > 0, 'CBI dynlist exposes existing items or input row', before);

	const add = page.locator('#maincontent .cbi-dynlist .cbi-button-add, #maincontent .cbi-dynlist > .add-item button').first();
	if (await add.count()) {
		await add.click().catch(() => {});
		await page.waitForTimeout(450);
		await screenshot(page, outputDir, 'cbi-dynlist-after-add');
	}
	const afterAdd = await page.evaluate(() => {
		const dynlist = document.querySelector('#maincontent .cbi-dynlist');
		return {
			itemCount: dynlist ? dynlist.querySelectorAll('.item').length : 0,
			addButtonCount: dynlist ? dynlist.querySelectorAll('.cbi-button-add, button').length : 0,
			inputCount: dynlist ? dynlist.querySelectorAll('input').length : 0
		};
	});
	report.pages.cbiDynlist.afterAdd = afterAdd;
	assert(report, afterAdd.addButtonCount > 0, 'CBI dynlist add button remains after add interaction', afterAdd);
	assert(report, afterAdd.itemCount >= before.itemCount, 'CBI dynlist add interaction does not remove existing items', { before, afterAdd });
}

async function testApplyArea(page, baseUrl, outputDir, report) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/system/system');
	await screenshot(page, outputDir, 'apply-area-before');
	const collect = async () => await page.evaluate(() => {
		const visible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		};
		return Array.from(document.querySelectorAll('#uci-apply, #applyreboot-section, #maincontent .uci-change-list, #maincontent .modal, #maincontent .modal-overlay, #maincontent .alert-message'))
			.map((node) => ({
				id: node.id,
				className: typeof node.className === 'string' ? node.className : '',
				text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 120),
				visible: visible(node),
				display: getComputedStyle(node).display,
				rect: (() => {
					const rect = node.getBoundingClientRect();
					return {
						x: Math.round(rect.x),
						y: Math.round(rect.y),
						width: Math.round(rect.width),
						height: Math.round(rect.height)
					};
				})(),
				borderRadius: getComputedStyle(node).borderRadius,
				boxShadow: getComputedStyle(node).boxShadow
			}));
	});
	const before = await collect();
	report.pages.applyArea = { before };
	const earlyApply = before.filter((item) => /apply|unsaved|changes|forced|强制|应用/i.test(`${item.id} ${item.className} ${item.text}`) && item.visible);
	assert(report, earlyApply.length === 0, 'LuCI apply/change overlay is not forced visible before edits', { earlyApply, before });

	const input = page.locator('#maincontent input[type="text"]:not([readonly]):not([disabled])').first();
	if (await input.count()) {
		const original = await input.inputValue().catch(() => '');
		await input.fill(`${original} `).catch(() => {});
		await page.waitForTimeout(700);
		await screenshot(page, outputDir, 'apply-area-after-change');
	}
	const afterChange = await collect();
	report.pages.applyArea.afterChange = afterChange;
	assert(report, Array.isArray(afterChange), 'apply area state can be inspected after a harmless edit', afterChange);
	const viewport = page.viewportSize() || { width: 1920 };
	const visibleApply = afterChange.filter((item) => item.visible && /apply|save|reset|应用|保存|复位|更改|change/i.test(`${item.id} ${item.className} ${item.text}`));
	for (const item of visibleApply)
		assert(report, !item.rect || item.rect.width <= Math.max(680, viewport.width * 0.7), 'visible apply action area wraps its buttons instead of spanning the full page', item);
}

async function testSyslog(page, baseUrl, outputDir, report) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/status/logs/syslog');
	await screenshot(page, outputDir, 'syslog');
	const result = await page.evaluate(() => {
		const rect = (node) => {
			if (!node)
				return null;
			const r = node.getBoundingClientRect();
			return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
		};
		const main = document.querySelector('#maincontent');
		const log = document.querySelector('#maincontent #syslog, #maincontent pre, #maincontent textarea');
		const controls = Array.from(document.querySelectorAll('#maincontent form, #maincontent .control-group, #maincontent input, #maincontent select, #maincontent button'))
			.filter((node) => {
				const style = getComputedStyle(node);
				const r = node.getBoundingClientRect();
				return style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
			})
			.slice(0, 20)
			.map((node) => ({ tag: node.tagName.toLowerCase(), type: node.getAttribute('type') || '', className: typeof node.className === 'string' ? node.className : '', rect: rect(node), display: getComputedStyle(node).display }));
		return { main: rect(main), log: rect(log), controls };
	});
	report.pages.syslog = result;
	assert(report, result.log && result.main && result.log.width >= result.main.width * 0.7, 'syslog output uses at least 70% of maincontent width', result);
	assert(report, result.controls.every((control) => {
		if (control.type === 'checkbox' || control.type === 'radio')
			return control.rect.width >= 12;
		return control.rect.width >= 24;
	}), 'syslog filter controls are not squeezed into unusable slivers', result);
}

async function testStartup(page, baseUrl, outputDir, report) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/system/startup');
	await screenshot(page, outputDir, 'startup');
	const result = await page.evaluate(() => {
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
			.slice(0, 60)
			.map((node) => ({ text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 80), rect: rect(node), display: getComputedStyle(node).display }));
		let rowPairs = 0;
		for (let i = 0; i < buttons.length; i++) {
			for (let j = i + 1; j < buttons.length; j++) {
				if (Math.abs(buttons[i].rect.y - buttons[j].rect.y) <= 12 && Math.abs(buttons[i].rect.x - buttons[j].rect.x) > 8)
					rowPairs++;
			}
		}
		const firstTable = document.querySelector('#maincontent table, #maincontent .table');
		const headers = firstTable ? Array.from(firstTable.querySelectorAll('thead th, .tr:first-child .th, tr:first-child th')).map(rect) : [];
		const firstRowCells = firstTable ? Array.from(firstTable.querySelectorAll('tbody tr:first-child td, .tr:nth-child(2) .td')).map(rect) : [];
		return { main: rect(main), tables, buttons, rowPairs, headers, firstRowCells };
	});
	report.pages.startup = result;
	const widestTable = Math.max(0, ...result.tables.map((table) => table.width));
	assert(report, widestTable >= result.main.width * 0.85, 'startup table uses at least 85% of maincontent width', result);
	assert(report, result.buttons.length < 3 || result.rowPairs > 0, 'startup action buttons are not all vertically stacked', result);
	if (result.headers.length && result.firstRowCells.length) {
		const comparable = Math.min(result.headers.length, result.firstRowCells.length);
		const aligned = result.headers.slice(0, comparable).every((header, index) => Math.abs(header.x - result.firstRowCells[index].x) <= 18);
		assert(report, aligned, 'startup table headers align with first row cells', result);
	}
}

async function collectSidebarState(page, label) {
	return await page.evaluate((stateLabel) => {
		const visible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		};
		const groups = Array.from(document.querySelectorAll('#vitrawrt-sidebar-menu > .vwrt-menu.l1 > li')).map((li) => {
			const submenu = li.querySelector(':scope > .vwrt-menu.l2');
			const button = li.querySelector(':scope > .vwrt-menu-row > .vwrt-menu-expander');
			return {
				text: (li.querySelector(':scope > .vwrt-menu-row a')?.textContent || '').trim().replace(/\s+/g, ' '),
				className: li.className,
				expanded: li.classList.contains('expanded') || li.classList.contains('active') || li.classList.contains('selected'),
				submenuVisible: submenu ? visible(submenu) : false,
				ariaExpanded: button ? button.getAttribute('aria-expanded') : ''
			};
		});

		return {
			label: stateLabel,
			pathname: location.pathname,
			groups,
			expandedCount: groups.filter((group) => group.expanded || group.submenuVisible || group.ariaExpanded === 'true').length
		};
	}, label);
}

async function findSidebarLink(page, kind) {
	return await page.evaluate((targetKind) => {
		const links = Array.from(document.querySelectorAll('#vitrawrt-sidebar-menu a'));
		const visible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		};
		const tests = {
			network: (text, href) => /\/admin\/network(?:\/network)?(?:$|\?)/.test(href) || /^network$|interfaces|接口|网络/i.test(text),
			service: (text, href) => /\/admin\/services(?:\/|$|\?)/.test(href) || /^services$|服务/i.test(text),
			share: (text, href) => /samba|ksmbd|nfs|share|共享/i.test(`${text} ${href}`),
			processes: (text, href) => /\/admin\/status\/processes(?:$|\?)/.test(href) || /processes|进程/i.test(text)
		};
		const test = tests[targetKind];
		let fallback = null;

		for (let i = 0; i < links.length; i++) {
			const link = links[i];
			const text = link.textContent.trim().replace(/\s+/g, ' ');
			const href = link.getAttribute('href') || '';

			if (visible(link) && test && test(text, href))
				return { index: i, text, href };

			if (targetKind === 'share' && visible(link) && /nas/i.test(`${text} ${href}`))
				fallback = fallback || { index: i, text, href };
		}

		return fallback;
	}, kind);
}

async function testSidebarExpansion(page, baseUrl, outputDir, report) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/status/overview');
	await page.waitForSelector('#vitrawrt-sidebar-menu .vwrt-menu.l1', { timeout: 10000 }).catch(() => {});

	const targets = [
		{ kind: 'network', label: 'network-interfaces' },
		{ kind: 'service', label: 'services-plugin' },
		{ kind: 'share', label: 'nas-network-share' },
		{ kind: 'processes', label: 'status-processes' }
	];

	report.pages.sidebarExpansion = [];

	for (const target of targets) {
		const link = await findSidebarLink(page, target.kind);

		if (!link) {
			report.warnings.push({
				message: `sidebar ${target.label} link not found on this router`,
				details: target
			});
			continue;
		}

		await page.locator('#vitrawrt-sidebar-menu a').nth(link.index).click().catch(() => {});
		await waitForLuCIView(page);
		await page.waitForTimeout(700);
		await screenshot(page, outputDir, `sidebar-${target.label}`);

		const state = await collectSidebarState(page, target.label);
		report.pages.sidebarExpansion.push({ target, link, state });
		assert(report, state.expandedCount <= 3, `sidebar does not expand every top-level group after ${target.label}`, { target, link, state });
	}
}

async function testNetworkEditModal(page, baseUrl, outputDir, report) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/network/network');
	await screenshot(page, outputDir, 'network-edit-before');

	let edit = page.locator('#maincontent .cbi-section-table-row a, #maincontent .cbi-section-table-row button, #maincontent table a, #maincontent table button')
		.filter({ hasText: /^(Edit|Configure|编辑|配置)$/i })
		.filter({ hasNotText: /password|密码|口令/i })
		.first();

	if (!(await edit.count())) {
		edit = page.locator('#maincontent a, #maincontent button')
			.filter({ hasText: /Edit|Configure|编辑|配置/i })
			.filter({ hasNotText: /password|密码|口令/i })
			.first();
	}

	if (!(await edit.count())) {
		report.warnings.push({ message: 'network edit/configure button not found; modal test skipped' });
		return;
	}

	await edit.click().catch(() => {});
	await page.waitForFunction(() => {
		const visible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		};
		return Array.from(document.querySelectorAll('.modal, .modal-dialog, .cbi-modal, [role="dialog"], .ui-dialog, .dialog')).some(visible);
	}, null, { timeout: 4500 }).catch(() => {});
	await page.waitForTimeout(500);
	await screenshot(page, outputDir, 'network-edit-modal');

	const result = await page.evaluate(() => {
		const visible = (node) => {
			const style = getComputedStyle(node);
			const rect = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
		};
		const rect = (node) => {
			if (!node)
				return null;
			const r = node.getBoundingClientRect();
			return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) };
		};
		const dialogs = Array.from(document.querySelectorAll('.modal, .modal-dialog, .cbi-modal, [role="dialog"], .ui-dialog, .dialog'))
			.filter(visible)
			.map((node) => ({
				tag: node.tagName.toLowerCase(),
				id: node.id || '',
				className: typeof node.className === 'string' ? node.className : '',
				rect: rect(node),
				position: getComputedStyle(node).position,
				zIndex: Number.parseInt(getComputedStyle(node).zIndex, 10) || 0,
				text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 160)
			}))
			.sort((a, b) => (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height));
		const sidebar = document.querySelector('#vwrt-sidebar');
		const sidebarStyle = sidebar ? getComputedStyle(sidebar) : null;
		const overlay = document.querySelector('#modal_overlay');
		const overlayStyle = overlay ? getComputedStyle(overlay) : null;

		return {
			dialogs,
			dialog: dialogs[0] || null,
			sidebar: sidebar ? {
				rect: rect(sidebar),
				zIndex: sidebarStyle ? Number.parseInt(sidebarStyle.zIndex, 10) || 0 : 0
			} : null,
			overlay: overlay ? {
				rect: rect(overlay),
				position: overlayStyle ? overlayStyle.position : '',
				zIndex: overlayStyle ? Number.parseInt(overlayStyle.zIndex, 10) || 0 : 0,
				visible: visible(overlay)
			} : null,
			viewport: { width: window.innerWidth, height: window.innerHeight }
		};
	});

	report.pages.networkEditModal = result;
	assert(report, Boolean(result.dialog), 'network interface edit opens a LuCI modal/dialog', result);

	if (result.dialog && result.sidebar) {
		assert(report, (result.overlay && result.overlay.zIndex > result.sidebar.zIndex) || result.dialog.zIndex > result.sidebar.zIndex || result.dialog.position === 'fixed', 'network edit modal is layered independently of the sidebar', result);
		assert(report, result.dialog.rect.width <= result.viewport.width - 24, 'network edit modal fits within the viewport', result);
		assert(report, result.dialog.position === 'fixed' || result.dialog.position === 'absolute' || (result.overlay && result.overlay.position === 'fixed'), 'network edit modal keeps native overlay positioning', result);
	}

	const closeButton = page.locator('.modal button, .modal a, .cbi-modal button, .cbi-modal a, [role="dialog"] button, [role="dialog"] a')
		.filter({ hasText: /Close|Cancel|Dismiss|关闭|取消|×/i })
		.first();
	const closeResult = {
		closeButtonFound: await closeButton.count(),
		closed: false
	};

	if (closeResult.closeButtonFound) {
		await closeButton.click().catch(() => {});
		await page.waitForTimeout(700);
		closeResult.closed = await page.evaluate(() => {
			const visible = (node) => {
				const style = getComputedStyle(node);
				const rect = node.getBoundingClientRect();
				return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
			};

			return !Array.from(document.querySelectorAll('.modal, .modal-dialog, .cbi-modal, [role="dialog"], .ui-dialog, .dialog')).some(visible);
		});
	}

	report.pages.networkEditModal.close = closeResult;
	assert(report, closeResult.closeButtonFound > 0, 'network edit modal exposes a close/cancel control', closeResult);
	assert(report, closeResult.closed, 'network edit modal closes when its close/cancel control is clicked', closeResult);
}

async function testNetworkShareWideTable(page, baseUrl, outputDir, report) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/status/overview');
	const link = await findSidebarLink(page, 'share');

	if (!link) {
		report.warnings.push({ message: 'network share/Samba/NAS link not found; wide table test skipped' });
		return;
	}

	await page.locator('#vitrawrt-sidebar-menu a').nth(link.index).click().catch(() => {});
	await waitForLuCIView(page);
	await page.waitForTimeout(900);
	await screenshot(page, outputDir, 'network-share-wide-table');

	const result = await page.evaluate(() => {
		const rect = (node) => {
			if (!node)
				return null;
			const r = node.getBoundingClientRect();
			return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) };
		};
		const main = document.querySelector('#maincontent');
		const sections = Array.from(document.querySelectorAll('#maincontent .cbi-section, #maincontent .cbi-map, #maincontent fieldset')).map((node) => ({
			rect: rect(node),
			clientWidth: node.clientWidth,
			scrollWidth: node.scrollWidth,
			overflowX: getComputedStyle(node).overflowX
		}));
		const tables = Array.from(document.querySelectorAll('#maincontent table, #maincontent .table')).map((node) => ({
			rect: rect(node),
			scrollWidth: node.scrollWidth,
			clientWidth: node.clientWidth
		}));

		return {
			pathname: location.pathname,
			bodyClasses: document.body.className,
			main: rect(main),
			viewportWidth: window.innerWidth,
			documentScrollWidth: document.documentElement.scrollWidth,
			sections,
			tables,
			hasWideSectionScroller: sections.some((section) => section.scrollWidth > section.clientWidth + 8 && /auto|scroll/i.test(section.overflowX))
		};
	});

	report.pages.networkShareWideTable = { link, result };
	assert(report, result.documentScrollWidth <= result.viewportWidth + 24, 'network share page does not create viewport-level horizontal overflow', { link, result });

	const wideTable = result.tables.some((table) => result.main && table.rect.width > result.main.width + 8);
	if (wideTable)
		assert(report, result.hasWideSectionScroller, 'wide network share table is contained by an inner horizontal scroller', { link, result });
}

async function testProcesses(page, baseUrl, outputDir, report) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/status/processes');
	await screenshot(page, outputDir, 'processes');
	const result = await page.evaluate(() => {
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
			.slice(0, 80)
			.map((node) => ({ text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 80), rect: rect(node), display: getComputedStyle(node).display }));
		let rowPairs = 0;
		for (let i = 0; i < buttons.length; i++) {
			for (let j = i + 1; j < buttons.length; j++) {
				if (Math.abs(buttons[i].rect.y - buttons[j].rect.y) <= 12 && Math.abs(buttons[i].rect.x - buttons[j].rect.x) > 8)
					rowPairs++;
			}
		}
		return { main: rect(main), tables, buttons, rowPairs, scrollWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth };
	});

	report.pages.processes = result;
	const widestTable = Math.max(0, ...result.tables.map((table) => table.width));
	assert(report, widestTable >= result.main.width * 0.7, 'processes table uses at least 70% of maincontent width', result);
	assert(report, widestTable <= result.main.width + 24, 'processes table does not exceed maincontent width significantly', result);
	assert(report, result.buttons.length < 3 || result.rowPairs > 0, 'process action buttons are not all vertically stacked', result);
	assert(report, result.scrollWidth <= result.viewportWidth + 24, 'processes page does not overflow horizontally at viewport level', result);
}

async function testPackagesPage(page, baseUrl, outputDir, report) {
	const candidates = [
		'/cgi-bin/luci/admin/system/package-manager',
		'/cgi-bin/luci/admin/system/packages'
	];
	let tested = null;

	report.pages.packages = {
		tested: false,
		candidates: []
	};

	for (const candidate of candidates) {
		const response = await page.goto(`${baseUrl}${candidate}`, {
			waitUntil: 'domcontentloaded',
			timeout: 30000
		}).catch(() => null);

		await waitForLuCIView(page);
		await page.waitForTimeout(1200);

		const status = response ? response.status() : 0;
		const probe = await page.evaluate(() => {
			const text = document.body ? document.body.innerText : '';
			return {
				bodyClasses: document.body ? document.body.className : '',
				pathname: location.pathname,
				text: text.slice(0, 240),
				tableCount: document.querySelectorAll('#maincontent table, #maincontent .table').length,
				actionButtonCount: document.querySelectorAll('#maincontent .td.cbi-section-actions .btn, #maincontent table td:last-child .btn, #maincontent .td.cbi-section-actions .cbi-button, #maincontent table td:last-child .cbi-button').length
			};
		}).catch(() => ({ bodyClasses: '', pathname: '', text: '', tableCount: 0, actionButtonCount: 0 }));
		const notFound = status >= 400 || /not found|invalid url path|404/i.test(probe.text);

		report.pages.packages.candidates.push({ candidate, status, notFound, probe });

		if (!notFound && probe.tableCount > 0 && /software|package|apk|opkg|软件包/i.test(probe.text)) {
			tested = candidate;
			break;
		}
	}

	if (!tested) {
		report.warnings.push({
			message: 'software/package manager page was not found; package action button regression skipped',
			details: report.pages.packages.candidates
		});
		return;
	}

	await screenshot(page, outputDir, 'packages');
	const result = await page.evaluate(() => {
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
		const main = document.querySelector('#maincontent');
		const tables = Array.from(document.querySelectorAll('#maincontent table, #maincontent .table')).map((node) => ({
			tag: node.tagName.toLowerCase(),
			className: typeof node.className === 'string' ? node.className : '',
			rect: rect(node),
			scrollWidth: node.scrollWidth,
			clientWidth: node.clientWidth
		}));
		const buttons = Array.from(document.querySelectorAll([
			'#maincontent table td:last-child .btn',
			'#maincontent table td:last-child .cbi-button',
			'#maincontent table .td:last-child .btn',
			'#maincontent table .td:last-child .cbi-button',
			'#maincontent .td.cbi-section-actions > .btn',
			'#maincontent .td.cbi-section-actions > .cbi-button'
		].join(',')))
			.filter(visible)
			.slice(0, 80)
			.map((node) => {
				const style = getComputedStyle(node);
				const cell = node.closest('td, .td');
				const r = node.getBoundingClientRect();
				const inViewport = r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
				const hit = inViewport ? document.elementFromPoint(r.left + Math.max(1, Math.min(r.width - 1, r.width / 2)), r.top + Math.max(1, Math.min(r.height - 1, r.height / 2))) : null;
				const text = node.textContent.trim().replace(/\s+/g, ' ').slice(0, 80);
				const actionable = node.tagName === 'A' ||
					node.tagName === 'BUTTON' ||
					node.hasAttribute('onclick') ||
					/^(install|remove|update|安装|移除|更新)$/i.test(text);

				return {
					tag: node.tagName.toLowerCase(),
					className: typeof node.className === 'string' ? node.className : '',
					text,
					rect: rect(node),
					cellRect: rect(cell),
					display: style.display,
					computedWidth: style.width,
					inViewport,
					actionable,
					hitTarget: hit ? hit === node || node.contains(hit) : null
				};
			});
		const actionCells = Array.from(document.querySelectorAll('#maincontent td.td.cbi-section-actions, #maincontent .td.cbi-section-actions, #maincontent table td:last-child'))
			.filter(visible)
			.slice(0, 80)
			.map((node) => ({
				className: typeof node.className === 'string' ? node.className : '',
				text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
				rect: rect(node),
				textAlign: getComputedStyle(node).textAlign,
				whiteSpace: getComputedStyle(node).whiteSpace
			}));

		return {
			bodyClasses: document.body.className,
			pathname: location.pathname,
			main: rect(main),
			viewportWidth: window.innerWidth,
			scrollWidth: document.documentElement.scrollWidth,
			tables,
			actionCells,
			buttons
		};
	});

	report.pages.packages.tested = true;
	report.pages.packages.path = tested;
	report.pages.packages.result = result;

	assert(report, result.bodyClasses.includes('vwrt-page-packages'), 'package manager page class is present', result);
	assert(report, result.buttons.length > 0, 'package manager exposes action buttons for sizing checks', result);
	assert(report, result.scrollWidth <= result.viewportWidth + 24, 'package manager page does not overflow horizontally at viewport level', result);

	for (const button of result.buttons) {
		assert(report, button.rect.width <= 160, 'package action button is not stretched into a long bar', button);
		if (button.cellRect && button.cellRect.width > 0)
			assert(report, button.rect.width <= Math.max(128, button.cellRect.width * 0.9), 'package action button does not fill its entire action cell', button);
		assert(report, button.display !== 'block', 'package action button keeps inline/natural layout', button);
		if (button.actionable && button.inViewport)
			assert(report, button.hitTarget, 'package action button remains hit-testable', button);
	}
}

async function testNftables(page, baseUrl, outputDir, report) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/status/nftables');
	await screenshot(page, outputDir, 'nftables');

	const result = await page.evaluate(() => {
		return {
			bodyClasses: document.body.className,
			scrollWidth: document.documentElement.scrollWidth,
			viewportWidth: window.innerWidth,
			preCount: document.querySelectorAll('#maincontent pre').length,
			tableCount: document.querySelectorAll('#maincontent table, #maincontent .table').length
		};
	});

	report.pages.nftables = result;
	assert(report, result.bodyClasses.includes('vwrt-page-nftables'), 'nftables page class is present', result);
	assert(report, result.scrollWidth <= result.viewportWidth + 24, 'nftables page does not overflow horizontally at viewport level', result);
}

async function testVnstat2PanelSpacing(page, baseUrl, outputDir, report) {
	const response = await page.goto(`${baseUrl}/cgi-bin/luci/admin/status/vnstat2`, {
		waitUntil: 'domcontentloaded',
		timeout: 30000
	}).catch(() => null);

	await waitForLuCIView(page);
	await page.waitForTimeout(1400);

	const status = response ? response.status() : 0;
	const text = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 240) : '').catch(() => '');
	const notFound = status >= 400 || /not found|invalid url path|404/i.test(text);

	report.pages.vnstat2PanelSpacing = {
		tested: false,
		status,
		notFound,
		measurements: []
	};

	if (notFound) {
		report.warnings.push({
			message: 'vnStat2 page was not found; panel spacing regression skipped',
			details: { status, text }
		});
		return;
	}

	async function collect(label) {
		return await page.evaluate((currentLabel) => {
			const rect = (node) => {
				if (!node)
					return null;
				const r = node.getBoundingClientRect();
				return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) };
			};
			const visible = (node) => {
				const style = getComputedStyle(node);
				const r = node.getBoundingClientRect();
				return style.display !== 'none' &&
					style.visibility !== 'hidden' &&
					Number(style.opacity || '1') > 0 &&
					r.width > 0 &&
					r.height > 0;
			};
			const graphName = /^(summary|top|5 minute|5分钟|hourly|daily|monthly|yearly|摘要|顶部|每小时|每天|每月|按年)$/i;
			const main = document.querySelector('#maincontent');
			const menus = Array.from(document.querySelectorAll('#maincontent .tabs, #maincontent .cbi-tabmenu, #tabmenu')).map((menu) => {
				const links = Array.from(menu.querySelectorAll('a')).map((link) => ({
					text: link.textContent.trim().replace(/\s+/g, ' '),
					rect: rect(link),
					visible: visible(link)
				}));

				return {
					rect: rect(menu),
					display: getComputedStyle(menu).display,
					flexDirection: getComputedStyle(menu).flexDirection,
					links
				};
			});
			const graphMenu = menus.find((menu) => menu.links.some((link) => graphName.test(link.text))) || menus[menus.length - 1] || null;
			const graphImages = Array.from(document.querySelectorAll('#maincontent img, #maincontent canvas, #maincontent svg'))
				.filter((node) => {
					const r = node.getBoundingClientRect();
					const panel = node.closest('.cbi-section[data-tab], .tab-pane, .tab-content > *, [role="tabpanel"]');
					return visible(node) && (!panel || visible(panel)) && r.width >= 80 && r.height >= 50;
				})
				.map((node) => ({
					tag: node.tagName.toLowerCase(),
					rect: rect(node),
					closestPanelTab: node.closest('[data-tab]') ? node.closest('[data-tab]').getAttribute('data-tab') || '' : ''
				}))
				.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
			const panels = Array.from(document.querySelectorAll('#maincontent .cbi-section[data-tab], #maincontent .tab-pane, #maincontent .tab-content > *, #maincontent [role="tabpanel"]')).map((node) => {
				const images = Array.from(node.querySelectorAll('img, canvas, svg')).filter((media) => {
					const r = media.getBoundingClientRect();
					return visible(media) && r.width >= 80 && r.height >= 50;
				});

				return {
					tab: node.getAttribute('data-tab') || '',
					active: node.getAttribute('data-tab-active') || '',
					className: typeof node.className === 'string' ? node.className : '',
					visible: visible(node),
					rect: rect(node),
					imageCount: images.length
				};
			});
			const firstChart = graphImages[0] || null;
			const gap = graphMenu && firstChart ? firstChart.rect.y - graphMenu.rect.bottom : null;
			const mainRect = rect(main);

			return {
				label: currentLabel,
				bodyClasses: document.body.className,
				htmlDataset: { ...document.documentElement.dataset },
				main: mainRect,
				viewportWidth: window.innerWidth,
				scrollWidth: document.documentElement.scrollWidth,
				graphMenu,
				firstChart,
				gap,
				visibleImageCount: graphImages.length,
				visibleImageGroupCount: panels.filter((panel) => panel.visible && panel.imageCount > 0).length,
				visiblePanels: panels.filter((panel) => panel.visible),
				panelCount: panels.length,
				imageOverflow: graphImages.some((image) => mainRect && image.rect.right > mainRect.right + 2),
				graphImages
			};
		}, label);
	}

	const links = await page.locator('#maincontent .tabs a, #maincontent .cbi-tabmenu a').evaluateAll((nodes) => {
		const graphName = /^(summary|top|5 minute|5分钟|hourly|daily|monthly|yearly|摘要|顶部|每小时|每天|每月|按年)$/i;
		return nodes.map((node, index) => ({
			index,
			text: node.textContent.trim().replace(/\s+/g, ' '),
			visible: (() => {
				const style = getComputedStyle(node);
				const rect = node.getBoundingClientRect();
				return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
			})()
		})).filter((item) => item.visible && graphName.test(item.text));
	}).catch(() => []);

	report.pages.vnstat2PanelSpacing.links = links;
	report.pages.vnstat2PanelSpacing.tested = true;

	const initial = await collect('initial');
	report.pages.vnstat2PanelSpacing.measurements.push(initial);
	await screenshot(page, outputDir, 'vnstat2-spacing-initial');

	for (const item of links) {
		await page.locator('#maincontent .tabs a, #maincontent .cbi-tabmenu a').nth(item.index).click().catch(() => {});
		await page.waitForTimeout(850);
		const measurement = await collect(item.text);
		report.pages.vnstat2PanelSpacing.measurements.push(measurement);
		await screenshot(page, outputDir, `vnstat2-spacing-${safeName(item.text)}`);
	}

	const validGaps = report.pages.vnstat2PanelSpacing.measurements
		.filter((item) => item.gap !== null && item.firstChart)
		.map((item) => item.gap);
	const minGap = validGaps.length ? Math.min(...validGaps) : null;
	const maxGap = validGaps.length ? Math.max(...validGaps) : null;

	assert(report, initial.bodyClasses.includes('vwrt-page-vnstat2'), 'vnStat2 page class is present', initial);
	assert(report, links.length > 0, 'vnStat2 graph tabs are discoverable for spacing checks', { links });
	assert(report, !/\bvwrt-tabs-recovered\b|\bvwrt-tabs-anomaly\b|\bvwrt-tabs-normal\b/.test(initial.bodyClasses), 'vnStat2 has no fake tab recovery body classes', initial);
	assert(report, !initial.htmlDataset.vwrtTabsRecovery, 'vnStat2 has no fake tab recovery html dataset', initial);

	if (validGaps.length) {
		assert(report, maxGap <= 64, 'vnStat2 graph content gap stays within a compact range', { minGap, maxGap, validGaps, measurements: report.pages.vnstat2PanelSpacing.measurements });
		assert(report, maxGap - minGap <= 24, 'vnStat2 graph content gaps are consistent across graph tabs', { minGap, maxGap, validGaps, measurements: report.pages.vnstat2PanelSpacing.measurements });
	}

	for (const measurement of report.pages.vnstat2PanelSpacing.measurements) {
		assert(report, !measurement.imageOverflow, 'vnStat2 graph images stay inside maincontent', measurement);
		if (measurement.visibleImageGroupCount > 1) {
			report.warnings.push({
				message: 'vnStat2 still reports multiple visible image groups; recorded as a plugin/LuCI first-load limitation, not repaired with fake clicks',
				details: measurement
			});
		}
	}
}

async function testVnstat(page, baseUrl, outputDir, report) {
	const candidates = [
		'/cgi-bin/luci/admin/status/vnstat',
		'/cgi-bin/luci/admin/status/vnstat2',
		'/cgi-bin/luci/admin/services/vnstat',
		'/cgi-bin/luci/admin/statistics/graphs'
	];

	report.pages.vnstat = {
		tested: false,
		candidates: []
	};

	for (const candidate of candidates) {
		const response = await page.goto(`${baseUrl}${candidate}`, {
			waitUntil: 'domcontentloaded',
			timeout: 30000
		}).catch(() => null);

		await waitForLuCIView(page);

		const status = response ? response.status() : 0;
		const snapshot = await page.evaluate(() => {
			const text = document.body ? document.body.innerText : '';

			return {
				bodyClasses: document.body ? document.body.className : '',
				pathname: location.pathname,
				text: text.slice(0, 220),
				dashboardMarkers: document.querySelectorAll('#maincontent .vitrawrt-dashboard, #maincontent [data-vitrawrt-dashboard], #maincontent .vitra-dashboard').length,
				media: Array.from(document.querySelectorAll('#maincontent img, #maincontent canvas, #maincontent svg')).map((node) => {
					const rect = node.getBoundingClientRect();

					return {
						tag: node.tagName.toLowerCase(),
						width: Math.round(rect.width),
						height: Math.round(rect.height)
					};
				}),
				tabMenus: Array.from(document.querySelectorAll('#maincontent .tabs, #maincontent .cbi-tabmenu')).map((node) => {
					const rect = node.getBoundingClientRect();
					const links = Array.from(node.querySelectorAll('a')).map((link) => {
						const linkRect = link.getBoundingClientRect();
						return {
							text: link.textContent.trim().replace(/\s+/g, ' '),
							x: Math.round(linkRect.x),
							y: Math.round(linkRect.y),
							width: Math.round(linkRect.width),
							height: Math.round(linkRect.height)
						};
					});

					return {
						width: Math.round(rect.width),
						height: Math.round(rect.height),
						links
					};
				}),
				tabPanels: Array.from(document.querySelectorAll('#maincontent .cbi-section-node-tabbed > [data-tab], #maincontent [data-tab][data-tab-active], #maincontent .tab-pane')).map((node) => {
					const style = getComputedStyle(node);
					const rect = node.getBoundingClientRect();
					return {
						tab: node.getAttribute('data-tab') || '',
						active: node.getAttribute('data-tab-active') || '',
						className: node.className,
						visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
						width: Math.round(rect.width),
						height: Math.round(rect.height),
						text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 120)
					};
				}),
				mainWidth: Math.round((document.querySelector('#maincontent') || document.documentElement).getBoundingClientRect().width),
				scrollWidth: document.documentElement.scrollWidth,
				viewportWidth: window.innerWidth
			};
		}).catch(() => ({ bodyClasses: '', text: '', media: [], mainWidth: 0, scrollWidth: 0, viewportWidth: 0 }));

		const notFound = status >= 400 || /not found|invalid url path|404/i.test(snapshot.text);
		report.pages.vnstat.candidates.push({ candidate, status, notFound, snapshot });

		if (notFound)
			continue;

		report.pages.vnstat.tested = true;
		await screenshot(page, outputDir, `vnstat-${safeName(candidate)}`);
		assert(report, snapshot.dashboardMarkers === 0, 'vnStat/plugin page is not replaced with a VitraWrt dashboard', {
			candidate,
			dashboardMarkers: snapshot.dashboardMarkers
		});

		for (const media of snapshot.media) {
			assert(
				report,
				!snapshot.mainWidth || media.width <= snapshot.mainWidth + 2,
				'vnStat/image graph media stays within main content width',
				{ candidate, media, mainWidth: snapshot.mainWidth }
			);
		}

		assert(report, snapshot.scrollWidth <= snapshot.viewportWidth + 24, 'vnStat/image graph page does not overflow horizontally at viewport level', {
			candidate,
			scrollWidth: snapshot.scrollWidth,
			viewportWidth: snapshot.viewportWidth
		});

		for (const menu of snapshot.tabMenus) {
			for (const link of menu.links)
				assert(report, link.width > 0 && link.height > 0, 'vnStat/plugin native tab links remain present and clickable', {
					candidate,
					link
				});
		}

		const inactiveVisible = snapshot.tabPanels.filter((panel) => {
			if (panel.active === 'false')
				return panel.visible;

			return /\bdisabled\b|\binactive\b/.test(panel.className) && panel.visible;
		});
		if (inactiveVisible.length > 0) {
			report.warnings.push({
				message: 'vnStat/plugin first-load tab visibility remains an app/LuCI initialization limitation; VitraWrt no longer hides it with fake tab clicks',
				details: {
					candidate,
					tabPanels: snapshot.tabPanels,
					inactiveVisible
				}
			});
		}

		return;
	}
}

async function testBackgroundAndLayout(page, baseUrl, outputDir, report) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/status/overview');
	await screenshot(page, outputDir, 'background-layout');

	const result = await page.evaluate(() => {
		const main = document.querySelector('#maincontent');
		const mainRect = main ? main.getBoundingClientRect() : document.documentElement.getBoundingClientRect();
		const aura = document.querySelector('.vwrt-shell-aura');
		const auraStyle = aura ? getComputedStyle(aura) : null;
		const auraRect = aura ? aura.getBoundingClientRect() : null;
		const bodyBefore = getComputedStyle(document.body, '::before');
		const bodyAfter = getComputedStyle(document.body, '::after');
		const mainBefore = main ? getComputedStyle(main, '::before') : null;
		const sections = Array.from(document.querySelectorAll('#maincontent .cbi-section, #maincontent .cbi-map, #maincontent fieldset'))
			.filter((node) => {
				const style = getComputedStyle(node);
				const rect = node.getBoundingClientRect();
				return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
			})
			.slice(0, 10)
			.map((node) => {
				const rect = node.getBoundingClientRect();
				return {
					className: node.className,
					width: Math.round(rect.width),
					height: Math.round(rect.height)
				};
			});

		return {
			mainWidth: Math.round(mainRect.width),
			mainHeight: Math.round(mainRect.height),
			scrollWidth: document.documentElement.scrollWidth,
			viewportWidth: window.innerWidth,
			aura: aura ? {
				display: auraStyle.display,
				opacity: Number.parseFloat(auraStyle.opacity || '1'),
				width: Math.round(auraRect.width),
				height: Math.round(auraRect.height),
				pointerEvents: auraStyle.pointerEvents
			} : null,
			bodyBeforeContent: bodyBefore.content,
			bodyAfterContent: bodyAfter.content,
			mainBeforeContent: mainBefore ? mainBefore.content : '',
			sections
		};
	});

	report.pages.backgroundAndLayout = result;
	assert(report, !result.aura || result.aura.display === 'none' || (result.aura.pointerEvents === 'none' && result.aura.height <= 40 && result.aura.opacity <= 0.12), 'shell aura is disabled or too weak to create a blocking rectangle', result.aura);
	assert(report, result.bodyBeforeContent === 'none' || result.bodyBeforeContent === 'normal', 'body::before does not create a large overlay', result);
	assert(report, result.bodyAfterContent === 'none' || result.bodyAfterContent === 'normal', 'body::after does not create a large overlay', result);
	assert(report, result.mainBeforeContent === 'none' || result.mainBeforeContent === 'normal', 'maincontent::before does not create a large overlay', result);
	assert(report, result.mainWidth >= 720, 'maincontent has a reasonable desktop width', result);
	assert(report, result.scrollWidth <= result.viewportWidth + 24, 'page layout does not overflow horizontally at viewport level', result);

	for (const section of result.sections)
		assert(report, section.width >= Math.min(420, result.mainWidth * 0.45), 'native LuCI sections are not squeezed into a narrow column', {
			mainWidth: result.mainWidth,
			section
		});
}

async function testNativePageBoundaries(page, baseUrl, outputDir, report) {
	const checks = [
		{ name: 'status-overview', path: '/cgi-bin/luci/admin/status/overview' },
		{ name: 'system-system', path: '/cgi-bin/luci/admin/system/system' },
		{ name: 'network-network', path: '/cgi-bin/luci/admin/network/network' },
		{ name: 'network-firewall', path: '/cgi-bin/luci/admin/network/firewall' }
	];

	report.pages.nativeBoundaries = [];

	for (const check of checks) {
		await gotoLuCI(page, baseUrl, check.path);
		await screenshot(page, outputDir, `native-${check.name}`);

		const result = await page.evaluate(() => {
			return {
				pathname: location.pathname,
				bodyClasses: document.body.className,
				cbiCount: document.querySelectorAll('#maincontent .cbi-map, #maincontent .cbi-section, #maincontent .table, #maincontent table').length,
				dashboardMarkers: document.querySelectorAll('#maincontent .vitrawrt-dashboard, #maincontent [data-vitrawrt-dashboard], #maincontent .vitra-dashboard').length,
				viewText: (document.querySelector('#view') || document.querySelector('#maincontent') || document.body).textContent.trim().replace(/\s+/g, ' ').slice(0, 220)
			};
		});

		report.pages.nativeBoundaries.push({ ...check, result });
		assert(report, result.pathname.endsWith(check.path.replace('/cgi-bin/luci', '')), `${check.name} URL remains native`, { check, result });
		assert(report, result.dashboardMarkers === 0, `${check.name} is not replaced by VitraWrt Dashboard`, { check, result });
		assert(report, result.cbiCount > 0, `${check.name} keeps native LuCI rendered content`, { check, result });
	}
}

async function testButtons(page, baseUrl, outputDir, report) {
	await gotoLuCI(page, baseUrl, '/cgi-bin/luci/admin/system/system');
	await screenshot(page, outputDir, 'buttons-system');

	const result = await page.evaluate(() => {
		const buttons = Array.from(document.querySelectorAll('#maincontent .btn, #maincontent .cbi-button'))
			.filter((node) => {
				const style = getComputedStyle(node);
				const rect = node.getBoundingClientRect();
				return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
			})
			.slice(0, 18)
			.map((node) => {
				const style = getComputedStyle(node);
				const rect = node.getBoundingClientRect();

				return {
					text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
					className: node.className,
					x: Math.round(rect.x),
					y: Math.round(rect.y),
					width: Math.round(rect.width),
					height: Math.round(rect.height),
					backgroundColor: style.backgroundColor,
					borderTopWidth: style.borderTopWidth,
					borderRadius: style.borderRadius,
					color: style.color
				};
			});

		const rowPairs = [];
		for (let i = 0; i < buttons.length; i++) {
			for (let j = i + 1; j < buttons.length; j++) {
				if (Math.abs(buttons[i].y - buttons[j].y) <= 12 && Math.abs(buttons[i].x - buttons[j].x) > 8)
					rowPairs.push([i, j]);
			}
		}

		return {
			buttons,
			rowPairCount: rowPairs.length
		};
	});

	report.pages.buttons = result;
	assert(report, result.buttons.length > 0, 'LuCI buttons are present for style checks', result);

	for (const button of result.buttons) {
		const hasVisibleBackground = !/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/i.test(button.backgroundColor);
		const borderWidth = Number.parseFloat(button.borderTopWidth) || 0;
		const radius = Number.parseFloat(button.borderRadius) || 0;

		assert(report, hasVisibleBackground, 'button has non-transparent background', button);
		assert(report, borderWidth > 0, 'button has visible border', button);
		assert(report, radius >= 8, 'button has rounded visual treatment', button);
	}

	if (result.buttons.length >= 3)
		assert(report, result.rowPairCount > 0, 'LuCI buttons are not all forced into a vertical stack on desktop', result);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const playwright = await loadPlaywright();
	const baseUrl = normalizeHost(args.host);
	const outputDir = args.outputDir || path.join('audit-output', 'runtime-regression', stamp());
	const screenshotDir = path.join(outputDir, 'screenshots');
	const report = {
		baseUrl,
		startedAt: new Date().toISOString(),
		passed: [],
		failed: [],
		warnings: [],
		console: [],
		pageErrors: [],
		pages: {}
	};

	await ensureDir(screenshotDir);

	const browser = await launchBrowser(playwright, args, report);
	const page = await browser.newPage({
		viewport: { width: 1440, height: 980 },
		deviceScaleFactor: 1
	});

	page.on('console', (msg) => {
		if (msg.type() === 'error')
			report.console.push({ type: msg.type(), text: msg.text() });
	});

	page.on('pageerror', (err) => {
		report.pageErrors.push({ message: err.message });
	});

	try {
		await testRuntimeSourceSafety(report);
		await login(page, baseUrl, args.luciUser, args.luciPassword);
		await testSidebarExpansion(page, baseUrl, screenshotDir, report);
		await testSidebarCollapsedTooltip(page, baseUrl, screenshotDir, report);
		await testOverview(page, baseUrl, screenshotDir, report);
		await testSystemTabs(page, baseUrl, screenshotDir, report);
		await testFirstLoadTabs(page, baseUrl, screenshotDir, report);
		await testCbiDropdown(page, baseUrl, screenshotDir, report);
		await testCbiDynlist(page, baseUrl, screenshotDir, report);
		await testApplyArea(page, baseUrl, screenshotDir, report);
		await testNetworkEditModal(page, baseUrl, screenshotDir, report);
		await testNetworkShareWideTable(page, baseUrl, screenshotDir, report);
		await testSyslog(page, baseUrl, screenshotDir, report);
		await testStartup(page, baseUrl, screenshotDir, report);
		await testProcesses(page, baseUrl, screenshotDir, report);
		await testPackagesPage(page, baseUrl, screenshotDir, report);
		await testNftables(page, baseUrl, screenshotDir, report);
		await testVnstat2PanelSpacing(page, baseUrl, screenshotDir, report);
		await testVnstat(page, baseUrl, screenshotDir, report);
		await testButtons(page, baseUrl, screenshotDir, report);
		await testNativePageBoundaries(page, baseUrl, screenshotDir, report);
		await testBackgroundAndLayout(page, baseUrl, screenshotDir, report);
		const severeConsole = report.console.filter((entry) => /uncaught|typeerror|referenceerror|syntaxerror/i.test(entry.text));
		assert(report, severeConsole.length === 0, 'runtime flow has no severe console errors', severeConsole);
		const severePageErrors = report.pageErrors.filter((entry) =>
			!/RPC call to uci\/get failed with error -32002: Access denied/i.test(entry.message) &&
			!/Cannot set properties of null \(setting 'src'\)/i.test(entry.message) &&
			!/classes\.ui\.addNotification is not a function/i.test(entry.message) &&
			!/XHR request aborted by browser/i.test(entry.message)
		);
		if (report.pageErrors.some((entry) => /Cannot set properties of null \(setting 'src'\)/i.test(entry.message)))
			report.warnings.push({
				message: 'Known LuCI/plugin page error observed: Cannot set properties of null (setting src). The theme does not fake-click or patch app behavior.',
				details: report.pageErrors.filter((entry) => /Cannot set properties of null \(setting 'src'\)/i.test(entry.message))
			});
		if (report.pageErrors.some((entry) => /classes\.ui\.addNotification is not a function/i.test(entry.message)))
			report.warnings.push({
				message: 'Known LuCI/client runtime error observed: classes.ui.addNotification is unavailable while LuCI handles an app error. The theme does not patch LuCI internals or fake user flow.',
				details: report.pageErrors.filter((entry) => /classes\.ui\.addNotification is not a function/i.test(entry.message))
			});
		if (report.pageErrors.some((entry) => /XHR request aborted by browser/i.test(entry.message)))
			report.warnings.push({
				message: 'Known browser navigation artifact observed: XHR request aborted by browser during runtime page traversal.',
				details: report.pageErrors.filter((entry) => /XHR request aborted by browser/i.test(entry.message))
			});
		assert(report, severePageErrors.length === 0, 'runtime flow has no severe page errors', severePageErrors);
	}
	finally {
		report.finishedAt = new Date().toISOString();
		report.consoleErrorCount = report.console.length;
		await writeJson(path.join(outputDir, 'report.json'), report);
		await browser.close();
	}

	console.log(`Runtime regression report: ${outputDir}`);
	console.log(`Passed checks: ${report.passed.length}`);
	console.log(`Failed checks: ${report.failed.length}`);
	console.log(`Console errors observed: ${report.console.length}`);

	if (report.failed.length) {
		console.error(JSON.stringify(report.failed, null, 2));
		process.exit(1);
	}

	console.log('PASS');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
